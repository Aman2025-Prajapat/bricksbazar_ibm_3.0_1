export type EngineeringRoom = {
  id: string
  type: "Living" | "Bedroom" | "Kitchen" | "Bathroom" | "Stairs" | "Pooja" | "Verandah" | "Store" | "Parking" | "Garden" | "Balcony"
  floor: number
  x: number
  z: number
  w: number
  l: number
  h: number
  hasWindow?: boolean
}

export type SoilClass = "Rock" | "Dense" | "Medium" | "Soft"
export type SeismicZone = "II" | "III" | "IV" | "V"
export type ConcreteGrade = "M20" | "M25" | "M30"
export type SteelGrade = "Fe415" | "Fe500" | "Fe550"
export type CheckStatus = "pass" | "review" | "fail"

export type CivilInputs = {
  soilClass: SoilClass
  safeBearingCapacity: number
  seismicZone: SeismicZone
  basicWindSpeed: number
  groundwaterDepth: number
  concreteGrade: ConcreteGrade
  steelGrade: SteelGrade
}

type StructuralCheckItem = {
  id: string
  label: string
  status: CheckStatus
  detail: string
}

export type StructuralPrecheckResult = {
  score: number
  status: "PASS" | "REVIEW" | "RISK"
  maxSpanFt: number
  designLoadkNPerSqM: number
  suggestedBeamDepthM: number
  suggestedColumnSizeMm: number
  checks: StructuralCheckItem[]
  recommendations: string[]
}

const SQFT_TO_SQM = 0.092903
const FT_TO_M = 0.3048

export function detectRoomCollisions(rooms: EngineeringRoom[]) {
  const colliding = new Set<string>()

  for (let i = 0; i < rooms.length; i += 1) {
    for (let j = i + 1; j < rooms.length; j += 1) {
      const a = rooms[i]
      const b = rooms[j]
      if (a.floor !== b.floor) continue

      const intersects =
        Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
        Math.abs(a.z - b.z) < (a.l + b.l) / 2

      if (intersects) {
        colliding.add(a.id)
        colliding.add(b.id)
      }
    }
  }

  return colliding
}

export function estimateRoomMaterials(room: EngineeringRoom) {
  const roomAreaSqFt = room.w * room.l
  if (room.type === "Parking" || room.type === "Garden" || room.type === "Balcony") {
    return {
      roomAreaSqFt,
      perimeterFt: 2 * (room.w + room.l),
      grossWallAreaSqFt: 0,
      netWallAreaSqFt: 0,
      openingsAreaSqFt: 0,
      bricks: 0,
      cementBags: 0,
      paintLiters: 0,
    }
  }
  const perimeterFt = 2 * (room.w + room.l)
  const grossWallAreaSqFt = perimeterFt * room.h

  const doorAreaSqFt = room.type === "Stairs" ? 0 : 21
  const windowAreaSqFt = room.hasWindow === false ? 0 : 12
  const openingsAreaSqFt = doorAreaSqFt + windowAreaSqFt
  const netWallAreaSqFt = Math.max(grossWallAreaSqFt - openingsAreaSqFt, 0)

  const netWallAreaSqM = netWallAreaSqFt * SQFT_TO_SQM
  const bricksPerSqM = 60
  const cementBagsPerSqM = 0.42
  const paintLitersPerSqM = 0.18

  const bricks = Math.ceil(netWallAreaSqM * bricksPerSqM)
  const cementBags = Math.ceil(netWallAreaSqM * cementBagsPerSqM)
  const paintLiters = Number((netWallAreaSqM * paintLitersPerSqM).toFixed(2))

  return {
    roomAreaSqFt,
    perimeterFt,
    grossWallAreaSqFt,
    netWallAreaSqFt,
    openingsAreaSqFt,
    bricks,
    cementBags,
    paintLiters,
  }
}

export function generateColumns(room: EngineeringRoom, spacingFt = 15) {
  const halfW = room.w / 2
  const halfL = room.l / 2
  const points: Array<[number, number]> = [
    [room.x - halfW, room.z - halfL],
    [room.x + halfW, room.z - halfL],
    [room.x + halfW, room.z + halfL],
    [room.x - halfW, room.z + halfL],
  ]

  const additionalOnWidth = Math.floor(room.w / spacingFt)
  const additionalOnLength = Math.floor(room.l / spacingFt)

  for (let i = 1; i <= additionalOnWidth; i += 1) {
    const ratio = i / (additionalOnWidth + 1)
    const x = room.x - halfW + room.w * ratio
    points.push([x, room.z - halfL], [x, room.z + halfL])
  }

  for (let i = 1; i <= additionalOnLength; i += 1) {
    const ratio = i / (additionalOnLength + 1)
    const z = room.z - halfL + room.l * ratio
    points.push([room.x - halfW, z], [room.x + halfW, z])
  }

  return points
}

export function beamDepthForSpan(spanFt: number) {
  const spanM = spanFt * FT_TO_M
  if (spanM > 5) return 0.6
  if (spanM > 3.5) return 0.45
  return 0.35
}

export function detectVastuWarnings(rooms: EngineeringRoom[], plotLength: number, plotWidth: number, vastuEnabled: boolean) {
  if (!vastuEnabled) return []
  const warnings: string[] = []

  const northBoundary = -plotWidth / 6
  const eastBoundary = plotLength / 6

  for (const room of rooms) {
    if (room.type !== "Kitchen") continue
    const isNorthEast = room.x > eastBoundary && room.z < northBoundary
    if (isNorthEast) {
      warnings.push(`Kitchen (${room.id}) is in North-East. Suggestion: place kitchen in South-East.`)
    }
  }

  return warnings
}

export function detectVentilationIssues(rooms: EngineeringRoom[]) {
  return rooms
    .filter((room) => room.type !== "Stairs" && room.type !== "Parking" && room.type !== "Garden" && room.type !== "Balcony" && room.hasWindow === false)
    .map((room) => `Room ${room.id} has no window. Add at least one window for ventilation.`)
}

export function plumbingEfficiencyBonus(rooms: EngineeringRoom[]) {
  let stackedPairs = 0

  for (const room of rooms) {
    if (room.type !== "Kitchen" && room.type !== "Bathroom") continue

    for (const other of rooms) {
      if (other.floor !== room.floor + 1) continue
      if (other.type !== "Kitchen" && other.type !== "Bathroom") continue
      const aligned = Math.abs(room.x - other.x) < 2 && Math.abs(room.z - other.z) < 2
      if (aligned) stackedPairs += 1
    }
  }

  const bonusPercent = Math.min(stackedPairs * 3, 15)
  return { stackedPairs, bonusPercent }
}

export function floorCostBreakdown(rooms: EngineeringRoom[]) {
  const byFloor = new Map<number, number>()

  for (const room of rooms) {
    const area = room.w * room.l
    const baseRate =
      room.type === "Bathroom" ? 2300 :
      room.type === "Kitchen" ? 2100 :
      room.type === "Pooja" ? 1900 :
      room.type === "Store" ? 1750 :
      room.type === "Verandah" ? 1400 :
      room.type === "Parking" ? 750 :
      room.type === "Garden" ? 420 :
      room.type === "Balcony" ? 900 :
      room.type === "Stairs" ? 1700 :
      1800

    const cost = area * baseRate
    byFloor.set(room.floor, (byFloor.get(room.floor) ?? 0) + cost)
  }

  return Array.from(byFloor.entries())
    .map(([floor, cost]) => ({ floor, cost }))
    .sort((a, b) => a.floor - b.floor)
}

function concreteFactor(grade: ConcreteGrade) {
  if (grade === "M30") return 1.12
  if (grade === "M25") return 1.05
  return 1
}

function steelFactor(grade: SteelGrade) {
  if (grade === "Fe550") return 1.12
  if (grade === "Fe500") return 1.05
  return 1
}

export function runStructuralPrecheck(
  rooms: EngineeringRoom[],
  floors: number,
  floorHeight: number,
  civil: CivilInputs,
): StructuralPrecheckResult {
  const spans = rooms.map((room) => Math.max(room.w, room.l))
  const maxSpanFt = spans.length > 0 ? Math.max(...spans) : 0
  const baseDesignLoad = 6 + (floors - 1) * 1.1
  const designLoadkNPerSqM = Number((baseDesignLoad * concreteFactor(civil.concreteGrade) * steelFactor(civil.steelGrade)).toFixed(2))
  const suggestedBeamDepthM = beamDepthForSpan(maxSpanFt)
  const suggestedColumnSizeMm = maxSpanFt > 18 ? 450 : maxSpanFt > 14 ? 380 : 300

  const requiredSbc = 120 + Math.max(0, floors - 1) * 35
  const hasStairsForMultiFloor = floors <= 1 || rooms.some((room) => room.type === "Stairs")
  const wetRooms = rooms.filter((room) => room.type === "Bathroom" || room.type === "Kitchen")
  const stackedWetCount = wetRooms.filter((room) =>
    wetRooms.some((other) => other.floor === room.floor + 1 && Math.abs(room.x - other.x) < 2 && Math.abs(room.z - other.z) < 2),
  ).length

  const checks: StructuralCheckItem[] = [
    {
      id: "sbc-capacity",
      label: "Soil Bearing Capacity",
      status: civil.safeBearingCapacity >= requiredSbc ? "pass" : civil.safeBearingCapacity >= requiredSbc - 25 ? "review" : "fail",
      detail: `SBC ${civil.safeBearingCapacity} kN/m2, recommended >= ${requiredSbc} kN/m2 for ${floors} floor(s).`,
    },
    {
      id: "max-span",
      label: "Primary Span Control",
      status: maxSpanFt <= 16 ? "pass" : maxSpanFt <= 20 ? "review" : "fail",
      detail: `Max clear span ${maxSpanFt.toFixed(1)} ft. Prefer <= 16 ft for efficient residential framing.`,
    },
    {
      id: "floor-height",
      label: "Floor Height Range",
      status: floorHeight >= 9.5 && floorHeight <= 12 ? "pass" : floorHeight >= 9 ? "review" : "fail",
      detail: `Configured floor height ${floorHeight.toFixed(1)} ft.`,
    },
    {
      id: "stair-core",
      label: "Vertical Circulation",
      status: hasStairsForMultiFloor ? "pass" : "fail",
      detail: hasStairsForMultiFloor ? "Stair core present for current floor count." : "Multi-floor home requires at least one stair core.",
    },
    {
      id: "wet-stack",
      label: "Wet Area Stacking",
      status: floors === 1 || stackedWetCount >= 1 ? "pass" : "review",
      detail: floors === 1 ? "Single floor design." : `${stackedWetCount} aligned wet-room vertical pairs detected.`,
    },
    {
      id: "site-risk",
      label: "Site Hazard Envelope",
      status:
        civil.seismicZone === "V" || civil.basicWindSpeed >= 50 || civil.groundwaterDepth <= 4
          ? "review"
          : "pass",
      detail: `Zone ${civil.seismicZone}, wind ${civil.basicWindSpeed} m/s, groundwater ${civil.groundwaterDepth.toFixed(1)} ft.`,
    },
  ]

  const score = Math.max(
    0,
    100 -
      checks.reduce((sum, check) => sum + (check.status === "fail" ? 18 : check.status === "review" ? 7 : 0), 0),
  )
  const recommendations = checks
    .filter((check) => check.status !== "pass")
    .map((check) => {
      if (check.id === "sbc-capacity") return "Increase footing size or switch to raft/combined footing after soil test report."
      if (check.id === "max-span") return "Add intermediate column/beam line to reduce unsupported span."
      if (check.id === "floor-height") return "Keep clear floor height between 9.5-12 ft for balanced structural and HVAC performance."
      if (check.id === "stair-core") return "Add at least one stair block connected to all occupied floors."
      if (check.id === "wet-stack") return "Align kitchen/bath shafts vertically to reduce plumbing complexity."
      return "Run detailed structural analysis for high hazard site conditions."
    })

  const status = score >= 85 ? "PASS" : score >= 65 ? "REVIEW" : "RISK"
  return {
    score,
    status,
    maxSpanFt,
    designLoadkNPerSqM,
    suggestedBeamDepthM,
    suggestedColumnSizeMm,
    checks,
    recommendations,
  }
}

export function runCodeComplianceChecks(rooms: EngineeringRoom[], floorHeight: number) {
  const checks: StructuralCheckItem[] = []

  const bedroomViolations = rooms.filter((room) => room.type === "Bedroom" && room.w * room.l < 100).length
  checks.push({
    id: "bedroom-area",
    label: "Bedroom Minimum Area",
    status: bedroomViolations === 0 ? "pass" : bedroomViolations <= 1 ? "review" : "fail",
    detail: bedroomViolations === 0 ? "All bedrooms >= 100 sq ft." : `${bedroomViolations} bedroom(s) below 100 sq ft.`,
  })

  const kitchenViolations = rooms.filter((room) => room.type === "Kitchen" && room.w * room.l < 50).length
  checks.push({
    id: "kitchen-area",
    label: "Kitchen Minimum Area",
    status: kitchenViolations === 0 ? "pass" : "review",
    detail: kitchenViolations === 0 ? "All kitchens >= 50 sq ft." : `${kitchenViolations} kitchen(s) below 50 sq ft.`,
  })

  const bathViolations = rooms.filter((room) => room.type === "Bathroom" && room.w * room.l < 20).length
  checks.push({
    id: "bath-area",
    label: "Bathroom Minimum Area",
    status: bathViolations === 0 ? "pass" : "review",
    detail: bathViolations === 0 ? "All bathrooms >= 20 sq ft." : `${bathViolations} bathroom(s) below 20 sq ft.`,
  })

  const stairViolations = rooms
    .filter((room) => room.type === "Stairs")
    .filter((room) => Math.min(room.w, room.l) < 3.5).length
  checks.push({
    id: "stair-width",
    label: "Stair Width",
    status: stairViolations === 0 ? "pass" : "fail",
    detail: stairViolations === 0 ? "All stair blocks >= 3.5 ft clear." : `${stairViolations} stair block(s) below 3.5 ft width.`,
  })

  const noWindowHabitable = rooms.filter(
    (room) => room.type !== "Bathroom" && room.type !== "Store" && room.type !== "Stairs" && room.hasWindow === false,
  ).length
  checks.push({
    id: "ventilation",
    label: "Natural Ventilation",
    status: noWindowHabitable === 0 ? "pass" : noWindowHabitable <= 2 ? "review" : "fail",
    detail: noWindowHabitable === 0 ? "All habitable rooms have windows." : `${noWindowHabitable} habitable room(s) without window.`,
  })

  checks.push({
    id: "floor-height",
    label: "Clear Height Guidance",
    status: floorHeight >= 9.5 ? "pass" : "review",
    detail: `Configured at ${floorHeight.toFixed(1)} ft.`,
  })

  const score = Math.max(
    0,
    100 -
      checks.reduce((sum, check) => sum + (check.status === "fail" ? 20 : check.status === "review" ? 8 : 0), 0),
  )
  const status = score >= 85 ? "PASS" : score >= 65 ? "REVIEW" : "RISK"
  return { score, status, checks }
}
