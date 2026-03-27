"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Truck, Phone, AlertTriangle, Route, Loader2, LocateFixed } from "lucide-react"

type DeliveryStatus = "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"

type DeliveryRecord = {
  id: string
  orderId: string
  orderNumber: string
  buyerName: string
  deliveryAddress: string
  vehicleNumber: string
  vehicleType: string
  driverName: string
  driverPhone: string
  status: DeliveryStatus
  etaMinutes: number
  currentLat?: number
  currentLng?: number
  currentAddress?: string
  updatedAt: string
}

function cleanPhoneForTel(value: string) {
  return value.replace(/[^0-9+]/g, "")
}

export default function LiveTrackingPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [streamConnected, setStreamConnected] = useState(false)
  const [focusedDeliveryId, setFocusedDeliveryId] = useState<string | null>(null)

  const loadDeliveries = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }

    try {
      const response = await fetch("/api/deliveries", { credentials: "include", cache: "no-store" })
      const payload = (await response.json()) as { deliveries?: DeliveryRecord[]; error?: string }
      if (!response.ok || !payload.deliveries) {
        throw new Error(payload.error || "Could not load tracking data")
      }
      setDeliveries(payload.deliveries)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load tracking data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let closed = false
    void loadDeliveries()

    const source = new EventSource("/api/deliveries/stream")
    source.addEventListener("deliveries", (event) => {
      if (closed) return
      try {
        const payload = JSON.parse(event.data) as { deliveries?: DeliveryRecord[] }
        if (payload.deliveries) {
          setDeliveries(payload.deliveries)
          setStreamConnected(true)
          setLoading(false)
          setError("")
        }
      } catch {
        // Ignore malformed chunk and keep previous state.
      }
    })
    source.onerror = () => {
      if (!closed) {
        setStreamConnected(false)
      }
    }

    return () => {
      closed = true
      source.close()
    }
  }, [])

  const activeDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.status === "in_transit" || delivery.status === "nearby"),
    [deliveries],
  )

  useEffect(() => {
    if (activeDeliveries.length === 0) {
      setFocusedDeliveryId(null)
      return
    }
    if (!focusedDeliveryId || !activeDeliveries.some((delivery) => delivery.id === focusedDeliveryId)) {
      setFocusedDeliveryId(activeDeliveries[0].id)
    }
  }, [activeDeliveries, focusedDeliveryId])

  const focusedDelivery = useMemo(
    () => activeDeliveries.find((delivery) => delivery.id === focusedDeliveryId) || activeDeliveries[0] || null,
    [activeDeliveries, focusedDeliveryId],
  )

  const focusedMapEmbedUrl = useMemo(() => {
    if (!focusedDelivery || focusedDelivery.currentLat === undefined || focusedDelivery.currentLng === undefined) {
      return null
    }

    const lat = focusedDelivery.currentLat
    const lng = focusedDelivery.currentLng
    const delta = 0.02
    const bboxLeft = (lng - delta).toFixed(6)
    const bboxBottom = (lat - delta).toFixed(6)
    const bboxRight = (lng + delta).toFixed(6)
    const bboxTop = (lat + delta).toFixed(6)
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bboxLeft}%2C${bboxBottom}%2C${bboxRight}%2C${bboxTop}&layer=mapnik&marker=${lat}%2C${lng}`
  }, [focusedDelivery])

  const vehicleRows = useMemo(
    () =>
      activeDeliveries.map((delivery) => ({
        deliveryId: delivery.id,
        id: delivery.vehicleNumber,
        driver: delivery.driverName,
        status: delivery.status,
        location: delivery.currentAddress || delivery.deliveryAddress,
        delivery: delivery.orderNumber,
        eta: delivery.etaMinutes > 0 ? `${delivery.etaMinutes} mins` : "Calculating",
        speed: delivery.status === "in_transit" ? "40 km/h" : "15 km/h",
        fuel: "--",
        driverPhone: delivery.driverPhone,
      })),
    [activeDeliveries],
  )

  const pushLivePing = async (delivery: DeliveryRecord) => {
    if (delivery.currentLat === undefined || delivery.currentLng === undefined) {
      setError("No driver GPS feed yet for this delivery. Use Driver API/app to push location.")
      return
    }

    const lat = delivery.currentLat
    const lng = delivery.currentLng

    try {
      const response = await fetch(`/api/deliveries/${delivery.id}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lat,
          lng,
          address: delivery.currentAddress || delivery.deliveryAddress,
          speedKph: delivery.status === "in_transit" ? 42 : 12,
          heading: 0,
          status: delivery.status,
        }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Could not update live location")
      }
      setActionMessage(`Live ping updated for ${delivery.orderNumber}`)
      await loadDeliveries(true)
    } catch (pingError) {
      setError(pingError instanceof Error ? pingError.message : "Could not update live location")
    }
  }

  const openRoute = (delivery: DeliveryRecord) => {
    const origin =
      delivery.currentLat !== undefined && delivery.currentLng !== undefined
        ? `${delivery.currentLat},${delivery.currentLng}`
        : delivery.currentAddress || "Current Location"

    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(delivery.deliveryAddress)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-bold">Live Delivery Tracking</h1>
          <Badge variant={streamConnected ? "default" : "secondary"}>
            {streamConnected ? "Live Stream On" : "Live Stream Reconnecting"}
          </Badge>
        </div>
        <p className="text-muted-foreground">Real-time tracking of all active deliveries</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Interactive Delivery Map
          </CardTitle>
          <CardDescription>Track all vehicles and deliveries in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed text-center text-muted-foreground">
              <div>
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading live vehicles...
              </div>
            </div>
          ) : focusedMapEmbedUrl ? (
            <div className="space-y-3">
              <div className="h-96 rounded-lg overflow-hidden border">
                <iframe title="Live delivery map" src={focusedMapEmbedUrl} className="h-full w-full" loading="lazy" />
              </div>
              <div className="text-sm text-muted-foreground">
                Focused on {focusedDelivery?.orderNumber} | {focusedDelivery?.currentAddress || focusedDelivery?.deliveryAddress}
              </div>
            </div>
          ) : (
            <div className="h-96 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed text-center">
              <div>
                <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Live map waiting for first GPS ping</h3>
                <p className="text-muted-foreground mb-4">
                  Active Deliveries: {activeDeliveries.length} | Total Tracked: {deliveries.length}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" className="bg-transparent" onClick={() => loadDeliveries(true)}>
                    <Navigation className="h-4 w-4 mr-2" />
                    Refresh Live
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={() => window.open("https://www.google.com/maps", "_blank", "noopener,noreferrer")}
                  >
                    <Route className="h-4 w-4 mr-2" />
                    Open Map
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Vehicles</CardTitle>
            <CardDescription>Currently deployed delivery vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vehicleRows.map((vehicle) => (
                <div key={`${vehicle.id}-${vehicle.delivery}`} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <h4 className="font-semibold">{vehicle.id}</h4>
                      <Badge variant={vehicle.status === "nearby" ? "default" : "secondary"}>
                        {vehicle.status === "nearby" ? "Nearby" : "In Transit"}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={() => {
                        if (!vehicle.driverPhone.trim()) {
                          setActionMessage("Driver phone not assigned yet")
                          return
                        }
                        window.location.href = `tel:${cleanPhoneForTel(vehicle.driverPhone)}`
                      }}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Driver</p>
                      <p className="font-medium">{vehicle.driver}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Location</p>
                      <p className="font-medium">{vehicle.location}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Delivery</p>
                      <p className="font-medium">{vehicle.delivery}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ETA</p>
                      <p className="font-medium">{vehicle.eta}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
                    <span>Speed: {vehicle.speed}</span>
                    <span>Fuel: {vehicle.fuel}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setFocusedDeliveryId(vehicle.deliveryId)}>
                        <MapPin className="h-4 w-4 mr-1" />
                        Focus Map
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const delivery = activeDeliveries.find((item) => item.id === vehicle.deliveryId)
                          if (delivery) {
                            void pushLivePing(delivery)
                          }
                        }}
                      >
                        <LocateFixed className="h-4 w-4 mr-1" />
                        Track Live
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {vehicleRows.length === 0 ? <p className="text-sm text-muted-foreground">No active vehicles right now.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Timeline</CardTitle>
            <CardDescription>Latest updates from active deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deliveries.slice(0, 8).map((delivery) => (
                <div key={delivery.id} className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      delivery.status === "delivered"
                        ? "bg-green-500"
                        : delivery.status === "cancelled"
                          ? "bg-red-500"
                          : delivery.status === "nearby"
                            ? "bg-orange-500"
                            : "bg-blue-500"
                    }`}
                  ></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        {delivery.orderNumber} - {delivery.status.replace("_", " ")}
                      </h4>
                      <span className="text-sm text-muted-foreground">{new Date(delivery.updatedAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {delivery.currentAddress || delivery.deliveryAddress}
                    </p>
                    <div className="mt-1">
                      <Button size="sm" variant="ghost" onClick={() => openRoute(delivery)}>
                        <Navigation className="h-3 w-3 mr-1" />
                        Open Route
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Tracking Alerts
          </CardTitle>
          <CardDescription>Live operational flags based on delivery status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Nearby Deliveries</p>
              <p className="text-2xl font-bold">{deliveries.filter((item) => item.status === "nearby").length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">In Transit</p>
              <p className="text-2xl font-bold">{deliveries.filter((item) => item.status === "in_transit").length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Need Assignment</p>
              <p className="text-2xl font-bold">
                {deliveries.filter((item) => item.vehicleNumber === "Not Assigned" || item.driverName === "Not Assigned").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
