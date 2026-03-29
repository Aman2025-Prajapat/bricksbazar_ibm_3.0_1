import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { listSupplierFavorites, setSupplierFavorite } from "@/lib/server/market-store"

const favoriteSchema = z.object({
  supplierId: z.string().min(1).optional(),
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
    supplierIds: Array.from(new Set(favorites.map((item) => item.supplierId).filter((value): value is string => Boolean(value)))),
    supplierNames: favorites.map((item) => item.supplierName),
  })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can update favorites" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = favoriteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid favorite payload" }, { status: 400 })
  }

  await setSupplierFavorite({
    userId: sessionUser.userId,
    supplierId: parsed.data.supplierId,
    supplierName: parsed.data.supplierName,
    favorite: parsed.data.favorite,
  })

  const favorites = await listSupplierFavorites(sessionUser.userId)
  return NextResponse.json({
    ok: true,
    supplierIds: Array.from(new Set(favorites.map((item) => item.supplierId).filter((value): value is string => Boolean(value)))),
    supplierNames: favorites.map((item) => item.supplierName),
  })
}
