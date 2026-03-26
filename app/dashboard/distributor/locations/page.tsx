"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Plus, Edit, Trash2, Clock, CheckCircle, Search, Loader2, RefreshCw } from "lucide-react"

type LocationStatus = "active" | "maintenance" | "inactive"

type LocationRecord = {
  id: string
  name: string
  address: string
  radiusKm: number
  status: LocationStatus
  deliveryTime: string
}

type ApiOrder = {
  id: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
}

const STORAGE_KEY = "bb_distributor_locations_v1"

const defaultLocations: LocationRecord[] = [
  {
    id: "loc-1",
    name: "Downtown District",
    address: "123 Main Street, Downtown",
    radiusKm: 15,
    status: "active",
    deliveryTime: "2-4 hours",
  },
  {
    id: "loc-2",
    name: "Industrial Zone",
    address: "456 Industrial Ave, Zone B",
    radiusKm: 25,
    status: "active",
    deliveryTime: "4-6 hours",
  },
  {
    id: "loc-3",
    name: "North Side",
    address: "789 North Road, Sector 5",
    radiusKm: 20,
    status: "maintenance",
    deliveryTime: "6-8 hours",
  },
]

function hashValue(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return hash
}

function assignLocation(orderId: string, locationsLength: number) {
  if (locationsLength === 0) return -1
  return hashValue(orderId) % locationsLength
}

export default function LocationManagementPage() {
  const [locations, setLocations] = useState<LocationRecord[]>(defaultLocations)
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    address: "",
    radiusKm: "",
    deliveryTime: "",
    status: "active" as LocationStatus,
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as LocationRecord[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocations(parsed)
        }
      }
    } catch {
      // ignore parse/storage errors
    }
  }, [])

  const persistLocations = (nextLocations: LocationRecord[]) => {
    setLocations(nextLocations)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLocations))
    }
  }

  const loadOrders = async () => {
    try {
      const response = await fetch("/api/orders", { credentials: "include", cache: "no-store" })
      const payload = (await response.json()) as { orders?: ApiOrder[]; error?: string }
      if (!response.ok || !payload.orders) {
        throw new Error(payload.error || "Could not load location analytics")
      }
      setOrders(payload.orders)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load location analytics")
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const metricsByLocation = useMemo(() => {
    const map = new Map<string, { activeOrders: number; totalDeliveries: number }>()
    for (const location of locations) {
      map.set(location.id, { activeOrders: 0, totalDeliveries: 0 })
    }

    orders.forEach((order) => {
      const index = assignLocation(order.id, locations.length)
      if (index < 0) return
      const location = locations[index]
      const metrics = map.get(location.id)
      if (!metrics) return

      if (order.status === "confirmed" || order.status === "shipped") {
        metrics.activeOrders += 1
      }
      if (order.status === "delivered") {
        metrics.totalDeliveries += 1
      }
    })

    return map
  }, [orders, locations])

  const visibleLocations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return locations
    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(q) ||
        location.address.toLowerCase().includes(q) ||
        location.status.toLowerCase().includes(q),
    )
  }, [locations, query])

  const totals = useMemo(() => {
    let activeOrders = 0
    let delivered = 0
    locations.forEach((location) => {
      const metrics = metricsByLocation.get(location.id)
      if (metrics) {
        activeOrders += metrics.activeOrders
        delivered += metrics.totalDeliveries
      }
    })

    return {
      activeAreas: locations.filter((location) => location.status === "active").length,
      activeOrders,
      delivered,
    }
  }, [locations, metricsByLocation])

  const resetForm = () => {
    setForm({ name: "", address: "", radiusKm: "", deliveryTime: "", status: "active" })
    setEditingLocationId(null)
    setShowForm(false)
  }

  const openAddForm = () => {
    setEditingLocationId(null)
    setForm({ name: "", address: "", radiusKm: "", deliveryTime: "", status: "active" })
    setShowForm(true)
  }

  const openEditForm = (location: LocationRecord) => {
    setEditingLocationId(location.id)
    setForm({
      name: location.name,
      address: location.address,
      radiusKm: String(location.radiusKm),
      deliveryTime: location.deliveryTime,
      status: location.status,
    })
    setShowForm(true)
  }

  const handleSaveLocation = (event: React.FormEvent) => {
    event.preventDefault()
    const radiusKm = Number(form.radiusKm)
    if (!form.name.trim() || !form.address.trim() || !form.deliveryTime.trim() || !Number.isFinite(radiusKm) || radiusKm <= 0) {
      setError("Please enter valid location details")
      return
    }

    const normalized: LocationRecord = {
      id: editingLocationId || crypto.randomUUID(),
      name: form.name.trim(),
      address: form.address.trim(),
      radiusKm,
      deliveryTime: form.deliveryTime.trim(),
      status: form.status,
    }

    if (editingLocationId) {
      const next = locations.map((location) => (location.id === editingLocationId ? normalized : location))
      persistLocations(next)
    } else {
      persistLocations([normalized, ...locations])
    }

    setError("")
    resetForm()
  }

  const removeLocation = (locationId: string) => {
    const next = locations.filter((location) => location.id !== locationId)
    persistLocations(next)
  }

  const toggleStatus = (locationId: string) => {
    const next = locations.map((location) => {
      if (location.id !== locationId) return location
      const status: LocationStatus =
        location.status === "active" ? "maintenance" : location.status === "maintenance" ? "inactive" : "active"
      return { ...location, status }
    })
    persistLocations(next)
  }

  const getStatusBadge = (status: LocationStatus) => {
    if (status === "active") return <Badge className="bg-green-500">Active</Badge>
    if (status === "maintenance") return <Badge className="bg-yellow-500 text-black">Maintenance</Badge>
    return <Badge variant="destructive">Inactive</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Location Management</h1>
          <p className="text-muted-foreground">Manage service zones with live performance insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadOrders} className="bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Metrics
          </Button>
          <Button onClick={openAddForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground">Service areas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Areas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totals.activeAreas}</div>
            <p className="text-xs text-muted-foreground">Currently serving</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totals.activeOrders}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.delivered}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Locations</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by location name, address, or status"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardHeader>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingLocationId ? "Edit Location" : "Add New Service Location"}</CardTitle>
            <CardDescription>Define area radius, service time and operational status</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="e.g., Downtown District"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radius">Service Radius (km)</Label>
                  <Input
                    id="radius"
                    type="number"
                    min="1"
                    value={form.radiusKm}
                    onChange={(event) => setForm((prev) => ({ ...prev, radiusKm: event.target.value }))}
                    placeholder="e.g., 15"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Full area address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Estimated Delivery Time</Label>
                  <Input
                    id="deliveryTime"
                    value={form.deliveryTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, deliveryTime: event.target.value }))}
                    placeholder="e.g., 2-4 hours"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(value: LocationStatus) => setForm((prev) => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">{editingLocationId ? "Save Changes" : "Add Location"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Service Locations</CardTitle>
          <CardDescription>Manage zone status and review live workload by location</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="py-10 text-muted-foreground flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading location analytics...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Service Radius</TableHead>
                  <TableHead>Delivery Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active Orders</TableHead>
                  <TableHead>Total Deliveries</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLocations.map((location) => {
                  const metrics = metricsByLocation.get(location.id) || { activeOrders: 0, totalDeliveries: 0 }

                  return (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.address}</TableCell>
                      <TableCell>{location.radiusKm} km</TableCell>
                      <TableCell>{location.deliveryTime}</TableCell>
                      <TableCell>{getStatusBadge(location.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{metrics.activeOrders}</Badge>
                      </TableCell>
                      <TableCell>{metrics.totalDeliveries}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditForm(location)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleStatus(location.id)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeLocation(location.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {!loadingOrders && visibleLocations.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">No locations match your search.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
