"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle, Clock, CreditCard, Loader2, RefreshCw, Search } from "lucide-react"

type PaymentStatus = "pending" | "paid" | "failed"
type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
type PaymentProvider = "razorpay" | "phonepe"

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
  total: number
}

type EnrichedPayment = Payment & {
  orderNumber: string
  sellerName: string
  orderStatus: OrderStatus | "unknown"
}

type RazorpayCreateIntentResponse = {
  intentId?: string
  provider?: "razorpay"
  mode?: "mock" | "test" | "live"
  keyId?: string
  gatewayOrderId?: string
  amount?: number
  amountPaise?: number
  currency?: string
  error?: string
}

type PhonePeCreateIntentResponse = {
  intentId?: string
  provider?: "phonepe"
  mode?: "mock" | "live"
  merchantTransactionId?: string
  checkoutUrl?: string
  amount?: number
  amountPaise?: number
  currency?: string
  error?: string
}

type VerifyIntentResponse = {
  intentId?: string
  verified?: boolean
  gatewayTransactionId?: string
  error?: string
}

type RazorpayHandlerResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type RazorpayInstance = {
  open: () => void
  on: (event: string, handler: (response: unknown) => void) => void
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance

type PendingPhonePeCheckout = {
  orderId: string
  intentId: string
  merchantTransactionId: string
  paymentMethod: string
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

  return razorpayScriptPromise
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [lastUpdated, setLastUpdated] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("razorpay")
  const [paymentMethod, setPaymentMethod] = useState("UPI")
  const [selectedOrderId, setSelectedOrderId] = useState("")
  const [pendingPhonePeCheckout, setPendingPhonePeCheckout] = useState<PendingPhonePeCheckout | null>(null)

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

    void bootstrap()

    const timer = setInterval(() => {
      if (!cancelled) {
        void loadData(true)
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

  const paymentsByOrderId = useMemo(() => {
    const map = new Map<string, Payment>()
    payments.forEach((payment) => {
      map.set(payment.orderId, payment)
    })
    return map
  }, [payments])

  const payableOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (order.status !== "confirmed") return false
        const payment = paymentsByOrderId.get(order.id)
        return !payment || payment.status !== "paid"
      }),
    [orders, paymentsByOrderId],
  )

  useEffect(() => {
    if (payableOrders.length === 0) {
      setSelectedOrderId("")
      return
    }
    setSelectedOrderId((current) => (current && payableOrders.some((order) => order.id === current) ? current : payableOrders[0].id))
  }, [payableOrders])

  const selectedPayableOrder = useMemo(
    () => payableOrders.find((order) => order.id === selectedOrderId) || null,
    [payableOrders, selectedOrderId],
  )

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

  const verifyPaymentIntent = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })

    const body = (await response.json()) as VerifyIntentResponse
    if (!response.ok || !body.intentId || !body.verified) {
      throw new Error(body.error || "Payment verification failed")
    }

    return {
      intentId: body.intentId,
      gatewayTransactionId: body.gatewayTransactionId,
    }
  }

  const settleOrderPayment = async (orderId: string, intentId: string, method: string) => {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "settle_order",
        orderId,
        intentId,
        paymentMethod: method,
      }),
    })
    const payload = (await response.json()) as { ok?: boolean; message?: string; error?: string }
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not confirm order payment")
    }
    return payload.message || "Payment confirmed"
  }

  const handleVerifyPhonePePayment = async () => {
    if (!pendingPhonePeCheckout) return

    setPaying(true)
    setError("")
    setSuccessMessage("")

    try {
      const verification = await verifyPaymentIntent({
        action: "verify_intent",
        provider: "phonepe",
        intentId: pendingPhonePeCheckout.intentId,
        merchantTransactionId: pendingPhonePeCheckout.merchantTransactionId,
      })

      const message = await settleOrderPayment(
        pendingPhonePeCheckout.orderId,
        verification.intentId,
        pendingPhonePeCheckout.paymentMethod,
      )
      setPendingPhonePeCheckout(null)
      setSuccessMessage(`${message}. Live tracking is now available.`)
      await loadData(true)
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "PhonePe verification failed")
    } finally {
      setPaying(false)
    }
  }

  const handlePayNow = async () => {
    if (!selectedPayableOrder) return

    setPaying(true)
    setError("")
    setSuccessMessage("")

    try {
      const gatewayMethod = `${paymentProvider.toUpperCase()}-${paymentMethod}`
      const amount = paymentsByOrderId.get(selectedPayableOrder.id)?.amount ?? selectedPayableOrder.total
      const createIntentResponse = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "create_intent",
          provider: paymentProvider,
          amount,
          currency: "INR",
          receipt: `${selectedPayableOrder.orderNumber}-${Date.now()}`,
        }),
      })

      if (paymentProvider === "razorpay") {
        const intentPayload = (await createIntentResponse.json()) as RazorpayCreateIntentResponse
        if (!createIntentResponse.ok || !intentPayload.intentId || !intentPayload.gatewayOrderId) {
          throw new Error(intentPayload.error || "Unable to create Razorpay payment")
        }

        if (intentPayload.mode === "mock") {
          throw new Error(
            "Razorpay checkout is in mock mode on this environment. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, then retry.",
          )
        }
        const isRazorpayTestMode = intentPayload.mode === "test" || (intentPayload.keyId || "").startsWith("rzp_test_")
        if (isRazorpayTestMode) {
          setSuccessMessage(
            "Razorpay test mode detected. QR/real UPI apps can fail in sandbox; use test card/netbanking inside checkout.",
          )
        }

        const scriptReady = await loadRazorpayScript()
        if (!scriptReady || !window.Razorpay || !intentPayload.keyId || !intentPayload.amountPaise || !intentPayload.currency) {
          throw new Error("Razorpay checkout could not be initialized")
        }

        const RazorpayCheckout = window.Razorpay
        await new Promise<void>((resolve, reject) => {
          const razorpay = new RazorpayCheckout({
            key: intentPayload.keyId,
            amount: intentPayload.amountPaise,
            currency: intentPayload.currency,
            order_id: intentPayload.gatewayOrderId,
            name: "BricksBazar IBM",
            description: `Payment for ${selectedPayableOrder.orderNumber}`,
            method: {
              upi: true,
              card: true,
              netbanking: true,
              wallet: true,
            },
            config: {
              display: {
                blocks: {
                  upi: {
                    name: "Pay by UPI",
                    instruments: [{ method: "upi" }],
                  },
                  banks: {
                    name: "Net Banking",
                    instruments: [{ method: "netbanking" }],
                  },
                  cards: {
                    name: "Card",
                    instruments: [{ method: "card" }],
                  },
                  wallets: {
                    name: "Wallet",
                    instruments: [{ method: "wallet" }],
                  },
                },
                sequence: ["block.upi", "block.banks", "block.cards", "block.wallets"],
                preferences: {
                  show_default_blocks: true,
                },
              },
            },
            handler: async (response: unknown) => {
              try {
                const parsedResponse = response as RazorpayHandlerResponse
                const verification = await verifyPaymentIntent({
                  action: "verify_intent",
                  provider: "razorpay",
                  intentId: intentPayload.intentId,
                  razorpayOrderId: parsedResponse.razorpay_order_id,
                  razorpayPaymentId: parsedResponse.razorpay_payment_id,
                  razorpaySignature: parsedResponse.razorpay_signature,
                })

                const message = await settleOrderPayment(selectedPayableOrder.id, verification.intentId, gatewayMethod)
                setSuccessMessage(`${message}. Live tracking is now available.`)
                await loadData(true)
                resolve()
              } catch (paymentError) {
                reject(paymentError)
              }
            },
            modal: {
              ondismiss: () => reject(new Error("Razorpay checkout cancelled")),
            },
            theme: {
              color: "#0f766e",
            },
          })

          razorpay.on("payment.failed", (response: unknown) => {
            const failure = response as {
              error?: {
                description?: string
                reason?: string
              }
            }
            const failureMessage =
              failure.error?.description ||
              failure.error?.reason ||
              "Razorpay payment failed. Please retry using UPI, QR, NetBanking, or Card."
            reject(new Error(failureMessage))
          })
          razorpay.open()
        })

        return
      }

      const intentPayload = (await createIntentResponse.json()) as PhonePeCreateIntentResponse
      if (!createIntentResponse.ok || !intentPayload.intentId || !intentPayload.merchantTransactionId || !intentPayload.checkoutUrl) {
        throw new Error(intentPayload.error || "Unable to create PhonePe payment")
      }

      window.open(intentPayload.checkoutUrl, "_blank", "noopener,noreferrer")
      setPendingPhonePeCheckout({
        orderId: selectedPayableOrder.id,
        intentId: intentPayload.intentId,
        merchantTransactionId: intentPayload.merchantTransactionId,
        paymentMethod: gatewayMethod,
      })
      setSuccessMessage("PhonePe payment page opened. Complete payment and click Verify Payment.")
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Payment failed")
    } finally {
      setPaying(false)
    }
  }

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
    if (status === "confirmed") return <Badge variant="secondary">Approved</Badge>
    if (status === "pending") return <Badge variant="outline">Approval Pending</Badge>
    if (status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>
    return <Badge variant="outline">Unknown</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">Pay only after seller/distributor approval, then unlock live tracking</p>
          {lastUpdated ? <p className="mt-1 text-xs text-muted-foreground">Last sync: {lastUpdated}</p> : null}
        </div>
        <Button variant="outline" onClick={() => loadData()} disabled={refreshing} className="bg-transparent">
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

      {pendingPhonePeCheckout ? (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-orange-900">
              PhonePe payment pending verification. Transaction:{" "}
              <span className="font-medium">{pendingPhonePeCheckout.merchantTransactionId}</span>
            </p>
            <Button variant="outline" onClick={handleVerifyPhonePePayment} disabled={paying}>
              {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Verify PhonePe Payment
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Approval Based Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payableOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Abhi koi approved unpaid order nahi hai. Seller/distributor request accept karega, tab payment yahan open hoga.
            </p>
          ) : (
            <>
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select approved order" />
                </SelectTrigger>
                <SelectContent>
                  {payableOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.orderNumber} | {order.sellerName} | Rs. {order.total.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select value={paymentProvider} onValueChange={(value) => setPaymentProvider(value as PaymentProvider)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="phonepe">PhonePe</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Credit/Debit Card</SelectItem>
                    <SelectItem value="NetBanking">Net Banking</SelectItem>
                    <SelectItem value="Wallet">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handlePayNow} disabled={!selectedPayableOrder || paying}>
                {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                {selectedPayableOrder ? `Pay Rs. ${selectedPayableOrder.total.toLocaleString()}` : "Pay Now"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Seller/distributor accepted request. Payment confirm hote hi order shipping/tracking start ho jayega.
              </p>
              <p className="text-xs text-muted-foreground">
                Tip: Razorpay checkout me UPI, QR, NetBanking, Card options available hain. Payment fail ho to another method retry karo.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
            <p className="text-xs text-muted-foreground">Awaiting payment confirmation</p>
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
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading payments...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No payments found for current filters.</div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
                  <div className="flex min-w-0 items-center gap-4">
                    {getPaymentIcon(payment.status)}
                    <div className="min-w-0">
                      <p className="truncate font-medium">Order {payment.orderNumber}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {payment.id} | {payment.method} | {payment.sellerName}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <p className="font-semibold">Rs. {payment.amount.toLocaleString()}</p>
                    <div className="flex items-center justify-end gap-2">
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
