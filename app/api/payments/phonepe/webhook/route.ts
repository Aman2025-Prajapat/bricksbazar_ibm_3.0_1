import { NextResponse } from "next/server"
import {
  getPaymentIntentByGatewayTransactionId,
  markPaymentIntentFailed,
  markPaymentIntentVerified,
} from "@/lib/server/market-store"

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
  const token = process.env.PHONEPE_WEBHOOK_TOKEN?.trim() || ""
  if (token) {
    const incoming = request.headers.get("x-callback-token")?.trim() || ""
    if (incoming !== token) {
      return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 })
    }
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

  if (state === "COMPLETED") {
    await markPaymentIntentVerified({
      intentId: intent.id,
      gatewayTransactionId: transactionId || merchantTransactionId,
      gatewayPayload: JSON.stringify(payload),
    })
  } else if (state) {
    await markPaymentIntentFailed({
      intentId: intent.id,
      gatewayPayload: JSON.stringify(payload),
    })
  }

  return NextResponse.json({ ok: true })
}
