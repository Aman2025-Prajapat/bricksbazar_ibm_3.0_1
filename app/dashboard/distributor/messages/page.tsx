"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, MessageSquare, RefreshCw, Search } from "lucide-react"
import { OrderChatPanel } from "@/components/chat/order-chat-panel"

type ApiOrder = {
  id: string
  orderNumber: string
  buyerName: string
  sellerName: string
  date: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
}

type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  messageText: string
  createdAt: string
}

type Conversation = {
  orderId: string
  orderNumber: string
  buyerName: string
  sellerName: string
  status: ApiOrder["status"]
  latestMessage: string
  latestSender: string
  latestAt: string
  unreadEstimate: number
}

export default function DistributorMessagesPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState("")

  const loadConversations = async () => {
    setError("")
    setLoading(true)
    try {
      const ordersRes = await fetch("/api/orders?limit=25", { credentials: "include", cache: "no-store" })
      const ordersPayload = (await ordersRes.json()) as { orders?: ApiOrder[]; error?: string }
      if (!ordersRes.ok || !ordersPayload.orders) {
        throw new Error(ordersPayload.error || "Could not load conversations")
      }

      const orders = ordersPayload.orders
      const conversationRows = await Promise.all(
        orders.map(async (order) => {
          try {
            const chatRes = await fetch(`/api/orders/${order.id}/chat?limit=120`, {
              credentials: "include",
              cache: "no-store",
            })
            const chatPayload = (await chatRes.json()) as { messages?: ChatMessage[]; viewerUserId?: string }
            const messages = chatRes.ok && Array.isArray(chatPayload.messages) ? chatPayload.messages : []
            const viewerUserId = chatPayload.viewerUserId || ""
            const latest = messages.length > 0 ? messages[messages.length - 1] : null
            const unreadEstimate = messages.filter((message) => {
              if (!viewerUserId || message.senderId === viewerUserId) return false
              const createdAt = new Date(message.createdAt).getTime()
              return Date.now() - createdAt <= 6 * 60 * 60 * 1000
            }).length

            return {
              orderId: order.id,
              orderNumber: order.orderNumber,
              buyerName: order.buyerName,
              sellerName: order.sellerName,
              status: order.status,
              latestMessage: latest?.messageText || "Start conversation with buyer/seller.",
              latestSender: latest?.senderName || "No messages yet",
              latestAt: latest?.createdAt || order.date,
              unreadEstimate,
            } satisfies Conversation
          } catch {
            return {
              orderId: order.id,
              orderNumber: order.orderNumber,
              buyerName: order.buyerName,
              sellerName: order.sellerName,
              status: order.status,
              latestMessage: "Chat unavailable right now.",
              latestSender: "System",
              latestAt: order.date,
              unreadEstimate: 0,
            } satisfies Conversation
          }
        }),
      )

      conversationRows.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
      setConversations(conversationRows)
      setSelectedOrderId((current) => (current && conversationRows.some((row) => row.orderId === current) ? current : conversationRows[0]?.orderId || ""))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load conversations")
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (conversation) =>
        conversation.orderNumber.toLowerCase().includes(q) ||
        conversation.buyerName.toLowerCase().includes(q) ||
        conversation.sellerName.toLowerCase().includes(q) ||
        conversation.latestMessage.toLowerCase().includes(q),
    )
  }, [conversations, query])

  const selectedConversation = filtered.find((conversation) => conversation.orderId === selectedOrderId) || filtered[0]
  const unreadTotal = conversations.reduce((sum, conversation) => sum + conversation.unreadEstimate, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Messages</h1>
          <p className="text-muted-foreground">Live order chat between buyer, seller, and distributor</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{conversations.length} conversations</Badge>
          <Badge variant={unreadTotal > 0 ? "default" : "outline"}>{unreadTotal} recent</Badge>
          <Button variant="outline" className="bg-transparent" onClick={() => void loadConversations()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Inbox
            </CardTitle>
            <CardDescription>Pick a conversation to open live chat.</CardDescription>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search order/buyer/seller"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="py-8 text-muted-foreground flex items-center justify-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Loading conversations...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No conversation found.</div>
            ) : (
              filtered.map((conversation) => (
                <button
                  key={conversation.orderId}
                  type="button"
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedConversation?.orderId === conversation.orderId ? "bg-muted border-primary/40" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedOrderId(conversation.orderId)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{conversation.orderNumber}</p>
                    {conversation.unreadEstimate > 0 ? <Badge>{conversation.unreadEstimate}</Badge> : <Badge variant="outline">Seen</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{conversation.buyerName} | {conversation.sellerName}</p>
                  <p className="text-xs mt-1 line-clamp-2">{conversation.latestSender}: {conversation.latestMessage}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{new Date(conversation.latestAt).toLocaleString()}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{selectedConversation ? `Order ${selectedConversation.orderNumber}` : "Live Chat"}</CardTitle>
            <CardDescription>
              {selectedConversation
                ? `${selectedConversation.buyerName} and ${selectedConversation.sellerName}`
                : "Select a conversation from inbox"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedConversation ? (
              <OrderChatPanel orderId={selectedConversation.orderId} />
            ) : (
              <div className="py-20 text-center text-muted-foreground">Choose any conversation to start messaging.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
