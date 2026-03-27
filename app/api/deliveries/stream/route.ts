import { getSessionUser } from "@/lib/server/auth-user"
import { listDeliveries, listOrders } from "@/lib/server/market-store"

export const dynamic = "force-dynamic"

async function getScopedDeliveries(userId: string, role: "buyer" | "seller" | "distributor" | "admin") {
  const [deliveries, orders] = await Promise.all([listDeliveries(), listOrders()])
  const orderMap = new Map(orders.map((order) => [order.id, order]))

  const scoped = deliveries.filter((delivery) => {
    if (role === "admin" || role === "distributor") return true
    if (role === "buyer") return delivery.buyerId === userId
    return delivery.sellerId === userId
  })

  return scoped.map((delivery) => {
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
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      let lastPayload = ""
      let sequence = 0

      const sendEvent = async () => {
        if (closed) return
        try {
          const deliveries = await getScopedDeliveries(sessionUser.userId, sessionUser.role)
          const payload = JSON.stringify({ deliveries, timestamp: new Date().toISOString() })
          if (payload === lastPayload) {
            return
          }
          lastPayload = payload
          sequence += 1
          controller.enqueue(
            encoder.encode(`id: ${sequence}\nevent: deliveries\ndata: ${payload}\n\n`),
          )
        } catch {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "stream_failed" })}\n\n`),
          )
        }
      }

      const heartbeat = () => {
        if (closed) return
        controller.enqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`))
      }

      void sendEvent()
      const eventTimer = setInterval(() => {
        void sendEvent()
      }, 8000)
      const heartbeatTimer = setInterval(heartbeat, 12000)

      request.signal.addEventListener("abort", () => {
        if (closed) return
        closed = true
        clearInterval(eventTimer)
        clearInterval(heartbeatTimer)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
