"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Package, ShoppingCart, Star, Loader2 } from "lucide-react"

type Product = { id: string; name: string; category: string; price: number; stock: number; rating: number; sellerName: string }
type Order = { id: string; total: number; status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"; items: Array<{ productName: string; quantity: number; lineTotal: number }> }
type SellerPayment = { id: string; amount: number; netAmount?: number; status: "pending" | "paid" | "failed" }

export default function SellerAnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<SellerPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      try {
        const [productsRes, ordersRes, paymentsRes] = await Promise.all([
          fetch("/api/products", { credentials: "include" }),
          fetch("/api/orders", { credentials: "include" }),
          fetch("/api/payments", { credentials: "include" }),
        ])
        const productsPayload = (await productsRes.json()) as { products?: Product[] }
        const ordersPayload = (await ordersRes.json()) as { orders?: Order[] }
        const paymentsPayload = (await paymentsRes.json()) as { payments?: SellerPayment[] }

        if (!cancelled) {
          setProducts(productsPayload.products || [])
          setOrders(ordersPayload.orders || [])
          setPayments(paymentsPayload.payments || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0
    const avgRating = products.length > 0 ? products.reduce((sum, product) => sum + product.rating, 0) / products.length : 0
    const netEarnings = payments.reduce((sum, payment) => sum + (payment.netAmount || payment.amount), 0)
    return { totalRevenue, avgOrderValue, avgRating, netEarnings }
  }, [orders, products, payments])

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Sales Analytics</h1><p className="text-muted-foreground">Live metrics from your product, order, and payment data</p></div>
      {loading ? (
        <Card><CardContent className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading analytics...</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Rs. {metrics.totalRevenue.toLocaleString()}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Net Earnings</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Rs. {metrics.netEarnings.toLocaleString()}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Orders</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{orders.length}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg Order Value</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Rs. {Math.round(metrics.avgOrderValue).toLocaleString()}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Product Rating</CardTitle><Star className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics.avgRating.toFixed(1)}</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>Top Products by Revenue</CardTitle><CardDescription>Based on current order history</CardDescription></CardHeader><CardContent><div className="space-y-3">{Object.entries(orders.flatMap((order) => order.items).reduce<Record<string, number>>((acc, item) => { acc[item.productName] = (acc[item.productName] || 0) + item.lineTotal; return acc }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, revenue]) => <div key={name} className="flex items-center justify-between p-3 border rounded-lg"><p className="font-medium">{name}</p><p className="font-semibold">Rs. {revenue.toLocaleString()}</p></div>)}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Order Status Breakdown</CardTitle><CardDescription>Current fulfillment pipeline</CardDescription></CardHeader><CardContent><div className="space-y-3">{["pending", "confirmed", "shipped", "delivered", "cancelled"].map((status) => <div key={status} className="flex items-center justify-between p-3 border rounded-lg"><p className="capitalize">{status}</p><p className="font-semibold">{orders.filter((order) => order.status === status).length}</p></div>)}</div></CardContent></Card>
          </div>
        </>
      )}
    </div>
  )
}
