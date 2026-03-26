import { NextResponse } from "next/server"
import { z } from "zod"
import { createProduct, listProducts } from "@/lib/server/market-store"
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

  let products = await listProducts()

  if (sessionUser?.role === "seller" && scope !== "all") {
    products = products.filter((product) => product.sellerId === sessionUser.userId)
  }

  if (sessionUser?.role === "admin" && userId) {
    products = products.filter((product) => product.sellerId === userId)
  }

  if (q) {
    products = products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.sellerName.toLowerCase().includes(q),
    )
  }

  if (category !== "all") {
    products = products.filter((product) => product.category.toLowerCase() === category)
  }

  return NextResponse.json({ products })
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

