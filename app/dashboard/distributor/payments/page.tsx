"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Truck, TrendingUp, Clock, Download, MapPin, Search, RefreshCw, Loader2 } from "lucide-react"

type ApiPayment = {
  id: string
  orderId: string
  userId: string
  amount: number
  method: string
  status: "pending" | "paid" | "failed"
  createdAt: string
}

type ApiOrder = {
  id: string
  orderNumber: string
  buyerName: string
  sellerName: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  total: number
}

type DeliveryPayment = {
  id: string
  orderId: string
  orderNumber: string
  route: string
  distance: string
  amount: number
  grossAmount: number
  status: "completed" | "pending" | "failed"
  date: string
  customer: string
  method: string
}

function hashValue(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0
  }
  return hash
}

function toDistance(orderId: string) {
  return `${(6 + (hashValue(orderId) % 30)).toFixed(1)} km`
}

export default function DistributorPaymentsPage() {
  const [payments, setPayments] = useState<ApiPayment[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")

  const loadData = async () => {
    setError("")
    try {
      const [paymentsRes, ordersRes] = await Promise.all([
        fetch("/api/payments", { credentials: "include", cache: "no-store" }),
        fetch("/api/orders", { credentials: "include", cache: "no-store" }),
      ])

      const [paymentsPayload, ordersPayload] = await Promise.all([
        paymentsRes.json() as Promise<{ payments?: ApiPayment[]; error?: string }>,
        ordersRes.json() as Promise<{ orders?: ApiOrder[]; error?: string }>,
      ])

      if (!paymentsRes.ok || !paymentsPayload.payments) {
        throw new Error(paymentsPayload.error || "Could not load payments")
      }
      if (!ordersRes.ok || !ordersPayload.orders) {
        throw new Error(ordersPayload.error || "Could not load orders")
      }

      setPayments(paymentsPayload.payments)
      setOrders(ordersPayload.orders)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load distributor payments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 30000)
    return () => clearInterval(timer)
  }, [])

  const deliveryEarnings = useMemo<DeliveryPayment[]>(() => {
    const orderMap = new Map(orders.map((order) => [order.id, order]))

    return payments.map((payment) => {
      const order = orderMap.get(payment.orderId)
      const gross = order?.total ?? payment.amount
      const deliveryFee = Math.round(gross * 0.03)

      const status: DeliveryPayment["status"] =
        payment.status === "failed"
          ? "failed"
          : payment.status === "paid" && order?.status === "delivered"
            ? "completed"
            : "pending"

      return {
        id: payment.id,
        orderId: payment.orderId,
        orderNumber: order?.orderNumber || payment.orderId,
        route: `${order?.sellerName || "Seller Hub"} -> ${order?.buyerName || "Buyer Site"}`,
        distance: toDistance(payment.orderId),
        amount: deliveryFee,
        grossAmount: gross,
        status,
        date: new Date(payment.createdAt).toLocaleDateString(),
        customer: order?.buyerName || "Unknown Customer",
        method: payment.method,
      }
    })
  }, [payments, orders])

  const filteredEarnings = useMemo(
    () =>
      deliveryEarnings.filter((entry) => {
        const q = query.trim().toLowerCase()
        if (!q) return true
        return (
          entry.orderNumber.toLowerCase().includes(q) ||
          entry.route.toLowerCase().includes(q) ||
          entry.customer.toLowerCase().includes(q) ||
          entry.method.toLowerCase().includes(q)
        )
      }),
    [deliveryEarnings, query],
  )

  const stats = useMemo(() => {
    const totalEarnings = filteredEarnings
      .filter((entry) => entry.status === "completed")
      .reduce((sum, entry) => sum + entry.amount, 0)
    const pendingEarnings = filteredEarnings
      .filter((entry) => entry.status === "pending")
      .reduce((sum, entry) => sum + entry.amount, 0)
    const activeDeliveries = orders.filter((order) => order.status === "confirmed" || order.status === "shipped").length

    return {
      totalEarnings,
      pendingEarnings,
      activeDeliveries,
      totalTransactions: filteredEarnings.length,
    }
  }, [filteredEarnings, orders])

  const exportCsv = () => {
    const header = ["paymentId", "orderNumber", "route", "customer", "grossOrderAmount", "deliveryFee", "status", "date", "method"]
    const rows = filteredEarnings.map((entry) => [
      entry.id,
      entry.orderNumber,
      entry.route,
      entry.customer,
      entry.grossAmount.toFixed(2),
      entry.amount.toFixed(2),
      entry.status,
      entry.date,
      entry.method,
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `distributor-payments-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Delivery Payments</h1>
          <p className="text-muted-foreground">Real-time delivery earnings from payment API</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} className="bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={filteredEarnings.length === 0} className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Completed deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.pendingEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting delivery completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDeliveries}</div>
            <p className="text-xs text-muted-foreground">Confirmed + in transit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Payment records</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Earnings History</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by order, route, customer, or payment method"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-muted-foreground flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading payment history...
            </div>
          ) : filteredEarnings.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No payment records found.</div>
          ) : (
            <div className="space-y-4">
              {filteredEarnings.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{delivery.orderNumber} | {delivery.route}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {delivery.customer} | {delivery.distance} | {delivery.date} | {delivery.method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold">Rs. {delivery.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">on gross Rs. {delivery.grossAmount.toLocaleString()}</p>
                      <Badge
                        variant={
                          delivery.status === "completed"
                            ? "default"
                            : delivery.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {delivery.status}
                      </Badge>
                    </div>
                    {delivery.status === "completed" && (
                      <Button size="sm" variant="outline" className="bg-transparent">
                        <Download className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
