import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { findUserByIdentifier, syncOperatorVerificationState } from "@/lib/server/user-store"
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/session"
import { getSessionCookieOptions } from "@/lib/server/auth-cookie"

const loginSchema = z.object({
  identifier: z.string().trim().min(2),
  password: z.string().min(1),
})

const LOGIN_WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS_PER_IP_WINDOW = 20
const MAX_ATTEMPTS_PER_IDENTIFIER_WINDOW = 6
const BLOCK_FOR_MS = 10 * 60 * 1000

type LoginAttemptState = {
  count: number
  windowStartedAt: number
  blockedUntil: number
}

const ipLoginAttempts = new Map<string, LoginAttemptState>()
const identifierLoginAttempts = new Map<string, LoginAttemptState>()

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  return forwardedFor || realIp || "unknown"
}

function getIdentifierKey(clientId: string, identifier: string) {
  return `${clientId}::${identifier}`
}

function pruneAttempts(store: Map<string, LoginAttemptState>) {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    const blockExpired = value.blockedUntil > 0 && value.blockedUntil <= now
    const windowExpired = now - value.windowStartedAt > LOGIN_WINDOW_MS
    if (blockExpired || windowExpired) {
      store.delete(key)
    }
  }
}

function getBlockedMs(clientId: string, identifier?: string) {
  pruneAttempts(ipLoginAttempts)
  pruneAttempts(identifierLoginAttempts)

  const now = Date.now()
  const ipBlockedMs = Math.max(0, (ipLoginAttempts.get(clientId)?.blockedUntil || 0) - now)
  if (!identifier) {
    return ipBlockedMs
  }

  const identifierKey = getIdentifierKey(clientId, identifier)
  const identifierBlockedMs = Math.max(0, (identifierLoginAttempts.get(identifierKey)?.blockedUntil || 0) - now)
  return Math.max(ipBlockedMs, identifierBlockedMs)
}

function trackFailure(store: Map<string, LoginAttemptState>, key: string, maxAttempts: number) {
  const now = Date.now()
  const current = store.get(key)

  if (!current || now - current.windowStartedAt > LOGIN_WINDOW_MS) {
    store.set(key, { count: 1, windowStartedAt: now, blockedUntil: 0 })
    return
  }

  const nextCount = current.count + 1
  if (nextCount >= maxAttempts) {
    store.set(key, {
      count: nextCount,
      windowStartedAt: current.windowStartedAt,
      blockedUntil: now + BLOCK_FOR_MS,
    })
    return
  }

  store.set(key, { ...current, count: nextCount })
}

function registerFailure(clientId: string, identifier: string) {
  trackFailure(ipLoginAttempts, clientId, MAX_ATTEMPTS_PER_IP_WINDOW)
  trackFailure(identifierLoginAttempts, getIdentifierKey(clientId, identifier), MAX_ATTEMPTS_PER_IDENTIFIER_WINDOW)
}

function clearFailures(clientId: string, identifier: string) {
  identifierLoginAttempts.delete(getIdentifierKey(clientId, identifier))

  const ipAttempt = ipLoginAttempts.get(clientId)
  if (!ipAttempt) return
  if (ipAttempt.blockedUntil > Date.now()) return

  if (ipAttempt.count <= 1) {
    ipLoginAttempts.delete(clientId)
    return
  }
  ipLoginAttempts.set(clientId, { ...ipAttempt, count: ipAttempt.count - 1 })
}

function toRateLimitResponse(blockedMs: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil(blockedMs / 1000))
  return NextResponse.json(
    { error: "Too many login attempts. Try again in a few minutes." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Retry-After": `${retryAfterSeconds}`,
      },
    },
  )
}

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)

  const ipBlockedMs = getBlockedMs(clientId)
  if (ipBlockedMs > 0) {
    return toRateLimitResponse(ipBlockedMs)
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid login data" }, { status: 400 })
    }

    const normalizedBody = {
      identifier: typeof body?.identifier === "string" ? body.identifier : body?.email,
      password: body?.password,
    }
    const parsed = loginSchema.safeParse(normalizedBody)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid login data" }, { status: 400 })
    }

    const identifier = parsed.data.identifier.trim().toLowerCase()
    const accountBlockedMs = getBlockedMs(clientId, identifier)
    if (accountBlockedMs > 0) {
      return toRateLimitResponse(accountBlockedMs)
    }

    const password = parsed.data.password
    const user = await findUserByIdentifier(identifier)

    if (!user) {
      registerFailure(clientId, identifier)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Require admins to log in with their exact email identifier.
    // This prevents admin access via alternate identifiers like display-name or user-id.
    if (user.role === "admin" && identifier !== user.email.trim().toLowerCase()) {
      registerFailure(clientId, identifier)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      registerFailure(clientId, identifier)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    let effectiveUser = user
    let verificationRequest: Awaited<ReturnType<typeof syncOperatorVerificationState>>["request"] = null
    if (user.role === "seller" || user.role === "distributor") {
      const synced = await syncOperatorVerificationState(user.id)
      if (synced.user) {
        effectiveUser = synced.user
      }
      verificationRequest = synced.request
    }

    const isUnverifiedOperator =
      (effectiveUser.role === "seller" || effectiveUser.role === "distributor") && !effectiveUser.verified

    clearFailures(clientId, identifier)

    const token = await createSessionToken({
      userId: effectiveUser.id,
      email: effectiveUser.email,
      name: effectiveUser.name,
      role: effectiveUser.role,
      verified: effectiveUser.verified,
    })

    const response = NextResponse.json(
      {
        user: {
          id: effectiveUser.id,
          email: effectiveUser.email,
          name: effectiveUser.name,
          role: effectiveUser.role,
          avatar: effectiveUser.avatar,
          verified: effectiveUser.verified,
          createdAt: effectiveUser.createdAt,
        },
        requiresApproval: isUnverifiedOperator,
        message: isUnverifiedOperator
          ? verificationRequest?.status === "rejected"
            ? "Your verification request was rejected. Please contact admin to re-submit details."
            : "Your dashboard is locked for verification and should be activated in 1-2 working days."
          : effectiveUser.role === "seller" || effectiveUser.role === "distributor"
            ? "Your account is verified and dashboard is active. You can continue now."
            : undefined,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    )

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      ...getSessionCookieOptions(),
    })

    return response
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
