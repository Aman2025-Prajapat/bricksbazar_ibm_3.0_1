"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, Search } from "lucide-react"

type PaymentStatus = "pending" | "paid" | "failed"
type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"

type Payment = {
  id: string
  orderId: string
  amount: number
  method: string
  status: PaymentStatus
  createdAt: string
}

type ApiOrder = {
  id: string
  orderNumber: string
  sellerName: string
  status: OrderStatus
}

type EnrichedPayment = Payment & {
  orderNumber: string
  sellerName: string
  orderStatus: OrderStatus | "unknown"
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const loadData = async (silent = false) => {
    if (!silent) {
      setRefreshing(true)
    }

    try {
      const [paymentsRes, ordersRes] = await Promise.all([
        fetch("/api/payments", { credentials: "include", cache: "no-store" }),
        fetch("/api/orders", { credentials: "include", cache: "no-store" }),
      ])

      const [paymentsPayload, ordersPayload] = await Promise.all([
        paymentsRes.json() as Promise<{ payments?: Payment[]; error?: string }>,
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
      setLastUpdated(new Date().toLocaleTimeString())
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load payments")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      if (!cancelled) {
        await loadData(true)
      }
    }

    bootstrap()

    const timer = setInterval(() => {
      if (!cancelled) {
        loadData(true)
      }
    }, 20000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const enrichedPayments = useMemo<EnrichedPayment[]>(() => {
    const orderMap = new Map(orders.map((order) => [order.id, order]))

    return payments.map((payment) => {
      const order = orderMap.get(payment.orderId)
      return {
        ...payment,
        orderNumber: order?.orderNumber || payment.orderId,
        sellerName: order?.sellerName || "Unknown Seller",
        orderStatus: order?.status || "unknown",
      }
    })
  }, [payments, orders])

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase()

    return enrichedPayments.filter((payment) => {
      const matchesSearch =
        q.length === 0 ||
        payment.id.toLowerCase().includes(q) ||
        payment.orderNumber.toLowerCase().includes(q) ||
        payment.sellerName.toLowerCase().includes(q) ||
        payment.method.toLowerCase().includes(q)

      const matchesStatus = statusFilter === "all" || payment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [enrichedPayments, query, statusFilter])

  const totals = useMemo(() => {
    const paid = filteredPayments
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + payment.amount, 0)
    const pending = filteredPayments
      .filter((payment) => payment.status === "pending")
      .reduce((sum, payment) => sum + payment.amount, 0)
    const failed = filteredPayments
      .filter((payment) => payment.status === "failed")
      .reduce((sum, payment) => sum + payment.amount, 0)

    return { paid, pending, failed }
  }, [filteredPayments])

  const getPaymentIcon = (status: PaymentStatus) => {
    if (status === "paid") return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === "pending") return <Clock className="h-4 w-4 text-orange-500" />
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

  const getPaymentBadge = (status: PaymentStatus) => {
    if (status === "paid") return "bg-green-100 text-green-800"
    if (status === "pending") return "bg-orange-100 text-orange-800"
    return "bg-red-100 text-red-800"
  }

  const getOrderBadge = (status: OrderStatus | "unknown") => {
    if (status === "delivered") return <Badge variant="default">Delivered</Badge>
    if (status === "shipped") return <Badge variant="secondary">In Transit</Badge>
    if (status === "confirmed") return <Badge variant="secondary">Confirmed</Badge>
    if (status === "pending") return <Badge variant="outline">Pending</Badge>
    if (status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>
    return <Badge variant="outline">Unknown</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">Real-time transaction history from your account</p>
          {lastUpdated && <p className="text-xs text-muted-foreground mt-1">Last sync: {lastUpdated}</p>}
        </div>
        <Button variant="outline" onClick={() => loadData()} disabled={refreshing} className="bg-transparent">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totals.paid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Completed transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totals.pending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totals.failed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Needs retry</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search by order, payment ID, seller, method"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading payments...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No payments found for current filters.</div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    {getPaymentIcon(payment.status)}
                    <div className="min-w-0">
                      <p className="font-medium truncate">Order {payment.orderNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {payment.id} | {payment.method} | {payment.sellerName}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="font-semibold">Rs. {payment.amount.toLocaleString()}</p>
                    <div className="flex items-center gap-2 justify-end">
                      {getOrderBadge(payment.orderStatus)}
                      <Badge className={getPaymentBadge(payment.status)}>{payment.status}</Badge>
                    </div>
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
