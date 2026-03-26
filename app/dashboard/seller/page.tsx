"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, ShoppingCart, TrendingUp, Star, Plus, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function SellerDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground">Manage your products and track your sales</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/seller/products/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
          <Link href="/dashboard/seller/analytics">
            <Button variant="outline" className="gap-2 bg-transparent">
              <TrendingUp className="h-4 w-4" />
              View Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+3 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">+5 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹1,85,000</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-xs text-muted-foreground">Based on 156 reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from buyers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  id: "ORD-001",
                  product: "Premium Red Bricks",
                  quantity: "5,000 pieces",
                  buyer: "Rajesh Construction",
                  amount: "₹42,500",
                  status: "Processing",
                  time: "2 hours ago",
                },
                {
                  id: "ORD-002",
                  product: "OPC Cement 50kg",
                  quantity: "25 bags",
                  buyer: "BuildTech Ltd.",
                  amount: "₹10,500",
                  status: "Confirmed",
                  time: "4 hours ago",
                },
                {
                  id: "ORD-003",
                  product: "Concrete Blocks",
                  quantity: "200 pieces",
                  buyer: "Home Builders",
                  amount: "₹9,000",
                  status: "Shipped",
                  time: "1 day ago",
                },
              ].map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{order.product}</p>
                      <p className="font-bold text-primary">{order.amount}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.quantity} • {order.buyer}
                    </p>
                    <p className="text-xs text-muted-foreground">{order.time}</p>
                  </div>
                  <div className="ml-4">
                    <Badge
                      variant={
                        order.status === "Shipped" ? "default" : order.status === "Confirmed" ? "secondary" : "outline"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/seller/orders">
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                View All Orders
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
            <CardDescription>Your best-selling products this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  name: "Premium Red Bricks",
                  sales: 45,
                  revenue: "₹3,82,500",
                  growth: "+15%",
                  rating: 4.9,
                  stock: "In Stock",
                },
                {
                  name: "OPC Cement 50kg",
                  sales: 32,
                  revenue: "₹1,34,400",
                  growth: "+8%",
                  rating: 4.7,
                  stock: "Low Stock",
                },
                {
                  name: "Concrete Blocks",
                  sales: 28,
                  revenue: "₹1,26,000",
                  growth: "+22%",
                  rating: 4.8,
                  stock: "In Stock",
                },
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="font-bold">{product.revenue}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{product.sales} orders</span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {product.rating}
                      </span>
                      <Badge variant={product.stock === "Low Stock" ? "destructive" : "secondary"} className="text-xs">
                        {product.stock}
                      </Badge>
                    </div>
                  </div>
                  <div className="ml-4">
                    <Badge variant="outline" className="text-green-600">
                      {product.growth}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/seller/analytics">
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                View Detailed Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Inventory Alerts
            </CardTitle>
            <CardDescription>Products requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { product: "OPC Cement 50kg", issue: "Low Stock", level: "8 bags remaining", action: "Restock" },
                { product: "River Sand", issue: "Out of Stock", level: "0 tons available", action: "Urgent Restock" },
                {
                  product: "TMT Steel Rods",
                  issue: "High Demand",
                  level: "15 orders pending",
                  action: "Increase Stock",
                },
              ].map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{alert.product}</p>
                    <p className="text-sm text-muted-foreground">{alert.level}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={alert.issue === "Out of Stock" ? "destructive" : "secondary"}>{alert.issue}</Badge>
                    <Button variant="outline" size="sm" className="mt-1 ml-2 bg-transparent">
                      {alert.action}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your store efficiently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/seller/products/new">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Plus className="h-6 w-6" />
                  Add Product
                </Button>
              </Link>
              <Link href="/dashboard/seller/products">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Package className="h-6 w-6" />
                  Manage Inventory
                </Button>
              </Link>
              <Link href="/dashboard/seller/orders">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <ShoppingCart className="h-6 w-6" />
                  Process Orders
                </Button>
              </Link>
              <Link href="/dashboard/seller/analytics">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <TrendingUp className="h-6 w-6" />
                  View Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Performance</CardTitle>
          <CardDescription>Revenue and order trends over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Sales chart visualization would go here</p>
              <p className="text-sm text-muted-foreground">Integration with charting library needed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Customer Reviews</CardTitle>
          <CardDescription>What buyers are saying about your products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                product: "Premium Red Bricks",
                buyer: "Rajesh Construction",
                rating: 5,
                comment: "Excellent quality bricks, delivered on time. Will order again.",
                date: "2 days ago",
              },
              {
                product: "OPC Cement 50kg",
                buyer: "BuildTech Ltd.",
                rating: 4,
                comment: "Good quality cement, packaging could be better.",
                date: "5 days ago",
              },
              {
                product: "Concrete Blocks",
                buyer: "Home Builders",
                rating: 5,
                comment: "Perfect blocks for our project. Great seller!",
                date: "1 week ago",
              },
            ].map((review, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{review.product}</p>
                    <p className="text-sm text-muted-foreground">
                      {review.buyer} • {review.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm">{review.comment}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
