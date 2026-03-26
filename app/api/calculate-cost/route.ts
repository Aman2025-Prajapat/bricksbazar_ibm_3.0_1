import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import {
  detectRoomCollisions,
  detectVentilationIssues,
  detectVastuWarnings,
  estimateRoomMaterials,
  floorCostBreakdown,
  plumbingEfficiencyBonus,
  type EngineeringRoom,
} from "@/lib/engineering/calculations"
import { getMarketRates } from "@/lib/server/market-store"

const roomSchema = z.object({
  id: z.string(),
  type: z.enum(["Living", "Bedroom", "Kitchen", "Bathroom", "Stairs", "Pooja", "Verandah", "Store", "Parking", "Garden", "Balcony"]),
  floor: z.number().int().min(0),
  x: z.number(),
  z: z.number(),
  w: z.number().positive(),
  l: z.number().positive(),
  h: z.number().positive(),
  hasWindow: z.boolean().optional(),
})

const bodySchema = z.object({
  plotLength: z.number().positive(),
  plotWidth: z.number().positive(),
  vastuEnabled: z.boolean().default(false),
  rooms: z.array(roomSchema),
})

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      )
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const { rooms, plotLength, plotWidth, vastuEnabled } = parsed.data
    const engineeringRooms = rooms as EngineeringRoom[]

    const roomMaterials = engineeringRooms.map((room) => ({
      roomId: room.id,
      roomType: room.type,
      floor: room.floor,
      ...estimateRoomMaterials(room),
    }))

    const totals = roomMaterials.reduce(
      (acc, item) => {
        acc.bricks += item.bricks
        acc.cementBags += item.cementBags
        acc.paintLiters += item.paintLiters
        return acc
      },
      { bricks: 0, cementBags: 0, paintLiters: 0 },
    )

    const collisions = Array.from(detectRoomCollisions(engineeringRooms))
    const ventilationIssues = detectVentilationIssues(engineeringRooms)
    const vastuWarnings = detectVastuWarnings(engineeringRooms, plotLength, plotWidth, vastuEnabled)
    const plumbing = plumbingEfficiencyBonus(engineeringRooms)
    const floorCost = floorCostBreakdown(engineeringRooms)
    const rates = await getMarketRates()
    const materialCost = {
      bricks: Math.round(totals.bricks * rates.brickPerPiece),
      cement: Math.round(totals.cementBags * rates.cementPerBag),
      sand: Math.round(Math.max((parsed.data.plotLength * parsed.data.plotWidth) / 120, 1) * rates.sandPerTon),
    }

    return NextResponse.json({
      roomMaterials,
      totals: {
        ...totals,
        paintLiters: Number(totals.paintLiters.toFixed(2)),
      },
      collisions,
      ventilationIssues,
      vastuWarnings,
      plumbing,
      floorCost,
      rates,
      materialCost: {
        ...materialCost,
        total: materialCost.bricks + materialCost.cement + materialCost.sand,
      },
    })
  } catch {
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 })
  }
}
