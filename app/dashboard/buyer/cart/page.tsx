"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Minus, ShoppingBag, CreditCard, Loader2 } from "lucide-react"
import Image from "next/image"
import { clearCart, loadCart, saveCart, type StoredCartItem } from "@/lib/cart-storage"

type CartItem = StoredCartItem

type PaymentProvider = "razorpay" | "phonepe"

type ApiProduct = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  stock: number
  status: "active" | "out_of_stock"
  image: string
  sellerName: string
}

type DistributorLocation = {
  id: string
  distributorId: string
  name: string
  address: string
  radiusKm: number
  status: "active" | "maintenance" | "inactive"
  deliveryTime: string
}

type RazorpayCreateIntentResponse = {
  intentId?: string
  provider?: "razorpay"
  mode?: "mock" | "live"
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

type VerifiedIntent = {
  intentId: string
  gatewayTransactionId?: string
}

type PendingPhonePeCheckout = {
  intentId: string
  merchantTransactionId: string
  orderItems: Array<{ productId: string; quantity: number }>
  paymentMethod: string
  deliveryAddress: string
  requestedDeliveryDate?: string
  preferredDistributorId?: string
  preferredDistributorName?: string
  preferredVehicleType?: string
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

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("UPI")
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("razorpay")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState("")
  const [preferredDistributorId, setPreferredDistributorId] = useState("")
  const [preferredVehicleType, setPreferredVehicleType] = useState("Truck")
  const [distributorLocations, setDistributorLocations] = useState<DistributorLocation[]>([])
  const [loadingDistributorLocations, setLoadingDistributorLocations] = useState(false)
  const [pendingPhonePeCheckout, setPendingPhonePeCheckout] = useState<PendingPhonePeCheckout | null>(null)

  useEffect(() => {
    setCartItems(loadCart())
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadDistributorLocations = async () => {
      setLoadingDistributorLocations(true)
      try {
        const response = await fetch("/api/distributor/locations?public=1", {
          credentials: "include",
          cache: "no-store",
        })
        const payload = (await response.json()) as { locations?: DistributorLocation[]; error?: string }
        if (!response.ok || !payload.locations) {
          throw new Error(payload.error || "Could not load nearby distributors")
        }
        if (!cancelled) {
          const activeLocations = payload.locations.filter((location) => location.status === "active")
          setDistributorLocations(activeLocations)
          if (activeLocations.length > 0) {
            setPreferredDistributorId((current) => (current ? current : activeLocations[0].id))
          }
        }
      } catch {
        if (!cancelled) {
          setDistributorLocations([])
        }
      } finally {
        if (!cancelled) {
          setLoadingDistributorLocations(false)
        }
      }
    }

    void loadDistributorLocations()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedDistributor = useMemo(
    () => distributorLocations.find((location) => location.id === preferredDistributorId),
    [distributorLocations, preferredDistributorId],
  )

  const sellerOptions = useMemo(() => {
    return Array.from(
      new Set(cartItems.map((item) => item.supplier.trim()).filter((supplier) => supplier.length > 0)),
    )
  }, [cartItems])

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (!Number.isInteger(newQuantity) || newQuantity <= 0) return

    setCartItems((items) => {
      const next = items.map((item) => (item.productId === productId ? { ...item, quantity: newQuantity } : item))
      saveCart(next)
      return next
    })
  }

  const removeItem = (productId: string) => {
    setCartItems((items) => {
      const next = items.filter((item) => item.productId !== productId)
      saveCart(next)
      return next
    })
  }

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems])
  const tax = subtotal * 0.18
  const shipping = cartItems.length > 0 ? 500 : 0
  const total = Number((subtotal + tax + shipping).toFixed(2))

  const validateAndRefreshCart = async () => {
    const productsResponse = await fetch("/api/products", { credentials: "include", cache: "no-store" })
    const productsPayload = (await productsResponse.json()) as { products?: ApiProduct[]; error?: string }
    if (!productsResponse.ok || !productsPayload.products) {
      throw new Error(productsPayload.error || "Could not validate cart items")
    }

    const productsById = new Map(productsPayload.products.map((product) => [product.id, product]))
    const validationErrors: string[] = []

    const refreshedCart = cartItems.map((item) => {
      const latest = productsById.get(item.productId)
      if (!latest) {
        validationErrors.push(`${item.name} is no longer available`)
        return item
      }

      if (latest.stock < item.quantity) {
        validationErrors.push(`${latest.name} has only ${latest.stock} item(s) available`)
      }

      return {
        ...item,
        name: latest.name,
        category: latest.category,
        price: latest.price,
        unit: latest.unit,
        supplier: latest.sellerName,
        image: latest.image || "/placeholder.svg",
        inStock: latest.stock > 0 && latest.status !== "out_of_stock",
      }
    })

    setCartItems(refreshedCart)
    saveCart(refreshedCart)

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(" | "))
    }

    return refreshedCart
  }

  const submitOrderAfterVerifiedPayment = async (input: {
    orderItems: Array<{ productId: string; quantity: number }>
    paymentIntentId: string
    paymentMethod: string
    deliveryAddress: string
    requestedDeliveryDate?: string
    preferredDistributorId?: string
    preferredDistributorName?: string
    preferredVehicleType?: string
  }) => {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        items: input.orderItems,
        paymentMethod: input.paymentMethod,
        paymentIntentId: input.paymentIntentId,
        deliveryAddress: input.deliveryAddress,
        requestedDeliveryDate: input.requestedDeliveryDate,
        preferredDistributorId: input.preferredDistributorId,
        preferredDistributorName: input.preferredDistributorName,
        preferredVehicleType: input.preferredVehicleType,
      }),
    })

    const payload = (await response.json()) as {
      order?: { orderNumber: string }
      error?: string
    }

    if (!response.ok || !payload.order) {
      throw new Error(payload.error || "Order creation failed after payment")
    }

    setSuccessMessage(
      `Order placed successfully: ${payload.order.orderNumber} | Payment: ${input.paymentMethod}`,
    )
    setPendingPhonePeCheckout(null)
    setCartItems([])
    clearCart()
  }

  const verifyPaymentIntent = async (payload: Record<string, unknown>): Promise<VerifiedIntent> => {
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

  const handleVerifyPhonePePayment = async () => {
    if (!pendingPhonePeCheckout) return

    setCheckoutLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      const verification = await verifyPaymentIntent({
        action: "verify_intent",
        provider: "phonepe",
        intentId: pendingPhonePeCheckout.intentId,
        merchantTransactionId: pendingPhonePeCheckout.merchantTransactionId,
      })

      await submitOrderAfterVerifiedPayment({
        orderItems: pendingPhonePeCheckout.orderItems,
        paymentIntentId: verification.intentId,
        paymentMethod: pendingPhonePeCheckout.paymentMethod,
        deliveryAddress: pendingPhonePeCheckout.deliveryAddress,
        requestedDeliveryDate: pendingPhonePeCheckout.requestedDeliveryDate,
        preferredDistributorId: pendingPhonePeCheckout.preferredDistributorId,
        preferredDistributorName: pendingPhonePeCheckout.preferredDistributorName,
        preferredVehicleType: pendingPhonePeCheckout.preferredVehicleType,
      })
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "PhonePe verification failed")
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    setCheckoutLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      if (deliveryAddress.trim().length < 12) {
        throw new Error("Please enter complete delivery address (house, area, city, pincode)")
      }
      const refreshedCart = await validateAndRefreshCart()
      const orderItems = refreshedCart.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      const distributorName = selectedDistributor?.name || "MP Logistics Dispatch"
      const requestedDeliveryIso = requestedDeliveryDate
        ? new Date(`${requestedDeliveryDate}T09:00:00+05:30`).toISOString()
        : undefined
      const gatewayMethod = `${paymentProvider.toUpperCase()}-${paymentMethod}`

      const createIntentResponse = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "create_intent",
          provider: paymentProvider,
          amount: total,
          currency: "INR",
        }),
      })

      if (paymentProvider === "razorpay") {
        const intentPayload = (await createIntentResponse.json()) as RazorpayCreateIntentResponse
        if (!createIntentResponse.ok || !intentPayload.intentId || !intentPayload.gatewayOrderId) {
          throw new Error(intentPayload.error || "Unable to create Razorpay payment")
        }

        if (intentPayload.mode === "mock") {
          const verification = await verifyPaymentIntent({
            action: "verify_intent",
            provider: "razorpay",
            intentId: intentPayload.intentId,
            razorpayOrderId: intentPayload.gatewayOrderId,
            razorpayPaymentId: `pay_mock_${Date.now()}`,
            razorpaySignature: `sig_mock_${Date.now()}`,
          })

          await submitOrderAfterVerifiedPayment({
            orderItems,
            paymentIntentId: verification.intentId,
            paymentMethod: gatewayMethod,
            deliveryAddress: deliveryAddress.trim(),
            requestedDeliveryDate: requestedDeliveryIso,
            preferredDistributorId: selectedDistributor?.distributorId || undefined,
            preferredDistributorName: distributorName,
            preferredVehicleType: preferredVehicleType.trim() || undefined,
          })
          return
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
            description: "Construction materials order",
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

                await submitOrderAfterVerifiedPayment({
                  orderItems,
                  paymentIntentId: verification.intentId,
                  paymentMethod: gatewayMethod,
                  deliveryAddress: deliveryAddress.trim(),
                  requestedDeliveryDate: requestedDeliveryIso,
                  preferredDistributorId: selectedDistributor?.distributorId || undefined,
                  preferredDistributorName: distributorName,
                  preferredVehicleType: preferredVehicleType.trim() || undefined,
                })

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

          razorpay.on("payment.failed", () => reject(new Error("Razorpay payment failed")))
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
        intentId: intentPayload.intentId,
        merchantTransactionId: intentPayload.merchantTransactionId,
        orderItems,
        paymentMethod: gatewayMethod,
        deliveryAddress: deliveryAddress.trim(),
        requestedDeliveryDate: requestedDeliveryIso,
        preferredDistributorId: selectedDistributor?.distributorId || undefined,
        preferredDistributorName: distributorName,
        preferredVehicleType: preferredVehicleType.trim() || undefined,
      })

      setSuccessMessage("PhonePe payment page opened. Complete payment and click Verify Payment.")
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed")
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
          <p className="text-muted-foreground">Review your selected construction materials</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {cartItems.length} items
        </Badge>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

      {pendingPhonePeCheckout && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-orange-900">
              PhonePe payment pending verification. Transaction: <span className="font-medium">{pendingPhonePeCheckout.merchantTransactionId}</span>
            </p>
            <Button variant="outline" onClick={handleVerifyPhonePePayment} disabled={checkoutLoading}>
              {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Verify PhonePe Payment
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {cartItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground text-center mb-4">Add some construction materials to get started</p>
              </CardContent>
            </Card>
          ) : (
            cartItems.map((item) => (
              <Card key={item.productId}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                          <p className="text-sm text-muted-foreground">by {item.supplier}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.productId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="sm" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            min={1}
                            onChange={(event) => updateQuantity(item.productId, Number.parseInt(event.target.value, 10) || 1)}
                            className="w-20 text-center"
                          />
                          <Button variant="outline" size="sm" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">{item.unit}</span>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-semibold">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            Rs. {item.price} per {item.unit}
                          </p>
                        </div>
                      </div>

                      {!item.inStock && (
                        <Badge variant="destructive" className="mt-2">
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span>Rs. {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Rs. {shipping.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>Rs. {total.toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Delivery Address</p>
                <Input
                  placeholder="House/plot, area, city, district, pincode"
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Requested Delivery Date</p>
                <Input
                  type="date"
                  value={requestedDeliveryDate}
                  onChange={(event) => setRequestedDeliveryDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Nearby Distributor</p>
                <Select value={preferredDistributorId} onValueChange={setPreferredDistributorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributorLocations.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {loadingDistributorLocations ? "Loading distributors..." : "No active distributor found"}
                      </SelectItem>
                    ) : (
                      distributorLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} | {location.deliveryTime}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedDistributor ? (
                  <p className="text-xs text-muted-foreground">
                    Service hub: {selectedDistributor.address} | Radius: {selectedDistributor.radiusKm} km
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Preferred Vehicle Type</p>
                <Select value={preferredVehicleType} onValueChange={setPreferredVehicleType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mini Truck">Mini Truck</SelectItem>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="Tipper">Tipper</SelectItem>
                    <SelectItem value="Trailer">Trailer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Payment Gateway</p>
                <Select value={paymentProvider} onValueChange={(value) => setPaymentProvider(value as PaymentProvider)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="razorpay">Razorpay (Test)</SelectItem>
                    <SelectItem value="phonepe">PhonePe (Test)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Payment Mode</p>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Credit/Debit Card</SelectItem>
                    <SelectItem value="NetBanking">Net Banking</SelectItem>
                    <SelectItem value="Wallet">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Seller Routing</p>
                {sellerOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sellerOptions.map((seller) => (
                      <Badge key={seller} variant="outline">
                        {seller}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Seller will be assigned from selected products.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Order request automatically goes to cart sellers and selected distributor.
                </p>
              </div>

              <Button className="w-full" size="lg" disabled={cartItems.length === 0 || checkoutLoading} onClick={handleCheckout}>
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay & Place Order
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Test integration flow: payment intent to verification to order confirmation
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
