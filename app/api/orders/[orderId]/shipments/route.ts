import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import { listOrderShipments } from "@/lib/server/market-store"

export async function GET(_request: Request, { params }: { params: { orderId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const shipments = await listOrderShipments({ orderId: params.orderId })
  const scoped = shipments.filter((shipment) => {
    if (sessionUser.role === "admin" || sessionUser.role === "distributor") return true
    if (sessionUser.role === "seller") return shipment.sellerId === sessionUser.userId
    return true
  })

  return NextResponse.json({ shipments: scoped })
}
