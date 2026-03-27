import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import {
  getDeliveryByOrderId,
  listOrders,
  type OrderStatus,
  updateDelivery,
  updateOrderEstimatedDelivery,
  updateOrderStatus,
} from "@/lib/server/market-store"

const updateOrderSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
  estimatedDelivery: z.string().datetime().optional(),
  deliveryAddress: z.string().min(10).max(300).optional(),
  distributorId: z.string().min(1).max(120).optional(),
  distributorName: z.string().min(1).max(120).optional(),
  vehicleNumber: z.string().min(4).max(40).optional(),
  vehicleType: z.string().min(2).max(60).optional(),
  driverName: z.string().min(2).max(120).optional(),
  driverPhone: z.string().min(7).max(30).optional(),
  etaMinutes: z.number().int().min(0).max(24 * 60).optional(),
})

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
}

export async function PATCH(request: Request, { params }: { params: { orderId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = updateOrderSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status payload" }, { status: 400 })
  }

  const allOrders = await listOrders()
  const order = allOrders.find((item) => item.id === params.orderId)
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const isAdminOrDistributor = sessionUser.role === "admin" || sessionUser.role === "distributor"
  const isLinkedSeller = sessionUser.role === "seller" && order.items.some((item) => item.sellerId === sessionUser.userId)
  if (!isAdminOrDistributor && !isLinkedSeller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const nextStatus = parsed.data.status
  if (order.status !== nextStatus && !allowedTransitions[order.status].includes(nextStatus)) {
    return NextResponse.json(
      { error: `Invalid status transition from ${order.status} to ${nextStatus}` },
      { status: 400 },
    )
  }

  const updated = await updateOrderStatus({ orderId: params.orderId, status: nextStatus })
  if (!updated) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  let nextOrder = updated
  if (parsed.data.estimatedDelivery) {
    const scheduled = await updateOrderEstimatedDelivery({
      orderId: params.orderId,
      estimatedDelivery: parsed.data.estimatedDelivery,
    })
    if (scheduled) {
      nextOrder = scheduled
    }
  }

  const hasDeliveryPlanningUpdate =
    parsed.data.deliveryAddress !== undefined ||
    parsed.data.distributorId !== undefined ||
    parsed.data.distributorName !== undefined ||
    parsed.data.vehicleNumber !== undefined ||
    parsed.data.vehicleType !== undefined ||
    parsed.data.driverName !== undefined ||
    parsed.data.driverPhone !== undefined ||
    parsed.data.etaMinutes !== undefined

  let nextDelivery = null
  if (hasDeliveryPlanningUpdate) {
    const delivery = await getDeliveryByOrderId(params.orderId)
    if (!delivery) {
      return NextResponse.json({ error: "Delivery record not found for this order" }, { status: 404 })
    }

    nextDelivery = await updateDelivery({
      deliveryId: delivery.id,
      deliveryAddress: parsed.data.deliveryAddress,
      distributorId: parsed.data.distributorId,
      distributorName: parsed.data.distributorName,
      vehicleNumber: parsed.data.vehicleNumber,
      vehicleType: parsed.data.vehicleType,
      driverName: parsed.data.driverName,
      driverPhone: parsed.data.driverPhone,
      etaMinutes: parsed.data.etaMinutes,
    })
  }

  return NextResponse.json({ order: nextOrder, delivery: nextDelivery })
}
