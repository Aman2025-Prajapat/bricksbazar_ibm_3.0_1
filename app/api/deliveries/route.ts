import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import { listDeliveries, listOrders } from "@/lib/server/market-store"

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [deliveries, orders] = await Promise.all([listDeliveries(), listOrders()])
  const orderMap = new Map(orders.map((order) => [order.id, order]))

  const scopedDeliveries = deliveries.filter((delivery) => {
    if (sessionUser.role === "admin" || sessionUser.role === "distributor") return true
    if (sessionUser.role === "buyer") return delivery.buyerId === sessionUser.userId
    return delivery.sellerId === sessionUser.userId
  })

  const payload = scopedDeliveries.map((delivery) => {
    const order = orderMap.get(delivery.orderId)
    const totalQuantity = order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0
    return {
      ...delivery,
      orderNumber: order?.orderNumber ?? delivery.orderId,
      orderStatus: order?.status ?? "pending",
      orderDate: order?.date ?? delivery.createdAt,
      trackingNumber: order?.trackingNumber ?? null,
      orderTotal: order?.total ?? 0,
      firstItemName: order?.items[0]?.productName ?? "Mixed materials",
      totalQuantity,
    }
  })

  return NextResponse.json({ deliveries: payload })
}
