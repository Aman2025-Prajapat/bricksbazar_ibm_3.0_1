import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import {
  getDeliveryAlerts,
  getDeliveryById,
  getDeliveryProof,
  getPaymentByOrderId,
  listOrders,
  updateDelivery,
  upsertDeliveryProof,
  verifyDeliveryOtp,
} from "@/lib/server/market-store"

const updateDeliverySchema = z
  .object({
    status: z.enum(["pickup_ready", "in_transit", "nearby", "delivered", "cancelled"]).optional(),
    distributorId: z.string().min(1).optional(),
    distributorName: z.string().min(1).optional(),
    deliveryAddress: z.string().min(10).max(300).optional(),
    vehicleNumber: z.string().min(1).optional(),
    vehicleType: z.string().min(1).optional(),
    driverName: z.string().min(1).optional(),
    driverPhone: z.string().min(4).optional(),
    etaMinutes: z.number().int().min(0).max(24 * 60).optional(),
    currentLat: z.number().min(-90).max(90).optional(),
    currentLng: z.number().min(-180).max(180).optional(),
    currentAddress: z.string().min(3).optional(),
    otpCode: z.string().length(6).optional(),
    podImageUrl: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .refine((value) => {
        if (!value) return true
        if (value.startsWith("/uploads/pod/")) return true
        try {
          const parsed = new URL(value)
          return parsed.protocol === "http:" || parsed.protocol === "https:"
        } catch {
          return false
        }
      }, { message: "podImageUrl must be https/http URL or uploaded POD path" }),
    podNote: z.string().min(2).max(500).optional(),
    receivedBy: z.string().min(2).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" })

type DeliveryStatus = "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"

const deliveryTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  pickup_ready: ["in_transit", "cancelled"],
  in_transit: ["nearby", "delivered", "cancelled"],
  nearby: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
}

  const sellerAssignableKeys = new Set(["vehicleNumber", "vehicleType", "driverName", "driverPhone"])

function isAssignmentReady(value: { vehicleNumber: string; driverName: string; driverPhone: string }) {
  const vehicleReady = value.vehicleNumber.trim().length > 0 && value.vehicleNumber !== "Not Assigned"
  const driverReady = value.driverName.trim().length > 0 && value.driverName !== "Not Assigned"
  const phoneReady = value.driverPhone.trim().length >= 7
  return vehicleReady && driverReady && phoneReady
}

export async function GET(_request: Request, { params }: { params: { deliveryId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [delivery, orders] = await Promise.all([getDeliveryById(params.deliveryId), listOrders()])
  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
  }

  const canRead =
    sessionUser.role === "admin" ||
    sessionUser.role === "distributor" ||
    delivery.buyerId === sessionUser.userId ||
    delivery.sellerId === sessionUser.userId

  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const order = orders.find((item) => item.id === delivery.orderId)
  const totalQuantity = order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0
  return NextResponse.json({
    delivery: {
      ...delivery,
      orderNumber: order?.orderNumber ?? delivery.orderId,
      orderStatus: order?.status ?? "pending",
      trackingNumber: order?.trackingNumber ?? null,
      orderTotal: order?.total ?? 0,
      firstItemName: order?.items[0]?.productName ?? "Mixed materials",
      totalQuantity,
    },
  })
}

export async function PATCH(request: Request, { params }: { params: { deliveryId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const delivery = await getDeliveryById(params.deliveryId)
  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
  }

  const isAdminOrDistributor = sessionUser.role === "admin" || sessionUser.role === "distributor"
  const isLinkedSeller = sessionUser.role === "seller" && delivery.sellerId === sessionUser.userId
  if (!isAdminOrDistributor && !isLinkedSeller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = updateDeliverySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delivery update payload" }, { status: 400 })
  }

  const updateKeys = Object.keys(parsed.data)
  if (isLinkedSeller && updateKeys.some((key) => !sellerAssignableKeys.has(key))) {
    return NextResponse.json(
      { error: "Seller can only assign vehicle and driver details for linked orders" },
      { status: 403 },
    )
  }

  const hasLocationUpdate =
    parsed.data.currentLat !== undefined ||
    parsed.data.currentLng !== undefined ||
    parsed.data.currentAddress !== undefined ||
    parsed.data.etaMinutes !== undefined

  if ((delivery.status === "delivered" || delivery.status === "cancelled") && hasLocationUpdate) {
    return NextResponse.json({ error: "Tracking is locked for completed/cancelled deliveries" }, { status: 409 })
  }

  const payment = await getPaymentByOrderId(delivery.orderId)
  const paymentPending = !payment || payment.status !== "paid"
  const liveStatusRequested =
    parsed.data.status !== undefined && ["in_transit", "nearby", "delivered"].includes(parsed.data.status)
  if (paymentPending && (liveStatusRequested || hasLocationUpdate)) {
    return NextResponse.json(
      { error: "Buyer payment pending. Dispatch and live tracking start only after payment confirmation." },
      { status: 409 },
    )
  }

  const targetStatus = parsed.data.status ?? delivery.status
  if (parsed.data.status && parsed.data.status !== delivery.status) {
    const allowedNext = deliveryTransitions[delivery.status]
    if (!allowedNext.includes(parsed.data.status)) {
      return NextResponse.json(
        { error: `Invalid delivery transition from ${delivery.status} to ${parsed.data.status}` },
        { status: 400 },
      )
    }
  }

  const nextAssignment = {
    vehicleNumber: parsed.data.vehicleNumber ?? delivery.vehicleNumber,
    driverName: parsed.data.driverName ?? delivery.driverName,
    driverPhone: parsed.data.driverPhone ?? delivery.driverPhone,
  }
  if (parsed.data.status && ["in_transit", "nearby", "delivered"].includes(targetStatus) && !isAssignmentReady(nextAssignment)) {
    return NextResponse.json(
      { error: "Vehicle number, driver name, and driver phone are required before dispatch" },
      { status: 400 },
    )
  }

  if (parsed.data.otpCode && parsed.data.status !== "delivered") {
    return NextResponse.json({ error: "OTP can only be submitted while marking delivery as delivered" }, { status: 400 })
  }

  if (parsed.data.status === "delivered") {
    if (!parsed.data.otpCode) {
      return NextResponse.json({ error: "OTP code is required to mark delivery as delivered" }, { status: 400 })
    }
    const otpCheck = await verifyDeliveryOtp({
      deliveryId: params.deliveryId,
      otpCode: parsed.data.otpCode,
    })
    if (!otpCheck.ok) {
      return NextResponse.json({ error: `OTP verification failed: ${otpCheck.reason}` }, { status: 400 })
    }
  }

  const updated = await updateDelivery({
    deliveryId: params.deliveryId,
    status: parsed.data.status,
    distributorId: parsed.data.distributorId,
    distributorName: parsed.data.distributorName,
    deliveryAddress: parsed.data.deliveryAddress,
    vehicleNumber: parsed.data.vehicleNumber,
    vehicleType: parsed.data.vehicleType,
    driverName: parsed.data.driverName,
    driverPhone: parsed.data.driverPhone,
    etaMinutes: parsed.data.etaMinutes,
    currentLat: parsed.data.currentLat,
    currentLng: parsed.data.currentLng,
    currentAddress: parsed.data.currentAddress,
  })
  if (!updated) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
  }

  if (parsed.data.status === "delivered") {
    await upsertDeliveryProof({
      deliveryId: params.deliveryId,
      otpVerified: true,
      podImageUrl: parsed.data.podImageUrl,
      podNote: parsed.data.podNote,
      receivedBy: parsed.data.receivedBy,
    })
  }

  const [proof, alerts] = await Promise.all([getDeliveryProof(params.deliveryId), getDeliveryAlerts(params.deliveryId)])
  return NextResponse.json({ delivery: updated, proof, alerts: alerts?.alerts || [] })
}
