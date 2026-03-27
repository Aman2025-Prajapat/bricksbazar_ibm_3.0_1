import { NextResponse } from "next/server"
import { z } from "zod"
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

function isDriverKeyValid(request: Request) {
  const configuredKey = process.env.DRIVER_TRACKING_API_KEY?.trim() || ""
  if (!configuredKey) {
    return false
  }

  const providedKey = request.headers.get("x-driver-api-key")?.trim() || ""
  return providedKey.length > 0 && providedKey === configuredKey
}

export async function POST(request: Request) {
  if (!isDriverKeyValid(request)) {
    return NextResponse.json({ error: "Invalid driver API key" }, { status: 401 })
  }

  const parsed = ingestSchema.safeParse(await request.json())
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
