import type { SessionUser } from "@/lib/server/auth-user"
import { getDeliveryByOrderId, listOrders } from "@/lib/server/market-store"
import { upsertOrderChatThread } from "@/lib/server/order-chat-store"

export type OrderChatAccessContext = {
  order: Awaited<ReturnType<typeof listOrders>>[number]
  delivery: Awaited<ReturnType<typeof getDeliveryByOrderId>>
  thread: NonNullable<Awaited<ReturnType<typeof upsertOrderChatThread>>>
  linkedSellerIds: string[]
  participants: {
    buyerName: string
    sellerName: string
    distributorName?: string
  }
}

function getUniqueSellerIds(order: Awaited<ReturnType<typeof listOrders>>[number]) {
  return Array.from(new Set(order.items.map((item) => item.sellerId).filter((value) => value && value !== "multi-seller")))
}

export async function getOrderChatAccessContext(input: { sessionUser: SessionUser; orderId: string }) {
  const [orders, delivery] = await Promise.all([listOrders(), getDeliveryByOrderId(input.orderId)])
  const order = orders.find((entry) => entry.id === input.orderId)
  if (!order) {
    return { context: null, status: 404 as const, error: "Order not found" }
  }

  const linkedSellerIds = getUniqueSellerIds(order)
  const canAccess =
    input.sessionUser.role === "admin" ||
    (input.sessionUser.role === "buyer" && order.buyerId === input.sessionUser.userId) ||
    (input.sessionUser.role === "seller" && linkedSellerIds.includes(input.sessionUser.userId)) ||
    (input.sessionUser.role === "distributor" && delivery?.distributorId === input.sessionUser.userId)

  if (!canAccess) {
    return { context: null, status: 403 as const, error: "Forbidden" }
  }

  const sellerId = linkedSellerIds[0] || (order.sellerId !== "multi-seller" ? order.sellerId : "")
  if (!sellerId) {
    return { context: null, status: 409 as const, error: "No seller linked with this order yet" }
  }

  const thread = await upsertOrderChatThread({
    orderId: order.id,
    buyerId: order.buyerId,
    sellerId,
    distributorId: delivery?.distributorId || undefined,
  })
  if (!thread) {
    return { context: null, status: 500 as const, error: "Could not initialize order chat" }
  }

  return {
    context: {
      order,
      delivery,
      thread,
      linkedSellerIds,
      participants: {
        buyerName: order.buyerName,
        sellerName: order.sellerName,
        distributorName: delivery?.distributorName || undefined,
      },
    } satisfies OrderChatAccessContext,
    status: 200 as const,
    error: null,
  }
}
