import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { getOrderChatAccessContext } from "@/lib/server/order-chat-access"
import { createOrderChatMessage, listOrderChatMessages } from "@/lib/server/order-chat-store"

const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(1000),
})

function parseLimit(input: string | null, fallback = 80) {
  if (!input) return fallback
  const parsed = Number.parseInt(input, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(200, Math.max(1, parsed))
}

function mapSenderRole(role: string): "buyer" | "seller" | "distributor" | "admin" {
  if (role === "admin" || role === "seller" || role === "distributor") return role
  return "buyer"
}

export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const access = await getOrderChatAccessContext({ sessionUser, orderId: params.orderId })
  if (!access.context) {
    return NextResponse.json({ error: access.error || "Could not load chat" }, { status: access.status })
  }

  const url = new URL(request.url)
  const after = (url.searchParams.get("after") || "").trim() || undefined
  const limit = parseLimit(url.searchParams.get("limit"), 80)
  const messages = await listOrderChatMessages({
    orderId: params.orderId,
    after,
    limit,
  })

  return NextResponse.json({
    thread: access.context.thread,
    participants: access.context.participants,
    messages,
    viewerUserId: sessionUser.userId,
    viewerRole: mapSenderRole(sessionUser.role),
  })
}

export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const access = await getOrderChatAccessContext({ sessionUser, orderId: params.orderId })
  if (!access.context) {
    return NextResponse.json({ error: access.error || "Could not send message" }, { status: access.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message payload" }, { status: 400 })
  }

  try {
    const message = await createOrderChatMessage({
      orderId: params.orderId,
      senderId: sessionUser.userId,
      senderName: sessionUser.name,
      senderRole: mapSenderRole(sessionUser.role),
      messageText: parsed.data.message,
    })
    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send message" },
      { status: 400 },
    )
  }
}
