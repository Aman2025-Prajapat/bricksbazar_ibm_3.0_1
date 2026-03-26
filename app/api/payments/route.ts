import { NextResponse } from "next/server"
import { listOrders, listPayments } from "@/lib/server/market-store"
import { getSessionUser } from "@/lib/server/auth-user"

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payments = await listPayments()
  const orders = await listOrders()

  const scopedPayments = (() => {
    if (sessionUser.role === "admin" || sessionUser.role === "distributor") {
      return payments
    }

    if (sessionUser.role === "buyer") {
      return payments.filter((payment) => payment.userId === sessionUser.userId)
    }

    return payments
      .map((payment) => {
        const order = orders.find((current) => current.id === payment.orderId)
        if (!order) return null

        const sellerTotal = order.items
          .filter((item) => item.sellerId === sessionUser.userId)
          .reduce((sum, item) => sum + item.lineTotal, 0)

        if (sellerTotal <= 0) return null

        const commission = sellerTotal * 0.05
        const netAmount = sellerTotal - commission

        return {
          ...payment,
          amount: sellerTotal,
          commission,
          netAmount,
          buyerName: order.buyerName,
        }
      })
      .filter((payment): payment is NonNullable<typeof payment> => Boolean(payment))
  })()

  return NextResponse.json({ payments: scopedPayments })
}
