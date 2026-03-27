import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import {
  deleteDistributorLocation,
  listDistributorLocations,
  upsertDistributorLocation,
  type DistributorLocationStatus,
} from "@/lib/server/market-store"

const locationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  address: z.string().min(5),
  radiusKm: z.number().positive(),
  status: z.enum(["active", "maintenance", "inactive"]),
  deliveryTime: z.string().min(2),
})

const deleteSchema = z.object({
  id: z.string().min(1),
})

function getDistributorScope(sessionUser: { role: string; userId: string }) {
  if (sessionUser.role === "distributor") return sessionUser.userId
  if (sessionUser.role === "admin") return "mp-distributor-ops"
  return null
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (sessionUser.role === "buyer" || sessionUser.role === "seller") {
    const url = new URL(request.url)
    const publicOnly = url.searchParams.get("public") === "1"
    const locations = await listDistributorLocations(undefined, { activeOnly: publicOnly })
    return NextResponse.json({ locations })
  }

  const distributorId = getDistributorScope(sessionUser)
  if (!distributorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const locations = await listDistributorLocations(distributorId)
  return NextResponse.json({ locations })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const distributorId = getDistributorScope(sessionUser)
  if (!distributorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = locationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid location payload" }, { status: 400 })
  }

  const location = await upsertDistributorLocation({
    id: parsed.data.id,
    distributorId,
    name: parsed.data.name,
    address: parsed.data.address,
    radiusKm: parsed.data.radiusKm,
    status: parsed.data.status as DistributorLocationStatus,
    deliveryTime: parsed.data.deliveryTime,
  })

  return NextResponse.json({ location }, { status: 201 })
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const distributorId = getDistributorScope(sessionUser)
  if (!distributorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = deleteSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delete payload" }, { status: 400 })
  }

  await deleteDistributorLocation({ id: parsed.data.id, distributorId })
  return NextResponse.json({ ok: true })
}
