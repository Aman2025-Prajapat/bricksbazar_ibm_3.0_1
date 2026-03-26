import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/session"

export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  return verifySessionToken(token)
}

