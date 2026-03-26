"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, TrendingUp, Clock, Download, Loader2 } from "lucide-react"

type SellerPayment = { id: string; orderId: string; amount: number; method: string; status: "pending" | "paid" | "failed"; createdAt: string; commission?: number; netAmount?: number; buyerName?: string }

export default function SellerPaymentsPage() {
  const [payments, setPayments] = useState<SellerPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const loadPayments = async () => {
      try {
        const response = await fetch("/api/payments", { credentials: "include" })
        const payload = (await response.json()) as { payments?: SellerPayment[]; error?: string }
        if (!response.ok || !payload.payments) throw new Error(payload.error || "Could not load payments")
        if (!cancelled) setPayments(payload.payments)
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load payments")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPayments()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const totalGross = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalCommission = payments.reduce((sum, payment) => sum + (payment.commission || payment.amount * 0.05), 0)
    const totalNet = payments.reduce((sum, payment) => sum + (payment.netAmount || payment.amount * 0.95), 0)
    const pending = payments.filter((payment) => payment.status === "pending").reduce((sum, payment) => sum + (payment.netAmount || payment.amount * 0.95), 0)
    return { totalGross, totalCommission, totalNet, pending }
  }, [payments])

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Payment Management</h1><p className="text-muted-foreground">Track your earnings and payment history</p></div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gross Sales</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Rs. {stats.totalGross.toLocaleString()}</div><p className="text-xs text-muted-foreground">Before commission</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Net Earnings</CardTitle><CreditCard className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Rs. {stats.totalNet.toLocaleString()}</div><p className="text-xs text-muted-foreground">After platform fee</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending Payouts</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Rs. {stats.pending.toLocaleString()}</div><p className="text-xs text-muted-foreground">Awaiting settlement</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Commission Paid</CardTitle><CreditCard className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">Rs. {stats.totalCommission.toLocaleString()}</div><p className="text-xs text-muted-foreground">Platform fees</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Earnings History</CardTitle></CardHeader><CardContent>{loading ? <div className="py-10 text-muted-foreground flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading payments...</div> : payments.length === 0 ? <div className="py-10 text-center text-muted-foreground">No seller payments found yet.</div> : <div className="space-y-4">{payments.map((payment) => <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg"><div><p className="font-medium">Order {payment.orderId}</p><p className="text-sm text-muted-foreground">Buyer: {payment.buyerName || "N/A"} | {payment.method} | {new Date(payment.createdAt).toLocaleDateString()}</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="font-semibold">Rs. {(payment.netAmount || payment.amount).toLocaleString()}</p><p className="text-xs text-muted-foreground">Commission: Rs. {(payment.commission || payment.amount * 0.05).toLocaleString()}</p></div><Badge variant={payment.status === "paid" ? "default" : payment.status === "pending" ? "secondary" : "destructive"}>{payment.status}</Badge>{payment.status === "paid" && <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-2" />Receipt</Button>}</div></div>)}</div>}</CardContent></Card>
    </div>
  )
}
