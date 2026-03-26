import type { PlanningRoomType } from "@/lib/planning/civil-engine"

export type PromptDimensionArea = {
  lengthFt: number
  breadthFt: number
  totalSqFt: number
}
const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
}

const ROOM_KEYWORDS: Array<{ type: PlanningRoomType; patterns: string[] }> = [
  { type: "Living", patterns: ["living room", "living rooms", "living", "hall", "halls", "drawing room", "drawing rooms", "lounge", "lounges", "baithak"] },
  { type: "Bedroom", patterns: ["bedroom", "bedrooms", "bed room", "bed rooms", "master bedroom", "master bedrooms", "kamra", "kamre"] },
  { type: "Kitchen", patterns: ["kitchen", "kitchens", "kitch", "rasoi", "rasoighar"] },
  { type: "Bathroom", patterns: ["bathroom", "bathrooms", "bath", "baths", "toilet", "toilets", "washroom", "washrooms", "wc", "latrine"] },
  { type: "Pooja", patterns: ["pooja", "puja", "mandir", "temple"] },
  { type: "Store", patterns: ["store", "stores", "store room", "store rooms", "storeroom", "storerooms", "storage", "pantry"] },
  { type: "Verandah", patterns: ["verandah", "verandas", "veranda", "sit out", "aangan", "baramda"] },
  { type: "Parking", patterns: ["parking", "parkings", "garage", "garages", "car porch", "carport"] },
  { type: "Garden", patterns: ["garden", "gardens", "lawn", "lawns", "bagicha"] },
  { type: "Balcony", patterns: ["balcony", "balconies", "balkoni", "chajja"] },
  { type: "Stairs", patterns: ["stairs", "staircase", "staircases", "steps", "seedhi"] },
]

export function normalizePlanningPrompt(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[,;|+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return Object.entries(NUMBER_WORDS).reduce(
    (acc, [word, value]) => acc.replace(new RegExp(`\\b${word}\\b`, "g"), String(value)),
    normalized,
  )
}

export function extractDimensionAreaFromPrompt(input: string): PromptDimensionArea | null {
  const normalized = normalizePlanningPrompt(input)
  const match = normalized.match(/(\d{2,3}(?:\.\d+)?)\s*(?:x|by)\s*(\d{2,3}(?:\.\d+)?)(?:\s*(?:ft|feet|foot|'))?\b/i)
  if (!match?.[1] || !match[2]) return null
  const lengthFt = Number.parseFloat(match[1])
  const breadthFt = Number.parseFloat(match[2])
  if (!Number.isFinite(lengthFt) || !Number.isFinite(breadthFt)) return null
  return {
    lengthFt,
    breadthFt,
    totalSqFt: Math.round(lengthFt * breadthFt),
  }
}

export function parsePromptRoomCounts(input: string): Partial<Record<PlanningRoomType, number>> {
  const normalized = normalizePlanningPrompt(input)
  const counts: Partial<Record<PlanningRoomType, number>> = {}
  const extractCount = (pattern: string) => {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
    const withCount = new RegExp(`(\\d+)\\s*(?:${escaped})\\b`, "g")
    const explicitCount = Array.from(normalized.matchAll(withCount)).reduce((sum, part) => {
      const value = Number.parseInt(part[1], 10)
      return Number.isFinite(value) ? sum + value : sum
    }, 0)
    if (explicitCount > 0) return explicitCount
    const mentionRegex = new RegExp(`\\b(?:${escaped})\\b`)
    return mentionRegex.test(normalized) ? 1 : 0
  }

  for (const { type, patterns } of ROOM_KEYWORDS) {
    const detected = patterns.reduce((max, pattern) => Math.max(max, extractCount(pattern)), 0)
    if (detected > 0) {
      counts[type] = detected
    }
  }

  if (!counts.Bathroom && (counts.Bedroom ?? 0) > 0) {
    counts.Bathroom = Math.max(1, Math.ceil((counts.Bedroom ?? 1) / 2))
  }
  if (!counts.Living && (counts.Bedroom ?? 0) > 0) {
    counts.Living = 1
  }
  return counts
}
