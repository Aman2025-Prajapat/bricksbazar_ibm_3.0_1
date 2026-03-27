import { NextResponse } from "next/server"
import { z } from "zod"
import { createProduct, listProductsPaginated } from "@/lib/server/market-store"
import { getSessionUser } from "@/lib/server/auth-user"

const createProductSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  price: z.number().positive(),
  unit: z.string().min(1),
  stock: z.number().int().nonnegative(),
  minStock: z.number().int().nonnegative(),
  image: z.string().min(1).default("/placeholder.svg"),
})

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = (url.searchParams.get("q") || "").trim().toLowerCase()
  const category = (url.searchParams.get("category") || "all").trim().toLowerCase()
  const scope = (url.searchParams.get("scope") || "").trim().toLowerCase()
  const userId = (url.searchParams.get("userId") || "").trim()
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1)
  const defaultLimit = scope === "all" ? 300 : 25
  const limit = Math.min(500, Math.max(1, Number.parseInt(url.searchParams.get("limit") || String(defaultLimit), 10) || defaultLimit))

  const scopeSellerId =
    sessionUser.role === "seller" && scope !== "all"
      ? sessionUser.userId
      : sessionUser.role === "admin" && userId
        ? userId
        : undefined

  const result = await listProductsPaginated({
    page,
    limit,
    q,
    category,
    scopeSellerId,
  })

  return NextResponse.json({
    products: result.items,
    page: result.page,
    limit: result.limit,
    total: result.total,
    hasNextPage: result.hasNextPage,
  })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || (sessionUser.role !== "seller" && sessionUser.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createProductSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product data" }, { status: 400 })
  }

  const product = await createProduct({
    ...parsed.data,
    rating: 4.5,
    status: parsed.data.stock > 0 ? "active" : "out_of_stock",
    sellerId: sessionUser.userId,
    sellerName: sessionUser.name,
  })

  return NextResponse.json({ product }, { status: 201 })
}
