"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Clock, CheckCircle, MapPin, Package, User, Calendar, Loader2 } from "lucide-react"

type ApiOrder = {
  id: string
  orderNumber: string
  buyerName: string
  sellerName: string
  total: number
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  date: string
  estimatedDelivery: string
  deliveryAddress?: string
  distributorName?: string
  vehicleType?: string
  items: Array<{ productName: string; quantity: number }>
}

type RequestStatus = "pending" | "accepted" | "in-progress" | "completed" | "rejected"

type RequestRecord = {
  id: string
  orderId: string
  type: string
  from: string
  fromType: "buyer" | "seller"
  product: string
  quantity: string
  location: string
  urgency: "Low" | "Medium" | "High" | "Critical"
  status: RequestStatus
  requestDate: string
  deadline: string
  estimatedValue: string
  preferredDistributorName?: string
  preferredVehicleType?: string
}

type PlanningDraft = {
  estimatedDelivery: string
  distributorName: string
  vehicleType: string
  vehicleNumber: string
  driverName: string
  driverPhone: string
}

function toRequestStatus(status: ApiOrder["status"]): RequestStatus {
  if (status === "cancelled") return "rejected"
  if (status === "delivered") return "completed"
  if (status === "shipped") return "in-progress"
  if (status === "confirmed") return "accepted"
  return "pending"
}

function toUrgency(total: number): RequestRecord["urgency"] {
  if (total >= 80000) return "Critical"
  if (total >= 40000) return "High"
  if (total >= 15000) return "Medium"
  return "Low"
}

function toType(total: number): string {
  if (total >= 70000) return "Emergency Supply"
  if (total >= 30000) return "Bulk Order"
  return "Supply Request"
}

function mapOrderToRequest(order: ApiOrder): RequestRecord {
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const leadProduct = order.items[0]?.productName || "Mixed materials"

  return {
    id: order.orderNumber,
    orderId: order.id,
    type: toType(order.total),
    from: order.buyerName,
    fromType: "buyer",
    product: leadProduct,
    quantity: `${totalQuantity} units`,
    location: order.deliveryAddress || `${order.buyerName} site`,
    urgency: toUrgency(order.total),
    status: toRequestStatus(order.status),
    requestDate: new Date(order.date).toLocaleDateString(),
    deadline: new Date(order.estimatedDelivery).toLocaleDateString(),
    estimatedValue: `Rs. ${order.total.toLocaleString()}`,
    preferredDistributorName: order.distributorName,
    preferredVehicleType: order.vehicleType,
  }
}

export default function RequestsPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [planningByOrderId, setPlanningByOrderId] = useState<Record<string, PlanningDraft>>({})

  const loadOrders = async () => {
    setError("")
    try {
      const response = await fetch("/api/orders", { credentials: "include", cache: "no-store" })
      const payload = (await response.json()) as { orders?: ApiOrder[]; error?: string }
      if (!response.ok || !payload.orders) {
        throw new Error(payload.error || "Could not load requests")
      }
      setOrders(payload.orders)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const requests = useMemo(() => orders.map(mapOrderToRequest), [orders])

  const pendingRequests = useMemo(() => requests.filter((request) => request.status === "pending"), [requests])
  const activeRequests = useMemo(
    () => requests.filter((request) => request.status === "accepted" || request.status === "in-progress"),
    [requests],
  )
  const completedRequests = useMemo(() => requests.filter((request) => request.status === "completed"), [requests])

  const estimatedRevenue = useMemo(
    () => requests.reduce((sum, request) => sum + Number(request.estimatedValue.replace(/[^0-9.]/g, "")), 0),
    [requests],
  )

  useEffect(() => {
    if (!orders.length) {
      setPlanningByOrderId({})
      return
    }

    setPlanningByOrderId((current) => {
      const next: Record<string, PlanningDraft> = {}
      for (const order of orders) {
        next[order.id] = current[order.id] || {
          estimatedDelivery: order.estimatedDelivery.slice(0, 10),
          distributorName: order.distributorName || "MP Logistics Dispatch",
          vehicleType: order.vehicleType || "Truck",
          vehicleNumber: "",
          driverName: "",
          driverPhone: "",
        }
      }
      return next
    })
  }, [orders])

  const getStatusBadge = (status: RequestStatus) => {
    if (status === "pending") {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      )
    }
    if (status === "accepted") {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800">
          Accepted
        </Badge>
      )
    }
    if (status === "in-progress") {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          In Progress
        </Badge>
      )
    }
    if (status === "completed") {
      return <Badge className="bg-green-500">Completed</Badge>
    }
    return <Badge variant="destructive">Rejected</Badge>
  }

  const getUrgencyBadge = (urgency: RequestRecord["urgency"]) => {
    if (urgency === "Critical") return <Badge variant="destructive">Critical</Badge>
    if (urgency === "High") {
      return (
        <Badge variant="destructive" className="bg-orange-500">
          High
        </Badge>
      )
    }
    if (urgency === "Medium") {
      return (
        <Badge variant="secondary" className="bg-yellow-500 text-black">
          Medium
        </Badge>
      )
    }
    return <Badge variant="secondary">Low</Badge>
  }

  const updatePlanningField = (orderId: string, key: keyof PlanningDraft, value: string) => {
    setPlanningByOrderId((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] || {
          estimatedDelivery: "",
          distributorName: "MP Logistics Dispatch",
          vehicleType: "Truck",
          vehicleNumber: "",
          driverName: "",
          driverPhone: "",
        }),
        [key]: value,
      },
    }))
  }

  const updateOrder = async (
    orderId: string,
    requestBody: {
      status: "confirmed" | "shipped" | "cancelled" | "delivered"
      estimatedDelivery?: string
      distributorName?: string
      vehicleType?: string
      vehicleNumber?: string
      driverName?: string
      driverPhone?: string
    },
  ) => {
    setUpdatingId(orderId)
    setError("")
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      })
      const responsePayload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(responsePayload.error || "Could not update request")
      }
      await loadOrders()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update request")
    } finally {
      setUpdatingId(null)
    }
  }

  const renderActionButtons = (request: RequestRecord) => {
    const disabled = updatingId === request.orderId
    const planning = planningByOrderId[request.orderId]
    const hasPlanningReady =
      Boolean(planning?.estimatedDelivery) &&
      Boolean(planning?.distributorName?.trim()) &&
      Boolean(planning?.vehicleType?.trim()) &&
      Boolean(planning?.vehicleNumber?.trim()) &&
      Boolean(planning?.driverName?.trim()) &&
      Boolean(planning?.driverPhone?.trim())

    if (request.status === "pending") {
      return (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() =>
              updateOrder(request.orderId, {
                status: "confirmed",
                estimatedDelivery: planning?.estimatedDelivery
                  ? new Date(`${planning.estimatedDelivery}T09:00:00+05:30`).toISOString()
                  : undefined,
                distributorName: planning?.distributorName,
                vehicleType: planning?.vehicleType,
                vehicleNumber: planning?.vehicleNumber,
                driverName: planning?.driverName,
                driverPhone: planning?.driverPhone,
              })
            }
            disabled={disabled || !hasPlanningReady}
          >
            {disabled ? "Updating..." : "Accept"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateOrder(request.orderId, { status: "cancelled" })}
            disabled={disabled}
          >
            Decline
          </Button>
        </div>
      )
    }

    if (request.status === "accepted") {
      return (
        <Button size="sm" onClick={() => updateOrder(request.orderId, { status: "shipped" })} disabled={disabled}>
          {disabled ? "Updating..." : "Start Dispatch"}
        </Button>
      )
    }

    if (request.status === "in-progress") {
      return (
        <Button size="sm" onClick={() => updateOrder(request.orderId, { status: "delivered" })} disabled={disabled}>
          {disabled ? "Updating..." : "Mark Completed"}
        </Button>
      )
    }

    return <span className="text-xs text-muted-foreground">No actions</span>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supply Requests</h1>
        <p className="text-muted-foreground">Manage incoming supply requests from buyers and sellers</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">All time requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeRequests.length}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {estimatedRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Estimated value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Supply Requests</CardTitle>
              <CardDescription>Complete list of supply requests from buyers and sellers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-muted-foreground flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading requests...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{request.from}</div>
                              <div className="text-xs text-muted-foreground capitalize">{request.fromType}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.product}</div>
                            <div className="text-xs text-muted-foreground">{request.quantity}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {request.location}
                          </div>
                        </TableCell>
                        <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="font-medium">{request.estimatedValue}</TableCell>
                        <TableCell>{renderActionButtons(request)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Requests
              </CardTitle>
              <CardDescription>Requests awaiting your response</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-6">
                      {(() => {
                        const planning = planningByOrderId[request.orderId]
                        return (
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{request.id}</Badge>
                            {getUrgencyBadge(request.urgency)}
                          </div>
                          <h3 className="font-semibold">{request.product}</h3>
                          <p className="text-sm text-muted-foreground">
                            Requested by {request.from} | {request.quantity}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {request.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {request.deadline}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                            <Input
                              type="date"
                              value={planning?.estimatedDelivery || ""}
                              onChange={(event) => updatePlanningField(request.orderId, "estimatedDelivery", event.target.value)}
                            />
                            <Input
                              placeholder="Distributor name"
                              value={planning?.distributorName || ""}
                              onChange={(event) => updatePlanningField(request.orderId, "distributorName", event.target.value)}
                            />
                            <Input
                              placeholder="Vehicle type"
                              value={planning?.vehicleType || ""}
                              onChange={(event) => updatePlanningField(request.orderId, "vehicleType", event.target.value)}
                            />
                            <Input
                              placeholder="Vehicle number"
                              value={planning?.vehicleNumber || ""}
                              onChange={(event) => updatePlanningField(request.orderId, "vehicleNumber", event.target.value.toUpperCase())}
                            />
                            <Input
                              placeholder="Driver name"
                              value={planning?.driverName || ""}
                              onChange={(event) => updatePlanningField(request.orderId, "driverName", event.target.value)}
                            />
                            <Input
                              placeholder="Driver phone"
                              value={planning?.driverPhone || ""}
                              onChange={(event) =>
                                updatePlanningField(request.orderId, "driverPhone", event.target.value.replace(/[^0-9+]/g, ""))
                              }
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">{request.estimatedValue}</div>
                          <div className="flex gap-2 mt-2">
                            {renderActionButtons(request)}
                          </div>
                        </div>
                      </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                ))}
                {pendingRequests.length === 0 && (
                  <div className="py-10 text-center text-muted-foreground">No pending requests right now.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Requests</CardTitle>
              <CardDescription>Requests currently being delivered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeRequests.map((request) => (
                <div key={request.id} className="rounded-lg border p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{request.id} | {request.product}</p>
                    <p className="text-sm text-muted-foreground">{request.from} | {request.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    {renderActionButtons(request)}
                  </div>
                </div>
              ))}
              {activeRequests.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">No active requests found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Requests</CardTitle>
              <CardDescription>Successfully delivered requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedRequests.map((request) => (
                <div key={request.id} className="rounded-lg border p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{request.id} | {request.product}</p>
                    <p className="text-sm text-muted-foreground">{request.from} | Delivered by deadline {request.deadline}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    <span className="font-medium">{request.estimatedValue}</span>
                  </div>
                </div>
              ))}
              {completedRequests.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">No completed requests yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
