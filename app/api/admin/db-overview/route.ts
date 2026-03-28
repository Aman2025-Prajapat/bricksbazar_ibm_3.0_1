import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import { prisma } from "@/lib/server/prisma"

type TableStat = {
  table: string
  label: string
  count: number
  exists: boolean
  note?: string
}

const trackedTables: Array<{ table: string; label: string }> = [
  { table: "market_products", label: "Products" },
  { table: "market_orders", label: "Orders" },
  { table: "market_order_shipments", label: "Order Shipments" },
  { table: "market_payments", label: "Payments" },
  { table: "market_payment_intents", label: "Payment Intents" },
  { table: "market_deliveries", label: "Deliveries" },
  { table: "market_delivery_locations", label: "Delivery Locations" },
  { table: "market_delivery_otps", label: "Delivery OTPs" },
  { table: "market_delivery_proofs", label: "Delivery Proofs" },
  { table: "market_distributor_locations", label: "Distributor Locations" },
  { table: "market_supplier_favorites", label: "Supplier Favorites" },
  { table: "market_verification_requests", label: "Verification Requests" },
  { table: "market_supplier_ratings", label: "Supplier Ratings" },
  { table: "market_chat_threads", label: "Order Chat Threads" },
  { table: "market_chat_messages", label: "Order Chat Messages" },
  { table: "projects_store", label: "Projects" },
]

function toNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function parseDbMeta() {
  const url = (process.env.DATABASE_URL || "").trim()
  const isPostgres = /^(postgres|postgresql|prisma\+postgres):\/\//i.test(url)
  const isSqlite = /^file:/i.test(url)

  if (isSqlite) {
    return {
      provider: "sqlite",
      displayUrl: url,
      isProductionLike: false,
    }
  }

  if (isPostgres) {
    try {
      const parsed = new URL(url.replace(/^prisma\+postgres:\/\//i, "postgres://"))
      parsed.username = parsed.username ? "***" : ""
      parsed.password = parsed.password ? "***" : ""
      return {
        provider: "postgres",
        displayUrl: parsed.toString(),
        isProductionLike: true,
      }
    } catch {
      return {
        provider: "postgres",
        displayUrl: "postgres://***",
        isProductionLike: true,
      }
    }
  }

  return {
    provider: "unknown",
    displayUrl: url || "not_set",
    isProductionLike: false,
  }
}

async function countRows(table: string, label: string): Promise<TableStat> {
  const dbUrl = (process.env.DATABASE_URL || "").trim()
  const isPostgres = /^(postgres|postgresql|prisma\+postgres):\/\//i.test(dbUrl)

  try {
    if (isPostgres) {
      const rows = await prisma.$queryRawUnsafe<Array<{ regclass_name: string | null }>>(
        "SELECT to_regclass(?) as regclass_name",
        `public.${table}`,
      )
      if (!rows[0]?.regclass_name) {
        return {
          table,
          label,
          count: 0,
          exists: false,
          note: "table_not_found",
        }
      }
    } else {
      const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
        table,
      )
      if (rows.length === 0) {
        return {
          table,
          label,
          count: 0,
          exists: false,
          note: "table_not_found",
        }
      }
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ count: unknown }>>(`SELECT COUNT(*) as count FROM ${table}`)
    return {
      table,
      label,
      count: toNumber(rows[0]?.count),
      exists: true,
    }
  } catch (error) {
    return {
      table,
      label,
      count: 0,
      exists: false,
      note: error instanceof Error ? error.message : "table_not_found",
    }
  }
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dbMeta = parseDbMeta()
  const pingStart = Date.now()

  let connected = false
  let connectionError = ""
  try {
    await prisma.$queryRawUnsafe("SELECT 1 as ok")
    connected = true
  } catch (error) {
    connected = false
    connectionError = error instanceof Error ? error.message : "connection_failed"
  }

  const connectionLatencyMs = Date.now() - pingStart
  const userCount = await prisma.user.count().catch(() => 0)
  const tableStats = await Promise.all(trackedTables.map((item) => countRows(item.table, item.label)))

  const allStats: TableStat[] = [{ table: "User", label: "Users", count: userCount, exists: true }, ...tableStats]
  const existingTables = allStats.filter((entry) => entry.exists)
  const totalRows = existingTables.reduce((sum, entry) => sum + entry.count, 0)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    database: {
      ...dbMeta,
      connected,
      connectionLatencyMs,
      connectionError: connectionError || null,
    },
    totals: {
      trackedTableCount: allStats.length,
      availableTableCount: existingTables.length,
      totalRows,
    },
    tables: allStats,
    dataEntryPoints: [
      "Buyer/Seller/Distributor dashboards (forms + actions)",
      "Admin panels (users, orders, payments)",
      "API integrations (payments webhooks, delivery tracking APIs)",
      "Prisma Studio for manual data operations",
    ],
    importHints: [
      "Use realistic GST, phone, pincode, order amount, delivery coordinates.",
      "Keep payment and order statuses consistent (paid <-> verified intent).",
      "Prefer API flows for real-life behavior simulation over direct DB edits.",
    ],
  })
}
