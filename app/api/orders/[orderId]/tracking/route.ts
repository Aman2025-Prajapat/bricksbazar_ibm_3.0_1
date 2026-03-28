import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import {
  getDeliveryAlerts,
  getDeliveryByOrderId,
  getDeliveryOtp,
  getDeliveryProof,
  getPaymentByOrderId,
  listDeliveryLocations,
  listOrders,
} from "@/lib/server/market-store"
import { getUserVerificationMapByIds } from "@/lib/server/user-store"

export async function GET(_request: Request, { params }: { params: { orderId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orders = await listOrders()
  const order = orders.find((item) => item.id === params.orderId)
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const canRead =
    sessionUser.role === "admin" ||
    sessionUser.role === "distributor" ||
    order.buyerId === sessionUser.userId ||
    order.items.some((item) => item.sellerId === sessionUser.userId)

  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payment = await getPaymentByOrderId(order.id)
  const delivery = await getDeliveryByOrderId(order.id)
  const verificationMap = await getUserVerificationMapByIds(
    [order.sellerId, delivery?.distributorId].filter((id): id is string => Boolean(id)),
  )
  const enrichedOrder = {
    ...order,
    sellerVerified: verificationMap.get(order.sellerId) === true,
  }
  if (sessionUser.role === "buyer" && order.buyerId === sessionUser.userId && (!payment || payment.status !== "paid")) {
    return NextResponse.json({
      order: enrichedOrder,
      delivery: null,
      locations: [],
      otp: null,
      proof: null,
      alerts: [],
      message: "Seller/distributor accepted your request. Complete payment to unlock live tracking.",
    })
  }

  if (!delivery) {
    return NextResponse.json({ order: enrichedOrder, delivery: null, locations: [], otp: null, proof: null, alerts: [] })
  }

  const [locations, otp, proof, alerts] = await Promise.all([
    listDeliveryLocations({ deliveryId: delivery.id, limit: 30 }),
    getDeliveryOtp(delivery.id),
    getDeliveryProof(delivery.id),
    getDeliveryAlerts(delivery.id),
  ])

  const otpForClient = otp
    ? {
        ...otp,
        otpCode: sessionUser.role === "admin" || order.buyerId === sessionUser.userId ? otp.otpCode : null,
      }
    : null

  return NextResponse.json({
    order: enrichedOrder,
    delivery: {
      ...delivery,
      distributorVerified: verificationMap.get(delivery.distributorId) === true,
    },
    locations,
    otp: otpForClient,
    proof,
    alerts: alerts?.alerts || [],
  })
}
