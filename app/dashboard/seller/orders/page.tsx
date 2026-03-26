"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Truck, CheckCircle, Clock, AlertCircle, Eye, MessageSquare, Loader2, Navigation } from "lucide-react"

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"

type ApiOrderItem = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  sellerId: string
  sellerName: string
}

type ApiOrder = {
  id: string
  orderNumber: string
  buyerName: string
  total: number
  status: OrderStatus
  date: string
  estimatedDelivery: string
  trackingNumber?: string
  items: ApiOrderItem[]
}

type TrackingPayload = {
  delivery?: {
    pickupAddress: string
    deliveryAddress: string
    currentLat?: number
    currentLng?: number
    currentAddress?: string
  } | null
  error?: string
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)

  const statuses = ["all", "pending", "confirmed", "shipped", "delivered", "cancelled"]

  useEffect(() => {
    let cancelled = false

    const loadOrders = async () => {
      try {
        const response = await fetch("/api/orders", { credentials: "include", cache: "no-store" })
        const payload = (await response.json()) as { orders?: ApiOrder[]; error?: string }
        if (!response.ok || !payload.orders) {
          throw new Error(payload.error || "Could not load orders")
        }
        if (!cancelled) {
          setOrders(payload.orders)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load orders")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadOrders()

    return () => {
      cancelled = true
    }
  }, [])

  const getStatusColor = (status: OrderStatus) => {
    if (status === "cancelled") return "destructive" as const
    if (status === "pending" || status === "shipped") return "secondary" as const
    return "default" as const
  }

  const getStatusIcon = (status: OrderStatus) => {
    if (status === "pending") return <Clock className="h-4 w-4" />
    if (status === "confirmed") return <CheckCircle className="h-4 w-4" />
    if (status === "shipped") return <Truck className="h-4 w-4" />
    if (status === "delivered") return <CheckCircle className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesSearch =
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.items.some((item) => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesStatus = selectedStatus === "all" || order.status === selectedStatus
        return matchesSearch && matchesStatus
      }),
    [orders, searchTerm, selectedStatus],
  )

  const openLiveTracking = async (order: ApiOrder) => {
    setTrackingOrderId(order.id)
    try {
      const response = await fetch(`/api/orders/${order.id}/tracking`, { credentials: "include", cache: "no-store" })
      const payload = (await response.json()) as TrackingPayload
      if (!response.ok) {
        throw new Error(payload.error || "Could not load tracking")
      }
      if (!payload.delivery) {
        throw new Error("Delivery assignment not ready for this order")
      }

      const source =
        payload.delivery.currentLat !== undefined && payload.delivery.currentLng !== undefined
          ? `${payload.delivery.currentLat},${payload.delivery.currentLng}`
          : payload.delivery.currentAddress || payload.delivery.pickupAddress
      const destination = payload.delivery.deliveryAddress
      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (trackingError) {
      setError(trackingError instanceof Error ? trackingError.message : "Could not open live tracking")
    } finally {
      setTrackingOrderId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-muted-foreground">Track and manage customer orders for your products</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statuses.slice(1).map((status) => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(status as OrderStatus)}
                <div>
                  <p className="text-sm text-muted-foreground capitalize">{status}</p>
                  <p className="text-2xl font-bold">{orders.filter((order) => order.status === status).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search orders, products, or buyers..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "all" ? "All Orders" : status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-10 text-muted-foreground flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading orders...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                      <Badge variant={getStatusColor(order.status)} className="gap-1">
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">Ordered on {new Date(order.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">Rs. {order.total.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Order Items</h4>
                    <div className="space-y-1 text-sm">
                      {order.items.map((item) => (
                        <p key={item.productId}>
                          <span className="text-muted-foreground">{item.productName}:</span> {item.quantity} x Rs. {item.unitPrice}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Buyer Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Buyer:</span> {order.buyerName}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Expected Delivery:</span>{" "}
                        {new Date(order.estimatedDelivery).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Tracking:</span> {order.trackingNumber || "Not assigned"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t flex-wrap">
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <MessageSquare className="h-4 w-4" />
                    Contact Buyer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                    disabled={trackingOrderId === order.id}
                    onClick={() => openLiveTracking(order)}
                  >
                    {trackingOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                    Track Live
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">No orders found for current filters.</CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  )
}
