"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, Package, Plus, ShoppingCart, Truck } from "lucide-react"

type ApiDelivery = {
  id: string
  orderId: string
  orderNumber: string
  status: "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"
  sellerName: string
  buyerName: string
  deliveryAddress: string
  etaMinutes: number
  updatedAt: string
}

type ApiOrder = {
  id: string
  orderNumber: string
  total: number
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  buyerName: string
}

type ApiProduct = {
  id: string
  name: string
  stock: number
}

export default function DistributorDashboard() {
  const [deliveries, setDeliveries] = useState<ApiDelivery[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      try {
        const [deliveriesRes, ordersRes, productsRes] = await Promise.all([
          fetch("/api/deliveries", { credentials: "include", cache: "no-store" }),
          fetch("/api/orders?limit=200", { credentials: "include", cache: "no-store" }),
          fetch("/api/products?scope=self&limit=200", { credentials: "include", cache: "no-store" }),
        ])

        const deliveriesPayload = (await deliveriesRes.json()) as { deliveries?: ApiDelivery[]; error?: string }
        const ordersPayload = (await ordersRes.json()) as { orders?: ApiOrder[]; error?: string }
        const productsPayload = (await productsRes.json()) as { products?: ApiProduct[]; error?: string }

        if (!deliveriesRes.ok || !deliveriesPayload.deliveries) {
          throw new Error(deliveriesPayload.error || "Could not load distributor deliveries")
        }
        if (!ordersRes.ok || !ordersPayload.orders) {
          throw new Error(ordersPayload.error || "Could not load distributor requests")
        }
        if (!productsRes.ok || !productsPayload.products) {
          throw new Error(productsPayload.error || "Could not load distributor products")
        }

        if (!cancelled) {
          setDeliveries(deliveriesPayload.deliveries)
          setOrders(ordersPayload.orders)
          setProducts(productsPayload.products)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load distributor dashboard")
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
    const activeDeliveries = deliveries.filter((delivery) => delivery.status !== "delivered" && delivery.status !== "cancelled").length
    const pendingRequests = orders.filter((order) => order.status === "pending").length
    const completedDeliveries = deliveries.filter((delivery) => delivery.status === "delivered").length
    const activeProducts = products.filter((product) => product.stock > 0).length
    return { activeDeliveries, pendingRequests, completedDeliveries, activeProducts }
  }, [deliveries, orders, products])

  const freshAccount = !loading && deliveries.length === 0 && orders.length === 0 && products.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Distributor Dashboard</h1>
          <p className="text-muted-foreground">Fresh, account-scoped distributor data only.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/distributor/add-product">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Bulk Product
            </Button>
          </Link>
          <Link href="/dashboard/distributor/deliveries">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Truck className="h-4 w-4" />
              My Deliveries
            </Button>
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading distributor dashboard...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Deliveries</p>
                    <p className="text-2xl font-bold">{metrics.activeDeliveries}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Requests</p>
                    <p className="text-2xl font-bold">{metrics.pendingRequests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">My Bulk Products</p>
                    <p className="text-2xl font-bold">{products.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Deliveries</p>
                    <p className="text-2xl font-bold">{metrics.completedDeliveries}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {freshAccount ? (
            <Card>
              <CardHeader>
                <CardTitle>Fresh Distributor Account</CardTitle>
                <CardDescription>No old shared requests or deliveries are shown here. Your account starts clean.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Link href="/dashboard/distributor/add-product">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Bulk Product
                  </Button>
                </Link>
                <Link href="/dashboard/distributor/requests">
                  <Button variant="outline" className="bg-transparent">
                    Check Requests
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Deliveries</CardTitle>
                  <CardDescription>Only deliveries linked to your distributor account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {deliveries.slice(0, 5).map((delivery) => (
                    <div key={delivery.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{delivery.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {delivery.sellerName} to {delivery.buyerName}
                          </p>
                          <p className="text-xs text-muted-foreground">{delivery.deliveryAddress}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={delivery.status === "cancelled" ? "destructive" : "secondary"}>{delivery.status}</Badge>
                          <p className="mt-1 text-xs text-muted-foreground">ETA {delivery.etaMinutes} mins</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {deliveries.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No distributor deliveries assigned yet.</div> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Incoming Requests</CardTitle>
                  <CardDescription>Requests visible for your distributor account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">{order.buyerName}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>{order.status}</Badge>
                          <p className="mt-1 text-sm font-medium">Rs. {order.total.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No requests yet.</div> : null}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
