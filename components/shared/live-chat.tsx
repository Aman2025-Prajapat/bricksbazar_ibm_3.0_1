"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, Send, X, Minimize2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  sender: "user" | "support" | "system"
  message: string
  timestamp: Date
  senderName?: string
}

export function LiveChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState("")
  const [isOnline, setIsOnline] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "system",
      message: "Welcome to BricksBazar support! How can we help you today?",
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: "2",
      sender: "support",
      message: "Hi! I'm here to assist you with any questions about our construction materials.",
      timestamp: new Date(Date.now() - 30000),
      senderName: "Sarah",
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = () => {
    if (!message.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      message: message.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setMessage("")

    // Simulate support response
    setTimeout(
      () => {
        const responses = [
          "Thanks for your message! Let me help you with that.",
          "I understand your concern. Let me check that for you.",
          "That's a great question! Here's what I can tell you...",
          "I'll be happy to assist you with that inquiry.",
        ]

        const supportResponse: Message = {
          id: (Date.now() + 1).toString(),
          sender: "support",
          message: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
          senderName: "Sarah",
        }

        setMessages((prev) => [...prev, supportResponse])
      },
      1000 + Math.random() * 2000,
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 w-80 bg-background border rounded-lg shadow-xl z-50 transition-all",
        isMinimized ? "h-14" : "h-96",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", isOnline ? "bg-green-500" : "bg-gray-400")} />
            <span className="font-medium text-sm">Support Chat</span>
          </div>
          {isOnline && (
            <Badge variant="secondary" className="text-xs">
              Online
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="h-64 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-2", msg.sender === "user" ? "justify-end" : "justify-start")}>
                  {msg.sender !== "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{msg.sender === "support" ? "S" : "SYS"}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg p-3 text-sm",
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : msg.sender === "support"
                          ? "bg-muted"
                          : "bg-blue-50 text-blue-800 text-center",
                    )}
                  >
                    {msg.senderName && <p className="text-xs font-medium mb-1">{msg.senderName}</p>}
                    <p>{msg.message}</p>
                    <p
                      className={cn(
                        "text-xs mt-1 opacity-70",
                        msg.sender === "user" ? "text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button onClick={sendMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
