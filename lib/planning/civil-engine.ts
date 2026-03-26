export type PlanningRoomType =
  | "Living"
  | "Bedroom"
  | "Kitchen"
  | "Bathroom"
  | "Stairs"
  | "Pooja"
  | "Verandah"
  | "Store"
  | "Parking"
  | "Garden"
  | "Balcony"

export type PlanningPlanStyle = "compact" | "balanced" | "luxury"
export type PlanningStaircaseType = "dog-leg" | "u-shape" | "straight"

export type CivilUsableBreakdown = {
  grossPlotAreaSqFt: number
  openSpaceDeductionSqFt: number
  wallDeductionSqFt: number
  circulationDeductionSqFt: number
  usablePerFloorSqFt: number
  stairDeductionSqFt: number
  usableTotalSqFt: number
}

export const ROOM_MIN_AREA_SQFT: Record<PlanningRoomType, number> = {
  Living: 120,
  Bedroom: 100,
  Kitchen: 56,
  Bathroom: 35,
  Pooja: 16,
  Store: 30,
  Parking: 135,
  Stairs: 40,
  Verandah: 40,
  Balcony: 20,
  Garden: 80,
}

type ProgramCounts = {
  bedrooms: number
  kitchens: number
  bathrooms: number
  poojaRooms: number
  storeRooms: number
  verandahRooms: number
  parkingSpaces: number
  gardenAreas: number
  balconyRooms: number
}

export function calcCivilUsableBreakdown(params: {
  lengthFt: number
  breadthFt: number
  floors: number
  planStyle: PlanningPlanStyle
  includeStairs: boolean
  staircaseType: PlanningStaircaseType
}): CivilUsableBreakdown {
  const { lengthFt, breadthFt, floors, planStyle, includeStairs, staircaseType } = params
  const grossPlotAreaSqFt = Math.max(lengthFt * breadthFt, 0)
  const openSpaceRatio = planStyle === "luxury" ? 0.12 : planStyle === "compact" ? 0.08 : 0.1
  const wallRatio = planStyle === "luxury" ? 0.14 : planStyle === "compact" ? 0.1 : 0.12
  const circulationRatio = 0.08
  const openSpaceDeductionSqFt = grossPlotAreaSqFt * openSpaceRatio
  const wallDeductionSqFt = grossPlotAreaSqFt * wallRatio
  const circulationDeductionSqFt = grossPlotAreaSqFt * circulationRatio
  const usablePerFloorSqFt = Math.max(
    grossPlotAreaSqFt - openSpaceDeductionSqFt - wallDeductionSqFt - circulationDeductionSqFt,
    0,
  )
  const stairDeductionSqFt = includeStairs && floors > 1 ? (staircaseType === "straight" ? 65 : 55) : 0
  const usableTotalSqFt = Math.max(usablePerFloorSqFt * floors - stairDeductionSqFt, 0)
  return {
    grossPlotAreaSqFt: Number(grossPlotAreaSqFt.toFixed(1)),
    openSpaceDeductionSqFt: Number(openSpaceDeductionSqFt.toFixed(1)),
    wallDeductionSqFt: Number(wallDeductionSqFt.toFixed(1)),
    circulationDeductionSqFt: Number(circulationDeductionSqFt.toFixed(1)),
    usablePerFloorSqFt: Number(usablePerFloorSqFt.toFixed(1)),
    stairDeductionSqFt: Number(stairDeductionSqFt.toFixed(1)),
    usableTotalSqFt: Number(usableTotalSqFt.toFixed(1)),
  }
}

export function calcProgramAreaNeedSqFt(params: {
  floors: number
  style: PlanningPlanStyle
  counts: ProgramCounts
}) {
  const { floors, style, counts } = params
  const circulationFactor = style === "luxury" ? 1.35 : style === "compact" ? 1.18 : 1.24
  const livingBase = ROOM_MIN_AREA_SQFT.Living
  const total =
    (counts.bedrooms * ROOM_MIN_AREA_SQFT.Bedroom +
      counts.kitchens * ROOM_MIN_AREA_SQFT.Kitchen +
      counts.bathrooms * ROOM_MIN_AREA_SQFT.Bathroom +
      counts.poojaRooms * ROOM_MIN_AREA_SQFT.Pooja +
      counts.storeRooms * ROOM_MIN_AREA_SQFT.Store +
      counts.verandahRooms * ROOM_MIN_AREA_SQFT.Verandah +
      counts.parkingSpaces * ROOM_MIN_AREA_SQFT.Parking +
      counts.gardenAreas * ROOM_MIN_AREA_SQFT.Garden +
      counts.balconyRooms * ROOM_MIN_AREA_SQFT.Balcony +
      floors * livingBase) *
    circulationFactor
  return Number(total.toFixed(1))
}

export function buildFloorDistribution(
  rooms: Partial<Record<PlanningRoomType, number>>,
  floors: number,
): Partial<Record<PlanningRoomType, number[]>> {
  if (floors <= 1) {
    const single: Partial<Record<PlanningRoomType, number[]>> = {}
    for (const [type, count] of Object.entries(rooms) as Array<[PlanningRoomType, number]>) {
      if (!count || count <= 0) continue
      single[type] = Array.from({ length: count }, () => 0)
    }
    return single
  }

  const dist: Partial<Record<PlanningRoomType, number[]>> = {}
  const groundTypes: PlanningRoomType[] = ["Living", "Kitchen", "Parking", "Pooja", "Store", "Verandah", "Garden"]
  for (const [type, count] of Object.entries(rooms) as Array<[PlanningRoomType, number]>) {
    if (!count || count <= 0) continue
    if (type === "Stairs") {
      dist.Stairs = Array.from({ length: floors - 1 }, (_, i) => i)
      continue
    }
    if (type === "Bathroom") {
      const groundBathrooms = Math.min(1, count)
      const upperBathrooms = Math.max(count - groundBathrooms, 0)
      dist.Bathroom = [
        ...Array.from({ length: groundBathrooms }, () => 0),
        ...Array.from({ length: upperBathrooms }, (_, i) => Math.min(i + 1, floors - 1)),
      ]
      continue
    }
    if (groundTypes.includes(type)) {
      dist[type] = Array.from({ length: count }, () => 0)
      continue
    }
    dist[type] = Array.from({ length: count }, (_, i) => Math.min(1 + i, floors - 1))
  }
  return dist
}
