import crypto from "node:crypto"
import { NextResponse } from "next/server"
import {
  getPaymentIntentByGatewayOrderId,
  logPaymentEvent,
  markPaymentIntentFailed,
  markPaymentIntentVerified,
} from "@/lib/server/market-store"
import { consumeRouteRateLimit, createRateLimitResponse } from "@/lib/server/api-rate-limit"

function verifyWebhookSignature(payload: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  const expectedBuffer = Buffer.from(expected)
  const incomingBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== incomingBuffer.length) {
    return false
  }
  return crypto.timingSafeEqual(expectedBuffer, incomingBuffer)
}

export async function POST(request: Request) {
  const rateLimit = consumeRouteRateLimit(request, {
    bucket: "api:payments:razorpay:webhook",
    limit: 240,
    windowMs: 60_000,
  })
  if (!rateLimit.ok) {
    return createRateLimitResponse("Too many webhook events. Please retry shortly.", rateLimit.retryAfterSec)
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || ""
  if (!secret) {
    return NextResponse.json({ error: "Razorpay webhook is not configured" }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-razorpay-signature")?.trim() || ""

  if (!signature || !verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  let payload: {
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
  try {
    payload = JSON.parse(rawBody) as typeof payload
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
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

  await logPaymentEvent({
    intentId: intent.id,
    buyerId: intent.buyerId,
    provider: "razorpay",
    eventType: payload.event || "webhook_received",
    source: "razorpay_webhook",
    status: "info",
    detailsJson: JSON.stringify({
      orderId,
      paymentId,
      status,
    }),
  })

  const isCaptured = payload.event === "payment.captured" || status === "captured"
  const isFailed = payload.event === "payment.failed" || status === "failed"
  const isAlreadySuccessful = intent.status === "verified" || intent.status === "used"

  if (isCaptured) {
    if (isAlreadySuccessful) {
      if (!intent.gatewayTransactionId || intent.gatewayTransactionId === paymentId) {
        return NextResponse.json({ ok: true, idempotent: true })
      }
      return NextResponse.json({ ok: true, ignored: "transaction_mismatch" })
    }

    await markPaymentIntentVerified({
      intentId: intent.id,
      gatewayTransactionId: paymentId,
      gatewayPayload: JSON.stringify(payload),
    })
  } else if (isFailed) {
    if (intent.status === "failed") {
      return NextResponse.json({ ok: true, idempotent: true })
    }
    if (isAlreadySuccessful) {
      return NextResponse.json({ ok: true, ignored: "already_verified" })
    }

    await markPaymentIntentFailed({
      intentId: intent.id,
      gatewayPayload: JSON.stringify(payload),
    })
  }

  return NextResponse.json({ ok: true })
}
