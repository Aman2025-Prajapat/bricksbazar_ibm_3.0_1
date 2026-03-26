import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { createUser, findUserByEmail } from "@/lib/server/user-store"
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/session"
import { getSessionCookieOptions } from "@/lib/server/auth-cookie"

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Za-z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one number"),
  role: z.enum(["buyer", "seller", "distributor"]),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration data" }, { status: 400 })
    }

    const name = parsed.data.name.trim()
    const email = parsed.data.email.trim().toLowerCase()
    const password = parsed.data.password
    const role = parsed.data.role

    const existing = await findUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await createUser({ name, email, role, passwordHash })

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    const response = NextResponse.json(
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
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
