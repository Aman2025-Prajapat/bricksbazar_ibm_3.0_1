import { jwtVerify, SignJWT } from "jose"
import type { UserRole } from "@/lib/auth"
import { SESSION_MAX_AGE_SECONDS } from "@/lib/server/auth-cookie"
import { getAuthSecret } from "@/lib/server/env"

export const SESSION_COOKIE_NAME = "bb_session"

const encoder = new TextEncoder()
const TOKEN_ISSUER = "bricksbaar"
const TOKEN_AUDIENCE = "bricksbaar-users"

function getJwtSecret() {
  return encoder.encode(getAuthSecret())
}

export type SessionPayload = {
  userId: string
  email: string
  name: string
  role: UserRole
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret())
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    })
    return payload as SessionPayload
  } catch {
    return null
  }
}
