"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Send, MessageCircle, Clock, CheckCircle2, AlertCircle } from "lucide-react"

interface Message {
  id: string
  sender: string
  senderType: "buyer" | "admin" | "distributor"
  subject: string
  content: string
  timestamp: string
  status: "unread" | "read" | "replied"
  priority: "low" | "medium" | "high"
  orderId?: string
}

export default function SellerMessagesPage() {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const messages: Message[] = [
    {
      id: "1",
      sender: "John Builder",
      senderType: "buyer",
      subject: "Question about cement quality",
      content:
        "Hi, I'm interested in your premium cement. Can you provide more details about the strength grade and delivery timeline?",
      timestamp: "2024-01-15 10:30 AM",
      status: "unread",
      priority: "high",
      orderId: "ORD-001",
    },
    {
      id: "2",
      sender: "Sarah Construction",
      senderType: "buyer",
      subject: "Bulk order inquiry",
      content: "I need 500 bags of cement for a large project. What's your best price for bulk orders?",
      timestamp: "2024-01-15 09:15 AM",
      status: "read",
      priority: "medium",
    },
    {
      id: "3",
      sender: "BricksBazar Admin",
      senderType: "admin",
      subject: "Account verification required",
      content:
        "Please update your business documents for account verification. This is required to maintain your seller status.",
      timestamp: "2024-01-14 02:00 PM",
      status: "replied",
      priority: "high",
    },
    {
      id: "4",
      sender: "FastDelivery Co.",
      senderType: "distributor",
      subject: "Delivery schedule update",
      content: "Your shipment for order #ORD-002 has been rescheduled to tomorrow due to weather conditions.",
      timestamp: "2024-01-14 11:45 AM",
      status: "read",
      priority: "medium",
      orderId: "ORD-002",
    },
  ]

  const filteredMessages = messages.filter(
    (message) =>
      message.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "unread":
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      case "read":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "replied":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      default:
        return <MessageCircle className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleSendReply = () => {
    if (replyText.trim() && selectedMessage) {
      // Here you would typically send the reply to your backend
      console.log("Sending reply:", replyText)
      setReplyText("")
      // Update message status to replied
      selectedMessage.status = "replied"
    }
  }

  const unreadCount = messages.filter((m) => m.status === "unread").length
  const highPriorityCount = messages.filter((m) => m.priority === "high").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Manage customer inquiries and communications</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {unreadCount} Unread
          </Badge>
          {highPriorityCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {highPriorityCount} High Priority
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Inbox
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 cursor-pointer border-b hover:bg-muted/50 transition-colors ${
                      selectedMessage?.id === message.id ? "bg-muted" : ""
                    } ${message.status === "unread" ? "border-l-4 border-l-blue-500" : ""}`}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.sender
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{message.sender}</p>
                          <p className="text-xs text-muted-foreground">{message.senderType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(message.status)}
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(message.priority)}`}>
                          {message.priority}
                        </Badge>
                      </div>
                    </div>
                    <h4 className="font-medium text-sm mt-2 truncate">{message.subject}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{message.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">{message.timestamp}</p>
                      {message.orderId && (
                        <Badge variant="outline" className="text-xs">
                          {message.orderId}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {selectedMessage.sender
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                      <CardDescription>
                        From: {selectedMessage.sender} ({selectedMessage.senderType})
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getPriorityColor(selectedMessage.priority)}>
                      {selectedMessage.priority} priority
                    </Badge>
                    {getStatusIcon(selectedMessage.status)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{selectedMessage.timestamp}</span>
                  {selectedMessage.orderId && <Badge variant="outline">Order: {selectedMessage.orderId}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>

                {/* Reply Section */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-3">Reply</h3>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyText.trim()}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Select a message</h3>
                  <p className="text-muted-foreground">Choose a message from the inbox to view and reply</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Messages</p>
                <p className="text-2xl font-bold">{messages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Unread</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pending Reply</p>
                <p className="text-2xl font-bold">{messages.filter((m) => m.status === "read").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Replied</p>
                <p className="text-2xl font-bold">{messages.filter((m) => m.status === "replied").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
