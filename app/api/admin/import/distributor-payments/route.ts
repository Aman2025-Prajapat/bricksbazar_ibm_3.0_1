import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import {
  listOrders,
  listPayments,
  logPaymentEvent,
  upsertImportedOrderPayment,
  type PaymentStatus,
} from "@/lib/server/market-store"
import { buildRowObject, parseCsvText } from "@/lib/server/csv-utils"

const importSchema = z.object({
  action: z.enum(["preview", "apply"]),
  csvText: z.string().min(1),
})

type NormalizedRow = {
  rowNo: number
  orderId: string
  orderNumber: string
  buyerId: string
  amount: number
  status: PaymentStatus
  method: string
  paymentReference?: string
  createdAt?: string
}

type ImportIssue = {
  rowNo: number
  reason: string
}

function mapPaymentStatus(raw: string) {
  const normalized = raw.trim().toLowerCase()
  if (!normalized) return "pending" as const
  if (normalized === "paid" || normalized === "completed" || normalized === "success") return "paid" as const
  if (normalized === "failed" || normalized === "error") return "failed" as const
  if (normalized === "pending" || normalized === "processing") return "pending" as const
  return null
}

function parseAmount(raw: string) {
  const cleaned = raw.replace(/[^0-9.\-]/g, "").trim()
  if (!cleaned) return null
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Number(parsed.toFixed(2))
}

function parseDate(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }
  return parsed.toISOString()
}

async function normalizeRows(csvText: string) {
  const parsed = parseCsvText(csvText)
  const required = parsed.headers.length > 0
  if (!required) {
    return {
      normalizedRows: [] as NormalizedRow[],
      issues: [{ rowNo: 1, reason: "CSV is empty" }] as ImportIssue[],
      totalRows: 0,
    }
  }

  const [orders, payments] = await Promise.all([listOrders(), listPayments()])
  const orderByNumber = new Map(orders.map((order) => [order.orderNumber.toLowerCase(), order]))
  const orderById = new Map(orders.map((order) => [order.id, order]))
  const paymentByOrderId = new Map(payments.map((payment) => [payment.orderId, payment]))

  const issues: ImportIssue[] = []
  const normalizedRows: NormalizedRow[] = []

  for (let index = 0; index < parsed.rows.length; index++) {
    const rowNo = index + 2
    const row = buildRowObject(parsed.headers, parsed.rows[index])

    const orderNumber = row.ordernumber || row.order || ""
    const orderIdInput = row.orderid || ""
    const paymentId = row.paymentid || row.paymentreference || ""
    const method = (row.method || row.paymentmethod || "UPI").trim().slice(0, 50) || "UPI"
    const statusRaw = row.status || ""
    const amountRaw = row.grossorderamount || row.amount || row.total || ""
    const dateRaw = row.date || row.createdat || ""

    const order =
      (orderNumber ? orderByNumber.get(orderNumber.toLowerCase()) : undefined) ||
      (orderIdInput ? orderById.get(orderIdInput) : undefined)

    if (!order) {
      issues.push({ rowNo, reason: "Order not found (need valid orderNumber/orderId)" })
      continue
    }

    const status = mapPaymentStatus(statusRaw)
    if (!status) {
      issues.push({ rowNo, reason: `Invalid status: ${statusRaw || "missing"}` })
      continue
    }

    const amount = parseAmount(amountRaw) ?? Number(order.total.toFixed(2))
    if (!Number.isFinite(amount) || amount < 0) {
      issues.push({ rowNo, reason: `Invalid amount: ${amountRaw || "missing"}` })
      continue
    }

    const createdAt = parseDate(dateRaw)
    if (dateRaw.trim() && !createdAt) {
      issues.push({ rowNo, reason: `Invalid date format: ${dateRaw}` })
      continue
    }

    const existing = paymentByOrderId.get(order.id)
    normalizedRows.push({
      rowNo,
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerId: order.buyerId,
      amount,
      status,
      method,
      paymentReference: paymentId || existing?.gatewayTransactionId,
      createdAt,
    })
  }

  return {
    normalizedRows,
    issues,
    totalRows: parsed.rows.length,
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import payload" }, { status: 400 })
  }

  const normalized = await normalizeRows(parsed.data.csvText)
  const previewRows = normalized.normalizedRows.slice(0, 20).map((row) => ({
    rowNo: row.rowNo,
    orderNumber: row.orderNumber,
    amount: row.amount,
    status: row.status,
    method: row.method,
    createdAt: row.createdAt || null,
  }))

  if (parsed.data.action === "preview") {
    return NextResponse.json({
      mode: "preview",
      summary: {
        totalRows: normalized.totalRows,
        validRows: normalized.normalizedRows.length,
        invalidRows: normalized.issues.length,
      },
      previewRows,
      issues: normalized.issues.slice(0, 50),
    })
  }

  if (normalized.normalizedRows.length === 0) {
    return NextResponse.json(
      {
        error: "No valid rows to import",
        summary: {
          totalRows: normalized.totalRows,
          validRows: 0,
          invalidRows: normalized.issues.length,
        },
        issues: normalized.issues.slice(0, 50),
      },
      { status: 400 },
    )
  }

  let created = 0
  let updated = 0
  const applyErrors: ImportIssue[] = []

  for (const row of normalized.normalizedRows) {
    try {
      const result = await upsertImportedOrderPayment({
        orderId: row.orderId,
        buyerId: row.buyerId,
        amount: row.amount,
        status: row.status,
        method: row.method,
        provider: "manual",
        gatewayTransactionId: row.paymentReference,
        createdAt: row.createdAt,
        verifiedAt: row.status === "paid" ? row.createdAt : undefined,
        gatewayPayload: JSON.stringify({
          source: "csv_import",
          rowNo: row.rowNo,
          orderNumber: row.orderNumber,
        }),
      })

      if (result.action === "created") created += 1
      if (result.action === "updated") updated += 1

      await logPaymentEvent({
        orderId: row.orderId,
        buyerId: row.buyerId,
        provider: "manual",
        eventType: "csv_import_payment_sync",
        source: "admin_csv_import",
        status: "success",
        detailsJson: JSON.stringify({
          rowNo: row.rowNo,
          orderNumber: row.orderNumber,
          status: row.status,
          amount: row.amount,
          action: result.action,
        }),
      })
    } catch (error) {
      applyErrors.push({
        rowNo: row.rowNo,
        reason: error instanceof Error ? error.message : "apply_failed",
      })
    }
  }

  return NextResponse.json({
    mode: "apply",
    summary: {
      totalRows: normalized.totalRows,
      validRows: normalized.normalizedRows.length,
      invalidRows: normalized.issues.length,
      created,
      updated,
      applyFailed: applyErrors.length,
    },
    previewRows,
    issues: [...normalized.issues, ...applyErrors].slice(0, 100),
  })
}
