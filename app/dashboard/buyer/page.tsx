"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calculator, ShoppingCart, Truck, Star, TrendingUp, Package, MapPin, Building2 } from "lucide-react"
import Link from "next/link"

export default function BuyerDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Expected this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹2,45,000</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Money</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹18,500</div>
            <p className="text-xs text-muted-foreground">vs market price</p>
          </CardContent>
        </Card>
      </div>

      {/* Smart Tools Section */}
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
                <p className="font-bold">₹12,50,000</p>
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

      {/* Recent Orders & Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your latest material orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  id: "ORD-001",
                  item: "Red Bricks",
                  quantity: "10,000 pieces",
                  status: "In Transit",
                  supplier: "Local Brick Co.",
                },
                { id: "ORD-002", item: "Cement Bags", quantity: "50 bags", status: "Delivered", supplier: "BuildMart" },
                {
                  id: "ORD-003",
                  item: "Steel Rods",
                  quantity: "2 tons",
                  status: "Processing",
                  supplier: "Steel Works Ltd.",
                },
              ].map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{order.item}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.quantity} • {order.supplier}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        order.status === "Delivered"
                          ? "default"
                          : order.status === "In Transit"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/buyer/orders">
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                View All Orders
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trusted Suppliers</CardTitle>
            <CardDescription>Your verified supplier network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Local Brick Co.", rating: 4.8, orders: 15, badge: "Local Verified", location: "2.5 km away" },
                { name: "BuildMart", rating: 4.6, orders: 8, badge: "Premium", location: "5.2 km away" },
                { name: "Steel Works Ltd.", rating: 4.9, orders: 12, badge: "Distributor", location: "8.1 km away" },
              ].map((supplier) => (
                <div key={supplier.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{supplier.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {supplier.badge}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {supplier.rating}
                      </span>
                      <span>{supplier.orders} orders</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {supplier.location}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/buyer/suppliers">
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                View All Suppliers
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Location-based Pricing */}
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
              { material: "Red Bricks", local: "₹8/piece", regional: "₹6.5/piece", savings: "18%" },
              { material: "Cement (50kg)", local: "₹420/bag", regional: "₹380/bag", savings: "9%" },
              { material: "Steel Rods", local: "₹65/kg", regional: "₹58/kg", savings: "11%" },
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
