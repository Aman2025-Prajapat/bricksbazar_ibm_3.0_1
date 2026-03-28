import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import { getDeliveryAlerts, listDeliveries, listOrdersPaginated, listPayments, type Order } from "@/lib/server/market-store"
import { listOrderChatMessages } from "@/lib/server/order-chat-store"

type NotificationType = "order" | "payment" | "delivery" | "message" | "info" | "warning" | "success"
type NotificationPriority = "low" | "medium" | "high"

type UserNotification = {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  timestamp: string
  href?: string
}

function statusLabel(status: Order["status"]) {
  if (status === "pending") return "Pending"
  if (status === "confirmed") return "Confirmed"
  if (status === "shipped") return "Shipped"
  if (status === "delivered") return "Delivered"
  return "Cancelled"
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Math.min(80, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "40", 10) || 40))

  const orderPage = await listOrdersPaginated({
    page: 1,
    limit: 40,
    status: "all",
    buyerId: sessionUser.role === "buyer" ? sessionUser.userId : undefined,
    sellerId: sessionUser.role === "seller" ? sessionUser.userId : undefined,
    distributorId: sessionUser.role === "distributor" ? sessionUser.userId : undefined,
  })

  const orders = orderPage.items
  const orderIds = new Set(orders.map((order) => order.id))
  const notifications: UserNotification[] = []

  orders.forEach((order) => {
    const isPendingRequest = order.status === "pending" && (sessionUser.role === "seller" || sessionUser.role === "distributor")
    notifications.push({
      id: `order-${order.id}-${order.status}`,
      type: "order",
      priority: isPendingRequest ? "high" : order.status === "cancelled" ? "medium" : "low",
      title: isPendingRequest ? "New order request waiting approval" : `Order ${statusLabel(order.status)}`,
      message: `${order.orderNumber} | Buyer: ${order.buyerName} | Rs. ${order.total.toLocaleString()}`,
      timestamp: order.date,
      href:
        sessionUser.role === "distributor"
          ? "/dashboard/distributor/requests"
          : sessionUser.role === "seller"
            ? "/dashboard/seller/orders"
            : sessionUser.role === "buyer"
              ? "/dashboard/buyer/orders"
              : "/dashboard/admin/orders",
    })
  })

  const [payments, deliveries] = await Promise.all([listPayments(), listDeliveries()])

  payments
    .filter((payment) => orderIds.has(payment.orderId))
    .forEach((payment) => {
      notifications.push({
        id: `payment-${payment.id}`,
        type: "payment",
        priority: payment.status === "failed" ? "high" : payment.status === "pending" ? "medium" : "low",
        title:
          payment.status === "paid"
            ? "Payment received"
            : payment.status === "pending"
              ? "Payment pending"
              : "Payment failed",
        message: `Order ${payment.orderId} | Rs. ${payment.amount.toLocaleString()} | ${payment.method}`,
        timestamp: payment.createdAt,
        href:
          sessionUser.role === "distributor"
            ? "/dashboard/distributor/payments"
            : sessionUser.role === "seller"
              ? "/dashboard/seller/payments"
              : "/dashboard/buyer/payments",
      })
    })

  const scopedDeliveries = deliveries.filter((delivery) => {
    if (!orderIds.has(delivery.orderId)) return false
    if (sessionUser.role === "admin") return true
    if (sessionUser.role === "buyer") return delivery.buyerId === sessionUser.userId
    if (sessionUser.role === "seller") return delivery.sellerId === sessionUser.userId
    if (sessionUser.role === "distributor") return delivery.distributorId === sessionUser.userId
    return false
  })

  const deliveryAlertBundles = await Promise.all(scopedDeliveries.slice(0, 20).map((delivery) => getDeliveryAlerts(delivery.id)))
  deliveryAlertBundles.forEach((bundle) => {
    if (!bundle) return
    bundle.alerts.forEach((alert) => {
      notifications.push({
        id: `delivery-${bundle.deliveryId}-${alert.code}`,
        type: "delivery",
        priority: alert.severity === "critical" ? "high" : alert.severity === "warning" ? "medium" : "low",
        title: alert.title,
        message: alert.message,
        timestamp: new Date().toISOString(),
        href:
          sessionUser.role === "distributor"
            ? "/dashboard/distributor/deliveries"
            : sessionUser.role === "seller"
              ? "/dashboard/seller/orders"
              : "/dashboard/buyer/orders",
      })
    })
  })

  const chatPreviewOrders = orders.slice(0, 6)
  const chatBundles = await Promise.all(
    chatPreviewOrders.map(async (order) => {
      const messages = await listOrderChatMessages({ orderId: order.id, limit: 40 })
      return {
        order,
        latest: messages.length > 0 ? messages[messages.length - 1] : null,
      }
    }),
  )

  chatBundles.forEach(({ order, latest }) => {
    if (!latest) return
    if (latest.senderId === sessionUser.userId) return
    notifications.push({
      id: `chat-${latest.id}`,
      type: "message",
      priority: "medium",
      title: `New message on ${order.orderNumber}`,
      message: `${latest.senderName}: ${latest.messageText.slice(0, 90)}`,
      timestamp: latest.createdAt,
      href:
        sessionUser.role === "distributor"
          ? "/dashboard/distributor/messages"
          : sessionUser.role === "seller"
            ? "/dashboard/seller/orders"
            : "/dashboard/buyer/orders",
    })
  })

  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return NextResponse.json({ notifications: notifications.slice(0, limit) })
}
