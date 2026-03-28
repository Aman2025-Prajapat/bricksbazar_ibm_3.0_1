import { NextResponse } from "next/server"
import { z } from "zod"
import {
  createOrder,
  listDeliveries,
  listOrderShipments,
  listOrderShipmentsByOrderIds,
  listOrdersPaginated,
  type OrderStatus,
} from "@/lib/server/market-store"
import { getSessionUser } from "@/lib/server/auth-user"
import { getUserVerificationMapByIds } from "@/lib/server/user-store"
import { listSupplierOrderRatingsByOrderIds } from "@/lib/server/supplier-rating-store"

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
  paymentMethod: z.string().min(2).default("UPI"),
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
    distributorId: sessionUser.role === "distributor" ? sessionUser.userId : undefined,
  })

  const orderIds = new Set(pageResult.items.map((order) => order.id))
  const [shipments, deliveries, ratings] = await Promise.all([
    listOrderShipmentsByOrderIds(Array.from(orderIds)),
    listDeliveries(),
    listSupplierOrderRatingsByOrderIds(
      Array.from(orderIds),
      sessionUser.role === "buyer" ? sessionUser.userId : undefined,
    ),
  ])
  const deliveriesByOrderId = new Map(deliveries.map((delivery) => [delivery.orderId, delivery]))
  const ratingsByOrderId = new Map<string, (typeof ratings)[number]>()
  ratings.forEach((rating) => {
    if (!ratingsByOrderId.has(rating.orderId)) {
      ratingsByOrderId.set(rating.orderId, rating)
    }
  })
  const verificationMap = await getUserVerificationMapByIds([
    ...pageResult.items.map((order) => order.sellerId),
    ...deliveries.map((delivery) => delivery.distributorId),
  ])
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

  const orders = pageResult.items.map((order) => {
    const delivery = deliveriesByOrderId.get(order.id)
    return {
      ...order,
      shipments: shipmentsByOrder.get(order.id) || [],
      sellerVerified: verificationMap.get(order.sellerId) === true,
      deliveryAddress: delivery?.deliveryAddress,
      pickupAddress: delivery?.pickupAddress,
      distributorId: delivery?.distributorId,
      distributorName: delivery?.distributorName,
      distributorVerified: delivery ? verificationMap.get(delivery.distributorId) === true : false,
      deliveryStatus: delivery?.status,
      vehicleType: delivery?.vehicleType,
      supplierRating: ratingsByOrderId.get(order.id)
        ? {
            supplierId: ratingsByOrderId.get(order.id)!.supplierId,
            supplierName: ratingsByOrderId.get(order.id)!.supplierName,
            rating: ratingsByOrderId.get(order.id)!.rating,
            reviewText: ratingsByOrderId.get(order.id)!.reviewText,
            updatedAt: ratingsByOrderId.get(order.id)!.updatedAt,
          }
        : null,
    }
  })

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
      paymentStatus: "pending",
      paymentProvider: "manual",
    })

    const shipments = await listOrderShipments({ orderId: result.order.id })
    return NextResponse.json(
      {
        ...result,
        shipments,
        message:
          "Order request submitted. Seller/distributor approval pending. Complete payment after approval to start live tracking.",
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create order" },
      { status: 400 },
    )
  }
}
