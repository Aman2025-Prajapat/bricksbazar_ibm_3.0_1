"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Loader2, Package, Plus, ShoppingCart, TrendingUp } from "lucide-react"

type ApiProduct = {
  id: string
  name: string
  category: string
  stock: number
  minStock: number
  status: "active" | "out_of_stock"
  price: number
}

type ApiOrder = {
  id: string
  orderNumber: string
  buyerName: string
  total: number
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  date: string
  items: Array<{ productName: string; quantity: number }>
}

export default function SellerDashboard() {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch("/api/products?scope=self&limit=200", { credentials: "include", cache: "no-store" }),
          fetch("/api/orders?limit=200", { credentials: "include", cache: "no-store" }),
        ])

        const productsPayload = (await productsRes.json()) as { products?: ApiProduct[]; error?: string }
        const ordersPayload = (await ordersRes.json()) as { orders?: ApiOrder[]; error?: string }

        if (!productsRes.ok || !productsPayload.products) {
          throw new Error(productsPayload.error || "Could not load seller products")
        }
        if (!ordersRes.ok || !ordersPayload.orders) {
          throw new Error(ordersPayload.error || "Could not load seller orders")
        }

        if (!cancelled) {
          setProducts(productsPayload.products)
          setOrders(ordersPayload.orders)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load seller dashboard")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  const metrics = useMemo(() => {
    const openOrders = orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled").length
    const lowStock = products.filter((product) => product.status !== "out_of_stock" && product.stock <= product.minStock).length
    const inventoryValue = products.reduce((sum, product) => sum + product.price * product.stock, 0)
    const revenue = orders.reduce((sum, order) => sum + order.total, 0)
    return { openOrders, lowStock, inventoryValue, revenue }
  }, [orders, products])

  const freshAccount = !loading && products.length === 0 && orders.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground">Fresh, account-scoped data only. No shared demo records.</p>
        </div>
        <Link href="/dashboard/seller/add-product">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading seller dashboard...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">My Products</p>
                    <p className="text-2xl font-bold">{products.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Open Orders</p>
                    <p className="text-2xl font-bold">{metrics.openOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold">{metrics.lowStock}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Value</p>
                    <p className="text-2xl font-bold">Rs. {Math.round(metrics.inventoryValue).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {freshAccount ? (
            <Card>
              <CardHeader>
                <CardTitle>Fresh Seller Account</CardTitle>
                <CardDescription>Your seller dashboard is clean. Start by adding products and wait for real orders.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Link href="/dashboard/seller/add-product">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add First Product
                  </Button>
                </Link>
                <Link href="/dashboard/seller/products">
                  <Button variant="outline" className="bg-transparent">
                    View My Catalog
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Only orders linked to your seller account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">{order.buyerName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(order.date).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>{order.status}</Badge>
                          <p className="mt-1 text-sm font-medium">Rs. {order.total.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No seller orders yet.</div> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inventory Snapshot</CardTitle>
                  <CardDescription>Only products created under this seller account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {products.slice(0, 5).map((product) => {
                    const lowStock = product.status !== "out_of_stock" && product.stock <= product.minStock
                    return (
                      <div key={product.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.category}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={product.status === "out_of_stock" ? "destructive" : lowStock ? "secondary" : "default"}>
                              {product.status === "out_of_stock" ? "Out of Stock" : lowStock ? "Low Stock" : "In Stock"}
                            </Badge>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {product.stock.toLocaleString()} units
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {products.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No products added yet.</div> : null}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
