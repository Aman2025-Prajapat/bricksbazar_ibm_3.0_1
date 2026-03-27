import crypto from "node:crypto"
import { NextResponse } from "next/server"
import {
  getPaymentIntentByGatewayOrderId,
  markPaymentIntentFailed,
  markPaymentIntentVerified,
} from "@/lib/server/market-store"

function verifyWebhookSignature(payload: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || process.env.RAZORPAY_KEY_SECRET?.trim() || ""
  if (!secret) {
    return false
  }

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  return expected === signature
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-razorpay-signature")?.trim() || ""

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as {
    event?: string
    payload?: {
      payment?: {
        entity?: {
          id?: string
          order_id?: string
          status?: string
        }
      }
    }
  }

  const orderId = payload.payload?.payment?.entity?.order_id
  const paymentId = payload.payload?.payment?.entity?.id
  const status = payload.payload?.payment?.entity?.status

  if (!orderId || !paymentId) {
    return NextResponse.json({ ok: true })
  }

  const intent = await getPaymentIntentByGatewayOrderId(orderId)
  if (!intent) {
    return NextResponse.json({ ok: true })
  }

  if (payload.event === "payment.captured" || status === "captured") {
    await markPaymentIntentVerified({
      intentId: intent.id,
      gatewayTransactionId: paymentId,
      gatewayPayload: JSON.stringify(payload),
    })
  } else if (payload.event === "payment.failed" || status === "failed") {
    await markPaymentIntentFailed({
      intentId: intent.id,
      gatewayPayload: JSON.stringify(payload),
    })
  }

  return NextResponse.json({ ok: true })
}
