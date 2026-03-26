import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { getDeliveryById, getDeliveryOtp, issueDeliveryOtp } from "@/lib/server/market-store"

const issueOtpSchema = z.object({
  expiresInMinutes: z.number().int().min(5).max(120).optional(),
})

export async function GET(_request: Request, { params }: { params: { deliveryId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [delivery, otp] = await Promise.all([getDeliveryById(params.deliveryId), getDeliveryOtp(params.deliveryId)])
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

  const canSeeOtpCode = sessionUser.role === "admin" || delivery.buyerId === sessionUser.userId
  return NextResponse.json({
    otp: otp
      ? {
          ...otp,
          otpCode: canSeeOtpCode ? otp.otpCode : null,
        }
      : null,
  })
}

export async function POST(request: Request, { params }: { params: { deliveryId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const delivery = await getDeliveryById(params.deliveryId)
  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
  }

  const canIssue =
    sessionUser.role === "admin" ||
    sessionUser.role === "distributor" ||
    delivery.buyerId === sessionUser.userId

  if (!canIssue) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = issueOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid OTP issue payload" }, { status: 400 })
  }

  const otp = await issueDeliveryOtp({
    deliveryId: params.deliveryId,
    expiresInMinutes: parsed.data.expiresInMinutes,
  })
  if (!otp) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
  }

  const canSeeOtpCode = sessionUser.role === "admin" || delivery.buyerId === sessionUser.userId
  return NextResponse.json(
    {
      otp: {
        ...otp,
        otpCode: canSeeOtpCode ? otp.otpCode : null,
      },
    },
    { status: 201 },
  )
}
