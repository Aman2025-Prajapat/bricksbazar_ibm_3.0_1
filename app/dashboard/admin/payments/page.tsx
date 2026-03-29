"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, TrendingUp, Users, AlertTriangle, Search, Download, Loader2, Clock } from "lucide-react"
import { downloadPdfDocument } from "@/lib/pdf-export"

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
}

type ApiUser = {
  id: string
  verified: boolean
}

type EnrichedPayment = ApiPayment & {
  orderNumber: string
  buyerName: string
  sellerName: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<ApiPayment[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        const [paymentsRes, ordersRes, usersRes] = await Promise.all([
          fetch("/api/payments", { credentials: "include", cache: "no-store" }),
          fetch("/api/orders", { credentials: "include", cache: "no-store" }),
          fetch("/api/admin/users", { credentials: "include", cache: "no-store" }),
        ])

        const [paymentsPayload, ordersPayload, usersPayload] = await Promise.all([
          paymentsRes.json() as Promise<{ payments?: ApiPayment[]; error?: string }>,
          ordersRes.json() as Promise<{ orders?: ApiOrder[]; error?: string }>,
          usersRes.json() as Promise<{ users?: ApiUser[]; error?: string }>,
        ])

        if (!paymentsRes.ok || !paymentsPayload.payments) {
          throw new Error(paymentsPayload.error || "Could not load payments")
        }
        if (!ordersRes.ok || !ordersPayload.orders) {
          throw new Error(ordersPayload.error || "Could not load orders")
        }
        if (!usersRes.ok || !usersPayload.users) {
          throw new Error(usersPayload.error || "Could not load users")
        }

        if (!cancelled) {
          setPayments(paymentsPayload.payments)
          setOrders(ordersPayload.orders)
          setUsers(usersPayload.users)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load payment dashboard")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const enrichedPayments = useMemo<EnrichedPayment[]>(() => {
    const orderMap = new Map(orders.map((order) => [order.id, order]))

    return payments.map((payment) => {
      const order = orderMap.get(payment.orderId)
      return {
        ...payment,
        orderNumber: order?.orderNumber || payment.orderId,
        buyerName: order?.buyerName || "Unknown Buyer",
        sellerName: order?.sellerName || "Unknown Seller",
      }
    })
  }, [payments, orders])

  const filteredPayments = useMemo(
    () =>
      enrichedPayments.filter((payment) => {
        const q = searchTerm.trim().toLowerCase()
        const matchesSearch =
          q.length === 0 ||
          payment.id.toLowerCase().includes(q) ||
          payment.orderId.toLowerCase().includes(q) ||
          payment.orderNumber.toLowerCase().includes(q) ||
          payment.userId.toLowerCase().includes(q) ||
          payment.method.toLowerCase().includes(q) ||
          payment.buyerName.toLowerCase().includes(q) ||
          payment.sellerName.toLowerCase().includes(q)
        const matchesStatus = statusFilter === "all" || payment.status === statusFilter

        return matchesSearch && matchesStatus
      }),
    [enrichedPayments, searchTerm, statusFilter],
  )

  const stats = useMemo(() => {
    const totalCollected = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0)
    const pendingValue = payments
      .filter((payment) => payment.status === "pending")
      .reduce((sum, payment) => sum + payment.amount, 0)
    const failedCount = payments.filter((payment) => payment.status === "failed").length
    const verifiedUsers = users.filter((user) => user.verified).length

    return {
      totalCollected,
      pendingValue,
      failedCount,
      verifiedUsers,
    }
  }, [payments, users])

  const downloadPdf = () => {
    const summaryLines = [
      `Total Collected: Rs. ${stats.totalCollected.toLocaleString()}`,
      `Pending Value: Rs. ${stats.pendingValue.toLocaleString()}`,
      `Failed Transactions: ${stats.failedCount}`,
      `Verified Users: ${stats.verifiedUsers}`,
      `Filtered Records: ${filteredPayments.length}`,
    ]

    const transactionLines =
      filteredPayments.length > 0
        ? filteredPayments.map(
            (payment, index) =>
              `${index + 1}. ${payment.orderNumber} | Buyer: ${payment.buyerName} | Seller: ${payment.sellerName} | Rs. ${payment.amount.toLocaleString()} | ${payment.method} | ${payment.status} | ${new Date(payment.createdAt).toLocaleString()}`,
          )
        : ["No transactions available for current filters."]

    downloadPdfDocument({
      filename: `admin-payments-${new Date().toISOString().slice(0, 10)}.pdf`,
      title: "BricksBazar Admin Payments Report",
      subtitle: "Platform transaction export",
      meta: [`Status Filter: ${statusFilter}`, `Search: ${searchTerm || "none"}`],
      sections: [
        { heading: "Summary", lines: summaryLines },
        { heading: "Transactions", lines: transactionLines },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">Live platform payment and settlement view</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Paid transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.pendingValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting settlement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifiedUsers}</div>
            <p className="text-xs text-muted-foreground">Accounts verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Transactions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedCount}</div>
            <p className="text-xs text-muted-foreground">Needs retry or review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <CardTitle>Platform Transactions</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments, orders, users..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10 w-full sm:w-72"
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
              <Button variant="outline" onClick={downloadPdf} disabled={filteredPayments.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-muted-foreground flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading payments...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No payments found for current filters.</div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-full ${
                        payment.status === "paid"
                          ? "bg-green-100"
                          : payment.status === "pending"
                            ? "bg-orange-100"
                            : "bg-red-100"
                      }`}
                    >
                      <CreditCard
                        className={`h-4 w-4 ${
                          payment.status === "paid"
                            ? "text-green-600"
                            : payment.status === "pending"
                              ? "text-orange-600"
                              : "text-red-600"
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="font-medium truncate">{payment.orderNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        Buyer: {payment.buyerName} | Seller: {payment.sellerName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {payment.method} | User ID: {payment.userId} | {new Date(payment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-semibold">Rs. {payment.amount.toLocaleString()}</p>
                    <Badge
                      variant={
                        payment.status === "paid"
                          ? "default"
                          : payment.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {payment.status}
                    </Badge>
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
