import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/session"
import { getGeminiConfig } from "@/lib/server/env"

const FLOOR_ROOM_TYPES = [
  "Living",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Pooja",
  "Store",
  "Verandah",
  "Parking",
  "Garden",
  "Balcony",
  "Stairs",
] as const
const DIRECTION_VALUES = [
  "North",
  "NorthEast",
  "East",
  "SouthEast",
  "South",
  "SouthWest",
  "West",
  "NorthWest",
  "Center",
] as const

const requestSchema = z.object({
  input: z.string().min(3).max(1200),
})

const requirementsSchema = z.object({
  totalSqFt: z.number().min(200).max(10000).optional(),
  floors: z.number().min(1).max(4).optional(),
  bedrooms: z.number().min(0).max(8).optional(),
  kitchens: z.number().min(0).max(4).optional(),
  bathrooms: z.number().min(0).max(8).optional(),
  poojaRooms: z.number().min(0).max(2).optional(),
  storeRooms: z.number().min(0).max(3).optional(),
  verandahRooms: z.number().min(0).max(2).optional(),
  parkingSpaces: z.number().min(0).max(2).optional(),
  gardenAreas: z.number().min(0).max(2).optional(),
  balconyRooms: z.number().min(0).max(3).optional(),
  includeStairs: z.boolean().optional(),
  includeBoundary: z.boolean().optional(),
  includeLandscapeGlass: z.boolean().optional(),
})

const floorAssignmentsSchema = z
  .object({
    Living: z.array(z.number().int().min(0).max(3)).max(8).optional(),
    Bedroom: z.array(z.number().int().min(0).max(3)).max(12).optional(),
    Kitchen: z.array(z.number().int().min(0).max(3)).max(6).optional(),
    Bathroom: z.array(z.number().int().min(0).max(3)).max(12).optional(),
    Pooja: z.array(z.number().int().min(0).max(3)).max(6).optional(),
    Store: z.array(z.number().int().min(0).max(3)).max(6).optional(),
    Verandah: z.array(z.number().int().min(0).max(3)).max(6).optional(),
    Parking: z.array(z.number().int().min(0).max(3)).max(4).optional(),
    Garden: z.array(z.number().int().min(0).max(3)).max(4).optional(),
    Balcony: z.array(z.number().int().min(0).max(3)).max(8).optional(),
    Stairs: z.array(z.number().int().min(0).max(3)).max(4).optional(),
  })
  .partial()

const adjacencyRuleSchema = z.object({
  room: z.enum(FLOOR_ROOM_TYPES),
  near: z.enum(FLOOR_ROOM_TYPES),
})

const directionRuleSchema = z.object({
  room: z.enum(FLOOR_ROOM_TYPES),
  direction: z.enum(DIRECTION_VALUES),
})

const aiParsedSchema = requirementsSchema.extend({
  floorAssignments: floorAssignmentsSchema.optional(),
  lockedRooms: floorAssignmentsSchema.optional(),
  adjacencyRules: z.array(adjacencyRuleSchema).max(20).optional(),
  directionRules: z.array(directionRuleSchema).max(20).optional(),
})

type RequirementsPatch = z.infer<typeof requirementsSchema>
type FloorAssignments = z.infer<typeof floorAssignmentsSchema>
type AiParsed = z.infer<typeof aiParsedSchema>
type FloorRoomType = (typeof FLOOR_ROOM_TYPES)[number]
type AdjacencyRule = z.infer<typeof adjacencyRuleSchema>
type DirectionRule = z.infer<typeof directionRuleSchema>

const ROOM_TYPES: FloorRoomType[] = [...FLOOR_ROOM_TYPES]

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

function normalizePromptInput(input: string) {
  const normalized = input.toLowerCase()
  const withWordNumbers = Object.entries(NUMBER_WORDS).reduce(
    (acc, [word, value]) => acc.replace(new RegExp(`\\b${word}\\b`, "g"), String(value)),
    normalized,
  )
  return withWordNumbers
    .replace(/\bfrist\b/g, "first")
    .replace(/\bfrst\b/g, "first")
    .replace(/\bsecand\b/g, "second")
    .replace(/\bseond\b/g, "second")
    .replace(/\bkitch\b/g, "kitchen")
    .replace(/\brasoi\s*ghar\b/g, "rasoi")
    .replace(/\brasoda\b/g, "rasoi")
    .replace(/\bwash\s*room\b/g, "washroom")
    .replace(/\bbed\s*rm\b/g, "bedroom")
    .replace(/\bbed\s*room\b/g, "bedroom")
    .replace(/\blat\s*bat\b/g, "bath")
    .replace(/\blet\s*bat\b/g, "bath")
    .replace(/\blet\s+bat\b/g, "bath")
    .replace(/\bbath\s*room\b/g, "bathroom")
    .replace(/\bsidhi\b/g, "stairs")
    .replace(/\bseedhi\b/g, "stairs")
    .replace(/\bseedi\b/g, "stairs")
    .replace(/\bstairis\b/g, "stairs")
    .replace(/\bstaris\b/g, "stairs")
    .replace(/\bbalconey\b/g, "balcony")
    .replace(/\bboucany\b/g, "balcony")
    .replace(/\bbalkoni\b/g, "balcony")
    .replace(/\bsquare\s*(fir|fit|feets?)\b/g, "square feet")
    .replace(/\bcar\s*parking\b/g, "parking")
    .replace(/\bgaadi\s*parking\b/g, "parking")
    .replace(/\bvehicle\s*parking\b/g, "parking")
    .replace(/\bdoosra\b/g, "dusra")
    .replace(/\bdoosre\b/g, "dusra")
}

function detectPromptConflicts(input: string) {
  const normalized = input.toLowerCase()
  const conflicts: string[] = []
  const hasYes = (pattern: RegExp) => pattern.test(normalized)
  const hasNo = (terms: string[]) => {
    const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
    const before = new RegExp(`\\b(?:no|without|exclude|excluding|remove|skip)\\s+(?:\\w+\\s+){0,3}(?:${escaped})\\b`)
    const after = new RegExp(`\\b(?:${escaped})\\b\\s+(?:not\\s+required|not\\s+needed|nahi|nahin|mat)\\b`)
    return before.test(normalized) || after.test(normalized)
  }
  const checkToggleConflict = (label: string, yesPattern: RegExp, noTerms: string[]) => {
    if (hasYes(yesPattern) && hasNo(noTerms)) conflicts.push(`Conflicting ${label} requirement`)
  }

  checkToggleConflict("parking", /\b(parking|garage|car porch|carport)\b/, ["parking", "garage", "car porch", "carport"])
  checkToggleConflict("garden", /\b(garden|lawn)\b/, ["garden", "lawn"])
  checkToggleConflict("balcony", /\b(balcony|balconies)\b/, ["balcony", "balconies"])
  checkToggleConflict("boundary", /\b(boundary|compound wall|fence)\b/, ["boundary", "compound wall", "fence", "boundary wall"])
  checkToggleConflict("stairs", /\b(stairs|staircase|steps)\b/, ["stairs", "staircase", "steps"])

  const floorValues = Array.from(normalized.matchAll(/(\d)\s*(floor|floors|storey|storeys|story|stories)\b/g)).map((match) => Number.parseInt(match[1], 10))
  if (new Set(floorValues).size > 1) {
    conflicts.push(`Multiple floor counts found (${Array.from(new Set(floorValues)).join(", ")})`)
  }

  const areaValues = Array.from(normalized.matchAll(/(\d{3,5})\s*(sq\s*ft|sqft|square\s*feet|sft|sq\.?\s?feet)\b/g)).map((match) => Number.parseInt(match[1], 10))
  if (new Set(areaValues).size > 1) {
    conflicts.push(`Multiple area values found (${Array.from(new Set(areaValues)).join(", ")})`)
  }

  return conflicts
}

function regexFallback(input: string) {
  const normalizedInput = normalizePromptInput(input)
  const extract = (pattern: RegExp) => {
    const match = normalizedInput.match(pattern)
    return match?.[1] ? Number.parseInt(match[1], 10) : undefined
  }
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const hasNegation = (terms: string[]) => {
    const joined = terms.map(escapeRegex).join("|")
    const before = new RegExp(`\\b(?:no|without|exclude|excluding|remove|skip)\\s+(?:\\w+\\s+){0,3}(?:${joined})\\b`)
    const after = new RegExp(`\\b(?:${joined})\\b\\s+(?:not\\s+required|not\\s+needed|nahi|nahin|mat)\\b`)
    return before.test(normalizedInput) || after.test(normalizedInput)
  }

  const totalSqFt = extract(/(\d{3,5})\s*(sq\s*ft|sqft|square\s*feet|sft|sq\.?\s?feet)/)
  const floors =
    extract(/(\d)\s*(floor|floors|storey|storeys|story|stories|level|tala|tal|manzil)/) ??
    (/\b(duplex|double\s*storey|double\s*story|two\s*storey|two\s*story)\b/.test(normalizedInput) ? 2 : undefined)
  const bhkBedrooms = extract(/(\d)\s*bhk/)
  const bedroomMentioned = /\b(master\s*bedroom|bedroom|kamra|kamre|sleep(?:ing)?\s*room)\b/.test(normalizedInput)
  const bathroomMentioned = /\b(bath|bathroom|bathrooms|toilet|toilets|washroom|wc|lat\s*bath|latrine|restroom|bat)\b/.test(normalizedInput)
  const kitchenMentioned = /\b(kitchen|kitchens|rasoi|rasoighar|rasoda)\b/.test(normalizedInput)
  const bedrooms = bhkBedrooms ?? extract(/(\d)\s*(bedroom|bedrooms|kamra|kamre|sleep(?:ing)?\s*room)/) ?? (bedroomMentioned ? 1 : undefined)
  const bathrooms = extract(/(\d)\s*(bath|bathroom|bathrooms|toilet|toilets|washroom|wc|latrine|restroom|bat)/) ?? (bathroomMentioned ? 1 : undefined)
  const kitchens = extract(/(\d)\s*(kitchen|kitchens|rasoi|rasoighar|rasoda)/) ?? (kitchenMentioned ? 1 : undefined)
  const storeRooms = extract(/(\d)\s*(store|store\s*room|store\s*rooms|storage)/)
  const balconyMentioned = normalizedInput.includes("balcony") || normalizedInput.includes("chajja")
  const balconyNegated = hasNegation(["balcony", "balconies"])
  const balconyRooms = balconyNegated
    ? 0
    : balconyMentioned
      ? extract(/(\d)\s*(balcony|balconies)/) ?? 1
      : undefined
  const parkingMentioned =
    normalizedInput.includes("parking") || normalizedInput.includes("garage") || normalizedInput.includes("car porch") || normalizedInput.includes("carport")
  const parkingNegated = hasNegation(["parking", "garage", "car porch", "carport"])
  const parkingSpaces = parkingNegated
    ? 0
    : parkingMentioned
      ? extract(/(\d)\s*(parking|car|cars|garage)/) ?? 1
      : undefined
  const gardenMentioned = normalizedInput.includes("garden") || normalizedInput.includes("lawn") || normalizedInput.includes("bagicha")
  const gardenNegated = hasNegation(["garden", "gardens", "lawn", "lawns"])
  const gardenAreas = gardenNegated
    ? 0
    : gardenMentioned
      ? extract(/(\d)\s*(garden|gardens|lawn|lawns)/) ?? 1
      : undefined
  const boundaryMentioned =
    normalizedInput.includes("boundary") || normalizedInput.includes("compound wall") || normalizedInput.includes("fence")
  const boundaryNegated = hasNegation(["boundary", "compound wall", "fence", "boundary wall"])
  const includeBoundary = boundaryNegated ? false : boundaryMentioned ? true : undefined
  const verandahMentioned =
    normalizedInput.includes("aangan") ||
    normalizedInput.includes("courtyard") ||
    /verandah|veranda|varandah|baramda|sit[-\s]?out/.test(normalizedInput)
  const verandahNegated = hasNegation(["aangan", "courtyard", "verandah", "veranda", "sit out", "sitout"])
  const verandahRooms = verandahNegated
    ? 0
    : normalizedInput.includes("aangan") || normalizedInput.includes("courtyard")
      ? 1
      : extract(/(\d)\s*(verandah|veranda|sit[-\s]?out)/)
  const poojaRooms =
    normalizedInput.includes("pooja") || normalizedInput.includes("mandir") || normalizedInput.includes("temple")
      ? 1
      : extract(/(\d)\s*(pooja|mandir|temple)/)

  const stairsNegated = hasNegation(["stairs", "staircase", "steps"])
  const greenGlassMentioned =
    /green\s*glass|glass\s*landscap|landscap|greenery|green\s*strip|green\s*boundary|lawn\s*strip/.test(normalizedInput)
  const greenGlassNegated = hasNegation(["green glass", "landscape", "landscaping", "greenery", "lawn strip", "green strip"])
  const includeLandscapeGlass = greenGlassNegated ? false : greenGlassMentioned ? true : undefined

  return {
    totalSqFt,
    floors,
    bedrooms,
    kitchens,
    bathrooms,
    poojaRooms,
    storeRooms,
    verandahRooms: verandahMentioned ? verandahRooms ?? 1 : verandahRooms,
    parkingSpaces,
    gardenAreas,
    balconyRooms,
    includeStairs: stairsNegated ? false : floors ? floors > 1 : undefined,
    includeBoundary,
    includeLandscapeGlass,
  } satisfies RequirementsPatch
}

function parseFloorAssignmentsFallback(input: string): FloorAssignments {
  const normalized = normalizePromptInput(input)
  const roomPatterns: Array<{ type: FloorRoomType; pattern: string }> = [
    { type: "Living", pattern: "living\\s*rooms?|living|drawing\\s*rooms?|hall(?:s)?|lounge(?:s)?|baithak" },
    { type: "Bedroom", pattern: "master\\s*bed\\s*rooms?|bed\\s*rooms?|bedrooms?|sone\\s*ka\\s*kamra|kamre?|sleep(?:ing)?\\s*rooms?" },
    { type: "Kitchen", pattern: "kitchens?|kitch|rasoi|rasoighar|rasoda" },
    { type: "Bathroom", pattern: "bath(?:room)?s?|toilets?|washrooms?|wc|lat\\s*bath|latrine|rest\\s*rooms?|restrooms?|bat" },
    { type: "Pooja", pattern: "pooja|puja|mandir|temple" },
    { type: "Store", pattern: "store\\s*rooms?|storerooms?|storage|stores?|pantry|bhandar" },
    { type: "Verandah", pattern: "verandah|veranda|varandah|sit\\s*out|sitout|courtyard|aangan|angan|baramda" },
    { type: "Parking", pattern: "parkings?|garage|garages|car\\s*porch|carport" },
    { type: "Garden", pattern: "gardens?|lawns?|bagicha|bageecha" },
    { type: "Balcony", pattern: "balcon(?:y|ies|ey)|boucany|balkoni|chajja" },
    { type: "Stairs", pattern: "stairs?|staircases?|stairis|staris|steps?" },
  ]

  const markerRegex =
    /\b(?:(ground|lower|neeche|first|1st|second|2nd|third|3rd|fourth|4th|pehla|pehle|pahla|pahli|dusra|teesra|tisra|chautha|chauthi|upper|upar)(?:\s*(?:floor|floors|storey|storeys|story|stories|level|tala|tal|manzil))?|([1-4])\s*(?:floor|floors|storey|storeys|story|stories|level|tala|tal|manzil))\b/g
  const markers = Array.from(normalized.matchAll(markerRegex)).map((match) => ({
    token: (match[1] ?? match[2] ?? "").trim(),
    index: match.index ?? 0,
    length: match[0].length,
  }))
  if (markers.length === 0) return {}

  const hasGroundMention = markers.some((marker) => marker.token === "ground" || marker.token === "lower" || marker.token === "neeche")
  const tokenToFloor = (token: string) => {
    if (token === "ground" || token === "lower" || token === "neeche") return 0
    if (token === "upper" || token === "upar") return 1
    if (token === "first" || token === "1st" || token === "1" || token === "pehla" || token === "pehle" || token === "pahla" || token === "pahli") {
      return hasGroundMention ? 1 : 0
    }
    if (token === "second" || token === "2nd" || token === "2" || token === "dusra") return hasGroundMention ? 2 : 1
    if (token === "third" || token === "3rd" || token === "3" || token === "teesra" || token === "tisra") return hasGroundMention ? 3 : 2
    if (token === "fourth" || token === "4th" || token === "4" || token === "chautha" || token === "chauthi") return hasGroundMention ? 4 : 3
    return null
  }

  const preferences: FloorAssignments = {}
  const addRoomCount = (type: FloorRoomType, floor: number, count: number) => {
    if (count <= 0 || floor < 0 || floor > 3) return
    if (!preferences[type]) preferences[type] = []
    for (let i = 0; i < count; i += 1) {
      preferences[type]?.push(floor)
    }
  }

  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i]
    const floor = tokenToFloor(marker.token)
    if (floor === null || floor < 0 || floor > 3) continue
    const sectionStart = marker.index + marker.length
    const sectionEnd = i < markers.length - 1 ? markers[i + 1].index : normalized.length
    const section = normalized.slice(sectionStart, sectionEnd)

    for (const room of roomPatterns) {
      const numericPattern = new RegExp(`(\\d+)\\s*(?:${room.pattern})\\b`, "g")
      const explicitCount = Array.from(section.matchAll(numericPattern)).reduce((sum, match) => {
        const value = Number.parseInt(match[1], 10)
        return sum + (Number.isFinite(value) ? value : 0)
      }, 0)

      if (explicitCount > 0) {
        addRoomCount(room.type, floor, explicitCount)
        continue
      }

      const mentionPattern = new RegExp(`\\b(?:${room.pattern})\\b`)
      if (mentionPattern.test(section)) {
        addRoomCount(room.type, floor, 1)
      }
    }
  }

  const validated = floorAssignmentsSchema.safeParse(preferences)
  return validated.success ? validated.data : {}
}

function parseAdjacencyRulesFallback(input: string): AdjacencyRule[] {
  const normalized = normalizePromptInput(input)
  const nearLink = "(?:near|adjacent|beside|next\\s*to|attached|connected|passage\\s*to|with)"
  const rules: AdjacencyRule[] = []

  const addIfMatches = (room: FloorRoomType, near: FloorRoomType, roomPattern: string, nearPattern: string) => {
    const forward = new RegExp(`(?:${roomPattern})[\\s\\S]{0,24}${nearLink}[\\s\\S]{0,24}(?:${nearPattern})`)
    const reverse = new RegExp(`(?:${nearPattern})[\\s\\S]{0,24}${nearLink}[\\s\\S]{0,24}(?:${roomPattern})`)
    if (forward.test(normalized) || reverse.test(normalized)) {
      rules.push({ room, near })
    }
  }

  addIfMatches("Kitchen", "Living", "kitchen|rasoi|rasoighar|rasoda", "living|hall|drawing\\s*room|lounge|baithak")
  addIfMatches("Bathroom", "Bedroom", "bath(?:room)?|toilet|washroom|wc|latrine", "bedroom|kamra|sleep(?:ing)?\\s*room")
  addIfMatches("Store", "Kitchen", "store\\s*room|store|storage|pantry|bhandar", "kitchen|rasoi|rasoighar|rasoda")
  addIfMatches("Pooja", "Living", "pooja|puja|mandir|temple", "living|hall|drawing\\s*room|lounge|baithak")
  addIfMatches("Stairs", "Living", "stairs?|staircase|steps?", "living|hall|drawing\\s*room|lounge|baithak|lobby")

  const dedup = new Map<string, AdjacencyRule>()
  for (const rule of rules) {
    dedup.set(`${rule.room}:${rule.near}`, rule)
  }
  return Array.from(dedup.values())
}

function parseDirectionRulesFallback(input: string): DirectionRule[] {
  const normalized = normalizePromptInput(input)
  const rules: DirectionRule[] = []
  const roomPatterns: Record<FloorRoomType, string> = {
    Living: "living\\s*rooms?|living|drawing\\s*rooms?|hall(?:s)?|lounge(?:s)?|baithak",
    Bedroom: "master\\s*bed\\s*rooms?|bed\\s*rooms?|bedrooms?|kamra|kamre|sleep(?:ing)?\\s*rooms?",
    Kitchen: "kitchens?|kitch|rasoi|rasoighar|rasoda",
    Bathroom: "bath(?:room)?s?|toilets?|washrooms?|wc|latrine|rest\\s*rooms?|restrooms?",
    Pooja: "pooja|puja|mandir|temple",
    Store: "store\\s*rooms?|storerooms?|storage|stores?|pantry|bhandar",
    Verandah: "verandah|veranda|varandah|sit\\s*out|sitout|courtyard|aangan|angan|baramda",
    Parking: "parkings?|garage|garages|car\\s*porch|carport",
    Garden: "gardens?|lawns?|bagicha|bageecha",
    Balcony: "balcon(?:y|ies|ey)|boucany|balkoni|chajja",
    Stairs: "stairs?|staircases?|stairis|staris|steps?",
  }
  const directionAliases: Array<{ direction: DirectionRule["direction"]; pattern: string }> = [
    { direction: "NorthEast", pattern: "north\\s*east|north-east|ne\\b|eeshan|ishan" },
    { direction: "SouthEast", pattern: "south\\s*east|south-east|se\\b|agni" },
    { direction: "SouthWest", pattern: "south\\s*west|south-west|sw\\b|nairitya" },
    { direction: "NorthWest", pattern: "north\\s*west|north-west|nw\\b|vayavya" },
    { direction: "North", pattern: "north\\b|uttar\\b" },
    { direction: "South", pattern: "south\\b|dakshin\\b" },
    { direction: "East", pattern: "east\\b|purab|poorv|purva" },
    { direction: "West", pattern: "west\\b|paschim" },
    { direction: "Center", pattern: "center|centre|middle" },
  ]

  const directionalLink = "(?:in|at|on|towards|side|zone|corner|me|mai|mein)"
  for (const room of ROOM_TYPES) {
    const roomPattern = roomPatterns[room]
    for (const alias of directionAliases) {
      const roomBefore = new RegExp(`(?:${roomPattern})[\\s\\S]{0,30}${directionalLink}[\\s\\S]{0,20}(?:${alias.pattern})`)
      const dirBefore = new RegExp(`(?:${alias.pattern})[\\s\\S]{0,24}(?:${roomPattern})`)
      if (roomBefore.test(normalized) || dirBefore.test(normalized)) {
        rules.push({ room, direction: alias.direction })
      }
    }
  }

  const dedup = new Map<string, DirectionRule>()
  for (const rule of rules) {
    dedup.set(`${rule.room}:${rule.direction}`, rule)
  }
  return Array.from(dedup.values())
}

function mergeAdjacencyRules(base: AdjacencyRule[], override?: AdjacencyRule[] | null) {
  const merged = new Map<string, AdjacencyRule>()
  for (const rule of base) {
    merged.set(`${rule.room}:${rule.near}`, rule)
  }
  for (const rule of override ?? []) {
    if (!rule?.room || !rule?.near) continue
    merged.set(`${rule.room}:${rule.near}`, rule)
  }
  return Array.from(merged.values())
}

function mergeDirectionRules(base: DirectionRule[], override?: DirectionRule[] | null) {
  const merged = new Map<string, DirectionRule>()
  for (const rule of base) {
    merged.set(`${rule.room}:${rule.direction}`, rule)
  }
  for (const rule of override ?? []) {
    if (!rule?.room || !rule?.direction) continue
    merged.set(`${rule.room}:${rule.direction}`, rule)
  }
  return Array.from(merged.values())
}

function mergeFloorAssignments(base: FloorAssignments, override?: FloorAssignments | null): FloorAssignments {
  const merged: FloorAssignments = {}

  for (const roomType of ROOM_TYPES) {
    const overrideFloors = override?.[roomType]?.filter((floor) => Number.isInteger(floor) && floor >= 0 && floor <= 3)
    if (overrideFloors && overrideFloors.length > 0) {
      merged[roomType] = overrideFloors
      continue
    }
    const baseFloors = base[roomType]?.filter((floor) => Number.isInteger(floor) && floor >= 0 && floor <= 3)
    if (baseFloors && baseFloors.length > 0) {
      merged[roomType] = baseFloors
    }
  }

  return merged
}

function extractModelJson(text: string) {
  const trimmed = text.trim()
  try {
    const direct = aiParsedSchema.safeParse(JSON.parse(trimmed))
    if (direct.success) return direct.data
  } catch {
    // Continue to fallback extraction below.
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const parsed = aiParsedSchema.safeParse(JSON.parse(jsonMatch[0]))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function buildModelPrompt(input: string) {
  return [
    "Parse this house requirement and return JSON only.",
    "Allowed top-level keys:",
    "totalSqFt, floors, bedrooms, kitchens, bathrooms, poojaRooms, storeRooms, verandahRooms, parkingSpaces, gardenAreas, balconyRooms, includeStairs, includeBoundary, includeLandscapeGlass, floorAssignments, lockedRooms, adjacencyRules, directionRules",
    "floorAssignments must be an object with optional keys:",
    "Living, Bedroom, Kitchen, Bathroom, Pooja, Store, Verandah, Parking, Garden, Balcony, Stairs",
    "lockedRooms uses same object shape as floorAssignments for strict floor lock requests.",
    "Each floorAssignments value must be an array of floor indexes (0-based, ground floor = 0).",
    "adjacencyRules must be array of objects: { room, near } using allowed room keys.",
    "directionRules must be array of objects: { room, direction } using direction in North/NorthEast/East/SouthEast/South/SouthWest/West/NorthWest/Center.",
    "Input may be Hindi, Hinglish, English, transliterated, or mixed.",
    "Return compact JSON only. No markdown, no explanation.",
    `User input: ${input}`,
  ].join("\n")
}

async function parseWithGemini(input: string): Promise<AiParsed | null> {
  const { apiKey, textModel } = getGeminiConfig()
  if (!apiKey) return null

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${apiKey}`
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildModelPrompt(input) }] }],
        generationConfig: { temperature: 0.1 },
      }),
    })
    if (!response.ok) return null

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
    }
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || ""
    if (!text) return null
    return extractModelJson(text)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      )
    }
    const session = await verifySessionToken(token)
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      )
    }

    const parsedReq = requestSchema.safeParse(await request.json())
    if (!parsedReq.success) {
      return NextResponse.json({ error: "Invalid wizard input" }, { status: 400 })
    }

    const input = parsedReq.data.input
    const conflicts = detectPromptConflicts(input)
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: `Prompt conflicts: ${conflicts.join(" | ")}`,
          conflicts,
          strictAccepted: false,
        },
        { status: 422, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      )
    }

    const fallbackRequirements = regexFallback(input)
    const fallbackFloorAssignments = parseFloorAssignmentsFallback(input)
    const fallbackLockedRooms = fallbackFloorAssignments
    const fallbackAdjacencyRules = parseAdjacencyRulesFallback(input)
    const fallbackDirectionRules = parseDirectionRulesFallback(input)

    const geminiParsed = await parseWithGemini(input)
    const aiParsed = geminiParsed

    const mergedRequirements = requirementsSchema.parse({
      ...fallbackRequirements,
      ...(aiParsed || {}),
    })
    const mergedFloorAssignments = mergeFloorAssignments(fallbackFloorAssignments, aiParsed?.floorAssignments)
    const mergedLockedRooms = mergeFloorAssignments(
      fallbackLockedRooms,
      aiParsed?.lockedRooms ?? aiParsed?.floorAssignments,
    )
    const mergedAdjacencyRules = mergeAdjacencyRules(fallbackAdjacencyRules, aiParsed?.adjacencyRules)
    const mergedDirectionRules = mergeDirectionRules(fallbackDirectionRules, aiParsed?.directionRules)
    const source: "gemini" | "fallback" = geminiParsed ? "gemini" : "fallback"
    const summaryParts = [
      `${mergedRequirements.bedrooms ?? "?"} bed`,
      `${mergedRequirements.kitchens ?? "?"} kitchen`,
      `${mergedRequirements.bathrooms ?? "?"} bath`,
      `${mergedRequirements.floors ?? 1} floor`,
    ]

    return NextResponse.json(
      {
        requirements: mergedRequirements,
        floorAssignments: mergedFloorAssignments,
        lockedRooms: mergedLockedRooms,
        adjacencyRules: mergedAdjacencyRules,
        directionRules: mergedDirectionRules,
        conflicts: [],
        strictAccepted: true,
        source,
        summary: `${source === "fallback" ? "Smart local parser applied" : "AI parser + local checks applied"}: ${summaryParts.join(", ")}.`,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    )
  } catch {
    return NextResponse.json({ error: "Could not parse requirement" }, { status: 500 })
  }
}
