import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import { createDriverTrackingToken, normalizeDriverPhone } from "@/lib/server/driver-tracking"
import { getDeliveryById } from "@/lib/server/market-store"

function canIssueToken(
  sessionUser: Awaited<ReturnType<typeof getSessionUser>>,
  delivery: Awaited<ReturnType<typeof getDeliveryById>>,
) {
  if (!sessionUser || !delivery) return false
  if (sessionUser.role === "admin") return true
  if (sessionUser.role === "distributor") return delivery.distributorId === sessionUser.userId
  if (sessionUser.role === "seller") return delivery.sellerId === sessionUser.userId
  return false
}

export async function GET(_request: Request, { params }: { params: { deliveryId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const delivery = await getDeliveryById(params.deliveryId)
  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
  }

  if (!canIssueToken(sessionUser, delivery)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const driverPhone = normalizeDriverPhone(delivery.driverPhone)
  if (driverPhone.length < 7 || delivery.driverName.trim().toLowerCase() === "not assigned") {
    return NextResponse.json({ error: "Assign driver name and phone before issuing tracking token." }, { status: 409 })
  }

  const expiresInSeconds = 12 * 60 * 60
  const token = await createDriverTrackingToken(
    {
      deliveryId: delivery.id,
      distributorId: delivery.distributorId,
      sellerId: delivery.sellerId,
      driverPhone,
    },
    expiresInSeconds,
  )
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()
  return NextResponse.json({
    token,
    expiresAt,
    deliveryId: delivery.id,
    driverName: delivery.driverName,
    driverPhone,
  })
}
