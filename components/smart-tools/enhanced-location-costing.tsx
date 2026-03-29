"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, TrendingUp, Truck, Calculator, AlertTriangle } from "lucide-react"
import { downloadPdfDocument } from "@/lib/pdf-export"

const locationData = {
  mumbai: {
    name: "Mumbai",
    baseCostMultiplier: 1.2,
    transportCost: 150,
    laborCost: 800,
    permitCost: 500,
    zones: ["South Mumbai", "Central Mumbai", "Western Suburbs", "Eastern Suburbs"],
    nearbySuppliers: 45,
    averageDistance: 8.5,
  },
  delhi: {
    name: "Delhi",
    baseCostMultiplier: 1.1,
    transportCost: 120,
    laborCost: 750,
    permitCost: 300,
    zones: ["Central Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
    nearbySuppliers: 38,
    averageDistance: 12.2,
  },
  bangalore: {
    name: "Bangalore",
    baseCostMultiplier: 1.0,
    transportCost: 100,
    laborCost: 650,
    permitCost: 200,
    zones: ["Central Bangalore", "North Bangalore", "South Bangalore", "East Bangalore", "West Bangalore"],
    nearbySuppliers: 32,
    averageDistance: 15.8,
  },
}

const materialPrices = {
  "Premium Red Bricks": { basePrice: 8.5, unit: "per piece", category: "bricks" },
  "OPC Cement 50kg": { basePrice: 420, unit: "per bag", category: "cement" },
  "River Sand": { basePrice: 1200, unit: "per ton", category: "sand" },
  "Concrete Blocks": { basePrice: 45, unit: "per piece", category: "blocks" },
  "TMT Steel Rods": { basePrice: 65000, unit: "per ton", category: "steel" },
}

type LocationKey = keyof typeof locationData
type MaterialKey = keyof typeof materialPrices

type CostBreakdown = {
  basePrice: number
  locationAdjustedPrice: number
  transportCost: number
  laborCost: number
  permitCost: number
  totalCost: number
}

export default function EnhancedLocationCosting() {
  const [selectedLocation, setSelectedLocation] = useState<LocationKey>("mumbai")
  const [selectedZone, setSelectedZone] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialKey>("Premium Red Bricks")
  const [quantity, setQuantity] = useState("1000")
  const [deliveryUrgency, setDeliveryUrgency] = useState("standard")
  const [actionMessage, setActionMessage] = useState("")
  const [comparisonRows, setComparisonRows] = useState<Array<{
    locationKey: LocationKey
    location: string
    totalCost: number
    transportCost: number
    nearbySuppliers: number
  }>>([])

  const parsedQuantity = Number.parseInt(quantity, 10) || 0
  const locationInfo = locationData[selectedLocation]
  const materialInfo = materialPrices[selectedMaterial]

  const calculateLocationCost = (locationKey: LocationKey): CostBreakdown => {
    const targetLocation = locationData[locationKey]
    const safeQuantity = Math.max(parsedQuantity, 0)
    const basePrice = materialInfo.basePrice * safeQuantity
    const locationAdjustedPrice = basePrice * targetLocation.baseCostMultiplier

    let transportMultiplier = 1
    if (deliveryUrgency === "express") transportMultiplier = 1.5
    if (deliveryUrgency === "economy") transportMultiplier = 0.8

    const transportCost = targetLocation.transportCost * transportMultiplier
    const laborCost = targetLocation.laborCost
    const permitCost = targetLocation.permitCost

    const totalCost = locationAdjustedPrice + transportCost + laborCost + permitCost

    return {
      basePrice,
      locationAdjustedPrice,
      transportCost,
      laborCost,
      permitCost,
      totalCost,
    }
  }

  const costs = calculateLocationCost(selectedLocation)

  const selectedZoneLabel = useMemo(() => {
    if (!selectedZone) return "Not selected"
    return (
      locationInfo.zones.find((zone) => zone.toLowerCase().replace(/\s+/g, "-") === selectedZone) || "Unknown Zone"
    )
  }, [locationInfo.zones, selectedZone])

  const getDetailedQuote = () => {
    if (parsedQuantity <= 0) {
      setActionMessage("Please enter a valid quantity before generating a detailed quote.")
      return
    }

    const quote = {
      id: `LOCQ-${Date.now()}`,
      location: locationInfo.name,
      zone: selectedZoneLabel,
      material: selectedMaterial,
      quantity: parsedQuantity,
      unit: materialInfo.unit,
      urgency: deliveryUrgency,
      costs,
      createdAt: new Date().toISOString(),
    }

    downloadPdfDocument({
      filename: `location-quote-${locationInfo.name.toLowerCase()}-${selectedMaterial.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      title: "BricksBazar Location Quote",
      subtitle: `${quote.location} | ${quote.material}`,
      meta: [
        `Zone: ${quote.zone}`,
        `Quantity: ${quote.quantity.toLocaleString()} (${quote.unit})`,
        `Delivery Urgency: ${quote.urgency}`,
      ],
      sections: [
        {
          heading: "Cost Breakdown",
          lines: [
            `Base Cost: Rs. ${Math.round(quote.costs.basePrice).toLocaleString()}`,
            `Location Adjusted: Rs. ${Math.round(quote.costs.locationAdjustedPrice).toLocaleString()}`,
            `Transport: Rs. ${Math.round(quote.costs.transportCost).toLocaleString()}`,
            `Labor: Rs. ${Math.round(quote.costs.laborCost).toLocaleString()}`,
            `Permits: Rs. ${Math.round(quote.costs.permitCost).toLocaleString()}`,
            `Total: Rs. ${Math.round(quote.costs.totalCost).toLocaleString()}`,
          ],
        },
      ],
    })

    try {
      const raw = window.localStorage.getItem("bb_location_quotes_v1")
      const history = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : []
      window.localStorage.setItem("bb_location_quotes_v1", JSON.stringify([quote, ...history]))
    } catch {
      // Ignore local storage failures.
    }

    setActionMessage("Detailed quote PDF generated and downloaded successfully.")
  }

  const compareWithOtherLocations = () => {
    if (parsedQuantity <= 0) {
      setActionMessage("Please enter a valid quantity before comparing locations.")
      return
    }

    const rows = (Object.keys(locationData) as LocationKey[])
      .map((locationKey) => {
        const localCosts = calculateLocationCost(locationKey)
        return {
          locationKey,
          location: locationData[locationKey].name,
          totalCost: localCosts.totalCost,
          transportCost: localCosts.transportCost,
          nearbySuppliers: locationData[locationKey].nearbySuppliers,
        }
      })
      .sort((a, b) => a.totalCost - b.totalCost)

    setComparisonRows(rows)
    setActionMessage(`Compared ${rows.length} locations successfully. Best value: ${rows[0]?.location}.`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Enhanced Location-Based Costing
        </CardTitle>
        <CardDescription>
          Precise cost calculation with location-specific factors and real-time adjustments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Location</label>
            <Select value={selectedLocation} onValueChange={(value) => setSelectedLocation(value as LocationKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mumbai">Mumbai</SelectItem>
                <SelectItem value="delhi">Delhi</SelectItem>
                <SelectItem value="bangalore">Bangalore</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Zone</label>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger>
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                {locationInfo.zones.map((zone) => {
                  const zoneKey = zone.toLowerCase().replace(/\s+/g, "-")
                  return (
                    <SelectItem key={zoneKey} value={zoneKey}>
                      {zone}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Material</label>
            <Select value={selectedMaterial} onValueChange={(value) => setSelectedMaterial(value as MaterialKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(materialPrices).map((material) => (
                  <SelectItem key={material} value={material}>
                    {material}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Quantity</label>
            <Input
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Enter quantity"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Calculator className="h-4 w-4" />
                <span className="text-sm font-medium">Base Cost</span>
              </div>
              <p className="text-2xl font-bold">Rs. {Math.round(costs.basePrice).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">material only</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Location Adjusted</span>
              </div>
              <p className="text-2xl font-bold">Rs. {Math.round(costs.locationAdjustedPrice).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                {((locationInfo.baseCostMultiplier - 1) * 100).toFixed(0)}% adjustment
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600">
                <Truck className="h-4 w-4" />
                <span className="text-sm font-medium">Transport Cost</span>
              </div>
              <p className="text-2xl font-bold">Rs. {Math.round(costs.transportCost).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{deliveryUrgency} delivery</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Total Cost</span>
              </div>
              <p className="text-2xl font-bold">Rs. {Math.round(costs.totalCost).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">all inclusive</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Nearby Suppliers:</span>
                  <Badge variant="outline">{locationInfo.nearbySuppliers} suppliers</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Distance:</span>
                  <span className="font-medium">{locationInfo.averageDistance} km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Labor Rate:</span>
                  <span className="font-medium">Rs. {locationInfo.laborCost}/day</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Permit Cost:</span>
                  <span className="font-medium">Rs. {locationInfo.permitCost}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Selected Zone:</span>
                  <span className="font-medium">{selectedZoneLabel}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Location Benefits</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>High supplier density in this area</li>
                  <li>Good transport connectivity</li>
                  <li>Competitive local pricing</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Material Cost:</span>
                  <span className="font-medium">Rs. {Math.round(costs.locationAdjustedPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Transport & Delivery:</span>
                  <span className="font-medium">Rs. {Math.round(costs.transportCost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Labor Charges:</span>
                  <span className="font-medium">Rs. {Math.round(costs.laborCost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Permits & Fees:</span>
                  <span className="font-medium">Rs. {Math.round(costs.permitCost).toLocaleString()}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center font-bold">
                    <span>Total Cost:</span>
                    <span>Rs. {Math.round(costs.totalCost).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Delivery Urgency</label>
                <Select value={deliveryUrgency} onValueChange={setDeliveryUrgency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="express">Express (+50% transport cost)</SelectItem>
                    <SelectItem value="standard">Standard (normal cost)</SelectItem>
                    <SelectItem value="economy">Economy (-20% transport cost)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {locationInfo.baseCostMultiplier > 1.1 ? (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900">High Cost Location Alert</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  This location has higher than average costs. Consider nearby areas or bulk ordering to optimize
                  expenses.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button className="flex-1" onClick={getDetailedQuote}>
            Get Detailed Quote
          </Button>
          <Button variant="outline" className="flex-1 bg-transparent" onClick={compareWithOtherLocations}>
            Compare with Other Locations
          </Button>
        </div>

        {actionMessage ? <div className="rounded-md border p-3 text-sm text-muted-foreground">{actionMessage}</div> : null}

        {comparisonRows.length > 0 ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">Location Comparison</p>
            <div className="space-y-2 text-sm">
              {comparisonRows.map((row, index) => (
                <div key={row.locationKey} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <p className="font-medium">
                      {index === 0 ? "Best Value: " : ""}
                      {row.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Transport Rs. {Math.round(row.transportCost).toLocaleString()} | {row.nearbySuppliers} suppliers
                    </p>
                  </div>
                  <p className="font-semibold">Rs. {Math.round(row.totalCost).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
