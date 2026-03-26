import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { listOrders, type OrderStatus, updateOrderStatus } from "@/lib/server/market-store"

const updateOrderSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
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
  if (!sessionUser || (sessionUser.role !== "admin" && sessionUser.role !== "distributor")) {
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

  return NextResponse.json({ order: updated })
}
