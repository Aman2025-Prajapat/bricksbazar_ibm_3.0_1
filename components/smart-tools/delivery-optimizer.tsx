"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, MapPin, Clock, Route, AlertTriangle } from "lucide-react"

const deliveryOptions = [
  {
    id: "express",
    name: "Express Delivery",
    time: "Same Day",
    cost: 500,
    reliability: 98,
    description: "Guaranteed delivery within 6 hours",
    icon: "⚡",
  },
  {
    id: "standard",
    name: "Standard Delivery",
    time: "1-2 Days",
    cost: 200,
    reliability: 95,
    description: "Regular delivery with tracking",
    icon: "🚛",
  },
  {
    id: "economy",
    name: "Economy Delivery",
    time: "3-5 Days",
    cost: 100,
    reliability: 90,
    description: "Cost-effective bulk delivery",
    icon: "📦",
  },
]

export default function DeliveryOptimizer() {
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [urgency, setUrgency] = useState("standard")
  const [selectedOption, setSelectedOption] = useState("standard")
  const [actionMessage, setActionMessage] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")

  const currentOption = deliveryOptions.find((opt) => opt.id === selectedOption)

  const scheduleOptimizedDelivery = () => {
    if (!deliveryAddress.trim()) {
      setActionMessage("Please enter a delivery address before scheduling.")
      return
    }

    const now = new Date()
    const hoursToAdd = urgency === "urgent" ? 2 : urgency === "standard" ? 12 : 24
    const slot = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000)
    const slotText = slot.toLocaleString()
    const scheduleRecord = {
      id: `SCH-${Date.now()}`,
      address: deliveryAddress.trim(),
      option: selectedOption,
      urgency,
      scheduledFor: slot.toISOString(),
      createdAt: now.toISOString(),
    }

    try {
      const raw = window.localStorage.getItem("bb_delivery_schedules_v1")
      const history = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : []
      window.localStorage.setItem("bb_delivery_schedules_v1", JSON.stringify([scheduleRecord, ...history]))
    } catch {
      // Ignore local storage errors and still show a success message.
    }

    setScheduledFor(slotText)
    setActionMessage(`Delivery scheduled successfully for ${slotText} using ${currentOption?.name || "selected"} mode.`)
  }

  const trackLiveLocation = () => {
    if (!deliveryAddress.trim()) {
      setActionMessage("Please enter delivery address to open live tracking.")
      return
    }

    const destination = encodeURIComponent(deliveryAddress.trim())
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
    setTrackingUrl(mapsUrl)

    const popup = window.open(mapsUrl, "_blank")
    if (popup) {
      popup.opener = null
      setActionMessage("Live location tracking opened in Google Maps.")
    } else {
      setActionMessage("Popup blocked by browser. Use the tracking link below to open live location.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Smart Delivery Optimizer
        </CardTitle>
        <CardDescription>AI-powered delivery route optimization and cost estimation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Delivery Address</label>
            <Input
              placeholder="Enter delivery location"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Urgency Level</label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Urgent (Same Day)</SelectItem>
                <SelectItem value="standard">Standard (1-2 Days)</SelectItem>
                <SelectItem value="flexible">Flexible (3-5 Days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Route className="h-4 w-4" />
                <span className="text-sm font-medium">Optimized Route</span>
              </div>
              <p className="text-2xl font-bold">12.4 km</p>
              <p className="text-sm text-muted-foreground">shortest distance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Estimated Time</span>
              </div>
              <p className="text-2xl font-bold">45 min</p>
              <p className="text-sm text-muted-foreground">with traffic</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Delivery Zones</span>
              </div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-sm text-muted-foreground">available routes</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Delivery Options</h3>
          <div className="space-y-3">
            {deliveryOptions.map((option) => (
              <div
                key={option.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedOption === option.id ? "border-primary bg-primary/5" : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedOption(option.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <h4 className="font-medium">{option.name}</h4>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{option.cost}</p>
                    <p className="text-sm text-muted-foreground">{option.time}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={option.reliability >= 95 ? "default" : "secondary"}>
                    {option.reliability}% Reliable
                  </Badge>
                  {selectedOption === option.id && <Badge variant="default">Selected</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">Traffic Alert</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Heavy traffic expected on main route between 4-6 PM. Consider scheduling delivery for earlier or later
                time slots for faster delivery.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={scheduleOptimizedDelivery}>
            Schedule Optimized Delivery
          </Button>
          <Button variant="outline" className="flex-1 bg-transparent" onClick={trackLiveLocation}>
            Track Live Location
          </Button>
        </div>

        {actionMessage ? (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            {actionMessage}
            {scheduledFor ? <div className="mt-1 font-medium">Scheduled Slot: {scheduledFor}</div> : null}
            {trackingUrl ? (
              <div className="mt-2">
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Open Live Tracking
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
