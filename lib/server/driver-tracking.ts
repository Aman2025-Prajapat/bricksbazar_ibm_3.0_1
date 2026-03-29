import { SignJWT, jwtVerify } from "jose"
import { getAuthSecret } from "@/lib/server/env"

const DRIVER_TRACKING_ISSUER = "bricksbaar-driver-tracking"
const DRIVER_TRACKING_AUDIENCE = "bricksbaar-driver-app"
const encoder = new TextEncoder()

function getDriverTrackingSecret() {
  return encoder.encode(`${getAuthSecret()}:driver-tracking`)
}

export function normalizeDriverPhone(input: string | null | undefined) {
  const raw = (input || "").trim()
  if (!raw) return ""
  const sanitized = raw.replace(/[^0-9+]/g, "")
  if (sanitized.startsWith("00")) return `+${sanitized.slice(2)}`
  return sanitized
}

export type DriverTrackingTokenPayload = {
  deliveryId: string
  distributorId: string
  sellerId: string
  driverPhone: string
}

type DriverTrackingJwtPayload = DriverTrackingTokenPayload & {
  tokenVersion: 1
}

export async function createDriverTrackingToken(payload: DriverTrackingTokenPayload, expiresInSeconds = 12 * 60 * 60) {
  const normalizedPayload: DriverTrackingJwtPayload = {
    deliveryId: payload.deliveryId,
    distributorId: payload.distributorId,
    sellerId: payload.sellerId,
    driverPhone: normalizeDriverPhone(payload.driverPhone),
    tokenVersion: 1,
  }

  return new SignJWT(normalizedPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(DRIVER_TRACKING_ISSUER)
    .setAudience(DRIVER_TRACKING_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${Math.max(60, Math.floor(expiresInSeconds))}s`)
    .sign(getDriverTrackingSecret())
}

export async function verifyDriverTrackingToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getDriverTrackingSecret(), {
      issuer: DRIVER_TRACKING_ISSUER,
      audience: DRIVER_TRACKING_AUDIENCE,
    })
    const typed = payload as Partial<DriverTrackingJwtPayload>
    if (
      typed.tokenVersion !== 1 ||
      typeof typed.deliveryId !== "string" ||
      typeof typed.distributorId !== "string" ||
      typeof typed.sellerId !== "string" ||
      typeof typed.driverPhone !== "string"
    ) {
      return null
    }
    return {
      deliveryId: typed.deliveryId,
      distributorId: typed.distributorId,
      sellerId: typed.sellerId,
      driverPhone: normalizeDriverPhone(typed.driverPhone),
    } satisfies DriverTrackingTokenPayload
  } catch {
    return null
  }
}
