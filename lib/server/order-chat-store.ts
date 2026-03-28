import { prisma } from "@/lib/server/prisma"

export type ChatUserRole = "buyer" | "seller" | "distributor" | "admin"

export type OrderChatThread = {
  id: string
  orderId: string
  buyerId: string
  sellerId: string
  distributorId?: string
  createdAt: string
  updatedAt: string
}

export type OrderChatMessage = {
  id: string
  threadId: string
  orderId: string
  senderId: string
  senderName: string
  senderRole: ChatUserRole
  messageText: string
  createdAt: string
}

type OrderChatThreadRow = {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  distributor_id: string | null
  created_at: string
  updated_at: string
}

type OrderChatMessageRow = {
  id: string
  thread_id: string
  order_id: string
  sender_id: string
  sender_name: string
  sender_role: ChatUserRole
  message_text: string
  created_at: string
}

let orderChatTablesReady = false

function mapThread(row: OrderChatThreadRow): OrderChatThread {
  return {
    id: row.id,
    orderId: row.order_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    distributorId: row.distributor_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMessage(row: OrderChatMessageRow): OrderChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    orderId: row.order_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    messageText: row.message_text,
    createdAt: row.created_at,
  }
}

async function ensureOrderChatTables() {
  if (orderChatTablesReady) return

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_chat_threads (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      distributor_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_chat_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_market_chat_threads_order_id ON market_chat_threads(order_id)",
  )
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_market_chat_messages_order_id_created_at ON market_chat_messages(order_id, created_at DESC)",
  )
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_market_chat_messages_thread_id_created_at ON market_chat_messages(thread_id, created_at DESC)",
  )

  orderChatTablesReady = true
}

export async function getOrderChatThreadByOrderId(orderId: string) {
  await ensureOrderChatTables()
  const rows = await prisma.$queryRawUnsafe<OrderChatThreadRow[]>(
    `SELECT id, order_id, buyer_id, seller_id, distributor_id, created_at, updated_at
     FROM market_chat_threads
     WHERE order_id = ?
     LIMIT 1`,
    orderId,
  )
  return rows.length > 0 ? mapThread(rows[0]) : null
}

export async function upsertOrderChatThread(input: {
  orderId: string
  buyerId: string
  sellerId: string
  distributorId?: string
}) {
  await ensureOrderChatTables()

  const now = new Date().toISOString()
  const existing = await getOrderChatThreadByOrderId(input.orderId)
  const id = existing?.id || crypto.randomUUID()

  await prisma.$executeRawUnsafe(
    `INSERT INTO market_chat_threads
     (id, order_id, buyer_id, seller_id, distributor_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id) DO UPDATE SET
       buyer_id = excluded.buyer_id,
       seller_id = excluded.seller_id,
       distributor_id = COALESCE(excluded.distributor_id, market_chat_threads.distributor_id),
       updated_at = excluded.updated_at`,
    id,
    input.orderId,
    input.buyerId,
    input.sellerId,
    input.distributorId ?? null,
    existing?.createdAt ?? now,
    now,
  )

  return getOrderChatThreadByOrderId(input.orderId)
}

export async function listOrderChatMessages(input: { orderId: string; after?: string; limit?: number }) {
  await ensureOrderChatTables()

  const limit = Math.min(200, Math.max(1, Math.floor(input.limit ?? 80)))
  const after = (input.after || "").trim()

  const query = after
    ? `SELECT id, thread_id, order_id, sender_id, sender_name, sender_role, message_text, created_at
       FROM market_chat_messages
       WHERE order_id = ? AND created_at > ?
       ORDER BY created_at ASC
       LIMIT ?`
    : `SELECT id, thread_id, order_id, sender_id, sender_name, sender_role, message_text, created_at
       FROM market_chat_messages
       WHERE order_id = ?
       ORDER BY created_at ASC
       LIMIT ?`

  const rows = after
    ? await prisma.$queryRawUnsafe<OrderChatMessageRow[]>(query, input.orderId, after, limit)
    : await prisma.$queryRawUnsafe<OrderChatMessageRow[]>(query, input.orderId, limit)

  return rows.map(mapMessage)
}

export async function createOrderChatMessage(input: {
  orderId: string
  senderId: string
  senderName: string
  senderRole: ChatUserRole
  messageText: string
}) {
  await ensureOrderChatTables()

  const thread = await getOrderChatThreadByOrderId(input.orderId)
  if (!thread) {
    throw new Error("Chat thread not found")
  }

  const trimmedMessage = input.messageText.trim()
  if (!trimmedMessage) {
    throw new Error("Message cannot be empty")
  }
  if (trimmedMessage.length > 1000) {
    throw new Error("Message is too long")
  }

  const now = new Date().toISOString()
  const message: OrderChatMessage = {
    id: crypto.randomUUID(),
    threadId: thread.id,
    orderId: input.orderId,
    senderId: input.senderId,
    senderName: input.senderName.trim().slice(0, 120) || "User",
    senderRole: input.senderRole,
    messageText: trimmedMessage,
    createdAt: now,
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO market_chat_messages
     (id, thread_id, order_id, sender_id, sender_name, sender_role, message_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    message.id,
    message.threadId,
    message.orderId,
    message.senderId,
    message.senderName,
    message.senderRole,
    message.messageText,
    message.createdAt,
  )

  await prisma.$executeRawUnsafe(
    "UPDATE market_chat_threads SET updated_at = ? WHERE order_id = ?",
    message.createdAt,
    message.orderId,
  )

  return message
}
