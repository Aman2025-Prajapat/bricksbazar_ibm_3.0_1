import { unlink } from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const TEST_EMAILS = ["e2e.buyer@bricksbazar.test", "e2e.distributor@bricksbazar.test"]

const summary = {
  users: 0,
  orders: 0,
  payments: 0,
  paymentIntents: 0,
  deliveries: 0,
  shipments: 0,
  proofs: 0,
  locations: 0,
  otps: 0,
  podFilesDeleted: 0,
}

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true, email: true },
  })

  if (users.length === 0) {
    console.log(JSON.stringify({ ok: true, message: "No E2E users found", summary }, null, 2))
    return
  }

  const buyerIds = users.filter((u) => u.email.includes("buyer")).map((u) => u.id)
  const userIds = users.map((u) => u.id)

  const orders = buyerIds.length
    ? await prisma.$queryRawUnsafe(
        `SELECT id FROM market_orders WHERE buyer_id IN (${buyerIds.map(() => "?").join(",")})`,
        ...buyerIds
      )
    : []
  const orderIds = orders.map((o) => o.id)

  const deliveries = orderIds.length
    ? await prisma.$queryRawUnsafe(
        `SELECT id FROM market_deliveries WHERE order_id IN (${orderIds.map(() => "?").join(",")})`,
        ...orderIds
      )
    : []
  const deliveryIds = deliveries.map((d) => d.id)

  const proofRows = deliveryIds.length
    ? await prisma.$queryRawUnsafe(
        `SELECT pod_image_url as podImageUrl FROM market_delivery_proofs WHERE delivery_id IN (${deliveryIds.map(() => "?").join(",")})`,
        ...deliveryIds
      )
    : []

  for (const row of proofRows) {
    const podImageUrl = row.podImageUrl
    if (!podImageUrl || !podImageUrl.startsWith("/uploads/pod/")) continue
    const filePath = path.join(process.cwd(), "public", podImageUrl.replace(/^\//, ""))
    try {
      await unlink(filePath)
      summary.podFilesDeleted += 1
    } catch {
      // ignore
    }
  }

  await prisma.$transaction(async (tx) => {
    if (deliveryIds.length) {
      summary.locations = await tx.$executeRawUnsafe(
        `DELETE FROM market_delivery_locations WHERE delivery_id IN (${deliveryIds.map(() => "?").join(",")})`,
        ...deliveryIds
      )
      summary.otps = await tx.$executeRawUnsafe(
        `DELETE FROM market_delivery_otps WHERE delivery_id IN (${deliveryIds.map(() => "?").join(",")})`,
        ...deliveryIds
      )
      summary.proofs = await tx.$executeRawUnsafe(
        `DELETE FROM market_delivery_proofs WHERE delivery_id IN (${deliveryIds.map(() => "?").join(",")})`,
        ...deliveryIds
      )
    }

    if (orderIds.length) {
      summary.shipments = await tx.$executeRawUnsafe(
        `DELETE FROM market_order_shipments WHERE order_id IN (${orderIds.map(() => "?").join(",")})`,
        ...orderIds
      )
      summary.deliveries = await tx.$executeRawUnsafe(
        `DELETE FROM market_deliveries WHERE order_id IN (${orderIds.map(() => "?").join(",")})`,
        ...orderIds
      )
      summary.payments = await tx.$executeRawUnsafe(
        `DELETE FROM market_payments WHERE order_id IN (${orderIds.map(() => "?").join(",")})`,
        ...orderIds
      )
      summary.orders = await tx.$executeRawUnsafe(
        `DELETE FROM market_orders WHERE id IN (${orderIds.map(() => "?").join(",")})`,
        ...orderIds
      )
    }

    if (buyerIds.length) {
      summary.paymentIntents = await tx.$executeRawUnsafe(
        `DELETE FROM market_payment_intents WHERE buyer_id IN (${buyerIds.map(() => "?").join(",")})`,
        ...buyerIds
      )
    }

    if (userIds.length) {
      await tx.$executeRawUnsafe(
        `DELETE FROM market_supplier_favorites WHERE user_id IN (${userIds.map(() => "?").join(",")})`,
        ...userIds
      )
      const userDelete = await tx.user.deleteMany({ where: { id: { in: userIds } } })
      summary.users = userDelete.count
    }
  })

  console.log(JSON.stringify({ ok: true, summary }, null, 2))
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
