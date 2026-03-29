"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calculator, ShoppingCart, Truck, Star, TrendingUp, Package, MapPin, Building2 } from "lucide-react"
import Link from "next/link"
import { RecommendedSuppliersCard } from "@/components/buyer/recommended-suppliers-card"

type DashboardOrder = {
  id: string
  orderNumber: string
  date: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  total: number
  sellerName: string
  items: Array<{ quantity: number }>
  deliveryStatus?: "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"
}

type DashboardPayment = {
  id: string
  orderId: string
  amount: number
  status: "pending" | "paid" | "failed"
  createdAt: string
}

export default function BuyerDashboard() {
  const [orders, setOrders] = useState<DashboardOrder[]>([])
  const [payments, setPayments] = useState<DashboardPayment[]>([])

  useEffect(() => {
    let cancelled = false

    const loadDashboardData = async () => {
      try {
        const [ordersRes, paymentsRes] = await Promise.all([
          fetch("/api/orders?limit=100", { credentials: "include", cache: "no-store" }),
          fetch("/api/payments", { credentials: "include", cache: "no-store" }),
        ])

        const [ordersPayload, paymentsPayload] = await Promise.all([
          ordersRes.json() as Promise<{ orders?: DashboardOrder[] }>,
          paymentsRes.json() as Promise<{ payments?: DashboardPayment[] }>,
        ])

        if (!cancelled) {
          setOrders(Array.isArray(ordersPayload.orders) ? ordersPayload.orders : [])
          setPayments(Array.isArray(paymentsPayload.payments) ? paymentsPayload.payments : [])
        }
      } catch {
        if (!cancelled) {
          setOrders([])
          setPayments([])
        }
      }
    }

    void loadDashboardData()
    return () => {
      cancelled = true
    }
  }, [])

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status === "pending" || order.status === "confirmed" || order.status === "shipped").length,
    [orders],
  )

  const inTransitOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "shipped" || order.deliveryStatus === "in_transit" || order.deliveryStatus === "nearby",
      ).length,
    [orders],
  )

  const totalSpentThisMonth = useMemo(() => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    return payments
      .filter((payment) => payment.status === "paid" && new Date(payment.createdAt).getTime() >= monthStart.getTime())
      .reduce((sum, payment) => sum + payment.amount, 0)
  }, [payments])

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3),
    [orders],
  )

  const getRecentOrderBadgeVariant = (status: DashboardOrder["status"]) => {
    if (status === "delivered") return "default" as const
    if (status === "shipped") return "secondary" as const
    return "outline" as const
  }

  const getRecentOrderLabel = (status: DashboardOrder["status"]) => {
    if (status === "pending") return "Pending"
    if (status === "confirmed") return "Confirmed"
    if (status === "shipped") return "In Transit"
    if (status === "delivered") return "Delivered"
    return "Cancelled"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">Manage your construction projects and orders</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/buyer/estimator">
            <Button className="gap-2">
              <Calculator className="h-4 w-4" />
              Quick Estimate
            </Button>
          </Link>
          <Link href="/dashboard/buyer/products">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Package className="h-4 w-4" />
              Browse Products
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders}</div>
            <p className="text-xs text-muted-foreground">{activeOrders === 0 ? "No active orders yet" : "Currently active"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inTransitOrders}</div>
            <p className="text-xs text-muted-foreground">{inTransitOrders === 0 ? "No shipments in transit" : "On the way"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {Math.round(totalSpentThisMonth).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Money</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. 0</div>
            <p className="text-xs text-muted-foreground">Will show after price comparison data</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Smart Cost Estimator
            </CardTitle>
            <CardDescription>Get instant cost estimates for your construction projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Residential Building</p>
                <p className="text-sm text-muted-foreground">2000 sq ft</p>
              </div>
              <div className="text-right">
                <p className="font-bold">Rs. 12,50,000</p>
                <p className="text-sm text-green-600">15% saved</p>
              </div>
            </div>
            <Link href="/dashboard/buyer/estimator">
              <Button className="w-full">Create New Estimate</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Construction Planning
            </CardTitle>
            <CardDescription>AI-powered material suggestions for your projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Project Progress</span>
                <span className="text-sm font-medium">65%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "65%" }}></div>
              </div>
            </div>
            <Link href="/dashboard/buyer/planning">
              <Button variant="outline" className="w-full bg-transparent">
                View Project Details
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your latest material orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <div className="p-4 border rounded-lg text-sm text-muted-foreground">No orders yet for this account.</div>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} units | {order.sellerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={getRecentOrderBadgeVariant(order.status)}>{getRecentOrderLabel(order.status)}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link href="/dashboard/buyer/orders">
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                View All Orders
              </Button>
            </Link>
          </CardContent>
        </Card>

        <RecommendedSuppliersCard />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location-based Pricing
          </CardTitle>
          <CardDescription>Compare prices from local and regional suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { material: "Red Bricks", local: "Rs. 8/piece", regional: "Rs. 6.5/piece", savings: "18%" },
              { material: "Cement (50kg)", local: "Rs. 420/bag", regional: "Rs. 380/bag", savings: "9%" },
              { material: "Steel Rods", local: "Rs. 65/kg", regional: "Rs. 58/kg", savings: "11%" },
            ].map((item) => (
              <div key={item.material} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">{item.material}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Local:</span>
                    <span>{item.local}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Regional:</span>
                    <span>{item.regional}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-green-600">Savings:</span>
                    <span className="text-green-600">{item.savings}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
