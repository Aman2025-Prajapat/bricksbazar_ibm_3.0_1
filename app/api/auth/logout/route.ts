import { NextResponse } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/server/session"
import { getExpiredSessionCookieOptions } from "@/lib/server/auth-cookie"

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  )
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    ...getExpiredSessionCookieOptions(),
  })
  return response
}
