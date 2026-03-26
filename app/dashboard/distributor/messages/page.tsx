"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, Search, Send } from "lucide-react"

type DistributorMessage = {
  id: string
  sender: string
  subject: string
  content: string
  status: "unread" | "read"
}

const messages: DistributorMessage[] = [
  {
    id: "1",
    sender: "Buyer Support",
    subject: "Delivery ETA update needed",
    content: "Please share updated ETA for order ORD-8891.",
    status: "unread",
  },
  {
    id: "2",
    sender: "Admin Team",
    subject: "Compliance document reminder",
    content: "Upload updated vehicle insurance certificates.",
    status: "read",
  },
]

export default function DistributorMessagesPage() {
  const [query, setQuery] = useState("")

  const filtered = messages.filter(
    (message) =>
      message.sender.toLowerCase().includes(query.toLowerCase()) ||
      message.subject.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Handle operational communication with buyers and admin.</p>
        </div>
        <Badge variant="secondary">{filtered.length} conversations</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Inbox
          </CardTitle>
          <CardDescription>Search and respond to delivery-related messages.</CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search sender or subject"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.map((message) => (
            <div key={message.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium">{message.subject}</p>
                  <p className="text-sm text-muted-foreground">From: {message.sender}</p>
                </div>
                <Badge variant={message.status === "unread" ? "default" : "outline"}>{message.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{message.content}</p>
              <div className="mt-3 flex justify-end">
                <Button size="sm" className="gap-2">
                  <Send className="h-4 w-4" />
                  Reply
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
