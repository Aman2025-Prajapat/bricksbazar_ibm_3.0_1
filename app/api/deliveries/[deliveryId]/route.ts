import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import {
  getDeliveryAlerts,
  getDeliveryById,
  getDeliveryProof,
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
    vehicleNumber: z.string().min(1).optional(),
    vehicleType: z.string().min(1).optional(),
    driverName: z.string().min(1).optional(),
    driverPhone: z.string().min(4).optional(),
    etaMinutes: z.number().int().min(0).max(24 * 60).optional(),
    currentLat: z.number().min(-90).max(90).optional(),
    currentLng: z.number().min(-180).max(180).optional(),
    currentAddress: z.string().min(3).optional(),
    otpCode: z.string().length(6).optional(),
    podImageUrl: z.string().url().optional(),
    podNote: z.string().min(2).max(500).optional(),
    receivedBy: z.string().min(2).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" })

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
  if (!sessionUser || (sessionUser.role !== "admin" && sessionUser.role !== "distributor")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = updateDeliverySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delivery update payload" }, { status: 400 })
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
