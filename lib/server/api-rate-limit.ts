import { NextResponse } from "next/server"

type RateLimitInput = {
  bucket: string
  limit: number
  windowMs: number
}

type RateLimitState = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

const rateLimitStore = new Map<string, RateLimitState>()

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown-agent"
  return forwardedFor || realIp || `anon-${userAgent.slice(0, 80)}`
}

function pruneExpiredEntries(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}

export function consumeRouteRateLimit(request: Request, input: RateLimitInput): RateLimitResult {
  const now = Date.now()
  pruneExpiredEntries(now)

  const clientId = getClientIdentifier(request)
  const key = `${input.bucket}:${clientId}`
  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + input.windowMs })
    return {
      ok: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterSec: Math.max(1, Math.ceil(input.windowMs / 1000)),
    }
  }

  if (existing.count >= input.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  const nextCount = existing.count + 1
  rateLimitStore.set(key, { ...existing, count: nextCount })

  return {
    ok: true,
    remaining: Math.max(0, input.limit - nextCount),
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}

export function createRateLimitResponse(message: string, retryAfterSec: number) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Retry-After": `${retryAfterSec}`,
      },
    },
  )
}
