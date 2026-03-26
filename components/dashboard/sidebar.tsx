"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import {
  Building2,
  Calculator,
  ShoppingCart,
  MapPin,
  Truck,
  User,
  LogOut,
  Package,
  BarChart3,
  Settings,
  Users,
  HelpCircle,
  CreditCard,
  Scale,
  Plus,
  MessageSquare,
  Bell,
  Warehouse,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NotificationCenter } from "@/components/shared/notification-center"

const buyerNavItems = [
  { href: "/dashboard/buyer", icon: BarChart3, label: "Dashboard" },
  { href: "/dashboard/buyer/products", icon: Package, label: "Browse Products" },
  { href: "/dashboard/buyer/cart", icon: ShoppingCart, label: "Shopping Cart" },
  { href: "/dashboard/buyer/orders", icon: Truck, label: "My Orders" },
  { href: "/dashboard/buyer/estimator", icon: Calculator, label: "Cost Estimator" },
  { href: "/dashboard/buyer/smart-tools", icon: Building2, label: "Smart Tools" },
  { href: "/dashboard/buyer/planning", icon: Building2, label: "Project Planning" },
  { href: "/dashboard/buyer/suppliers", icon: Users, label: "Suppliers" },
  { href: "/dashboard/buyer/payments", icon: CreditCard, label: "Payments" },
  { href: "/dashboard/buyer/faq", icon: HelpCircle, label: "FAQ & Help" },
]

const sellerNavItems = [
  { href: "/dashboard/seller", icon: BarChart3, label: "Dashboard" },
  { href: "/dashboard/seller/products", icon: Package, label: "My Products" },
  { href: "/dashboard/seller/add-product", icon: Plus, label: "Add Products" },
  { href: "/dashboard/seller/orders", icon: ShoppingCart, label: "Orders" },
  { href: "/dashboard/seller/analytics", icon: TrendingUp, label: "Analytics" },
  { href: "/dashboard/seller/inventory", icon: Warehouse, label: "Inventory" },
  { href: "/dashboard/seller/smart-tools", icon: Building2, label: "Smart Tools" },
  { href: "/dashboard/seller/messages", icon: MessageSquare, label: "Messages" },
  { href: "/dashboard/seller/payments", icon: CreditCard, label: "Payments" },
  { href: "/dashboard/seller/faq", icon: HelpCircle, label: "FAQ & Help" },
]

const distributorNavItems = [
  { href: "/dashboard/distributor", icon: BarChart3, label: "Dashboard" },
  { href: "/dashboard/distributor/requests", icon: Bell, label: "All Requests" },
  { href: "/dashboard/distributor/deliveries", icon: Truck, label: "Deliveries" },
  { href: "/dashboard/distributor/locations", icon: MapPin, label: "Location Management" },
  { href: "/dashboard/distributor/analytics", icon: TrendingUp, label: "Analytics" },
  { href: "/dashboard/distributor/smart-tools", icon: Building2, label: "Smart Tools" },
  { href: "/dashboard/distributor/messages", icon: MessageSquare, label: "Messages" },
  { href: "/dashboard/distributor/payments", icon: CreditCard, label: "Payments" },
  { href: "/dashboard/distributor/faq", icon: HelpCircle, label: "FAQ & Help" },
]

const adminNavItems = [
  { href: "/dashboard/admin", icon: BarChart3, label: "Dashboard" },
  { href: "/dashboard/admin/planner", icon: Building2, label: "Planner Control" },
  { href: "/dashboard/admin/users", icon: Users, label: "Manage Users" },
  { href: "/dashboard/admin/products", icon: Package, label: "All Products" },
  { href: "/dashboard/admin/orders", icon: ShoppingCart, label: "All Orders" },
  { href: "/dashboard/admin/fair-algorithm", icon: Scale, label: "Fair Algorithm" },
  { href: "/dashboard/admin/payments", icon: CreditCard, label: "Payment Management" },
  { href: "/dashboard/admin/faq", icon: HelpCircle, label: "FAQ Management" },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const getNavItems = () => {
    switch (user.role) {
      case "buyer":
        return buyerNavItems
      case "seller":
        return sellerNavItems
      case "distributor":
        return distributorNavItems
      case "admin":
        return adminNavItems
      default:
        return []
    }
  }

  const navItems = getNavItems()

  const getWelcomeMessage = () => {
    switch (user.role) {
      case "buyer":
        return "Buyer Dashboard"
      case "seller":
        return "Seller Dashboard"
      case "distributor":
        return "Distributor Dashboard"
      case "admin":
        return "Admin Dashboard"
      default:
        return "Dashboard"
    }
  }

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-sidebar-primary" />
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">BricksBazar</h1>
              <p className="text-xs text-sidebar-foreground/70">{getWelcomeMessage()}</p>
            </div>
          </div>
          <NotificationCenter />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3 p-2">
          <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Welcome, {user.name}</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground">
            <Settings className="h-4 w-4" />
            Profile Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
