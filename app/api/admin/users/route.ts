import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import { listUsers } from "@/lib/server/user-store"

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await listUsers()
  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
      createdAt: user.createdAt,
    })),
  })
}
