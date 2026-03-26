import type { EngineeringRoom } from "@/lib/engineering/calculations"

export type PlotFacing = "North" | "East" | "South" | "West"
export type Direction = "North" | "NorthEast" | "East" | "SouthEast" | "South" | "SouthWest" | "West" | "NorthWest" | "Center"

const DIRECTION_ORDER: Direction[] = ["North", "NorthEast", "East", "SouthEast", "South", "SouthWest", "West", "NorthWest"]

const FACING_ROTATION_STEPS: Record<PlotFacing, number> = {
  North: 0,
  East: 2,
  South: 4,
  West: 6,
}

function rotateDirection(direction: Direction, facing: PlotFacing): Direction {
  if (direction === "Center") return direction
  const current = DIRECTION_ORDER.indexOf(direction)
  const rotated = (current + FACING_ROTATION_STEPS[facing]) % DIRECTION_ORDER.length
  return DIRECTION_ORDER[rotated]
}

export function getRoomDirection(
  x: number,
  z: number,
  plotLength: number,
  plotWidth: number,
  facing: PlotFacing,
): Direction {
  const eastBand = plotLength / 6
  const northBand = plotWidth / 6

  const horizontal = x > eastBand ? "East" : x < -eastBand ? "West" : "Center"
  const vertical = z < -northBand ? "North" : z > northBand ? "South" : "Center"

  let base: Direction = "Center"
  if (vertical === "North" && horizontal === "East") base = "NorthEast"
  else if (vertical === "North" && horizontal === "West") base = "NorthWest"
  else if (vertical === "South" && horizontal === "East") base = "SouthEast"
  else if (vertical === "South" && horizontal === "West") base = "SouthWest"
  else if (vertical === "North") base = "North"
  else if (vertical === "South") base = "South"
  else if (horizontal === "East") base = "East"
  else if (horizontal === "West") base = "West"

  return rotateDirection(base, facing)
}

export function evaluateVastuCompliance(
  rooms: EngineeringRoom[],
  plotLength: number,
  plotWidth: number,
  enabled: boolean,
  facing: PlotFacing,
) {
  const roomDirections = new Map<string, Direction>()
  for (const room of rooms) {
    roomDirections.set(room.id, getRoomDirection(room.x, room.z, plotLength, plotWidth, facing))
  }

  if (!enabled) {
    return {
      score: 0,
      warnings: [] as string[],
      positives: [] as string[],
      roomDirections,
    }
  }

  let score = 50
  const warnings: string[] = []
  const positives: string[] = []

  const bedrooms = rooms.filter((room) => room.type === "Bedroom")
  const masterBedroom = bedrooms.sort((a, b) => b.w * b.l - a.w * a.l)[0]

  for (const room of rooms) {
    const direction = roomDirections.get(room.id) ?? "Center"

    if (room.type === "Kitchen") {
      if (direction === "NorthEast") {
        score -= 15
        warnings.push(`Kitchen (${room.id}) is in North-East. Suggestion: move to South-East (Agni).`)
      } else if (direction !== "SouthEast") {
        score -= 5
        warnings.push(`Kitchen (${room.id}) is better in South-East.`)
      } else {
        score += 8
      }
    }

    if (room.type === "Pooja") {
      if (direction === "NorthEast") {
        score += 12
        positives.push(`Pooja room (${room.id}) in North-East is ideal.`)
      } else {
        score -= 8
        warnings.push(`Pooja room (${room.id}) should ideally be in North-East.`)
      }
    }

    if (room.type === "Store" && direction !== "West" && direction !== "SouthWest") {
      score -= 4
      warnings.push(`Store room (${room.id}) is usually preferred in West or South-West.`)
    }

    if (room.type === "Verandah" && direction !== "North" && direction !== "East" && direction !== "NorthEast") {
      score -= 4
      warnings.push(`Verandah (${room.id}) is usually preferred in North or East zone.`)
    }
  }

  if (masterBedroom) {
    const masterDirection = roomDirections.get(masterBedroom.id)
    if (masterDirection === "SouthWest") {
      score += 10
      positives.push(`Master bedroom (${masterBedroom.id}) in South-West is recommended.`)
    } else {
      score -= 8
      warnings.push(`Master bedroom (${masterBedroom.id}) should be in South-West.`)
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    warnings,
    positives,
    roomDirections,
  }
}
