import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import { getDeliveryAlerts, getDeliveryById } from "@/lib/server/market-store"

export async function GET(_request: Request, { params }: { params: { deliveryId: string } }) {
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

  const alerts = await getDeliveryAlerts(params.deliveryId)
  return NextResponse.json(alerts || { deliveryId: params.deliveryId, alerts: [] })
}
