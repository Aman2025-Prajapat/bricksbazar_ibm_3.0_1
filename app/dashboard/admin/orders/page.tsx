"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, AlertTriangle, CheckCircle, Clock, Truck, Loader2 } from "lucide-react"

type ApiOrder = { id: string; orderNumber: string; buyerName: string; sellerName: string; total: number; status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"; date: string; estimatedDelivery: string; items: Array<{ productName: string; quantity: number; lineTotal: number }> }

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const statuses = ["all", "pending", "confirmed", "shipped", "delivered", "cancelled"]

  useEffect(() => {
    let cancelled = false
    const loadOrders = async () => {
      try {
        const response = await fetch("/api/orders", { credentials: "include" })
        const payload = (await response.json()) as { orders?: ApiOrder[]; error?: string }
        if (!response.ok || !payload.orders) throw new Error(payload.error || "Could not load orders")
        if (!cancelled) setOrders(payload.orders)
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load orders")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadOrders()
    return () => {
      cancelled = true
    }
  }, [])

  const getStatusColor = (status: ApiOrder["status"]) => {
    if (status === "cancelled") return "destructive" as const
    if (status === "pending" || status === "shipped") return "secondary" as const
    return "default" as const
  }

  const getStatusIcon = (status: ApiOrder["status"]) => {
    if (status === "delivered") return <CheckCircle className="h-4 w-4" />
    if (status === "shipped") return <Truck className="h-4 w-4" />
    if (status === "confirmed") return <CheckCircle className="h-4 w-4" />
    if (status === "pending") return <Clock className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesSearch =
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.items.some((item) => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesStatus = selectedStatus === "all" || order.status === selectedStatus
        return matchesSearch && matchesStatus
      }),
    [orders, searchTerm, selectedStatus],
  )

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Order Management</h1><p className="text-muted-foreground">Monitor and manage all marketplace orders</p></div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">{statuses.slice(1).map((status) => <Card key={status}><CardContent className="p-4"><div className="flex items-center gap-2">{getStatusIcon(status as ApiOrder["status"])}<div><p className="text-sm text-muted-foreground capitalize">{status}</p><p className="text-2xl font-bold">{orders.filter((order) => order.status === status).length}</p></div></div></CardContent></Card>)}</div>

      <div className="flex flex-col sm:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /><Input placeholder="Search orders, buyers, sellers, or products..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-10" /></div><Select value={selectedStatus} onValueChange={setSelectedStatus}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Order Status" /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>)}</SelectContent></Select></div>

      <Card><CardHeader><CardTitle>All Orders</CardTitle><CardDescription>Showing {filteredOrders.length} of {orders.length} orders</CardDescription></CardHeader><CardContent>{loading ? <div className="p-10 text-muted-foreground flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading orders...</div> : <div className="space-y-4">{filteredOrders.map((order) => <div key={order.id} className="p-4 border rounded-lg"><div className="flex items-start justify-between mb-4"><div><div className="flex items-center gap-3 mb-2"><h3 className="text-lg font-semibold">{order.orderNumber}</h3><Badge variant={getStatusColor(order.status)} className="gap-1">{getStatusIcon(order.status)}{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</Badge></div><p className="text-muted-foreground">Ordered on {new Date(order.date).toLocaleDateString()} | Delivery {new Date(order.estimatedDelivery).toLocaleDateString()}</p></div><div className="text-right"><p className="text-2xl font-bold">Rs. {order.total.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Amount</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div><h4 className="font-semibold mb-1">Products</h4>{order.items.map((item, idx) => <p key={idx} className="text-sm text-muted-foreground">{item.productName} ({item.quantity})</p>)}</div><div><h4 className="font-semibold mb-1">Buyer</h4><p className="text-sm font-medium">{order.buyerName}</p></div><div><h4 className="font-semibold mb-1">Seller</h4><p className="text-sm font-medium">{order.sellerName}</p></div></div></div>)}{filteredOrders.length === 0 && <div className="p-10 text-center text-muted-foreground">No orders found for current filters.</div>}</div>}</CardContent></Card>
    </div>
  )
}
