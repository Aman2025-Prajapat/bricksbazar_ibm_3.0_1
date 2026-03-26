import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { appendDeliveryLocation, getDeliveryById, listDeliveryLocations } from "@/lib/server/market-store"

const createLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(3),
  speedKph: z.number().min(0).max(220).optional(),
  heading: z.number().min(0).max(360).optional(),
  status: z.enum(["pickup_ready", "in_transit", "nearby", "delivered", "cancelled"]).optional(),
})

export async function GET(request: Request, { params }: { params: { deliveryId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const delivery = await getDeliveryById(params.deliveryId)
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

  const url = new URL(request.url)
  const limit = Number.parseInt(url.searchParams.get("limit") || "25", 10)
  const locations = await listDeliveryLocations({ deliveryId: params.deliveryId, limit })
  return NextResponse.json({ locations })
}

export async function POST(request: Request, { params }: { params: { deliveryId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || (sessionUser.role !== "admin" && sessionUser.role !== "distributor")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = createLocationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid location payload" }, { status: 400 })
  }

  const result = await appendDeliveryLocation({ deliveryId: params.deliveryId, ...parsed.data })
  if (!result || !result.delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
  }

  return NextResponse.json(result, { status: 201 })
}
