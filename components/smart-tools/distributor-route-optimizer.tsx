"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Route, Truck, MapPin, Clock, Fuel, BarChart3, Loader2 } from "lucide-react"

type DeliveryStatus = "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"

type DeliveryRecord = {
  id: string
  orderId: string
  orderNumber: string
  vehicleNumber: string
  vehicleType: string
  status: DeliveryStatus
  etaMinutes: number
  pickupAddress: string
  deliveryAddress: string
  currentLat?: number
  currentLng?: number
  currentAddress?: string
}

type RoutePlan = {
  id: string
  name: string
  deliveries: number
  distance: number
  estimatedTime: number
  fuelCost: number
  efficiency: number
  status: "excellent" | "good" | "optimized"
  stops: string[]
  deliveryIds: string[]
  origin: string
  destination: string
  waypoints: string[]
}

function estimateDistanceKm(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return 6 + (hash % 35)
}

function shortAddress(value: string) {
  return value.split(",")[0]?.trim() || value
}

export default function DistributorRouteOptimizer() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedRoute, setSelectedRoute] = useState("")
  const [optimizationMode, setOptimizationMode] = useState("time")
  const [actionMessage, setActionMessage] = useState("")

  useEffect(() => {
    let cancelled = false
    const loadDeliveries = async () => {
      try {
        const response = await fetch("/api/deliveries", { credentials: "include", cache: "no-store" })
        const payload = (await response.json()) as { deliveries?: DeliveryRecord[]; error?: string }
        if (!response.ok || !payload.deliveries) {
          throw new Error(payload.error || "Could not load route data")
        }
        if (!cancelled) {
          setDeliveries(payload.deliveries)
          setError("")
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load route data")
          setDeliveries([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDeliveries()
    const timer = setInterval(loadDeliveries, 25000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const routeData = useMemo(() => {
    const activeDeliveries = deliveries.filter((delivery) => delivery.status !== "delivered" && delivery.status !== "cancelled")
    const groups = new Map<string, DeliveryRecord[]>()

    activeDeliveries.forEach((delivery) => {
      const key = delivery.vehicleNumber.trim() || `UNASSIGNED-${delivery.id}`
      const rows = groups.get(key) || []
      rows.push(delivery)
      groups.set(key, rows)
    })

    const plans: RoutePlan[] = Array.from(groups.entries()).map(([vehicleNumber, rows], index) => {
      const totalDistance = rows.reduce((sum, row) => sum + estimateDistanceKm(row.orderId), 0)
      const totalEtaHours = rows.reduce((sum, row) => sum + Math.max(0.3, row.etaMinutes / 60), 0)
      const fuelCost = Math.round(totalDistance * 16.5)
      const onTimeFactor = rows.filter((row) => row.etaMinutes <= 120).length / Math.max(1, rows.length)
      const efficiency = Math.max(65, Math.min(98, Math.round(75 + onTimeFactor * 20 - rows.length)))
      const stops = rows.map((row) => shortAddress(row.deliveryAddress))
      const first = rows[0]
      const origin =
        first.currentLat !== undefined && first.currentLng !== undefined
          ? `${first.currentLat},${first.currentLng}`
          : first.currentAddress || first.pickupAddress
      const destination = rows[rows.length - 1].deliveryAddress
      const waypoints = rows.slice(0, -1).map((row) => row.deliveryAddress)
      const status: RoutePlan["status"] = efficiency >= 92 ? "excellent" : efficiency >= 84 ? "good" : "optimized"

      return {
        id: `ROUTE-${index + 1}`,
        name: `${vehicleNumber} Route`,
        deliveries: rows.length,
        distance: Number(totalDistance.toFixed(1)),
        estimatedTime: Number(totalEtaHours.toFixed(1)),
        fuelCost,
        efficiency,
        status,
        stops,
        deliveryIds: rows.map((row) => row.id),
        origin,
        destination,
        waypoints,
      }
    })

    return plans
  }, [deliveries])

  useEffect(() => {
    if (routeData.length === 0) {
      setSelectedRoute("")
      return
    }
    setSelectedRoute((current) => (current && routeData.some((route) => route.id === current) ? current : routeData[0].id))
  }, [routeData])

  const currentRoute = routeData.find((route) => route.id === selectedRoute) || routeData[0]

  const getStatusColor = (status: string) => {
    if (status === "excellent") return "default"
    if (status === "good") return "secondary"
    return "outline"
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return "text-green-600"
    if (efficiency >= 80) return "text-yellow-600"
    return "text-red-600"
  }

  const applyOptimization = () => {
    if (!routeData.length) {
      setActionMessage("No active routes available for optimization.")
      return
    }

    const sorted = [...routeData].sort((a, b) => {
      if (optimizationMode === "time") return a.estimatedTime - b.estimatedTime
      if (optimizationMode === "distance") return a.distance - b.distance
      if (optimizationMode === "fuel") return a.fuelCost - b.fuelCost
      return b.efficiency - a.efficiency
    })

    setSelectedRoute(sorted[0].id)
    setActionMessage(`Optimization applied with ${optimizationMode} priority. Best route selected: ${sorted[0].name}.`)
  }

  const startLiveNavigation = () => {
    if (!currentRoute) return
    const destination = encodeURIComponent(currentRoute.destination)
    const origin = encodeURIComponent(currentRoute.origin)
    const waypointParam = currentRoute.waypoints.length
      ? `&waypoints=${encodeURIComponent(currentRoute.waypoints.join("|"))}`
      : ""
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointParam}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Smart Route Optimizer
        </CardTitle>
        <CardDescription>Live route intelligence from your active deliveries</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}

        {loading ? (
          <div className="py-8 text-muted-foreground flex items-center justify-center">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Loading route intelligence...
          </div>
        ) : routeData.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No active delivery routes available right now.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Route</label>
                <Select value={selectedRoute || currentRoute?.id || ""} onValueChange={setSelectedRoute}>
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

            {currentRoute ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Truck className="h-4 w-4" />
                        <span className="text-sm font-medium">Total Deliveries</span>
                      </div>
                      <p className="text-2xl font-bold">{currentRoute.deliveries}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">Total Distance</span>
                      </div>
                      <p className="text-2xl font-bold">{currentRoute.distance} km</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Estimated Time</span>
                      </div>
                      <p className="text-2xl font-bold">{currentRoute.estimatedTime}h</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-purple-600">
                        <Fuel className="h-4 w-4" />
                        <span className="text-sm font-medium">Fuel Cost</span>
                      </div>
                      <p className="text-2xl font-bold">Rs. {currentRoute.fuelCost}</p>
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
                          <span className="text-sm">Average per Delivery:</span>
                          <span className="font-medium">{(currentRoute.distance / currentRoute.deliveries).toFixed(1)} km</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Cost per Delivery:</span>
                          <span className="font-medium">Rs. {(currentRoute.fuelCost / currentRoute.deliveries).toFixed(0)}</span>
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
                          <div key={`${currentRoute.id}-${index}`} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium">{stop}</span>
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
                          <span>Routes Active:</span>
                          <span className="font-semibold">{routeData.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Efficiency:</span>
                          <span className="font-semibold text-green-600">
                            {Math.round(routeData.reduce((sum, route) => sum + route.efficiency, 0) / routeData.length)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Fuel Cost:</span>
                          <span className="font-semibold">
                            Rs. {routeData.reduce((sum, route) => sum + route.fuelCost, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1" onClick={applyOptimization}>
                    Apply Route Optimization
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={startLiveNavigation}>
                    Start Live Navigation
                  </Button>
                </div>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
