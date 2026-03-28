"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, MessageSquare, Send } from "lucide-react"

type ChatRole = "buyer" | "seller" | "distributor" | "admin"

type OrderChatMessage = {
  id: string
  threadId: string
  orderId: string
  senderId: string
  senderName: string
  senderRole: ChatRole
  messageText: string
  createdAt: string
}

type ChatApiPayload = {
  messages?: OrderChatMessage[]
  viewerUserId?: string
  participants?: {
    buyerName: string
    sellerName: string
    distributorName?: string
  }
  error?: string
}

type OrderChatPanelProps = {
  orderId: string
  className?: string
}

function roleLabel(role: ChatRole) {
  if (role === "buyer") return "Buyer"
  if (role === "seller") return "Seller"
  if (role === "distributor") return "Distributor"
  return "Admin"
}

function mergeMessages(existing: OrderChatMessage[], incoming: OrderChatMessage[]) {
  if (incoming.length === 0) return existing
  const map = new Map<string, OrderChatMessage>()
  for (const message of existing) {
    map.set(message.id, message)
  }
  for (const message of incoming) {
    map.set(message.id, message)
  }
  return Array.from(map.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function OrderChatPanel({ orderId, className = "" }: OrderChatPanelProps) {
  const [messages, setMessages] = useState<OrderChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [streamLive, setStreamLive] = useState(false)
  const [viewerUserId, setViewerUserId] = useState("")
  const [participants, setParticipants] = useState<ChatApiPayload["participants"] | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const loadChat = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/orders/${orderId}/chat?limit=100`, {
        credentials: "include",
        cache: "no-store",
      })
      const payload = (await response.json()) as ChatApiPayload
      if (!response.ok) {
        throw new Error(payload.error || "Could not load chat")
      }
      setMessages(payload.messages || [])
      setViewerUserId(payload.viewerUserId || "")
      setParticipants(payload.participants || null)
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Could not load chat")
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    setMessages([])
    setDraft("")
    setStreamLive(false)
    setError("")
    void loadChat()

    let closed = false
    const source = new EventSource(`/api/orders/${orderId}/chat/stream?limit=80`)

    const onMessages = (event: MessageEvent<string>) => {
      if (closed) return
      try {
        const payload = JSON.parse(event.data) as { messages?: OrderChatMessage[] }
        if (!payload.messages || payload.messages.length === 0) return
        setMessages((current) => mergeMessages(current, payload.messages || []))
        setStreamLive(true)
      } catch {
        // Keep previous messages if a malformed chunk arrives.
      }
    }

    source.addEventListener("sync", onMessages)
    source.addEventListener("messages", onMessages)
    source.onerror = () => {
      if (!closed) {
        setStreamLive(false)
      }
    }

    return () => {
      closed = true
      source.close()
    }
  }, [loadChat, orderId])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages.length])

  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending])

  const sendMessage = async () => {
    const text = draft.trim()
    if (!text || sending) return

    setSending(true)
    setError("")
    try {
      const response = await fetch(`/api/orders/${orderId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text }),
      })
      const payload = (await response.json()) as { message?: OrderChatMessage; error?: string }
      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Could not send message")
      }
      setMessages((current) => mergeMessages(current, [payload.message!]))
      setDraft("")
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`rounded-lg border p-3 space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <p className="text-sm font-medium">Order Chat</p>
          <Badge variant={streamLive ? "default" : "secondary"}>{streamLive ? "Live" : "Syncing"}</Badge>
        </div>
        {participants ? (
          <p className="text-xs text-muted-foreground">
            {participants.buyerName} <span className="mx-1">|</span> {participants.sellerName}
            {participants.distributorName ? (
              <>
                <span className="mx-1">|</span>
                {participants.distributorName}
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading chat...
        </div>
      ) : (
        <div ref={listRef} className="h-44 overflow-y-auto rounded border bg-muted/20 p-2 space-y-2">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground">Start conversation with assigned supplier/distributor.</p>
          ) : (
            messages.map((message) => {
              const mine = viewerUserId && message.senderId === viewerUserId
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded px-2 py-1 text-xs ${mine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                    <p className={`font-medium ${mine ? "text-primary-foreground" : "text-foreground"}`}>
                      {message.senderName} ({roleLabel(message.senderRole)})
                    </p>
                    <p className={`${mine ? "text-primary-foreground" : "text-foreground"}`}>{message.messageText}</p>
                    <p className={`mt-1 ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Type message..."
          value={draft}
          maxLength={1000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              void sendMessage()
            }
          }}
        />
        <Button size="sm" onClick={() => void sendMessage()} disabled={!canSend}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
