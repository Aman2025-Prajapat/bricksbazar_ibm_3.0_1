"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Users, Package, ShoppingCart, TrendingUp, CreditCard, FolderKanban, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type AdminUser = {
  id: string
  role: "buyer" | "seller" | "distributor" | "admin"
  verified: boolean
}

type Product = { id: string; stock: number; status: "active" | "out_of_stock" }
type Order = { id: string; total: number; status: string }
type Payment = { id: string; amount: number; status: "pending" | "paid" | "failed" }
type Project = { id: string; updatedAt: string }

type DashboardData = {
  users: AdminUser[]
  products: Product[]
  orders: Order[]
  payments: Payment[]
  projects: Project[]
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData>({
    users: [],
    products: [],
    orders: [],
    payments: [],
    projects: [],
  })

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)

    try {
      const [usersRes, productsRes, ordersRes, paymentsRes, projectsRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" }),
        fetch("/api/payments", { cache: "no-store" }),
        fetch("/api/projects?scope=all&limit=200", { cache: "no-store" }),
      ])

      if (!usersRes.ok || !productsRes.ok || !ordersRes.ok || !paymentsRes.ok || !projectsRes.ok) {
        throw new Error("Dashboard data load failed")
      }

      const [usersJson, productsJson, ordersJson, paymentsJson, projectsJson] = await Promise.all([
        usersRes.json(),
        productsRes.json(),
        ordersRes.json(),
        paymentsRes.json(),
        projectsRes.json(),
      ])

      setData({
        users: usersJson.users ?? [],
        products: productsJson.products ?? [],
        orders: ordersJson.orders ?? [],
        payments: paymentsJson.payments ?? [],
        projects: projectsJson.projects ?? [],
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const analytics = useMemo(() => {
    const buyers = data.users.filter((user) => user.role === "buyer").length
    const sellers = data.users.filter((user) => user.role === "seller").length
    const distributors = data.users.filter((user) => user.role === "distributor").length
    const verifiedUsers = data.users.filter((user) => user.verified).length
    const activeProducts = data.products.filter((product) => product.status === "active").length
    const lowStockProducts = data.products.filter((product) => product.stock < 10).length
    const totalRevenue = data.orders.reduce((sum, order) => sum + order.total, 0)
    const paidAmount = data.payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0)
    const pendingPayments = data.payments.filter((payment) => payment.status === "pending").length
    const activeRate = data.users.length > 0 ? Math.round((verifiedUsers / data.users.length) * 100) : 0

    return {
      buyers,
      sellers,
      distributors,
      verifiedUsers,
      activeProducts,
      lowStockProducts,
      totalRevenue,
      paidAmount,
      pendingPayments,
      activeRate,
    }
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Live marketplace snapshot from connected APIs and database records</p>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent" onClick={loadDashboard} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Could not load dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.users.length}</div>
            <p className="text-xs text-muted-foreground">{analytics.verifiedUsers} verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeProducts}</div>
            <p className="text-xs text-muted-foreground">{analytics.lowStockProducts} low stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.orders.length}</div>
            <p className="text-xs text-muted-foreground">{data.projects.length} active projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs {analytics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Rs {analytics.paidAmount.toLocaleString()} paid</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Role split from registered user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{analytics.buyers}</p>
                <p className="text-sm text-muted-foreground">Buyers</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{analytics.sellers}</p>
                <p className="text-sm text-muted-foreground">Sellers</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{analytics.distributors}</p>
                <p className="text-sm text-muted-foreground">Distributors</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{analytics.verifiedUsers}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Verified account rate</span>
                <span>{analytics.activeRate}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${analytics.activeRate}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations Pulse</CardTitle>
            <CardDescription>Order, payment and project activity checks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded border p-3">
              <span className="text-sm">Pending payments</span>
              <Badge variant={analytics.pendingPayments > 0 ? "secondary" : "default"}>{analytics.pendingPayments}</Badge>
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <span className="text-sm">Products out of stock</span>
              <Badge variant={data.products.length > analytics.activeProducts ? "secondary" : "default"}>
                {data.products.length - analytics.activeProducts}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <span className="text-sm">Recent project updates (7d)</span>
              <Badge variant="outline">
                {
                  data.projects.filter(
                    (project) => Date.now() - new Date(project.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000,
                  ).length
                }
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Admin Actions</CardTitle>
          <CardDescription>Direct links to core control panels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Link href="/dashboard/admin/users">
              <Button variant="outline" className="h-20 w-full flex-col gap-2 bg-transparent">
                <Users className="h-5 w-5" />
                Users
              </Button>
            </Link>
            <Link href="/dashboard/admin/products">
              <Button variant="outline" className="h-20 w-full flex-col gap-2 bg-transparent">
                <Package className="h-5 w-5" />
                Products
              </Button>
            </Link>
            <Link href="/dashboard/admin/orders">
              <Button variant="outline" className="h-20 w-full flex-col gap-2 bg-transparent">
                <ShoppingCart className="h-5 w-5" />
                Orders
              </Button>
            </Link>
            <Link href="/dashboard/admin/payments">
              <Button variant="outline" className="h-20 w-full flex-col gap-2 bg-transparent">
                <CreditCard className="h-5 w-5" />
                Payments
              </Button>
            </Link>
            <Link href="/dashboard/admin/reports">
              <Button variant="outline" className="h-20 w-full flex-col gap-2 bg-transparent">
                <TrendingUp className="h-5 w-5" />
                Reports
              </Button>
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <FolderKanban className="h-4 w-4" />
            Connected sources: users, products, orders, payments, projects
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
