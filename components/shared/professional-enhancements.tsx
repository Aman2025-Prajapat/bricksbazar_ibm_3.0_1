"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Activity, Users, Package, ShoppingCart } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
  trend: "up" | "down"
}

export function MetricCard({ title, value, change, icon, trend }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          {trend === "up" ? (
            <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
          )}
          <span className={trend === "up" ? "text-green-600" : "text-red-600"}>
            {change > 0 ? "+" : ""}
            {change}%
          </span>
          <span className="ml-1">from last month</span>
        </div>
      </CardContent>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary/5 pointer-events-none" />
    </Card>
  )
}

export function ActivityFeed() {
  const activities = [
    { id: 1, action: "New order placed", user: "ABC Construction", time: "2 minutes ago", type: "order" },
    { id: 2, action: "Payment received", user: "XYZ Builders", time: "5 minutes ago", type: "payment" },
    { id: 3, action: "Product updated", user: "Brick Supplier Co.", time: "10 minutes ago", type: "product" },
    { id: 4, action: "User registered", user: "New Construction Ltd.", time: "15 minutes ago", type: "user" },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="h-4 w-4 text-blue-500" />
      case "payment":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "product":
        return <Package className="h-4 w-4 text-orange-500" />
      case "user":
        return <Users className="h-4 w-4 text-purple-500" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {getActivityIcon(activity.type)}
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-xs text-muted-foreground">{activity.user}</p>
              </div>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickActions({ role }: { role: string }) {
  const getQuickActions = () => {
    switch (role) {
      case "buyer":
        return [
          { label: "Browse Products", href: "/dashboard/buyer/products", color: "bg-blue-500" },
          { label: "View Cart", href: "/dashboard/buyer/cart", color: "bg-green-500" },
          { label: "Track Orders", href: "/dashboard/buyer/orders", color: "bg-orange-500" },
          { label: "Cost Estimator", href: "/dashboard/buyer/estimator", color: "bg-purple-500" },
        ]
      case "seller":
        return [
          { label: "Add Product", href: "/dashboard/seller/products", color: "bg-blue-500" },
          { label: "View Orders", href: "/dashboard/seller/orders", color: "bg-green-500" },
          { label: "Analytics", href: "/dashboard/seller/analytics", color: "bg-orange-500" },
          { label: "Payments", href: "/dashboard/seller/payments", color: "bg-purple-500" },
        ]
      case "distributor":
        return [
          { label: "View Deliveries", href: "/dashboard/distributor/deliveries", color: "bg-blue-500" },
          { label: "Live Tracking", href: "/dashboard/distributor/tracking", color: "bg-green-500" },
          { label: "Route Optimizer", href: "/dashboard/distributor", color: "bg-orange-500" },
          { label: "Earnings", href: "/dashboard/distributor/payments", color: "bg-purple-500" },
        ]
      case "admin":
        return [
          { label: "Manage Users", href: "/dashboard/admin/users", color: "bg-blue-500" },
          { label: "All Products", href: "/dashboard/admin/products", color: "bg-green-500" },
          { label: "All Orders", href: "/dashboard/admin/orders", color: "bg-orange-500" },
          { label: "Platform Stats", href: "/dashboard/admin", color: "bg-purple-500" },
        ]
      default:
        return []
    }
  }

  const actions = getQuickActions()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-16 flex-col gap-2 hover:scale-105 transition-transform bg-transparent"
              asChild
            >
              <a href={action.href}>
                <div className={`w-6 h-6 rounded ${action.color}`} />
                <span className="text-xs font-medium">{action.label}</span>
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
