"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OrderChatPanel } from "@/components/chat/order-chat-panel"
import { Search, MapPin, Clock, Package, Phone, MessageSquare, Navigation, Loader2, LocateFixed, KeyRound, Copy } from "lucide-react"

type DeliveryStatus = "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"
type DeliveryAlertSeverity = "info" | "warning" | "critical"

type DeliveryAlert = {
  code: "assignment_missing" | "delay_risk" | "stale_location" | "route_deviation"
  severity: DeliveryAlertSeverity
  title: string
  message: string
}

type DeliveryRecord = {
  id: string
  orderId: string
  orderNumber: string
  orderStatus: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  trackingNumber: string | null
  firstItemName: string
  totalQuantity: number
  orderTotal: number
  buyerName: string
  sellerName: string
  distributorName: string
  pickupAddress: string
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

type DeliveryProof = {
  id: string
  deliveryId: string
  otpVerified: boolean
  podImageUrl?: string
  podNote?: string
  receivedBy?: string
  deliveredAt: string
  createdAt: string
}

type DeliveryAssignmentDraft = {
  vehicleNumber: string
  vehicleType: string
  driverName: string
  driverPhone: string
}

type DeliveryLocationDraft = {
  lat: string
  lng: string
  speedKph: string
  heading: string
  address: string
}

type DriverTokenData = {
  token: string
  expiresAt: string
}

function cleanPhoneForTel(value: string) {
  return value.replace(/[^0-9+]/g, "")
}

function getProgress(status: DeliveryStatus) {
  if (status === "pickup_ready") return 20
  if (status === "in_transit") return 70
  if (status === "nearby") return 90
  if (status === "delivered") return 100
  return 0
}

function getEstimatedTime(status: DeliveryStatus, etaMinutes: number) {
  if (status === "delivered") return "Completed"
  if (status === "cancelled") return "Cancelled"
  if (etaMinutes <= 0) return "Calculating"
  return `${etaMinutes} mins`
}

function getPriority(orderTotal: number): "high" | "medium" | "low" {
  if (orderTotal >= 50000) return "high"
  if (orderTotal >= 20000) return "medium"
  return "low"
}

function defaultAssignmentFromDelivery(delivery: DeliveryRecord): DeliveryAssignmentDraft {
  return {
    vehicleNumber: delivery.vehicleNumber === "Not Assigned" ? "" : delivery.vehicleNumber,
    vehicleType: delivery.vehicleType || "Truck",
    driverName: delivery.driverName === "Not Assigned" ? "" : delivery.driverName,
    driverPhone: delivery.driverPhone,
  }
}

function isAssignmentReady(draft: DeliveryAssignmentDraft) {
  return draft.vehicleNumber.trim().length > 0 && draft.driverName.trim().length > 0 && draft.driverPhone.trim().length >= 7
}

function defaultLocationDraft(delivery: DeliveryRecord): DeliveryLocationDraft {
  return {
    lat: delivery.currentLat !== undefined ? String(delivery.currentLat) : "",
    lng: delivery.currentLng !== undefined ? String(delivery.currentLng) : "",
    speedKph: delivery.status === "in_transit" ? "40" : "0",
    heading: "0",
    address: delivery.currentAddress || delivery.deliveryAddress,
  }
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [streamConnected, setStreamConnected] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedPriority, setSelectedPriority] = useState("all")
  const [updatingDeliveryId, setUpdatingDeliveryId] = useState<string | null>(null)
  const [issuingOtpDeliveryId, setIssuingOtpDeliveryId] = useState<string | null>(null)
  const [alertsByDeliveryId, setAlertsByDeliveryId] = useState<Record<string, DeliveryAlert[]>>({})
  const [otpByDeliveryId, setOtpByDeliveryId] = useState<Record<string, string>>({})
  const [podNoteByDeliveryId, setPodNoteByDeliveryId] = useState<Record<string, string>>({})
  const [podImageUrlByDeliveryId, setPodImageUrlByDeliveryId] = useState<Record<string, string>>({})
  const [receivedByDeliveryId, setReceivedByDeliveryId] = useState<Record<string, string>>({})
  const [assignmentByDeliveryId, setAssignmentByDeliveryId] = useState<Record<string, DeliveryAssignmentDraft>>({})
  const [locationDraftByDeliveryId, setLocationDraftByDeliveryId] = useState<Record<string, DeliveryLocationDraft>>({})
  const [savingAssignmentDeliveryId, setSavingAssignmentDeliveryId] = useState<string | null>(null)
  const [generatingDriverTokenDeliveryId, setGeneratingDriverTokenDeliveryId] = useState<string | null>(null)
  const [copiedDriverTokenDeliveryId, setCopiedDriverTokenDeliveryId] = useState<string | null>(null)
  const [driverTokenByDeliveryId, setDriverTokenByDeliveryId] = useState<Record<string, DriverTokenData>>({})
  const [uploadingPodDeliveryId, setUploadingPodDeliveryId] = useState<string | null>(null)
  const [chatOrderId, setChatOrderId] = useState<string | null>(null)
  const [chatOrderNumber, setChatOrderNumber] = useState("")

  const loadDeliveries = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }

    try {
      const response = await fetch("/api/deliveries", { credentials: "include", cache: "no-store" })
      const payload = (await response.json()) as { deliveries?: DeliveryRecord[]; error?: string }
      if (!response.ok || !payload.deliveries) {
        throw new Error(payload.error || "Could not load deliveries")
      }
      setDeliveries(payload.deliveries)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load deliveries")
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
        // Ignore malformed stream chunk and keep previous state.
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

  useEffect(() => {
    if (deliveries.length === 0) {
      setAlertsByDeliveryId({})
      return
    }

    let cancelled = false
    const loadAlerts = async () => {
      const entries = await Promise.all(
        deliveries.map(async (delivery) => {
          try {
            const response = await fetch(`/api/deliveries/${delivery.id}/alerts`, {
              credentials: "include",
              cache: "no-store",
            })
            const payload = (await response.json()) as { alerts?: DeliveryAlert[] }
            if (!response.ok) {
              return [delivery.id, []] as const
            }
            return [delivery.id, payload.alerts || []] as const
          } catch {
            return [delivery.id, []] as const
          }
        }),
      )
      if (!cancelled) {
        setAlertsByDeliveryId(Object.fromEntries(entries))
      }
    }

    void loadAlerts()

    return () => {
      cancelled = true
    }
  }, [deliveries])

  useEffect(() => {
    if (deliveries.length === 0) {
      setAssignmentByDeliveryId({})
      setLocationDraftByDeliveryId({})
      return
    }

    setAssignmentByDeliveryId((current) => {
      const next: Record<string, DeliveryAssignmentDraft> = {}
      for (const delivery of deliveries) {
        next[delivery.id] = current[delivery.id] || defaultAssignmentFromDelivery(delivery)
      }
      return next
    })

    setLocationDraftByDeliveryId((current) => {
      const next: Record<string, DeliveryLocationDraft> = {}
      for (const delivery of deliveries) {
        next[delivery.id] = current[delivery.id] || defaultLocationDraft(delivery)
      }
      return next
    })
  }, [deliveries])

  const filteredDeliveries = useMemo(
    () =>
      deliveries.filter((delivery) => {
        const priority = getPriority(delivery.orderTotal)
        const matchesSearch =
          delivery.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.firstItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = selectedStatus === "all" || delivery.status === selectedStatus
        const matchesPriority = selectedPriority === "all" || priority === selectedPriority
        return matchesSearch && matchesStatus && matchesPriority
      }),
    [deliveries, searchTerm, selectedStatus, selectedPriority],
  )

  const updateStatus = async (delivery: DeliveryRecord, status: DeliveryStatus) => {
    setUpdatingDeliveryId(delivery.id)
    setActionMessage("")
    try {
      const body: {
        status: DeliveryStatus
        otpCode?: string
        podImageUrl?: string
        podNote?: string
        receivedBy?: string
      } = { status }

      if (status === "delivered") {
        const otpCode = (otpByDeliveryId[delivery.id] || "").trim()
        if (otpCode.length !== 6) {
          throw new Error("6-digit OTP required before marking as delivered")
        }
        body.otpCode = otpCode
        const podImageUrl = (podImageUrlByDeliveryId[delivery.id] || "").trim()
        const podNote = (podNoteByDeliveryId[delivery.id] || "").trim()
        const receivedBy = (receivedByDeliveryId[delivery.id] || "").trim()
        if (podImageUrl) body.podImageUrl = podImageUrl
        if (podNote) body.podNote = podNote
        if (receivedBy) body.receivedBy = receivedBy
      }

      const response = await fetch(`/api/deliveries/${delivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as { proof?: DeliveryProof | null; alerts?: DeliveryAlert[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Could not update delivery")
      }
      if (payload.alerts) {
        setAlertsByDeliveryId((current) => ({ ...current, [delivery.id]: payload.alerts || [] }))
      }
      if (status === "delivered") {
        setOtpByDeliveryId((current) => ({ ...current, [delivery.id]: "" }))
        setPodNoteByDeliveryId((current) => ({ ...current, [delivery.id]: "" }))
        setPodImageUrlByDeliveryId((current) => ({ ...current, [delivery.id]: "" }))
        setReceivedByDeliveryId((current) => ({ ...current, [delivery.id]: "" }))
      }
      setActionMessage("Delivery status updated successfully.")
      await loadDeliveries(true)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update delivery")
    } finally {
      setUpdatingDeliveryId(null)
    }
  }

  const issueOtp = async (deliveryId: string) => {
    setIssuingOtpDeliveryId(deliveryId)
    setActionMessage("")
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ expiresInMinutes: 30 }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Could not generate OTP")
      }
      setActionMessage("Delivery OTP generated and shared with buyer.")
    } catch (otpError) {
      setError(otpError instanceof Error ? otpError.message : "Could not generate OTP")
    } finally {
      setIssuingOtpDeliveryId(null)
    }
  }

  const updateAssignmentField = (
    deliveryId: string,
    key: keyof DeliveryAssignmentDraft,
    value: string,
  ) => {
    setAssignmentByDeliveryId((current) => ({
      ...current,
      [deliveryId]: {
        ...(current[deliveryId] || { vehicleNumber: "", vehicleType: "Truck", driverName: "", driverPhone: "" }),
        [key]: value,
      },
    }))
  }

  const updateLocationField = (deliveryId: string, key: keyof DeliveryLocationDraft, value: string) => {
    setLocationDraftByDeliveryId((current) => ({
      ...current,
      [deliveryId]: {
        ...(current[deliveryId] || { lat: "", lng: "", speedKph: "0", heading: "0", address: "" }),
        [key]: value,
      },
    }))
  }

  const uploadPodImage = async (deliveryId: string, file: File | null) => {
    if (!file) {
      setError("Select POD image file first")
      return
    }

    setUploadingPodDeliveryId(deliveryId)
    setActionMessage("")
    try {
      const formData = new FormData()
      formData.set("image", file)

      const response = await fetch(`/api/deliveries/${deliveryId}/proof-upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const payload = (await response.json()) as { podImageUrl?: string; error?: string }
      if (!response.ok || !payload.podImageUrl) {
        throw new Error(payload.error || "Could not upload POD image")
      }

      setPodImageUrlByDeliveryId((current) => ({ ...current, [deliveryId]: payload.podImageUrl! }))
      setActionMessage("POD image uploaded successfully.")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload POD image")
    } finally {
      setUploadingPodDeliveryId(null)
    }
  }

  const saveAssignment = async (delivery: DeliveryRecord) => {
    setSavingAssignmentDeliveryId(delivery.id)
    setActionMessage("")
    setError("")

    try {
      const draft = assignmentByDeliveryId[delivery.id] || defaultAssignmentFromDelivery(delivery)
      const payload = {
        vehicleNumber: draft.vehicleNumber.trim(),
        vehicleType: draft.vehicleType.trim() || "Truck",
        driverName: draft.driverName.trim(),
        driverPhone: draft.driverPhone.trim(),
      }

      if (!isAssignmentReady(payload)) {
        throw new Error("Vehicle number, driver name, and valid driver phone are required")
      }

      const response = await fetch(`/api/deliveries/${delivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "Could not save assignment")
      }

      setActionMessage(`Assignment saved for ${delivery.orderNumber}`)
      await loadDeliveries(true)
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Could not save assignment")
    } finally {
      setSavingAssignmentDeliveryId(null)
    }
  }

  const generateDriverToken = async (delivery: DeliveryRecord) => {
    setGeneratingDriverTokenDeliveryId(delivery.id)
    setActionMessage("")
    setError("")
    try {
      const response = await fetch(`/api/deliveries/${delivery.id}/driver-token`, {
        credentials: "include",
        cache: "no-store",
      })
      const payload = (await response.json()) as { token?: string; expiresAt?: string; error?: string }
      if (!response.ok || !payload.token || !payload.expiresAt) {
        throw new Error(payload.error || "Could not generate driver tracking token")
      }

      setDriverTokenByDeliveryId((current) => ({
        ...current,
        [delivery.id]: { token: payload.token!, expiresAt: payload.expiresAt! },
      }))
      setCopiedDriverTokenDeliveryId(null)
      setActionMessage(`Driver token generated for ${delivery.orderNumber}.`)
    } catch (tokenError) {
      setError(tokenError instanceof Error ? tokenError.message : "Could not generate driver tracking token")
    } finally {
      setGeneratingDriverTokenDeliveryId(null)
    }
  }

  const copyDriverToken = async (delivery: DeliveryRecord) => {
    const driverToken = driverTokenByDeliveryId[delivery.id]?.token
    if (!driverToken) {
      setError("Generate driver token first")
      return
    }

    try {
      await navigator.clipboard.writeText(driverToken)
      setCopiedDriverTokenDeliveryId(delivery.id)
      setActionMessage(`Driver token copied for ${delivery.orderNumber}.`)
      window.setTimeout(() => {
        setCopiedDriverTokenDeliveryId((current) => (current === delivery.id ? null : current))
      }, 1200)
    } catch {
      setError("Could not copy driver token. Please copy manually.")
    }
  }

  const pushLivePing = async (delivery: DeliveryRecord) => {
    const draft = locationDraftByDeliveryId[delivery.id] || defaultLocationDraft(delivery)
    const lat = Number.parseFloat(draft.lat)
    const lng = Number.parseFloat(draft.lng)
    const speedKph = Number.parseFloat(draft.speedKph || "0")
    const heading = Number.parseFloat(draft.heading || "0")
    const address = draft.address.trim() || delivery.currentAddress || delivery.deliveryAddress

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError("Enter valid latitude/longitude before sharing live ping")
      return
    }

    try {
      const response = await fetch(`/api/deliveries/${delivery.id}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lat,
          lng,
          address,
          speedKph: Number.isFinite(speedKph) ? speedKph : 0,
          heading: Number.isFinite(heading) ? heading : 0,
          status: delivery.status,
        }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Could not push location update")
      }
      setActionMessage(`Live location ping saved for ${delivery.orderNumber}.`)
      await loadDeliveries(true)
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "Could not push location update")
    }
  }

  const openNavigation = (delivery: DeliveryRecord) => {
    const destination = delivery.deliveryAddress
    const source = delivery.currentLat !== undefined && delivery.currentLng !== undefined
      ? `${delivery.currentLat},${delivery.currentLng}`
      : delivery.currentAddress || delivery.pickupAddress

    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const callDriver = (contact: string) => {
    if (!contact.trim()) {
      setActionMessage("Driver phone not assigned yet.")
      return
    }
    window.location.href = `tel:${cleanPhoneForTel(contact)}`
  }

  const messageCustomer = (delivery: DeliveryRecord) => {
    const text = encodeURIComponent(
      `Hi ${delivery.buyerName}, your order ${delivery.orderNumber} is ${delivery.status.replace("_", " ")}. ETA: ${getEstimatedTime(delivery.status, delivery.etaMinutes)}.`,
    )
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer")
  }

  const getStatusColor = (status: DeliveryStatus) => {
    if (status === "pickup_ready") return "outline" as const
    if (status === "in_transit" || status === "nearby") return "default" as const
    if (status === "delivered") return "default" as const
    return "secondary" as const
  }

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    if (priority === "high") return "destructive" as const
    if (priority === "medium") return "secondary" as const
    return "outline" as const
  }

  const getAlertVariant = (severity: DeliveryAlertSeverity) => {
    if (severity === "critical") return "destructive" as const
    if (severity === "warning") return "secondary" as const
    return "outline" as const
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-bold">Delivery Management</h1>
          <Badge variant={streamConnected ? "default" : "secondary"}>
            {streamConnected ? "Live Stream On" : "Live Stream Reconnecting"}
          </Badge>
        </div>
        <p className="text-muted-foreground">Track and manage all your delivery operations</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { key: "pickup_ready", label: "Ready for Pickup" },
          { key: "in_transit", label: "In Transit" },
          { key: "nearby", label: "Nearby" },
          { key: "delivered", label: "Delivered" },
        ].map((status) => {
          const count = deliveries.filter((delivery) => delivery.status === status.key).length
          return (
            <Card key={status.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">{status.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search deliveries, products, or customer..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pickup_ready">Ready for Pickup</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="nearby">Nearby</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-10 text-muted-foreground flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading deliveries...
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDeliveries.map((delivery) => {
            const priority = getPriority(delivery.orderTotal)
            const progress = getProgress(delivery.status)
            const isUpdating = updatingDeliveryId === delivery.id
            const isIssuingOtp = issuingOtpDeliveryId === delivery.id
            const isSavingAssignment = savingAssignmentDeliveryId === delivery.id
            const isGeneratingDriverToken = generatingDriverTokenDeliveryId === delivery.id
            const hasDeliveryEnded = delivery.status === "delivered" || delivery.status === "cancelled"
            const driverTokenState = driverTokenByDeliveryId[delivery.id]
            const alerts = alertsByDeliveryId[delivery.id] || []
            const assignmentDraft = assignmentByDeliveryId[delivery.id] || defaultAssignmentFromDelivery(delivery)
            const assignmentReady = isAssignmentReady(assignmentDraft)

            return (
              <Card key={delivery.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{delivery.orderNumber}</h3>
                        <Badge variant={getStatusColor(delivery.status)}>{delivery.status.replace("_", " ")}</Badge>
                        <Badge variant={getPriorityColor(priority)}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {delivery.firstItemName} ({delivery.totalQuantity} units) | Tracking: {delivery.trackingNumber || "Not assigned"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">Rs. {Math.round(delivery.orderTotal * 0.03).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">ETA: {getEstimatedTime(delivery.status, delivery.etaMinutes)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Pickup
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{delivery.sellerName}</p>
                        <p className="text-muted-foreground">{delivery.pickupAddress}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Delivery
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{delivery.buyerName}</p>
                        <p className="text-muted-foreground">{delivery.deliveryAddress}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 text-sm">
                    <div className="p-2 border rounded">
                      <p className="text-muted-foreground">Vehicle</p>
                      <p className="font-medium">{delivery.vehicleNumber}</p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="text-muted-foreground">Vehicle Type</p>
                      <p className="font-medium">{delivery.vehicleType}</p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="text-muted-foreground">Driver</p>
                      <p className="font-medium">{delivery.driverName}</p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="text-muted-foreground">Last Location</p>
                      <p className="font-medium">{delivery.currentAddress || "Not shared yet"}</p>
                    </div>
                  </div>

                  <div className="mb-4 border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Order Assignment</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-transparent"
                          disabled={isGeneratingDriverToken || !assignmentReady || hasDeliveryEnded}
                          onClick={() => {
                            void generateDriverToken(delivery)
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                          {isGeneratingDriverToken ? "Generating..." : "Generate Driver Token"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          disabled={isSavingAssignment || hasDeliveryEnded}
                          onClick={() => {
                            void saveAssignment(delivery)
                          }}
                        >
                          {isSavingAssignment ? "Saving..." : "Save Assignment"}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Vehicle number"
                        value={assignmentDraft.vehicleNumber}
                        onChange={(event) => updateAssignmentField(delivery.id, "vehicleNumber", event.target.value.toUpperCase())}
                      />
                      <Input
                        placeholder="Vehicle type"
                        value={assignmentDraft.vehicleType}
                        onChange={(event) => updateAssignmentField(delivery.id, "vehicleType", event.target.value)}
                      />
                      <Input
                        placeholder="Driver name"
                        value={assignmentDraft.driverName}
                        onChange={(event) => updateAssignmentField(delivery.id, "driverName", event.target.value)}
                      />
                      <Input
                        placeholder="Driver phone"
                        value={assignmentDraft.driverPhone}
                        onChange={(event) => updateAssignmentField(delivery.id, "driverPhone", event.target.value.replace(/[^0-9+]/g, ""))}
                      />
                    </div>
                    {!assignmentReady ? (
                      <p className="text-xs text-muted-foreground">
                        Assign vehicle number, driver name, and phone before starting transit.
                      </p>
                    ) : null}
                    {driverTokenState ? (
                      <div className="rounded-md border bg-muted/30 p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            Token valid till {new Date(driverTokenState.expiresAt).toLocaleString()}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 bg-transparent px-2 text-xs"
                            onClick={() => {
                              void copyDriverToken(delivery)
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedDriverTokenDeliveryId === delivery.id ? "Copied" : "Copy"}
                          </Button>
                        </div>
                        <code className="block text-xs break-all rounded border bg-background px-2 py-1">{driverTokenState.token}</code>
                        <p className="text-[11px] text-muted-foreground">Use as `x-driver-tracking-token` header in driver app.</p>
                      </div>
                    ) : null}
                  </div>

                  {delivery.status !== "delivered" && delivery.status !== "cancelled" ? (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Delivery Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  ) : null}

                  {alerts.length > 0 ? (
                    <div className="mb-4 border rounded-lg p-3 space-y-2 bg-muted/30">
                      <p className="text-sm font-medium">Delivery Alerts</p>
                      <div className="space-y-2">
                        {alerts.map((alert) => (
                          <div key={`${delivery.id}-${alert.code}`} className="flex items-start gap-2 text-sm">
                            <Badge variant={getAlertVariant(alert.severity)}>{alert.severity}</Badge>
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="text-muted-foreground">{alert.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(delivery.status === "in_transit" || delivery.status === "nearby") ? (
                    <div className="mb-4 border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Delivery Completion (OTP + POD)</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          disabled={isIssuingOtp}
                          onClick={() => issueOtp(delivery.id)}
                        >
                          {isIssuingOtp ? "Generating OTP..." : "Generate OTP"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Enter 6-digit OTP from buyer"
                          maxLength={6}
                          value={otpByDeliveryId[delivery.id] || ""}
                          onChange={(event) =>
                            setOtpByDeliveryId((current) => ({ ...current, [delivery.id]: event.target.value.replace(/\D/g, "") }))
                          }
                        />
                        <Input
                          placeholder="Received by (person name)"
                          value={receivedByDeliveryId[delivery.id] || ""}
                          onChange={(event) =>
                            setReceivedByDeliveryId((current) => ({ ...current, [delivery.id]: event.target.value }))
                          }
                        />
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null
                              void uploadPodImage(delivery.id, file)
                            }}
                          />
                          {podImageUrlByDeliveryId[delivery.id] ? (
                            <p className="text-xs text-muted-foreground truncate">
                              Uploaded POD: {podImageUrlByDeliveryId[delivery.id]}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Upload PNG/JPG/WEBP (max 5MB)</p>
                          )}
                        </div>
                        <Input
                          placeholder="POD note (optional)"
                          value={podNoteByDeliveryId[delivery.id] || ""}
                          onChange={(event) =>
                            setPodNoteByDeliveryId((current) => ({ ...current, [delivery.id]: event.target.value }))
                          }
                        />
                      </div>
                      {uploadingPodDeliveryId === delivery.id ? (
                        <p className="text-xs text-muted-foreground">Uploading POD...</p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mb-4 border rounded-lg p-3 space-y-3">
                    <p className="text-sm font-medium">Driver GPS Ping</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        placeholder="Latitude"
                        value={(locationDraftByDeliveryId[delivery.id] || defaultLocationDraft(delivery)).lat}
                        onChange={(event) => updateLocationField(delivery.id, "lat", event.target.value)}
                      />
                      <Input
                        placeholder="Longitude"
                        value={(locationDraftByDeliveryId[delivery.id] || defaultLocationDraft(delivery)).lng}
                        onChange={(event) => updateLocationField(delivery.id, "lng", event.target.value)}
                      />
                      <Input
                        placeholder="Address"
                        value={(locationDraftByDeliveryId[delivery.id] || defaultLocationDraft(delivery)).address}
                        onChange={(event) => updateLocationField(delivery.id, "address", event.target.value)}
                      />
                      <Input
                        placeholder="Speed (km/h)"
                        value={(locationDraftByDeliveryId[delivery.id] || defaultLocationDraft(delivery)).speedKph}
                        onChange={(event) => updateLocationField(delivery.id, "speedKph", event.target.value)}
                      />
                      <Input
                        placeholder="Heading (0-360)"
                        value={(locationDraftByDeliveryId[delivery.id] || defaultLocationDraft(delivery)).heading}
                        onChange={(event) => updateLocationField(delivery.id, "heading", event.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use real driver-app GPS data or device feed values. Random location simulation removed.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t flex-wrap">
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => openNavigation(delivery)}>
                      <Navigation className="h-4 w-4" />
                      Navigate
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => callDriver(delivery.driverPhone)}>
                      <Phone className="h-4 w-4" />
                      Call Driver
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => messageCustomer(delivery)}>
                      <MessageSquare className="h-4 w-4" />
                      Message Customer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent"
                      onClick={() => {
                        setChatOrderId(delivery.orderId)
                        setChatOrderNumber(delivery.orderNumber)
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Open Order Chat
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent"
                      disabled={delivery.status === "delivered" || delivery.status === "cancelled"}
                      onClick={() => pushLivePing(delivery)}
                    >
                      <LocateFixed className="h-4 w-4" />
                      Share Live Ping
                    </Button>

                    {delivery.status === "pickup_ready" ? (
                      <Button size="sm" disabled={isUpdating || !assignmentReady} onClick={() => updateStatus(delivery, "in_transit")}>
                        {isUpdating ? "Updating..." : "Start Pickup"}
                      </Button>
                    ) : null}

                    {delivery.status === "in_transit" ? (
                      <Button size="sm" disabled={isUpdating || !assignmentReady} onClick={() => updateStatus(delivery, "nearby")}>
                        {isUpdating ? "Updating..." : "Mark Nearby"}
                      </Button>
                    ) : null}

                    {(delivery.status === "in_transit" || delivery.status === "nearby") ? (
                      <Button size="sm" disabled={isUpdating || !assignmentReady} onClick={() => updateStatus(delivery, "delivered")}>
                        {isUpdating ? "Updating..." : "Mark Delivered"}
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Last update: {new Date(delivery.updatedAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredDeliveries.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No deliveries found for current filters.</div>
          ) : null}
        </div>
      )}

      <Dialog
        open={Boolean(chatOrderId)}
        onOpenChange={(open) => {
          if (!open) {
            setChatOrderId(null)
            setChatOrderNumber("")
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Chat {chatOrderNumber ? `- ${chatOrderNumber}` : ""}</DialogTitle>
            <DialogDescription>Talk to buyer and linked supplier in real time for this order.</DialogDescription>
          </DialogHeader>
          {chatOrderId ? <OrderChatPanel orderId={chatOrderId} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
