import { NextResponse } from "next/server"
import { z } from "zod"
import { createOrder, listOrders } from "@/lib/server/market-store"
import { getSessionUser } from "@/lib/server/auth-user"

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
  paymentMethod: z.string().min(2).default("UPI"),
})

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const allOrders = await listOrders()

  const orders = (() => {
    if (sessionUser.role === "admin" || sessionUser.role === "distributor") {
      return allOrders
    }

    if (sessionUser.role === "buyer") {
      return allOrders.filter((order) => order.buyerId === sessionUser.userId)
    }

    return allOrders.filter((order) => order.items.some((item) => item.sellerId === sessionUser.userId))
  })()

  return NextResponse.json({ orders })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can place orders" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createOrderSchema.safeParse(body)

  if (!parsed.success || parsed.data.items.length === 0) {
    return NextResponse.json({ error: "Invalid order payload" }, { status: 400 })
  }

  try {
    const result = await createOrder({
      buyerId: sessionUser.userId,
      buyerName: sessionUser.name,
      items: parsed.data.items,
      paymentMethod: parsed.data.paymentMethod,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create order" },
      { status: 400 },
    )
  }
}

