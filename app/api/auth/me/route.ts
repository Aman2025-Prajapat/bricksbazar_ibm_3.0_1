import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { findUserById } from "@/lib/server/user-store"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/session"
import { getExpiredSessionCookieOptions } from "@/lib/server/auth-cookie"

function unauthorizedResponse(clearCookie = false) {
  const response = NextResponse.json(
    { user: null, authenticated: false },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  )

  if (clearCookie) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      ...getExpiredSessionCookieOptions(),
    })
  }

  return response
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return unauthorizedResponse(false)
  }

  const payload = await verifySessionToken(token)
  if (!payload) {
    return unauthorizedResponse(true)
  }

  const user = await findUserById(payload.userId)
  if (!user) {
    return unauthorizedResponse(true)
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        verified: user.verified,
        createdAt: user.createdAt,
      },
      authenticated: true,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  )
}
