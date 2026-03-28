import { NextResponse } from "next/server"
import {
  getPaymentIntentByGatewayTransactionId,
  logPaymentEvent,
  markPaymentIntentFailed,
  markPaymentIntentVerified,
} from "@/lib/server/market-store"
import { consumeRouteRateLimit, createRateLimitResponse } from "@/lib/server/api-rate-limit"

type PhonePeWebhookPayload = {
  merchantTransactionId?: string
  transactionId?: string
  state?: string
  response?: string
  data?: {
    merchantTransactionId?: string
    transactionId?: string
    state?: string
  }
}

function decodeBase64Json(encoded: string) {
  try {
    const text = Buffer.from(encoded, "base64").toString("utf8")
    return JSON.parse(text) as PhonePeWebhookPayload
  } catch {
    return null
  }
}

function resolveWebhookPayload(payload: PhonePeWebhookPayload) {
  if (payload.response) {
    const decoded = decodeBase64Json(payload.response)
    if (decoded) {
      return decoded
    }
  }
  return payload
}

export async function POST(request: Request) {
  const rateLimit = consumeRouteRateLimit(request, {
    bucket: "api:payments:phonepe:webhook",
    limit: 240,
    windowMs: 60_000,
  })
  if (!rateLimit.ok) {
    return createRateLimitResponse("Too many webhook events. Please retry shortly.", rateLimit.retryAfterSec)
  }

  const token = process.env.PHONEPE_WEBHOOK_TOKEN?.trim() || ""
  if (!token) {
    return NextResponse.json({ error: "PhonePe webhook token is not configured" }, { status: 503 })
  }

  const incoming = request.headers.get("x-callback-token")?.trim() || ""
  if (incoming !== token) {
    return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 })
  }

  const payload = (await request.json().catch(() => ({}))) as PhonePeWebhookPayload
  const normalized = resolveWebhookPayload(payload)

  const merchantTransactionId =
    normalized.data?.merchantTransactionId || normalized.merchantTransactionId || payload.merchantTransactionId
  const transactionId = normalized.data?.transactionId || normalized.transactionId
  const state = (normalized.data?.state || normalized.state || "").toUpperCase()

  if (!merchantTransactionId) {
    return NextResponse.json({ ok: true })
  }

  const intent = await getPaymentIntentByGatewayTransactionId(merchantTransactionId)
  if (!intent) {
    return NextResponse.json({ ok: true })
  }

  await logPaymentEvent({
    intentId: intent.id,
    buyerId: intent.buyerId,
    provider: "phonepe",
    eventType: state ? `webhook_${state.toLowerCase()}` : "webhook_received",
    source: "phonepe_webhook",
    status: "info",
    detailsJson: JSON.stringify({
      merchantTransactionId,
      transactionId,
      state,
    }),
  })

  const isAlreadySuccessful = intent.status === "verified" || intent.status === "used"

  if (state === "COMPLETED") {
    const nextTransactionId = transactionId || merchantTransactionId
    if (isAlreadySuccessful) {
      if (!intent.gatewayTransactionId || intent.gatewayTransactionId === nextTransactionId) {
        return NextResponse.json({ ok: true, idempotent: true })
      }
      return NextResponse.json({ ok: true, ignored: "transaction_mismatch" })
    }

    await markPaymentIntentVerified({
      intentId: intent.id,
      gatewayTransactionId: nextTransactionId,
      gatewayPayload: JSON.stringify(payload),
    })
  } else if (state) {
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
