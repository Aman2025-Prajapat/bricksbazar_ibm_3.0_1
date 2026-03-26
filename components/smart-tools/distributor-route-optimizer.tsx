"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Route, Truck, MapPin, Clock, Fuel, BarChart3 } from "lucide-react"

const routeData = [
  {
    id: "ROUTE-001",
    name: "North Mumbai Circuit",
    deliveries: 8,
    distance: 45.2,
    estimatedTime: 6.5,
    fuelCost: 850,
    efficiency: 92,
    status: "optimized",
    stops: ["Andheri", "Borivali", "Malad", "Kandivali", "Dahisar", "Mira Road", "Vasai", "Nalasopara"],
  },
  {
    id: "ROUTE-002",
    name: "Central Mumbai Route",
    deliveries: 12,
    distance: 38.7,
    estimatedTime: 5.2,
    fuelCost: 720,
    efficiency: 88,
    status: "good",
    stops: ["Bandra", "Khar", "Santacruz", "Vile Parle", "Jogeshwari", "Goregaon", "Malad", "Kandivali"],
  },
  {
    id: "ROUTE-003",
    name: "South Mumbai Express",
    deliveries: 6,
    distance: 28.5,
    estimatedTime: 4.8,
    fuelCost: 650,
    efficiency: 95,
    status: "excellent",
    stops: ["Colaba", "Fort", "Churchgate", "Marine Lines", "Charni Road", "Grant Road"],
  },
]

export default function DistributorRouteOptimizer() {
  const [selectedRoute, setSelectedRoute] = useState("ROUTE-001")
  const [optimizationMode, setOptimizationMode] = useState("time")

  const currentRoute = routeData.find((r) => r.id === selectedRoute) || routeData[0]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "default"
      case "good":
        return "secondary"
      case "optimized":
        return "outline"
      default:
        return "destructive"
    }
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return "text-green-600"
    if (efficiency >= 80) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Smart Route Optimizer
        </CardTitle>
        <CardDescription>AI-powered delivery route optimization and fleet management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Route</label>
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {routeData.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name} ({route.deliveries} deliveries)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Optimization Priority</label>
            <Select value={optimizationMode} onValueChange={setOptimizationMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Minimize Time</SelectItem>
                <SelectItem value="distance">Minimize Distance</SelectItem>
                <SelectItem value="fuel">Minimize Fuel Cost</SelectItem>
                <SelectItem value="balanced">Balanced Optimization</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Truck className="h-4 w-4" />
                <span className="text-sm font-medium">Total Deliveries</span>
              </div>
              <p className="text-2xl font-bold">{currentRoute.deliveries}</p>
              <p className="text-sm text-muted-foreground">stops planned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Total Distance</span>
              </div>
              <p className="text-2xl font-bold">{currentRoute.distance} km</p>
              <p className="text-sm text-muted-foreground">optimized route</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Estimated Time</span>
              </div>
              <p className="text-2xl font-bold">{currentRoute.estimatedTime}h</p>
              <p className="text-sm text-muted-foreground">including stops</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600">
                <Fuel className="h-4 w-4" />
                <span className="text-sm font-medium">Fuel Cost</span>
              </div>
              <p className="text-2xl font-bold">₹{currentRoute.fuelCost}</p>
              <p className="text-sm text-muted-foreground">estimated</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Route Details
                <Badge variant={getStatusColor(currentRoute.status)}>{currentRoute.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Route Efficiency:</span>
                  <span className={`font-bold ${getEfficiencyColor(currentRoute.efficiency)}`}>
                    {currentRoute.efficiency}%
                  </span>
                </div>
                <Progress value={currentRoute.efficiency} />

                <div className="flex justify-between items-center">
                  <span className="text-sm">Average per Stop:</span>
                  <span className="font-medium">{(currentRoute.distance / currentRoute.deliveries).toFixed(1)} km</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Cost per Delivery:</span>
                  <span className="font-medium">₹{(currentRoute.fuelCost / currentRoute.deliveries).toFixed(0)}</span>
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Optimization Savings</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-green-700">Time Saved:</p>
                    <p className="font-semibold">1.2 hours</p>
                  </div>
                  <div>
                    <p className="text-green-700">Fuel Saved:</p>
                    <p className="font-semibold">₹180</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Stops</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentRoute.stops.map((stop, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{stop}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {index === 0
                        ? "Start"
                        : index === currentRoute.stops.length - 1
                          ? "End"
                          : `${(Math.random() * 30 + 15).toFixed(0)} min`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">Today Performance</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Routes Completed:</span>
                  <span className="font-semibold">3/5</span>
                </div>
                <div className="flex justify-between">
                  <span>On-Time Delivery:</span>
                  <span className="font-semibold text-green-600">94%</span>
                </div>
                <div className="flex justify-between">
                  <span>Fuel Efficiency:</span>
                  <span className="font-semibold">12.5 km/L</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Live Tracking</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current Location:</span>
                  <span className="font-semibold">Andheri West</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Stop:</span>
                  <span className="font-semibold">Borivali</span>
                </div>
                <div className="flex justify-between">
                  <span>ETA:</span>
                  <span className="font-semibold">25 min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Schedule Status</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Ahead of Schedule:</span>
                  <span className="font-semibold text-green-600">15 min</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Stops:</span>
                  <span className="font-semibold">5</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion ETA:</span>
                  <span className="font-semibold">4:30 PM</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1">Apply Route Optimization</Button>
          <Button variant="outline" className="flex-1 bg-transparent">
            Start Live Navigation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

