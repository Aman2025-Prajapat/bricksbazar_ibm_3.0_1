import crypto from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import {
  consumePaymentIntent,
  createPaymentIntent,
  getPaymentIntentById,
  getPaymentByOrderId,
  listOrders,
  listPayments,
  markOrderPaymentPaid,
  markPaymentIntentFailed,
  markPaymentIntentVerified,
} from "@/lib/server/market-store"
import { getSessionUser } from "@/lib/server/auth-user"

const providerSchema = z.enum(["razorpay", "phonepe"])

const createIntentSchema = z.object({
  action: z.literal("create_intent"),
  provider: providerSchema,
  amount: z.number().positive(),
  currency: z.string().trim().default("INR"),
  receipt: z.string().trim().max(80).optional(),
})

const verifyRazorpaySchema = z.object({
  action: z.literal("verify_intent"),
  provider: z.literal("razorpay"),
  intentId: z.string().uuid(),
  razorpayOrderId: z.string().min(4),
  razorpayPaymentId: z.string().min(4),
  razorpaySignature: z.string().min(4),
})

const verifyPhonePeSchema = z.object({
  action: z.literal("verify_intent"),
  provider: z.literal("phonepe"),
  intentId: z.string().uuid(),
  merchantTransactionId: z.string().min(6),
})

const settleOrderSchema = z.object({
  action: z.literal("settle_order"),
  orderId: z.string().min(1),
  intentId: z.string().uuid(),
  paymentMethod: z.string().min(2),
})

const paymentCommandSchema = z.union([createIntentSchema, verifyRazorpaySchema, verifyPhonePeSchema, settleOrderSchema])
const isProduction = process.env.NODE_ENV === "production"

class PaymentConfigError extends Error {}

function toPaise(amount: number) {
  return Math.round(amount * 100)
}

function fromPaise(amountPaise: number) {
  return Number((amountPaise / 100).toFixed(2))
}

function asJson(value: unknown) {
  return JSON.stringify(value)
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

async function createRazorpayOrder(input: { amount: number; currency: string; receipt: string }) {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || ""
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || ""

  if (!keyId || !keySecret) {
    if (isProduction) {
      throw new PaymentConfigError("Razorpay is not configured")
    }
    return {
      mode: "mock" as const,
      keyId: "rzp_test_mock_key",
      orderId: `order_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`,
      amountPaise: toPaise(input.amount),
      currency: input.currency,
    }
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: toPaise(input.amount),
      currency: input.currency,
      receipt: input.receipt,
      payment_capture: 1,
    }),
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string
    amount?: number
    currency?: string
    error?: { description?: string }
  }

  if (!response.ok || !payload.id || !payload.amount || !payload.currency) {
    const message = payload.error?.description || "Razorpay order creation failed"
    throw new Error(message)
  }

  return {
    mode: "live" as const,
    keyId,
    orderId: payload.id,
    amountPaise: payload.amount,
    currency: payload.currency,
  }
}

function verifyRazorpaySignature(input: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || ""
  if (!keySecret) {
    if (isProduction) {
      return {
        ok: false,
        mode: "live" as const,
        reason: "RAZORPAY_KEY_SECRET is missing",
      }
    }
    return {
      ok: true,
      mode: "mock" as const,
      reason: "RAZORPAY_KEY_SECRET is missing; accepted as test verification",
    }
  }

  const body = `${input.razorpayOrderId}|${input.razorpayPaymentId}`
  const expected = crypto.createHmac("sha256", keySecret).update(body).digest("hex")
  const match = expected === input.razorpaySignature

  return {
    ok: match,
    mode: "live" as const,
    reason: match ? "signature_verified" : "signature_mismatch",
  }
}

async function createPhonePeOrder(input: { amount: number; currency: string; buyerId: string }) {
  const merchantId = process.env.PHONEPE_MERCHANT_ID?.trim() || ""
  const saltKey = process.env.PHONEPE_SALT_KEY?.trim() || ""
  const saltIndex = process.env.PHONEPE_SALT_INDEX?.trim() || ""
  const baseUrl = process.env.PHONEPE_BASE_URL?.trim() || "https://api-preprod.phonepe.com/apis/pg-sandbox"
  const redirectUrl =
    process.env.PHONEPE_REDIRECT_URL?.trim() || "http://localhost:3000/dashboard/buyer/cart?payment=phonepe"
  const callbackUrl =
    process.env.PHONEPE_CALLBACK_URL?.trim() || "http://localhost:3000/api/payments/phonepe/webhook"
  const merchantTransactionId = `BBTXN${Date.now()}${Math.floor(100 + Math.random() * 900)}`

  if (!merchantId || !saltKey || !saltIndex) {
    if (isProduction) {
      throw new PaymentConfigError("PhonePe is not configured")
    }
    return {
      mode: "mock" as const,
      merchantTransactionId,
      checkoutUrl: `https://mock.phonepe.test/pay/${merchantTransactionId}`,
      amountPaise: toPaise(input.amount),
      currency: input.currency,
    }
  }

  const path = "/pg/v1/pay"
  const payload = {
    merchantId,
    merchantTransactionId,
    merchantUserId: input.buyerId,
    amount: toPaise(input.amount),
    redirectUrl,
    redirectMode: "REDIRECT",
    callbackUrl,
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64")
  const xVerify = `${sha256(encodedPayload + path + saltKey)}###${saltIndex}`

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-VERIFY": xVerify,
      "X-MERCHANT-ID": merchantId,
    },
    body: JSON.stringify({ request: encodedPayload }),
    cache: "no-store",
  })

  const apiPayload = (await response.json().catch(() => ({}))) as {
    success?: boolean
    code?: string
    message?: string
    data?: {
      merchantTransactionId?: string
      instrumentResponse?: {
        redirectInfo?: {
          url?: string
        }
      }
    }
  }

  const checkoutUrl = apiPayload.data?.instrumentResponse?.redirectInfo?.url
  if (!response.ok || !apiPayload.success || !checkoutUrl) {
    throw new Error(apiPayload.message || "PhonePe order creation failed")
  }

  return {
    mode: "live" as const,
    merchantTransactionId,
    checkoutUrl,
    amountPaise: toPaise(input.amount),
    currency: input.currency,
  }
}

async function verifyPhonePePayment(merchantTransactionId: string) {
  const merchantId = process.env.PHONEPE_MERCHANT_ID?.trim() || ""
  const saltKey = process.env.PHONEPE_SALT_KEY?.trim() || ""
  const saltIndex = process.env.PHONEPE_SALT_INDEX?.trim() || ""
  const baseUrl = process.env.PHONEPE_BASE_URL?.trim() || "https://api-preprod.phonepe.com/apis/pg-sandbox"

  if (!merchantId || !saltKey || !saltIndex) {
    if (isProduction) {
      return {
        ok: false,
        mode: "live" as const,
        state: "CONFIG_MISSING",
        payload: { merchantTransactionId },
        reason: "PhonePe configuration is missing",
      }
    }
    return {
      ok: true,
      mode: "mock" as const,
      state: "COMPLETED",
      payload: { mocked: true, merchantTransactionId },
    }
  }

  const path = `/pg/v1/status/${merchantId}/${merchantTransactionId}`
  const xVerify = `${sha256(path + saltKey)}###${saltIndex}`

  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-VERIFY": xVerify,
      "X-MERCHANT-ID": merchantId,
    },
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean
    code?: string
    message?: string
    data?: {
      state?: string
      responseCode?: string
      amount?: number
      transactionId?: string
    }
  }

  const state = payload.data?.state || "UNKNOWN"
  const ok = Boolean(response.ok && payload.success && state === "COMPLETED")

  return {
    ok,
    mode: "live" as const,
    state,
    payload,
    amount: payload.data?.amount ? fromPaise(payload.data.amount) : undefined,
    gatewayTxn: payload.data?.transactionId,
    reason: payload.message || payload.code || "PhonePe verification failed",
  }
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payments = await listPayments()
  const orders = await listOrders()

  const scopedPayments = (() => {
    if (sessionUser.role === "admin" || sessionUser.role === "distributor") {
      return payments
    }

    if (sessionUser.role === "buyer") {
      return payments.filter((payment) => payment.userId === sessionUser.userId)
    }

    return payments
      .map((payment) => {
        const order = orders.find((current) => current.id === payment.orderId)
        if (!order) return null

        const sellerTotal = order.items
          .filter((item) => item.sellerId === sessionUser.userId)
          .reduce((sum, item) => sum + item.lineTotal, 0)

        if (sellerTotal <= 0) return null

        const commission = sellerTotal * 0.05
        const netAmount = sellerTotal - commission

        return {
          ...payment,
          amount: sellerTotal,
          commission,
          netAmount,
          buyerName: order.buyerName,
        }
      })
      .filter((payment): payment is NonNullable<typeof payment> => Boolean(payment))
  })()

  return NextResponse.json({ payments: scopedPayments })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can initiate payments" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = paymentCommandSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 })
  }

  try {
    if (parsed.data.action === "create_intent") {
      if (parsed.data.provider === "razorpay") {
        const rzOrder = await createRazorpayOrder({
          amount: parsed.data.amount,
          currency: parsed.data.currency,
          receipt: parsed.data.receipt || `bb-${Date.now()}`,
        })

        const intent = await createPaymentIntent({
          buyerId: sessionUser.userId,
          provider: "razorpay",
          amount: parsed.data.amount,
          currency: parsed.data.currency,
          gatewayOrderId: rzOrder.orderId,
          gatewayPayload: asJson({ mode: rzOrder.mode, amountPaise: rzOrder.amountPaise }),
        })

        return NextResponse.json({
          intentId: intent?.id,
          provider: "razorpay",
          mode: rzOrder.mode,
          keyId: rzOrder.keyId,
          gatewayOrderId: rzOrder.orderId,
          amount: parsed.data.amount,
          amountPaise: rzOrder.amountPaise,
          currency: rzOrder.currency,
        })
      }

      const phonePeOrder = await createPhonePeOrder({
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        buyerId: sessionUser.userId,
      })

      const intent = await createPaymentIntent({
        buyerId: sessionUser.userId,
        provider: "phonepe",
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        gatewayTransactionId: phonePeOrder.merchantTransactionId,
        gatewayPayload: asJson({ mode: phonePeOrder.mode, amountPaise: phonePeOrder.amountPaise }),
      })

      return NextResponse.json({
        intentId: intent?.id,
        provider: "phonepe",
        mode: phonePeOrder.mode,
        merchantTransactionId: phonePeOrder.merchantTransactionId,
        checkoutUrl: phonePeOrder.checkoutUrl,
        amount: parsed.data.amount,
        amountPaise: phonePeOrder.amountPaise,
        currency: phonePeOrder.currency,
      })
    }

    if (parsed.data.action === "settle_order") {
      const settle = parsed.data
      const [orderPayment, intent, orders] = await Promise.all([
        getPaymentByOrderId(settle.orderId),
        getPaymentIntentById(settle.intentId),
        listOrders(),
      ])

      const order = orders.find((item) => item.id === settle.orderId)
      if (!order || order.buyerId !== sessionUser.userId) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }
      if (order.status !== "confirmed") {
        return NextResponse.json(
          { error: "Payment is allowed only after seller/distributor approval." },
          { status: 409 },
        )
      }
      if (orderPayment?.status === "paid") {
        return NextResponse.json({
          ok: true,
          message: "Payment already confirmed for this order",
          orderId: order.id,
          payment: orderPayment,
        })
      }
      if (!intent || intent.buyerId !== sessionUser.userId) {
        return NextResponse.json({ error: "Payment intent not found" }, { status: 404 })
      }
      if (intent.status !== "verified") {
        return NextResponse.json({ error: "Payment intent must be verified before settlement" }, { status: 409 })
      }

      const consumed = await consumePaymentIntent({
        intentId: intent.id,
        buyerId: sessionUser.userId,
      })
      if (!consumed) {
        return NextResponse.json({ error: "Verified payment intent expired. Please pay again." }, { status: 409 })
      }

      const settled = await markOrderPaymentPaid({
        orderId: order.id,
        buyerId: sessionUser.userId,
        paymentMethod: settle.paymentMethod,
        paymentProvider: consumed.provider,
        paymentIntentId: consumed.id,
        gatewayOrderId: consumed.gatewayOrderId,
        gatewayTransactionId: consumed.gatewayTransactionId,
        gatewaySignature: consumed.gatewaySignature,
        gatewayPayload: consumed.gatewayPayload,
        paymentVerifiedAt: consumed.verifiedAt,
      })

      return NextResponse.json({
        ok: true,
        message: "Payment confirmed. You can now track live delivery updates.",
        order: settled.order,
        payment: settled.payment,
      })
    }

    const intent = await getPaymentIntentById(parsed.data.intentId)
    if (!intent || intent.buyerId !== sessionUser.userId) {
      return NextResponse.json({ error: "Payment intent not found" }, { status: 404 })
    }

    if (intent.status === "used") {
      return NextResponse.json({ error: "Payment intent already consumed" }, { status: 409 })
    }

    if (intent.status === "verified") {
      return NextResponse.json({
        intentId: intent.id,
        provider: intent.provider,
        verified: true,
        gatewayTransactionId: intent.gatewayTransactionId,
      })
    }

    if (parsed.data.provider === "razorpay") {
      if (intent.provider !== "razorpay") {
        return NextResponse.json({ error: "Provider mismatch for payment intent" }, { status: 409 })
      }

      const verification = verifyRazorpaySignature({
        razorpayOrderId: parsed.data.razorpayOrderId,
        razorpayPaymentId: parsed.data.razorpayPaymentId,
        razorpaySignature: parsed.data.razorpaySignature,
      })

      if (!verification.ok) {
        await markPaymentIntentFailed({
          intentId: intent.id,
          gatewayPayload: asJson({ reason: verification.reason }),
        })
        return NextResponse.json({ error: "Razorpay signature verification failed" }, { status: 400 })
      }

      const verifiedIntent = await markPaymentIntentVerified({
        intentId: intent.id,
        gatewayTransactionId: parsed.data.razorpayPaymentId,
        gatewaySignature: parsed.data.razorpaySignature,
        gatewayPayload: asJson({
          provider: "razorpay",
          mode: verification.mode,
          razorpayOrderId: parsed.data.razorpayOrderId,
          razorpayPaymentId: parsed.data.razorpayPaymentId,
        }),
      })

      return NextResponse.json({
        intentId: verifiedIntent?.id,
        provider: "razorpay",
        verified: true,
        gatewayTransactionId: verifiedIntent?.gatewayTransactionId,
      })
    }

    if (intent.provider !== "phonepe") {
      return NextResponse.json({ error: "Provider mismatch for payment intent" }, { status: 409 })
    }

    const verification = await verifyPhonePePayment(parsed.data.merchantTransactionId)

    if (!verification.ok) {
      await markPaymentIntentFailed({
        intentId: intent.id,
        gatewayPayload: asJson({
          provider: "phonepe",
          state: verification.state,
          reason: verification.reason,
          payload: verification.payload,
        }),
      })
      return NextResponse.json({ error: verification.reason || "PhonePe payment verification failed" }, { status: 400 })
    }

    const verifiedIntent = await markPaymentIntentVerified({
      intentId: intent.id,
      gatewayTransactionId: verification.gatewayTxn ?? parsed.data.merchantTransactionId,
      gatewayPayload: asJson({
        provider: "phonepe",
        mode: verification.mode,
        state: verification.state,
        payload: verification.payload,
      }),
    })

    return NextResponse.json({
      intentId: verifiedIntent?.id,
      provider: "phonepe",
      verified: true,
      gatewayTransactionId: verifiedIntent?.gatewayTransactionId,
    })
  } catch (error) {
    const status = error instanceof PaymentConfigError ? 503 : 400
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not process payment request" },
      { status },
    )
  }
}
