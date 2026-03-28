import { getSessionUser } from "@/lib/server/auth-user"
import { getOrderChatAccessContext } from "@/lib/server/order-chat-access"
import { listOrderChatMessages } from "@/lib/server/order-chat-store"

export const dynamic = "force-dynamic"

function parseLimit(input: string | null, fallback = 80) {
  if (!input) return fallback
  const parsed = Number.parseInt(input, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(200, Math.max(1, parsed))
}

export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const access = await getOrderChatAccessContext({ sessionUser, orderId: params.orderId })
  if (!access.context) {
    return new Response(JSON.stringify({ error: access.error || "Forbidden" }), {
      status: access.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  const url = new URL(request.url)
  const limit = parseLimit(url.searchParams.get("limit"), 80)
  let cursor = (url.searchParams.get("after") || "").trim()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      let sequence = 0

      const pushEvent = (event: string, data: unknown) => {
        if (closed) return
        sequence += 1
        controller.enqueue(encoder.encode(`id: ${sequence}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const sendInitial = async () => {
        try {
          const messages = await listOrderChatMessages({ orderId: params.orderId, limit })
          if (messages.length > 0) {
            cursor = messages[messages.length - 1].createdAt
          }
          pushEvent("sync", { messages, cursor })
        } catch {
          pushEvent("error", { message: "chat_stream_init_failed" })
        }
      }

      const sendUpdates = async () => {
        if (closed) return
        try {
          const messages = await listOrderChatMessages({
            orderId: params.orderId,
            after: cursor || undefined,
            limit,
          })
          if (messages.length === 0) {
            return
          }
          cursor = messages[messages.length - 1].createdAt
          pushEvent("messages", { messages, cursor })
        } catch {
          pushEvent("error", { message: "chat_stream_poll_failed" })
        }
      }

      const heartbeat = () => {
        if (closed) return
        controller.enqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`))
      }

      void sendInitial()
      const pollTimer = setInterval(() => {
        void sendUpdates()
      }, 2500)
      const heartbeatTimer = setInterval(heartbeat, 12000)

      request.signal.addEventListener("abort", () => {
        if (closed) return
        closed = true
        clearInterval(pollTimer)
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
