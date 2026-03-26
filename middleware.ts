import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/session"

const rolePaths = ["buyer", "seller", "distributor", "admin"] as const
const DASHBOARD_RETURN_TO_REGEX = /^\/dashboard(\/|$)/

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      const returnTo = encodeURIComponent(`${pathname}${search}`)
      return NextResponse.redirect(new URL(`/auth?returnTo=${returnTo}`, request.url))
    }

    const payload = await verifySessionToken(token)
    if (!payload) {
      const returnTo = encodeURIComponent(`${pathname}${search}`)
      const response = NextResponse.redirect(new URL(`/auth?returnTo=${returnTo}`, request.url))
      response.cookies.delete(SESSION_COOKIE_NAME)
      return response
    }

    const matchedRole = rolePaths.find((role) => pathname.startsWith(`/dashboard/${role}`))
    if (matchedRole && payload.role !== matchedRole) {
      return NextResponse.redirect(new URL(`/dashboard/${payload.role}`, request.url))
    }
  }

  if (pathname === "/auth" && token) {
    const payload = await verifySessionToken(token)
    if (payload) {
      const returnTo = request.nextUrl.searchParams.get("returnTo")
      if (returnTo && DASHBOARD_RETURN_TO_REGEX.test(returnTo)) {
        return NextResponse.redirect(new URL(returnTo, request.url))
      }
      return NextResponse.redirect(new URL(`/dashboard/${payload.role}`, request.url))
    }

    const response = NextResponse.next()
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/auth", "/dashboard/:path*"],
}
