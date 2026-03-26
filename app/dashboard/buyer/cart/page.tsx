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

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("UPI")

  useEffect(() => {
    setCartItems(loadCart())
  }, [])

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
  const total = subtotal + tax + shipping

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    setCheckoutLoading(true)
    setError("")
    setSuccessMessage("")

    try {
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

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: refreshedCart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod,
        }),
      })

      const payload = (await response.json()) as {
        order?: { orderNumber: string }
        error?: string
      }

      if (!response.ok || !payload.order) {
        throw new Error(payload.error || "Checkout failed")
      }

      setSuccessMessage(`Order placed successfully: ${payload.order.orderNumber} | Payment: ${paymentMethod}`)
      setCartItems([])
      clearCart()
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
                <p className="text-sm font-medium">Payment Method</p>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Credit/Debit Card</SelectItem>
                    <SelectItem value="NetBanking">Net Banking</SelectItem>
                    <SelectItem value="Wallet">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" size="lg" disabled={cartItems.length === 0 || checkoutLoading} onClick={handleCheckout}>
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Proceed to Checkout
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">Secure checkout with 256-bit SSL encryption</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
