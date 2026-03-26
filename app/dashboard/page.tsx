import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/server/auth-user"

export default async function DashboardPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/auth")
  }

  redirect(`/dashboard/${user.role}`)
}
