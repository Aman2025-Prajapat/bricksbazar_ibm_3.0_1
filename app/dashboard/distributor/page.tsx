"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Truck, MapPin, TrendingUp, Route, AlertTriangle, CheckCircle, Award, Scale } from "lucide-react"
import Link from "next/link"
import { fairAlgorithm } from "@/lib/fair-algorithm"

export default function DistributorDashboard() {
  const deliveryRequests = [
    {
      id: "REQ-001",
      from: "Steel Works Ltd.",
      to: "Construction Site A",
      product: "TMT Steel Rods",
      weight: "2 tons",
      distance: "18.5 km",
      urgency: "high",
      payment: "₹2,500",
      time: "2 hours ago",
      supplier: {
        id: "sup-1",
        name: "Steel Works Ltd.",
        type: "distributor" as const,
        rating: 4.2,
        distance: 18.5,
        verified: true,
        localBadge: false,
        reviewCount: 89,
        responseTime: 3,
        deliveryReliability: 85,
        priceCompetitiveness: 0.7,
      },
    },
    {
      id: "REQ-002",
      from: "Sand Suppliers Co.",
      to: "Home Builders",
      product: "River Sand",
      weight: "5 tons",
      distance: "12.3 km",
      urgency: "medium",
      payment: "₹1,800",
      time: "4 hours ago",
      supplier: {
        id: "sup-2",
        name: "Sand Suppliers Co.",
        type: "local" as const,
        rating: 4.4,
        distance: 12.3,
        verified: true,
        localBadge: true,
        reviewCount: 67,
        responseTime: 2,
        deliveryReliability: 90,
        priceCompetitiveness: 0.6,
      },
    },
    {
      id: "REQ-003",
      from: "Tile World",
      to: "Residential Complex",
      product: "Roofing Tiles",
      weight: "500 kg",
      distance: "25.7 km",
      urgency: "low",
      payment: "₹3,200",
      time: "6 hours ago",
      supplier: {
        id: "sup-3",
        name: "Tile World",
        type: "distributor" as const,
        rating: 4.5,
        distance: 25.7,
        verified: true,
        localBadge: false,
        reviewCount: 78,
        responseTime: 5,
        deliveryReliability: 75,
        priceCompetitiveness: 0.75,
      },
    },
  ]

  // Sort delivery requests using Fair Algorithm
  const sortedRequests = deliveryRequests.sort((a, b) => {
    const scoreA = fairAlgorithm.calculateFairScore(a.supplier)
    const scoreB = fairAlgorithm.calculateFairScore(b.supplier)
    return scoreB - scoreA
  })

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Distributor Dashboard</h1>
          <p className="text-muted-foreground">Manage deliveries with Fair Algorithm prioritization</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/distributor/tracking">
            <Button className="gap-2">
              <MapPin className="h-4 w-4" />
              Live Tracking
            </Button>
          </Link>
          <Link href="/dashboard/distributor/deliveries">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Truck className="h-4 w-4" />
              View All Deliveries
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">+3 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">On schedule</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342 km</div>
            <p className="text-xs text-muted-foreground">Today routes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.9</div>
            <p className="text-xs text-muted-foreground">Based on 89 reviews</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fair Impact</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">67%</div>
            <p className="text-xs text-green-700">Local deliveries</p>
          </CardContent>
        </Card>
      </div>

      {/* Fair Algorithm Benefits */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Scale className="h-5 w-5" />
            Fair Algorithm Benefits for Distributors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">7%</p>
              <p className="text-sm text-blue-700">Higher Commission on Large Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">Priority</p>
              <p className="text-sm text-blue-700">Bulk Delivery Requests</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">Balanced</p>
              <p className="text-sm text-blue-700">Fair Competition</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Deliveries & Route Planning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Deliveries</CardTitle>
            <CardDescription>Current deliveries in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  id: "DEL-001",
                  order: "ORD-001",
                  product: "Premium Red Bricks",
                  quantity: "5,000 pieces",
                  pickup: "Local Brick Co.",
                  delivery: "Rajesh Construction Site",
                  status: "in_transit",
                  eta: "2:30 PM",
                  distance: "12.5 km",
                  progress: 65,
                },
                {
                  id: "DEL-002",
                  order: "ORD-002",
                  product: "OPC Cement",
                  quantity: "25 bags",
                  pickup: "BuildMart Warehouse",
                  delivery: "BuildTech Ltd.",
                  status: "loading",
                  eta: "3:45 PM",
                  distance: "8.2 km",
                  progress: 15,
                },
                {
                  id: "DEL-003",
                  order: "ORD-003",
                  product: "Concrete Blocks",
                  quantity: "200 pieces",
                  pickup: "Block Masters",
                  delivery: "Home Builders Site",
                  status: "pickup_ready",
                  eta: "4:15 PM",
                  distance: "15.8 km",
                  progress: 0,
                },
              ].map((delivery) => (
                <div key={delivery.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{delivery.id}</h4>
                      <Badge
                        variant={
                          delivery.status === "in_transit"
                            ? "default"
                            : delivery.status === "loading"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {delivery.status === "in_transit"
                          ? "In Transit"
                          : delivery.status === "loading"
                            ? "Loading"
                            : "Ready for Pickup"}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">ETA: {delivery.eta}</p>
                      <p className="text-sm text-muted-foreground">{delivery.distance}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Product:</span> {delivery.product} ({delivery.quantity})
                    </p>
                    <p>
                      <span className="text-muted-foreground">From:</span> {delivery.pickup}
                    </p>
                    <p>
                      <span className="text-muted-foreground">To:</span> {delivery.delivery}
                    </p>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{delivery.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${delivery.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      Track Live
                    </Button>
                    <Button size="sm" variant="outline" className="bg-transparent">
                      Contact
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/distributor/deliveries">
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                View All Deliveries
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smart Route Planning</CardTitle>
            <CardDescription>Optimized delivery routes for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Route A - North Zone</h4>
                  <Badge variant="default">Optimized</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Deliveries:</span> 5 stops
                  </p>
                  <p>
                    <span className="text-muted-foreground">Distance:</span> 45.2 km
                  </p>
                  <p>
                    <span className="text-muted-foreground">Est. Time:</span> 3h 15m
                  </p>
                  <p>
                    <span className="text-muted-foreground">Fuel Saved:</span> 15% vs manual route
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Route B - South Zone</h4>
                  <Badge variant="secondary">In Progress</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Deliveries:</span> 3 stops
                  </p>
                  <p>
                    <span className="text-muted-foreground">Distance:</span> 28.7 km
                  </p>
                  <p>
                    <span className="text-muted-foreground">Est. Time:</span> 2h 30m
                  </p>
                  <p>
                    <span className="text-muted-foreground">Progress:</span> 2/3 completed
                  </p>
                </div>
              </div>

              <div className="p-4 border-2 border-dashed border-muted rounded-lg">
                <div className="text-center">
                  <Route className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Route optimization in progress...</p>
                  <Button size="sm" variant="outline" className="mt-2 bg-transparent">
                    View Route Map
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Requests & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Fair Algorithm Delivery Requests
            </CardTitle>
            <CardDescription>Requests prioritized by fairness score and local support</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedRequests.map((request, index) => {
                const fairnessScore = fairAlgorithm.calculateFairScore(request.supplier)
                const trustBadges = fairAlgorithm.getTrustBadges(request.supplier)
                const commission = fairAlgorithm.calculateCommission(
                  request.supplier,
                  Number.parseInt(request.payment.replace("₹", "").replace(",", "")),
                )

                return (
                  <div key={request.id} className="p-4 border rounded-lg">
                    {index === 0 && (
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-center py-1 text-xs font-medium mb-3 rounded">
                        🏆 Highest Fair Priority
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{request.id}</h4>
                        <Badge
                          variant={
                            request.urgency === "high"
                              ? "destructive"
                              : request.urgency === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)} Priority
                        </Badge>
                        {request.supplier.type === "local" && (
                          <Badge className="bg-green-500 text-white">Local Support</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{request.payment}</p>
                        <p className="text-xs text-muted-foreground">{request.time}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm mb-3">
                      <p>
                        <span className="text-muted-foreground">Product:</span> {request.product} ({request.weight})
                      </p>
                      <p>
                        <span className="text-muted-foreground">From:</span> {request.from}
                      </p>
                      <p>
                        <span className="text-muted-foreground">To:</span> {request.to}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Distance:</span> {request.distance}
                      </p>
                    </div>

                    {/* Fair Algorithm Details */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Fair Choice Score:</span>
                        <Badge variant={fairnessScore >= 0.7 ? "default" : "secondary"}>
                          {Math.round(fairnessScore * 100)}%
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {trustBadges.slice(0, 2).map((badge, badgeIndex) => (
                          <Badge key={badgeIndex} variant="outline" className="text-xs">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Commission: {(commission * 100).toFixed(1)}%</span>
                        <span>Supplier Type: {request.supplier.type}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="flex-1">
                        Accept Request
                      </Button>
                      <Button size="sm" variant="outline" className="bg-transparent">
                        View Details
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Your delivery performance this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold">98.5%</p>
                  <p className="text-sm text-muted-foreground">On-Time Delivery</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold">156</p>
                  <p className="text-sm text-muted-foreground">Total Deliveries</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Delivery Efficiency</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average Delivery Time</span>
                      <span>2.3 hours</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "85%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Fuel Efficiency</span>
                      <span>12.5 km/L</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: "78%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Customer Satisfaction</span>
                      <span>4.9/5.0</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "98%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Fair Algorithm Impact</span>
                      <span>67% Local Support</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "67%" }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Monthly Earnings</h4>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">₹45,600</p>
                      <p className="text-sm text-muted-foreground">This month</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-medium">+18.5%</p>
                      <p className="text-sm text-muted-foreground">vs last month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Alerts & Notifications
          </CardTitle>
          <CardDescription>Important updates and system alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                type: "urgent",
                title: "Delivery DEL-001 is running late",
                message: "Expected delay of 30 minutes due to traffic. Customer has been notified.",
                time: "5 minutes ago",
              },
              {
                type: "info",
                title: "New high-priority delivery request",
                message: "Steel Works Ltd. has requested urgent delivery for Construction Site A.",
                time: "15 minutes ago",
              },
              {
                type: "success",
                title: "Route optimization completed",
                message: "Your delivery routes for tomorrow have been optimized. 20% time savings expected.",
                time: "1 hour ago",
              },
              {
                type: "warning",
                title: "Vehicle maintenance reminder",
                message: "Vehicle TN-01-AB-1234 is due for maintenance in 3 days.",
                time: "2 hours ago",
              },
            ].map((alert, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    alert.type === "urgent"
                      ? "bg-red-500"
                      : alert.type === "warning"
                        ? "bg-orange-500"
                        : alert.type === "success"
                          ? "bg-green-500"
                          : "bg-blue-500"
                  }`}
                ></div>
                <div className="flex-1">
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
                <Button variant="ghost" size="sm">
                  Dismiss
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

