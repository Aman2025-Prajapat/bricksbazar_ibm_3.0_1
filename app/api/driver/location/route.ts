import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { normalizeDriverPhone, verifyDriverTrackingToken } from "@/lib/server/driver-tracking"
import { appendDeliveryLocation, getDeliveryById } from "@/lib/server/market-store"

const ingestSchema = z.object({
  deliveryId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(3),
  speedKph: z.number().min(0).max(220).optional(),
  heading: z.number().min(0).max(360).optional(),
  status: z.enum(["pickup_ready", "in_transit", "nearby", "delivered", "cancelled"]).optional(),
})

function isLegacyDriverKeyValid(request: Request) {
  const configuredKey = process.env.DRIVER_TRACKING_API_KEY?.trim() || ""
  if (!configuredKey) return false
  const providedKey = request.headers.get("x-driver-api-key")?.trim() || ""
  return providedKey.length > 0 && providedKey === configuredKey
}

function canSessionWriteDelivery(
  sessionUser: Awaited<ReturnType<typeof getSessionUser>>,
  delivery: Awaited<ReturnType<typeof getDeliveryById>>,
) {
  if (!sessionUser || !delivery) return false
  if (sessionUser.role === "admin") return true
  if (sessionUser.role === "distributor") return delivery.distributorId === sessionUser.userId
  if (sessionUser.role === "seller") return delivery.sellerId === sessionUser.userId
  return false
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = ingestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid GPS payload" }, { status: 400 })
  }

  const delivery = await getDeliveryById(parsed.data.deliveryId)
  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
  }

  if (delivery.status === "delivered" || delivery.status === "cancelled") {
    return NextResponse.json({ error: "Tracking is closed for this delivery" }, { status: 409 })
  }

  const sessionUser = await getSessionUser()
  if (!canSessionWriteDelivery(sessionUser, delivery)) {
    const trackingToken = request.headers.get("x-driver-tracking-token")?.trim() || ""
    if (trackingToken) {
      const tokenPayload = await verifyDriverTrackingToken(trackingToken)
      if (
        !tokenPayload ||
        tokenPayload.deliveryId !== delivery.id ||
        tokenPayload.distributorId !== delivery.distributorId ||
        tokenPayload.sellerId !== delivery.sellerId
      ) {
        return NextResponse.json({ error: "Invalid driver tracking token" }, { status: 401 })
      }
      const tokenPhone = normalizeDriverPhone(tokenPayload.driverPhone)
      const assignedPhone = normalizeDriverPhone(delivery.driverPhone)
      if (assignedPhone && tokenPhone && assignedPhone !== tokenPhone) {
        return NextResponse.json({ error: "Driver token does not match assigned delivery driver" }, { status: 401 })
      }
    } else {
      const assignedPhone = normalizeDriverPhone(delivery.driverPhone)
      const providedPhone = normalizeDriverPhone(request.headers.get("x-driver-phone"))
      const hasAssignedPhone = assignedPhone.length >= 7 && delivery.driverPhone.trim().toLowerCase() !== "not assigned"
      if (!isLegacyDriverKeyValid(request) || !hasAssignedPhone || providedPhone !== assignedPhone) {
        return NextResponse.json(
          { error: "Unauthorized driver feed. Provide a valid tracking token or legacy key + assigned driver phone." },
          { status: 401 },
        )
      }
    }
  }

  const result = await appendDeliveryLocation({
    deliveryId: parsed.data.deliveryId,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    address: parsed.data.address,
    speedKph: parsed.data.speedKph,
    heading: parsed.data.heading,
    status: parsed.data.status,
  })

  if (!result) {
    return NextResponse.json({ error: "Could not append location" }, { status: 400 })
  }

  return NextResponse.json({ ok: true, delivery: result.delivery, location: result.location }, { status: 201 })
}
