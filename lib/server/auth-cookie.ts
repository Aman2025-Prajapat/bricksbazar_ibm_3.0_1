import { getNodeEnv } from "@/lib/server/env"

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getNodeEnv() === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}

export function getExpiredSessionCookieOptions() {
  return {
    ...getSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  }
}
