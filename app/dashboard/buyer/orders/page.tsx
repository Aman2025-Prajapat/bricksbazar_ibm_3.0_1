"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OrderChatPanel } from "@/components/chat/order-chat-panel"
import { Package, Truck, CheckCircle, Clock, Search, Eye, Download, MessageCircle, Loader2, RefreshCw, Navigation, Star, CreditCard } from "lucide-react"
import { downloadPdfDocument } from "@/lib/pdf-export"

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
type PaymentStatus = "pending" | "paid" | "failed"

type OrderItem = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  sellerId: string
  sellerName: string
}

interface Order {
  id: string
  orderNumber: string
  date: string
  status: OrderStatus
  total: number
  items: OrderItem[]
  sellerId: string
  sellerName: string
  sellerVerified?: boolean
  estimatedDelivery: string
  trackingNumber?: string
  deliveryAddress?: string
  pickupAddress?: string
  distributorId?: string
  distributorName?: string
  distributorVerified?: boolean
  deliveryStatus?: "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"
  vehicleType?: string
  vehicleNumber?: string
  driverName?: string
  driverPhone?: string
  etaMinutes?: number
  deliveryUpdatedAt?: string
  supplierRating?: {
    supplierId: string
    supplierName: string
    rating: number
    reviewText?: string
    updatedAt: string
  } | null
}

type Payment = {
  id: string
  orderId: string
  amount: number
  method: string
  status: PaymentStatus
  createdAt: string
}

type DeliveryTracking = {
  id: string
  status: "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"
  distributorName: string
  vehicleNumber: string
  vehicleType: string
  driverName: string
  driverPhone: string
  distributorVerified?: boolean
  pickupAddress: string
  deliveryAddress: string
  currentLat?: number
  currentLng?: number
  currentAddress?: string
  etaMinutes: number
  updatedAt: string
}

type DeliveryLocation = {
  id: string
  lat: number
  lng: number
  address: string
  status: "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"
  speedKph: number
  createdAt: string
}

type DeliveryOtp = {
  deliveryId: string
  otpCode: string | null
  isVerified: boolean
  expiresAt: string
  createdAt: string
  updatedAt: string
}

type DeliveryProof = {
  id: string
  deliveryId: string
  otpVerified: boolean
  podImageUrl?: string
  podNote?: string
  receivedBy?: string
  deliveredAt: string
  createdAt: string
}

type DeliveryAlertSeverity = "info" | "warning" | "critical"

type DeliveryAlert = {
  code: "assignment_missing" | "delay_risk" | "stale_location" | "route_deviation"
  severity: DeliveryAlertSeverity
  title: string
  message: string
}

function buildDeliveryTimeline(order: Order, trackingStatus?: DeliveryTracking["status"]) {
  const effectiveStatus = trackingStatus || order.deliveryStatus || "pickup_ready"
  const packedDone = order.status !== "cancelled"
  const pickedDone = ["confirmed", "shipped", "delivered"].includes(order.status)
  const inTransitDone = ["in_transit", "nearby", "delivered"].includes(effectiveStatus)
  const nearYouDone = ["nearby", "delivered"].includes(effectiveStatus)
  const deliveredDone = effectiveStatus === "delivered" || order.status === "delivered"

  return [
    { label: "Packed", done: packedDone },
    { label: "Picked", done: pickedDone },
    { label: "In Transit", done: inTransitDone },
    { label: "Near You", done: nearYouDone },
    { label: "Delivered", done: deliveredDone },
  ]
}

function renderVerifiedBadge(verified?: boolean, label = "Verified") {
  if (!verified) return null
  return <Badge className="h-5 bg-emerald-100 px-2 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100">{label}</Badge>
}

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [chatOrderId, setChatOrderId] = useState<string | null>(null)
  const [chatOrderNumber, setChatOrderNumber] = useState("")
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingError, setTrackingError] = useState("")
  const [trackingMessage, setTrackingMessage] = useState("")
  const [selectedTracking, setSelectedTracking] = useState<DeliveryTracking | null>(null)
  const [trackingLocations, setTrackingLocations] = useState<DeliveryLocation[]>([])
  const [selectedOtp, setSelectedOtp] = useState<DeliveryOtp | null>(null)
  const [selectedProof, setSelectedProof] = useState<DeliveryProof | null>(null)
  const [selectedAlerts, setSelectedAlerts] = useState<DeliveryAlert[]>([])
  const [issuingOtp, setIssuingOtp] = useState(false)
  const [supplierRatingValue, setSupplierRatingValue] = useState(5)
  const [supplierReviewText, setSupplierReviewText] = useState("")
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

  const loadData = async (silent = false) => {
    if (!silent) {
      setRefreshing(true)
    }

    try {
      const [ordersRes, paymentsRes] = await Promise.all([
        fetch("/api/orders", { credentials: "include", cache: "no-store" }),
        fetch("/api/payments", { credentials: "include", cache: "no-store" }),
      ])

      const [ordersPayload, paymentsPayload] = await Promise.all([
        ordersRes.json() as Promise<{ orders?: Order[]; error?: string }>,
        paymentsRes.json() as Promise<{ payments?: Payment[]; error?: string }>,
      ])

      if (!ordersRes.ok || !ordersPayload.orders) {
        throw new Error(ordersPayload.error || "Could not load orders")
      }
      if (!paymentsRes.ok || !paymentsPayload.payments) {
        throw new Error(paymentsPayload.error || "Could not load payments")
      }

      setOrders(ordersPayload.orders)
      setPayments(paymentsPayload.payments)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load orders")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(true)
  }, [])

  const paymentByOrder = useMemo(() => {
    const map = new Map<string, Payment>()
    payments.forEach((payment) => {
      map.set(payment.orderId, payment)
    })
    return map
  }, [payments])

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const q = searchTerm.trim().toLowerCase()
        if (!q) return true

        const hasItemMatch = order.items.some((item) => item.productName.toLowerCase().includes(q))

        return (
          order.orderNumber.toLowerCase().includes(q) ||
          order.sellerName.toLowerCase().includes(q) ||
          (order.trackingNumber || "").toLowerCase().includes(q) ||
          hasItemMatch
        )
      }),
    [orders, searchTerm],
  )

  const activeOrders = filteredOrders.filter((order) => ["pending", "confirmed", "shipped"].includes(order.status))
  const completedOrders = filteredOrders.filter((order) => ["delivered", "cancelled"].includes(order.status))

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) || null, [orders, selectedOrderId])
  const selectedPayment = selectedOrder ? paymentByOrder.get(selectedOrder.id) : undefined

  useEffect(() => {
    if (!selectedOrder) {
      setSupplierRatingValue(5)
      setSupplierReviewText("")
      return
    }
    setSupplierRatingValue(selectedOrder.supplierRating?.rating || 5)
    setSupplierReviewText(selectedOrder.supplierRating?.reviewText || "")
  }, [selectedOrder])

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedTracking(null)
      setTrackingLocations([])
      setSelectedOtp(null)
      setSelectedProof(null)
      setSelectedAlerts([])
      setTrackingError("")
      setTrackingMessage("")
      return
    }

    let cancelled = false
    const loadTracking = async (showLoader: boolean) => {
      if (showLoader) {
        setTrackingLoading(true)
      }
      setTrackingError("")
      try {
        const response = await fetch(`/api/orders/${selectedOrderId}/tracking`, {
          credentials: "include",
          cache: "no-store",
        })
        const payload = (await response.json()) as {
          delivery?: DeliveryTracking | null
          locations?: DeliveryLocation[]
          otp?: DeliveryOtp | null
          proof?: DeliveryProof | null
          alerts?: DeliveryAlert[]
          error?: string
        }
        if (!response.ok) {
          throw new Error(payload.error || "Could not load tracking details")
        }
        if (!cancelled) {
          setSelectedTracking(payload.delivery || null)
          setTrackingLocations(payload.locations || [])
          setSelectedOtp(payload.otp || null)
          setSelectedProof(payload.proof || null)
          setSelectedAlerts(payload.alerts || [])
        }
      } catch (trackingLoadError) {
        if (!cancelled) {
          setTrackingError(
            trackingLoadError instanceof Error ? trackingLoadError.message : "Could not load tracking details",
          )
        }
      } finally {
        if (!cancelled && showLoader) {
          setTrackingLoading(false)
        }
      }
    }

    void loadTracking(true)
    const source = new EventSource("/api/deliveries/stream")
    source.addEventListener("deliveries", (event) => {
      if (cancelled) return
      try {
        const payload = JSON.parse(event.data) as { deliveries?: Array<{ orderId: string }> }
        const hasSelectedOrder = (payload.deliveries || []).some((delivery) => delivery.orderId === selectedOrderId)
        if (hasSelectedOrder) {
          void loadTracking(false)
        }
      } catch {
        // Ignore malformed chunk and keep previous state.
      }
    })

    return () => {
      cancelled = true
      source.close()
    }
  }, [selectedOrderId])

  const getStatusIcon = (status: OrderStatus) => {
    if (status === "pending") return <Clock className="h-4 w-4" />
    if (status === "confirmed") return <CheckCircle className="h-4 w-4" />
    if (status === "shipped") return <Truck className="h-4 w-4" />
    if (status === "delivered") return <Package className="h-4 w-4" />
    return <Clock className="h-4 w-4" />
  }

  const getStatusColor = (status: OrderStatus) => {
    if (status === "cancelled") return "destructive" as const
    if (status === "pending") return "secondary" as const
    return "default" as const
  }

  const getPaymentBadge = (status: PaymentStatus | "missing") => {
    if (status === "paid") return <Badge className="bg-green-100 text-green-800">Paid</Badge>
    if (status === "pending") return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
    if (status === "failed") return <Badge className="bg-red-100 text-red-800">Failed</Badge>
    return <Badge variant="outline">Not available</Badge>
  }

  const downloadInvoice = (order: Order) => {
    const payment = paymentByOrder.get(order.id)
    downloadPdfDocument({
      filename: `${order.orderNumber}-invoice.pdf`,
      title: "BricksBazar Invoice",
      subtitle: `Order ${order.orderNumber}`,
      meta: [
        `Date: ${new Date(order.date).toLocaleString()}`,
        `Seller: ${order.sellerName}`,
        `Order Status: ${order.status}`,
        `Payment: ${payment?.status || "not available"} (${payment?.method || "N/A"})`,
      ],
      sections: [
        {
          heading: "Items",
          lines: order.items.map(
            (item) =>
              `${item.productName} | Qty ${item.quantity} | Unit Rs ${item.unitPrice.toLocaleString()} | Total Rs ${item.lineTotal.toLocaleString()}`,
          ),
        },
        {
          heading: "Totals",
          lines: [`Grand Total: Rs. ${order.total.toLocaleString()}`],
        },
      ],
    })
  }

  const contactSupport = (order: Order) => {
    const subject = encodeURIComponent(`Support needed for ${order.orderNumber}`)
    const body = encodeURIComponent(
      `Hello Support Team,\n\nOrder: ${order.orderNumber}\nStatus: ${order.status}\nSeller: ${order.sellerName}\nTotal: Rs. ${order.total.toLocaleString()}\n\nPlease help me with this order issue.\n`,
    )
    window.location.href = `mailto:support@bricksbazar.com?subject=${subject}&body=${body}`
  }

  const openPaymentForOrder = (order: Order) => {
    window.location.href = `/dashboard/buyer/payments`
    setTrackingMessage(`Order ${order.orderNumber} approved hai. Ab payment complete karo.`)
  }

  const openLiveTracking = () => {
    if (!selectedTracking) return
    const destination = selectedTracking.deliveryAddress
    const source =
      selectedTracking.currentLat !== undefined && selectedTracking.currentLng !== undefined
        ? `${selectedTracking.currentLat},${selectedTracking.currentLng}`
        : selectedTracking.currentAddress || selectedTracking.pickupAddress
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const buyerMapEmbedUrl = useMemo(() => {
    if (!selectedTracking || selectedTracking.currentLat === undefined || selectedTracking.currentLng === undefined) {
      return null
    }
    const lat = selectedTracking.currentLat
    const lng = selectedTracking.currentLng
    const delta = 0.015
    const bboxLeft = (lng - delta).toFixed(6)
    const bboxBottom = (lat - delta).toFixed(6)
    const bboxRight = (lng + delta).toFixed(6)
    const bboxTop = (lat + delta).toFixed(6)
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bboxLeft}%2C${bboxBottom}%2C${bboxRight}%2C${bboxTop}&layer=mapnik&marker=${lat}%2C${lng}`
  }, [selectedTracking])

  const issueOtp = async () => {
    if (!selectedTracking) return
    setIssuingOtp(true)
    setTrackingMessage("")
    setTrackingError("")
    try {
      const response = await fetch(`/api/deliveries/${selectedTracking.id}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ expiresInMinutes: 30 }),
      })
      const payload = (await response.json()) as { otp?: DeliveryOtp | null; error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Could not generate OTP")
      }
      setSelectedOtp(payload.otp || null)
      setTrackingMessage("Delivery OTP generated successfully. Share this with delivery agent.")
    } catch (issueError) {
      setTrackingError(issueError instanceof Error ? issueError.message : "Could not generate OTP")
    } finally {
      setIssuingOtp(false)
    }
  }

  const submitSupplierRating = async () => {
    if (!selectedOrder || selectedOrder.status !== "delivered") return
    setRatingSubmitting(true)
    setTrackingError("")
    setTrackingMessage("")
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplierId: selectedOrder.sellerId !== "multi-seller" ? selectedOrder.sellerId : undefined,
          rating: supplierRatingValue,
          reviewText: supplierReviewText.trim() || undefined,
        }),
      })

      const payload = (await response.json()) as {
        rating?: { rating: number; reviewText?: string; supplierId: string; supplierName: string; updatedAt: string }
        error?: string
      }
      if (!response.ok || !payload.rating) {
        throw new Error(payload.error || "Could not submit supplier rating")
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === selectedOrder.id
            ? {
                ...order,
                supplierRating: {
                  supplierId: payload.rating!.supplierId,
                  supplierName: payload.rating!.supplierName,
                  rating: payload.rating!.rating,
                  reviewText: payload.rating!.reviewText,
                  updatedAt: payload.rating!.updatedAt,
                },
              }
            : order,
        ),
      )
      setTrackingMessage("Supplier rating submitted successfully. Thanks for your feedback.")
    } catch (ratingError) {
      setTrackingError(ratingError instanceof Error ? ratingError.message : "Could not submit supplier rating")
    } finally {
      setRatingSubmitting(false)
    }
  }

  const getAlertVariant = (severity: DeliveryAlertSeverity) => {
    if (severity === "critical") return "destructive" as const
    if (severity === "warning") return "secondary" as const
    return "outline" as const
  }

  const OrderCard = ({ order }: { order: Order }) => {
    const payment = paymentByOrder.get(order.id)

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4 gap-3">
            <div>
              <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
              <p className="text-sm text-muted-foreground">Ordered on {new Date(order.date).toLocaleDateString()}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">from {order.sellerName}</p>
                {renderVerifiedBadge(order.sellerVerified, "Verified Seller")}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Distributor: {order.distributorName || "Pending assignment"}</p>
                {renderVerifiedBadge(order.distributorVerified, "Verified Distributor")}
              </div>
            </div>
            <Badge variant={getStatusColor(order.status)} className="flex items-center gap-1">
              {getStatusIcon(order.status)}
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-semibold">Rs. {order.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="font-semibold">{order.items.length} items</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expected Delivery</p>
              <p className="font-semibold">{new Date(order.estimatedDelivery).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tracking</p>
              <p className="font-semibold text-xs">{order.trackingNumber || "Not assigned"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivery Status</p>
              <p className="font-semibold capitalize">{(order.deliveryStatus || "pickup_ready").replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment</p>
              <div>{getPaymentBadge(payment?.status || "missing")}</div>
            </div>
          </div>

          <div className="mb-4 rounded-md border bg-muted/20 p-2 text-xs">
            <p>
              <span className="text-muted-foreground">Delivery Address:</span>{" "}
              {order.deliveryAddress || "Address will be confirmed after assignment"}
            </p>
          </div>

          {order.status === "confirmed" && payment?.status !== "paid" ? (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              Seller/Distributor ne request accept kar li hai. Ab payment complete karo, phir live tracking unlock hogi.
            </div>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setSelectedOrderId(order.id)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadInvoice(order)}>
              <Download className="h-4 w-4 mr-2" />
              Invoice
            </Button>
            <Button variant="outline" size="sm" onClick={() => contactSupport(order)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChatOrderId(order.id)
                setChatOrderNumber(order.orderNumber)
              }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Supplier Chat
            </Button>
            {order.status === "confirmed" && payment?.status !== "paid" ? (
              <Button size="sm" onClick={() => openPaymentForOrder(order)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your construction material orders</p>
        </div>
        <Button variant="outline" onClick={() => loadData()} disabled={refreshing} className="bg-transparent">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search orders, items, tracking, or suppliers..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading orders...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">Active Orders ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="completed">Order History ({completedOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active orders</h3>
                  <p className="text-muted-foreground text-center mb-4">You do not have any active orders at the moment</p>
                </CardContent>
              </Card>
            ) : (
              activeOrders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No completed orders</h3>
                  <p className="text-muted-foreground text-center">Your completed orders will appear here</p>
                </CardContent>
              </Card>
            ) : (
              completedOrders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => (!open ? setSelectedOrderId(null) : undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedOrder?.orderNumber || "Order Details"}</DialogTitle>
            <DialogDescription>Detailed view of order items, delivery and payment details.</DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedOrder.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Seller</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{selectedOrder.sellerName}</p>
                    {renderVerifiedBadge(selectedOrder.sellerVerified, "Verified Seller")}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated Delivery</p>
                  <p className="font-medium">{new Date(selectedOrder.estimatedDelivery).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tracking</p>
                  <p className="font-medium">{selectedOrder.trackingNumber || "Not assigned"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground mb-1">Delivery Address</p>
                  <p className="font-medium">{selectedOrder.deliveryAddress || "Awaiting assignment"}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground mb-1">Distributor</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {selectedOrder.distributorName || "Not assigned"} | {selectedOrder.vehicleType || "Vehicle pending"}
                      </p>
                      {renderVerifiedBadge(selectedOrder.distributorVerified, "Verified Distributor")}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vehicle: {selectedOrder.vehicleNumber || "Not assigned"} | Driver: {selectedOrder.driverName || "Not assigned"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Contact: {selectedOrder.driverPhone || "Pending"} | ETA:{" "}
                      {selectedOrder.etaMinutes && selectedOrder.etaMinutes > 0 ? `${selectedOrder.etaMinutes} mins` : "Pending"}
                    </p>
                    {selectedOrder.deliveryUpdatedAt ? (
                      <p className="text-xs text-muted-foreground">
                        Last planning update: {new Date(selectedOrder.deliveryUpdatedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="grid grid-cols-12 gap-2 p-3 text-xs font-semibold border-b bg-muted/40">
                  <div className="col-span-5">Item</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-3">Total</div>
                </div>
                {selectedOrder.items.map((item) => (
                  <div key={`${selectedOrder.id}-${item.productId}`} className="grid grid-cols-12 gap-2 p-3 text-sm border-b last:border-b-0">
                    <div className="col-span-5">{item.productName}</div>
                    <div className="col-span-2">{item.quantity}</div>
                    <div className="col-span-2">Rs. {item.unitPrice.toLocaleString()}</div>
                    <div className="col-span-3">Rs. {item.lineTotal.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground mb-1">Order Total</p>
                  <p className="font-semibold text-lg">Rs. {selectedOrder.total.toLocaleString()}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground mb-1">Payment</p>
                  <p className="font-medium">
                    {selectedPayment
                      ? `${selectedPayment.method} | ${selectedPayment.status.toUpperCase()} | Rs. ${selectedPayment.amount.toLocaleString()}`
                      : "Payment info not available"}
                  </p>
                </div>
              </div>

              {selectedOrder.status === "confirmed" && selectedPayment?.status !== "paid" ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <p>Request accepted. Payment pending hai, payment ke baad tracking live hogi.</p>
                  <Button size="sm" onClick={() => openPaymentForOrder(selectedOrder)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                </div>
              ) : null}

              {selectedOrder.status === "delivered" ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="font-medium">Rate Supplier ({selectedOrder.sellerName})</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-1"
                        onClick={() => setSupplierRatingValue(value)}
                      >
                        <Star
                          className={`h-5 w-5 ${
                            supplierRatingValue >= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    ))}
                    <span className="text-sm text-muted-foreground">{supplierRatingValue}/5</span>
                  </div>
                  <Input
                    value={supplierReviewText}
                    onChange={(event) => setSupplierReviewText(event.target.value)}
                    placeholder="Write feedback (optional)"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedOrder.supplierRating
                        ? `Last updated: ${new Date(selectedOrder.supplierRating.updatedAt).toLocaleString()}`
                        : "Your rating improves fair supplier recommendations."}
                    </p>
                    <Button size="sm" onClick={submitSupplierRating} disabled={ratingSubmitting}>
                      {ratingSubmitting ? "Saving..." : selectedOrder.supplierRating ? "Update Rating" : "Submit Rating"}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Live Delivery Tracking</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    disabled={!selectedTracking}
                    onClick={openLiveTracking}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Track Live
                  </Button>
                </div>

                {trackingLoading ? (
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading tracking details...
                  </p>
                ) : trackingError ? (
                  <p className="text-sm text-destructive">{trackingError}</p>
                ) : !selectedTracking ? (
                  <p className="text-sm text-muted-foreground">Delivery assignment not created yet for this order.</p>
                ) : (
                  <div className="space-y-3">
                    {trackingMessage ? <p className="text-xs text-green-700">{trackingMessage}</p> : null}
                    {selectedOrder.status === "cancelled" ? (
                      <p className="text-xs text-destructive">This order was cancelled, live movement is stopped.</p>
                    ) : null}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                      <div className="p-2 border rounded">
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium capitalize">{selectedTracking.status.replace("_", " ")}</p>
                      </div>
                      <div className="p-2 border rounded">
                        <p className="text-muted-foreground">Vehicle</p>
                        <p className="font-medium">{selectedTracking.vehicleNumber}</p>
                      </div>
                      <div className="p-2 border rounded">
                        <p className="text-muted-foreground">Driver</p>
                        <p className="font-medium">{selectedTracking.driverName || "Not assigned"}</p>
                      </div>
                      <div className="p-2 border rounded">
                        <p className="text-muted-foreground">Distributor</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{selectedTracking.distributorName}</p>
                          {renderVerifiedBadge(selectedTracking.distributorVerified, "Verified")}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Current Location:</span>{" "}
                        {selectedTracking.currentAddress || "Not shared yet"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">ETA:</span>{" "}
                        {selectedTracking.etaMinutes > 0 ? `${selectedTracking.etaMinutes} mins` : "Calculating"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Updated:</span>{" "}
                        {new Date(selectedTracking.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded border p-2">
                      <p className="text-xs text-muted-foreground mb-2">Delivery Timeline</p>
                      <div className="flex flex-wrap gap-2">
                        {buildDeliveryTimeline(selectedOrder, selectedTracking.status).map((step) => (
                          <Badge key={step.label} variant={step.done ? "default" : "outline"}>
                            {step.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {buyerMapEmbedUrl ? (
                      <div className="rounded border overflow-hidden">
                        <iframe title="Buyer live delivery map" src={buyerMapEmbedUrl} className="h-48 w-full" loading="lazy" />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Live map will appear once driver shares GPS location.</p>
                    )}
                    {trackingLocations.length > 0 ? (
                      <div className="space-y-1 border rounded p-2">
                        <p className="text-xs text-muted-foreground">Recent Location Updates</p>
                        {trackingLocations.slice(0, 3).map((location) => (
                          <p key={location.id} className="text-xs">
                            {new Date(location.createdAt).toLocaleTimeString()} | {location.address} |{" "}
                            {location.status.replace("_", " ")}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {selectedAlerts.length > 0 ? (
                      <div className="space-y-2 border rounded p-2">
                        <p className="text-xs text-muted-foreground">Delivery Alerts</p>
                        {selectedAlerts.map((alert) => (
                          <div key={alert.code} className="flex items-start gap-2 text-xs">
                            <Badge variant={getAlertVariant(alert.severity)}>{alert.severity}</Badge>
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="text-muted-foreground">{alert.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="space-y-2 border rounded p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">Delivery OTP</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-transparent"
                          onClick={issueOtp}
                          disabled={issuingOtp || selectedTracking.status === "delivered" || selectedTracking.status === "cancelled"}
                        >
                          {issuingOtp ? "Generating..." : "Generate OTP"}
                        </Button>
                      </div>
                      {selectedOtp ? (
                        <div className="text-xs space-y-1">
                          <p>
                            <span className="text-muted-foreground">Code:</span>{" "}
                            <span className="font-semibold tracking-wider">{selectedOtp.otpCode || "Hidden"}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Expires:</span>{" "}
                            {new Date(selectedOtp.expiresAt).toLocaleString()}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Status:</span>{" "}
                            {selectedOtp.isVerified ? "Verified by delivery agent" : "Pending verification"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">OTP not generated yet.</p>
                      )}
                    </div>

                    <div className="space-y-2 border rounded p-2">
                      <p className="text-xs text-muted-foreground">Proof Of Delivery</p>
                      {selectedProof ? (
                        <div className="text-xs space-y-1">
                          <p>
                            <span className="text-muted-foreground">OTP Verified:</span>{" "}
                            {selectedProof.otpVerified ? "Yes" : "No"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Received By:</span>{" "}
                            {selectedProof.receivedBy || "Not shared"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Delivered At:</span>{" "}
                            {new Date(selectedProof.deliveredAt).toLocaleString()}
                          </p>
                          {selectedProof.podNote ? (
                            <p>
                              <span className="text-muted-foreground">Note:</span> {selectedProof.podNote}
                            </p>
                          ) : null}
                          {selectedProof.podImageUrl ? (
                            <a
                              href={selectedProof.podImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline"
                            >
                              View POD Image
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Proof of delivery will appear after completion.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">Supplier Live Chat</p>
                  <p className="text-xs text-muted-foreground">
                    Seller/distributor ke saath order updates ke liye live chat kholo.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChatOrderId(selectedOrder.id)
                    setChatOrderNumber(selectedOrder.orderNumber)
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Open Chat
                </Button>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => contactSupport(selectedOrder)}>
                  Contact Support
                </Button>
                <Button onClick={() => downloadInvoice(selectedOrder)}>Download Invoice</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(chatOrderId)}
        onOpenChange={(open) => {
          if (!open) {
            setChatOrderId(null)
            setChatOrderNumber("")
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Supplier Chat {chatOrderNumber ? `- ${chatOrderNumber}` : ""}</DialogTitle>
            <DialogDescription>Buyer, seller aur distributor ke beech live coordination chat.</DialogDescription>
          </DialogHeader>
          {chatOrderId ? <OrderChatPanel orderId={chatOrderId} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
