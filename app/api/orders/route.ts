import { NextResponse } from "next/server"
import { z } from "zod"
import {
  consumePaymentIntent,
  createOrder,
  getPaymentIntentById,
  listDeliveries,
  listOrderShipments,
  listOrderShipmentsByOrderIds,
  listOrdersPaginated,
  type OrderStatus,
} from "@/lib/server/market-store"
import { getSessionUser } from "@/lib/server/auth-user"

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
  paymentMethod: z.string().min(2).default("UPI"),
  paymentIntentId: z.string().uuid().optional(),
  deliveryAddress: z.string().min(12).max(300),
  requestedDeliveryDate: z.string().datetime().optional(),
  preferredDistributorId: z.string().min(2).max(120).optional(),
  preferredDistributorName: z.string().min(2).max(120).optional(),
  preferredVehicleType: z.string().min(2).max(60).optional(),
})

const allowedStatuses = new Set<OrderStatus | "all">(["all", "pending", "confirmed", "shipped", "delivered", "cancelled"])

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1)
  const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "100", 10) || 100))
  const q = (url.searchParams.get("q") || "").trim()
  const requestedStatus = (url.searchParams.get("status") || "all").trim().toLowerCase() as OrderStatus | "all"
  const status = allowedStatuses.has(requestedStatus) ? requestedStatus : "all"

  const pageResult = await listOrdersPaginated({
    page,
    limit,
    q,
    status,
    buyerId: sessionUser.role === "buyer" ? sessionUser.userId : undefined,
    sellerId: sessionUser.role === "seller" ? sessionUser.userId : undefined,
  })

  const orderIds = new Set(pageResult.items.map((order) => order.id))
  const [shipments, deliveries] = await Promise.all([
    listOrderShipmentsByOrderIds(Array.from(orderIds)),
    listDeliveries(),
  ])
  const deliveriesByOrderId = new Map(deliveries.map((delivery) => [delivery.orderId, delivery]))
  const shipmentsByOrder = new Map<string, typeof shipments>()
  shipments.forEach((shipment) => {
    if (!orderIds.has(shipment.orderId)) return
    const rows = shipmentsByOrder.get(shipment.orderId) || []
    if (sessionUser.role === "seller" && shipment.sellerId !== sessionUser.userId) {
      return
    }
    rows.push(shipment)
    shipmentsByOrder.set(shipment.orderId, rows)
  })

  const orders = pageResult.items.map((order) => ({
    ...order,
    shipments: shipmentsByOrder.get(order.id) || [],
    deliveryAddress: deliveriesByOrderId.get(order.id)?.deliveryAddress,
    pickupAddress: deliveriesByOrderId.get(order.id)?.pickupAddress,
    distributorName: deliveriesByOrderId.get(order.id)?.distributorName,
    deliveryStatus: deliveriesByOrderId.get(order.id)?.status,
    vehicleType: deliveriesByOrderId.get(order.id)?.vehicleType,
  }))

  return NextResponse.json({
    orders,
    page: pageResult.page,
    limit: pageResult.limit,
    total: pageResult.total,
    hasNextPage: pageResult.hasNextPage,
  })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can place orders" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createOrderSchema.safeParse(body)

  if (!parsed.success || parsed.data.items.length === 0) {
    return NextResponse.json({ error: "Invalid order payload" }, { status: 400 })
  }

  try {
    const normalizedMethod = parsed.data.paymentMethod.toLowerCase()
    const gatewayMethod = normalizedMethod.includes("razorpay") || normalizedMethod.includes("phonepe")

    let consumedIntent: Awaited<ReturnType<typeof consumePaymentIntent>> | null = null

    if (gatewayMethod) {
      if (!parsed.data.paymentIntentId) {
        return NextResponse.json({ error: "Payment verification is required before checkout" }, { status: 400 })
      }

      const intent = await getPaymentIntentById(parsed.data.paymentIntentId)
      if (!intent || intent.buyerId !== sessionUser.userId) {
        return NextResponse.json({ error: "Payment intent not found" }, { status: 404 })
      }
      if (intent.status !== "verified") {
        return NextResponse.json({ error: "Payment is not verified yet" }, { status: 409 })
      }

      consumedIntent = await consumePaymentIntent({
        intentId: intent.id,
        buyerId: sessionUser.userId,
      })

      if (!consumedIntent) {
        return NextResponse.json({ error: "Payment verification expired. Please retry payment." }, { status: 409 })
      }
    }

    const result = await createOrder({
      buyerId: sessionUser.userId,
      buyerName: sessionUser.name,
      items: parsed.data.items,
      deliveryAddress: parsed.data.deliveryAddress,
      requestedDeliveryDate: parsed.data.requestedDeliveryDate,
      preferredDistributorId: parsed.data.preferredDistributorId,
      preferredDistributorName: parsed.data.preferredDistributorName,
      preferredVehicleType: parsed.data.preferredVehicleType,
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: gatewayMethod ? "paid" : "pending",
      paymentProvider: consumedIntent?.provider ?? "manual",
      paymentIntentId: consumedIntent?.id,
      gatewayOrderId: consumedIntent?.gatewayOrderId,
      gatewayTransactionId: consumedIntent?.gatewayTransactionId,
      gatewaySignature: consumedIntent?.gatewaySignature,
      gatewayPayload: consumedIntent?.gatewayPayload,
      paymentVerifiedAt: consumedIntent?.verifiedAt,
    })

    const shipments = await listOrderShipments({ orderId: result.order.id })
    return NextResponse.json({ ...result, shipments }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create order" },
      { status: 400 },
    )
  }
}
