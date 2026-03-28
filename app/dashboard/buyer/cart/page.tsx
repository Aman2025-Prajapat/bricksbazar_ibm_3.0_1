"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Loader2, Minus, PackageCheck, Plus, ShoppingBag, Trash2 } from "lucide-react"
import { clearCart, loadCart, saveCart, type StoredCartItem } from "@/lib/cart-storage"

type CartItem = StoredCartItem

type DistributorLocation = {
  id: string
  distributorId: string
  name: string
  address: string
  radiusKm: number
  status: "active" | "maintenance" | "inactive"
  deliveryTime: string
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("UPI")
  const [paymentProvider, setPaymentProvider] = useState("razorpay")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState("")
  const [preferredDistributorId, setPreferredDistributorId] = useState("")
  const [preferredVehicleType, setPreferredVehicleType] = useState("Truck")
  const [distributorLocations, setDistributorLocations] = useState<DistributorLocation[]>([])
  const [loadingDistributorLocations, setLoadingDistributorLocations] = useState(false)

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
    const byName = new Map<string, boolean>()
    cartItems.forEach((item) => {
      const supplier = item.supplier.trim()
      if (!supplier) return
      const existing = byName.get(supplier) === true
      byName.set(supplier, existing || item.supplierVerified === true)
    })
    return Array.from(byName.entries()).map(([name, verified]) => ({ name, verified }))
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

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    setCheckoutLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      if (deliveryAddress.trim().length < 12) {
        throw new Error("Please enter complete delivery address (house, area, city, pincode)")
      }

      const orderItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
      const requestedDeliveryIso = requestedDeliveryDate
        ? new Date(`${requestedDeliveryDate}T09:00:00+05:30`).toISOString()
        : undefined
      const preferredGatewayMethod = `${paymentProvider.toUpperCase()}-${paymentMethod}`

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: orderItems,
          paymentMethod: preferredGatewayMethod,
          deliveryAddress: deliveryAddress.trim(),
          requestedDeliveryDate: requestedDeliveryIso,
          preferredDistributorId: selectedDistributor?.distributorId || undefined,
          preferredDistributorName: selectedDistributor?.name || "MP Logistics Dispatch",
          preferredVehicleType: preferredVehicleType.trim() || undefined,
        }),
      })

      const payload = (await response.json()) as {
        order?: { orderNumber: string }
        error?: string
        message?: string
      }
      if (!response.ok || !payload.order) {
        throw new Error(payload.error || "Could not submit order request")
      }

      setSuccessMessage(
        `${payload.order.orderNumber} request submitted. Seller/distributor approval ke baad payment karo, fir live tracking unlock hoga.`,
      )
      setCartItems([])
      clearCart()
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not submit order request")
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
          <p className="text-muted-foreground">Select products, seller route and distributor, then send order request</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-lg">
          {cartItems.length} items
        </Badge>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cartItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Your cart is empty</h3>
                <p className="mb-4 text-center text-muted-foreground">Add construction materials to continue.</p>
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
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">by {item.supplier}</p>
                            {item.supplierVerified ? (
                              <Badge className="h-5 bg-emerald-100 px-2 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100">
                                Verified Seller
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.productId)}
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
                            min={1}
                            value={item.quantity}
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
              <div className="flex justify-between text-lg font-semibold">
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
                <Input type="date" value={requestedDeliveryDate} onChange={(event) => setRequestedDeliveryDate(event.target.value)} />
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
                <p className="text-sm font-medium">Preferred Payment Gateway</p>
                <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="phonepe">PhonePe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Preferred Payment Mode</p>
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
                      <Badge key={seller.name} variant={seller.verified ? "default" : "outline"}>
                        {seller.name}
                        {seller.verified ? " | Verified" : ""}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Seller will be assigned from selected products.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Request goes to selected sellers and distributor. Approval ke baad payment unlock hoga.
                </p>
              </div>

              <Button className="w-full" size="lg" disabled={cartItems.length === 0 || checkoutLoading} onClick={handleCheckout}>
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <PackageCheck className="mr-2 h-4 w-4" />
                    Send Order Request
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Flow: request, then seller/distributor approval, then buyer payment, then live tracking.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
