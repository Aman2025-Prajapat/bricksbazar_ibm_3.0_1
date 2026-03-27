import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { listSupplierFavorites, setSupplierFavorite } from "@/lib/server/market-store"

const favoriteSchema = z.object({
  supplierName: z.string().min(2),
  favorite: z.boolean(),
})

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can access favorites" }, { status: 403 })
  }

  const favorites = await listSupplierFavorites(sessionUser.userId)
  return NextResponse.json({
    favorites,
    supplierNames: favorites.map((item) => item.supplierName),
  })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can update favorites" }, { status: 403 })
  }

  const parsed = favoriteSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid favorite payload" }, { status: 400 })
  }

  await setSupplierFavorite({
    userId: sessionUser.userId,
    supplierName: parsed.data.supplierName,
    favorite: parsed.data.favorite,
  })

  const favorites = await listSupplierFavorites(sessionUser.userId)
  return NextResponse.json({
    ok: true,
    supplierNames: favorites.map((item) => item.supplierName),
  })
}
