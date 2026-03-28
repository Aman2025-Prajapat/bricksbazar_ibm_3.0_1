"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, CheckCircle, AlertCircle, Info, Package, CreditCard, MessageSquare, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"

type Notification = {
  id: string
  type: "success" | "warning" | "info" | "order" | "payment" | "delivery" | "message"
  priority: "low" | "medium" | "high"
  title: string
  message: string
  timestamp: string
  href?: string
}

export function NotificationCenter() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [readIds, setReadIds] = useState<string[]>([])
  const readStoreKey = useMemo(() => (user ? `bricksbazaar_read_notifications_${user.id}` : ""), [user])

  useEffect(() => {
    if (!readStoreKey) return
    try {
      const raw = window.localStorage.getItem(readStoreKey)
      if (!raw) {
        setReadIds([])
        return
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setReadIds(parsed.filter((entry): entry is string => typeof entry === "string"))
      }
    } catch {
      setReadIds([])
    }
  }, [readStoreKey])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications?limit=30", {
          credentials: "include",
          cache: "no-store",
        })
        const payload = (await response.json()) as { notifications?: Notification[] }
        if (!response.ok || !payload.notifications) {
          throw new Error("Could not load notifications")
        }
        if (!cancelled) {
          setNotifications(payload.notifications)
        }
      } catch {
        if (!cancelled) {
          setNotifications([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadNotifications()
    timer = setInterval(() => {
      void loadNotifications()
    }, 20000)

    return () => {
      cancelled = true
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [user])

  const unreadCount = notifications.filter((notification) => !readIds.includes(notification.id)).length

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      if (readStoreKey) {
        window.localStorage.setItem(readStoreKey, JSON.stringify(next))
      }
      return next
    })
  }

  const markAllAsRead = () => {
    const next = Array.from(new Set([...readIds, ...notifications.map((notification) => notification.id)]))
    setReadIds(next)
    if (readStoreKey) {
      window.localStorage.setItem(readStoreKey, JSON.stringify(next))
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case "order":
        return <Package className="h-4 w-4 text-blue-500" />
      case "payment":
        return <CreditCard className="h-4 w-4 text-green-500" />
      case "message":
        return <MessageSquare className="h-4 w-4 text-indigo-500" />
      case "delivery":
        return <Truck className="h-4 w-4 text-orange-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return "Just now"
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return `${Math.floor(minutes / 1440)}d ago`
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors",
                  readIds.includes(notification.id) ? "bg-muted/50 border-muted" : "bg-background border-border hover:bg-muted/30",
                )}
                onClick={() => {
                  markAsRead(notification.id)
                  if (notification.href) {
                    window.location.assign(notification.href)
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {getIcon(notification.type)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {!readIds.includes(notification.id) && <div className="h-2 w-2 bg-blue-500 rounded-full" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(notification.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}
            {loading ? <p className="text-xs text-muted-foreground px-1">Loading notifications...</p> : null}
            {!loading && notifications.length === 0 ? <p className="text-xs text-muted-foreground px-1">No notifications yet.</p> : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
