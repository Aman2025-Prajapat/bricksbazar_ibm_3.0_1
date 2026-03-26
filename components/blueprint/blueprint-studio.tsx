"use client"

import { Suspense, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber"
import { Clone, ContactShadows, Environment, Float, Line, OrbitControls, Text, useGLTF, useTexture } from "@react-three/drei"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Building2, Compass, Home, Loader2, Maximize2, Move, Redo2, Ruler, ShieldAlert, Sparkles, Undo2, Video } from "lucide-react"
import { Box3, Path, RepeatWrapping, SRGBColorSpace, Shape, Vector2, Vector3, type Texture } from "three"
import {
  beamDepthForSpan,
  type CivilInputs,
  detectRoomCollisions,
  detectVentilationIssues,
  estimateRoomMaterials,
  floorCostBreakdown,
  generateColumns,
  plumbingEfficiencyBonus,
  runCodeComplianceChecks,
  runStructuralPrecheck,
  type EngineeringRoom,
} from "@/lib/engineering/calculations"
import { evaluateVastuCompliance, getRoomDirection, type Direction, type PlotFacing } from "@/lib/engineering/vastu-rules"
import { buildFloorDistribution, calcCivilUsableBreakdown } from "@/lib/planning/civil-engine"
import { extractDimensionAreaFromPrompt, parsePromptRoomCounts } from "@/lib/planning/prompt-parser"

type RoomType = "Living" | "Bedroom" | "Kitchen" | "Bathroom" | "Stairs" | "Pooja" | "Verandah" | "Store" | "Parking" | "Garden" | "Balcony"

type RoomConfig = {
  id: string
  type: RoomType
  floor: number
  x: number
  z: number
  w: number
  l: number
  h: number
  color: string
  hasWindow: boolean
  doorWidth?: number
  windowWidth?: number
}

type HouseConfig = {
  totalSqFt: number
  floors: number
  floorHeight: number
  rooms: RoomConfig[]
}

type WallMaterial = "plaster" | "bricks" | "concrete"
type FloorMaterial = "wood" | "marble" | "tiles" | "makrana" | "terracotta"
type OverlayMode = "none" | "electrical" | "plumbing"
type CameraPreset = "default" | "front" | "bird" | "cinematic"
type LightingPreset = "day" | "evening" | "night"
type ModelAvailability = {
  frontDoor: boolean
  livingRoom: boolean
  kitchenRoom: boolean
  bathroomRoom: boolean
  poojaRoom: boolean
  stairsRoom: boolean
  sofa: boolean
  bed: boolean
  sink: boolean
  toilet: boolean
  door: boolean
  window: boolean
}
type RenderQuality = "draft" | "balanced" | "ultra"
type StairCutout = { x: number; z: number; w: number; l: number }
type SnapLink = {
  floor: number
  from: [number, number, number]
  to: [number, number, number]
}
type SnapGuide = {
  floor: number
  x?: number
  z?: number
}
type MarketRates = {
  brickPerPiece: number
  cementPerBag: number
  sandPerTon: number
  steelPerTon: number
}
type PlannerRequirements = {
  bedrooms: number
  kitchens: number
  bathrooms: number
  poojaRooms: number
  storeRooms: number
  verandahRooms: number
  parkingSpaces: number
  gardenAreas: number
  balconyRooms: number
  includeStairs: boolean
  includeBoundary: boolean
  includeLandscapeGlass: boolean
}
type RequirementKey = keyof Omit<PlannerRequirements, "includeStairs" | "includeBoundary" | "includeLandscapeGlass">
type RoomFloorPreferences = Partial<Record<RoomType, number[]>>
type PromptAdjacencyRule = { room: RoomType; near: RoomType }
type PromptDirectionRule = { room: RoomType; direction: Direction }
type PromptConstraintBundle = {
  lockedRooms: RoomFloorPreferences
  adjacencyRules: PromptAdjacencyRule[]
  directionRules: PromptDirectionRule[]
}
type PromptConstraintCheck = {
  id: string
  label: string
  status: "pass" | "fail"
  detail: string
}
type PromptConstraintReport = {
  score: number
  checks: PromptConstraintCheck[]
  failedCount: number
}
type ConstraintValidationReport = PromptConstraintReport & {
  criticalPass: boolean
  blockingReasons: string[]
}
type LayoutValidationReport = {
  valid: boolean
  issues: string[]
  warnings: string[]
  openSpaceLabels: string[]
}
type BathPreference = "auto" | "attached" | "common"
type PlanStyle = "compact" | "balanced" | "luxury"
type StaircaseType = "dog-leg" | "u-shape" | "straight"
type PlanningMode = "prompt" | "manual"
type PlanStage = "draft_requirements" | "suggested_plan" | "editable_plan" | "final_locked"
type CivilAreaBreakdown = {
  grossPlotAreaSqFt: number
  openSpaceDeductionSqFt: number
  wallDeductionSqFt: number
  usablePerFloorSqFt: number
  stairDeductionSqFt: number
  usableTotalSqFt: number
}
type PlannerInputs = {
  frontageFt: number
  depthFt: number
  familySize: number
  elderlyMembers: number
  childrenCount: number
  budgetLakh: number
  cornerPlot: boolean
  futureExpansionYears: number
  parkingRequired: boolean
  bathPreference: BathPreference
  planStyle: PlanStyle
  staircaseType: StaircaseType
  useCustomPlot: boolean
}
type FeasibilityStatus = "feasible" | "partially_feasible" | "not_feasible"
type FeasibilityReport = {
  status: FeasibilityStatus
  reasons: string[]
  suggestions: string[]
  buildablePerFloorSqFt: number
  buildableTotalSqFt: number
  requiredApproxSqFt: number
  civilBreakdown: CivilAreaBreakdown
  floorAllocation: Array<{ floor: number; rooms: string[] }>
}

type StoredBlueprintPayload = {
  houseConfig: HouseConfig
  requirements: {
    bedrooms: number
    kitchens: number
    bathrooms: number
    poojaRooms: number
    storeRooms: number
    verandahRooms: number
    parkingSpaces: number
    gardenAreas: number
    balconyRooms: number
    includeStairs: boolean
    includeBoundary: boolean
    includeLandscapeGlass: boolean
  }
  xray: boolean
  vastuEnabled: boolean
  plotFacing: PlotFacing
  wallMaterial: WallMaterial
  floorMaterial: FloorMaterial
  cameraPreset?: CameraPreset
  lightingPreset?: LightingPreset
  civilInputs?: CivilInputs
  plannerInputs?: PlannerInputs
  strictPlanningMode?: boolean
  planningMode?: PlanningMode
  planStage?: PlanStage
  planLocked?: boolean
  savedPreviewImage?: string | null
  savedFloorPlanImage?: string | null
  savedAt?: string
}

type StudioHistorySnapshot = {
  houseConfig: HouseConfig
  requirements: PlannerRequirements
  plotFacing: PlotFacing
}

type ProjectOwner = {
  id: string
  name: string
  email: string
  role: string
}

type ProjectResponse = {
  project: {
    id: string
    name: string
    jsonLayout: StoredBlueprintPayload
    calculatedMaterials: unknown
    user: ProjectOwner
  }
}

type BlueprintStudioProps = {
  projectId?: string | null
  adminMode?: boolean
}

type ProjectErrorResponse = ProjectResponse & { error?: string }
type ModelAvailabilityApiResponse = { models?: Partial<ModelAvailability> }
type MarketRatesApiResponse = { rates?: Partial<MarketRates>; asOf?: string }
type SurveyImportRecord = {
  fileName: string
  fileType: string
  fileSizeKb: number
  importedAt: string
  inferredPlot: { frontageFt: number; depthFt: number } | null
  notes: string[]
}
type GeoMarketProfile = {
  id: string
  label: string
  materialMultiplier: number
  laborRatePerSqFt: number
  supplierFeed: string
}
type MunicipalityRule = {
  id: string
  label: string
  authority: string
  minFrontSetbackFt: number
  minRearSetbackFt: number
  minSideSetbackFt: number
  maxFsi: number
  maxCoveragePercent: number
  maxHeightFt: number
}
type MunicipalityComplianceCheck = {
  id: string
  label: string
  status: "pass" | "review" | "fail"
  detail: string
  fix: string
}
type MunicipalityComplianceReport = {
  score: number
  status: "PASS" | "REVIEW" | "RISK"
  checks: MunicipalityComplianceCheck[]
  metrics: {
    plotAreaSqFt: number
    totalBuiltAreaSqFt: number
    groundCoverageSqFt: number
    fsi: number
    coveragePercent: number
    buildingHeightFt: number
    frontSetbackFt: number
    rearSetbackFt: number
    sideSetbackFt: number
  }
}
type WizardPatch = Partial<PlannerRequirements> & { totalSqFt?: number; floors?: number }
type PromptPlanSuggestion = {
  id: "prompt_exact" | "compact" | "balanced" | "parking_first"
  label: string
  summary: string
  planStyle: PlanStyle
  patch: WizardPatch
  floorPreferences: RoomFloorPreferences
  feasibility: FeasibilityStatus
  feasibilityNotes: string[]
}
type PipelineStage =
  | "idle"
  | "prompt_analyzed"
  | "suggestion_selected"
  | "plan_applied"
  | "matrix_ready"
  | "constraints_ready"
  | "mismatch_fixed"
  | "preview_ready"
type PipelineState = {
  stage: PipelineStage
  promptAnalyzed: boolean
  suggestionSelected: boolean
  planApplied: boolean
  matrixReady: boolean
  constraintsReady: boolean
  mismatchFixed: boolean
  criticalConstraintsPass: boolean
  previewReady: boolean
  blockingReasons: string[]
}
type ParsedPlan = {
  rawPrompt: string
  patch: WizardPatch
  floorPreferences: RoomFloorPreferences
  constraints: PromptConstraintBundle
  source: "gemini" | "fallback" | "local"
  summary: string
  conflicts: string[]
  missingInputs: string[]
}
type AISuggestion = PromptPlanSuggestion
type GeneratedLayout = {
  rooms: RoomConfig[]
  requirements: PlannerRequirements
  floors: number
  floorHeight: number
  totalSqFt: number
  floorPreferences: RoomFloorPreferences
  planStyle: PlanStyle
  feasibility: FeasibilityReport
  validation: LayoutValidationReport
  forceBestEffort: boolean
}
type RoomMatrixRow = {
  label: string
  roomType: RoomType
  required: number
  built: number
  size: "Valid" | "Compact" | "Invalid"
  access: "Valid" | "Limited" | "Invalid"
  status: "Match" | "Partial" | "Missing"
  note: string
}
type RoomMatrixReport = {
  rows: RoomMatrixRow[]
  score: number
  mismatchCount: number
}
type PromptPipelineContext = {
  parsedPlan: ParsedPlan | null
  generatedLayout: GeneratedLayout | null
  roomMatrixReport: RoomMatrixReport | null
  constraintReport: ConstraintValidationReport | null
}
type PromptAutoMatchResult = {
  layout: GeneratedLayout
  roomMatrixReport: RoomMatrixReport
  constraintReport: ConstraintValidationReport
  floorPreferences: RoomFloorPreferences
}
type PromptModeSnapshot = {
  houseConfig: HouseConfig
  requirements: PlannerRequirements
  lastRequestedRequirements: PlannerRequirements
  lastFeasibilityNotes: string[]
  layoutValidationReport: LayoutValidationReport | null
  feasibilityReport: FeasibilityReport | null
  selectedRoomId: string | null
  roomFloorPreferences: RoomFloorPreferences
  plannerInputs: PlannerInputs
  plotFacing: PlotFacing
  planStage: PlanStage
  wizardInput: string
  wizardSuggestions: PromptPlanSuggestion[]
  selectedWizardSuggestionId: PromptPlanSuggestion["id"] | null
  lastPromptPatch: WizardPatch | null
  promptConstraints: PromptConstraintBundle
  promptPipelineState: PipelineState
  promptPipelineContext: PromptPipelineContext
  promptDraftDirty: boolean
  promptSiteFamilyEnabled: boolean
  previewPrompt: string
}
type ManualModeSnapshot = {
  houseConfig: HouseConfig
  requirements: PlannerRequirements
  lastRequestedRequirements: PlannerRequirements
  lastFeasibilityNotes: string[]
  layoutValidationReport: LayoutValidationReport | null
  feasibilityReport: FeasibilityReport | null
  selectedRoomId: string | null
  roomFloorPreferences: RoomFloorPreferences
  plannerInputs: PlannerInputs
  plotFacing: PlotFacing
  planStage: PlanStage
  manualPlannerFloor: number
  manualAreaOverrideEnabled: boolean
  previewPrompt: string
}
const ROOM_PRESETS: Record<RoomType, { w: number; l: number; h: number; color: string }> = {
  Living: { w: 14, l: 16, h: 10, color: "#64748b" },
  Bedroom: { w: 12, l: 12, h: 10, color: "#818cf8" },
  Kitchen: { w: 8, l: 10, h: 10, color: "#f59e0b" },
  Bathroom: { w: 6, l: 8, h: 9, color: "#38bdf8" },
  Stairs: { w: 4, l: 10, h: 10, color: "#16a34a" },
  Pooja: { w: 4, l: 4, h: 9, color: "#facc15" },
  Verandah: { w: 10, l: 8, h: 9, color: "#22c55e" },
  Store: { w: 6, l: 6, h: 9, color: "#a16207" },
  Parking: { w: 10, l: 16, h: 9, color: "#64748b" },
  Garden: { w: 10, l: 12, h: 9, color: "#16a34a" },
  Balcony: { w: 8, l: 5, h: 9, color: "#93c5fd" },
}
const MIN_ROOM_DIMENSIONS: Partial<Record<RoomType, { w: number; l: number }>> = {
  Living: { w: 10, l: 14 },
  Bedroom: { w: 10, l: 12 },
  Kitchen: { w: 8, l: 10 },
  Bathroom: { w: 5, l: 7 },
  Pooja: { w: 4, l: 5 },
  Store: { w: 5, l: 6 },
  Parking: { w: 9, l: 15 },
  Stairs: { w: 6, l: 10 },
  Balcony: { w: 4, l: 5 },
}
const ROOM_NEED_LIMITS: Record<RequirementKey, number> = {
  bedrooms: 8,
  kitchens: 4,
  bathrooms: 8,
  poojaRooms: 2,
  storeRooms: 3,
  verandahRooms: 2,
  parkingSpaces: 2,
  gardenAreas: 2,
  balconyRooms: 3,
}
const INDIAN_ADJACENCY_MATRIX: Array<{ room: RoomType; near: string; avoid?: string }> = [
  { room: "Parking", near: "Front boundary, Living/Entrance" },
  { room: "Living", near: "Entrance, Kitchen, Stairs" },
  { room: "Kitchen", near: "Living, Store" },
  { room: "Bedroom", near: "Bathroom, Quiet corners" },
  { room: "Bathroom", near: "Bedroom/Living access", avoid: "Direct Kitchen edge" },
  { room: "Pooja", near: "Living/Dining side, Quiet corner", avoid: "Bathroom edge" },
  { room: "Store", near: "Kitchen" },
  { room: "Verandah", near: "Front edge, Living" },
  { room: "Balcony", near: "Front/Side open edge" },
  { room: "Stairs", near: "Common access (Living/Lobby)" },
]
const REQUIREMENT_METRIC_ROWS: Array<{ key: RequirementKey; roomType: RoomType; label: string }> = [
  { key: "bedrooms", roomType: "Bedroom", label: "Bedroom" },
  { key: "kitchens", roomType: "Kitchen", label: "Kitchen" },
  { key: "bathrooms", roomType: "Bathroom", label: "Bath" },
  { key: "poojaRooms", roomType: "Pooja", label: "Pooja" },
  { key: "storeRooms", roomType: "Store", label: "Store" },
  { key: "verandahRooms", roomType: "Verandah", label: "Verandah" },
  { key: "parkingSpaces", roomType: "Parking", label: "Parking" },
  { key: "gardenAreas", roomType: "Garden", label: "Garden" },
  { key: "balconyRooms", roomType: "Balcony", label: "Balcony" },
]
const DIRECTION_VALUES: Direction[] = ["North", "NorthEast", "East", "SouthEast", "South", "SouthWest", "West", "NorthWest", "Center"]
const EMPTY_PROMPT_CONSTRAINTS: PromptConstraintBundle = {
  lockedRooms: {},
  adjacencyRules: [],
  directionRules: [],
}
const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  "idle",
  "prompt_analyzed",
  "suggestion_selected",
  "plan_applied",
  "matrix_ready",
  "constraints_ready",
  "mismatch_fixed",
  "preview_ready",
]
const INITIAL_PROMPT_PIPELINE_STATE: PipelineState = {
  stage: "idle",
  promptAnalyzed: false,
  suggestionSelected: false,
  planApplied: false,
  matrixReady: false,
  constraintsReady: false,
  mismatchFixed: false,
  criticalConstraintsPass: false,
  previewReady: false,
  blockingReasons: [],
}
const INITIAL_PROMPT_PIPELINE_CONTEXT: PromptPipelineContext = {
  parsedPlan: null,
  generatedLayout: null,
  roomMatrixReport: null,
  constraintReport: null,
}
const SOFT_FEASIBILITY_REASONS = [
  "bedroom count is low for large family size",
  "elderly members detected",
  "future expansion requested soon",
  "budget appears tight",
  "attached bath preference conflicts",
]
const CRITICAL_FEASIBILITY_REASONS = [
  "required program area exceeds estimated buildable area",
  "frontage is too narrow for standard parking bay",
]
function hasReachedPromptStage(current: PipelineStage, target: PipelineStage) {
  return PIPELINE_STAGE_ORDER.indexOf(current) >= PIPELINE_STAGE_ORDER.indexOf(target)
}
function createPromptPipelineState(stage: PipelineStage, overrides: Partial<PipelineState> = {}): PipelineState {
  return {
    stage,
    promptAnalyzed: hasReachedPromptStage(stage, "prompt_analyzed"),
    suggestionSelected: hasReachedPromptStage(stage, "suggestion_selected"),
    planApplied: hasReachedPromptStage(stage, "plan_applied"),
    matrixReady: hasReachedPromptStage(stage, "matrix_ready"),
    constraintsReady: hasReachedPromptStage(stage, "constraints_ready"),
    mismatchFixed: hasReachedPromptStage(stage, "mismatch_fixed"),
    criticalConstraintsPass: stage === "preview_ready",
    previewReady: stage === "preview_ready",
    blockingReasons: [],
    ...overrides,
  }
}
function normalizeSuggestionFeasibility(feasibility: FeasibilityReport): FeasibilityStatus {
  const reasons = feasibility.reasons.map((reason) => reason.toLowerCase())
  const overloadRatio = feasibility.requiredApproxSqFt / Math.max(feasibility.buildableTotalSqFt, 1)
  const hasCriticalReason = reasons.some((reason) => CRITICAL_FEASIBILITY_REASONS.some((critical) => reason.includes(critical)))
  const hardReasonCount = reasons.filter((reason) => !SOFT_FEASIBILITY_REASONS.some((soft) => reason.includes(soft))).length

  if (hasCriticalReason || overloadRatio > 1.08) return "not_feasible"
  if (hardReasonCount === 0 && overloadRatio <= 1.03) return "feasible"
  if (overloadRatio > 1.03 || hardReasonCount >= 2) return "partially_feasible"
  return hardReasonCount === 0 ? "feasible" : "partially_feasible"
}
const DEFAULT_REQUIREMENTS: PlannerRequirements = {
  bedrooms: 2,
  kitchens: 1,
  bathrooms: 2,
  poojaRooms: 1,
  storeRooms: 1,
  verandahRooms: 1,
  parkingSpaces: 1,
  gardenAreas: 1,
  balconyRooms: 1,
  includeStairs: true,
  includeBoundary: true,
  includeLandscapeGlass: true,
}
const ROOM_TYPE_OPTIONS: RoomType[] = ["Living", "Bedroom", "Kitchen", "Bathroom", "Stairs", "Pooja", "Verandah", "Store", "Parking", "Garden", "Balcony"]
const DEFAULT_MARKET_RATES: MarketRates = {
  brickPerPiece: 8.5,
  cementPerBag: 420,
  sandPerTon: 1200,
  steelPerTon: 62000,
}
const DEFAULT_PLANNER_INPUTS: PlannerInputs = {
  frontageFt: 30,
  depthFt: 40,
  familySize: 4,
  elderlyMembers: 0,
  childrenCount: 0,
  budgetLakh: 35,
  cornerPlot: false,
  futureExpansionYears: 5,
  parkingRequired: true,
  bathPreference: "auto",
  planStyle: "balanced",
  staircaseType: "dog-leg",
  useCustomPlot: false,
}
const DEFAULT_HOUSE_CONFIG = (): HouseConfig => ({
  totalSqFt: 1200,
  floors: 1,
  floorHeight: 10,
  rooms: [
    { id: "room-living-1", type: "Living", floor: 0, x: 0, z: 0, hasWindow: true, doorWidth: 0.95, windowWidth: 1.2, ...ROOM_PRESETS.Living },
    { id: "room-kitchen-1", type: "Kitchen", floor: 0, x: -7, z: -5, hasWindow: true, doorWidth: 0.95, windowWidth: 1.2, ...ROOM_PRESETS.Kitchen },
    { id: "room-bath-1", type: "Bathroom", floor: 0, x: 8, z: -6, hasWindow: true, doorWidth: 0.9, windowWidth: 1.0, ...ROOM_PRESETS.Bathroom },
  ],
})
const DEFAULT_PROMPT_MODE_SNAPSHOT = (): PromptModeSnapshot => ({
  houseConfig: DEFAULT_HOUSE_CONFIG(),
  requirements: deepClone(DEFAULT_REQUIREMENTS),
  lastRequestedRequirements: deepClone(DEFAULT_REQUIREMENTS),
  lastFeasibilityNotes: [],
  layoutValidationReport: null,
  feasibilityReport: null,
  selectedRoomId: null,
  roomFloorPreferences: {},
  plannerInputs: deepClone(DEFAULT_PLANNER_INPUTS),
  plotFacing: "North",
  planStage: "draft_requirements",
  wizardInput: "",
  wizardSuggestions: [],
  selectedWizardSuggestionId: null,
  lastPromptPatch: null,
  promptConstraints: deepClone(EMPTY_PROMPT_CONSTRAINTS),
  promptPipelineState: deepClone(INITIAL_PROMPT_PIPELINE_STATE),
  promptPipelineContext: deepClone(INITIAL_PROMPT_PIPELINE_CONTEXT),
  promptDraftDirty: false,
  promptSiteFamilyEnabled: false,
  previewPrompt: "",
})
const DEFAULT_MANUAL_MODE_SNAPSHOT = (): ManualModeSnapshot => ({
  houseConfig: DEFAULT_HOUSE_CONFIG(),
  requirements: deepClone(DEFAULT_REQUIREMENTS),
  lastRequestedRequirements: deepClone(DEFAULT_REQUIREMENTS),
  lastFeasibilityNotes: [],
  layoutValidationReport: null,
  feasibilityReport: null,
  selectedRoomId: null,
  roomFloorPreferences: {},
  plannerInputs: {
    ...deepClone(DEFAULT_PLANNER_INPUTS),
    useCustomPlot: true,
  },
  plotFacing: "North",
  planStage: "draft_requirements",
  manualPlannerFloor: 0,
  manualAreaOverrideEnabled: false,
  previewPrompt: "",
})

const MODEL_PATHS = {
  frontDoor: "/models/front-gate-door.glb",
  livingRoom: "/models/living-room.glb",
  kitchenRoom: "/models/kitchen-room.glb",
  bathroomRoom: "/models/bathroom-room.glb",
  poojaRoom: "/models/pooja-room.glb",
  stairsRoom: "/models/stairs-room.glb",
  sofa: "/models/sofa.glb",
  bed: "/models/bed.glb",
  sink: "/models/sink.glb",
  toilet: "/models/toilet.glb",
  door: "/models/door-frame.glb",
  window: "/models/window-frame.glb",
}
const BLUEPRINT_STORAGE_KEY = "bb_blueprint_studio_v2"
const MODELS_CACHE_TTL_MS = 60_000
const MARKET_RATES_CACHE_TTL_MS = 60_000
const SURVEY_FILE_ACCEPT = ".dxf,.dwg,.cad,.pdf"
const GEO_MARKET_PROFILES: GeoMarketProfile[] = [
  { id: "national", label: "National Average", materialMultiplier: 1, laborRatePerSqFt: 240, supplierFeed: "All-India blended feed" },
  { id: "mumbai", label: "Mumbai Metro", materialMultiplier: 1.19, laborRatePerSqFt: 340, supplierFeed: "BMC metro supplier index" },
  { id: "delhi", label: "Delhi NCR", materialMultiplier: 1.12, laborRatePerSqFt: 305, supplierFeed: "NCR construction basket" },
  { id: "bengaluru", label: "Bengaluru", materialMultiplier: 1.1, laborRatePerSqFt: 295, supplierFeed: "South urban contractor rates" },
  { id: "hyderabad", label: "Hyderabad", materialMultiplier: 1.06, laborRatePerSqFt: 275, supplierFeed: "GHMC regional feed" },
  { id: "pune", label: "Pune", materialMultiplier: 1.04, laborRatePerSqFt: 260, supplierFeed: "PMC market blend" },
]
const MUNICIPALITY_RULES: MunicipalityRule[] = [
  { id: "mumbai-bmc", label: "Mumbai (BMC)", authority: "Brihanmumbai Municipal Corporation", minFrontSetbackFt: 6, minRearSetbackFt: 5, minSideSetbackFt: 4, maxFsi: 2.5, maxCoveragePercent: 65, maxHeightFt: 70 },
  { id: "delhi-mcd", label: "Delhi (MCD)", authority: "Municipal Corporation of Delhi", minFrontSetbackFt: 8, minRearSetbackFt: 6, minSideSetbackFt: 5, maxFsi: 2, maxCoveragePercent: 60, maxHeightFt: 58 },
  { id: "bengaluru-bbmp", label: "Bengaluru (BBMP)", authority: "Bruhat Bengaluru Mahanagara Palike", minFrontSetbackFt: 7, minRearSetbackFt: 5, minSideSetbackFt: 4, maxFsi: 1.75, maxCoveragePercent: 60, maxHeightFt: 52 },
  { id: "hyderabad-ghmc", label: "Hyderabad (GHMC)", authority: "Greater Hyderabad Municipal Corporation", minFrontSetbackFt: 6, minRearSetbackFt: 5, minSideSetbackFt: 4, maxFsi: 2.2, maxCoveragePercent: 62, maxHeightFt: 60 },
  { id: "pune-pmc", label: "Pune (PMC)", authority: "Pune Municipal Corporation", minFrontSetbackFt: 7, minRearSetbackFt: 5, minSideSetbackFt: 4, maxFsi: 1.8, maxCoveragePercent: 58, maxHeightFt: 55 },
]
let modelAvailabilityCache: { value: ModelAvailability; fetchedAt: number } | null = null
let modelAvailabilityPromise: Promise<ModelAvailability | null> | null = null
let marketRatesCache: { value: { rates: MarketRates; asOf: string }; fetchedAt: number } | null = null
let marketRatesPromise: Promise<{ rates: MarketRates; asOf: string } | null> | null = null

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeModelAvailability(models?: Partial<ModelAvailability>): ModelAvailability {
  return {
    frontDoor: Boolean(models?.frontDoor),
    livingRoom: Boolean(models?.livingRoom),
    kitchenRoom: Boolean(models?.kitchenRoom),
    bathroomRoom: Boolean(models?.bathroomRoom),
    poojaRoom: Boolean(models?.poojaRoom),
    stairsRoom: Boolean(models?.stairsRoom),
    sofa: Boolean(models?.sofa),
    bed: Boolean(models?.bed),
    sink: Boolean(models?.sink),
    toilet: Boolean(models?.toilet),
    door: Boolean(models?.door),
    window: Boolean(models?.window),
  }
}

async function fetchModelAvailabilityShared(force = false): Promise<ModelAvailability | null> {
  const now = Date.now()
  if (!force && modelAvailabilityCache && now - modelAvailabilityCache.fetchedAt < MODELS_CACHE_TTL_MS) {
    return modelAvailabilityCache.value
  }

  if (!force && modelAvailabilityPromise) {
    return modelAvailabilityPromise
  }

  modelAvailabilityPromise = (async () => {
    try {
      const response = await fetch("/api/models/availability", { cache: "no-store" })
      if (!response.ok) return null
      const data = await parseJsonSafely<ModelAvailabilityApiResponse>(response)
      const nextValue = normalizeModelAvailability(data?.models)
      modelAvailabilityCache = { value: nextValue, fetchedAt: Date.now() }
      return nextValue
    } catch {
      return null
    } finally {
      modelAvailabilityPromise = null
    }
  })()

  return modelAvailabilityPromise
}

async function fetchMarketRatesShared(force = false): Promise<{ rates: MarketRates; asOf: string } | null> {
  const now = Date.now()
  if (!force && marketRatesCache && now - marketRatesCache.fetchedAt < MARKET_RATES_CACHE_TTL_MS) {
    return marketRatesCache.value
  }

  if (!force && marketRatesPromise) {
    return marketRatesPromise
  }

  marketRatesPromise = (async () => {
    try {
      const response = await fetch("/api/market-rates", { cache: "no-store" })
      if (!response.ok) return null
      const data = await parseJsonSafely<MarketRatesApiResponse>(response)
      if (!data?.rates) return null
      const nextValue = {
        rates: {
          brickPerPiece: data.rates.brickPerPiece ?? DEFAULT_MARKET_RATES.brickPerPiece,
          cementPerBag: data.rates.cementPerBag ?? DEFAULT_MARKET_RATES.cementPerBag,
          sandPerTon: data.rates.sandPerTon ?? DEFAULT_MARKET_RATES.sandPerTon,
          steelPerTon: data.rates.steelPerTon ?? DEFAULT_MARKET_RATES.steelPerTon,
        },
        asOf: typeof data.asOf === "string" && data.asOf.trim() ? data.asOf : new Date().toISOString(),
      }
      marketRatesCache = { value: nextValue, fetchedAt: Date.now() }
      return nextValue
    } catch {
      return null
    } finally {
      marketRatesPromise = null
    }
  })()

  return marketRatesPromise
}

function getWallTexturePath(material: WallMaterial) {
  if (material === "bricks") return "/concrete-blocks-construction.jpg"
  if (material === "concrete") return "/placeholder.jpg"
  return "/placeholder-3xzl5.png"
}

function getFloorTexturePath(material: FloorMaterial) {
  if (material === "wood") return "/placeholder-6uupg.png"
  if (material === "marble") return "/placeholder-grddj.png"
  if (material === "makrana") return "/placeholder-grddj.png"
  if (material === "terracotta") return "/placeholder-i6omq.png"
  return "/placeholder-i6omq.png"
}

function getWallRoughnessPath(material: WallMaterial) {
  if (material === "bricks") return "/placeholder-uvsgw.png"
  if (material === "concrete") return "/placeholder.jpg"
  return "/placeholder-3xzl5.png"
}

function getWallNormalPath(material: WallMaterial) {
  if (material === "bricks") return "/placeholder-6uupg.png"
  if (material === "concrete") return "/placeholder.jpg"
  return "/placeholder-grddj.png"
}

function getFloorRoughnessPath(material: FloorMaterial) {
  if (material === "wood") return "/placeholder-3xzl5.png"
  if (material === "marble" || material === "makrana") return "/placeholder-grddj.png"
  return "/placeholder-i6omq.png"
}

function getFloorNormalPath(material: FloorMaterial) {
  if (material === "wood") return "/placeholder-6uupg.png"
  if (material === "marble" || material === "makrana") return "/placeholder-grddj.png"
  return "/placeholder-uvsgw.png"
}

function tuneTexture(texture: Texture, repeatX: number, repeatY: number, useSrgb = true) {
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(Math.max(repeatX, 1), Math.max(repeatY, 1))
  if (useSrgb) {
    texture.colorSpace = SRGBColorSpace
  }
}

function getRenderQualityFromSlider(value: number): RenderQuality {
  if (value < 35) return "draft"
  if (value < 70) return "balanced"
  return "ultra"
}

function getRenderQualityLabel(value: number) {
  const quality = getRenderQualityFromSlider(value)
  if (quality === "draft") return "Draft"
  if (quality === "balanced") return "Balanced"
  return "Ultra"
}

function clamp(v: number, min: number, max: number) {
  if (Number.isNaN(v)) return min
  return Math.min(Math.max(v, min), max)
}

function normalizePlannerInputs(value?: Partial<PlannerInputs>): PlannerInputs {
  return {
    frontageFt: clamp(value?.frontageFt ?? DEFAULT_PLANNER_INPUTS.frontageFt, 12, 100),
    depthFt: clamp(value?.depthFt ?? DEFAULT_PLANNER_INPUTS.depthFt, 20, 120),
    familySize: Math.round(clamp(value?.familySize ?? DEFAULT_PLANNER_INPUTS.familySize, 1, 20)),
    elderlyMembers: Math.round(clamp(value?.elderlyMembers ?? DEFAULT_PLANNER_INPUTS.elderlyMembers, 0, 8)),
    childrenCount: Math.round(clamp(value?.childrenCount ?? DEFAULT_PLANNER_INPUTS.childrenCount, 0, 10)),
    budgetLakh: clamp(value?.budgetLakh ?? DEFAULT_PLANNER_INPUTS.budgetLakh, 0, 1000),
    cornerPlot: Boolean(value?.cornerPlot ?? DEFAULT_PLANNER_INPUTS.cornerPlot),
    futureExpansionYears: Math.round(clamp(value?.futureExpansionYears ?? DEFAULT_PLANNER_INPUTS.futureExpansionYears, 0, 30)),
    parkingRequired: Boolean(value?.parkingRequired ?? DEFAULT_PLANNER_INPUTS.parkingRequired),
    bathPreference: value?.bathPreference ?? DEFAULT_PLANNER_INPUTS.bathPreference,
    planStyle: value?.planStyle ?? DEFAULT_PLANNER_INPUTS.planStyle,
    staircaseType: value?.staircaseType ?? DEFAULT_PLANNER_INPUTS.staircaseType,
    useCustomPlot: Boolean(value?.useCustomPlot ?? DEFAULT_PLANNER_INPUTS.useCustomPlot),
  }
}

function getMaxFloorsForPlotArea(totalSqFt: number) {
  if (totalSqFt <= 350) return 1
  if (totalSqFt <= 700) return 2
  if (totalSqFt <= 1300) return 3
  return 4
}

function getRecommendedBhkByEffectiveArea(effectiveArea: number) {
  if (effectiveArea < 500) return 1
  if (effectiveArea < 950) return 2
  if (effectiveArea < 1500) return 3
  return 4
}

function getBhkDefaults(bhk: number): Partial<PlannerRequirements> {
  if (bhk <= 1) {
    return {
      bedrooms: 1,
      kitchens: 1,
      bathrooms: 1,
      poojaRooms: 0,
      storeRooms: 0,
      verandahRooms: 0,
      balconyRooms: 0,
      parkingSpaces: 0,
      gardenAreas: 0,
    }
  }
  if (bhk === 2) {
    return {
      bedrooms: 2,
      kitchens: 1,
      bathrooms: 2,
      poojaRooms: 1,
      storeRooms: 1,
      verandahRooms: 0,
      balconyRooms: 1,
      parkingSpaces: 1,
      gardenAreas: 0,
    }
  }
  if (bhk === 3) {
    return {
      bedrooms: 3,
      kitchens: 1,
      bathrooms: 3,
      poojaRooms: 1,
      storeRooms: 1,
      verandahRooms: 1,
      balconyRooms: 1,
      parkingSpaces: 1,
      gardenAreas: 1,
    }
  }
  return {
    bedrooms: 4,
    kitchens: 1,
    bathrooms: 4,
    poojaRooms: 1,
    storeRooms: 1,
    verandahRooms: 1,
    balconyRooms: 2,
    parkingSpaces: 2,
    gardenAreas: 1,
  }
}

function enforceRealWorldFeasibility({
  totalSqFt,
  floors,
  requirements,
}: {
  totalSqFt: number
  floors: number
  requirements: PlannerRequirements
}) {
  const notes: string[] = []
  const safeTotalSqFt = clamp(totalSqFt, 200, 10000)
  const maxFloors = getMaxFloorsForPlotArea(safeTotalSqFt)
  let safeFloors = Math.round(clamp(floors, 1, maxFloors))
  if (safeFloors !== floors) {
    notes.push(`Floors limited to ${safeFloors} for ${safeTotalSqFt.toFixed(0)} sq ft plot`)
  }

  if (safeTotalSqFt <= 320 && safeFloors > 1) {
    safeFloors = 1
    notes.push("Small plot mode applied (single-floor compact home)")
  }

  const effectiveBuiltArea = safeTotalSqFt * safeFloors * 0.75
  const maxBedrooms = getRecommendedBhkByEffectiveArea(effectiveBuiltArea)
  const normalizedBedrooms = Math.round(clamp(requirements.bedrooms, 1, maxBedrooms))
  if (normalizedBedrooms !== requirements.bedrooms) {
    notes.push(`Bedrooms adjusted to ${normalizedBedrooms} (realistic ${maxBedrooms} BHK cap)`)
  }

  const maxKitchens = normalizedBedrooms >= 4 && effectiveBuiltArea >= 2200 ? 2 : 1
  const normalizedKitchens = Math.round(clamp(requirements.kitchens, 1, maxKitchens))
  if (normalizedKitchens !== requirements.kitchens) {
    notes.push(`Kitchens adjusted to ${normalizedKitchens}`)
  }

  const minBathrooms = 1
  const maxBathrooms = Math.min(ROOM_NEED_LIMITS.bathrooms, normalizedBedrooms + 1)
  const normalizedBathrooms = Math.round(clamp(requirements.bathrooms, minBathrooms, maxBathrooms))
  if (normalizedBathrooms !== requirements.bathrooms) {
    notes.push(`Bathrooms adjusted to ${normalizedBathrooms}`)
  }

  const poojaMax = safeTotalSqFt >= 450 ? 1 : 0
  const storeMax = safeTotalSqFt >= 650 ? 1 : 0
  const verandahMax = safeTotalSqFt >= 850 ? 1 : 0
  const parkingMax = safeTotalSqFt >= 650 ? (safeTotalSqFt >= 1700 ? 2 : 1) : 0
  const gardenMax = safeTotalSqFt >= 900 ? (safeTotalSqFt >= 2600 ? 2 : 1) : 0
  const balconyMax = safeFloors > 1 ? (safeTotalSqFt >= 900 ? 2 : 1) : 0

  const nextRequirements: PlannerRequirements = {
    bedrooms: normalizedBedrooms,
    kitchens: normalizedKitchens,
    bathrooms: normalizedBathrooms,
    poojaRooms: Math.round(clamp(requirements.poojaRooms, 0, poojaMax)),
    storeRooms: Math.round(clamp(requirements.storeRooms, 0, storeMax)),
    verandahRooms: Math.round(clamp(requirements.verandahRooms, 0, verandahMax)),
    parkingSpaces: Math.round(clamp(requirements.parkingSpaces, 0, parkingMax)),
    gardenAreas: Math.round(clamp(requirements.gardenAreas, 0, gardenMax)),
    balconyRooms: Math.round(clamp(requirements.balconyRooms, 0, balconyMax)),
    includeStairs: safeFloors > 1,
    includeBoundary: requirements.includeBoundary,
    includeLandscapeGlass: requirements.includeLandscapeGlass,
  }

  if (safeTotalSqFt <= 320) {
    nextRequirements.poojaRooms = 0
    nextRequirements.storeRooms = 0
    nextRequirements.verandahRooms = 0
    nextRequirements.parkingSpaces = 0
    nextRequirements.gardenAreas = 0
    nextRequirements.balconyRooms = 0
    nextRequirements.includeStairs = false
    nextRequirements.bedrooms = 1
    nextRequirements.kitchens = 1
    nextRequirements.bathrooms = 1
  }

  return {
    totalSqFt: safeTotalSqFt,
    floors: safeFloors,
    requirements: nextRequirements,
    notes,
  }
}

function normalizePromptInput(input: string) {
  const normalized = input.toLowerCase()
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
    .replace(/\bsidhi\b/g, "stairs")
    .replace(/\bseedhi\b/g, "stairs")
    .replace(/\bseedi\b/g, "stairs")
    .replace(/\bstairis\b/g, "stairs")
    .replace(/\bstaris\b/g, "stairs")
    .replace(/\bbath\s*room\b/g, "bathroom")
    .replace(/\bsquare\s*(fir|fit|feets?)\b/g, "square feet")
    .replace(/\bbalconey\b/g, "balcony")
    .replace(/\bboucany\b/g, "balcony")
    .replace(/\bbalkoni\b/g, "balcony")
    .replace(/\blivng\b/g, "living")
    .replace(/\bcar\s*parking\b/g, "parking")
    .replace(/\bgaadi\s*parking\b/g, "parking")
    .replace(/\bvehicle\s*parking\b/g, "parking")
    .replace(/\bghar\s*ke\s*samne\b/g, "front")
    .replace(/\bghar\s*ke\s*piche\b/g, "rear")
    .replace(/\bdoosra\b/g, "dusra")
    .replace(/\bdoosre\b/g, "dusra")
}

function parseFloorRoomPreferences(input: string): RoomFloorPreferences {
  const normalized = normalizePromptInput(input)
  const roomPatterns: Array<{ type: RoomType; pattern: string }> = [
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
  if (markers.length === 0) {
    const inferredFloorMatch = normalized.match(/(\d)\s*(?:floor|floors|storey|storeys|story|stories|level|tala|tal|manzil)\b/)
    const inferredFloors = inferredFloorMatch?.[1]
      ? Math.max(1, Math.min(Number.parseInt(inferredFloorMatch[1], 10), 4))
      : /\b(duplex|double\s*storey|double\s*story|two\s*storey|two\s*story)\b/.test(normalized)
        ? 2
        : 1
    const detectedRooms = parsePromptRoomCounts(normalized) as Partial<Record<RoomType, number>>
    if (Object.keys(detectedRooms).length === 0 || inferredFloors <= 1) return {}
    return buildFloorDistribution(detectedRooms, inferredFloors) as RoomFloorPreferences
  }

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

  const preferences: RoomFloorPreferences = {}
  const addRoomCount = (type: RoomType, floor: number, count: number) => {
    if (count <= 0) return
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

  return preferences
}

function inferFloorCountFromPreferences(preferences: RoomFloorPreferences) {
  const allFloors = Object.values(preferences).flat()
  if (allFloors.length === 0) return undefined
  const maxFloor = Math.max(...allFloors)
  return Number.isFinite(maxFloor) ? maxFloor + 1 : undefined
}

function mergeFloorPreferences(base: RoomFloorPreferences, override?: RoomFloorPreferences | null): RoomFloorPreferences {
  const merged: RoomFloorPreferences = {}
  const roomTypes = Object.keys(ROOM_PRESETS) as RoomType[]

  for (const roomType of roomTypes) {
    const overrideFloors = override?.[roomType]?.filter((floor) => Number.isInteger(floor) && floor >= 0 && floor <= 3)
    if (overrideFloors && overrideFloors.length > 0) {
      merged[roomType] = [...overrideFloors]
      continue
    }

    const baseFloors = base[roomType]?.filter((floor) => Number.isInteger(floor) && floor >= 0 && floor <= 3)
    if (baseFloors && baseFloors.length > 0) {
      merged[roomType] = [...baseFloors]
    }
  }

  return merged
}

function sanitizePromptAdjacencyRules(rules?: PromptAdjacencyRule[] | null): PromptAdjacencyRule[] {
  if (!rules || rules.length === 0) return []
  const dedup = new Map<string, PromptAdjacencyRule>()
  for (const rule of rules) {
    if (!rule?.room || !rule?.near) continue
    if (!ROOM_TYPE_OPTIONS.includes(rule.room) || !ROOM_TYPE_OPTIONS.includes(rule.near)) continue
    dedup.set(`${rule.room}:${rule.near}`, { room: rule.room, near: rule.near })
  }
  return Array.from(dedup.values())
}

function sanitizePromptDirectionRules(rules?: PromptDirectionRule[] | null): PromptDirectionRule[] {
  if (!rules || rules.length === 0) return []
  const dedup = new Map<string, PromptDirectionRule>()
  for (const rule of rules) {
    if (!rule?.room || !rule?.direction) continue
    if (!ROOM_TYPE_OPTIONS.includes(rule.room) || !DIRECTION_VALUES.includes(rule.direction)) continue
    dedup.set(`${rule.room}:${rule.direction}`, { room: rule.room, direction: rule.direction })
  }
  return Array.from(dedup.values())
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "yes", "1", "required", "on"].includes(normalized)) return true
    if (["false", "no", "0", "not required", "off"].includes(normalized)) return false
  }
  return undefined
}

function sanitizeWizardPatch(patch?: WizardPatch | null): WizardPatch {
  if (!patch) return {}
  const source = patch as Record<string, unknown>
  const sanitized: WizardPatch = {}

  const totalSqFt = toOptionalNumber(source.totalSqFt)
  if (totalSqFt !== undefined) sanitized.totalSqFt = clamp(totalSqFt, 200, 10000)

  const floors = toOptionalNumber(source.floors)
  if (floors !== undefined) sanitized.floors = Math.round(clamp(floors, 1, 4))

  const applyCount = (key: RequirementKey, min: number, max: number) => {
    const value = toOptionalNumber(source[key])
    if (value === undefined) return
    sanitized[key] = Math.round(clamp(value, min, max))
  }

  applyCount("bedrooms", 0, 8)
  applyCount("kitchens", 0, 4)
  applyCount("bathrooms", 0, 8)
  applyCount("poojaRooms", 0, 2)
  applyCount("storeRooms", 0, 3)
  applyCount("verandahRooms", 0, 2)
  applyCount("parkingSpaces", 0, 2)
  applyCount("gardenAreas", 0, 2)
  applyCount("balconyRooms", 0, 3)

  const includeStairs = toOptionalBoolean(source.includeStairs)
  if (includeStairs !== undefined) sanitized.includeStairs = includeStairs

  const includeBoundary = toOptionalBoolean(source.includeBoundary)
  if (includeBoundary !== undefined) sanitized.includeBoundary = includeBoundary

  const includeLandscapeGlass = toOptionalBoolean(source.includeLandscapeGlass)
  if (includeLandscapeGlass !== undefined) sanitized.includeLandscapeGlass = includeLandscapeGlass

  return sanitized
}

function parseWizardInputLocally(input: string): Partial<PlannerRequirements> & { totalSqFt?: number; floors?: number } {
  const withWordNumbers = normalizePromptInput(input)
  const extract = (pattern: RegExp) => {
    const match = withWordNumbers.match(pattern)
    return match?.[1] ? Number.parseInt(match[1], 10) : undefined
  }
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const hasNegation = (terms: string[]) => {
    const joined = terms.map(escapeRegex).join("|")
    const before = new RegExp(`\\b(?:no|without|exclude|excluding|remove|skip)\\s+(?:\\w+\\s+){0,3}(?:${joined})\\b`)
    const after = new RegExp(`\\b(?:${joined})\\b\\s+(?:not\\s+required|not\\s+needed|nahi|nahin|mat)\\b`)
    return before.test(withWordNumbers) || after.test(withWordNumbers)
  }

  const dimensions = extractDimensionAreaFromPrompt(withWordNumbers)
  const dimensionArea = dimensions ? clamp(dimensions.totalSqFt, 200, 10000) : undefined
  const totalSqFt =
    extract(/(\d{3,5})\s*(sq\s*ft|sqft|square(?:\s*(?:feet|foot|ft|fit|fir|feets?))?|sft|sq\.?\s?feet)/) ??
    (typeof dimensionArea === "number" ? Math.round(dimensionArea) : undefined)
  const floors =
    extract(/(\d)\s*(floor|floors|storey|storeys|story|stories|level|tala|tal|manzil)/) ??
    (/\b(duplex|double\s*storey|double\s*story|two\s*storey|two\s*story)\b/.test(withWordNumbers) ? 2 : undefined)
  const bhkBedrooms = extract(/(\d)\s*bhk/)
  const bhkDefaults = bhkBedrooms ? getBhkDefaults(Math.round(clamp(bhkBedrooms, 1, 4))) : undefined
  const bedroomMentioned = /\b(master\s*bedroom|bed\s*room|bedroom|kamra|kamre|sleep(?:ing)?\s*room)\b/.test(withWordNumbers)
  const bathroomMentioned = /\b(bath|bathroom|bathrooms|toilet|toilets|washroom|wc|lat\s*bath|latrine|restroom|bat)\b/.test(withWordNumbers)
  const kitchenMentioned = /\b(kitchen|kitchens|kitch|rasoi|rasoighar|rasoda)\b/.test(withWordNumbers)
  const bedrooms = bhkBedrooms ?? extract(/(\d)\s*(bed\s*room|bedroom|bedrooms|kamra|kamre|sleep(?:ing)?\s*room)/) ?? (bedroomMentioned ? 1 : undefined)
  const bathrooms = extract(/(\d)\s*(bath|bathroom|bathrooms|toilet|toilets|washroom|wc|latrine|restroom|bat)/) ?? (bathroomMentioned ? 1 : undefined)
  const kitchens = extract(/(\d)\s*(kitchen|kitchens|kitch|rasoi|rasoighar|rasoda)/) ?? (kitchenMentioned ? 1 : undefined)
  const storeRooms = extract(/(\d)\s*(store|store\s*room|store\s*rooms|storage)/)
  const balconyMentioned = withWordNumbers.includes("balcony") || withWordNumbers.includes("boucany") || withWordNumbers.includes("balkoni") || withWordNumbers.includes("chajja")
  const balconyNegated = hasNegation(["balcony", "balconies"])
  const balconyRooms = balconyNegated
    ? 0
    : balconyMentioned
      ? extract(/(\d)\s*(balcony|balconies|balconey|boucany|balkoni)/) ?? 1
      : undefined
  const parkingMentioned =
    withWordNumbers.includes("parking") || withWordNumbers.includes("garage") || withWordNumbers.includes("car porch") || withWordNumbers.includes("carport")
  const parkingNegated = hasNegation(["parking", "garage", "car porch", "carport"])
  const parkingSpaces = parkingNegated
    ? 0
    : parkingMentioned
      ? extract(/(\d)\s*(parking|car|cars|garage)/) ?? 1
      : undefined
  const gardenMentioned = withWordNumbers.includes("garden") || withWordNumbers.includes("lawn") || withWordNumbers.includes("bagicha")
  const gardenNegated = hasNegation(["garden", "gardens", "lawn", "lawns"])
  const gardenAreas = gardenNegated
    ? 0
    : gardenMentioned
      ? extract(/(\d)\s*(garden|gardens|lawn|lawns)/) ?? 1
      : undefined
  const boundaryMentioned =
    withWordNumbers.includes("boundary") ||
    withWordNumbers.includes("compound wall") ||
    withWordNumbers.includes("fence")
  const boundaryNegated = hasNegation(["boundary", "compound wall", "fence", "boundary wall"])
  const includeBoundary = boundaryNegated ? false : boundaryMentioned ? true : undefined
  const verandahMentioned =
    withWordNumbers.includes("aangan") ||
    withWordNumbers.includes("courtyard") ||
    /verandah|veranda|varandah|baramda|sit[-\s]?out/.test(withWordNumbers)
  const verandahNegated = hasNegation(["aangan", "courtyard", "verandah", "veranda", "sit out", "sitout"])
  const verandahRooms = verandahNegated
    ? 0
    : withWordNumbers.includes("aangan") || withWordNumbers.includes("courtyard")
      ? 1
      : extract(/(\d)\s*(verandah|veranda|sit[-\s]?out)/)
  const poojaRoomsDetected =
    withWordNumbers.includes("pooja") || withWordNumbers.includes("mandir") || withWordNumbers.includes("temple")
      ? 1
      : extract(/(\d)\s*(pooja|mandir|temple)/)

  const stairsNegated = hasNegation(["stairs", "staircase", "steps"])
  const greenGlassMentioned =
    /green\s*glass|glass\s*landscap|landscap|greenery|green\s*strip|green\s*boundary|lawn\s*strip/.test(withWordNumbers)
  const greenGlassNegated = hasNegation(["green glass", "landscape", "landscaping", "greenery", "lawn strip", "green strip"])
  const includeLandscapeGlass = greenGlassNegated ? false : greenGlassMentioned ? true : undefined

  return {
    totalSqFt,
    floors,
    bedrooms: bedrooms ?? bhkDefaults?.bedrooms,
    kitchens: kitchens ?? bhkDefaults?.kitchens,
    bathrooms: bathrooms ?? bhkDefaults?.bathrooms,
    poojaRooms: poojaRoomsDetected ?? bhkDefaults?.poojaRooms,
    storeRooms: storeRooms ?? bhkDefaults?.storeRooms,
    verandahRooms: verandahMentioned ? verandahRooms ?? 1 : verandahRooms ?? bhkDefaults?.verandahRooms,
    balconyRooms: balconyRooms ?? bhkDefaults?.balconyRooms,
    parkingSpaces: parkingSpaces ?? bhkDefaults?.parkingSpaces,
    gardenAreas: gardenAreas ?? bhkDefaults?.gardenAreas,
    includeStairs: stairsNegated ? false : floors ? floors > 1 : undefined,
    includeBoundary,
    includeLandscapeGlass,
  }
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
    if (hasYes(yesPattern) && hasNo(noTerms)) {
      conflicts.push(`Conflicting ${label} requirement`)
    }
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

function detectPromptMissingInputs(input: string, patch: WizardPatch) {
  const normalized = normalizePromptInput(input)
  const dimensions = extractDimensionAreaFromPrompt(normalized)
  const missing: string[] = []
  if (patch.totalSqFt === undefined && !dimensions) missing.push("plot area")
  if (patch.floors === undefined) missing.push("floor count")
  if (patch.bedrooms === undefined) missing.push("bedroom count")
  if (patch.kitchens === undefined) missing.push("kitchen count")
  if (patch.bathrooms === undefined && !/\b(bath|bathroom|toilet|washroom|wc|latrine)\b/.test(normalized)) {
    missing.push("bathroom count")
  }
  if (!/\b(north|south|east|west|facing|road\s*side|roadside|orientation)\b/.test(normalized)) {
    missing.push("plot facing")
  }
  return Array.from(new Set(missing))
}

function formatPromptDetectedRows(patch: WizardPatch) {
  const rows: Array<{ label: string; value: string }> = []
  if (patch.totalSqFt !== undefined) rows.push({ label: "Area", value: `${Math.round(patch.totalSqFt)} sq ft` })
  if (patch.floors !== undefined) rows.push({ label: "Floors", value: String(patch.floors) })
  if (patch.bedrooms !== undefined) rows.push({ label: "Bedrooms", value: String(patch.bedrooms) })
  if (patch.kitchens !== undefined) rows.push({ label: "Kitchen", value: String(patch.kitchens) })
  if (patch.bathrooms !== undefined) rows.push({ label: "Bath", value: String(patch.bathrooms) })
  if (patch.poojaRooms !== undefined) rows.push({ label: "Pooja", value: String(patch.poojaRooms) })
  if (patch.parkingSpaces !== undefined) {
    rows.push({ label: "Parking", value: patch.parkingSpaces > 0 ? String(patch.parkingSpaces) : "Not required" })
  }
  if (patch.balconyRooms !== undefined) rows.push({ label: "Balcony", value: String(patch.balconyRooms) })
  return rows
}

function formatInr(value: number) {
  return `INR ${Math.round(value).toLocaleString("en-IN")}`
}

function inferPlotFromSurveyFileName(fileName: string) {
  const match = fileName.match(/(\d{2,3}(?:\.\d+)?)\s*(?:ft|feet|')?\s*[xX]\s*(\d{2,3}(?:\.\d+)?)/i)
  if (!match) return null
  const frontageFt = clamp(Number.parseFloat(match[1]), 12, 100)
  const depthFt = clamp(Number.parseFloat(match[2]), 20, 120)
  if (Number.isNaN(frontageFt) || Number.isNaN(depthFt)) return null
  return { frontageFt, depthFt }
}

function computeGroundSetbacks(rooms: RoomConfig[], plotLength: number, plotWidth: number) {
  const groundRooms = rooms.filter((room) => room.floor === 0 && room.type !== "Garden")
  if (groundRooms.length === 0) {
    return {
      north: plotWidth / 2,
      south: plotWidth / 2,
      east: plotLength / 2,
      west: plotLength / 2,
    }
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY

  for (const room of groundRooms) {
    minX = Math.min(minX, room.x - room.w / 2)
    maxX = Math.max(maxX, room.x + room.w / 2)
    minZ = Math.min(minZ, room.z - room.l / 2)
    maxZ = Math.max(maxZ, room.z + room.l / 2)
  }

  const northBoundary = -plotWidth / 2
  const southBoundary = plotWidth / 2
  const westBoundary = -plotLength / 2
  const eastBoundary = plotLength / 2

  return {
    north: Math.max(minZ - northBoundary, 0),
    south: Math.max(southBoundary - maxZ, 0),
    east: Math.max(eastBoundary - maxX, 0),
    west: Math.max(minX - westBoundary, 0),
  }
}

function mapSetbacksToFacing(
  setbacks: { north: number; south: number; east: number; west: number },
  facing: PlotFacing,
) {
  if (facing === "North") {
    return { front: setbacks.north, rear: setbacks.south, sideLeft: setbacks.west, sideRight: setbacks.east }
  }
  if (facing === "South") {
    return { front: setbacks.south, rear: setbacks.north, sideLeft: setbacks.east, sideRight: setbacks.west }
  }
  if (facing === "East") {
    return { front: setbacks.east, rear: setbacks.west, sideLeft: setbacks.north, sideRight: setbacks.south }
  }
  return { front: setbacks.west, rear: setbacks.east, sideLeft: setbacks.south, sideRight: setbacks.north }
}

function directionToAngle(direction: Direction) {
  switch (direction) {
    case "North": return -90
    case "NorthEast": return -45
    case "East": return 0
    case "SouthEast": return 45
    case "South": return 90
    case "SouthWest": return 135
    case "West": return 180
    case "NorthWest": return -135
    default: return 0
  }
}

function VastuCompass({
  facing,
  roomDirections,
}: {
  facing: PlotFacing
  roomDirections: Map<string, Direction>
}) {
  const facingAngle = facing === "North" ? -90 : facing === "East" ? 0 : facing === "South" ? 90 : 180
  const keyRooms = Array.from(roomDirections.entries()).slice(0, 6)

  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">Compass</p>
      <div className="mt-2 flex items-center gap-4">
        <svg width="90" height="90" viewBox="0 0 100 100" aria-label="Vastu compass">
          <circle cx="50" cy="50" r="42" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <text x="50" y="14" textAnchor="middle" fontSize="10" fill="#334155">N</text>
          <text x="92" y="54" textAnchor="middle" fontSize="10" fill="#334155">E</text>
          <text x="50" y="96" textAnchor="middle" fontSize="10" fill="#334155">S</text>
          <text x="8" y="54" textAnchor="middle" fontSize="10" fill="#334155">W</text>
          <line x1="50" y1="50" x2="50" y2="20" stroke="#0f172a" strokeWidth="3" transform={`rotate(${facingAngle},50,50)`} />
          <circle cx="50" cy="50" r="3" fill="#0f172a" />
          {keyRooms.map(([id, direction], index) => {
            const angle = (directionToAngle(direction) * Math.PI) / 180
            const radius = 28 + (index % 2) * 6
            const x = 50 + Math.cos(angle) * radius
            const y = 50 + Math.sin(angle) * radius
            return <circle key={id} cx={x} cy={y} r="2.5" fill="#f97316" />
          })}
        </svg>
        <div className="text-xs text-muted-foreground">
          <p>Facing: <span className="font-medium text-foreground">{facing}</span></p>
          <p>Markers: first 6 rooms</p>
        </div>
      </div>
    </div>
  )
}

function getPlotDimensions(totalSqFt: number) {
  const safeArea = Math.max(totalSqFt, 200)
  const ratio = 1.25
  const length = Math.sqrt(safeArea * ratio)
  const width = safeArea / length
  return { length, width }
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildFloorPlanMapDataUrl({
  houseConfig,
  plotLength,
  plotWidth,
  floorStats,
}: {
  houseConfig: HouseConfig
  plotLength: number
  plotWidth: number
  floorStats: Array<{ floor: number; totalRoomArea: number; usableArea: number }>
}) {
  const frameWidth = 1800
  const floorFrameHeight = 700
  const floorGap = 56
  const topPad = 126
  const bottomPad = 66
  const floors = Math.max(houseConfig.floors, 1)
  const frameHeight = topPad + floors * floorFrameHeight + (floors - 1) * floorGap + bottomPad
  const planWidth = frameWidth - 170
  const planHeight = floorFrameHeight - 292
  const scale = Math.min(planWidth / Math.max(plotLength, 1), planHeight / Math.max(plotWidth, 1))
  const drawWidth = plotLength * scale
  const drawHeight = plotWidth * scale
  const xStart = (frameWidth - drawWidth) / 2
  const roomRowsByFloor = new Map<number, string[]>()
  const summaryByFloor = new Map<number, { totalRoomArea: number; usableArea: number }>()
  const plotDimLabel = `${plotLength.toFixed(1)} ft x ${plotWidth.toFixed(1)} ft`

  for (const stats of floorStats) {
    summaryByFloor.set(stats.floor, { totalRoomArea: stats.totalRoomArea, usableArea: stats.usableArea })
  }

  for (let floor = 0; floor < floors; floor += 1) {
    const floorRooms = houseConfig.rooms
      .filter((room) => room.floor === floor)
      .sort((a, b) => b.w * b.l - a.w * a.l)
    let overlapCount = 0
    for (let i = 0; i < floorRooms.length; i += 1) {
      for (let j = i + 1; j < floorRooms.length; j += 1) {
        if (doesRoomsOverlap(floorRooms[i], floorRooms[j], 0.04)) {
          overlapCount += 1
        }
      }
    }
    const denseLayout = floorRooms.length >= 6
    const rows: string[] = []
    const yStart = topPad + floor * (floorFrameHeight + floorGap) + 126
    const plotTop = yStart
    const plotBottom = yStart + drawHeight
    const plotLeft = xStart
    const plotRight = xStart + drawWidth
    const placedTextBoxes: Array<{ x: number; y: number; w: number; h: number }> = []

    rows.push(`<rect x="${(plotLeft - 26).toFixed(1)}" y="${(plotTop - 34).toFixed(1)}" width="${(drawWidth + 84).toFixed(1)}" height="${(drawHeight + 84).toFixed(1)}" fill="#f8fbff" stroke="#d6e0ef" stroke-width="1.1" rx="8" />`)
    rows.push(`<rect x="${plotLeft.toFixed(1)}" y="${plotTop.toFixed(1)}" width="${drawWidth.toFixed(1)}" height="${drawHeight.toFixed(1)}" fill="#ffffff" stroke="#1f2937" stroke-width="2.2" />`)
    rows.push(`<line x1="${plotLeft.toFixed(1)}" y1="${(plotTop - 26).toFixed(1)}" x2="${plotLeft.toFixed(1)}" y2="${plotTop.toFixed(1)}" stroke="#64748b" stroke-width="1" />`)
    rows.push(`<line x1="${plotRight.toFixed(1)}" y1="${(plotTop - 26).toFixed(1)}" x2="${plotRight.toFixed(1)}" y2="${plotTop.toFixed(1)}" stroke="#64748b" stroke-width="1" />`)
    rows.push(`<line x1="${plotLeft.toFixed(1)}" y1="${(plotTop - 26).toFixed(1)}" x2="${plotRight.toFixed(1)}" y2="${(plotTop - 26).toFixed(1)}" stroke="#334155" stroke-width="1.1" marker-start="url(#arrow-dim)" marker-end="url(#arrow-dim)" />`)
    rows.push(`<text x="${((plotLeft + plotRight) / 2).toFixed(1)}" y="${(plotTop - 32).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="13.5" font-weight="700" fill="#0f172a">${plotLength.toFixed(1)} ft</text>`)
    rows.push(`<line x1="${(plotRight + 20).toFixed(1)}" y1="${plotTop.toFixed(1)}" x2="${plotRight.toFixed(1)}" y2="${plotTop.toFixed(1)}" stroke="#64748b" stroke-width="1" />`)
    rows.push(`<line x1="${(plotRight + 20).toFixed(1)}" y1="${plotBottom.toFixed(1)}" x2="${plotRight.toFixed(1)}" y2="${plotBottom.toFixed(1)}" stroke="#64748b" stroke-width="1" />`)
    rows.push(`<line x1="${(plotRight + 20).toFixed(1)}" y1="${plotTop.toFixed(1)}" x2="${(plotRight + 20).toFixed(1)}" y2="${plotBottom.toFixed(1)}" stroke="#334155" stroke-width="1.1" marker-start="url(#arrow-dim)" marker-end="url(#arrow-dim)" />`)
    rows.push(`<text x="${(plotRight + 31).toFixed(1)}" y="${((plotTop + plotBottom) / 2).toFixed(1)}" transform="rotate(90 ${(plotRight + 31).toFixed(1)} ${((plotTop + plotBottom) / 2).toFixed(1)})" text-anchor="middle" font-family="Arial" font-size="13.5" font-weight="700" fill="#0f172a">${plotWidth.toFixed(1)} ft</text>`)
    rows.push(`<line x1="${(plotLeft + 14).toFixed(1)}" y1="${(plotTop + 22).toFixed(1)}" x2="${(plotLeft + 14).toFixed(1)}" y2="${(plotTop + 48).toFixed(1)}" stroke="#0f172a" stroke-width="1.2" marker-end="url(#arrow-north)" />`)
    rows.push(`<text x="${(plotLeft + 14).toFixed(1)}" y="${(plotTop + 16).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="11.5" font-weight="700" fill="#0f172a">N</text>`)
    rows.push(`<line x1="${plotLeft.toFixed(1)}" y1="${((plotTop + plotBottom) / 2).toFixed(1)}" x2="${plotRight.toFixed(1)}" y2="${((plotTop + plotBottom) / 2).toFixed(1)}" stroke="#64748b" stroke-width="0.9" stroke-dasharray="5 4" />`)
    rows.push(`<line x1="${((plotLeft + plotRight) / 2).toFixed(1)}" y1="${plotTop.toFixed(1)}" x2="${((plotLeft + plotRight) / 2).toFixed(1)}" y2="${plotBottom.toFixed(1)}" stroke="#64748b" stroke-width="0.9" stroke-dasharray="5 4" />`)
    rows.push(`<text x="${(plotLeft + 4).toFixed(1)}" y="${(((plotTop + plotBottom) / 2) - 4).toFixed(1)}" font-family="Arial" font-size="11.5" font-weight="700" fill="#334155">A</text>`)
    rows.push(`<text x="${(plotRight - 10).toFixed(1)}" y="${(((plotTop + plotBottom) / 2) - 4).toFixed(1)}" font-family="Arial" font-size="11.5" font-weight="700" fill="#334155">A'</text>`)
    rows.push(`<text x="${(((plotLeft + plotRight) / 2) + 4).toFixed(1)}" y="${(plotTop + 12).toFixed(1)}" font-family="Arial" font-size="11.5" font-weight="700" fill="#334155">B</text>`)
    rows.push(`<text x="${(((plotLeft + plotRight) / 2) + 4).toFixed(1)}" y="${(plotBottom - 6).toFixed(1)}" font-family="Arial" font-size="11.5" font-weight="700" fill="#334155">B'</text>`)

    for (const room of floorRooms) {
      const left = room.x - room.w / 2
      const top = room.z - room.l / 2
      const roomX = xStart + (left + plotLength / 2) * scale
      const roomY = yStart + (top + plotWidth / 2) * scale
      const roomW = room.w * scale
      const roomH = room.l * scale
      const label = escapeSvgText(room.type)
      const sizeLabel = `${room.w.toFixed(1)}x${room.l.toFixed(1)}`
      const titleFont = clamp(Math.min(roomW / 4.7, roomH / 3.1), 9, 15)
      const sizeFont = clamp(Math.min(roomW / 6, roomH / 4.2), 8, 11.5)
      const canShowTitle = roomW >= 34 && roomH >= 20
      const canShowSize = roomW >= 54 && roomH >= 30 && room.w * room.l >= 40

      rows.push(`<rect x="${roomX.toFixed(1)}" y="${roomY.toFixed(1)}" width="${roomW.toFixed(1)}" height="${roomH.toFixed(1)}" fill="${room.color}" fill-opacity="0.17" stroke="#0f172a" stroke-width="1.35" />`)
      if (canShowTitle) {
        const titleW = Math.max(label.length * titleFont * 0.58, 20)
        const titleH = titleFont + 4
        const titleBox = {
          x: roomX + roomW / 2 - titleW / 2,
          y: roomY + roomH / 2 - titleH - (canShowSize ? 2 : 0),
          w: titleW,
          h: titleH,
        }
        const titleCollides = placedTextBoxes.some((box) => overlaps1D(titleBox.x, titleBox.x + titleBox.w, box.x, box.x + box.w) && overlaps1D(titleBox.y, titleBox.y + titleBox.h, box.y, box.y + box.h))
        if (!titleCollides) {
          rows.push(`<text x="${(roomX + roomW / 2).toFixed(1)}" y="${(roomY + roomH / 2 - (canShowSize ? 4 : -2)).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="${titleFont.toFixed(1)}" font-weight="700" fill="#0f172a">${label}</text>`)
          placedTextBoxes.push(titleBox)
        }
      }
      if (canShowSize) {
        const sizeText = `${sizeLabel} ft`
        const sizeW = Math.max(sizeText.length * sizeFont * 0.52, 22)
        const sizeH = sizeFont + 4
        const sizeBox = {
          x: roomX + roomW / 2 - sizeW / 2,
          y: roomY + roomH / 2 + 2,
          w: sizeW,
          h: sizeH,
        }
        const sizeCollides = placedTextBoxes.some((box) => overlaps1D(sizeBox.x, sizeBox.x + sizeBox.w, box.x, box.x + box.w) && overlaps1D(sizeBox.y, sizeBox.y + sizeBox.h, box.y, box.y + box.h))
        if (!sizeCollides) {
          rows.push(`<text x="${(roomX + roomW / 2).toFixed(1)}" y="${(roomY + roomH / 2 + 12).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="${sizeFont.toFixed(1)}" fill="#0f172a">${sizeText}</text>`)
          placedTextBoxes.push(sizeBox)
        }
      }

      if (!denseLayout && roomW > 42 && roomH > 34) {
        const doorPx = Math.max(11, Math.min((room.doorWidth ?? 0.95) * scale, roomW - 8))
        const doorX1 = roomX + roomW / 2 - doorPx / 2
        const doorX2 = roomX + roomW / 2 + doorPx / 2
        const doorY = roomY + roomH
        rows.push(`<line x1="${doorX1.toFixed(1)}" y1="${doorY.toFixed(1)}" x2="${doorX2.toFixed(1)}" y2="${doorY.toFixed(1)}" stroke="#ffffff" stroke-width="4.2" />`)
        rows.push(`<line x1="${doorX1.toFixed(1)}" y1="${doorY.toFixed(1)}" x2="${doorX2.toFixed(1)}" y2="${doorY.toFixed(1)}" stroke="#0f172a" stroke-width="0.9" stroke-dasharray="2 2" />`)
        rows.push(`<line x1="${doorX1.toFixed(1)}" y1="${doorY.toFixed(1)}" x2="${doorX1.toFixed(1)}" y2="${(doorY - doorPx * 0.58).toFixed(1)}" stroke="#475569" stroke-width="0.9" />`)
        rows.push(`<path d="M ${doorX1.toFixed(1)} ${doorY.toFixed(1)} A ${doorPx.toFixed(1)} ${doorPx.toFixed(1)} 0 0 1 ${doorX2.toFixed(1)} ${(doorY - doorPx * 0.52).toFixed(1)}" fill="none" stroke="#64748b" stroke-width="0.9" />`)
      }

      if (room.hasWindow && !denseLayout && roomW > 36 && roomH > 28) {
        const windowPx = Math.max(9, Math.min((room.windowWidth ?? 1.2) * scale, roomH - 8))
        const winTop = roomY + roomH / 2 - windowPx / 2
        const winBottom = roomY + roomH / 2 + windowPx / 2
        const winX = roomX + roomW
        rows.push(`<line x1="${winX.toFixed(1)}" y1="${winTop.toFixed(1)}" x2="${winX.toFixed(1)}" y2="${winBottom.toFixed(1)}" stroke="#ffffff" stroke-width="4.2" />`)
        rows.push(`<line x1="${(winX - 1.8).toFixed(1)}" y1="${winTop.toFixed(1)}" x2="${(winX - 1.8).toFixed(1)}" y2="${winBottom.toFixed(1)}" stroke="#1d4ed8" stroke-width="0.9" />`)
        rows.push(`<line x1="${(winX + 1.8).toFixed(1)}" y1="${winTop.toFixed(1)}" x2="${(winX + 1.8).toFixed(1)}" y2="${winBottom.toFixed(1)}" stroke="#1d4ed8" stroke-width="0.9" />`)
      }

      if (!denseLayout && floorRooms.length <= 5 && roomW > 110 && roomH > 86) {
        const dimY = roomY + 12
        rows.push(`<line x1="${roomX.toFixed(1)}" y1="${(dimY - 8).toFixed(1)}" x2="${roomX.toFixed(1)}" y2="${dimY.toFixed(1)}" stroke="#94a3b8" stroke-width="0.85" />`)
        rows.push(`<line x1="${(roomX + roomW).toFixed(1)}" y1="${(dimY - 8).toFixed(1)}" x2="${(roomX + roomW).toFixed(1)}" y2="${dimY.toFixed(1)}" stroke="#94a3b8" stroke-width="0.85" />`)
        rows.push(`<line x1="${roomX.toFixed(1)}" y1="${dimY.toFixed(1)}" x2="${(roomX + roomW).toFixed(1)}" y2="${dimY.toFixed(1)}" stroke="#64748b" stroke-width="0.85" marker-start="url(#arrow-dim-sm)" marker-end="url(#arrow-dim-sm)" />`)
        rows.push(`<text x="${(roomX + roomW / 2).toFixed(1)}" y="${(dimY - 2).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="9" fill="#334155">${room.w.toFixed(1)}'</text>`)
      }
      if (!denseLayout && floorRooms.length <= 5 && roomH > 110 && roomW > 86) {
        const dimX = roomX + 12
        rows.push(`<line x1="${(dimX - 8).toFixed(1)}" y1="${roomY.toFixed(1)}" x2="${dimX.toFixed(1)}" y2="${roomY.toFixed(1)}" stroke="#94a3b8" stroke-width="0.85" />`)
        rows.push(`<line x1="${(dimX - 8).toFixed(1)}" y1="${(roomY + roomH).toFixed(1)}" x2="${dimX.toFixed(1)}" y2="${(roomY + roomH).toFixed(1)}" stroke="#94a3b8" stroke-width="0.85" />`)
        rows.push(`<line x1="${dimX.toFixed(1)}" y1="${roomY.toFixed(1)}" x2="${dimX.toFixed(1)}" y2="${(roomY + roomH).toFixed(1)}" stroke="#64748b" stroke-width="0.85" marker-start="url(#arrow-dim-sm)" marker-end="url(#arrow-dim-sm)" />`)
        rows.push(`<text x="${(dimX + 7).toFixed(1)}" y="${(roomY + roomH / 2).toFixed(1)}" transform="rotate(90 ${(dimX + 7).toFixed(1)} ${(roomY + roomH / 2).toFixed(1)})" text-anchor="middle" font-family="Arial" font-size="9" fill="#334155">${room.l.toFixed(1)}'</text>`)
      }
    }

    const summary = summaryByFloor.get(floor)
    rows.push(`<text x="${plotLeft.toFixed(1)}" y="${(plotTop - 84).toFixed(1)}" font-family="Arial" font-size="23" font-weight="700" fill="#0f172a">Floor ${floor + 1}</text>`)
    if (summary) {
      rows.push(
        `<text x="${plotLeft.toFixed(1)}" y="${(plotTop - 60).toFixed(1)}" font-family="Arial" font-size="15" fill="#334155">Room Area: ${summary.totalRoomArea.toFixed(1)} sq ft | Usable: ${summary.usableArea.toFixed(1)} sq ft</text>`,
      )
    }
    if (overlapCount > 0) {
      rows.push(
        `<text x="${plotRight.toFixed(1)}" y="${(plotTop - 60).toFixed(1)}" text-anchor="end" font-family="Arial" font-size="12.5" fill="#b91c1c">${overlapCount} overlap issue(s) detected</text>`,
      )
    }
    rows.push(`<text x="${plotLeft.toFixed(1)}" y="${(plotBottom + 22).toFixed(1)}" font-family="Arial" font-size="12.5" fill="#475569">Scale: Approx 1:100 (screen/print dependent)</text>`)
    rows.push(`<text x="${plotRight.toFixed(1)}" y="${(plotBottom + 22).toFixed(1)}" text-anchor="end" font-family="Arial" font-size="12.5" fill="#475569">Plot: ${plotDimLabel}</text>`)
    roomRowsByFloor.set(floor, rows)
  }

  const allRows = Array.from(roomRowsByFloor.values()).flat().join("")
  const defs = `
    <defs>
      <marker id="arrow-dim" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
        <path d="M0,0 L7,3.5 L0,7 z" fill="#334155" />
      </marker>
      <marker id="arrow-dim-sm" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
        <path d="M0,0 L6,3 L0,6 z" fill="#64748b" />
      </marker>
      <marker id="arrow-north" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="#0f172a" />
      </marker>
    </defs>
  `
  const header = `
    <rect x="0" y="0" width="${frameWidth}" height="${frameHeight}" fill="#f7faff" />
    <text x="40" y="38" font-family="Arial" font-size="22" font-weight="700" fill="#0f172a">BricksBazar Floor Map</text>
    <text x="40" y="64" font-family="Arial" font-size="13" fill="#334155">Architectural Layout | Plot: ${plotDimLabel} | Total Area Input: ${houseConfig.totalSqFt.toFixed(0)} sq ft</text>
    <text x="${(frameWidth - 40).toFixed(1)}" y="64" text-anchor="end" font-family="Arial" font-size="11" fill="#475569">Symbols: door swing arc + dual-line window + dimension arrows</text>
  `
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frameWidth}" height="${frameHeight}" viewBox="0 0 ${frameWidth} ${frameHeight}">${defs}${header}${allRows}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function overlaps1D(minA: number, maxA: number, minB: number, maxB: number) {
  return minA < maxB && minB < maxA
}

function doesRoomsOverlap(roomA: Pick<RoomConfig, "x" | "z" | "w" | "l">, roomB: Pick<RoomConfig, "x" | "z" | "w" | "l">, gap = 0.2) {
  const aMinX = roomA.x - roomA.w / 2 - gap
  const aMaxX = roomA.x + roomA.w / 2 + gap
  const aMinZ = roomA.z - roomA.l / 2 - gap
  const aMaxZ = roomA.z + roomA.l / 2 + gap
  const bMinX = roomB.x - roomB.w / 2 - gap
  const bMaxX = roomB.x + roomB.w / 2 + gap
  const bMinZ = roomB.z - roomB.l / 2 - gap
  const bMaxZ = roomB.z + roomB.l / 2 + gap
  return overlaps1D(aMinX, aMaxX, bMinX, bMaxX) && overlaps1D(aMinZ, aMaxZ, bMinZ, bMaxZ)
}

function areRoomsSnapped(roomA: Pick<RoomConfig, "x" | "z" | "w" | "l" | "floor">, roomB: Pick<RoomConfig, "x" | "z" | "w" | "l" | "floor">) {
  if (roomA.floor !== roomB.floor) return false
  const edgeTolerance = 0.16
  const overlapTolerance = 0.24
  const aMinX = roomA.x - roomA.w / 2
  const aMaxX = roomA.x + roomA.w / 2
  const aMinZ = roomA.z - roomA.l / 2
  const aMaxZ = roomA.z + roomA.l / 2
  const bMinX = roomB.x - roomB.w / 2
  const bMaxX = roomB.x + roomB.w / 2
  const bMinZ = roomB.z - roomB.l / 2
  const bMaxZ = roomB.z + roomB.l / 2

  const eastWestTouch =
    (Math.abs(aMaxX - bMinX) <= edgeTolerance || Math.abs(aMinX - bMaxX) <= edgeTolerance) &&
    overlaps1D(aMinZ + overlapTolerance, aMaxZ - overlapTolerance, bMinZ, bMaxZ)
  const northSouthTouch =
    (Math.abs(aMaxZ - bMinZ) <= edgeTolerance || Math.abs(aMinZ - bMaxZ) <= edgeTolerance) &&
    overlaps1D(aMinX + overlapTolerance, aMaxX - overlapTolerance, bMinX, bMaxX)

  return eastWestTouch || northSouthTouch
}

type PlacementCell = { x: number; z: number; score: number }

function getVastuTarget(roomType: RoomType, plotLength: number, plotWidth: number) {
  const padX = plotLength * 0.26
  const padZ = plotWidth * 0.26
  if (roomType === "Pooja") return { x: plotLength / 2 - padX, z: -plotWidth / 2 + padZ } // North-East
  if (roomType === "Kitchen") return { x: plotLength / 2 - padX, z: plotWidth / 2 - padZ } // South-East
  if (roomType === "Living") return { x: -plotLength * 0.15, z: 0 }
  if (roomType === "Stairs") return { x: 0, z: 0 }
  return { x: 0, z: 0 }
}

function getVastuCandidatePoints(roomType: RoomType, plotLength: number, plotWidth: number) {
  const hard = 0.42
  const soft = 0.24
  if (roomType === "Pooja") {
    return [
      { x: plotLength / 2 - hard, z: -plotWidth / 2 + hard }, // North-East
      { x: plotLength / 2 - soft, z: -plotWidth * 0.25 }, // East-North
    ]
  }
  if (roomType === "Kitchen") {
    return [
      { x: plotLength / 2 - hard, z: plotWidth / 2 - hard }, // South-East
      { x: plotLength / 2 - soft, z: plotWidth * 0.22 },
    ]
  }
  if (roomType === "Bedroom") {
    return [
      { x: -plotLength / 2 + hard, z: plotWidth / 2 - hard }, // South-West
      { x: -plotLength * 0.22, z: plotWidth * 0.2 },
    ]
  }
  if (roomType === "Store") {
    return [
      { x: -plotLength / 2 + hard, z: 0 }, // West
      { x: -plotLength / 2 + hard, z: plotWidth / 2 - hard }, // South-West
    ]
  }
  if (roomType === "Verandah") {
    return [
      { x: 0, z: -plotWidth / 2 + hard }, // North
      { x: plotLength / 2 - hard, z: 0 }, // East
    ]
  }
  if (roomType === "Living") {
    return [
      { x: 0, z: 0 },
      { x: -plotLength * 0.1, z: 0 },
    ]
  }
  if (roomType === "Stairs") {
    return [
      { x: 0, z: 0 },
      { x: -plotLength * 0.12, z: 0 },
    ]
  }

  return [{ x: 0, z: 0 }]
}

function canPlaceRoom({
  x,
  z,
  w,
  l,
  plotLength,
  plotWidth,
  existingRooms,
  blockedZones = [],
}: {
  x: number
  z: number
  w: number
  l: number
  plotLength: number
  plotWidth: number
  existingRooms: RoomConfig[]
  blockedZones?: Array<Pick<RoomConfig, "x" | "z" | "w" | "l">>
}) {
  if (Math.abs(x) + w / 2 + 0.2 > plotLength / 2) return false
  if (Math.abs(z) + l / 2 + 0.2 > plotWidth / 2) return false
  const candidate = { x, z, w, l }
  const overlapsExisting = existingRooms.some((room) => doesRoomsOverlap(candidate, room, 0.18))
  if (overlapsExisting) return false
  return !blockedZones.some((zone) => doesRoomsOverlap(candidate, zone, 0.12))
}

function findEmptySpot({
  plotLength,
  plotWidth,
  roomSize,
  roomType,
  existingRooms,
  blockedZones = [],
  preferredNear,
  availableGrid,
  gridStep = 1.2,
}: {
  plotLength: number
  plotWidth: number
  roomSize: { w: number; l: number }
  roomType: RoomType
  existingRooms: RoomConfig[]
  blockedZones?: Array<Pick<RoomConfig, "x" | "z" | "w" | "l">>
  preferredNear?: Pick<RoomConfig, "x" | "z"> | null
  availableGrid?: Array<{ x: number; z: number }>
  gridStep?: number
}) {
  const vastuTarget = getVastuTarget(roomType, plotLength, plotWidth)

  const cells: PlacementCell[] = []
  const grid =
    availableGrid && availableGrid.length > 0
      ? availableGrid
      : (() => {
          const xStart = -plotLength / 2 + roomSize.w / 2 + 0.2
          const xEnd = plotLength / 2 - roomSize.w / 2 - 0.2
          const zStart = -plotWidth / 2 + roomSize.l / 2 + 0.2
          const zEnd = plotWidth / 2 - roomSize.l / 2 - 0.2
          const points: Array<{ x: number; z: number }> = []
          for (let x = xStart; x <= xEnd; x += gridStep) {
            for (let z = zStart; z <= zEnd; z += gridStep) {
              points.push({ x, z })
            }
          }
          return points
        })()

  for (const point of grid) {
    const x = point.x
    const z = point.z
    if (!canPlaceRoom({ x, z, w: roomSize.w, l: roomSize.l, plotLength, plotWidth, existingRooms, blockedZones })) {
      continue
    }
    const vastuDist = Math.abs(x - vastuTarget.x) + Math.abs(z - vastuTarget.z)
    const nearDist = preferredNear ? Math.abs(x - preferredNear.x) + Math.abs(z - preferredNear.z) : 0
    const score = vastuDist + nearDist * 0.72
    cells.push({ x, z, score })
  }

  if (cells.length === 0) return null
  cells.sort((a, b) => a.score - b.score)
  return { x: cells[0].x, z: cells[0].z }
}

function getAvailableGrid(plotLength: number, plotWidth: number, gridStep = 1.2) {
  const points: Array<{ x: number; z: number }> = []
  const xStart = -plotLength / 2 + 0.7
  const xEnd = plotLength / 2 - 0.7
  const zStart = -plotWidth / 2 + 0.7
  const zEnd = plotWidth / 2 - 0.7
  for (let x = xStart; x <= xEnd; x += gridStep) {
    for (let z = zStart; z <= zEnd; z += gridStep) {
      points.push({ x, z })
    }
  }
  return points
}

function getSnapLinks(rooms: RoomConfig[], floorHeight: number) {
  const links: SnapLink[] = []
  for (let i = 0; i < rooms.length; i += 1) {
    for (let j = i + 1; j < rooms.length; j += 1) {
      if (!areRoomsSnapped(rooms[i], rooms[j])) continue
      const y = rooms[i].floor * floorHeight + 0.22
      links.push({
        floor: rooms[i].floor,
        from: [rooms[i].x, y, rooms[i].z],
        to: [rooms[j].x, y, rooms[j].z],
      })
    }
  }
  return links
}

function shiftCandidateRightUntilClear({
  candidate,
  plotLength,
  plotWidth,
  existingRooms,
  blockedZones,
}: {
  candidate: Pick<RoomConfig, "x" | "z" | "w" | "l">
  plotLength: number
  plotWidth: number
  existingRooms: RoomConfig[]
  blockedZones: Array<Pick<RoomConfig, "x" | "z" | "w" | "l">>
}) {
  const shifted = { ...candidate }
  const maxAttempts = 30
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const collidingWith = existingRooms.find((room) => doesRoomsOverlap(shifted, room, 0.18))
    if (!collidingWith) break
    shifted.x = collidingWith.x + collidingWith.w / 2 + shifted.w / 2 + 0.22
  }
  if (!canPlaceRoom({ x: shifted.x, z: shifted.z, w: shifted.w, l: shifted.l, plotLength, plotWidth, existingRooms, blockedZones })) {
    return null
  }
  return shifted
}

function snapAdjacentRooms({
  floorRooms,
  plotLength,
  plotWidth,
}: {
  floorRooms: RoomConfig[]
  plotLength: number
  plotWidth: number
}) {
  const adjacencyRules: Array<{ room: RoomType; near: RoomType; avoid?: RoomType }> = [
    { room: "Kitchen", near: "Living", avoid: "Pooja" },
    { room: "Store", near: "Kitchen" },
    { room: "Bathroom", near: "Bedroom" },
  ]

  const next = [...floorRooms]
  for (const rule of adjacencyRules) {
    const target = next.find((room) => room.type === rule.near)
    const room = next.find((item) => item.type === rule.room)
    if (!target || !room) continue

    const candidates = [
      { x: target.x + target.w / 2 + room.w / 2 + 0.24, z: target.z },
      { x: target.x - target.w / 2 - room.w / 2 - 0.24, z: target.z },
      { x: target.x, z: target.z + target.l / 2 + room.l / 2 + 0.24 },
      { x: target.x, z: target.z - target.l / 2 - room.l / 2 - 0.24 },
    ]

    const best = candidates.find((candidate) => {
      const withoutCurrent = next.filter((item) => item.id !== room.id)
      if (!canPlaceRoom({ x: candidate.x, z: candidate.z, w: room.w, l: room.l, plotLength, plotWidth, existingRooms: withoutCurrent })) {
        return false
      }
      if (!rule.avoid) return true
      const avoidRoom = next.find((item) => item.type === rule.avoid)
      if (!avoidRoom) return true
      return !doesRoomsOverlap({ x: candidate.x, z: candidate.z, w: room.w, l: room.l }, avoidRoom, 0.4)
    })

    if (!best) continue
    const index = next.findIndex((item) => item.id === room.id)
    if (index >= 0) {
      next[index] = { ...room, x: best.x, z: best.z }
    }
  }

  return next
}

function compactFloorRooms({
  floorRooms,
  plotLength,
  plotWidth,
  blockedZones = [],
}: {
  floorRooms: RoomConfig[]
  plotLength: number
  plotWidth: number
  blockedZones?: Array<Pick<RoomConfig, "x" | "z" | "w" | "l">>
}) {
  const immovable = new Set<RoomType>(["Stairs", "Pooja", "Verandah", "Parking", "Garden", "Balcony"])
  const next = floorRooms.map((room) => ({ ...room }))
  const step = 0.35

  const moveTowardCenter = (value: number) => {
    if (Math.abs(value) <= step) return 0
    return value > 0 ? value - step : value + step
  }

  for (let pass = 0; pass < 22; pass += 1) {
    let changed = false
    const order = [...next]
      .sort((a, b) => Math.abs(b.x) + Math.abs(b.z) - (Math.abs(a.x) + Math.abs(a.z)))
      .map((room) => room.id)

    for (const roomId of order) {
      const index = next.findIndex((room) => room.id === roomId)
      if (index < 0) continue
      const room = next[index]
      if (immovable.has(room.type)) continue

      const others = next.filter((item) => item.id !== room.id)
      const nextX = moveTowardCenter(room.x)
      const nextZ = moveTowardCenter(room.z)
      const candidates = [
        { x: nextX, z: nextZ },
        { x: nextX, z: room.z },
        { x: room.x, z: nextZ },
      ]

      for (const candidate of candidates) {
        const improved =
          Math.abs(candidate.x) + Math.abs(candidate.z) + 0.02 <
          Math.abs(room.x) + Math.abs(room.z)
        if (!improved) continue
        const canPlace = canPlaceRoom({
          x: candidate.x,
          z: candidate.z,
          w: room.w,
          l: room.l,
          plotLength,
          plotWidth,
          existingRooms: others,
          blockedZones,
        })
        if (!canPlace) continue
        next[index] = { ...room, x: candidate.x, z: candidate.z }
        changed = true
        break
      }
    }

    if (!changed) break
  }

  return next
}

function resolveFloorOverlaps({
  floorRooms,
  plotLength,
  plotWidth,
  blockedZones = [],
}: {
  floorRooms: RoomConfig[]
  plotLength: number
  plotWidth: number
  blockedZones?: Array<Pick<RoomConfig, "x" | "z" | "w" | "l">>
}) {
  if (floorRooms.length <= 1) return floorRooms
  const resolved: RoomConfig[] = []
  const optionalTypes = new Set<RoomType>(["Store", "Verandah", "Balcony", "Garden", "Parking", "Pooja"])
  const priority: Record<RoomType, number> = {
    Living: 1,
    Bedroom: 2,
    Kitchen: 3,
    Bathroom: 4,
    Stairs: 5,
    Pooja: 6,
    Store: 7,
    Verandah: 8,
    Balcony: 9,
    Parking: 10,
    Garden: 11,
  }
  const ordered = [...floorRooms].sort((a, b) => {
    const byPriority = priority[a.type] - priority[b.type]
    if (byPriority !== 0) return byPriority
    return b.w * b.l - a.w * a.l
  })
  const gridStep = 1
  const availableGrid = getAvailableGrid(plotLength, plotWidth, gridStep)

  const tryPlaceRoom = (room: RoomConfig, preferredNear: Pick<RoomConfig, "x" | "z"> | null) => {
    const shifted = shiftCandidateRightUntilClear({
      candidate: { x: room.x, z: room.z, w: room.w, l: room.l },
      plotLength,
      plotWidth,
      existingRooms: resolved,
      blockedZones,
    })
    if (shifted) {
      return { ...room, x: shifted.x, z: shifted.z }
    }

    const spot = findEmptySpot({
      plotLength,
      plotWidth,
      roomSize: { w: room.w, l: room.l },
      roomType: room.type,
      existingRooms: resolved,
      blockedZones,
      preferredNear,
      availableGrid,
      gridStep,
    })
    if (spot) {
      return { ...room, x: spot.x, z: spot.z }
    }

    const byDistance = [...availableGrid].sort((a, b) => {
      const da = Math.abs(a.x - room.x) + Math.abs(a.z - room.z)
      const db = Math.abs(b.x - room.x) + Math.abs(b.z - room.z)
      return da - db
    })
    for (const cell of byDistance) {
      if (
        canPlaceRoom({
          x: cell.x,
          z: cell.z,
          w: room.w,
          l: room.l,
          plotLength,
          plotWidth,
          existingRooms: resolved,
          blockedZones,
        })
      ) {
        return { ...room, x: cell.x, z: cell.z }
      }
    }

    return null
  }

  for (const room of ordered) {
    const preferredNear =
      room.type === "Store"
        ? resolved.find((r) => r.type === "Kitchen") ?? resolved.find((r) => r.type === "Living") ?? null
        : room.type === "Bathroom"
          ? resolved.find((r) => r.type === "Bedroom") ?? null
          : resolved.find((r) => r.type === "Living") ?? null

    const placed = tryPlaceRoom(room, preferredNear)
    if (placed) {
      resolved.push(placed)
      continue
    }

    if (optionalTypes.has(room.type)) {
      continue
    }

    let placedAfterShrink: RoomConfig | null = null
    for (const factor of [0.94, 0.9, 0.86]) {
      const shrunkRoom: RoomConfig = {
        ...room,
        w: Number(clamp(room.w * factor, 4, plotLength - 1).toFixed(2)),
        l: Number(clamp(room.l * factor, 4, plotWidth - 1).toFixed(2)),
      }
      placedAfterShrink = tryPlaceRoom(shrunkRoom, preferredNear)
      if (placedAfterShrink) break
    }
    if (placedAfterShrink) {
      resolved.push(placedAfterShrink)
    }
  }

  return resolved
}

function getFrontAnchor(
  facing: PlotFacing,
  preset: { w: number; l: number },
  plotLength: number,
  plotWidth: number,
) {
  const margin = 0.45
  if (facing === "North") return { x: 0, z: -plotWidth / 2 + preset.l / 2 + margin }
  if (facing === "South") return { x: 0, z: plotWidth / 2 - preset.l / 2 - margin }
  if (facing === "East") return { x: plotLength / 2 - preset.w / 2 - margin, z: 0 }
  return { x: -plotLength / 2 + preset.w / 2 + margin, z: 0 }
}

function oppositeFacing(facing: PlotFacing): PlotFacing {
  if (facing === "North") return "South"
  if (facing === "South") return "North"
  if (facing === "East") return "West"
  return "East"
}

function getAnchoredSpreadPosition({
  facing,
  preset,
  plotLength,
  plotWidth,
  index,
  total,
}: {
  facing: PlotFacing
  preset: { w: number; l: number }
  plotLength: number
  plotWidth: number
  index: number
  total: number
}) {
  const base = getFrontAnchor(facing, preset, plotLength, plotWidth)
  const spread = index - (total - 1) / 2
  if (facing === "North" || facing === "South") {
    return { x: base.x + spread * (preset.w + 0.45), z: base.z }
  }
  return { x: base.x, z: base.z + spread * (preset.l + 0.45) }
}

const DIRECTION_RING: Direction[] = ["North", "NorthEast", "East", "SouthEast", "South", "SouthWest", "West", "NorthWest"]
const FACING_STEPS: Record<PlotFacing, number> = {
  North: 0,
  East: 2,
  South: 4,
  West: 6,
}

function unrotateDirectionForFacing(direction: Direction, facing: PlotFacing): Direction {
  if (direction === "Center") return direction
  const current = DIRECTION_RING.indexOf(direction)
  const unrotated = (current - FACING_STEPS[facing] + DIRECTION_RING.length) % DIRECTION_RING.length
  return DIRECTION_RING[unrotated]
}

function getDirectionalAnchorForFacing(
  direction: Direction,
  facing: PlotFacing,
  plotLength: number,
  plotWidth: number,
  depth = 0.28,
) {
  const base = unrotateDirectionForFacing(direction, facing)
  const padX = plotLength * depth
  const padZ = plotWidth * depth
  if (base === "NorthEast") return { x: plotLength / 2 - padX, z: -plotWidth / 2 + padZ }
  if (base === "NorthWest") return { x: -plotLength / 2 + padX, z: -plotWidth / 2 + padZ }
  if (base === "SouthEast") return { x: plotLength / 2 - padX, z: plotWidth / 2 - padZ }
  if (base === "SouthWest") return { x: -plotLength / 2 + padX, z: plotWidth / 2 - padZ }
  if (base === "North") return { x: 0, z: -plotWidth / 2 + padZ }
  if (base === "South") return { x: 0, z: plotWidth / 2 - padZ }
  if (base === "East") return { x: plotLength / 2 - padX, z: 0 }
  if (base === "West") return { x: -plotLength / 2 + padX, z: 0 }
  return { x: 0, z: 0 }
}

function getVastuDirectionsForRoom(roomType: RoomType, isMasterBedroom: boolean): Direction[] {
  if (roomType === "Pooja") return ["NorthEast", "East", "North"]
  if (roomType === "Kitchen") return ["SouthEast", "East", "South"]
  if (roomType === "Store") return ["West", "SouthWest"]
  if (roomType === "Verandah") return ["North", "East", "NorthEast"]
  if (roomType === "Living") return ["North", "East", "Center"]
  if (roomType === "Bathroom") return ["West", "NorthWest", "South"]
  if (roomType === "Bedroom") return isMasterBedroom ? ["SouthWest", "West", "South"] : ["West", "South", "SouthWest"]
  if (roomType === "Stairs") return ["Center", "South", "West"]
  return ["Center"]
}

function getVastuPriority(room: RoomConfig, masterBedroomId: string | null) {
  if (room.type === "Pooja") return 1
  if (room.type === "Kitchen") return 2
  if (room.type === "Bedroom" && room.id === masterBedroomId) return 3
  if (room.type === "Bedroom") return 4
  if (room.type === "Bathroom") return 5
  if (room.type === "Store") return 6
  if (room.type === "Living") return 7
  if (room.type === "Verandah") return 8
  if (room.type === "Stairs") return 9
  if (room.type === "Balcony") return 10
  if (room.type === "Parking") return 11
  if (room.type === "Garden") return 12
  return 20
}

function autoArrangeRoomsByVastu({
  rooms,
  plotLength,
  plotWidth,
  plotFacing,
}: {
  rooms: RoomConfig[]
  plotLength: number
  plotWidth: number
  plotFacing: PlotFacing
}) {
  const floors = Array.from(new Set(rooms.map((room) => room.floor))).sort((a, b) => a - b)
  const arranged: RoomConfig[] = []
  const availableGrid = getAvailableGrid(plotLength, plotWidth, 1.2)

  for (const floor of floors) {
    const floorRooms = rooms.filter((room) => room.floor === floor)
    const masterBedroomId =
      floorRooms
        .filter((room) => room.type === "Bedroom")
        .sort((a, b) => b.w * b.l - a.w * a.l)[0]?.id ?? null

    const ordered = [...floorRooms].sort((a, b) => getVastuPriority(a, masterBedroomId) - getVastuPriority(b, masterBedroomId))
    const typeCounts = new Map<RoomType, number>()
    const typeTotal = new Map<RoomType, number>()
    for (const room of floorRooms) {
      typeTotal.set(room.type, (typeTotal.get(room.type) ?? 0) + 1)
    }

    const placed: RoomConfig[] = []
    for (const room of ordered) {
      const preset = { w: room.w, l: room.l }
      const idx = typeCounts.get(room.type) ?? 0
      typeCounts.set(room.type, idx + 1)
      const total = typeTotal.get(room.type) ?? 1

      const candidates: Array<{ x: number; z: number }> = []
      if (room.type === "Parking" && floor === 0) {
        candidates.push(
          getAnchoredSpreadPosition({
            facing: plotFacing,
            preset,
            plotLength,
            plotWidth,
            index: idx,
            total,
          }),
        )
      } else if (room.type === "Garden" && floor === 0) {
        candidates.push(
          getAnchoredSpreadPosition({
            facing: oppositeFacing(plotFacing),
            preset,
            plotLength,
            plotWidth,
            index: idx,
            total,
          }),
        )
      } else if (room.type === "Balcony") {
        candidates.push(
          getAnchoredSpreadPosition({
            facing: plotFacing,
            preset,
            plotLength,
            plotWidth,
            index: idx,
            total,
          }),
        )
      } else {
        const directions = getVastuDirectionsForRoom(room.type, room.id === masterBedroomId)
        for (const direction of directions) {
          candidates.push(getDirectionalAnchorForFacing(direction, plotFacing, plotLength, plotWidth))
        }
      }
      candidates.push({ x: room.x, z: room.z })

      let selected: { x: number; z: number } | null = null
      for (const candidate of candidates) {
        if (
          canPlaceRoom({
            x: candidate.x,
            z: candidate.z,
            w: room.w,
            l: room.l,
            plotLength,
            plotWidth,
            existingRooms: placed,
            blockedZones: [],
          })
        ) {
          selected = candidate
          break
        }
      }

      if (!selected) {
        const preferredNear =
          room.type === "Store"
            ? placed.find((r) => r.type === "Kitchen") ?? placed.find((r) => r.type === "Living") ?? null
            : room.type === "Bathroom"
              ? placed.find((r) => r.type === "Bedroom") ?? null
              : room.type === "Kitchen"
                ? placed.find((r) => r.type === "Living") ?? null
                : null
        const fallback = findEmptySpot({
          plotLength,
          plotWidth,
          roomSize: { w: room.w, l: room.l },
          roomType: room.type,
          existingRooms: placed,
          blockedZones: [],
          preferredNear,
          availableGrid,
          gridStep: 1.2,
        })
        selected = fallback ?? null
      }

      if (!selected) {
        const shifted = shiftCandidateRightUntilClear({
          candidate: { x: room.x, z: room.z, w: room.w, l: room.l },
          plotLength,
          plotWidth,
          existingRooms: placed,
          blockedZones: [],
        })
        selected = shifted ? { x: shifted.x, z: shifted.z } : { x: room.x, z: room.z }
      }

      placed.push({ ...room, x: selected.x, z: selected.z })
    }

    arranged.push(...placed)
  }

  return arranged
}

function getAdaptiveRoomPresets({
  floors,
  plotLength,
  plotWidth,
  bedrooms,
  kitchens,
  bathrooms,
  poojaRooms,
  storeRooms,
  verandahRooms,
  balconyRooms,
  parkingSpaces,
  gardenAreas,
  includeStairs,
  planStyle,
}: {
  floors: number
  plotLength: number
  plotWidth: number
  bedrooms: number
  kitchens: number
  bathrooms: number
  poojaRooms: number
  storeRooms: number
  verandahRooms: number
  balconyRooms: number
  parkingSpaces: number
  gardenAreas: number
  includeStairs: boolean
  planStyle: PlanStyle
}) {
  const plotArea = plotLength * plotWidth
  const outdoorPenalty = Math.min(parkingSpaces * 0.06 + gardenAreas * 0.05 + balconyRooms * 0.025 + verandahRooms * 0.02, 0.2)
  const styleUtilizationAdjust = planStyle === "compact" ? 0.05 : planStyle === "luxury" ? -0.06 : 0
  const targetUtilization = clamp(0.8 + styleUtilizationAdjust - outdoorPenalty, 0.58, 0.86)
  const desiredIndoorArea = plotArea * floors * targetUtilization

  const baseCounts: Record<RoomType, number> = {
    Living: floors,
    Bedroom: Math.max(bedrooms, floors),
    Kitchen: Math.max(kitchens, floors),
    Bathroom: bathrooms,
    Stairs: includeStairs && floors > 1 ? floors : 0,
    Pooja: poojaRooms,
    Verandah: verandahRooms,
    Store: storeRooms,
    Parking: parkingSpaces,
    Garden: gardenAreas,
    Balcony: balconyRooms,
  }
  const indoorTypes: RoomType[] = ["Living", "Bedroom", "Kitchen", "Bathroom", "Stairs", "Pooja", "Verandah", "Store", "Balcony"]
  const baseIndoorArea = indoorTypes.reduce((sum, type) => sum + baseCounts[type] * ROOM_PRESETS[type].w * ROOM_PRESETS[type].l, 0)
  const minScale = planStyle === "compact" ? 0.9 : 1
  const maxScale = planStyle === "luxury" ? 1.45 : 1.35
  const baseScale = clamp(Math.sqrt(desiredIndoorArea / Math.max(baseIndoorArea, 1)), minScale, maxScale)

  const perTypeScale: Record<RoomType, number> = {
    Living: baseScale * 1.08,
    Bedroom: baseScale * 1.05,
    Kitchen: baseScale * 1.05,
    Bathroom: baseScale * 0.98,
    Stairs: Math.min(baseScale, 1.08),
    Pooja: baseScale * 0.96,
    Verandah: baseScale,
    Store: baseScale * 0.98,
    Parking: 1,
    Garden: 1,
    Balcony: Math.min(baseScale, 1.16),
  }

  const scaled = {} as Record<RoomType, { w: number; l: number; h: number; color: string }>
  const spanLimitW = Math.max(plotLength - 1.8, 4)
  const spanLimitL = Math.max(plotWidth - 1.8, 4)
  ;(Object.keys(ROOM_PRESETS) as RoomType[]).forEach((type) => {
    const base = ROOM_PRESETS[type]
    const typeScale = perTypeScale[type]
    const w = clamp(base.w * typeScale, base.w * 0.95, Math.min(base.w * 1.6, spanLimitW))
    const l = clamp(base.l * typeScale, base.l * 0.95, Math.min(base.l * 1.6, spanLimitL))
    scaled[type] = {
      ...base,
      w: Number(w.toFixed(2)),
      l: Number(l.toFixed(2)),
    }
  })
  return scaled
}

function createSmartLayout({
  floors,
  floorHeight,
  plotLength,
  plotWidth,
  plotFacing,
  bedrooms,
  kitchens,
  bathrooms,
  poojaRooms,
  storeRooms,
  verandahRooms,
  parkingSpaces,
  gardenAreas,
  balconyRooms,
  includeStairs,
  roomFloorPreferences,
  planStyle,
}: {
  floors: number
  floorHeight: number
  plotLength: number
  plotWidth: number
  plotFacing: PlotFacing
  bedrooms: number
  kitchens: number
  bathrooms: number
  poojaRooms: number
  storeRooms: number
  verandahRooms: number
  parkingSpaces: number
  gardenAreas: number
  balconyRooms: number
  includeStairs: boolean
  roomFloorPreferences?: RoomFloorPreferences
  planStyle: PlanStyle
}) {
  const roomPresets = getAdaptiveRoomPresets({
    floors,
    plotLength,
    plotWidth,
    bedrooms,
    kitchens,
    bathrooms,
    poojaRooms,
    storeRooms,
    verandahRooms,
    balconyRooms,
    parkingSpaces,
    gardenAreas,
    includeStairs,
    planStyle,
  })
  const getPreset = (type: RoomType) => roomPresets[type]
  const plotArea = plotLength * plotWidth
  const rooms: RoomConfig[] = []
  let roomIndex = 0
  const gridStep = 1.2
  const availableGrid = getAvailableGrid(plotLength, plotWidth, gridStep)
  const blockedVoids: Array<Pick<RoomConfig, "x" | "z" | "w" | "l">> = []
  const circulationEnabled = Math.min(plotLength, plotWidth) >= 22 && plotLength * plotWidth <= 1300
  const corridorWidth = clamp(Math.min(plotLength, plotWidth) * 0.12, 2.4, 3.8)
  const corridorBand: Pick<RoomConfig, "x" | "z" | "w" | "l"> =
    plotFacing === "North" || plotFacing === "South"
      ? { x: 0, z: 0, w: corridorWidth, l: Math.max(plotWidth - 1.6, corridorWidth + 1) }
      : { x: 0, z: 0, w: Math.max(plotLength - 1.6, corridorWidth + 1), l: corridorWidth }
  if (circulationEnabled) {
    blockedVoids.push(corridorBand)
  }

  const addRoomAt = (
    type: RoomType,
    floor: number,
    preferredNear?: Pick<RoomConfig, "x" | "z"> | null,
    lockedPosition?: Pick<RoomConfig, "x" | "z"> | null,
  ) => {
    const preset = getPreset(type)
    const floorRooms = rooms.filter((room) => room.floor === floor)
    const floorVoids = blockedVoids

    const spot =
      lockedPosition &&
      canPlaceRoom({
        x: lockedPosition.x,
        z: lockedPosition.z,
        w: preset.w,
        l: preset.l,
        plotLength,
        plotWidth,
        existingRooms: floorRooms,
        blockedZones: floorVoids,
      })
        ? lockedPosition
        : findEmptySpot({
            plotLength,
            plotWidth,
            roomSize: { w: preset.w, l: preset.l },
            roomType: type,
            existingRooms: floorRooms,
            blockedZones: floorVoids,
            preferredNear,
            availableGrid,
            gridStep,
          })

    if (!spot) return null

    const shifted = shiftCandidateRightUntilClear({
      candidate: { x: spot.x, z: spot.z, w: preset.w, l: preset.l },
      plotLength,
      plotWidth,
      existingRooms: floorRooms,
      blockedZones: floorVoids,
    })
    if (!shifted) return null

    roomIndex += 1
    const newRoom: RoomConfig = {
      id: `room-${type.toLowerCase()}-${Date.now()}-${roomIndex}`,
      type,
      floor,
      x: shifted.x,
      z: shifted.z,
      w: preset.w,
      l: preset.l,
      h: Math.min(preset.h, floorHeight),
      color: preset.color,
      hasWindow: type !== "Stairs" && type !== "Parking" && type !== "Garden" && type !== "Balcony",
      doorWidth: 0.95,
      windowWidth: 1.2,
    }
    rooms.push(newRoom)
    return newRoom
  }

  const getFloorDensity = (floor: number) => {
    const floorRooms = rooms.filter((room) => room.floor === floor)
    const area = floorRooms.reduce((sum, room) => sum + room.w * room.l, 0)
    return area / Math.max(plotArea, 1)
  }

  const getFloorsByDensity = (groundBias = 0) => {
    return Array.from({ length: floors }, (_, floor) => {
      const density = getFloorDensity(floor)
      const roomCount = rooms.filter((room) => room.floor === floor).length
      return {
        floor,
        score: density + roomCount * 0.012 + floor * groundBias,
      }
    })
      .sort((a, b) => a.score - b.score)
      .map((item) => item.floor)
  }

  const addRoomByDensity = (
    type: RoomType,
    {
      groundBias = 0,
      nearType,
    }: {
      groundBias?: number
      nearType?: RoomType
    } = {},
  ) => {
    const floorOrder = getFloorsByDensity(groundBias)
    for (const floor of floorOrder) {
      const floorRooms = rooms.filter((room) => room.floor === floor)
      const nearRoom = nearType ? floorRooms.find((room) => room.type === nearType) : floorRooms.find((room) => room.type === "Living")
      const created = addRoomAt(type, floor, nearRoom ?? null)
      if (created) return created
    }
    return null
  }
  const getZonedAnchor = (type: RoomType): Pick<RoomConfig, "x" | "z"> | null => {
    const hardMargin = 0.4
    if (type === "Pooja") {
      const preset = getPreset("Pooja")
      return {
        x: plotLength / 2 - preset.w / 2 - hardMargin,
        z: -plotWidth / 2 + preset.l / 2 + hardMargin,
      }
    }
    if (type === "Kitchen") {
      const preset = getPreset("Kitchen")
      return {
        x: plotLength / 2 - preset.w / 2 - hardMargin,
        z: plotWidth / 2 - preset.l / 2 - hardMargin,
      }
    }
    if (type === "Bedroom") {
      const preset = getPreset("Bedroom")
      return {
        x: -plotLength / 2 + preset.w / 2 + hardMargin,
        z: plotWidth / 2 - preset.l / 2 - hardMargin,
      }
    }
    if (type === "Verandah") {
      return getFrontAnchor(plotFacing, getPreset("Verandah"), plotLength, plotWidth)
    }
    return null
  }

  const preferredFloorsByType = (Object.keys(ROOM_PRESETS) as RoomType[]).reduce(
    (acc, type) => {
      const safeFloors = (roomFloorPreferences?.[type] ?? [])
        .map((floor) => Math.round(floor))
        .filter((floor) => Number.isFinite(floor) && floor >= 0 && floor < floors)
      acc[type] = safeFloors
      return acc
    },
    {} as Record<RoomType, number[]>,
  )
  const hasFloorPreferences = (Object.keys(preferredFloorsByType) as RoomType[]).some(
    (type) => preferredFloorsByType[type].length > 0,
  )

  let stairAnchor: { x: number; z: number } | null = null
  const addStackedStairs = () => {
    if (!includeStairs || floors <= 1) return
    for (let floor = 0; floor < floors; floor += 1) {
      const living = rooms.find((room) => room.floor === floor && room.type === "Living")
      if (!stairAnchor) {
        const stair = addRoomAt("Stairs", floor, living ?? null, living ? { x: living.x, z: living.z + 2.4 } : null)
        stairAnchor = stair ? { x: stair.x, z: stair.z } : null
        if (stair) blockedVoids.push({ x: stair.x, z: stair.z, w: stair.w, l: stair.l })
        continue
      }

      const stairPreset = getPreset("Stairs")
      const floorRooms = rooms.filter((room) => room.floor === floor)
      const canUseAnchor = canPlaceRoom({
        x: stairAnchor.x,
        z: stairAnchor.z,
        w: stairPreset.w,
        l: stairPreset.l,
        plotLength,
        plotWidth,
        existingRooms: floorRooms,
        blockedZones: blockedVoids,
      })
      if (canUseAnchor) {
        roomIndex += 1
        const stairRoom: RoomConfig = {
          id: `room-stairs-${Date.now()}-${roomIndex}`,
          type: "Stairs",
          floor,
          x: stairAnchor.x,
          z: stairAnchor.z,
          w: stairPreset.w,
          l: stairPreset.l,
          h: Math.min(stairPreset.h, floorHeight),
          color: stairPreset.color,
          hasWindow: false,
          doorWidth: 0.95,
          windowWidth: 1.2,
        }
        rooms.push(stairRoom)
        blockedVoids.push({ x: stairRoom.x, z: stairRoom.z, w: stairRoom.w, l: stairRoom.l })
      } else {
        const stair = addRoomAt("Stairs", floor, living ?? null)
        if (stair) blockedVoids.push({ x: stair.x, z: stair.z, w: stair.w, l: stair.l })
      }
    }
  }

  if (hasFloorPreferences) {
    const preferredCount = (type: RoomType) => preferredFloorsByType[type].length

    const addPreferredType = (
      type: RoomType,
      target: number,
      {
        groundBias = 0,
        nearType,
      }: {
        groundBias?: number
        nearType?: RoomType
      } = {},
    ) => {
      let placed = 0
      for (const preferredFloor of preferredFloorsByType[type]) {
        if (placed >= target) break
        const floor = type === "Parking" || type === "Garden" ? 0 : preferredFloor
        const floorRooms = rooms.filter((room) => room.floor === floor)
        const nearRoom = nearType ? floorRooms.find((room) => room.type === nearType) : floorRooms.find((room) => room.type === "Living")
        if (type === "Balcony") {
          const preset = getPreset("Balcony")
          const frontAnchor = getAnchoredSpreadPosition({
            facing: plotFacing,
            preset,
            plotLength,
            plotWidth,
            index: placed,
            total: target,
          })
          const created = addRoomAt("Balcony", floor, nearRoom ?? null, frontAnchor)
          if (created) placed += 1
          continue
        }
        if (type === "Parking") {
          const preset = getPreset("Parking")
          const frontBand = getAnchoredSpreadPosition({
            facing: plotFacing,
            preset,
            plotLength,
            plotWidth,
            index: placed,
            total: target,
          })
          const created = addRoomAt("Parking", 0, nearRoom ?? null, frontBand)
          if (created) placed += 1
          continue
        }
        if (type === "Garden") {
          const preset = getPreset("Garden")
          const rearBand = getAnchoredSpreadPosition({
            facing: oppositeFacing(plotFacing),
            preset,
            plotLength,
            plotWidth,
            index: placed,
            total: target,
          })
          const created = addRoomAt("Garden", 0, nearRoom ?? null, rearBand)
          if (created) placed += 1
          continue
        }
        const zonedAnchor = placed === 0 ? getZonedAnchor(type) : null
        const created = addRoomAt(type, floor, nearRoom ?? null, zonedAnchor)
        if (created) placed += 1
      }

      while (placed < target) {
        if (type === "Balcony") {
          const floor = floors > 1 ? Math.min(1 + (placed % Math.max(floors - 1, 1)), floors - 1) : 0
          const floorRooms = rooms.filter((room) => room.floor === floor)
          const living = floorRooms.find((room) => room.type === "Living")
          const preset = getPreset("Balcony")
          const frontAnchor = getAnchoredSpreadPosition({
            facing: plotFacing,
            preset,
            plotLength,
            plotWidth,
            index: placed,
            total: target,
          })
          const created = addRoomAt("Balcony", floor, living ?? null, frontAnchor)
          if (!created) break
          placed += 1
          continue
        }
        if (type === "Parking") {
          const floorRooms = rooms.filter((room) => room.floor === 0)
          const living = floorRooms.find((room) => room.type === "Living")
          const preset = getPreset("Parking")
          const frontBand = getAnchoredSpreadPosition({
            facing: plotFacing,
            preset,
            plotLength,
            plotWidth,
            index: placed,
            total: target,
          })
          const created = addRoomAt("Parking", 0, living ?? null, frontBand)
          if (!created) break
          placed += 1
          continue
        }
        if (type === "Garden") {
          const floorRooms = rooms.filter((room) => room.floor === 0)
          const living = floorRooms.find((room) => room.type === "Living")
          const preset = getPreset("Garden")
          const rearBand = getAnchoredSpreadPosition({
            facing: oppositeFacing(plotFacing),
            preset,
            plotLength,
            plotWidth,
            index: placed,
            total: target,
          })
          const created = addRoomAt("Garden", 0, living ?? null, rearBand)
          if (!created) break
          placed += 1
          continue
        }
        if (placed === 0) {
          const zonedAnchor = getZonedAnchor(type)
          if (zonedAnchor) {
            const preferredFloorOrder = getFloorsByDensity(groundBias)
            const firstFloor = preferredFloorOrder[0] ?? 0
            const floorRooms = rooms.filter((room) => room.floor === firstFloor)
            const nearRoom = nearType ? floorRooms.find((room) => room.type === nearType) : floorRooms.find((room) => room.type === "Living")
            const zonedCreated = addRoomAt(type, firstFloor, nearRoom ?? null, zonedAnchor)
            if (zonedCreated) {
              placed += 1
              continue
            }
          }
        }
        const created = addRoomByDensity(type, { groundBias, nearType })
        if (!created) break
        placed += 1
      }
    }

    const livingTarget = Math.max(1, preferredCount("Living"))
    const kitchenTarget = Math.max(kitchens, preferredCount("Kitchen"))
    const bedroomTarget = Math.max(bedrooms, preferredCount("Bedroom"))
    const bathroomTarget = Math.max(bathrooms, preferredCount("Bathroom"))
    const poojaTarget = Math.max(poojaRooms, preferredCount("Pooja"))
    const storeTarget = Math.max(storeRooms, preferredCount("Store"))
    const verandahTarget = Math.max(verandahRooms, preferredCount("Verandah"))
    const balconyTarget = Math.max(balconyRooms, preferredCount("Balcony"))
    const parkingTarget = Math.max(parkingSpaces, preferredCount("Parking"))
    const gardenTarget = Math.max(gardenAreas, preferredCount("Garden"))

    addPreferredType("Living", livingTarget, { groundBias: 0.08 })
    addStackedStairs()
    addPreferredType("Kitchen", kitchenTarget, { groundBias: 0.05, nearType: "Living" })
    addPreferredType("Bedroom", bedroomTarget, { groundBias: 0.03, nearType: "Living" })
    addPreferredType("Bathroom", bathroomTarget, { groundBias: 0.03, nearType: "Bedroom" })
    addPreferredType("Pooja", poojaTarget, { groundBias: 0.04, nearType: "Living" })
    addPreferredType("Store", storeTarget, { groundBias: 0.05, nearType: "Kitchen" })
    addPreferredType("Verandah", verandahTarget, { groundBias: 0.08, nearType: "Living" })
    addPreferredType("Balcony", balconyTarget, { groundBias: 0.01, nearType: "Living" })
    addPreferredType("Parking", parkingTarget, { nearType: "Living" })
    addPreferredType("Garden", gardenTarget, { nearType: "Living" })
  } else {
    for (let floor = 0; floor < floors; floor += 1) {
      const hardMargin = 0.4
      const kitchenPreset = getPreset("Kitchen")
      const poojaPreset = getPreset("Pooja")
      const bedroomPreset = getPreset("Bedroom")

      const northEast: Pick<RoomConfig, "x" | "z"> = {
        x: plotLength / 2 - poojaPreset.w / 2 - hardMargin,
        z: -plotWidth / 2 + poojaPreset.l / 2 + hardMargin,
      }
      const southEast: Pick<RoomConfig, "x" | "z"> = {
        x: plotLength / 2 - kitchenPreset.w / 2 - hardMargin,
        z: plotWidth / 2 - kitchenPreset.l / 2 - hardMargin,
      }
      const southWest: Pick<RoomConfig, "x" | "z"> = {
        x: -plotLength / 2 + bedroomPreset.w / 2 + hardMargin,
        z: plotWidth / 2 - bedroomPreset.l / 2 - hardMargin,
      }
      const center: Pick<RoomConfig, "x" | "z"> = { x: 0, z: 0 }

      const poojaHard = floor === 0 && poojaRooms > 0 ? addRoomAt("Pooja", floor, null, northEast) : null
      const kitchenHard = floor < kitchens ? addRoomAt("Kitchen", floor, poojaHard ?? null, southEast) : null
      const masterBedroom = floor < bedrooms ? addRoomAt("Bedroom", floor, kitchenHard ?? null, southWest) : null
      const living = addRoomAt("Living", floor, masterBedroom ?? kitchenHard ?? null, center)

      if (includeStairs && floors > 1) {
        if (!stairAnchor) {
          const stair = addRoomAt("Stairs", floor, living ?? null, living ? { x: living.x, z: living.z + 2.4 } : null)
          stairAnchor = stair ? { x: stair.x, z: stair.z } : null
          if (stair) blockedVoids.push({ x: stair.x, z: stair.z, w: stair.w, l: stair.l })
        } else {
          const stairPreset = getPreset("Stairs")
          const floorRooms = rooms.filter((room) => room.floor === floor)
          const canUseAnchor = canPlaceRoom({
            x: stairAnchor.x,
            z: stairAnchor.z,
            w: stairPreset.w,
            l: stairPreset.l,
            plotLength,
            plotWidth,
            existingRooms: floorRooms,
            blockedZones: blockedVoids,
          })
          if (canUseAnchor) {
            roomIndex += 1
            const stairRoom: RoomConfig = {
              id: `room-stairs-${Date.now()}-${roomIndex}`,
              type: "Stairs",
              floor,
              x: stairAnchor.x,
              z: stairAnchor.z,
              w: stairPreset.w,
              l: stairPreset.l,
              h: Math.min(stairPreset.h, floorHeight),
              color: stairPreset.color,
              hasWindow: false,
              doorWidth: 0.95,
              windowWidth: 1.2,
            }
            rooms.push(stairRoom)
            blockedVoids.push({ x: stairRoom.x, z: stairRoom.z, w: stairRoom.w, l: stairRoom.l })
          } else {
            const stair = addRoomAt("Stairs", floor, living ?? null)
            if (stair) blockedVoids.push({ x: stair.x, z: stair.z, w: stair.w, l: stair.l })
          }
        }
      }
    }

    const placedKitchens = rooms.filter((room) => room.type === "Kitchen").length
    for (let i = placedKitchens; i < kitchens; i += 1) {
      addRoomByDensity("Kitchen", { groundBias: 0.035, nearType: "Living" })
    }

    const placedBedrooms = rooms.filter((room) => room.type === "Bedroom").length
    for (let i = placedBedrooms; i < bedrooms; i += 1) {
      addRoomByDensity("Bedroom", { groundBias: 0.028, nearType: "Living" })
    }

    for (let i = 0; i < bathrooms; i += 1) {
      addRoomByDensity("Bathroom", { groundBias: 0.02, nearType: "Bedroom" })
    }

    for (let i = 0; i < storeRooms; i += 1) {
      addRoomByDensity("Store", { groundBias: 0.03, nearType: "Kitchen" })
    }
    for (let i = 0; i < verandahRooms; i += 1) {
      addRoomByDensity("Verandah", { groundBias: 0.08, nearType: "Living" })
    }
    for (let i = 0; i < balconyRooms; i += 1) {
      const floor = floors > 1 ? Math.min(1 + (i % Math.max(floors - 1, 1)), floors - 1) : 0
      const living = rooms.find((room) => room.floor === floor && room.type === "Living")
      const preset = getPreset("Balcony")
      const frontAnchor = getFrontAnchor(plotFacing, preset, plotLength, plotWidth)
      addRoomAt("Balcony", floor, living ?? null, frontAnchor)
    }
    for (let i = 0; i < parkingSpaces; i += 1) {
      const floor = 0
      const living = rooms.find((room) => room.floor === floor && room.type === "Living")
      const preset = getPreset("Parking")
      const frontFacing = plotFacing
      const frontBand = getAnchoredSpreadPosition({
        facing: frontFacing,
        preset,
        plotLength,
        plotWidth,
        index: i,
        total: parkingSpaces,
      })
      addRoomAt("Parking", floor, living ?? null, frontBand)
    }
    for (let i = 0; i < gardenAreas; i += 1) {
      const floor = 0
      const living = rooms.find((room) => room.floor === floor && room.type === "Living")
      const preset = getPreset("Garden")
      const rearFacing = oppositeFacing(plotFacing)
      const rearBand = getAnchoredSpreadPosition({
        facing: rearFacing,
        preset,
        plotLength,
        plotWidth,
        index: i,
        total: gardenAreas,
      })
      addRoomAt("Garden", floor, living ?? null, rearBand)
    }
    const placedPooja = rooms.filter((room) => room.type === "Pooja").length
    for (let i = placedPooja; i < poojaRooms; i += 1) {
      const preset = getPreset("Pooja")
      const floorOrder = getFloorsByDensity(0.04)
      let placed = false
      for (const floor of floorOrder) {
        const floorRooms = rooms.filter((room) => room.floor === floor)
        const living = floorRooms.find((room) => room.type === "Living")
        const spot = findEmptySpot({
          plotLength,
          plotWidth,
          roomSize: { w: preset.w, l: preset.l },
          roomType: "Pooja",
          existingRooms: floorRooms,
          blockedZones: blockedVoids,
          preferredNear: living ?? null,
          availableGrid,
          gridStep,
        })
        if (!spot) continue
        roomIndex += 1
        rooms.push({
          id: `room-pooja-${Date.now()}-${roomIndex}`,
          type: "Pooja",
          floor,
          x: spot.x,
          z: spot.z,
          w: preset.w,
          l: preset.l,
          h: Math.min(preset.h, floorHeight),
          color: preset.color,
          hasWindow: true,
          doorWidth: 0.95,
          windowWidth: 1.2,
        })
        placed = true
        break
      }
      if (!placed) continue
    }

    for (let floor = 0; floor < floors; floor += 1) {
      let density = getFloorDensity(floor)
      const floorRooms = rooms.filter((room) => room.floor === floor)
      const living = floorRooms.find((room) => room.type === "Living")
      if (floor === 0 && density < 0.66 && rooms.filter((room) => room.type === "Verandah").length < verandahRooms) {
        const verandahPreset = getPreset("Verandah")
        const frontAnchor = getAnchoredSpreadPosition({
          facing: plotFacing,
          preset: verandahPreset,
          plotLength,
          plotWidth,
          index: 0,
          total: 1,
        })
        addRoomAt("Verandah", floor, living ?? null, frontAnchor)
      }
      density = getFloorDensity(floor)
      if (density < 0.56 && rooms.filter((room) => room.type === "Store").length < storeRooms) {
        const kitchen = rooms.find((room) => room.floor === floor && room.type === "Kitchen")
        addRoomAt("Store", floor, kitchen ?? living ?? null)
      }
      density = getFloorDensity(floor)
      if (density < 0.5 && floor > 0 && rooms.filter((room) => room.type === "Balcony").length < balconyRooms) {
        const upperLiving = rooms.find((room) => room.floor === floor && room.type === "Living")
        const balconyPreset = getPreset("Balcony")
        const frontAnchor = getAnchoredSpreadPosition({
          facing: plotFacing,
          preset: balconyPreset,
          plotLength,
          plotWidth,
          index: 0,
          total: 1,
        })
        addRoomAt("Balcony", floor, upperLiving ?? living ?? null, frontAnchor)
      }
      density = getFloorDensity(floor)
      if (floor === 0 && density < 0.5 && rooms.filter((room) => room.type === "Garden").length < gardenAreas) {
        const gardenPreset = getPreset("Garden")
        const rearAnchor = getAnchoredSpreadPosition({
          facing: oppositeFacing(plotFacing),
          preset: gardenPreset,
          plotLength,
          plotWidth,
          index: 0,
          total: 1,
        })
        addRoomAt("Garden", floor, living ?? null, rearAnchor)
      }
    }
  }

  const rebalanceByFloorPreferences = (inputRooms: RoomConfig[]) => {
    if (!hasFloorPreferences) return inputRooms
    const adjustedRooms = inputRooms.map((room) => ({ ...room }))
    const adjustableTypes = (Object.keys(ROOM_PRESETS) as RoomType[]).filter((type) => type !== "Parking" && type !== "Garden")

    for (const type of adjustableTypes) {
      const preferredFloors = preferredFloorsByType[type]
      if (!preferredFloors || preferredFloors.length === 0) continue

      const roomsOfType = adjustedRooms.filter((room) => room.type === type)
      if (roomsOfType.length === 0) continue

      const targetByFloor = new Map<number, number>()
      for (const floor of preferredFloors) {
        targetByFloor.set(floor, (targetByFloor.get(floor) ?? 0) + 1)
      }

      const currentByFloor = new Map<number, number>()
      for (const room of roomsOfType) {
        currentByFloor.set(room.floor, (currentByFloor.get(room.floor) ?? 0) + 1)
      }

      const donors: RoomConfig[] = []
      for (const room of roomsOfType) {
        const floor = room.floor
        const target = targetByFloor.get(floor) ?? 0
        const current = currentByFloor.get(floor) ?? 0
        if (current > target) {
          donors.push(room)
          currentByFloor.set(floor, current - 1)
        }
      }

      for (let floor = 0; floor < floors; floor += 1) {
        const target = targetByFloor.get(floor) ?? 0
        let current = currentByFloor.get(floor) ?? 0
        while (current < target) {
          let donor = donors.pop()
          if (!donor) {
            donor =
              roomsOfType.find((room) => {
                const sourceFloor = room.floor
                const sourceCurrent = currentByFloor.get(sourceFloor) ?? 0
                const sourceTarget = targetByFloor.get(sourceFloor) ?? 0
                return sourceCurrent > sourceTarget
              }) ?? undefined
            if (!donor) break
            const sourceFloor = donor.floor
            currentByFloor.set(sourceFloor, Math.max((currentByFloor.get(sourceFloor) ?? 0) - 1, 0))
          }

          donor.floor = floor
          current += 1
          currentByFloor.set(floor, current)
        }
      }
    }

    return adjustedRooms
  }

  const roomsAfterFloorRebalance = rebalanceByFloorPreferences(rooms)
  const snapped: RoomConfig[] = []
  const shouldCompactFloors = plotArea <= 1200
  for (let floor = 0; floor < floors; floor += 1) {
    const floorRooms = roomsAfterFloorRebalance.filter((room) => room.floor === floor)
    const snappedRooms = snapAdjacentRooms({ floorRooms, plotLength, plotWidth })
    const baseRooms = shouldCompactFloors
      ? compactFloorRooms({
          floorRooms: snappedRooms,
          plotLength,
          plotWidth,
          blockedZones: blockedVoids,
        })
      : snappedRooms
    const overlapResolved = resolveFloorOverlaps({
      floorRooms: baseRooms,
      plotLength,
      plotWidth,
      blockedZones: blockedVoids,
    })
    snapped.push(...overlapResolved)
  }

  return snapped
}

function areRoomsAdjacent(a: RoomConfig, b: RoomConfig, tolerance = 0.42) {
  if (a.floor !== b.floor) return false
  const aMinX = a.x - a.w / 2
  const aMaxX = a.x + a.w / 2
  const aMinZ = a.z - a.l / 2
  const aMaxZ = a.z + a.l / 2
  const bMinX = b.x - b.w / 2
  const bMaxX = b.x + b.w / 2
  const bMinZ = b.z - b.l / 2
  const bMaxZ = b.z + b.l / 2

  const xTouch = Math.abs(aMaxX - bMinX) <= tolerance || Math.abs(aMinX - bMaxX) <= tolerance
  const zTouch = Math.abs(aMaxZ - bMinZ) <= tolerance || Math.abs(aMinZ - bMaxZ) <= tolerance
  const zOverlap = overlaps1D(aMinZ + 0.12, aMaxZ - 0.12, bMinZ, bMaxZ)
  const xOverlap = overlaps1D(aMinX + 0.12, aMaxX - 0.12, bMinX, bMaxX)
  return (xTouch && zOverlap) || (zTouch && xOverlap)
}

function buildAdjacencyGraph(rooms: RoomConfig[]) {
  const graph = new Map<string, Set<string>>()
  for (const room of rooms) {
    graph.set(room.id, new Set<string>())
  }
  for (let i = 0; i < rooms.length; i += 1) {
    for (let j = i + 1; j < rooms.length; j += 1) {
      const a = rooms[i]
      const b = rooms[j]
      if (!areRoomsAdjacent(a, b)) continue
      graph.get(a.id)?.add(b.id)
      graph.get(b.id)?.add(a.id)
    }
  }

  const stairs = rooms.filter((room) => room.type === "Stairs")
  for (const stair of stairs) {
    for (const other of stairs) {
      if (other.id === stair.id || Math.abs(other.floor - stair.floor) !== 1) continue
      const closeBy = Math.abs(other.x - stair.x) <= 1.2 && Math.abs(other.z - stair.z) <= 1.2
      if (!closeBy) continue
      graph.get(stair.id)?.add(other.id)
      graph.get(other.id)?.add(stair.id)
    }
  }

  return graph
}

function isNearFrontBoundary(room: RoomConfig, plotFacing: PlotFacing, plotLength: number, plotWidth: number) {
  const halfL = plotLength / 2
  const halfW = plotWidth / 2
  const maxOffset = 1.8
  if (plotFacing === "North") return room.z - room.l / 2 <= -halfW + maxOffset
  if (plotFacing === "South") return room.z + room.l / 2 >= halfW - maxOffset
  if (plotFacing === "East") return room.x + room.w / 2 >= halfL - maxOffset
  return room.x - room.w / 2 <= -halfL + maxOffset
}

function validateIndianLayout({
  rooms,
  floors,
  plotLength,
  plotWidth,
  plotFacing,
  requirements,
}: {
  rooms: RoomConfig[]
  floors: number
  plotLength: number
  plotWidth: number
  plotFacing: PlotFacing
  requirements: PlannerRequirements
}): LayoutValidationReport {
  const issues: string[] = []
  const warnings: string[] = []
  const openSpaceLabels: string[] = []
  const collisions = detectRoomCollisions(rooms)
  if (collisions.size > 0) {
    issues.push(`Overlap detected in ${collisions.size} room(s).`)
  }

  const graph = buildAdjacencyGraph(rooms)
  const roomById = new Map(rooms.map((room) => [room.id, room]))
  const indoorRooms = rooms.filter((room) => room.type !== "Garden" && room.type !== "Balcony" && room.type !== "Parking")
  const entryNodes = rooms
    .filter((room) => room.floor === 0 && (room.type === "Living" || room.type === "Parking" || room.type === "Verandah"))
    .map((room) => room.id)
  if (entryNodes.length === 0) {
    issues.push("No entry-connected room on ground floor (need Living/Parking/Verandah near entrance).")
  }

  const reachable = new Set<string>()
  const queue = [...entryNodes]
  while (queue.length > 0) {
    const id = queue.shift()
    if (!id || reachable.has(id)) continue
    reachable.add(id)
    const neighbors = graph.get(id)
    if (!neighbors) continue
    for (const next of neighbors) {
      if (!reachable.has(next)) queue.push(next)
    }
  }

  for (const room of indoorRooms) {
    const linked = graph.get(room.id)?.size ?? 0
    if (room.type !== "Living" && room.type !== "Stairs" && linked === 0) {
      issues.push(`${room.type} (${room.id}) is floating (no wall/corridor connection).`)
    }
    if (entryNodes.length > 0 && !reachable.has(room.id)) {
      issues.push(`${room.type} (${room.id}) is not reachable from entrance path.`)
    }
  }

  for (const room of rooms) {
    const neighborTypes = new Set(
      Array.from(graph.get(room.id) ?? [])
        .map((id) => roomById.get(id)?.type)
        .filter((type): type is RoomType => Boolean(type)),
    )
    const minSize = MIN_ROOM_DIMENSIONS[room.type]
    if (minSize && (room.w + 0.01 < minSize.w || room.l + 0.01 < minSize.l)) {
      warnings.push(
        `${room.type} (${room.id}) is below recommended size (${room.w.toFixed(1)}x${room.l.toFixed(1)} ft, min ${minSize.w}x${minSize.l}).`,
      )
    }
    if (room.type === "Kitchen" && !neighborTypes.has("Living") && !neighborTypes.has("Store")) {
      issues.push(`Kitchen (${room.id}) must connect to Living or Store.`)
    }
    if (room.type === "Store" && !neighborTypes.has("Kitchen")) {
      issues.push(`Store (${room.id}) should be adjacent to Kitchen.`)
    }
    if (room.type === "Bathroom" && !neighborTypes.has("Bedroom") && !neighborTypes.has("Living")) {
      issues.push(`Bathroom (${room.id}) should connect to Bedroom or common Living zone.`)
    }
    if (room.type === "Pooja" && neighborTypes.has("Bathroom")) {
      warnings.push(`Pooja (${room.id}) is directly adjacent to Bathroom.`)
    }
    if (room.type === "Stairs" && !neighborTypes.has("Living") && !neighborTypes.has("Verandah")) {
      issues.push(`Stairs (${room.id}) should connect to common access zone.`)
    }
  }

  const groundParking = rooms.filter((room) => room.type === "Parking" && room.floor === 0)
  if (requirements.parkingSpaces > 0 && groundParking.length === 0) {
    issues.push("Parking requested but no ground-floor parking room generated.")
  }
  for (const parking of groundParking) {
    if (!isNearFrontBoundary(parking, plotFacing, plotLength, plotWidth)) {
      issues.push(`Parking (${parking.id}) must stay near front boundary.`)
    }
  }

  if (floors > 1 && requirements.includeStairs) {
    const stairsCount = rooms.filter((room) => room.type === "Stairs").length
    if (stairsCount === 0) {
      issues.push("Multi-floor plan requires staircase connectivity.")
    }
  }

  const plotArea = plotLength * plotWidth
  for (let floor = 0; floor < floors; floor += 1) {
    const floorRooms = rooms.filter((room) => room.floor === floor)
    const occupied = floorRooms.reduce((sum, room) => sum + room.w * room.l, 0)
    const remaining = Math.max(plotArea - occupied, 0)
    const remainingRatio = remaining / Math.max(plotArea, 1)
    if (remaining <= 5) continue

    const label =
      floor === 0
        ? remainingRatio > 0.38
          ? "Passage / Lobby / Setback"
          : "Setback / Circulation"
        : remainingRatio > 0.32
          ? "Open Terrace / Light Well"
          : "Circulation"
    openSpaceLabels.push(`Floor ${floor + 1}: ${label} (${remaining.toFixed(1)} sq ft)`)

    const hasExplicitOpen = floorRooms.some((room) => room.type === "Garden" || room.type === "Balcony" || room.type === "Verandah" || room.type === "Parking")
    if (remainingRatio > 0.48 && !hasExplicitOpen) {
      issues.push(`Floor ${floor + 1} has large unlabeled empty area (${remaining.toFixed(1)} sq ft).`)
    }
  }

  return {
    valid: issues.length === 0,
    issues: Array.from(new Set(issues)).slice(0, 8),
    warnings: Array.from(new Set(warnings)).slice(0, 6),
    openSpaceLabels: Array.from(new Set(openSpaceLabels)).slice(0, 6),
  }
}

function buildRecommendedFloorAllocation(floors: number, requirements: PlannerRequirements) {
  const allocation: Array<{ floor: number; rooms: string[] }> = []
  let remainingBedrooms = requirements.bedrooms
  let remainingBathrooms = requirements.bathrooms
  let remainingBalconies = requirements.balconyRooms
  let remainingStores = requirements.storeRooms
  let remainingPooja = requirements.poojaRooms
  let remainingParking = requirements.parkingSpaces
  let remainingKitchen = requirements.kitchens

  for (let floor = 0; floor < floors; floor += 1) {
    const rooms: string[] = []
    if (floor === 0) {
      if (remainingParking > 0) {
        rooms.push("Parking")
        remainingParking -= 1
      }
      rooms.push("Living")
      if (remainingKitchen > 0) {
        rooms.push("Kitchen")
        remainingKitchen -= 1
      }
      if (remainingBedrooms > 0) {
        rooms.push("Bedroom")
        remainingBedrooms -= 1
      }
      if (remainingBathrooms > 0) {
        rooms.push("Bath")
        remainingBathrooms -= 1
      }
      if (remainingPooja > 0) {
        rooms.push("Pooja")
        remainingPooja -= 1
      }
      if (requirements.includeStairs && floors > 1) rooms.push("Stairs")
    } else {
      if (remainingBedrooms > 0) {
        rooms.push("Bedroom")
        remainingBedrooms -= 1
      }
      if (remainingBathrooms > 0) {
        rooms.push("Bath")
        remainingBathrooms -= 1
      }
      if (remainingBalconies > 0) {
        rooms.push("Balcony")
        remainingBalconies -= 1
      }
      if (remainingStores > 0) {
        rooms.push("Store")
        remainingStores -= 1
      }
      if (remainingPooja > 0) {
        rooms.push("Pooja")
        remainingPooja -= 1
      }
      if (remainingKitchen > 0) {
        rooms.push("Kitchen")
        remainingKitchen -= 1
      }
      if (requirements.includeStairs && floors > 1) rooms.push("Stairs")
    }
    allocation.push({ floor, rooms })
  }
  return allocation
}

function estimateFeasibility({
  plotLength,
  plotWidth,
  floors,
  requirements,
  inputs,
}: {
  plotLength: number
  plotWidth: number
  floors: number
  requirements: PlannerRequirements
  inputs: PlannerInputs
}): FeasibilityReport {
  const reasons: string[] = []
  const suggestions: string[] = []
  const setbackPerSide = inputs.planStyle === "luxury" ? 2.5 : inputs.planStyle === "compact" ? 1.6 : 2
  const cornerBonus = inputs.cornerPlot ? 1.04 : 1
  const civil = calcCivilUsableBreakdown({
    lengthFt: plotLength,
    breadthFt: plotWidth,
    floors,
    planStyle: inputs.planStyle,
    includeStairs: requirements.includeStairs && floors > 1,
    staircaseType: inputs.staircaseType,
  })
  const grossPlotAreaSqFt = civil.grossPlotAreaSqFt
  const openSpaceDeductionSqFt = civil.openSpaceDeductionSqFt
  const wallDeductionSqFt = civil.wallDeductionSqFt
  const usablePerFloorSqFt = civil.usablePerFloorSqFt
  const buildableLength = Math.max(plotLength - setbackPerSide * 2, 8)
  const buildableWidth = Math.max(plotWidth - setbackPerSide * 2, 8)
  const buildableBySetbacksSqFt = buildableLength * buildableWidth * cornerBonus
  const buildablePerFloorSqFt = Math.max(Math.min(buildableBySetbacksSqFt, usablePerFloorSqFt * cornerBonus), 0)
  const stairAllowance = civil.stairDeductionSqFt
  const buildableTotalSqFt = Math.max(buildablePerFloorSqFt * floors - stairAllowance, 0)
  const usableTotalSqFt = civil.usableTotalSqFt

  const areaPerUnit: Record<RequirementKey, number> = {
    bedrooms: MIN_ROOM_DIMENSIONS.Bedroom!.w * MIN_ROOM_DIMENSIONS.Bedroom!.l,
    kitchens: MIN_ROOM_DIMENSIONS.Kitchen!.w * MIN_ROOM_DIMENSIONS.Kitchen!.l,
    bathrooms: MIN_ROOM_DIMENSIONS.Bathroom!.w * MIN_ROOM_DIMENSIONS.Bathroom!.l,
    poojaRooms: MIN_ROOM_DIMENSIONS.Pooja!.w * MIN_ROOM_DIMENSIONS.Pooja!.l,
    storeRooms: MIN_ROOM_DIMENSIONS.Store!.w * MIN_ROOM_DIMENSIONS.Store!.l,
    verandahRooms: 45,
    parkingSpaces: MIN_ROOM_DIMENSIONS.Parking!.w * MIN_ROOM_DIMENSIONS.Parking!.l,
    gardenAreas: 70,
    balconyRooms: MIN_ROOM_DIMENSIONS.Balcony!.w * MIN_ROOM_DIMENSIONS.Balcony!.l,
  }
  const circulationFactor = inputs.planStyle === "luxury" ? 1.35 : inputs.planStyle === "compact" ? 1.18 : 1.24
  const livingBase = MIN_ROOM_DIMENSIONS.Living!.w * MIN_ROOM_DIMENSIONS.Living!.l
  const requiredApproxSqFt =
    (requirements.bedrooms * areaPerUnit.bedrooms +
      requirements.kitchens * areaPerUnit.kitchens +
      requirements.bathrooms * areaPerUnit.bathrooms +
      requirements.poojaRooms * areaPerUnit.poojaRooms +
      requirements.storeRooms * areaPerUnit.storeRooms +
      requirements.verandahRooms * areaPerUnit.verandahRooms +
      requirements.parkingSpaces * areaPerUnit.parkingSpaces +
      requirements.gardenAreas * areaPerUnit.gardenAreas +
      requirements.balconyRooms * areaPerUnit.balconyRooms +
      floors * livingBase) *
    circulationFactor

  if (inputs.bathPreference === "attached" && requirements.bathrooms < requirements.bedrooms) {
    reasons.push("Attached bath preference conflicts with current bath count.")
    suggestions.push("Increase bathrooms or use mixed attached/common bath.")
  }
  if (inputs.parkingRequired && requirements.parkingSpaces === 0) {
    reasons.push("Parking is marked required but no parking room is requested.")
    suggestions.push("Add at least one compact parking bay or disable parking requirement.")
  }
  if (requirements.parkingSpaces > 0 && plotWidth < MIN_ROOM_DIMENSIONS.Parking!.w + 1) {
    reasons.push("Frontage is too narrow for standard parking bay.")
    suggestions.push("Use compact parking or reduce front setback requirement.")
  }
  if (inputs.familySize >= 6 && requirements.bedrooms < 3) {
    reasons.push("Bedroom count is low for large family size.")
    suggestions.push("Add one compact bedroom on upper floor.")
  }
  if (inputs.elderlyMembers > 0 && floors > 1) {
    reasons.push("Elderly members detected in a multi-floor plan.")
    suggestions.push("Keep one bedroom + bathroom on ground floor and prefer dog-leg staircase.")
  }
  if (inputs.childrenCount > 0 && requirements.balconyRooms > 0) {
    suggestions.push("Use protected balcony railing and maintain safe edge clearance for kids.")
  }
  if (requirements.includeStairs && floors > 1 && inputs.staircaseType === "straight" && buildablePerFloorSqFt < 620) {
    reasons.push("Straight staircase may consume too much usable area in compact plan.")
    suggestions.push("Use dog-leg staircase for space efficiency.")
  }
  if (inputs.futureExpansionYears > 0 && inputs.futureExpansionYears <= 5 && floors < 2 && buildablePerFloorSqFt < 650) {
    reasons.push("Future expansion requested soon but current floor strategy is tight.")
    suggestions.push("Reserve stair core now or consider initial G+1 structural provision.")
  }
  if (requiredApproxSqFt > buildableTotalSqFt) {
    reasons.push("Required program area exceeds estimated buildable area.")
    suggestions.push("Reduce one optional space (balcony/store/pooja) or use compact room sizes.")
  }
  if (usablePerFloorSqFt < 320) {
    reasons.push("Net usable area per floor is very tight after open-space and wall deductions.")
    suggestions.push("Increase plot size or reduce room program for workable circulation.")
  }
  if (inputs.budgetLakh > 0) {
    const budgetPerSqFt = (inputs.budgetLakh * 100_000) / Math.max(requiredApproxSqFt, 1)
    if (budgetPerSqFt < 1700) {
      reasons.push("Budget appears tight for requested built-up program.")
      suggestions.push("Choose compact plan style and reduce non-essential rooms.")
    }
  }

  const overloadRatio = requiredApproxSqFt / Math.max(buildableTotalSqFt, 1)
  const status: FeasibilityStatus =
    overloadRatio > 1.2 || reasons.length >= 5
      ? "not_feasible"
      : overloadRatio > 1.03 || reasons.length >= 2
        ? "partially_feasible"
        : "feasible"

  return {
    status,
    reasons: Array.from(new Set(reasons)).slice(0, 6),
    suggestions: Array.from(new Set(suggestions)).slice(0, 6),
    buildablePerFloorSqFt: Number(buildablePerFloorSqFt.toFixed(1)),
    buildableTotalSqFt: Number(buildableTotalSqFt.toFixed(1)),
    requiredApproxSqFt: Number(requiredApproxSqFt.toFixed(1)),
    civilBreakdown: {
      grossPlotAreaSqFt: Number(grossPlotAreaSqFt.toFixed(1)),
      openSpaceDeductionSqFt: Number(openSpaceDeductionSqFt.toFixed(1)),
      wallDeductionSqFt: Number(wallDeductionSqFt.toFixed(1)),
      usablePerFloorSqFt: Number(usablePerFloorSqFt.toFixed(1)),
      stairDeductionSqFt: Number(stairAllowance.toFixed(1)),
      usableTotalSqFt: Number(usableTotalSqFt.toFixed(1)),
    },
    floorAllocation: buildRecommendedFloorAllocation(floors, requirements),
  }
}

function OptionalModel({
  path,
  position,
  rotation,
  scaleMultiplier = 1,
  targetSize,
  anchorY = "bottom",
  fitMode = "contain",
  autoRotateToFitXZ = false,
}: {
  path: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scaleMultiplier?: number
  targetSize: [number, number, number]
  anchorY?: "bottom" | "center"
  fitMode?: "contain" | "footprint"
  autoRotateToFitXZ?: boolean
}) {
  const { scene } = useGLTF(path)
  const { normalizedScale, localOffset, autoYRotation } = useMemo(() => {
    const bounds = new Box3().setFromObject(scene)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const minY = bounds.min.y
    const [targetX, targetY, targetZ] = targetSize
    const safeX = Math.max(size.x, 0.01)
    const safeY = Math.max(size.y, 0.01)
    const safeZ = Math.max(size.z, 0.01)
    const normalFootprint = Math.min(targetX / safeX, targetZ / safeZ)
    const rotatedFootprint = Math.min(targetX / safeZ, targetZ / safeX)
    const useRotated = autoRotateToFitXZ && rotatedFootprint > normalFootprint
    const fitX = targetX / (useRotated ? safeZ : safeX)
    const fitZ = targetZ / (useRotated ? safeX : safeZ)
    const fitY = targetY / safeY
    const containScale = Math.min(fitX, fitY, fitZ)
    const footprintScale = Math.min(Math.min(fitX, fitZ), fitY * 1.2)
    const fitScale = fitMode === "footprint" ? footprintScale : containScale
    const offsetY = anchorY === "center" ? -center.y : -minY
    return {
      normalizedScale: Math.max(fitScale * scaleMultiplier, 0.0001),
      localOffset: [-center.x, offsetY, -center.z] as [number, number, number],
      autoYRotation: useRotated ? Math.PI / 2 : 0,
    }
  }, [anchorY, autoRotateToFitXZ, fitMode, scaleMultiplier, scene, targetSize])
  const finalRotation: [number, number, number] = rotation
    ? [rotation[0], rotation[1] + autoYRotation, rotation[2]]
    : [0, autoYRotation, 0]

  return (
    <group position={position} rotation={finalRotation} scale={normalizedScale}>
      <Clone object={scene} position={localOffset} castShadow receiveShadow />
    </group>
  )
}

function SystemOverlay({
  floor,
  floorHeight,
  plotLength,
  plotWidth,
  mode,
}: {
  floor: number
  floorHeight: number
  plotLength: number
  plotWidth: number
  mode: OverlayMode
}) {
  if (mode === "none") return null
  const y = floor * floorHeight + 0.12
  const halfL = plotLength / 2 - 0.8
  const halfW = plotWidth / 2 - 0.8
  const color = mode === "electrical" ? "#f97316" : "#0ea5e9"
  const branchColor = mode === "electrical" ? "#fb923c" : "#38bdf8"

  return (
    <group>
      <Line
        points={[
          [-halfL, y, -halfW],
          [-halfL * 0.3, y, -halfW * 0.35],
          [halfL * 0.25, y, halfW * 0.2],
          [halfL, y, halfW],
        ]}
        color={color}
        lineWidth={2}
      />
      <Line
        points={[
          [0, y, -halfW],
          [0, y, -halfW * 0.2],
          [halfL * 0.5, y, -halfW * 0.2],
        ]}
        color={branchColor}
        lineWidth={1.4}
      />
      <Text position={[halfL * 0.55, y + 0.25, -halfW * 0.2]} fontSize={0.22} color={branchColor} anchorX="center">
        {mode === "electrical" ? "Electrical" : "Plumbing"}
      </Text>
    </group>
  )
}

function LayoutDebugOverlay({
  floor,
  floorHeight,
  plotLength,
  plotWidth,
  rooms,
  snapLinks,
  stairCutouts,
}: {
  floor: number
  floorHeight: number
  plotLength: number
  plotWidth: number
  rooms: RoomConfig[]
  snapLinks: SnapLink[]
  stairCutouts: StairCutout[]
}) {
  const y = floor * floorHeight + 0.05
  const gridPoints = useMemo(() => {
    const fullGrid = getAvailableGrid(plotLength, plotWidth, 2.4)
    return fullGrid
  }, [plotLength, plotWidth])
  const floorRooms = rooms.filter((room) => room.floor === floor)
  const floorLinks = snapLinks.filter((link) => link.floor === floor)

  return (
    <group>
      {gridPoints.map((point, index) => (
        <mesh key={`grid-${floor}-${index}`} position={[point.x, y, point.z]} receiveShadow>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.45} />
        </mesh>
      ))}

      {stairCutouts.map((cutout, index) => (
        <mesh key={`void-${floor}-${index}`} position={[cutout.x, y + 0.01, cutout.z]} receiveShadow>
          <boxGeometry args={[cutout.w, 0.05, cutout.l]} />
          <meshStandardMaterial color="#f97316" transparent opacity={0.4} />
        </mesh>
      ))}

      {floorLinks.map((link, index) => (
        <Line key={`snap-${floor}-${index}`} points={[link.from, link.to]} color="#22c55e" lineWidth={1.4} />
      ))}

      {floorRooms.map((room) => (
        <Text key={`label-${room.id}`} position={[room.x, y + 0.18, room.z]} fontSize={0.12} color="#0f172a" anchorX="center">
          {room.type}
        </Text>
      ))}
    </group>
  )
}

function SnapGuideOverlay({
  guide,
  floorHeight,
  plotLength,
  plotWidth,
}: {
  guide: SnapGuide | null
  floorHeight: number
  plotLength: number
  plotWidth: number
}) {
  if (!guide) return null
  const y = guide.floor * floorHeight + 0.08
  return (
    <group>
      {guide.x !== undefined && (
        <Line
          points={[
            [guide.x, y, -plotWidth / 2],
            [guide.x, y, plotWidth / 2],
          ]}
          color="#10b981"
          lineWidth={1.8}
        />
      )}
      {guide.z !== undefined && (
        <Line
          points={[
            [-plotLength / 2, y, guide.z],
            [plotLength / 2, y, guide.z],
          ]}
          color="#10b981"
          lineWidth={1.8}
        />
      )}
    </group>
  )
}

function WalkthroughCameraRig({
  enabled,
  target,
}: {
  enabled: boolean
  target: [number, number, number] | null
}) {
  const { camera } = useThree()

  useFrame(() => {
    if (!enabled || !target) return
    const desiredPosition = [target[0] + 8, target[1] + 4.5, target[2] + 8]
    camera.position.x += (desiredPosition[0] - camera.position.x) * 0.08
    camera.position.y += (desiredPosition[1] - camera.position.y) * 0.08
    camera.position.z += (desiredPosition[2] - camera.position.z) * 0.08
    camera.lookAt(target[0], target[1] + 0.8, target[2])
  })

  return null
}

function SceneCameraRig({
  enabled,
  preset,
  plotFacing,
  plotLength,
  plotWidth,
}: {
  enabled: boolean
  preset: CameraPreset
  plotFacing: PlotFacing
  plotLength: number
  plotWidth: number
}) {
  const { camera } = useThree()
  const maxSpan = Math.max(plotLength, plotWidth)

  useFrame(() => {
    if (!enabled) return
    let desired: [number, number, number] = [maxSpan * 1.2, maxSpan * 0.95, maxSpan * 1.05]
    if (preset === "bird") {
      desired = [0, maxSpan * 1.68, 0.01]
    } else if (preset === "front") {
      if (plotFacing === "North") desired = [0, maxSpan * 0.62, -plotWidth / 2 - maxSpan * 0.68]
      if (plotFacing === "South") desired = [0, maxSpan * 0.62, plotWidth / 2 + maxSpan * 0.68]
      if (plotFacing === "East") desired = [plotLength / 2 + maxSpan * 0.68, maxSpan * 0.62, 0]
      if (plotFacing === "West") desired = [-plotLength / 2 - maxSpan * 0.68, maxSpan * 0.62, 0]
    } else if (preset === "cinematic") {
      if (plotFacing === "North") desired = [plotLength * 0.42, maxSpan * 0.72, -plotWidth / 2 - maxSpan * 0.45]
      if (plotFacing === "South") desired = [-plotLength * 0.42, maxSpan * 0.72, plotWidth / 2 + maxSpan * 0.45]
      if (plotFacing === "East") desired = [plotLength / 2 + maxSpan * 0.45, maxSpan * 0.72, plotWidth * 0.42]
      if (plotFacing === "West") desired = [-plotLength / 2 - maxSpan * 0.45, maxSpan * 0.72, -plotWidth * 0.42]
    }
    camera.position.x += (desired[0] - camera.position.x) * 0.08
    camera.position.y += (desired[1] - camera.position.y) * 0.08
    camera.position.z += (desired[2] - camera.position.z) * 0.08
    camera.lookAt(0, 1.4, 0)
  })

  return null
}

const FloorShell = memo(function FloorShell({
  floor,
  floorHeight,
  plotLength,
  plotWidth,
  stairCutouts,
  xray,
  wallMaterial,
  floorMaterial,
  plotFacing,
  boundaryEnabled,
  landscapeEnabled,
  showDefaultFrontGate,
}: {
  floor: number
  floorHeight: number
  plotLength: number
  plotWidth: number
  stairCutouts: StairCutout[]
  xray: boolean
  wallMaterial: WallMaterial
  floorMaterial: FloorMaterial
  plotFacing: PlotFacing
  boundaryEnabled: boolean
  landscapeEnabled: boolean
  showDefaultFrontGate: boolean
}) {
  const yBase = floor * floorHeight
  const wallOpacity = xray ? 0.15 : 0.72
  const halfL = plotLength / 2
  const halfW = plotWidth / 2
  const wallTexture = useTexture(getWallTexturePath(wallMaterial))
  const wallRoughnessMap = useTexture(getWallRoughnessPath(wallMaterial))
  const wallNormalMap = useTexture(getWallNormalPath(wallMaterial))
  const floorTexture = useTexture(getFloorTexturePath(floorMaterial))
  const floorRoughnessMap = useTexture(getFloorRoughnessPath(floorMaterial))
  const floorNormalMap = useTexture(getFloorNormalPath(floorMaterial))

  useEffect(() => {
    tuneTexture(wallTexture, plotLength / 8, floorHeight / 4)
    tuneTexture(wallRoughnessMap, plotLength / 8, floorHeight / 4, false)
    tuneTexture(wallNormalMap, plotLength / 8, floorHeight / 4, false)
    tuneTexture(floorTexture, plotLength / 8, plotWidth / 8)
    tuneTexture(floorRoughnessMap, plotLength / 8, plotWidth / 8, false)
    tuneTexture(floorNormalMap, plotLength / 8, plotWidth / 8, false)
  }, [floorHeight, floorNormalMap, floorRoughnessMap, floorTexture, plotLength, plotWidth, wallNormalMap, wallRoughnessMap, wallTexture])

  const wallRoughness = wallMaterial === "bricks" ? 0.95 : wallMaterial === "concrete" ? 0.86 : 0.78
  const wallMetalness = wallMaterial === "concrete" ? 0.06 : 0.02
  const floorRoughness = floorMaterial === "marble" || floorMaterial === "makrana" ? 0.35 : floorMaterial === "wood" ? 0.62 : 0.72
  const floorMetalness = floorMaterial === "marble" || floorMaterial === "makrana" ? 0.12 : 0.03
  const normalScale = new Vector2(0.35, 0.35)
  const floorShape = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-halfL, -halfW)
    shape.lineTo(halfL, -halfW)
    shape.lineTo(halfL, halfW)
    shape.lineTo(-halfL, halfW)
    shape.closePath()

    for (const cutout of stairCutouts) {
      const minX = cutout.x - cutout.w / 2 - 0.05
      const maxX = cutout.x + cutout.w / 2 + 0.05
      const minZ = cutout.z - cutout.l / 2 - 0.05
      const maxZ = cutout.z + cutout.l / 2 + 0.05
      const hole = new Path()
      hole.moveTo(minX, minZ)
      hole.lineTo(maxX, minZ)
      hole.lineTo(maxX, maxZ)
      hole.lineTo(minX, maxZ)
      hole.closePath()
      shape.holes.push(hole)
    }

    return shape
  }, [halfL, halfW, stairCutouts])

  const floorTint =
    floorMaterial === "wood" ? "#d6c4a4" :
    floorMaterial === "marble" ? "#e5e7eb" :
    floorMaterial === "makrana" ? "#f1f5f9" :
    floorMaterial === "terracotta" ? "#fca07b" :
    "#dbeafe"
  const wallTint = wallMaterial === "bricks" ? "#e2c5b1" : wallMaterial === "concrete" ? "#d1d5db" : "#dbe2ea"
  const landscapeInset = 0.95
  const frontSide = plotFacing === "North" ? "north" : plotFacing === "South" ? "south" : plotFacing === "East" ? "east" : "west"
  const rearSide = frontSide === "north" ? "south" : frontSide === "south" ? "north" : frontSide === "east" ? "west" : "east"
  const sideList = ["north", "south", "east", "west"] as const
  const frontLongSpan = frontSide === "north" || frontSide === "south" ? plotLength : plotWidth
  const pathLightCount = Math.round(clamp(frontLongSpan / 8, 4, 8))
  const showCirculationPath = Math.min(plotLength, plotWidth) >= 24 && plotLength * plotWidth >= 750
  const circulationWidth = clamp(Math.min(plotLength, plotWidth) * 0.16, 3.4, 5.2)
  const sideWeight = (side: (typeof sideList)[number]) => {
    if (side === frontSide) return 1
    if (side === rearSide) return 0.45
    return 0.7
  }

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yBase, 0]} receiveShadow>
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial
          color={floorTint}
          map={floorTexture}
          roughness={floorRoughness}
          metalness={floorMetalness}
          roughnessMap={floorRoughnessMap}
          normalMap={floorNormalMap}
          normalScale={normalScale}
        />
      </mesh>

      <mesh position={[0, yBase + floorHeight / 2, halfW]} castShadow receiveShadow>
        <boxGeometry args={[plotLength, floorHeight, 0.25]} />
        <meshStandardMaterial
          color={wallTint}
          map={wallTexture}
          roughness={wallRoughness}
          metalness={wallMetalness}
          roughnessMap={wallRoughnessMap}
          normalMap={wallNormalMap}
          normalScale={normalScale}
          transparent
          opacity={wallOpacity}
        />
      </mesh>
      <mesh position={[0, yBase + floorHeight / 2, -halfW]} castShadow receiveShadow>
        <boxGeometry args={[plotLength, floorHeight, 0.25]} />
        <meshStandardMaterial
          color={wallTint}
          map={wallTexture}
          roughness={wallRoughness}
          metalness={wallMetalness}
          roughnessMap={wallRoughnessMap}
          normalMap={wallNormalMap}
          normalScale={normalScale}
          transparent
          opacity={wallOpacity}
        />
      </mesh>
      <mesh position={[halfL, yBase + floorHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, floorHeight, plotWidth]} />
        <meshStandardMaterial
          color={wallTint}
          map={wallTexture}
          roughness={wallRoughness}
          metalness={wallMetalness}
          roughnessMap={wallRoughnessMap}
          normalMap={wallNormalMap}
          normalScale={normalScale}
          transparent
          opacity={wallOpacity}
        />
      </mesh>
      <mesh position={[-halfL, yBase + floorHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, floorHeight, plotWidth]} />
        <meshStandardMaterial
          color={wallTint}
          map={wallTexture}
          roughness={wallRoughness}
          metalness={wallMetalness}
          roughnessMap={wallRoughnessMap}
          normalMap={wallNormalMap}
          normalScale={normalScale}
          transparent
          opacity={wallOpacity}
        />
      </mesh>

      {boundaryEnabled && floor === 0 && (
        <>
          <mesh position={[0, 1.1, halfW + 1.2]} castShadow receiveShadow>
            <boxGeometry args={[plotLength + 2.8, 2.2, 0.22]} />
            <meshStandardMaterial color="#64748b" roughness={0.82} />
          </mesh>
          <mesh position={[0, 1.1, -halfW - 1.2]} castShadow receiveShadow>
            <boxGeometry args={[plotLength + 2.8, 2.2, 0.22]} />
            <meshStandardMaterial color="#64748b" roughness={0.82} />
          </mesh>
          <mesh position={[halfL + 1.2, 1.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.22, 2.2, plotWidth + 2.8]} />
            <meshStandardMaterial color="#64748b" roughness={0.82} />
          </mesh>
          <mesh position={[-halfL - 1.2, 1.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.22, 2.2, plotWidth + 2.8]} />
            <meshStandardMaterial color="#64748b" roughness={0.82} />
          </mesh>
          {showDefaultFrontGate && (
            <mesh position={[0, 1.1, halfW + 1.2]} castShadow receiveShadow>
              <boxGeometry args={[3.8, 2.4, 0.3]} />
              <meshStandardMaterial color="#1e293b" roughness={0.68} metalness={0.2} />
            </mesh>
          )}
        </>
      )}
      {showCirculationPath && floor === 0 && (
        <mesh position={[0, yBase + 0.025, 0]} receiveShadow>
          <boxGeometry
            args={
              plotFacing === "North" || plotFacing === "South"
                ? [circulationWidth, 0.03, Math.max(3, plotWidth - 1.7)]
                : [Math.max(3, plotLength - 1.7), 0.03, circulationWidth]
            }
          />
          <meshStandardMaterial color="#cbd5e1" transparent opacity={xray ? 0.2 : 0.5} roughness={0.6} />
        </mesh>
      )}
      {landscapeEnabled && floor === 0 && (
        <>
          {sideList.map((side) => {
            const weight = sideWeight(side)
            const isNorthSouth = side === "north" || side === "south"
            const longSpan = isNorthSouth ? plotLength : plotWidth
            const stripLong = Math.max(1.2, longSpan * (0.68 + weight * 0.24))
            const stripOpacity = xray ? 0.2 : 0.34 + weight * 0.22
            const finHeight = 0.9 + weight * 0.6
            const finOpacity = xray ? 0.1 : 0.2 + weight * 0.22
            const stripY = yBase + 0.03
            const stripPos =
              side === "north" ? [0, stripY, -halfW + landscapeInset] :
              side === "south" ? [0, stripY, halfW - landscapeInset] :
              side === "east" ? [halfL - landscapeInset, stripY, 0] :
              [-halfL + landscapeInset, stripY, 0]
            const stripArgs =
              isNorthSouth
                ? [stripLong, 0.04, 0.22 + weight * 0.12]
                : [0.22 + weight * 0.12, 0.04, stripLong]
            const finPos =
              side === "north" ? [0, yBase + finHeight / 2, -halfW + landscapeInset + 0.22] :
              side === "south" ? [0, yBase + finHeight / 2, halfW - landscapeInset - 0.22] :
              side === "east" ? [halfL - landscapeInset - 0.22, yBase + finHeight / 2, 0] :
              [-halfL + landscapeInset + 0.22, yBase + finHeight / 2, 0]
            const finArgs =
              isNorthSouth
                ? [1 + weight * 0.9, finHeight, 0.07]
                : [0.07, finHeight, 1 + weight * 0.9]

            return (
              <group key={`landscape-${side}`}>
                <mesh position={stripPos as [number, number, number]} receiveShadow>
                  <boxGeometry args={stripArgs as [number, number, number]} />
                  <meshStandardMaterial color="#86efac" transparent opacity={stripOpacity} roughness={0.6} />
                </mesh>
                <mesh position={finPos as [number, number, number]} castShadow receiveShadow>
                  <boxGeometry args={finArgs as [number, number, number]} />
                  <meshStandardMaterial color="#22c55e" transparent opacity={finOpacity} metalness={0.2} roughness={0.2} />
                </mesh>
              </group>
            )
          })}

          {Array.from({ length: pathLightCount }, (_, index) => {
            const t = pathLightCount <= 1 ? 0 : index / (pathLightCount - 1)
            const spread = (t - 0.5) * Math.max(frontLongSpan - 3.8, 2)
            const pathOffset = landscapeInset + 0.62
            const x =
              frontSide === "north" || frontSide === "south"
                ? spread
                : frontSide === "east"
                  ? halfL - pathOffset
                  : -halfL + pathOffset
            const z =
              frontSide === "north"
                ? -halfW + pathOffset
                : frontSide === "south"
                  ? halfW - pathOffset
                  : spread

            return (
              <group key={`path-light-${index}`} position={[x, yBase, z]}>
                <mesh castShadow receiveShadow position={[0, 0.14, 0]}>
                  <cylinderGeometry args={[0.05, 0.06, 0.28, 14]} />
                  <meshStandardMaterial color="#475569" metalness={0.28} roughness={0.45} />
                </mesh>
                <mesh position={[0, 0.3, 0]}>
                  <sphereGeometry args={[0.075, 12, 12]} />
                  <meshStandardMaterial
                    color="#dcfce7"
                    emissive="#a7f3d0"
                    emissiveIntensity={xray ? 0.32 : 0.78}
                    transparent
                    opacity={xray ? 0.3 : 0.68}
                    roughness={0.12}
                    metalness={0.08}
                  />
                </mesh>
              </group>
            )
          })}
        </>
      )}

      <Text position={[0, yBase + 0.45, 0]} fontSize={0.5} color="#334155" anchorX="center">
        {`Floor ${floor + 1}`}
      </Text>
    </group>
  )
})

const StairsMesh = memo(function StairsMesh({
  room,
  floorHeight,
  modelAvailability,
}: {
  room: RoomConfig
  floorHeight: number
  modelAvailability: ModelAvailability
}) {
  const yBase = room.floor * floorHeight
  const riseHeight = clamp(floorHeight * 1.04, 2, Math.max(room.h, floorHeight * 1.04))
  const hasCustomStairsModel = modelAvailability.stairsRoom
  const entryY = yBase + 0.12
  const exitY = yBase + riseHeight
  return (
    <group position={[room.x, yBase, room.z]}>
      {hasCustomStairsModel ? (
        <OptionalModel
          path={MODEL_PATHS.stairsRoom}
          position={[0, 0, 0]}
          targetSize={[room.w * 0.995, riseHeight, room.l * 0.995]}
          scaleMultiplier={1.02}
        />
      ) : (
        <>
          <mesh castShadow receiveShadow position={[0, riseHeight / 2, 0]}>
            <boxGeometry args={[room.w, 0.6, room.l]} />
            <meshStandardMaterial color="#16a34a" opacity={0.7} transparent />
          </mesh>
          <mesh castShadow receiveShadow position={[0, riseHeight / 2, 0]} rotation={[-Math.PI / 11, 0, 0]}>
            <boxGeometry args={[room.w * 0.9, riseHeight * 0.95, room.l * 0.5]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
          <mesh position={[0, entryY - yBase, -room.l / 2 + 0.45]} castShadow receiveShadow>
            <boxGeometry args={[room.w * 0.75, 0.1, 0.7]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
          <mesh position={[0, exitY - yBase, room.l / 2 - 0.45]} castShadow receiveShadow>
            <boxGeometry args={[room.w * 0.75, 0.1, 0.7]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
        </>
      )}
      <Text position={[0, riseHeight + 0.45, 0]} fontSize={0.32} color="#14532d" anchorX="center">
        Stairs
      </Text>
    </group>
  )
})

const RoomAssets = memo(function RoomAssets({
  room,
  modelAvailability,
  yBase,
  muted,
}: {
  room: RoomConfig
  modelAvailability: ModelAvailability
  yBase: number
  muted?: boolean
}) {
  const y = yBase + 0.05
  const doorWidth = clamp(room.doorWidth ?? 0.9, 0.7, Math.max(1.8, room.w - 0.4))
  const windowWidth = clamp(room.windowWidth ?? 1.2, 0.7, Math.max(2.2, room.l - 0.4))
  return (
    <group visible={!muted}>
      {room.type === "Living" && (
        <>
          {modelAvailability.livingRoom ? (
            <OptionalModel
              path={MODEL_PATHS.livingRoom}
              position={[room.x, y, room.z]}
              targetSize={[room.w * 0.94, room.h * 1.1, room.l * 0.94]}
              scaleMultiplier={0.98}
              fitMode="footprint"
              autoRotateToFitXZ
            />
          ) : modelAvailability.sofa ? (
            <OptionalModel
              path={MODEL_PATHS.sofa}
              position={[room.x, y, room.z]}
              rotation={[0, Math.PI / 2, 0]}
              targetSize={[2.2, 0.95, 1.1]}
              scaleMultiplier={1}
            />
          ) : (
            <mesh position={[room.x, y + 0.5, room.z]} castShadow receiveShadow>
              <boxGeometry args={[2.2, 0.9, 1]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          )}
        </>
      )}

      {room.type === "Bedroom" && (
        <>
          {modelAvailability.bed ? (
            <OptionalModel
              path={MODEL_PATHS.bed}
              position={[room.x, y, room.z]}
              targetSize={[2.1, 0.85, 1.75]}
              scaleMultiplier={1}
            />
          ) : (
            <mesh position={[room.x, y + 0.35, room.z]} castShadow receiveShadow>
              <boxGeometry args={[2, 0.7, 1.6]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          )}
        </>
      )}

      {room.type === "Kitchen" && (
        <>
          {modelAvailability.kitchenRoom ? (
            <OptionalModel
              path={MODEL_PATHS.kitchenRoom}
              position={[room.x, y, room.z]}
              targetSize={[room.w * 0.93, room.h * 1.08, room.l * 0.93]}
              scaleMultiplier={0.98}
              fitMode="footprint"
              autoRotateToFitXZ
            />
          ) : modelAvailability.sink ? (
            <OptionalModel
              path={MODEL_PATHS.sink}
              position={[room.x, y, room.z]}
              targetSize={[1.8, 1.0, 0.8]}
              scaleMultiplier={1}
            />
          ) : (
            <mesh position={[room.x, y + 0.45, room.z]} castShadow receiveShadow>
              <boxGeometry args={[1.8, 0.9, 0.7]} />
              <meshStandardMaterial color="#9ca3af" />
            </mesh>
          )}
        </>
      )}

      {room.type === "Bathroom" && (
        <>
          {modelAvailability.bathroomRoom ? (
            <OptionalModel
              path={MODEL_PATHS.bathroomRoom}
              position={[room.x, y, room.z]}
              targetSize={[room.w * 0.9, room.h * 1.05, room.l * 0.9]}
              scaleMultiplier={0.97}
              fitMode="footprint"
              autoRotateToFitXZ
            />
          ) : modelAvailability.toilet ? (
            <OptionalModel
              path={MODEL_PATHS.toilet}
              position={[room.x, y, room.z]}
              targetSize={[0.9, 0.9, 1.2]}
              scaleMultiplier={1}
            />
          ) : (
            <mesh position={[room.x, y + 0.35, room.z]} castShadow receiveShadow>
              <boxGeometry args={[0.8, 0.7, 1.1]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
          )}
        </>
      )}

      {room.type === "Pooja" &&
        (modelAvailability.poojaRoom ? (
          <OptionalModel
            path={MODEL_PATHS.poojaRoom}
            position={[room.x, y, room.z]}
            targetSize={[room.w * 0.8, Math.min(room.h * 0.88, 4.5), room.l * 0.8]}
            scaleMultiplier={1}
          />
        ) : (
          <mesh position={[room.x, y + 0.35, room.z]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.7, 1.2]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        ))}

      {room.type === "Store" && (
        <mesh position={[room.x, y + 0.45, room.z]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.9, 1.2]} />
          <meshStandardMaterial color="#78716c" />
        </mesh>
      )}

      {room.type === "Verandah" && (
        <mesh position={[room.x, y + 0.05, room.z]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.1, 1.8]} />
          <meshStandardMaterial color="#a7f3d0" />
        </mesh>
      )}

      {room.type === "Parking" && (
        <group position={[room.x, yBase + 0.03, room.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[room.w * 0.96, room.l * 0.96]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
          <Text position={[0, 0.08, 0]} fontSize={0.22} color="#0f172a" anchorX="center">
            PARKING
          </Text>
        </group>
      )}

      {room.type === "Garden" && (
        <group position={[room.x, yBase + 0.03, room.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[room.w * 0.96, room.l * 0.96]} />
            <meshStandardMaterial color="#86efac" />
          </mesh>
          <Text position={[0, 0.08, 0]} fontSize={0.2} color="#14532d" anchorX="center">
            GARDEN
          </Text>
        </group>
      )}

      {room.type === "Balcony" && (
        <group position={[room.x, yBase + 0.03, room.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[room.w * 0.98, room.l * 0.98]} />
            <meshStandardMaterial color="#bfdbfe" />
          </mesh>
          <mesh position={[0, 0.55, -room.l / 2 + 0.08]} castShadow receiveShadow>
            <boxGeometry args={[room.w * 0.98, 1.1, 0.1]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[-room.w / 2 + 0.08, 0.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 1.1, room.l * 0.98]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[room.w / 2 - 0.08, 0.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 1.1, room.l * 0.98]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <Text position={[0, 0.1, 0]} fontSize={0.18} color="#0f172a" anchorX="center">
            BALCONY
          </Text>
        </group>
      )}

      {room.type !== "Parking" && room.type !== "Garden" && room.type !== "Balcony" && (modelAvailability.door ? (
        <OptionalModel
          path={MODEL_PATHS.door}
          position={[room.x, yBase, room.z + room.l / 2 - 0.1]}
          targetSize={[doorWidth, 2.25, 0.2]}
          scaleMultiplier={1}
        />
      ) : (
        <mesh position={[room.x, yBase + 1.1, room.z + room.l / 2 - 0.08]} castShadow receiveShadow>
          <boxGeometry args={[doorWidth, 2.2, 0.08]} />
          <meshStandardMaterial color="#7c4a2d" />
        </mesh>
      ))}

      {room.type !== "Parking" && room.type !== "Garden" && room.type !== "Balcony" && room.hasWindow &&
        (modelAvailability.window ? (
          <OptionalModel
            path={MODEL_PATHS.window}
            position={[room.x + room.w / 2 - 0.08, yBase + 1.3, room.z]}
            rotation={[0, Math.PI / 2, 0]}
            targetSize={[0.18, 1.45, windowWidth]}
            scaleMultiplier={1}
          />
        ) : (
          <mesh position={[room.x + room.w / 2 - 0.08, yBase + 1.3, room.z]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 1.4, windowWidth]} />
            <meshStandardMaterial color="#93c5fd" transparent opacity={0.55} />
          </mesh>
        ))}
    </group>
  )
})

const RoomEnvelope = memo(function RoomEnvelope({
  room,
  siblingRooms,
  yBase,
  selected,
  xray,
  colliding,
  highlighted,
  dimmed,
}: {
  room: RoomConfig
  siblingRooms: RoomConfig[]
  yBase: number
  selected: boolean
  xray: boolean
  colliding: boolean
  highlighted?: boolean
  dimmed?: boolean
}) {
  if (room.type === "Parking" || room.type === "Garden" || room.type === "Balcony") {
    return (
      <group position={[room.x, yBase, room.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[room.w, room.l]} />
          <meshStandardMaterial
            color={room.type === "Parking" ? "#cbd5e1" : room.type === "Garden" ? "#86efac" : "#bfdbfe"}
            transparent
            opacity={dimmed ? (xray ? 0.16 : 0.24) : highlighted ? (xray ? 0.42 : 0.82) : xray ? 0.35 : 0.7}
          />
        </mesh>
      </group>
    )
  }

  const t = 0.08
  const doorW = clamp(room.doorWidth ?? 0.95, 0.7, Math.max(0.7, room.w - 0.4))
  const doorH = Math.min(2.2, room.h - 0.2)
  const windowW = clamp(room.windowWidth ?? 1.2, 0.7, Math.max(0.7, room.l - 0.4))
  const windowH = Math.min(1.3, room.h - 0.8)
  const sill = 1

  const frontSideW = Math.max((room.w - doorW) / 2, 0.15)
  const frontTopH = Math.max(room.h - doorH, 0.2)

  const sideSplitL = Math.max((room.l - windowW) / 2, 0.12)
  const sideBottomH = Math.max(sill, 0.15)
  const sideTopH = Math.max(room.h - sill - windowH, 0.2)

  const opacity = dimmed ? (xray ? 0.08 : 0.18) : xray ? 0.18 : selected ? 0.82 : highlighted ? 0.88 : 0.72
  const wallColor = colliding ? "#ef4444" : highlighted ? "#f59e0b" : room.color
  const wallMaterial = <meshStandardMaterial color={wallColor} transparent opacity={opacity} />
  const beamDepth = beamDepthForSpan(Math.max(room.w, room.l))
  const edgeTolerance = 0.16
  const overlapTolerance = 0.28

  const hasNeighborAt = (side: "north" | "south" | "east" | "west") => {
    return siblingRooms.some((other) => {
      if (other.id === room.id || other.floor !== room.floor) return false
      const roomMinX = room.x - room.w / 2
      const roomMaxX = room.x + room.w / 2
      const roomMinZ = room.z - room.l / 2
      const roomMaxZ = room.z + room.l / 2
      const otherMinX = other.x - other.w / 2
      const otherMaxX = other.x + other.w / 2
      const otherMinZ = other.z - other.l / 2
      const otherMaxZ = other.z + other.l / 2

      if (side === "east") {
        const touching = Math.abs(roomMaxX - otherMinX) <= edgeTolerance
        return touching && overlaps1D(roomMinZ + overlapTolerance, roomMaxZ - overlapTolerance, otherMinZ, otherMaxZ)
      }
      if (side === "west") {
        const touching = Math.abs(roomMinX - otherMaxX) <= edgeTolerance
        return touching && overlaps1D(roomMinZ + overlapTolerance, roomMaxZ - overlapTolerance, otherMinZ, otherMaxZ)
      }
      if (side === "north") {
        const touching = Math.abs(roomMinZ - otherMaxZ) <= edgeTolerance
        return touching && overlaps1D(roomMinX + overlapTolerance, roomMaxX - overlapTolerance, otherMinX, otherMaxX)
      }
      const touching = Math.abs(roomMaxZ - otherMinZ) <= edgeTolerance
      return touching && overlaps1D(roomMinX + overlapTolerance, roomMaxX - overlapTolerance, otherMinX, otherMaxX)
    })
  }

  const hideNorthWall = hasNeighborAt("north")
  const hideSouthWall = hasNeighborAt("south")
  const hideWestWall = hasNeighborAt("west")
  const hideEastWall = hasNeighborAt("east")

  return (
    <group position={[room.x, yBase, room.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.w, room.l]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.88} />
      </mesh>

      {!hideNorthWall && (
        <mesh position={[0, room.h / 2, -room.l / 2 + t / 2]} castShadow receiveShadow>
          <boxGeometry args={[room.w, room.h, t]} />
          {wallMaterial}
        </mesh>
      )}
      {!hideWestWall && (
        <mesh position={[-room.w / 2 + t / 2, room.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, room.h, room.l]} />
          {wallMaterial}
        </mesh>
      )}

      {!hideEastWall && (
        room.hasWindow ? (
          <>
            <mesh position={[room.w / 2 - t / 2, room.h / 2, -windowW / 2 - sideSplitL / 2]} castShadow receiveShadow>
              <boxGeometry args={[t, room.h, sideSplitL]} />
              {wallMaterial}
            </mesh>
            <mesh position={[room.w / 2 - t / 2, room.h / 2, windowW / 2 + sideSplitL / 2]} castShadow receiveShadow>
              <boxGeometry args={[t, room.h, sideSplitL]} />
              {wallMaterial}
            </mesh>
            <mesh position={[room.w / 2 - t / 2, sideBottomH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[t, sideBottomH, windowW]} />
              {wallMaterial}
            </mesh>
            <mesh position={[room.w / 2 - t / 2, sill + windowH + sideTopH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[t, sideTopH, windowW]} />
              {wallMaterial}
            </mesh>
          </>
        ) : (
          <mesh position={[room.w / 2 - t / 2, room.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, room.h, room.l]} />
            {wallMaterial}
          </mesh>
        )
      )}

      {!hideSouthWall && (
        <>
          <mesh position={[-doorW / 2 - frontSideW / 2, room.h / 2, room.l / 2 - t / 2]} castShadow receiveShadow>
            <boxGeometry args={[frontSideW, room.h, t]} />
            {wallMaterial}
          </mesh>
          <mesh position={[doorW / 2 + frontSideW / 2, room.h / 2, room.l / 2 - t / 2]} castShadow receiveShadow>
            <boxGeometry args={[frontSideW, room.h, t]} />
            {wallMaterial}
          </mesh>
          <mesh position={[0, doorH + frontTopH / 2, room.l / 2 - t / 2]} castShadow receiveShadow>
            <boxGeometry args={[doorW, frontTopH, t]} />
            {wallMaterial}
          </mesh>
        </>
      )}

      <mesh position={[0, room.h - beamDepth / 2, -room.l / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.w, beamDepth, 0.12]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[0, room.h - beamDepth / 2, room.l / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.w, beamDepth, 0.12]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[-room.w / 2, room.h - beamDepth / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, beamDepth, room.l]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[room.w / 2, room.h - beamDepth / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, beamDepth, room.l]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  )
})

const StructuralColumns = memo(function StructuralColumns({
  room,
  floorHeight,
}: {
  room: RoomConfig
  floorHeight: number
}) {
  const yBase = room.floor * floorHeight
  const points = generateColumns({
    id: room.id,
    type: room.type,
    floor: room.floor,
    x: room.x,
    z: room.z,
    w: room.w,
    l: room.l,
    h: room.h,
    hasWindow: room.hasWindow,
  })

  return (
    <group>
      {points.map(([x, z], index) => (
        <mesh key={`${room.id}-col-${index}`} position={[x, yBase + room.h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[0.35, room.h, 0.35]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}
    </group>
  )
})

const DraggableRoom = memo(function DraggableRoom({
  room,
  siblingRooms,
  floorHeight,
  selected,
  plotLength,
  plotWidth,
  xray,
  modelAvailability,
  colliding,
  traditionalDecor,
  activeHighlightType,
  onSelect,
  onMove,
  onInteractionChange,
}: {
  room: RoomConfig
  siblingRooms: RoomConfig[]
  floorHeight: number
  selected: boolean
  plotLength: number
  plotWidth: number
  xray: boolean
  modelAvailability: ModelAvailability
  colliding: boolean
  traditionalDecor: boolean
  activeHighlightType?: RoomType | null
  onSelect: (id: string) => void
  onMove: (id: string, x: number, z: number) => void
  onInteractionChange?: (active: boolean) => void
}) {
  const [dragging, setDragging] = useState(false)
  const pendingPositionRef = useRef<{ x: number; z: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  const yBase = room.floor * floorHeight
  const y = yBase + room.h / 2
  const xLimit = plotLength / 2 - room.w / 2 - 0.15
  const zLimit = plotWidth / 2 - room.l / 2 - 0.15
  const highlighted = activeHighlightType !== null && activeHighlightType !== undefined && room.type === activeHighlightType
  const dimmed = activeHighlightType !== null && activeHighlightType !== undefined && room.type !== activeHighlightType && !selected

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const pointerTarget = event.target as { setPointerCapture?: (pointerId: number) => void } | null
    pointerTarget?.setPointerCapture?.(event.pointerId)
    setDragging(true)
    onInteractionChange?.(true)
    onSelect(room.id)
  }

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging) return
    event.stopPropagation()
    pendingPositionRef.current = {
      x: clamp(event.point.x, -xLimit, xLimit),
      z: clamp(event.point.z, -zLimit, zLimit),
    }
    if (rafRef.current !== null) return

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const next = pendingPositionRef.current
      if (!next) return
      onMove(room.id, next.x, next.z)
      pendingPositionRef.current = null
    })
  }

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const pointerTarget = event.target as { releasePointerCapture?: (pointerId: number) => void } | null
    pointerTarget?.releasePointerCapture?.(event.pointerId)
    const pending = pendingPositionRef.current
    pendingPositionRef.current = null
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (pending) {
      onMove(room.id, pending.x, pending.z)
    }
    setDragging(false)
    onInteractionChange?.(false)
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      onInteractionChange?.(false)
    }
  }, [onInteractionChange])

  return (
    <group>
      <mesh
        position={[room.x, y, room.z]}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <boxGeometry args={[room.w, room.h, room.l]} />
        <meshBasicMaterial transparent opacity={0.01} />
      </mesh>
      {highlighted && (
        <mesh position={[room.x, yBase + 0.04, room.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[room.w + 0.28, room.l + 0.28]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={xray ? 0.18 : 0.28} />
        </mesh>
      )}
      <RoomEnvelope
        room={room}
        siblingRooms={siblingRooms}
        yBase={yBase}
        selected={selected}
        xray={xray}
        colliding={colliding}
        highlighted={highlighted}
        dimmed={dimmed}
      />
      <RoomAssets room={room} modelAvailability={modelAvailability} yBase={yBase} muted={dimmed} />
      <Text position={[room.x, y + room.h / 2 + 0.4, room.z]} fontSize={0.24} color={highlighted ? "#b45309" : "#0f172a"} anchorX="center">
        {room.type}
      </Text>
      {selected && (
        <Text position={[room.x, y + room.h / 2 + 0.82, room.z]} fontSize={0.28} color="#1d4ed8" anchorX="center">
          {`${room.w.toFixed(1)} x ${room.l.toFixed(1)} x ${room.h.toFixed(1)} ft`}
        </Text>
      )}
      {room.hasWindow === false && (
        <Text position={[room.x, y + room.h / 2 + 1.2, room.z]} fontSize={0.2} color="#b91c1c" anchorX="center">
          Add window for ventilation
        </Text>
      )}
      {traditionalDecor && room.type !== "Bathroom" && room.type !== "Store" && (
        <mesh position={[room.x, yBase + 1.8, room.z - room.l / 2 + 0.09]} castShadow receiveShadow>
          <planeGeometry args={[1.5, 0.9]} />
          <meshStandardMaterial color="#c2410c" />
        </mesh>
      )}
    </group>
  )
})

export function BlueprintStudio({ projectId = null, adminMode = false }: BlueprintStudioProps = {}) {
  const REQUIREMENT_KEY_BY_ROOM: Partial<Record<RoomType, RequirementKey>> = {
    Bedroom: "bedrooms",
    Kitchen: "kitchens",
    Bathroom: "bathrooms",
    Pooja: "poojaRooms",
    Store: "storeRooms",
    Verandah: "verandahRooms",
    Parking: "parkingSpaces",
    Garden: "gardenAreas",
    Balcony: "balconyRooms",
  }
  const [houseConfig, setHouseConfig] = useState<HouseConfig>(() => DEFAULT_HOUSE_CONFIG())

  const [xray, setXray] = useState(false)
  const [wallMaterial, setWallMaterial] = useState<WallMaterial>("plaster")
  const [floorMaterial, setFloorMaterial] = useState<FloorMaterial>("wood")
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("none")
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("default")
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>("day")
  const [presentationMode, setPresentationMode] = useState(true)
  const [vastuEnabled, setVastuEnabled] = useState(false)
  const [plotFacing, setPlotFacing] = useState<PlotFacing>("North")
  const [traditionalDecor] = useState(false)
  const [marketRates, setMarketRates] = useState<MarketRates>(DEFAULT_MARKET_RATES)
  const [ratesAsOf, setRatesAsOf] = useState<string>("")
  const [selectedMarketProfileId, setSelectedMarketProfileId] = useState<string>(GEO_MARKET_PROFILES[0].id)
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>(MUNICIPALITY_RULES[0].id)
  const [complianceRulesAsOf, setComplianceRulesAsOf] = useState<string>(new Date().toISOString())
  const [surveyImport, setSurveyImport] = useState<SurveyImportRecord | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [renderQuality, setRenderQuality] = useState([58])
  const [floorFocus, setFloorFocus] = useState<number | "all">("all")
  const [, setCaptureMode] = useState(false)
  const [snapGuide, setSnapGuide] = useState<SnapGuide | null>(null)
  const [walkthroughMode, setWalkthroughMode] = useState(false)
  const [walkthroughIndex, setWalkthroughIndex] = useState(0)
  const [previewPrompt, setPreviewPrompt] = useState("")
  const [tourCue, setTourCue] = useState("Show me the balcony view at sunset")
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [floorMapImageUrl, setFloorMapImageUrl] = useState<string | null>(null)
  const [tourVideoUrl, setTourVideoUrl] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState("")
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [generatingTour, setGeneratingTour] = useState(false)
  const [wizardInput, setWizardInput] = useState("")
  const [wizardLoading, setWizardLoading] = useState(false)
  const [wizardSuggestions, setWizardSuggestions] = useState<PromptPlanSuggestion[]>([])
  const [selectedWizardSuggestionId, setSelectedWizardSuggestionId] = useState<PromptPlanSuggestion["id"] | null>(null)
  const [promptDraftDirty, setPromptDraftDirty] = useState(false)
  const [lastPromptPatch, setLastPromptPatch] = useState<WizardPatch | null>(null)
  const [promptConstraints, setPromptConstraints] = useState<PromptConstraintBundle>(EMPTY_PROMPT_CONSTRAINTS)
  const [, setPromptMismatchReviewed] = useState(false)
  const [promptPipelineState, setPromptPipelineState] = useState<PipelineState>(INITIAL_PROMPT_PIPELINE_STATE)
  const [promptPipelineContext, setPromptPipelineContext] = useState<PromptPipelineContext>(INITIAL_PROMPT_PIPELINE_CONTEXT)
  const [promptSiteFamilyEnabled, setPromptSiteFamilyEnabled] = useState(false)
  const [planningMode, setPlanningMode] = useState<PlanningMode>("prompt")
  const [planStage, setPlanStage] = useState<PlanStage>("draft_requirements")
  const [planLocked, setPlanLocked] = useState(false)
  const showLayoutDebug = false
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projectId)
  const [currentProjectName, setCurrentProjectName] = useState("Untitled Project")
  const [currentProjectOwner, setCurrentProjectOwner] = useState<ProjectOwner | null>(null)
  const [savingProject, setSavingProject] = useState(false)
  const [projectStatus, setProjectStatus] = useState("")
  const [isRoomInteracting, setIsRoomInteracting] = useState(false)
  const [historyMeta, setHistoryMeta] = useState({ canUndo: false, canRedo: false })
  const surveyFileInputRef = useRef<HTMLInputElement | null>(null)
  const viewportCardRef = useRef<HTMLDivElement | null>(null)
  const historyStackRef = useRef<StudioHistorySnapshot[]>([])
  const historyIndexRef = useRef(-1)
  const historyRestoreRef = useRef(false)
  const historyRecordTimerRef = useRef<number | null>(null)
  const lastHistorySignatureRef = useRef("")
  const overlapAutoFixSignatureRef = useRef("")
  const promptModeSnapshotRef = useRef<PromptModeSnapshot | null>(DEFAULT_PROMPT_MODE_SNAPSHOT())
  const manualModeSnapshotRef = useRef<ManualModeSnapshot | null>(DEFAULT_MANUAL_MODE_SNAPSHOT())
  const [civilInputs, setCivilInputs] = useState<CivilInputs>({
    soilClass: "Medium",
    safeBearingCapacity: 180,
    seismicZone: "III",
    basicWindSpeed: 44,
    groundwaterDepth: 10,
    concreteGrade: "M25",
    steelGrade: "Fe500",
  })
  const [requirements, setRequirements] = useState<PlannerRequirements>(DEFAULT_REQUIREMENTS)
  const [lastRequestedRequirements, setLastRequestedRequirements] = useState<PlannerRequirements>(DEFAULT_REQUIREMENTS)
  const [lastFeasibilityNotes, setLastFeasibilityNotes] = useState<string[]>([])
  const [layoutValidationReport, setLayoutValidationReport] = useState<LayoutValidationReport | null>(null)
  const [feasibilityReport, setFeasibilityReport] = useState<FeasibilityReport | null>(null)
  const [strictPlanningMode, setStrictPlanningMode] = useState(true)
  const [plannerInputs, setPlannerInputs] = useState<PlannerInputs>(DEFAULT_PLANNER_INPUTS)
  const [manualPlannerFloor, setManualPlannerFloor] = useState(0)
  const [manualAreaOverrideEnabled, setManualAreaOverrideEnabled] = useState(false)
  const [highlightedRoomType, setHighlightedRoomType] = useState<RoomType | null>(null)
  const [roomFloorPreferences, setRoomFloorPreferences] = useState<RoomFloorPreferences>({})
  const [modelAvailability, setModelAvailability] = useState<ModelAvailability>({
    frontDoor: false,
    livingRoom: false,
    kitchenRoom: false,
    bathroomRoom: false,
    poojaRoom: false,
    stairsRoom: false,
    sofa: false,
    bed: false,
    sink: false,
    toilet: false,
    door: false,
    window: false,
  })

  const syncHistoryMeta = useCallback(() => {
    const index = historyIndexRef.current
    const stack = historyStackRef.current
    setHistoryMeta({
      canUndo: index > 0,
      canRedo: index >= 0 && index < stack.length - 1,
    })
  }, [])

  const buildHistorySnapshot = useCallback(
    (): StudioHistorySnapshot => ({
      houseConfig: {
        ...houseConfig,
        rooms: houseConfig.rooms.map((room) => ({ ...room })),
      },
      requirements: { ...requirements },
      plotFacing,
    }),
    [houseConfig, plotFacing, requirements],
  )

  const applyHistorySnapshot = useCallback((snapshot: StudioHistorySnapshot) => {
    setHouseConfig(snapshot.houseConfig)
    setRequirements(snapshot.requirements)
    setLastRequestedRequirements(snapshot.requirements)
    setPlotFacing(snapshot.plotFacing)
  }, [])

  const buildPromptModeSnapshot = (): PromptModeSnapshot => ({
    houseConfig: deepClone(houseConfig),
    requirements: deepClone(requirements),
    lastRequestedRequirements: deepClone(lastRequestedRequirements),
    lastFeasibilityNotes: deepClone(lastFeasibilityNotes),
    layoutValidationReport: deepClone(layoutValidationReport),
    feasibilityReport: deepClone(feasibilityReport),
    selectedRoomId,
    roomFloorPreferences: deepClone(roomFloorPreferences),
    plannerInputs: deepClone(plannerInputs),
    plotFacing,
    planStage,
    wizardInput,
    wizardSuggestions: deepClone(wizardSuggestions),
    selectedWizardSuggestionId,
    lastPromptPatch: deepClone(lastPromptPatch),
    promptConstraints: deepClone(promptConstraints),
    promptPipelineState: deepClone(promptPipelineState),
    promptPipelineContext: deepClone(promptPipelineContext),
    promptDraftDirty,
    promptSiteFamilyEnabled,
    previewPrompt,
  })

  const buildManualModeSnapshot = (): ManualModeSnapshot => ({
    houseConfig: deepClone(houseConfig),
    requirements: deepClone(requirements),
    lastRequestedRequirements: deepClone(lastRequestedRequirements),
    lastFeasibilityNotes: deepClone(lastFeasibilityNotes),
    layoutValidationReport: deepClone(layoutValidationReport),
    feasibilityReport: deepClone(feasibilityReport),
    selectedRoomId,
    roomFloorPreferences: deepClone(roomFloorPreferences),
    plannerInputs: deepClone(plannerInputs),
    plotFacing,
    planStage,
    manualPlannerFloor,
    manualAreaOverrideEnabled,
    previewPrompt,
  })

  const getValidSelectedRoomId = (rooms: RoomConfig[], currentId: string | null) => {
    if (currentId && rooms.some((room) => room.id === currentId)) return currentId
    return rooms[0]?.id ?? null
  }

  const applyPromptModeSnapshot = (snapshot: PromptModeSnapshot) => {
    const clonedHouseConfig = deepClone(snapshot.houseConfig)
    setHouseConfig(clonedHouseConfig)
    setRequirements(deepClone(snapshot.requirements))
    setLastRequestedRequirements(deepClone(snapshot.lastRequestedRequirements))
    setLastFeasibilityNotes(deepClone(snapshot.lastFeasibilityNotes))
    setLayoutValidationReport(deepClone(snapshot.layoutValidationReport))
    setFeasibilityReport(deepClone(snapshot.feasibilityReport))
    setRoomFloorPreferences(deepClone(snapshot.roomFloorPreferences))
    setPlannerInputs(deepClone(snapshot.plannerInputs))
    setPlotFacing(snapshot.plotFacing)
    setPlanStage(snapshot.planStage)
    setWizardInput(snapshot.wizardInput)
    setWizardSuggestions(deepClone(snapshot.wizardSuggestions))
    setSelectedWizardSuggestionId(snapshot.selectedWizardSuggestionId)
    setLastPromptPatch(deepClone(snapshot.lastPromptPatch))
    setPromptConstraints(deepClone(snapshot.promptConstraints))
    setPromptPipelineState(deepClone(snapshot.promptPipelineState))
    setPromptPipelineContext(deepClone(snapshot.promptPipelineContext))
    setPromptDraftDirty(snapshot.promptDraftDirty)
    setPromptSiteFamilyEnabled(snapshot.promptSiteFamilyEnabled)
    setPreviewPrompt(snapshot.previewPrompt)
    setManualAreaOverrideEnabled(false)
    setSelectedRoomId(getValidSelectedRoomId(clonedHouseConfig.rooms, snapshot.selectedRoomId))
  }

  const applyManualModeSnapshot = (snapshot: ManualModeSnapshot) => {
    const clonedHouseConfig = deepClone(snapshot.houseConfig)
    const normalizedInputs = deepClone({
      ...snapshot.plannerInputs,
      useCustomPlot: true,
    })
    setHouseConfig(clonedHouseConfig)
    setRequirements(deepClone(snapshot.requirements))
    setLastRequestedRequirements(deepClone(snapshot.lastRequestedRequirements))
    setLastFeasibilityNotes(deepClone(snapshot.lastFeasibilityNotes))
    setLayoutValidationReport(deepClone(snapshot.layoutValidationReport))
    setFeasibilityReport(deepClone(snapshot.feasibilityReport))
    setRoomFloorPreferences(deepClone(snapshot.roomFloorPreferences))
    setPlannerInputs(normalizedInputs)
    setPlotFacing(snapshot.plotFacing)
    setPlanStage(snapshot.planStage)
    setManualPlannerFloor(Math.round(clamp(snapshot.manualPlannerFloor, 0, Math.max(clonedHouseConfig.floors - 1, 0))))
    setManualAreaOverrideEnabled(snapshot.manualAreaOverrideEnabled)
    setPreviewPrompt(snapshot.previewPrompt)
    setSelectedRoomId(getValidSelectedRoomId(clonedHouseConfig.rooms, snapshot.selectedRoomId))
  }

  const switchPlanningMode = (nextMode: PlanningMode) => {
    if (nextMode === planningMode) return

    if (planningMode === "prompt") {
      promptModeSnapshotRef.current = buildPromptModeSnapshot()
    } else {
      manualModeSnapshotRef.current = buildManualModeSnapshot()
    }

    if (nextMode === "prompt") {
      const promptSnapshot = promptModeSnapshotRef.current ?? DEFAULT_PROMPT_MODE_SNAPSHOT()
      applyPromptModeSnapshot(promptSnapshot)
      setPlanningMode("prompt")
      setPromptMismatchReviewed(false)
      setAiStatus("AI Prompt mode active. Analyze prompt and apply selected plan.")
      return
    }

    const manualSnapshot = manualModeSnapshotRef.current ?? DEFAULT_MANUAL_MODE_SNAPSHOT()
    applyManualModeSnapshot(manualSnapshot)
    setPlanningMode("manual")
    setPromptMismatchReviewed(false)
    setAiStatus("Manual mode active. Prompt pipeline is preserved separately.")
  }

  const pushHistorySnapshot = useCallback((snapshot: StudioHistorySnapshot) => {
    if (historyRestoreRef.current) return
    const signature = JSON.stringify(snapshot)
    if (signature === lastHistorySignatureRef.current) return

    let nextStack = historyStackRef.current
    if (historyIndexRef.current < nextStack.length - 1) {
      nextStack = nextStack.slice(0, historyIndexRef.current + 1)
    }
    nextStack = [...nextStack, snapshot]
    if (nextStack.length > 80) {
      nextStack = nextStack.slice(nextStack.length - 80)
    }
    historyStackRef.current = nextStack
    historyIndexRef.current = nextStack.length - 1
    lastHistorySignatureRef.current = signature
    syncHistoryMeta()
  }, [syncHistoryMeta])

  const undoHistory = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    const targetIndex = historyIndexRef.current - 1
    const snapshot = historyStackRef.current[targetIndex]
    if (!snapshot) return
    historyRestoreRef.current = true
    historyIndexRef.current = targetIndex
    lastHistorySignatureRef.current = JSON.stringify(snapshot)
    applyHistorySnapshot(snapshot)
    syncHistoryMeta()
    setAiStatus("Undo applied.")
    window.setTimeout(() => {
      historyRestoreRef.current = false
    }, 0)
  }, [applyHistorySnapshot, syncHistoryMeta])

  const redoHistory = useCallback(() => {
    const targetIndex = historyIndexRef.current + 1
    if (targetIndex < 0 || targetIndex >= historyStackRef.current.length) return
    const snapshot = historyStackRef.current[targetIndex]
    if (!snapshot) return
    historyRestoreRef.current = true
    historyIndexRef.current = targetIndex
    lastHistorySignatureRef.current = JSON.stringify(snapshot)
    applyHistorySnapshot(snapshot)
    syncHistoryMeta()
    setAiStatus("Redo applied.")
    window.setTimeout(() => {
      historyRestoreRef.current = false
    }, 0)
  }, [applyHistorySnapshot, syncHistoryMeta])

  useEffect(() => {
    let mounted = true
    const checkModels = async () => {
      const response = await fetch("/api/models/availability", { cache: "no-store" }).catch(() => null)
      if (!response?.ok) return
      const data = (await response.json()) as { models?: Partial<ModelAvailability> }
      if (!mounted || !data?.models) return
      setModelAvailability({
        frontDoor: Boolean(data.models.frontDoor),
        livingRoom: Boolean(data.models.livingRoom),
        kitchenRoom: Boolean(data.models.kitchenRoom),
        bathroomRoom: Boolean(data.models.bathroomRoom),
        poojaRoom: Boolean(data.models.poojaRoom),
        stairsRoom: Boolean(data.models.stairsRoom),
        sofa: Boolean(data.models.sofa),
        bed: Boolean(data.models.bed),
        sink: Boolean(data.models.sink),
        toilet: Boolean(data.models.toilet),
        door: Boolean(data.models.door),
        window: Boolean(data.models.window),
      })
    }
    checkModels()
    return () => {
      mounted = false
    }
  }, [])

  const refreshMarketRates = useCallback(async (force = true) => {
    const data = await fetchMarketRatesShared(force)
    if (!data) {
      setProjectStatus("Unable to fetch latest market rates.")
      return
    }
    setMarketRates(data.rates)
    setRatesAsOf(data.asOf)
  }, [])

  useEffect(() => {
    void refreshMarketRates(false)
  }, [refreshMarketRates])

  useEffect(() => {
    setComplianceRulesAsOf(new Date().toISOString())
  }, [selectedMunicipalityId])

  useEffect(() => {
    setCurrentProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(BLUEPRINT_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Partial<StoredBlueprintPayload>
      if (parsed.houseConfig) setHouseConfig(parsed.houseConfig)
      if (parsed.requirements) {
        const loadedRequirements = { ...DEFAULT_REQUIREMENTS, ...parsed.requirements }
        setRequirements(loadedRequirements)
        setLastRequestedRequirements(loadedRequirements)
      }
      if (typeof parsed.xray === "boolean") setXray(parsed.xray)
      if (typeof parsed.vastuEnabled === "boolean") setVastuEnabled(parsed.vastuEnabled)
      if (parsed.plotFacing) setPlotFacing(parsed.plotFacing)
      if (parsed.wallMaterial) setWallMaterial(parsed.wallMaterial)
      if (parsed.floorMaterial) setFloorMaterial(parsed.floorMaterial)
      if (parsed.cameraPreset) setCameraPreset(parsed.cameraPreset)
      if (parsed.lightingPreset) setLightingPreset(parsed.lightingPreset)
      if (parsed.civilInputs) setCivilInputs(parsed.civilInputs)
      if (parsed.plannerInputs) setPlannerInputs(normalizePlannerInputs(parsed.plannerInputs))
      if (typeof parsed.strictPlanningMode === "boolean") setStrictPlanningMode(parsed.strictPlanningMode)
      if (parsed.planningMode) setPlanningMode(parsed.planningMode)
      if (parsed.planStage) setPlanStage(parsed.planStage)
      if (typeof parsed.planLocked === "boolean") setPlanLocked(parsed.planLocked)
      promptModeSnapshotRef.current = DEFAULT_PROMPT_MODE_SNAPSHOT()
      manualModeSnapshotRef.current = DEFAULT_MANUAL_MODE_SNAPSHOT()
    } catch {
      // ignore corrupted local storage payload
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isRoomInteracting) return
    const payload: StoredBlueprintPayload = {
      houseConfig,
      requirements,
      xray,
      vastuEnabled,
      plotFacing,
      wallMaterial,
      floorMaterial,
      cameraPreset,
      lightingPreset,
      civilInputs,
      plannerInputs,
      strictPlanningMode,
      planningMode,
      planStage,
      planLocked,
    }
    const saveHandle = window.setTimeout(() => {
      window.localStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(payload))
    }, 500)
    return () => {
      window.clearTimeout(saveHandle)
    }
  }, [cameraPreset, civilInputs, floorMaterial, houseConfig, isRoomInteracting, lightingPreset, planLocked, planStage, plannerInputs, planningMode, plotFacing, requirements, strictPlanningMode, vastuEnabled, wallMaterial, xray])

  useEffect(() => {
    if (!currentProjectId) return
    let cancelled = false

    const loadProject = async () => {
      setProjectStatus("Loading selected project...")
      try {
        const response = await fetch(`/api/projects/${currentProjectId}`, { cache: "no-store" })
        const data = (await response.json()) as ProjectResponse & { error?: string }
        if (!response.ok || !data.project) {
          throw new Error(data.error || "Could not load project")
        }

        if (cancelled) return
        const payload = data.project.jsonLayout
        setCurrentProjectName(data.project.name)
        setCurrentProjectOwner(data.project.user)
        if (payload.houseConfig) setHouseConfig(payload.houseConfig)
        if (payload.requirements) {
          const loadedRequirements = { ...DEFAULT_REQUIREMENTS, ...payload.requirements }
          setRequirements(loadedRequirements)
          setLastRequestedRequirements(loadedRequirements)
        }
        if (typeof payload.xray === "boolean") setXray(payload.xray)
        if (typeof payload.vastuEnabled === "boolean") setVastuEnabled(payload.vastuEnabled)
        if (payload.plotFacing) setPlotFacing(payload.plotFacing)
        if (payload.wallMaterial) setWallMaterial(payload.wallMaterial)
        if (payload.floorMaterial) setFloorMaterial(payload.floorMaterial)
        if (payload.cameraPreset) setCameraPreset(payload.cameraPreset)
        if (payload.lightingPreset) setLightingPreset(payload.lightingPreset)
        if (payload.civilInputs) setCivilInputs(payload.civilInputs)
        if (payload.plannerInputs) setPlannerInputs(normalizePlannerInputs(payload.plannerInputs))
        if (typeof payload.strictPlanningMode === "boolean") setStrictPlanningMode(payload.strictPlanningMode)
        if (payload.planningMode) setPlanningMode(payload.planningMode)
        if (payload.planStage) setPlanStage(payload.planStage)
        if (typeof payload.planLocked === "boolean") setPlanLocked(payload.planLocked)
        if (payload.savedPreviewImage) setPreviewImageUrl(payload.savedPreviewImage)
        if (payload.savedFloorPlanImage) setFloorMapImageUrl(payload.savedFloorPlanImage)
        promptModeSnapshotRef.current = DEFAULT_PROMPT_MODE_SNAPSHOT()
        manualModeSnapshotRef.current = DEFAULT_MANUAL_MODE_SNAPSHOT()
        setProjectStatus("Project loaded.")
      } catch (error) {
        if (cancelled) return
        setProjectStatus(error instanceof Error ? error.message : "Could not load project.")
      }
    }

    loadProject()

    return () => {
      cancelled = true
    }
  }, [currentProjectId])
  const autoPlotAreaSqFt = useMemo(
    () => clamp(plannerInputs.frontageFt * plannerInputs.depthFt, 200, 10000),
    [plannerInputs.depthFt, plannerInputs.frontageFt],
  )
  useEffect(() => {
    if (!plannerInputs.useCustomPlot) return
    if (planningMode === "manual" && manualAreaOverrideEnabled) return
    setHouseConfig((prev) => (Math.abs(prev.totalSqFt - autoPlotAreaSqFt) < 0.5 ? prev : { ...prev, totalSqFt: autoPlotAreaSqFt }))
  }, [autoPlotAreaSqFt, manualAreaOverrideEnabled, plannerInputs.useCustomPlot, planningMode])

  const plot = useMemo(() => {
    if (plannerInputs.useCustomPlot) {
      return {
        length: clamp(plannerInputs.depthFt, 20, 120),
        width: clamp(plannerInputs.frontageFt, 12, 100),
      }
    }
    return getPlotDimensions(houseConfig.totalSqFt)
  }, [houseConfig.totalSqFt, plannerInputs.depthFt, plannerInputs.frontageFt, plannerInputs.useCustomPlot])

  const floorsArray = useMemo(() => Array.from({ length: houseConfig.floors }, (_, i) => i), [houseConfig.floors])
  const visibleFloors = useMemo(
    () =>
      floorFocus === "all"
        ? floorsArray
        : floorsArray.filter((floor) => floor === floorFocus),
    [floorFocus, floorsArray],
  )

  const floorRoomsMap = useMemo(() => {
    const byFloor = new Map<number, RoomConfig[]>()
    for (const floor of floorsArray) {
      byFloor.set(
        floor,
        houseConfig.rooms.filter((room) => room.floor === floor),
      )
    }
    return byFloor
  }, [floorsArray, houseConfig.rooms])

  const visibleRooms = useMemo(
    () => (floorFocus === "all" ? houseConfig.rooms : houseConfig.rooms.filter((room) => room.floor === floorFocus)),
    [floorFocus, houseConfig.rooms],
  )
  const builtRoomCounts = useMemo(() => {
    const counts = {
      Bedroom: 0,
      Kitchen: 0,
      Bathroom: 0,
      Pooja: 0,
      Store: 0,
      Verandah: 0,
      Parking: 0,
      Garden: 0,
      Balcony: 0,
    } as Record<Exclude<RoomType, "Living" | "Stairs">, number>
    for (const room of houseConfig.rooms) {
      if (room.type in counts) {
        counts[room.type as keyof typeof counts] += 1
      }
    }
    return counts
  }, [houseConfig.rooms])
  const requirementComparisonRows = useMemo(
    () =>
      REQUIREMENT_METRIC_ROWS.map((row) => ({
        ...row,
        requested: lastRequestedRequirements[row.key],
        applied: requirements[row.key],
        built: builtRoomCounts[row.roomType as keyof typeof builtRoomCounts] ?? 0,
      })),
    [builtRoomCounts, lastRequestedRequirements, requirements],
  )
  const requirementMismatchCount = useMemo(
    () => requirementComparisonRows.filter((row) => row.applied !== row.built || row.requested !== row.applied).length,
    [requirementComparisonRows],
  )
  useEffect(() => {
    const report = validateIndianLayout({
      rooms: houseConfig.rooms,
      floors: houseConfig.floors,
      plotLength: plot.length,
      plotWidth: plot.width,
      plotFacing,
      requirements,
    })
    setLayoutValidationReport(report)
  }, [houseConfig.floors, houseConfig.rooms, plot.length, plot.width, plotFacing, requirements])
  useEffect(() => {
    const report = estimateFeasibility({
      plotLength: plot.length,
      plotWidth: plot.width,
      floors: houseConfig.floors,
      requirements,
      inputs: plannerInputs,
    })
    setFeasibilityReport(report)
  }, [houseConfig.floors, plannerInputs, plot.length, plot.width, requirements])
  useEffect(() => {
    const requiredParking = requirements.parkingSpaces > 0
    setPlannerInputs((prev) => (prev.parkingRequired === requiredParking ? prev : { ...prev, parkingRequired: requiredParking }))
  }, [requirements.parkingSpaces])

  const deferredRooms = useDeferredValue(houseConfig.rooms)
  const roomsForAnalysis = isRoomInteracting ? deferredRooms : houseConfig.rooms
  const walkthroughRooms = useMemo(
    () => visibleRooms.filter((room) => room.type !== "Stairs"),
    [visibleRooms],
  )
  const walkthroughTarget = useMemo<[number, number, number] | null>(() => {
    if (!walkthroughMode || walkthroughRooms.length === 0) return null
    const room = walkthroughRooms[walkthroughIndex % walkthroughRooms.length]
    return [room.x, room.floor * houseConfig.floorHeight + room.h / 2, room.z]
  }, [houseConfig.floorHeight, walkthroughIndex, walkthroughMode, walkthroughRooms])

  useEffect(() => {
    if (!selectedRoomId || floorFocus === "all") return
    const selected = houseConfig.rooms.find((room) => room.id === selectedRoomId)
    if (!selected || selected.floor !== floorFocus) {
      setSelectedRoomId(null)
    }
  }, [floorFocus, houseConfig.rooms, selectedRoomId])

  useEffect(() => {
    setFloorFocus((prev) => (prev === "all" ? prev : prev < houseConfig.floors ? prev : "all"))
  }, [houseConfig.floors])
  useEffect(() => {
    setManualPlannerFloor((prev) => Math.round(clamp(prev, 0, Math.max(houseConfig.floors - 1, 0))))
  }, [houseConfig.floors])

  useEffect(() => {
    if (!walkthroughMode) return
    if (walkthroughRooms.length <= 1) return
    const handle = window.setInterval(() => {
      setWalkthroughIndex((prev) => (prev + 1) % walkthroughRooms.length)
    }, 3500)
    return () => window.clearInterval(handle)
  }, [walkthroughMode, walkthroughRooms.length])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (historyRecordTimerRef.current !== null) {
      window.clearTimeout(historyRecordTimerRef.current)
      historyRecordTimerRef.current = null
    }
    if (historyRestoreRef.current || isRoomInteracting) return
    historyRecordTimerRef.current = window.setTimeout(() => {
      pushHistorySnapshot(buildHistorySnapshot())
      historyRecordTimerRef.current = null
    }, 180)
    return () => {
      if (historyRecordTimerRef.current !== null) {
        window.clearTimeout(historyRecordTimerRef.current)
        historyRecordTimerRef.current = null
      }
    }
  }, [buildHistorySnapshot, isRoomInteracting, pushHistorySnapshot])

  const selectedRoom = useMemo(
    () => houseConfig.rooms.find((room) => room.id === selectedRoomId) ?? null,
    [houseConfig.rooms, selectedRoomId],
  )

  const engineeringRooms = useMemo<EngineeringRoom[]>(
    () =>
      roomsForAnalysis.map((room) => ({
        id: room.id,
        type: room.type,
        floor: room.floor,
        x: room.x,
        z: room.z,
        w: room.w,
        l: room.l,
        h: room.h,
        hasWindow: room.hasWindow,
      })),
    [roomsForAnalysis],
  )

  const collidingRoomIds = useMemo(() => detectRoomCollisions(engineeringRooms), [engineeringRooms])
  useEffect(() => {
    if (isRoomInteracting) return
    if (collidingRoomIds.size === 0) {
      overlapAutoFixSignatureRef.current = ""
      return
    }

    const signature = houseConfig.rooms
      .map((room) => `${room.id}:${room.floor}:${room.x.toFixed(2)}:${room.z.toFixed(2)}:${room.w.toFixed(2)}:${room.l.toFixed(2)}`)
      .join("|")
    if (overlapAutoFixSignatureRef.current === signature) return

    const fixedRooms: RoomConfig[] = []
    for (let floor = 0; floor < houseConfig.floors; floor += 1) {
      const floorRooms = houseConfig.rooms.filter((room) => room.floor === floor)
      const floorFixed = resolveFloorOverlaps({
        floorRooms,
        plotLength: plot.length,
        plotWidth: plot.width,
        blockedZones: [],
      })
      fixedRooms.push(...floorFixed)
    }

    const fixedSignature = fixedRooms
      .map((room) => `${room.id}:${room.floor}:${room.x.toFixed(2)}:${room.z.toFixed(2)}:${room.w.toFixed(2)}:${room.l.toFixed(2)}`)
      .join("|")
    if (fixedSignature === signature) {
      overlapAutoFixSignatureRef.current = signature
      return
    }

    const fixedEngineeringRooms: EngineeringRoom[] = fixedRooms.map((room) => ({
      id: room.id,
      type: room.type,
      floor: room.floor,
      x: room.x,
      z: room.z,
      w: room.w,
      l: room.l,
      h: room.h,
      hasWindow: room.hasWindow,
    }))
    const remainingCollisions = detectRoomCollisions(fixedEngineeringRooms)
    if (remainingCollisions.size >= collidingRoomIds.size) {
      overlapAutoFixSignatureRef.current = signature
      return
    }

    overlapAutoFixSignatureRef.current = fixedSignature
    setHouseConfig((prev) => ({ ...prev, rooms: fixedRooms }))
    setAiStatus(`Auto-resolved ${collidingRoomIds.size - remainingCollisions.size} room overlap(s).`)
  }, [collidingRoomIds, houseConfig.floors, houseConfig.rooms, isRoomInteracting, plot.length, plot.width])
  const ventilationIssues = useMemo(() => detectVentilationIssues(engineeringRooms), [engineeringRooms])
  const vastuReport = useMemo(
    () => evaluateVastuCompliance(engineeringRooms, plot.length, plot.width, vastuEnabled, plotFacing),
    [engineeringRooms, plot.length, plot.width, vastuEnabled, plotFacing],
  )
  const vastuWarnings = vastuReport.warnings
  const plumbingBonus = useMemo(() => plumbingEfficiencyBonus(engineeringRooms), [engineeringRooms])
  const structuralPrecheck = useMemo(
    () => runStructuralPrecheck(engineeringRooms, houseConfig.floors, houseConfig.floorHeight, civilInputs),
    [civilInputs, engineeringRooms, houseConfig.floorHeight, houseConfig.floors],
  )
  const selectedMarketProfile = useMemo(
    () => GEO_MARKET_PROFILES.find((profile) => profile.id === selectedMarketProfileId) ?? GEO_MARKET_PROFILES[0],
    [selectedMarketProfileId],
  )
  const effectiveMarketRates = useMemo(
    () => ({
      brickPerPiece: Number((marketRates.brickPerPiece * selectedMarketProfile.materialMultiplier).toFixed(2)),
      cementPerBag: Number((marketRates.cementPerBag * selectedMarketProfile.materialMultiplier).toFixed(2)),
      sandPerTon: Number((marketRates.sandPerTon * selectedMarketProfile.materialMultiplier).toFixed(2)),
      steelPerTon: Number((marketRates.steelPerTon * selectedMarketProfile.materialMultiplier).toFixed(2)),
    }),
    [marketRates, selectedMarketProfile.materialMultiplier],
  )
  const complianceReport = useMemo(
    () => runCodeComplianceChecks(engineeringRooms, houseConfig.floorHeight),
    [engineeringRooms, houseConfig.floorHeight],
  )
  const floorWiseCost = useMemo(() => floorCostBreakdown(engineeringRooms), [engineeringRooms])
  const boqTotals = useMemo(() => {
    return engineeringRooms.reduce(
      (acc, room) => {
        const estimate = estimateRoomMaterials(room)
        acc.bricks += estimate.bricks
        acc.cementBags += estimate.cementBags
        return acc
      },
      { bricks: 0, cementBags: 0 },
    )
  }, [engineeringRooms])
  const estimatedSandTons = useMemo(() => Number(Math.max((plot.length * plot.width) / 120, 1).toFixed(2)), [plot.length, plot.width])
  const estimatedSteelTons = useMemo(
    () => Number((Math.max(plot.length * plot.width * Math.max(houseConfig.floors, 1), 220) / 900).toFixed(2)),
    [houseConfig.floors, plot.length, plot.width],
  )
  const boqCost = useMemo(() => {
    const bricksCost = boqTotals.bricks * effectiveMarketRates.brickPerPiece
    const cementCost = boqTotals.cementBags * effectiveMarketRates.cementPerBag
    const sandCost = estimatedSandTons * effectiveMarketRates.sandPerTon
    const steelCost = estimatedSteelTons * effectiveMarketRates.steelPerTon
    return {
      bricksCost,
      cementCost,
      sandCost,
      steelCost,
      total: bricksCost + cementCost + sandCost + steelCost,
    }
  }, [boqTotals.bricks, boqTotals.cementBags, effectiveMarketRates.brickPerPiece, effectiveMarketRates.cementPerBag, effectiveMarketRates.sandPerTon, effectiveMarketRates.steelPerTon, estimatedSandTons, estimatedSteelTons])

  const floorStats = useMemo(() => {
    return floorsArray.map((floor) => {
      const floorRooms = roomsForAnalysis.filter((room) => room.floor === floor)
      const totalRoomArea = floorRooms.reduce((sum, room) => sum + room.w * room.l, 0)
      const stairsArea = floorRooms.filter((room) => room.type === "Stairs").reduce((sum, room) => sum + room.w * room.l, 0)
      const usableArea = Math.max(totalRoomArea - stairsArea, 0)
      const perimeter = 2 * (plot.length + plot.width)
      const volume = totalRoomArea * houseConfig.floorHeight
      return {
        floor,
        totalRoomArea,
        stairsArea,
        usableArea,
        perimeter,
        volume,
      }
    })
  }, [floorsArray, roomsForAnalysis, houseConfig.floorHeight, plot.length, plot.width])

  const analysisHouseConfig = useMemo(
    () => ({ ...houseConfig, rooms: roomsForAnalysis }),
    [houseConfig, roomsForAnalysis],
  )

  const totalStats = useMemo(() => {
    const gross = floorStats.reduce((sum, floor) => sum + floor.totalRoomArea, 0)
    const stairs = floorStats.reduce((sum, floor) => sum + floor.stairsArea, 0)
    const usable = floorStats.reduce((sum, floor) => sum + floor.usableArea, 0)
    const volume = floorStats.reduce((sum, floor) => sum + floor.volume, 0)
    const netOuterWallArea = houseConfig.floors * 2 * (plot.length + plot.width) * houseConfig.floorHeight
    const paintLiters = (netOuterWallArea / 50) * 1.05
    const brickEstimate = netOuterWallArea * 1.1
    const carpetArea = usable * 0.92
    const builtUpArea = carpetArea * 1.2
    const superBuiltUpArea = builtUpArea * 1.2
    return { gross, stairs, usable, volume, netOuterWallArea, paintLiters, brickEstimate, carpetArea, builtUpArea, superBuiltUpArea }
  }, [floorStats, houseConfig.floorHeight, houseConfig.floors, plot.length, plot.width])
  const selectedMunicipalityRule = useMemo(
    () => MUNICIPALITY_RULES.find((rule) => rule.id === selectedMunicipalityId) ?? MUNICIPALITY_RULES[0],
    [selectedMunicipalityId],
  )
  const municipalityCompliance = useMemo<MunicipalityComplianceReport>(() => {
    const plotAreaSqFt = Math.max(plot.length * plot.width, 1)
    const totalBuiltAreaSqFt = houseConfig.rooms.reduce((sum, room) => sum + room.w * room.l, 0)
    const groundCoverageSqFt = houseConfig.rooms
      .filter((room) => room.floor === 0 && room.type !== "Garden")
      .reduce((sum, room) => sum + room.w * room.l, 0)
    const setbacks = computeGroundSetbacks(houseConfig.rooms, plot.length, plot.width)
    const facingSetbacks = mapSetbacksToFacing(setbacks, plotFacing)
    const sideSetbackFt = Math.min(facingSetbacks.sideLeft, facingSetbacks.sideRight)
    const fsi = Number((totalBuiltAreaSqFt / plotAreaSqFt).toFixed(3))
    const coveragePercent = Number(((groundCoverageSqFt / plotAreaSqFt) * 100).toFixed(2))
    const buildingHeightFt = Number((houseConfig.floorHeight * houseConfig.floors).toFixed(2))

    const evaluateMetric = ({
      id,
      label,
      actual,
      limit,
      comparator,
      unit,
      fix,
    }: {
      id: string
      label: string
      actual: number
      limit: number
      comparator: "max" | "min"
      unit: string
      fix: string
    }): MunicipalityComplianceCheck => {
      const delta = comparator === "max" ? actual - limit : limit - actual
      const fail = comparator === "max" ? actual > limit : actual < limit
      const review = !fail && delta > -0.5
      const status: MunicipalityComplianceCheck["status"] = fail ? "fail" : review ? "review" : "pass"
      const detail =
        comparator === "max"
          ? `${actual.toFixed(2)}${unit} vs allowed ${limit.toFixed(2)}${unit}.`
          : `${actual.toFixed(2)}${unit} vs required ${limit.toFixed(2)}${unit}.`

      return { id, label, status, detail, fix }
    }

    const checks: MunicipalityComplianceCheck[] = [
      evaluateMetric({
        id: "municipal-fsi",
        label: "FSI Limit",
        actual: fsi,
        limit: selectedMunicipalityRule.maxFsi,
        comparator: "max",
        unit: "",
        fix: "Reduce total built-up area or increase open setbacks to lower FSI consumption.",
      }),
      evaluateMetric({
        id: "municipal-coverage",
        label: "Plot Coverage",
        actual: coveragePercent,
        limit: selectedMunicipalityRule.maxCoveragePercent,
        comparator: "max",
        unit: "%",
        fix: "Trim ground-floor footprint or move non-essential areas to upper floors.",
      }),
      evaluateMetric({
        id: "municipal-height",
        label: "Building Height",
        actual: buildingHeightFt,
        limit: selectedMunicipalityRule.maxHeightFt,
        comparator: "max",
        unit: " ft",
        fix: "Reduce floor count or floor-to-floor height before submission.",
      }),
      evaluateMetric({
        id: "municipal-front-setback",
        label: "Front Setback",
        actual: facingSetbacks.front,
        limit: selectedMunicipalityRule.minFrontSetbackFt,
        comparator: "min",
        unit: " ft",
        fix: "Shift front-most rooms inward to recover required front setback.",
      }),
      evaluateMetric({
        id: "municipal-rear-setback",
        label: "Rear Setback",
        actual: facingSetbacks.rear,
        limit: selectedMunicipalityRule.minRearSetbackFt,
        comparator: "min",
        unit: " ft",
        fix: "Pull rear-facing walls inward or redistribute rear utility spaces.",
      }),
      evaluateMetric({
        id: "municipal-side-setback",
        label: "Side Setback",
        actual: sideSetbackFt,
        limit: selectedMunicipalityRule.minSideSetbackFt,
        comparator: "min",
        unit: " ft",
        fix: "Narrow edge rooms or center the plan to satisfy minimum side clearance.",
      }),
    ]

    const score = Math.max(0, 100 - checks.reduce((sum, check) => sum + (check.status === "fail" ? 18 : check.status === "review" ? 7 : 0), 0))
    const status = score >= 85 ? "PASS" : score >= 65 ? "REVIEW" : "RISK"
    return {
      score,
      status,
      checks,
      metrics: {
        plotAreaSqFt: Number(plotAreaSqFt.toFixed(2)),
        totalBuiltAreaSqFt: Number(totalBuiltAreaSqFt.toFixed(2)),
        groundCoverageSqFt: Number(groundCoverageSqFt.toFixed(2)),
        fsi,
        coveragePercent,
        buildingHeightFt,
        frontSetbackFt: Number(facingSetbacks.front.toFixed(2)),
        rearSetbackFt: Number(facingSetbacks.rear.toFixed(2)),
        sideSetbackFt: Number(sideSetbackFt.toFixed(2)),
      },
    }
  }, [houseConfig.floorHeight, houseConfig.floors, houseConfig.rooms, plot.length, plot.width, plotFacing, selectedMunicipalityRule])
  const regulatoryViolations = useMemo(
    () => municipalityCompliance.checks.filter((check) => check.status !== "pass"),
    [municipalityCompliance.checks],
  )
  const geoCostEstimate = useMemo(() => {
    const labor = totalStats.builtUpArea * selectedMarketProfile.laborRatePerSqFt
    const subtotal = boqCost.total + labor
    const contingency = subtotal * 0.15
    return {
      materials: boqCost.total,
      labor,
      contingency,
      total: subtotal + contingency,
    }
  }, [boqCost.total, selectedMarketProfile.laborRatePerSqFt, totalStats.builtUpArea])
  const generatedFloorMapImageUrl = useMemo(
    () =>
      buildFloorPlanMapDataUrl({
        houseConfig: analysisHouseConfig,
        plotLength: plot.length,
        plotWidth: plot.width,
        floorStats,
      }),
    [analysisHouseConfig, floorStats, plot.length, plot.width],
  )
  const effectiveFloorMapImageUrl = floorMapImageUrl ?? generatedFloorMapImageUrl

  const renderQualityType = useMemo(() => getRenderQualityFromSlider(renderQuality[0]), [renderQuality])
  const renderDpr = renderQualityType === "ultra" ? 2 : renderQualityType === "balanced" ? 1.5 : 1.1
  const shadowMapSize = renderQualityType === "ultra" ? 3072 : renderQualityType === "balanced" ? 2048 : 1024
  const contactShadowBlur = renderQualityType === "ultra" ? 2.8 : renderQualityType === "balanced" ? 2.2 : 1.6
  const effectiveRenderDpr = isRoomInteracting ? 1 : renderDpr
  const effectiveShadowMapSize = isRoomInteracting ? 1024 : shadowMapSize
  const effectiveContactShadowBlur = isRoomInteracting ? 1.0 : contactShadowBlur
  const lightingConfig = useMemo(() => {
    if (lightingPreset === "night") {
      return {
        ambient: 0.18,
        directional: 0.45,
        directionalPos: [14, 22, 10] as [number, number, number],
        env: "night" as const,
        background: "#0f172a",
      }
    }
    if (lightingPreset === "evening") {
      return {
        ambient: 0.28,
        directional: 0.82,
        directionalPos: [18, 26, 12] as [number, number, number],
        env: "sunset" as const,
        background: "#f8fafc",
      }
    }
    return {
      ambient: 0.34,
      directional: 1.05,
      directionalPos: [20, 30, 16] as [number, number, number],
      env: "apartment" as const,
      background: "#f8fafc",
    }
  }, [lightingPreset])

  const aiLayoutContext = useMemo(
    () => ({
      totalSqFt: houseConfig.totalSqFt,
      floors: houseConfig.floors,
      plotFacing,
      wallMaterial,
      floorMaterial,
      lightingPreset,
      cameraPreset,
      siteProfile: {
        frontageFt: plannerInputs.frontageFt,
        depthFt: plannerInputs.depthFt,
        cornerPlot: plannerInputs.cornerPlot,
        roadFacing: plotFacing,
      },
      familyProfile: {
        familySize: plannerInputs.familySize,
        elderlyMembers: plannerInputs.elderlyMembers,
        childrenCount: plannerInputs.childrenCount,
        futureExpansionYears: plannerInputs.futureExpansionYears,
      },
      includeLandscapeGlass: requirements.includeLandscapeGlass,
      vastuEnabled,
      vastuScore: vastuReport.score,
      rooms: roomsForAnalysis.map((room) => ({
        type: room.type,
        floor: room.floor + 1,
        width: room.w,
        length: room.l,
        hasWindow: room.hasWindow,
        doorWidth: room.doorWidth ?? 0.95,
        windowWidth: room.windowWidth ?? 1.2,
      })),
    }),
    [cameraPreset, floorMaterial, houseConfig.floors, houseConfig.totalSqFt, lightingPreset, plannerInputs.childrenCount, plannerInputs.cornerPlot, plannerInputs.depthFt, plannerInputs.elderlyMembers, plannerInputs.familySize, plannerInputs.frontageFt, plannerInputs.futureExpansionYears, plotFacing, requirements.includeLandscapeGlass, roomsForAnalysis, vastuEnabled, vastuReport.score, wallMaterial],
  )
  const snapLinks = useMemo(() => getSnapLinks(houseConfig.rooms, houseConfig.floorHeight), [houseConfig.floorHeight, houseConfig.rooms])
  const vastuInsight = useMemo(() => {
    const kitchen = houseConfig.rooms.find((room) => room.type === "Kitchen")
    if (!kitchen) return "Kitchen not placed yet."
    const direction = vastuReport.roomDirections.get(kitchen.id) ?? "Center"
    if (direction === "SouthEast") return "Kitchen is in Agni Kon."
    return `Kitchen currently in ${direction}.`
  }, [houseConfig.rooms, vastuReport.roomDirections])
  const ensureUnlockedForEdit = useCallback(
    (intent: string) => {
      if (!planLocked) return true
      setAiStatus(`Plan is locked. Click Unlock Editing to ${intent}.`)
      return false
    },
    [planLocked],
  )
  const setPromptPipelineStage = useCallback((stage: PipelineStage, overrides: Partial<PipelineState> = {}) => {
    setPromptPipelineState(createPromptPipelineState(stage, overrides))
  }, [])
  const resetPromptPipeline = useCallback(() => {
    setPromptPipelineState(INITIAL_PROMPT_PIPELINE_STATE)
    setPromptPipelineContext(INITIAL_PROMPT_PIPELINE_CONTEXT)
  }, [])

  const setFloors = (floors: number) => {
    if (!ensureUnlockedForEdit("change floors")) return
    const requestedFloors = Math.round(clamp(floors, 1, 4))
    const maxFloors = getMaxFloorsForPlotArea(houseConfig.totalSqFt)
    const safeFloors = Math.round(clamp(requestedFloors, 1, maxFloors))
    setHouseConfig((prev) => ({
      ...prev,
      floors: safeFloors,
      rooms: prev.rooms.filter((room) => room.floor < safeFloors),
    }))
    setRequirements((prev) => ({
      ...prev,
      includeStairs: safeFloors > 1 ? prev.includeStairs : false,
      balconyRooms: safeFloors > 1 ? prev.balconyRooms : 0,
    }))
    setSelectedRoomId((prev) => {
      if (!prev) return prev
      const selected = houseConfig.rooms.find((room) => room.id === prev)
      if (!selected) return null
      return selected.floor < safeFloors ? prev : null
    })
    setFloorFocus((prev) => (prev === "all" ? prev : prev < safeFloors ? prev : "all"))
    if (safeFloors !== requestedFloors) {
      setAiStatus(`For ${houseConfig.totalSqFt.toFixed(0)} sq ft, max realistic floors is ${safeFloors}.`)
    }
    setPlanStage("draft_requirements")
  }

  const addRoom = (type: RoomType, floor: number) => {
    if (!ensureUnlockedForEdit("add rooms")) return
    const preset = ROOM_PRESETS[type]
    const floorRooms = houseConfig.rooms.filter((room) => room.floor === floor)
    const preferredNear =
      type === "Kitchen"
        ? floorRooms.find((room) => room.type === "Living") ?? null
        : type === "Store"
          ? floorRooms.find((room) => room.type === "Kitchen") ?? null
          : type === "Bathroom"
            ? floorRooms.find((room) => room.type === "Bedroom") ?? null
            : type === "Parking" || type === "Garden" || type === "Balcony"
              ? floorRooms.find((room) => room.type === "Living") ?? null
            : null
    const spot = findEmptySpot({
      plotLength: plot.length,
      plotWidth: plot.width,
      roomSize: { w: preset.w, l: preset.l },
      roomType: type,
      existingRooms: floorRooms,
      preferredNear,
    })
    if (!spot) {
      setAiStatus(`No placement slot available for ${type} on Floor ${floor + 1}. Try removing a room or increasing plot area.`)
      return
    }

    const room: RoomConfig = {
      id: `room-${type.toLowerCase()}-${Date.now()}`,
      type,
      floor,
      x: spot.x,
      z: spot.z,
      ...preset,
      hasWindow: type !== "Stairs" && type !== "Parking" && type !== "Garden" && type !== "Balcony",
      doorWidth: 0.95,
      windowWidth: 1.2,
    }
    setHouseConfig((prev) => ({ ...prev, rooms: [...prev.rooms, room] }))
    setSelectedRoomId(room.id)
    const requirementKey = REQUIREMENT_KEY_BY_ROOM[type]
    if (requirementKey) {
      setRequirements((prev) => ({
        ...prev,
        [requirementKey]: Math.round(clamp((prev[requirementKey] as number) + 1, 0, ROOM_NEED_LIMITS[requirementKey])),
      }))
    }
    setPlanStage("editable_plan")
  }

  const updateRoom = (id: string, patch: Partial<RoomConfig>) => {
    if (!ensureUnlockedForEdit("edit room properties")) return
    setHouseConfig((prev) => {
      const current = prev.rooms.find((room) => room.id === id)
      if (!current) return prev

      const affectsPlacement =
        patch.x !== undefined ||
        patch.z !== undefined ||
        patch.w !== undefined ||
        patch.l !== undefined ||
        patch.floor !== undefined

      if (!affectsPlacement) {
        return {
          ...prev,
          rooms: prev.rooms.map((room) => (room.id === id ? { ...room, ...patch } : room)),
        }
      }

      const nextRoom: RoomConfig = {
        ...current,
        ...patch,
      }
      const xLimit = plot.length / 2 - nextRoom.w / 2 - 0.15
      const zLimit = plot.width / 2 - nextRoom.l / 2 - 0.15
      nextRoom.x = clamp(nextRoom.x, -xLimit, xLimit)
      nextRoom.z = clamp(nextRoom.z, -zLimit, zLimit)
      const siblingRooms = prev.rooms.filter((room) => room.id !== id && room.floor === nextRoom.floor)

      if (
        canPlaceRoom({
          x: nextRoom.x,
          z: nextRoom.z,
          w: nextRoom.w,
          l: nextRoom.l,
          plotLength: plot.length,
          plotWidth: plot.width,
          existingRooms: siblingRooms,
          blockedZones: [],
        })
      ) {
        return {
          ...prev,
          rooms: prev.rooms.map((room) => (room.id === id ? nextRoom : room)),
        }
      }

      const shifted = shiftCandidateRightUntilClear({
        candidate: { x: nextRoom.x, z: nextRoom.z, w: nextRoom.w, l: nextRoom.l },
        plotLength: plot.length,
        plotWidth: plot.width,
        existingRooms: siblingRooms,
        blockedZones: [],
      })
      if (shifted) {
        const adjusted = { ...nextRoom, x: shifted.x, z: shifted.z }
        return {
          ...prev,
          rooms: prev.rooms.map((room) => (room.id === id ? adjusted : room)),
        }
      }

      const preferredNear =
        nextRoom.type === "Store"
          ? siblingRooms.find((room) => room.type === "Kitchen") ?? siblingRooms.find((room) => room.type === "Living") ?? null
          : nextRoom.type === "Bathroom"
            ? siblingRooms.find((room) => room.type === "Bedroom") ?? null
            : siblingRooms.find((room) => room.type === "Living") ?? null
      const spot = findEmptySpot({
        plotLength: plot.length,
        plotWidth: plot.width,
        roomSize: { w: nextRoom.w, l: nextRoom.l },
        roomType: nextRoom.type,
        existingRooms: siblingRooms,
        blockedZones: [],
        preferredNear,
      })
      if (spot) {
        const adjusted = { ...nextRoom, x: spot.x, z: spot.z }
        return {
          ...prev,
          rooms: prev.rooms.map((room) => (room.id === id ? adjusted : room)),
        }
      }

      return prev
    })
    setPlanStage("editable_plan")
  }

  const moveRoomWithConstraints = (id: string, x: number, z: number) => {
    if (!ensureUnlockedForEdit("move rooms")) return
    let computedGuide: SnapGuide | null = null
    setHouseConfig((prev) => {
      const room = prev.rooms.find((item) => item.id === id)
      if (!room) return prev

      const gridStep = 0.4
      let nextX = Math.round(x / gridStep) * gridStep
      let nextZ = Math.round(z / gridStep) * gridStep
      const xLimit = plot.length / 2 - room.w / 2 - 0.15
      const zLimit = plot.width / 2 - room.l / 2 - 0.15
      nextX = clamp(nextX, -xLimit, xLimit)
      nextZ = clamp(nextZ, -zLimit, zLimit)

      const siblings = prev.rooms.filter((item) => item.floor === room.floor && item.id !== id)
      const snapThreshold = 0.45
      const xCandidates = siblings.flatMap((sibling) => [
        sibling.x,
        sibling.x - (sibling.w - room.w) / 2,
        sibling.x + (sibling.w - room.w) / 2,
        sibling.x - (sibling.w + room.w) / 2,
        sibling.x + (sibling.w + room.w) / 2,
      ])
      const zCandidates = siblings.flatMap((sibling) => [
        sibling.z,
        sibling.z - (sibling.l - room.l) / 2,
        sibling.z + (sibling.l - room.l) / 2,
        sibling.z - (sibling.l + room.l) / 2,
        sibling.z + (sibling.l + room.l) / 2,
      ])
      const findNearest = (target: number, candidates: number[]) => {
        let nearest: number | null = null
        let bestDistance = Number.POSITIVE_INFINITY
        for (const candidateValue of candidates) {
          const distance = Math.abs(target - candidateValue)
          if (distance < bestDistance) {
            bestDistance = distance
            nearest = candidateValue
          }
        }
        if (nearest === null || bestDistance > snapThreshold) return null
        return nearest
      }
      const snappedX = findNearest(nextX, xCandidates)
      const snappedZ = findNearest(nextZ, zCandidates)
      if (snappedX !== null) nextX = snappedX
      if (snappedZ !== null) nextZ = snappedZ

      const candidate = { x: nextX, z: nextZ, w: room.w, l: room.l }
      const shifted = shiftCandidateRightUntilClear({
        candidate,
        plotLength: plot.length,
        plotWidth: plot.width,
        existingRooms: siblings,
        blockedZones: [],
      })
      if (!shifted) {
        computedGuide = null
        return prev
      }
      computedGuide = snappedX !== null || snappedZ !== null ? { floor: room.floor, x: snappedX ?? undefined, z: snappedZ ?? undefined } : null

      return {
        ...prev,
        rooms: prev.rooms.map((item) =>
          item.id === id ? { ...item, x: shifted.x, z: shifted.z } : item,
        ),
      }
    })
    setSnapGuide(computedGuide)
    setPlanStage("editable_plan")
  }

  const deriveRequirementsFromRooms = useCallback(
    (rooms: RoomConfig[], floors: number, baseline: PlannerRequirements): PlannerRequirements => {
      const byType = (type: RoomType) => rooms.filter((room) => room.type === type).length
      return {
        ...baseline,
        bedrooms: byType("Bedroom"),
        kitchens: byType("Kitchen"),
        bathrooms: byType("Bathroom"),
        poojaRooms: byType("Pooja"),
        storeRooms: byType("Store"),
        verandahRooms: byType("Verandah"),
        parkingSpaces: byType("Parking"),
        gardenAreas: byType("Garden"),
        balconyRooms: byType("Balcony"),
        includeStairs: floors > 1 ? byType("Stairs") > 0 : false,
      }
    },
    [],
  )

  const removeRoom = (id: string) => {
    if (!ensureUnlockedForEdit("remove rooms")) return
    setHouseConfig((prev) => {
      const nextRooms = prev.rooms.filter((room) => room.id !== id)
      setRequirements((current) => deriveRequirementsFromRooms(nextRooms, prev.floors, current))
      return {
        ...prev,
        rooms: nextRooms,
      }
    })
    setSelectedRoomId((prev) => (prev === id ? null : prev))
    setPlanStage("editable_plan")
  }
  const countRoomsByType = useCallback(
    (type: RoomType, floor?: number) =>
      houseConfig.rooms.filter((room) => room.type === type && (floor === undefined || room.floor === floor)).length,
    [houseConfig.rooms],
  )
  const removeRoomByType = (type: RoomType, floor: number) => {
    if (!ensureUnlockedForEdit("remove rooms")) return
    const floorMatches = houseConfig.rooms.filter((room) => room.type === type && room.floor === floor)
    const allMatches = houseConfig.rooms.filter((room) => room.type === type)
    const target =
      floorMatches.length > 0
        ? floorMatches[floorMatches.length - 1]
        : allMatches.length > 0
          ? allMatches[allMatches.length - 1]
          : null
    if (!target) {
      setAiStatus(`No ${type} room found to remove.`)
      return
    }
    removeRoom(target.id)
  }

  const updateSelectedRoomDimension = (field: "w" | "l" | "h", value: number) => {
    if (!selectedRoom) return
    updateRoom(selectedRoom.id, { [field]: clamp(value, field === "h" ? 7 : 4, field === "h" ? 14 : 26) } as Partial<RoomConfig>)
  }

  const updateSelectedOpening = (field: "doorWidth" | "windowWidth", value: number) => {
    if (!selectedRoom) return
    const maxAllowed = field === "doorWidth" ? Math.max(0.7, selectedRoom.w - 0.4) : Math.max(0.7, selectedRoom.l - 0.4)
    updateRoom(selectedRoom.id, { [field]: clamp(value, 0.7, maxAllowed) } as Partial<RoomConfig>)
  }

  const updateSelectedRoomType = (nextType: RoomType) => {
    if (!selectedRoom) return
    if (!ensureUnlockedForEdit("change room type")) return
    const nextPreset = ROOM_PRESETS[nextType]
    const nextHasWindow = !(nextType === "Stairs" || nextType === "Parking" || nextType === "Garden" || nextType === "Balcony")
    setHouseConfig((prev) => {
      const nextRooms = prev.rooms.map((room) =>
        room.id === selectedRoom.id
          ? {
              ...room,
              type: nextType,
              w: nextPreset.w,
              l: nextPreset.l,
              h: nextPreset.h,
              color: nextPreset.color,
              hasWindow: nextHasWindow ? room.hasWindow : false,
              doorWidth: room.doorWidth ?? 0.95,
              windowWidth: room.windowWidth ?? 1.2,
            }
          : room,
      )
      setRequirements((current) => deriveRequirementsFromRooms(nextRooms, prev.floors, current))
      return { ...prev, rooms: nextRooms }
    })
    setPlanStage("editable_plan")
  }

  const updateSelectedRoomFloor = (nextFloor: number) => {
    if (!selectedRoom) return
    if (!ensureUnlockedForEdit("change room floor")) return
    const targetFloor = Math.round(clamp(nextFloor, 0, houseConfig.floors - 1))
    updateRoom(selectedRoom.id, { floor: targetFloor })
    setPlanStage("editable_plan")
  }

  const normalizeRequirements = (
    base: PlannerRequirements,
    patch: Partial<PlannerRequirements>,
    floors: number,
  ): PlannerRequirements => {
    return {
      bedrooms: Math.round(clamp(patch.bedrooms ?? base.bedrooms, 0, 8)),
      kitchens: Math.round(clamp(patch.kitchens ?? base.kitchens, 0, 4)),
      bathrooms: Math.round(clamp(patch.bathrooms ?? base.bathrooms, 0, 8)),
      poojaRooms: Math.round(clamp(patch.poojaRooms ?? base.poojaRooms, 0, 2)),
      storeRooms: Math.round(clamp(patch.storeRooms ?? base.storeRooms, 0, 3)),
      verandahRooms: Math.round(clamp(patch.verandahRooms ?? base.verandahRooms, 0, 2)),
      parkingSpaces: Math.round(clamp(patch.parkingSpaces ?? base.parkingSpaces, 0, 2)),
      gardenAreas: Math.round(clamp(patch.gardenAreas ?? base.gardenAreas, 0, 2)),
      balconyRooms: Math.round(clamp(patch.balconyRooms ?? base.balconyRooms, 0, 3)),
      includeStairs: floors > 1 ? (patch.includeStairs ?? base.includeStairs) : false,
      includeBoundary: patch.includeBoundary ?? base.includeBoundary,
      includeLandscapeGlass: patch.includeLandscapeGlass ?? base.includeLandscapeGlass,
    }
  }
  const buildPromptBaselineRequirements = (patch: WizardPatch, floors: number): PlannerRequirements => {
    const hintedBedrooms = Math.round(clamp(patch.bedrooms ?? 2, 1, 4))
    const bhkDefaults = getBhkDefaults(hintedBedrooms)
    const estimatedBathrooms = Math.round(clamp(Math.round(hintedBedrooms / 2 + 0.5), 1, 4))
    const base: PlannerRequirements = {
      bedrooms: bhkDefaults.bedrooms ?? hintedBedrooms,
      kitchens: bhkDefaults.kitchens ?? 1,
      bathrooms: bhkDefaults.bathrooms ?? estimatedBathrooms,
      poojaRooms: 0,
      storeRooms: 0,
      verandahRooms: 0,
      parkingSpaces: 0,
      gardenAreas: 0,
      balconyRooms: floors > 1 ? 1 : 0,
      includeStairs: floors > 1,
      includeBoundary: false,
      includeLandscapeGlass: false,
    }
    return normalizeRequirements(base, patch, floors)
  }
  const selectedPromptSuggestion =
    wizardSuggestions.find((suggestion) => suggestion.id === selectedWizardSuggestionId) ?? wizardSuggestions[0] ?? null
  const calculateRoomMatrix = useCallback(
    (patch: WizardPatch, rooms: RoomConfig[]): RoomMatrixReport => {
      const floors = Math.round(clamp(patch.floors ?? houseConfig.floors, 1, 4))
      const requested = normalizeRequirements(requirements, patch, floors)
      const adjacencyGraph = buildAdjacencyGraph(rooms)
      const rows = REQUIREMENT_METRIC_ROWS
        .map((row) => {
          const required = requested[row.key]
          const typeRooms = rooms.filter((room) => room.type === row.roomType)
          const built = typeRooms.length
          const minSize = MIN_ROOM_DIMENSIONS[row.roomType]
          const sizeValidCount = minSize
            ? typeRooms.filter((room) => room.w + 0.01 >= minSize.w && room.l + 0.01 >= minSize.l).length
            : built
          const size: RoomMatrixRow["size"] =
            built === 0 ? "Invalid" : sizeValidCount === built ? "Valid" : sizeValidCount > 0 ? "Compact" : "Invalid"
          const accessValidCount = typeRooms.filter((room) => (adjacencyGraph.get(room.id)?.size ?? 0) > 0).length
          const access: RoomMatrixRow["access"] =
            built === 0 ? "Invalid" : accessValidCount === built ? "Valid" : accessValidCount > 0 ? "Limited" : "Invalid"
          const status: RoomMatrixRow["status"] =
            built >= required && size === "Valid" && access === "Valid"
              ? "Match"
              : built === 0
                ? "Missing"
                : "Partial"
          const note =
            row.roomType === "Parking" && status !== "Match"
              ? built > 0
                ? "Compact parking only."
                : "Parking missing."
              : row.roomType === "Pooja" && status !== "Match"
                ? built > 0
                  ? "Pooja niche/compact fit."
                  : "No dedicated pooja yet."
                : status === "Match"
                  ? "Within target."
                  : size === "Invalid"
                    ? "Size below minimum."
                    : access === "Invalid"
                      ? "Access path missing."
                      : "Partial fit."
          return { label: row.label, roomType: row.roomType, required, built, size, access, status, note }
        })
        .filter((row) => row.required > 0)
      const total = rows.length
      const matches = rows.filter((row) => row.status === "Match").length
      const score = total === 0 ? 100 : Math.round((matches / total) * 100)
      return {
        rows,
        score,
        mismatchCount: rows.filter((row) => row.status !== "Match").length,
      }
    },
    [houseConfig.floors, requirements],
  )
  const validateConstraints = useCallback((rooms: RoomConfig[], constraints: PromptConstraintBundle, referencePatch: WizardPatch | null): ConstraintValidationReport => {
    const checks: PromptConstraintCheck[] = []
    const createFloorCountMap = (floors: number[]) => {
      const map = new Map<number, number>()
      for (const floor of floors) {
        map.set(floor, (map.get(floor) ?? 0) + 1)
      }
      return map
    }
    const formatFloor = (floor: number) => `F${floor + 1}`

    for (const [roomType, preferredFloorsRaw] of Object.entries(constraints.lockedRooms) as Array<[RoomType, number[]]>) {
      const preferredFloors = (preferredFloorsRaw ?? []).filter((floor) => Number.isInteger(floor) && floor >= 0 && floor <= 3)
      if (preferredFloors.length === 0) continue
      const matchingRooms = rooms.filter((room) => room.type === roomType)
      if (matchingRooms.length === 0) {
        checks.push({
          id: `lock-${roomType}`,
          label: `${roomType} floor lock`,
          status: "fail",
          detail: `No ${roomType} room generated. Required on ${Array.from(new Set(preferredFloors)).map(formatFloor).join(", ")}.`,
        })
        continue
      }
      const requiredCounts = createFloorCountMap(preferredFloors)
      const actualCounts = createFloorCountMap(matchingRooms.map((room) => room.floor))
      const missing: string[] = []
      for (const [floor, requiredCount] of requiredCounts.entries()) {
        const actualCount = actualCounts.get(floor) ?? 0
        if (actualCount < requiredCount) {
          missing.push(`${formatFloor(floor)} x${requiredCount - actualCount}`)
        }
      }
      if (missing.length === 0) {
        checks.push({
          id: `lock-${roomType}`,
          label: `${roomType} floor lock`,
          status: "pass",
          detail: `Matched requested floors: ${Array.from(requiredCounts.keys()).map(formatFloor).join(", ")}.`,
        })
      } else {
        checks.push({
          id: `lock-${roomType}`,
          label: `${roomType} floor lock`,
          status: "fail",
          detail: `Missing ${roomType} on ${missing.join(", ")}.`,
        })
      }
    }

    const isAdjacentOrNear = (roomA: RoomConfig, roomB: RoomConfig) => {
      if (roomA.floor !== roomB.floor) return false
      if (areRoomsSnapped(roomA, roomB)) return true
      const aMinX = roomA.x - roomA.w / 2
      const aMaxX = roomA.x + roomA.w / 2
      const aMinZ = roomA.z - roomA.l / 2
      const aMaxZ = roomA.z + roomA.l / 2
      const bMinX = roomB.x - roomB.w / 2
      const bMaxX = roomB.x + roomB.w / 2
      const bMinZ = roomB.z - roomB.l / 2
      const bMaxZ = roomB.z + roomB.l / 2
      const gapX = Math.max(0, Math.max(aMinX - bMaxX, bMinX - aMaxX))
      const gapZ = Math.max(0, Math.max(aMinZ - bMaxZ, bMinZ - aMaxZ))
      const overlapX = Math.max(0, Math.min(aMaxX, bMaxX) - Math.max(aMinX, bMinX))
      const overlapZ = Math.max(0, Math.min(aMaxZ, bMaxZ) - Math.max(aMinZ, bMinZ))
      const nearTolerance = 1.2
      const overlapTolerance = 0.3
      return (gapX <= nearTolerance && overlapZ >= overlapTolerance) || (gapZ <= nearTolerance && overlapX >= overlapTolerance)
    }

    for (const rule of constraints.adjacencyRules) {
      const primaryRooms = rooms.filter((room) => room.type === rule.room)
      const targetRooms = rooms.filter((room) => room.type === rule.near)
      if (primaryRooms.length === 0 || targetRooms.length === 0) {
        checks.push({
          id: `adj-${rule.room}-${rule.near}`,
          label: `${rule.room} near ${rule.near}`,
          status: "fail",
          detail: `${primaryRooms.length === 0 ? `${rule.room} missing` : `${rule.near} missing`} in generated plan.`,
        })
        continue
      }
      const satisfied = primaryRooms.some((room) => targetRooms.some((other) => isAdjacentOrNear(room, other)))
      checks.push({
        id: `adj-${rule.room}-${rule.near}`,
        label: `${rule.room} near ${rule.near}`,
        status: satisfied ? "pass" : "fail",
        detail: satisfied ? "Adjacency matched." : "No nearby pair found on same floor.",
      })
    }

    for (const rule of constraints.directionRules) {
      const typedRooms = rooms.filter((room) => room.type === rule.room)
      if (typedRooms.length === 0) {
        checks.push({
          id: `dir-${rule.room}-${rule.direction}`,
          label: `${rule.room} in ${rule.direction}`,
          status: "fail",
          detail: `${rule.room} room missing in generated plan.`,
        })
        continue
      }
      const observedDirections = typedRooms.map((room) => getRoomDirection(room.x, room.z, plot.length, plot.width, plotFacing))
      const directionMatched = observedDirections.includes(rule.direction)
      checks.push({
        id: `dir-${rule.room}-${rule.direction}`,
        label: `${rule.room} in ${rule.direction}`,
        status: directionMatched ? "pass" : "fail",
        detail: directionMatched ? "Direction matched." : `Current zones: ${Array.from(new Set(observedDirections)).join(", ")}.`,
      })
    }
    const floors = Math.round(clamp(referencePatch?.floors ?? houseConfig.floors, 1, 4))
    const stairRequired = floors > 1
    const stairProvided = stairRequired ? rooms.some((room) => room.type === "Stairs") : true
    if (stairRequired && !stairProvided) {
      checks.push({
        id: "stairs-missing",
        label: "Inter-floor staircase",
        status: "fail",
        detail: "Multi-floor plan requires stairs but none were generated.",
      })
    }

    const passedCount = checks.filter((check) => check.status === "pass").length
    const totalChecks = checks.length
    const score = totalChecks === 0 ? 100 : Math.round((passedCount / totalChecks) * 100)
    const failedChecks = checks.filter((check) => check.status === "fail")
    const blockingReasons = failedChecks.map((check) => `${check.label}: ${check.detail}`)
    return {
      score,
      checks,
      failedCount: totalChecks - passedCount,
      criticalPass: blockingReasons.length === 0,
      blockingReasons,
    }
  }, [houseConfig.floors, plot.length, plot.width, plotFacing])
  const promptRoomMatrixReport = useMemo(() => {
    if (promptPipelineContext.roomMatrixReport) return promptPipelineContext.roomMatrixReport
    if (!lastPromptPatch) return null
    return calculateRoomMatrix(lastPromptPatch, houseConfig.rooms)
  }, [calculateRoomMatrix, houseConfig.rooms, lastPromptPatch, promptPipelineContext.roomMatrixReport])
  const promptRoomMatrix = promptRoomMatrixReport?.rows ?? []
  const promptStairCheck = useMemo(() => {
    if (!lastPromptPatch) return null
    const floors = Math.round(clamp(lastPromptPatch.floors ?? houseConfig.floors, 1, 4))
    const stairRequired = floors > 1
    const stairProvided = stairRequired ? houseConfig.rooms.some((room) => room.type === "Stairs") : true
    return {
      stairRequired,
      stairProvided,
      status: stairRequired && !stairProvided ? "FAIL" : "PASS",
    }
  }, [houseConfig.floors, houseConfig.rooms, lastPromptPatch])
  const promptConstraintReport = useMemo<ConstraintValidationReport>(() => {
    if (promptPipelineContext.constraintReport) return promptPipelineContext.constraintReport
    return validateConstraints(houseConfig.rooms, promptConstraints, lastPromptPatch)
  }, [houseConfig.rooms, lastPromptPatch, promptConstraints, promptPipelineContext.constraintReport, validateConstraints])
  const parsedPromptPlan = promptPipelineContext.parsedPlan
  const promptDetectedRows = useMemo(
    () => (parsedPromptPlan ? formatPromptDetectedRows(parsedPromptPlan.patch) : []),
    [parsedPromptPlan],
  )
  const promptRecommendedRows = useMemo(() => {
    if (!parsedPromptPlan) return []
    const derivedArea = clamp(
      parsedPromptPlan.patch.totalSqFt ??
        ((parsedPromptPlan.patch.bedrooms ?? 2) * 260 +
          (parsedPromptPlan.patch.kitchens ?? 1) * 90 +
          (parsedPromptPlan.patch.bathrooms ?? 2) * 45),
      400,
      5000,
    )
    const dims = getPlotDimensions(derivedArea)
    const recommendedBreadth = Math.round(clamp(dims.width, 12, 100) / 5) * 5
    const recommendedLength = Math.round(clamp(dims.length, 20, 120) / 5) * 5
    const rows = [`Recommended plot: ${recommendedBreadth} x ${recommendedLength} ft`]
    if (parsedPromptPlan.missingInputs.includes("plot facing")) {
      rows.push(`Recommended facing: ${plotFacing}`)
    }
    rows.push(`Recommended style: ${derivedArea <= 1100 ? "Compact Indian layout" : "Balanced family layout"}`)
    return rows.slice(0, 3)
  }, [parsedPromptPlan, plotFacing])
  const canRender3dPreview =
    planningMode === "prompt"
      ? promptPipelineState.planApplied && houseConfig.rooms.length > 0
      : houseConfig.rooms.length > 0
  const previewBlockedMessage =
    planningMode === "prompt"
      ? "Analyze prompt, review AI suggestion, and apply plan to unlock 3D preview."
      : "Manual mode active. Add/edit rooms or generate manual layout to unlock preview."
  const promptPlanApplied = planningMode !== "prompt" || promptPipelineState.planApplied
  const canGeneratePromptPreview =
    planningMode === "prompt"
      ? canRender3dPreview && promptPipelineState.planApplied
      : canRender3dPreview
  const previewGenerationBlockedMessage =
    planningMode === "prompt"
      ? !promptPipelineState.planApplied
        ? "Apply selected plan first."
        : houseConfig.rooms.length === 0
          ? "No rooms available to render preview."
        : previewBlockedMessage
      : previewBlockedMessage

  const updateRequirementCount = (key: RequirementKey, nextValue: number) => {
    if (!ensureUnlockedForEdit("change requirements")) return
    const normalizedValue = Math.round(clamp(nextValue, 0, ROOM_NEED_LIMITS[key]))
    const nextRequirements = normalizeRequirements(requirements, { [key]: normalizedValue } as Partial<PlannerRequirements>, houseConfig.floors)
    if (key === "parkingSpaces") {
      setPlannerInputs((prev) => ({ ...prev, parkingRequired: normalizedValue > 0 }))
    }
    generateSmartLayout(nextRequirements, houseConfig.floors, houseConfig.floorHeight, houseConfig.totalSqFt)
  }

  const applyCurrentNeeds = () => {
    if (!ensureUnlockedForEdit("apply manual requirements")) return
    const nextRequirements = normalizeRequirements(requirements, {}, houseConfig.floors)
    generateSmartLayout(nextRequirements, houseConfig.floors, houseConfig.floorHeight, houseConfig.totalSqFt)
  }

  const captureViewportPreview = useCallback(async (format: "image/png" | "image/jpeg" = "image/jpeg") => {
    setCaptureMode(true)
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    const canvas = viewportCardRef.current?.querySelector("canvas") ?? document.querySelector("canvas")
    if (!canvas) {
      setCaptureMode(false)
      return null
    }
    try {
      return format === "image/jpeg" ? canvas.toDataURL("image/jpeg", 0.82) : canvas.toDataURL("image/png")
    } catch {
      return null
    } finally {
      setCaptureMode(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    let cancelled = false
    const handle = window.setTimeout(async () => {
      if (generatingPreview || generatingTour || isRoomInteracting) return
      const snapshot = await captureViewportPreview("image/jpeg")
      if (!cancelled && snapshot) {
        setPreviewImageUrl(snapshot)
      }
    }, 900)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [
    captureViewportPreview,
    floorMaterial,
    generatingPreview,
    generatingTour,
    houseConfig.floorHeight,
    houseConfig.floors,
    houseConfig.rooms,
    houseConfig.totalSqFt,
    isRoomInteracting,
    lightingPreset,
    plotFacing,
    cameraPreset,
    requirements.includeBoundary,
    requirements.includeLandscapeGlass,
    wallMaterial,
  ])

  const generateSmartLayout = (
    overrideRequirements?: PlannerRequirements,
    overrideFloors?: number,
    overrideFloorHeight?: number,
    overrideTotalSqFt?: number,
    overrideRoomFloorPreferences?: RoomFloorPreferences | null,
    forceBestEffort = false,
  ) => {
    const floors = Math.round(clamp(overrideFloors ?? houseConfig.floors, 1, 4))
    const floorHeight = clamp(overrideFloorHeight ?? houseConfig.floorHeight, 8, 14)
    const useAutoCustomArea = plannerInputs.useCustomPlot && !(planningMode === "manual" && manualAreaOverrideEnabled)
    const derivedTotalSqFt = useAutoCustomArea
      ? plannerInputs.frontageFt * plannerInputs.depthFt
      : overrideTotalSqFt ?? houseConfig.totalSqFt
    const totalSqFt = clamp(derivedTotalSqFt, 200, 10000)
    const effectiveRoomFloorPreferences = overrideRoomFloorPreferences ?? roomFloorPreferences
    const req = overrideRequirements ?? requirements
    const normalizedReq = normalizeRequirements(req, {}, floors)
    setLastRequestedRequirements(normalizedReq)
    const feasiblePlan = enforceRealWorldFeasibility({
      totalSqFt,
      floors,
      requirements: normalizedReq,
    })
    setLastFeasibilityNotes(feasiblePlan.notes)
    const targetPlot = plannerInputs.useCustomPlot
      ? {
          length: clamp(plannerInputs.depthFt, 20, 120),
          width: clamp(plannerInputs.frontageFt, 12, 100),
        }
      : getPlotDimensions(feasiblePlan.totalSqFt)
    const feasibility = estimateFeasibility({
      plotLength: targetPlot.length,
      plotWidth: targetPlot.width,
      floors: feasiblePlan.floors,
      requirements: feasiblePlan.requirements,
      inputs: plannerInputs,
    })
    setFeasibilityReport(feasibility)
    const strictGuardEnabled = strictPlanningMode && !forceBestEffort
    if (strictGuardEnabled && feasibility.status === "not_feasible") {
      setAiStatus(`Feasibility failed: ${feasibility.reasons.slice(0, 2).join(" | ")}. Plan not generated.`)
      return
    }
    const rooms = createSmartLayout({
      floors: feasiblePlan.floors,
      floorHeight,
      plotLength: targetPlot.length,
      plotWidth: targetPlot.width,
      plotFacing,
      bedrooms: feasiblePlan.requirements.bedrooms,
      kitchens: feasiblePlan.requirements.kitchens,
      bathrooms: feasiblePlan.requirements.bathrooms,
      poojaRooms: feasiblePlan.requirements.poojaRooms,
      storeRooms: feasiblePlan.requirements.storeRooms,
      verandahRooms: feasiblePlan.requirements.verandahRooms,
      parkingSpaces: feasiblePlan.requirements.parkingSpaces,
      gardenAreas: feasiblePlan.requirements.gardenAreas,
      balconyRooms: feasiblePlan.requirements.balconyRooms,
      includeStairs: feasiblePlan.requirements.includeStairs,
      roomFloorPreferences: effectiveRoomFloorPreferences,
      planStyle: plannerInputs.planStyle,
    })
    if (rooms.length === 0) {
      setAiStatus("Could not generate a valid layout for current inputs. Try lower room counts or larger total area.")
      return
    }
    const validation = validateIndianLayout({
      rooms,
      floors: feasiblePlan.floors,
      plotLength: targetPlot.length,
      plotWidth: targetPlot.width,
      plotFacing,
      requirements: feasiblePlan.requirements,
    })
    setLayoutValidationReport(validation)
    if (!validation.valid && strictGuardEnabled) {
      setAiStatus(`2D validation failed: ${validation.issues.slice(0, 2).join(" | ")}. Plan not applied.`)
      return
    }

    setRequirements(feasiblePlan.requirements)
    const nextTotalSqFt = useAutoCustomArea ? targetPlot.length * targetPlot.width : feasiblePlan.totalSqFt
    setHouseConfig((prev) => ({ ...prev, totalSqFt: nextTotalSqFt, floors: feasiblePlan.floors, floorHeight, rooms }))
    setSelectedRoomId(rooms[0]?.id ?? null)
    setPlanStage("editable_plan")
    const baseMessage = `Smart layout generated for ${feasiblePlan.totalSqFt.toFixed(0)} sq ft across ${feasiblePlan.floors} floor(s).`
    const adjustmentText = feasiblePlan.notes.length > 0 ? ` Auto-adjusted: ${feasiblePlan.notes.slice(0, 2).join(" | ")}.` : ""
    const validationText =
      validation.issues.length > 0
        ? ` Rule warnings: ${validation.issues.slice(0, 2).join(" | ")}.`
        : validation.warnings.length > 0
          ? ` Checks: ${validation.warnings.slice(0, 2).join(" | ")}.`
          : " 2D validation passed."
    const feasibilityText =
      feasibility.status === "partially_feasible"
        ? ` Feasibility: partially feasible (${feasibility.reasons.slice(0, 1).join(" | ")}).`
        : feasibility.status === "not_feasible"
          ? ` Feasibility: not feasible (${feasibility.reasons.slice(0, 1).join(" | ")}).`
          : " Feasibility: feasible."
    if (feasiblePlan.notes.length > 0 || validation.issues.length > 0 || validation.warnings.length > 0 || feasibility.status !== "feasible") {
      setAiStatus(`${baseMessage}${adjustmentText}${validationText}${feasibilityText}`)
      return
    }
    setAiStatus(`${baseMessage}${validationText}${feasibilityText}`)
  }

  const handleSurveyImportFile = (file: File) => {
    const fileExt = (file.name.split(".").pop() ?? "").toUpperCase()
    const inferredPlot = inferPlotFromSurveyFileName(file.name)
    const notes: string[] = []
    if (inferredPlot) {
      setPlannerInputs((prev) => ({
        ...prev,
        useCustomPlot: true,
        frontageFt: inferredPlot.frontageFt,
        depthFt: inferredPlot.depthFt,
      }))
      setHouseConfig((prev) => ({
        ...prev,
        totalSqFt: Number((inferredPlot.frontageFt * inferredPlot.depthFt).toFixed(2)),
      }))
      notes.push(`Detected boundary: ${inferredPlot.frontageFt.toFixed(1)} ft x ${inferredPlot.depthFt.toFixed(1)} ft`)
    } else {
      notes.push("Boundary dimensions not detected from filename. Please verify dimensions manually.")
    }
    if (fileExt === "PDF") {
      notes.push("PDF imported. OCR/CAD layer parsing can be connected in next backend iteration.")
    } else if (fileExt === "DXF" || fileExt === "DWG" || fileExt === "CAD") {
      notes.push("CAD file imported. Geometry parser hook placeholder is now active.")
    } else {
      notes.push("Unknown survey format. Supported quick-win formats: DXF, DWG, CAD, PDF.")
    }

    const importedAt = new Date().toISOString()
    setSurveyImport({
      fileName: file.name,
      fileType: fileExt || "UNKNOWN",
      fileSizeKb: Number((file.size / 1024).toFixed(1)),
      importedAt,
      inferredPlot,
      notes,
    })
    setAiStatus(`Site survey imported (${file.name}).`)
    setProjectStatus("Site survey file attached.")
  }

  const buildPlanReportHtml = ({
    previewImage,
    floorPlanImage,
  }: {
    previewImage?: string | null
    floorPlanImage?: string | null
  }) => {
    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")

    const renderStatusPill = (status: string) => {
      const normalized = status.toLowerCase()
      const tone = normalized === "pass" ? "pass" : normalized === "review" ? "review" : "fail"
      return `<span class="pill ${tone}">${escapeHtml(status.toUpperCase())}</span>`
    }

    const requirementRows = [
      ["Bedrooms", requirements.bedrooms],
      ["Kitchens", requirements.kitchens],
      ["Bathrooms", requirements.bathrooms],
      ["Pooja Rooms", requirements.poojaRooms],
      ["Store Rooms", requirements.storeRooms],
      ["Verandah", requirements.verandahRooms],
      ["Parking", requirements.parkingSpaces],
      ["Garden", requirements.gardenAreas],
      ["Balcony", requirements.balconyRooms],
      ["Stairs", requirements.includeStairs ? "Included" : "Not included"],
      ["Boundary", requirements.includeBoundary ? "Included" : "Not included"],
      ["Landscape Glass", requirements.includeLandscapeGlass ? "Included" : "Not included"],
    ]
      .map(([label, value]) => `<tr><th>${escapeHtml(String(label))}</th><td>${escapeHtml(String(value))}</td></tr>`)
      .join("")

    const floorRows = floorsArray
      .map((floor) => {
        const floorRooms = houseConfig.rooms.filter((room) => room.floor === floor)
        const floorArea = floorRooms.reduce((sum, room) => sum + room.w * room.l, 0)
        const usable = floorStats.find((stats) => stats.floor === floor)?.usableArea ?? floorArea
        return `<tr><td>Floor ${floor + 1}</td><td>${floorRooms.length}</td><td style="text-align:right">${floorArea.toFixed(1)} sq ft</td><td style="text-align:right">${usable.toFixed(1)} sq ft</td></tr>`
      })
      .join("")

    const roomMixRows = (Object.keys(ROOM_PRESETS) as RoomType[])
      .map((roomType) => {
        const typedRooms = houseConfig.rooms.filter((room) => room.type === roomType)
        if (typedRooms.length === 0) return ""
        const totalArea = typedRooms.reduce((sum, room) => sum + room.w * room.l, 0)
        return `<tr><td>${escapeHtml(roomType)}</td><td>${typedRooms.length}</td><td style="text-align:right">${totalArea.toFixed(1)} sq ft</td></tr>`
      })
      .filter(Boolean)
      .join("")

    const municipalityRows = municipalityCompliance.checks
      .map((check) => {
        return `<tr>
          <td>${escapeHtml(check.label)}</td>
          <td>${renderStatusPill(check.status)}</td>
          <td>${escapeHtml(check.detail)}</td>
          <td>${escapeHtml(check.fix)}</td>
        </tr>`
      })
      .join("")

    const structuralRows = structuralPrecheck.checks
      .map((check) => {
        return `<tr>
          <td>${escapeHtml(check.label)}</td>
          <td>${renderStatusPill(check.status)}</td>
          <td>${escapeHtml(check.detail)}</td>
        </tr>`
      })
      .join("")

    const codeRows = complianceReport.checks
      .map((check) => {
        return `<tr>
          <td>${escapeHtml(check.label)}</td>
          <td>${renderStatusPill(check.status)}</td>
          <td>${escapeHtml(check.detail)}</td>
        </tr>`
      })
      .join("")

    const surveyRows = surveyImport
      ? `
          <tr><th>File</th><td>${escapeHtml(surveyImport.fileName)}</td></tr>
          <tr><th>Type</th><td>${escapeHtml(surveyImport.fileType)}</td></tr>
          <tr><th>Size</th><td>${surveyImport.fileSizeKb.toFixed(1)} KB</td></tr>
          <tr><th>Imported At</th><td>${new Date(surveyImport.importedAt).toLocaleString("en-IN")}</td></tr>
          <tr><th>Notes</th><td>${escapeHtml(surveyImport.notes.join(" | "))}</td></tr>
        `
      : "<tr><td colspan='2'>No survey file attached.</td></tr>"

    const ratesUpdatedAt = ratesAsOf ? new Date(ratesAsOf).toLocaleString("en-IN") : "Not available"
    const reportGeneratedAt = new Date().toLocaleString("en-IN")

    return `
      <html>
      <head>
        <title>AI Architect Planning Report</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; padding: 20px; background: #f3f6fb; }
          .sheet { max-width: 1260px; margin: 0 auto; border: 1px solid #dbe4f0; border-radius: 12px; background: #fff; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08); overflow: hidden; }
          .head { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: linear-gradient(96deg, #e6f0ff 0%, #f8fbff 60%, #ffffff 100%); }
          .head h1 { margin: 0; font-size: 27px; letter-spacing: -0.3px; }
          .meta { margin-top: 8px; color: #334155; font-size: 12.5px; line-height: 1.45; }
          .content { padding: 18px; }
          h2 { margin: 0 0 8px 0; font-size: 17px; }
          .muted { color: #475569; font-size: 12px; margin-bottom: 10px; }
          .section { border: 1px solid #d9e2ef; border-radius: 10px; background: #fff; padding: 12px; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .grid-three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
          .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fbff; }
          .kpi .label { color: #475569; font-size: 12px; margin-bottom: 4px; }
          .kpi .value { color: #0f172a; font-size: 18px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #d7e1ee; padding: 7px; font-size: 12.5px; text-align: left; vertical-align: top; }
          th { background: #f1f5f9; font-weight: 700; }
          .pill { display: inline-block; border-radius: 999px; padding: 2px 7px; font-size: 11px; font-weight: 700; letter-spacing: 0.02em; }
          .pill.pass { background: #dcfce7; color: #14532d; border: 1px solid #86efac; }
          .pill.review { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
          .pill.fail { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
          .span-2 { grid-column: span 2; }
          .page-break { break-before: page; page-break-before: always; }
          img { background: #f8fafc; }
          @media print {
            body { background: #fff; padding: 0; }
            .sheet { border: none; border-radius: 0; box-shadow: none; max-width: none; }
            .content { padding: 10px 0; }
            .section { border-color: #cbd5e1; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="head">
            <h1>BricksBazar Project Planning Report</h1>
            <div class="meta">
              <div><strong>Project:</strong> ${escapeHtml(currentProjectName || "Untitled Project")} | <strong>Generated:</strong> ${reportGeneratedAt}</div>
              <div><strong>Mode:</strong> ${escapeHtml(planningMode === "manual" ? "Manual Planner" : "AI Prompt Planner")} | <strong>Phase:</strong> ${escapeHtml(planStage)}</div>
              <div><strong>Plot:</strong> ${plot.length.toFixed(1)} ft x ${plot.width.toFixed(1)} ft | <strong>Facing:</strong> ${escapeHtml(plotFacing)} | <strong>Municipality:</strong> ${escapeHtml(selectedMunicipalityRule.label)}</div>
            </div>
          </div>
          <div class="content">
            <div class="grid">
              <div class="section">
                <h2>Project Inputs</h2>
                <table>
                  <tbody>${requirementRows}</tbody>
                </table>
              </div>
              <div class="section">
                <h2>Cost Snapshot</h2>
                <table>
                  <tbody>
                    <tr><th>Market Region</th><td>${escapeHtml(selectedMarketProfile.label)}</td></tr>
                    <tr><th>Rates As Of</th><td>${escapeHtml(ratesUpdatedAt)}</td></tr>
                    <tr><th>Material Cost</th><td>${formatInr(geoCostEstimate.materials)}</td></tr>
                    <tr><th>Labor Cost</th><td>${formatInr(geoCostEstimate.labor)}</td></tr>
                    <tr><th>Contingency (15%)</th><td>${formatInr(geoCostEstimate.contingency)}</td></tr>
                    <tr><th>Total Estimate</th><td><strong>${formatInr(geoCostEstimate.total)}</strong></td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="grid-three">
              <div class="kpi"><div class="label">Plot Area</div><div class="value">${(plot.length * plot.width).toFixed(1)} sq ft</div></div>
              <div class="kpi"><div class="label">Built-Up Area</div><div class="value">${totalStats.builtUpArea.toFixed(1)} sq ft</div></div>
              <div class="kpi"><div class="label">Usable Area</div><div class="value">${totalStats.usable.toFixed(1)} sq ft</div></div>
              <div class="kpi"><div class="label">Floors</div><div class="value">${houseConfig.floors}</div></div>
              <div class="kpi"><div class="label">Total Rooms</div><div class="value">${houseConfig.rooms.length}</div></div>
              <div class="kpi"><div class="label">Vastu Score</div><div class="value">${vastuEnabled ? vastuReport.score : "Disabled"}</div></div>
            </div>

            <div class="grid" style="margin-top: 12px;">
              <div class="section">
                <h2>Floor Distribution</h2>
                <table>
                  <thead><tr><th>Floor</th><th>Rooms</th><th style="text-align:right">Total Area</th><th style="text-align:right">Usable Area</th></tr></thead>
                  <tbody>${floorRows || "<tr><td colspan='4'>No floor data available.</td></tr>"}</tbody>
                </table>
              </div>
              <div class="section">
                <h2>Room Mix</h2>
                <table>
                  <thead><tr><th>Room Type</th><th>Count</th><th style="text-align:right">Area</th></tr></thead>
                  <tbody>${roomMixRows || "<tr><td colspan='3'>No room mix data available.</td></tr>"}</tbody>
                </table>
              </div>
            </div>

            <div class="section page-break">
              <h2>Municipality Compliance: ${municipalityCompliance.score}/100 ${renderStatusPill(municipalityCompliance.status)}</h2>
              <p class="muted">${escapeHtml(selectedMunicipalityRule.authority)} | Rules loaded: ${new Date(complianceRulesAsOf).toLocaleString("en-IN")}</p>
              <table>
                <tbody>
                  <tr><th>FSI</th><td>${municipalityCompliance.metrics.fsi.toFixed(2)} (Max ${selectedMunicipalityRule.maxFsi.toFixed(2)})</td><th>Coverage</th><td>${municipalityCompliance.metrics.coveragePercent.toFixed(2)}% (Max ${selectedMunicipalityRule.maxCoveragePercent.toFixed(2)}%)</td></tr>
                  <tr><th>Height</th><td>${municipalityCompliance.metrics.buildingHeightFt.toFixed(1)} ft (Max ${selectedMunicipalityRule.maxHeightFt.toFixed(1)} ft)</td><th>Setback F/R/S</th><td>${municipalityCompliance.metrics.frontSetbackFt.toFixed(1)} / ${municipalityCompliance.metrics.rearSetbackFt.toFixed(1)} / ${municipalityCompliance.metrics.sideSetbackFt.toFixed(1)} ft</td></tr>
                </tbody>
              </table>
              <table>
                <thead><tr><th>Check</th><th>Status</th><th>Detail</th><th>Fix</th></tr></thead>
                <tbody>${municipalityRows}</tbody>
              </table>
            </div>

            <div class="grid">
              <div class="section">
                <h2>Structural Precheck: ${structuralPrecheck.score}/100 ${renderStatusPill(structuralPrecheck.status)}</h2>
                <table>
                  <tbody>
                    <tr><th>Max Span</th><td>${structuralPrecheck.maxSpanFt.toFixed(1)} ft</td></tr>
                    <tr><th>Design Load</th><td>${structuralPrecheck.designLoadkNPerSqM.toFixed(2)} kN/m2</td></tr>
                    <tr><th>Beam Depth</th><td>${structuralPrecheck.suggestedBeamDepthM.toFixed(2)} m</td></tr>
                    <tr><th>Column Size</th><td>${structuralPrecheck.suggestedColumnSizeMm} mm</td></tr>
                  </tbody>
                </table>
                <table>
                  <thead><tr><th>Check</th><th>Status</th><th>Detail</th></tr></thead>
                  <tbody>${structuralRows}</tbody>
                </table>
              </div>
              <div class="section">
                <h2>Code Compliance: ${complianceReport.score}/100 ${renderStatusPill(complianceReport.status)}</h2>
                <table>
                  <thead><tr><th>Check</th><th>Status</th><th>Detail</th></tr></thead>
                  <tbody>${codeRows}</tbody>
                </table>
              </div>
            </div>

            <div class="grid">
              <div class="section">
                <h2>Bill Of Quantities</h2>
                <table>
                  <tbody>
                    <tr><th>Bricks</th><td>${boqTotals.bricks.toLocaleString("en-IN")} pcs</td><td style="text-align:right">${formatInr(boqCost.bricksCost)}</td></tr>
                    <tr><th>Cement</th><td>${boqTotals.cementBags.toLocaleString("en-IN")} bags</td><td style="text-align:right">${formatInr(boqCost.cementCost)}</td></tr>
                    <tr><th>Sand</th><td>${estimatedSandTons.toFixed(2)} tons</td><td style="text-align:right">${formatInr(boqCost.sandCost)}</td></tr>
                    <tr><th>Steel</th><td>${estimatedSteelTons.toFixed(2)} tons</td><td style="text-align:right">${formatInr(boqCost.steelCost)}</td></tr>
                    <tr><th>Total Materials</th><td colspan="2" style="text-align:right"><strong>${formatInr(boqCost.total)}</strong></td></tr>
                  </tbody>
                </table>
              </div>
              <div class="section">
                <h2>Survey Import</h2>
                <table>
                  <tbody>${surveyRows}</tbody>
                </table>
              </div>
            </div>

            <div class="grid" style="margin-top: 12px;">
              <div class="section">
                <h2>3D Snapshot</h2>
                ${
                  previewImage
                    ? `<img src="${previewImage}" alt="3D preview" style="width:100%;max-height:420px;object-fit:contain;border:1px solid #cbd5e1;border-radius:8px;" />`
                    : "<p class='muted'>No 3D snapshot available.</p>"
                }
              </div>
              <div class="section">
                <h2>2D Floor Map</h2>
                ${
                  floorPlanImage
                    ? `<img src="${floorPlanImage}" alt="2D map" style="width:100%;max-height:420px;object-fit:contain;border:1px solid #cbd5e1;border-radius:8px;" />`
                    : "<p class='muted'>No floor map available.</p>"
                }
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  const openPlanReportWindow = async () => {
    if (typeof window === "undefined") return null
    const previewSnapshot = (await captureViewportPreview("image/jpeg")) ?? previewImageUrl ?? null
    const reportWindow = window.open("", "_blank", "width=1500,height=950")
    if (!reportWindow) return null
    reportWindow.document.write(
      buildPlanReportHtml({
        previewImage: previewSnapshot,
        floorPlanImage: effectiveFloorMapImageUrl,
      }),
    )
    reportWindow.document.close()
    reportWindow.focus()
    return reportWindow
  }

  const downloadPlanPdf = async () => {
    const reportWindow = await openPlanReportWindow()
    if (!reportWindow) return
    const pendingImages = Array.from(reportWindow.document.images ?? [])
    await Promise.all(
      pendingImages.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve()
              return
            }
            const done = () => resolve()
            image.addEventListener("load", done, { once: true })
            image.addEventListener("error", done, { once: true })
            reportWindow.setTimeout(done, 1500)
          }),
      ),
    )
    await new Promise((resolve) => reportWindow.setTimeout(resolve, 120))
    if (reportWindow.closed) return
    reportWindow.focus()
    reportWindow.print()
    setProjectStatus("Detailed report ready. Use 'Save as PDF' in the print dialog.")
  }

  const persistProject = async () => {
    setSavingProject(true)
    setProjectStatus("")
    const previewSnapshot = (await captureViewportPreview("image/jpeg")) ?? previewImageUrl ?? null
    const floorPlanSnapshot = effectiveFloorMapImageUrl
    const payload: StoredBlueprintPayload = {
      houseConfig,
      requirements,
      xray,
      vastuEnabled,
      plotFacing,
      wallMaterial,
      floorMaterial,
      cameraPreset,
      lightingPreset,
      civilInputs,
      plannerInputs,
      strictPlanningMode,
      planningMode,
      planStage,
      planLocked,
      savedPreviewImage: previewSnapshot,
      savedFloorPlanImage: floorPlanSnapshot,
      savedAt: new Date().toISOString(),
    }
    const calculatedMaterials = {
      marketRatesBase: marketRates,
      marketRatesEffective: effectiveMarketRates,
      marketRegion: selectedMarketProfile,
      ratesAsOf,
      boqTotals,
      boqCost,
      estimatedSteelTons,
      geoCostEstimate,
      floorWiseCost,
      totalStats,
      plumbingBonus,
      municipality: selectedMunicipalityRule,
      municipalityCompliance,
      surveyImport,
      vastuScore: vastuEnabled ? vastuReport.score : null,
    }

    try {
      if (currentProjectId) {
        const response = await fetch(`/api/projects/${currentProjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: currentProjectName.trim() || "Untitled Project",
            jsonLayout: payload,
            calculatedMaterials,
          }),
        })
        const data = (await response.json()) as ProjectResponse & { error?: string }
        if (!response.ok || !data.project) {
          throw new Error(data.error || "Could not update project")
        }
        setCurrentProjectName(data.project.name)
        setCurrentProjectOwner(data.project.user)
        if (previewSnapshot) setPreviewImageUrl(previewSnapshot)
        setFloorMapImageUrl(floorPlanSnapshot)
        setProjectStatus("Project updated.")
        return
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentProjectName.trim() || "Untitled Project",
          jsonLayout: payload,
          calculatedMaterials,
        }),
      })
      const data = (await response.json()) as ProjectResponse & { error?: string }
      if (!response.ok || !data.project) {
        throw new Error(data.error || "Could not save project")
      }

      setCurrentProjectId(data.project.id)
      setCurrentProjectName(data.project.name)
      setCurrentProjectOwner(data.project.user)
      if (previewSnapshot) setPreviewImageUrl(previewSnapshot)
      setFloorMapImageUrl(floorPlanSnapshot)
      setProjectStatus("Project saved.")
    } catch (error) {
      setProjectStatus(error instanceof Error ? error.message : "Could not save project.")
    } finally {
      setSavingProject(false)
    }
  }

  const generateHdPreview = async () => {
    if (planningMode === "prompt" && !canGeneratePromptPreview) {
      setAiStatus(previewGenerationBlockedMessage)
      return
    }
    try {
      setGeneratingPreview(true)
      setAiStatus("Generating photorealistic preview...")
      const effectivePreviewPrompt = previewPrompt.trim() || wizardInput.trim()
      if (!effectivePreviewPrompt) {
        const localPreview = await captureViewportPreview("image/png")
        if (localPreview) {
          setPreviewImageUrl(localPreview)
          setAiStatus("HD preview generated from current 3D viewport. Add prompt for AI render.")
          return
        }
      }
      if (effectivePreviewPrompt && !previewPrompt.trim()) {
        setPreviewPrompt(effectivePreviewPrompt)
      }
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 35000)
      let response: Response
      try {
        response = await fetch("/api/blueprint/generate-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({
            prompt: effectivePreviewPrompt,
            quality: renderQualityType,
            layout: aiLayoutContext,
          }),
        })
      } finally {
        clearTimeout(timeout)
      }

      let data: { imageUrl?: string; error?: string; message?: string } = {}
      try {
        data = (await response.json()) as { imageUrl?: string; error?: string; message?: string }
      } catch {
        data = { error: "Preview service returned an invalid response." }
      }
      if (response.ok && data.imageUrl) {
        setPreviewImageUrl(data.imageUrl)
        if (planningMode === "prompt") {
          setPromptPipelineStage("preview_ready", {
            criticalConstraintsPass: true,
            previewReady: true,
            blockingReasons: [],
          })
        }
        setAiStatus(data.message || "HD preview generated.")
        return
      }

      const localPreview = await captureViewportPreview("image/png")
      if (localPreview) {
        setPreviewImageUrl(localPreview)
        if (planningMode === "prompt") {
          setPromptPipelineStage("preview_ready", {
            criticalConstraintsPass: true,
            previewReady: true,
            blockingReasons: [],
          })
        }
        setAiStatus(`${data.error || "AI preview unavailable."} Showing local HD viewport snapshot.`)
        return
      }

      setPreviewImageUrl("/placeholder.jpg")
      throw new Error(data.error || "Failed to generate preview")
    } catch (error) {
      const localPreview = await captureViewportPreview("image/png")
      if (localPreview) {
        setPreviewImageUrl(localPreview)
        if (planningMode === "prompt") {
          setPromptPipelineStage("preview_ready", {
            criticalConstraintsPass: true,
            previewReady: true,
            blockingReasons: [],
          })
        }
        setAiStatus(`${error instanceof Error ? error.message : "Preview generation failed."} Showing local viewport snapshot.`)
      } else {
        if (!previewImageUrl) {
          setPreviewImageUrl("/placeholder.jpg")
        }
        setAiStatus(error instanceof Error ? error.message : "Preview generation failed.")
      }
    } finally {
      setGeneratingPreview(false)
    }
  }

  const finalizePlan = async () => {
    if (planLocked) {
      setAiStatus("Plan already locked. Use Unlock Editing to continue changes.")
      return
    }
    if (collidingRoomIds.size > 0) {
      setAiStatus("Resolve overlapping rooms before final lock.")
      return
    }
    if (!layoutValidationReport?.valid) {
      setAiStatus("2D validation is failing. Fix issues before final lock.")
      return
    }
    setPlanLocked(true)
    setPlanStage("final_locked")
    setProjectStatus("Final plan locked. Generating 3D preview and estimate snapshot...")
    await generateHdPreview()
  }

  const unlockPlanEditing = () => {
    setPlanLocked(false)
    setPlanStage("editable_plan")
    setProjectStatus("Plan unlocked for edits.")
  }

  const generateWalkthrough = async () => {
    try {
      setGeneratingTour(true)
      setAiStatus("Preparing walkthrough script and camera path...")
      const response = await fetch("/api/blueprint/generate-tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cue: tourCue.trim(),
          quality: renderQualityType,
          layout: aiLayoutContext,
        }),
      })

      const data = (await response.json()) as { videoUrl?: string | null; message?: string; error?: string }
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate walkthrough")
      }

      setTourVideoUrl(data.videoUrl || null)
      setAiStatus(data.message || "Walkthrough request submitted.")
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : "Walkthrough generation failed.")
    } finally {
      setGeneratingTour(false)
    }
  }

  const autoFixVastuLayout = () => {
    const currentRooms = houseConfig.rooms
    if (currentRooms.length === 0) {
      setAiStatus("No rooms available for Vastu auto-fix.")
      return
    }
    const byType = (type: RoomType) => currentRooms.filter((room) => room.type === type).length
    const fixedRequirements = {
      bedrooms: byType("Bedroom"),
      kitchens: byType("Kitchen"),
      bathrooms: byType("Bathroom"),
      poojaRooms: byType("Pooja"),
      storeRooms: byType("Store"),
      verandahRooms: byType("Verandah"),
      parkingSpaces: byType("Parking"),
      gardenAreas: byType("Garden"),
      balconyRooms: byType("Balcony"),
      includeStairs: byType("Stairs") > 0,
      includeBoundary: requirements.includeBoundary,
      includeLandscapeGlass: requirements.includeLandscapeGlass,
    }

    const vastuAdjustedRooms = autoArrangeRoomsByVastu({
      rooms: currentRooms,
      plotLength: plot.length,
      plotWidth: plot.width,
      plotFacing,
    })

    const toEngineering = (rooms: RoomConfig[]): EngineeringRoom[] =>
      rooms.map((room) => ({
        id: room.id,
        type: room.type,
        floor: room.floor,
        x: room.x,
        z: room.z,
        w: room.w,
        l: room.l,
        h: room.h,
        hasWindow: room.hasWindow,
      }))
    const beforeScore = evaluateVastuCompliance(toEngineering(currentRooms), plot.length, plot.width, true, plotFacing).score
    const adjustedScore = evaluateVastuCompliance(toEngineering(vastuAdjustedRooms), plot.length, plot.width, true, plotFacing).score

    const fallbackRooms = createSmartLayout({
      floors: houseConfig.floors,
      floorHeight: houseConfig.floorHeight,
      plotLength: plot.length,
      plotWidth: plot.width,
      plotFacing,
      bedrooms: fixedRequirements.bedrooms,
      kitchens: fixedRequirements.kitchens,
      bathrooms: fixedRequirements.bathrooms,
      poojaRooms: fixedRequirements.poojaRooms,
      storeRooms: fixedRequirements.storeRooms,
      verandahRooms: fixedRequirements.verandahRooms,
      parkingSpaces: fixedRequirements.parkingSpaces,
      gardenAreas: fixedRequirements.gardenAreas,
      balconyRooms: fixedRequirements.balconyRooms,
      includeStairs: fixedRequirements.includeStairs,
      roomFloorPreferences,
      planStyle: plannerInputs.planStyle,
    })
    const fallbackScore = evaluateVastuCompliance(toEngineering(fallbackRooms), plot.length, plot.width, true, plotFacing).score

    const rooms =
      adjustedScore >= fallbackScore && adjustedScore >= beforeScore
        ? vastuAdjustedRooms
        : fallbackScore >= beforeScore
          ? fallbackRooms
          : currentRooms

    const byTypeNext = (type: RoomType) => rooms.filter((room) => room.type === type).length
    const nextRequirements = {
      bedrooms: byTypeNext("Bedroom"),
      kitchens: byTypeNext("Kitchen"),
      bathrooms: byTypeNext("Bathroom"),
      poojaRooms: byTypeNext("Pooja"),
      storeRooms: byTypeNext("Store"),
      verandahRooms: byTypeNext("Verandah"),
      parkingSpaces: byTypeNext("Parking"),
      gardenAreas: byTypeNext("Garden"),
      balconyRooms: byTypeNext("Balcony"),
      includeStairs: byTypeNext("Stairs") > 0,
      includeBoundary: requirements.includeBoundary,
      includeLandscapeGlass: requirements.includeLandscapeGlass,
    }

    setVastuEnabled(true)
    setRequirements((prev) => ({ ...prev, ...nextRequirements }))
    setHouseConfig((prev) => ({ ...prev, rooms }))
    setSelectedRoomId(rooms[0]?.id ?? null)
    const afterScore = evaluateVastuCompliance(toEngineering(rooms), plot.length, plot.width, true, plotFacing).score
    setAiStatus(`Vastu auto-fix applied. Score improved from ${beforeScore} to ${afterScore}.`)
  }

  const buildPromptSuggestions = (basePatch: WizardPatch, floorPreferences: RoomFloorPreferences): PromptPlanSuggestion[] => {
    const inferredFloors = inferFloorCountFromPreferences(floorPreferences)
    const requestedFloors = Math.round(clamp(Math.max(basePatch.floors ?? houseConfig.floors, inferredFloors ?? 1), 1, 4))
    const requestedTotalSqFt = clamp(basePatch.totalSqFt ?? houseConfig.totalSqFt, 200, 10000)
    const promptBaseline = buildPromptBaselineRequirements(basePatch, requestedFloors)

    const createSuggestion = ({
      id,
      label,
      planStyle,
      patchOverride,
    }: {
      id: PromptPlanSuggestion["id"]
      label: string
      planStyle: PlanStyle
      patchOverride?: WizardPatch
    }) => {
      const patched: WizardPatch = {
        ...basePatch,
        ...(patchOverride ?? {}),
        floors: patchOverride?.floors ?? requestedFloors,
        totalSqFt: patchOverride?.totalSqFt ?? requestedTotalSqFt,
      }
      const suggestedFloors = Math.round(clamp(Math.max(patched.floors ?? requestedFloors, inferredFloors ?? 1), 1, 4))
      const suggestedTotalSqFt = clamp(patched.totalSqFt ?? requestedTotalSqFt, 200, 10000)
      const suggestedRequirements = normalizeRequirements(promptBaseline, patched, suggestedFloors)
      const targetPlot = plannerInputs.useCustomPlot
        ? {
            length: clamp(plannerInputs.depthFt, 20, 120),
            width: clamp(plannerInputs.frontageFt, 12, 100),
          }
        : getPlotDimensions(suggestedTotalSqFt)
      const feasibility = estimateFeasibility({
        plotLength: targetPlot.length,
        plotWidth: targetPlot.width,
        floors: suggestedFloors,
        requirements: suggestedRequirements,
        inputs: { ...plannerInputs, planStyle },
      })
      const normalizedFeasibility = normalizeSuggestionFeasibility(feasibility)
      const summary = [
        `${suggestedRequirements.bedrooms} bed, ${suggestedRequirements.kitchens} kitchen, ${suggestedRequirements.bathrooms} bath`,
        `${suggestedFloors} floor | ${Math.round(suggestedTotalSqFt)} sqft`,
        `Status: ${normalizedFeasibility.replaceAll("_", " ")}`,
      ].join(" | ")
      const fullPatch: WizardPatch = {
        ...patched,
        floors: suggestedFloors,
        totalSqFt: suggestedTotalSqFt,
        bedrooms: suggestedRequirements.bedrooms,
        kitchens: suggestedRequirements.kitchens,
        bathrooms: suggestedRequirements.bathrooms,
        poojaRooms: suggestedRequirements.poojaRooms,
        storeRooms: suggestedRequirements.storeRooms,
        verandahRooms: suggestedRequirements.verandahRooms,
        parkingSpaces: suggestedRequirements.parkingSpaces,
        gardenAreas: suggestedRequirements.gardenAreas,
        balconyRooms: suggestedRequirements.balconyRooms,
        includeStairs: suggestedRequirements.includeStairs,
        includeBoundary: suggestedRequirements.includeBoundary,
        includeLandscapeGlass: suggestedRequirements.includeLandscapeGlass,
      }
      return {
        id,
        label,
        summary,
        planStyle,
        patch: fullPatch,
        floorPreferences,
        feasibility: normalizedFeasibility,
        feasibilityNotes: [...feasibility.reasons, ...feasibility.suggestions].slice(0, 3),
      }
    }

    const compactFloors = requestedFloors < 2 && requestedTotalSqFt <= 700 ? 2 : requestedFloors
    const promptExactSuggestion = createSuggestion({
      id: "prompt_exact",
      label: "Prompt Exact",
      planStyle: plannerInputs.planStyle,
    })

    const compactSuggestion = createSuggestion({
      id: "compact",
      label: "Compact Fit",
      planStyle: "compact",
      patchOverride: {
        floors: compactFloors,
        gardenAreas: 0,
        verandahRooms: 0,
        balconyRooms: compactFloors > 1 ? Math.min(basePatch.balconyRooms ?? requirements.balconyRooms, 1) : 0,
      },
    })

    const balancedSuggestion = createSuggestion({
      id: "balanced",
      label: "Balanced Family",
      planStyle: "balanced",
    })

    const parkingFloors = requestedFloors < 2 && requestedTotalSqFt <= 900 ? 2 : requestedFloors
    const parkingFirstSuggestion = createSuggestion({
      id: "parking_first",
      label: "Parking First",
      planStyle: "balanced",
      patchOverride: {
        floors: parkingFloors,
        parkingSpaces: Math.max(1, basePatch.parkingSpaces ?? requirements.parkingSpaces),
        includeBoundary: true,
      },
    })

    return [promptExactSuggestion, balancedSuggestion, compactSuggestion, parkingFirstSuggestion]
  }

  const generateAllFloorLayouts = (
    suggestion: AISuggestion,
    floorPrefsOverride?: RoomFloorPreferences | null,
    forceBestEffortOverride?: boolean,
  ): GeneratedLayout | null => {
    const effectiveFloorPrefs = floorPrefsOverride ?? suggestion.floorPreferences
    const prefsFloorCount = inferFloorCountFromPreferences(effectiveFloorPrefs)
    const selectedFloors = Math.round(clamp(Math.max(suggestion.patch.floors ?? houseConfig.floors, prefsFloorCount ?? 1), 1, 4))
    const selectedTotalSqFt = clamp(suggestion.patch.totalSqFt ?? houseConfig.totalSqFt, 200, 10000)
    const selectedRequirements = normalizeRequirements(requirements, suggestion.patch, selectedFloors)
    const feasiblePlan = enforceRealWorldFeasibility({
      totalSqFt: selectedTotalSqFt,
      floors: selectedFloors,
      requirements: selectedRequirements,
    })
    const targetPlot = plannerInputs.useCustomPlot
      ? {
          length: clamp(plannerInputs.depthFt, 20, 120),
          width: clamp(plannerInputs.frontageFt, 12, 100),
        }
      : getPlotDimensions(feasiblePlan.totalSqFt)
    const feasibility = estimateFeasibility({
      plotLength: targetPlot.length,
      plotWidth: targetPlot.width,
      floors: feasiblePlan.floors,
      requirements: feasiblePlan.requirements,
      inputs: { ...plannerInputs, planStyle: suggestion.planStyle },
    })
    const forceBestEffort = forceBestEffortOverride ?? feasibility.status === "not_feasible"
    if (strictPlanningMode && !forceBestEffort && feasibility.status === "not_feasible") {
      setAiStatus(`Feasibility failed: ${feasibility.reasons.slice(0, 2).join(" | ")}.`)
      return null
    }
    const rooms = createSmartLayout({
      floors: feasiblePlan.floors,
      floorHeight: houseConfig.floorHeight,
      plotLength: targetPlot.length,
      plotWidth: targetPlot.width,
      plotFacing,
      bedrooms: feasiblePlan.requirements.bedrooms,
      kitchens: feasiblePlan.requirements.kitchens,
      bathrooms: feasiblePlan.requirements.bathrooms,
      poojaRooms: feasiblePlan.requirements.poojaRooms,
      storeRooms: feasiblePlan.requirements.storeRooms,
      verandahRooms: feasiblePlan.requirements.verandahRooms,
      parkingSpaces: feasiblePlan.requirements.parkingSpaces,
      gardenAreas: feasiblePlan.requirements.gardenAreas,
      balconyRooms: feasiblePlan.requirements.balconyRooms,
      includeStairs: feasiblePlan.requirements.includeStairs,
      roomFloorPreferences: effectiveFloorPrefs,
      planStyle: suggestion.planStyle,
    })
    if (rooms.length === 0) {
      setAiStatus("Could not generate a valid layout for selected suggestion.")
      return null
    }
    const validation = validateIndianLayout({
      rooms,
      floors: feasiblePlan.floors,
      plotLength: targetPlot.length,
      plotWidth: targetPlot.width,
      plotFacing,
      requirements: feasiblePlan.requirements,
    })
    if (!validation.valid && strictPlanningMode && !forceBestEffort) {
      setAiStatus(`2D validation failed: ${validation.issues.slice(0, 2).join(" | ")}.`)
      return null
    }
    return {
      rooms,
      requirements: feasiblePlan.requirements,
      floors: feasiblePlan.floors,
      floorHeight: houseConfig.floorHeight,
      totalSqFt:
        plannerInputs.useCustomPlot && !(planningMode === "manual" && manualAreaOverrideEnabled)
          ? targetPlot.length * targetPlot.width
          : feasiblePlan.totalSqFt,
      floorPreferences: effectiveFloorPrefs,
      planStyle: suggestion.planStyle,
      feasibility,
      validation,
      forceBestEffort,
    }
  }
  const applySelectedPlan = () => {
    if (!ensureUnlockedForEdit("apply selected plan")) return
    if (planningMode !== "prompt") return
    if (!promptPipelineState.promptAnalyzed && wizardSuggestions.length === 0) {
      setAiStatus("Analyze prompt first, then apply a suggestion.")
      return
    }
    const selected = wizardSuggestions.find((suggestion) => suggestion.id === selectedWizardSuggestionId) ?? wizardSuggestions[0]
    if (!selected) {
      setAiStatus("No prompt suggestion available. Analyze a prompt first.")
      return
    }
    const applyingStaleSuggestion = promptDraftDirty
    let layout = generateAllFloorLayouts(selected)
    if (!layout) {
      layout = generateAllFloorLayouts(selected, undefined, true)
      if (!layout) {
        setAiStatus("Selected plan apply nahi ho paaya. Prompt re-analyze karke try karo.")
        return
      }
      setAiStatus("Strict rule me plan block tha. Best-effort mode me selected plan apply kiya gaya.")
    }
    const effectiveConstraints: PromptConstraintBundle = {
      ...promptConstraints,
      lockedRooms: mergeFloorPreferences(selected.floorPreferences, promptConstraints.lockedRooms),
    }
    let effectiveLayout = layout
    let effectiveFloorPreferences = layout.floorPreferences
    let roomMatrixReport = calculateRoomMatrix(selected.patch, effectiveLayout.rooms)
    let constraintReport = validateConstraints(effectiveLayout.rooms, effectiveConstraints, selected.patch)
    let autoMatchApplied = false
    if (roomMatrixReport.mismatchCount > 0 || !constraintReport.criticalPass) {
      const autoMatched = buildPromptAutoMatchResult(selected)
      if (autoMatched) {
        effectiveLayout = autoMatched.layout
        effectiveFloorPreferences = autoMatched.floorPreferences
        roomMatrixReport = autoMatched.roomMatrixReport
        constraintReport = autoMatched.constraintReport
        autoMatchApplied = true
      }
    }
    if (selected.planStyle !== plannerInputs.planStyle) {
      setPlannerInputs((prev) => ({ ...prev, planStyle: selected.planStyle, parkingRequired: effectiveLayout.requirements.parkingSpaces > 0 }))
    } else {
      setPlannerInputs((prev) => ({ ...prev, parkingRequired: effectiveLayout.requirements.parkingSpaces > 0 }))
    }
    setPromptPipelineStage("plan_applied", {
      criticalConstraintsPass: false,
      previewReady: false,
      blockingReasons: ["Room matrix and hard constraints are being validated."],
    })
    setPromptMismatchReviewed(false)
    setLastPromptPatch(selected.patch)
    setPromptConstraints(effectiveConstraints)
    setRoomFloorPreferences(effectiveFloorPreferences)
    setRequirements(effectiveLayout.requirements)
    setLastRequestedRequirements(effectiveLayout.requirements)
    setLastFeasibilityNotes(effectiveLayout.feasibility.reasons)
    setFeasibilityReport(effectiveLayout.feasibility)
    setLayoutValidationReport(effectiveLayout.validation)
    setHouseConfig((prev) => ({
      ...prev,
      totalSqFt: effectiveLayout.totalSqFt,
      floors: effectiveLayout.floors,
      floorHeight: effectiveLayout.floorHeight,
      rooms: effectiveLayout.rooms,
    }))
    setSelectedRoomId(effectiveLayout.rooms[0]?.id ?? null)
    setPlanStage("editable_plan")
    setPromptPipelineStage("matrix_ready", {
      criticalConstraintsPass: false,
      previewReady: false,
      blockingReasons: roomMatrixReport.mismatchCount > 0 ? ["Room matrix mismatch found. Auto-match attempted."] : ["Running hard constraints check."],
    })
    const autoPreviewReady = roomMatrixReport.mismatchCount === 0 && constraintReport.criticalPass
    setPromptMismatchReviewed(autoPreviewReady)
    setPromptPipelineStage(autoPreviewReady ? "preview_ready" : "constraints_ready", {
      criticalConstraintsPass: constraintReport.criticalPass,
      previewReady: autoPreviewReady,
      blockingReasons: autoPreviewReady
        ? []
        : constraintReport.criticalPass
          ? ["Auto-match already attempted. Use Auto-Match Prompt Layout again to finalize prompt-to-3D alignment."]
          : constraintReport.blockingReasons,
    })
    setPromptPipelineContext((prev) => ({
      ...prev,
      generatedLayout: effectiveLayout,
      roomMatrixReport,
      constraintReport,
    }))
    const feasibilityMsg =
      effectiveLayout.feasibility.status === "partially_feasible"
        ? `Partially feasible: ${effectiveLayout.feasibility.suggestions.slice(0, 2).join(" | ")}.`
        : effectiveLayout.feasibility.status === "not_feasible"
          ? `Not feasible under strict rules: ${effectiveLayout.feasibility.reasons.slice(0, 2).join(" | ")}. Best-effort layout applied.`
          : "Feasible."
    const stalePromptMsg = applyingStaleSuggestion
      ? " Note: prompt text changed after last analyze; re-analyze later for best match."
      : ""
    const autoMatchMsg = autoMatchApplied
      ? autoPreviewReady
        ? " Auto-match aligned prompt with generated layout."
        : " Auto-match attempted, but some hard constraints still need manual fix."
      : ""
    setAiStatus(
      autoPreviewReady
        ? `Selected plan applied. ${feasibilityMsg}${stalePromptMsg}${autoMatchMsg} Prompt validation passed and 3D preview is unlocked.`
        : `Selected plan applied. ${feasibilityMsg}${stalePromptMsg}${autoMatchMsg} Room matrix + hard constraints updated.`,
    )
  }

  const enforcePromptConstraintsOnCurrentLayout = useCallback(
    (rooms: RoomConfig[]) => {
      if (rooms.length === 0) return rooms
      const plotLength = plot.length
      const plotWidth = plot.width
      let adjusted = rooms.map((room) => ({ ...room }))
      const clampInside = (room: RoomConfig, x: number, z: number) => {
        const xLimit = plotLength / 2 - room.w / 2 - 0.15
        const zLimit = plotWidth / 2 - room.l / 2 - 0.15
        return { x: clamp(x, -xLimit, xLimit), z: clamp(z, -zLimit, zLimit) }
      }
      const setRoomPosition = (roomId: string, x: number, z: number) => {
        const room = adjusted.find((item) => item.id === roomId)
        if (!room) return false
        const next = clampInside(room, x, z)
        const floorRooms = adjusted.filter((item) => item.floor === room.floor && item.id !== room.id)
        const canPlace = canPlaceRoom({
          x: next.x,
          z: next.z,
          w: room.w,
          l: room.l,
          plotLength,
          plotWidth,
          existingRooms: floorRooms,
        })
        if (!canPlace) return false
        adjusted = adjusted.map((item) => (item.id === roomId ? { ...item, x: next.x, z: next.z } : item))
        return true
      }

      for (const rule of promptConstraints.directionRules) {
        const typedRooms = adjusted.filter((room) => room.type === rule.room)
        if (typedRooms.length === 0) continue
        const anchor = getDirectionalAnchorForFacing(rule.direction, plotFacing, plotLength, plotWidth, 0.3)
        const targetRoom = [...typedRooms].sort(
          (a, b) => Math.abs(a.x - anchor.x) + Math.abs(a.z - anchor.z) - (Math.abs(b.x - anchor.x) + Math.abs(b.z - anchor.z)),
        )[0]
        const offsets: Array<[number, number]> = [
          [0, 0],
          [1.2, 0],
          [-1.2, 0],
          [0, 1.2],
          [0, -1.2],
          [1.2, 1.2],
          [-1.2, -1.2],
          [1.2, -1.2],
          [-1.2, 1.2],
        ]
        for (const [dx, dz] of offsets) {
          if (setRoomPosition(targetRoom.id, anchor.x + dx, anchor.z + dz)) break
        }
      }

      for (const rule of promptConstraints.adjacencyRules) {
        const sourceRooms = adjusted.filter((room) => room.type === rule.room)
        const nearRooms = adjusted.filter((room) => room.type === rule.near)
        if (sourceRooms.length === 0 || nearRooms.length === 0) continue
        const sameFloorPairs = sourceRooms.flatMap((source) =>
          nearRooms
            .filter((near) => near.floor === source.floor)
            .map((near) => ({
              source,
              near,
              distance: Math.abs(source.x - near.x) + Math.abs(source.z - near.z),
            })),
        )
        const pair =
          sameFloorPairs.sort((a, b) => a.distance - b.distance)[0] ??
          {
            source: sourceRooms[0],
            near: nearRooms[0],
            distance: 999,
          }
        if (pair.source.floor !== pair.near.floor) continue
        const source = adjusted.find((room) => room.id === pair.source.id)
        const near = adjusted.find((room) => room.id === pair.near.id)
        if (!source || !near) continue
        const gap = 0.24
        const candidates = [
          { x: near.x + near.w / 2 + source.w / 2 + gap, z: near.z },
          { x: near.x - near.w / 2 - source.w / 2 - gap, z: near.z },
          { x: near.x, z: near.z + near.l / 2 + source.l / 2 + gap },
          { x: near.x, z: near.z - near.l / 2 - source.l / 2 - gap },
        ]
        for (const candidate of candidates) {
          if (setRoomPosition(source.id, candidate.x, candidate.z)) break
        }
      }

      const floors = Array.from(new Set(adjusted.map((room) => room.floor))).sort((a, b) => a - b)
      const flattened: RoomConfig[] = []
      for (const floor of floors) {
        const floorRooms = adjusted.filter((room) => room.floor === floor)
        const snapped = snapAdjacentRooms({ floorRooms, plotLength, plotWidth })
        const resolved = resolveFloorOverlaps({ floorRooms: snapped, plotLength, plotWidth })
        flattened.push(...resolved)
      }
      return flattened
    },
    [plot.length, plot.width, plotFacing, promptConstraints.adjacencyRules, promptConstraints.directionRules],
  )

  const buildPromptAutoMatchResult = (suggestion: AISuggestion): PromptAutoMatchResult | null => {
    const mergedLockedPrefs = mergeFloorPreferences(suggestion.floorPreferences, promptConstraints.lockedRooms)
    const effectiveConstraints: PromptConstraintBundle = {
      ...promptConstraints,
      lockedRooms: mergedLockedPrefs,
    }
    const repairedSuggestion: AISuggestion = {
      ...suggestion,
      floorPreferences: mergedLockedPrefs,
    }
    const regenerated = generateAllFloorLayouts(repairedSuggestion, mergedLockedPrefs, true)
    if (!regenerated) return null
    const repairedRooms = enforcePromptConstraintsOnCurrentLayout(regenerated.rooms)
    const revalidatedLayout: GeneratedLayout = {
      ...regenerated,
      rooms: repairedRooms,
      validation: validateIndianLayout({
        rooms: repairedRooms,
        floors: regenerated.floors,
        plotLength: plot.length,
        plotWidth: plot.width,
        plotFacing,
        requirements: regenerated.requirements,
      }),
    }
    const roomMatrixReport = calculateRoomMatrix(repairedSuggestion.patch, revalidatedLayout.rooms)
    const constraintReport = validateConstraints(revalidatedLayout.rooms, effectiveConstraints, repairedSuggestion.patch)
    return {
      layout: revalidatedLayout,
      roomMatrixReport,
      constraintReport,
      floorPreferences: mergedLockedPrefs,
    }
  }

  const fixPromptMismatchAndRegenerate = () => {
    if (!lastPromptPatch || !selectedPromptSuggestion) {
      setAiStatus("Analyze prompt and apply selected plan before auto-match.")
      return
    }
    if (!promptPipelineState.planApplied) {
      setAiStatus("Run Apply Selected Plan first.")
      return
    }
    if (planLocked) {
      setAiStatus("Plan locked hai. Unlock karke auto-match apply karo.")
      return
    }
    const autoMatched = buildPromptAutoMatchResult(selectedPromptSuggestion)
    if (!autoMatched) return
    setRoomFloorPreferences(autoMatched.floorPreferences)
    setRequirements(autoMatched.layout.requirements)
    setLastRequestedRequirements(autoMatched.layout.requirements)
    setLastFeasibilityNotes(autoMatched.layout.feasibility.reasons)
    setFeasibilityReport(autoMatched.layout.feasibility)
    setLayoutValidationReport(autoMatched.layout.validation)
    setHouseConfig((prev) => ({
      ...prev,
      totalSqFt: autoMatched.layout.totalSqFt,
      floors: autoMatched.layout.floors,
      floorHeight: autoMatched.layout.floorHeight,
      rooms: autoMatched.layout.rooms,
    }))
    setSelectedRoomId(autoMatched.layout.rooms[0]?.id ?? null)
    setPlanStage("editable_plan")

    const previewReady = autoMatched.roomMatrixReport.mismatchCount === 0 && autoMatched.constraintReport.criticalPass
    setPromptMismatchReviewed(true)
    setPromptPipelineContext((prev) => ({
      ...prev,
      generatedLayout: autoMatched.layout,
      roomMatrixReport: autoMatched.roomMatrixReport,
      constraintReport: autoMatched.constraintReport,
    }))
    setPromptPipelineStage(previewReady ? "preview_ready" : "mismatch_fixed", {
      criticalConstraintsPass: previewReady,
      previewReady,
      blockingReasons: previewReady ? [] : autoMatched.constraintReport.blockingReasons,
    })
    if (previewReady) {
      setAiStatus("Prompt auto-match completed. Required rooms repaired, intent constraints re-applied, and 3D preview gate unlocked.")
      return
    }
    setAiStatus(`Mismatch fix applied, but critical constraints still failing: ${autoMatched.constraintReport.blockingReasons.join(" | ")}`)
  }
  const parseUserPrompt = async (rawText: string): Promise<ParsedPlan | null> => {
    const promptInput = rawText.trim()
    if (!promptInput) {
      setAiStatus("Please enter a requirement prompt first.")
      return null
    }
    const localConflicts = detectPromptConflicts(promptInput)
    const conflictWarning =
      localConflicts.length > 0
        ? ` Prompt conflicts detected: ${localConflicts.join(" | ")}. Continuing with best-effort parse.`
        : ""

    const localPatch = sanitizeWizardPatch(parseWizardInputLocally(promptInput))
    let localFloorPreferences = parseFloorRoomPreferences(promptInput)
    let promptConstraintsFromParse: PromptConstraintBundle = {
      lockedRooms: localFloorPreferences,
      adjacencyRules: [],
      directionRules: [],
    }
    const inferredFloors = inferFloorCountFromPreferences(localFloorPreferences)
    const localPatchWithFloorInference: WizardPatch =
      localPatch.floors === undefined && inferredFloors !== undefined ? sanitizeWizardPatch({ ...localPatch, floors: inferredFloors }) : localPatch

    let mergedPatch: WizardPatch = localPatchWithFloorInference
    let statusPrefix = "Prompt analyzed with local parser."
    let source: ParsedPlan["source"] = "local"

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 25000)
      let response: Response
      try {
        response = await fetch("/api/blueprint/parse-requirements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({ input: promptInput }),
        })
      } finally {
        clearTimeout(timeout)
      }

      let data: {
        requirements?: WizardPatch
        floorAssignments?: RoomFloorPreferences
        lockedRooms?: RoomFloorPreferences
        adjacencyRules?: PromptAdjacencyRule[]
        directionRules?: PromptDirectionRule[]
        summary?: string
        error?: string
        source?: "gemini" | "fallback"
        strictAccepted?: boolean
        conflicts?: string[]
      }
      try {
        data = (await response.json()) as {
          requirements?: WizardPatch
          floorAssignments?: RoomFloorPreferences
          lockedRooms?: RoomFloorPreferences
          adjacencyRules?: PromptAdjacencyRule[]
          directionRules?: PromptDirectionRule[]
          summary?: string
          error?: string
          source?: "gemini" | "fallback"
          strictAccepted?: boolean
          conflicts?: string[]
        }
      } catch {
        data = {}
      }

      if (!response.ok) {
        source = "fallback"
        if (response.status === 401) {
          statusPrefix = "AI parser skipped (login/session unavailable). Smart local parser used."
        } else {
          const conflictMessage = data.conflicts?.length
            ? `Prompt conflicts: ${data.conflicts.join(" | ")}`
            : data.error || "Prompt parser unavailable."
          statusPrefix = `${conflictMessage} Smart local parser used.`
        }
      } else {
        source = data.source ?? "fallback"
        if (data.requirements) {
          mergedPatch = sanitizeWizardPatch({ ...localPatchWithFloorInference, ...data.requirements })
        }
        if (data.floorAssignments) {
          localFloorPreferences = mergeFloorPreferences(localFloorPreferences, data.floorAssignments)
        }
        if (data.lockedRooms) {
          localFloorPreferences = mergeFloorPreferences(localFloorPreferences, data.lockedRooms)
        }
        promptConstraintsFromParse = {
          lockedRooms: mergeFloorPreferences(localFloorPreferences, data.lockedRooms ?? data.floorAssignments),
          adjacencyRules: sanitizePromptAdjacencyRules(data.adjacencyRules),
          directionRules: sanitizePromptDirectionRules(data.directionRules),
        }
        const inferredFromMergedFloorPrefs = inferFloorCountFromPreferences(localFloorPreferences)
        if (inferredFromMergedFloorPrefs !== undefined && (mergedPatch.floors === undefined || mergedPatch.floors < inferredFromMergedFloorPrefs)) {
          mergedPatch = sanitizeWizardPatch({ ...mergedPatch, floors: inferredFromMergedFloorPrefs })
        }
        if (data.summary) {
          statusPrefix =
            source !== "fallback"
              ? data.summary
              : `${data.summary} (AI key unavailable, local smart parse active)`
        } else {
          statusPrefix = source !== "fallback" ? "Prompt analyzed with AI + local checks." : "Prompt analyzed with smart local parser."
        }
      }
    } catch (error) {
      source = "fallback"
      statusPrefix = `${error instanceof Error ? error.message : "Parser unavailable"}. Local parser used.`
    }

    const finalPatch = sanitizeWizardPatch(mergedPatch)
    const missingInputs = detectPromptMissingInputs(promptInput, finalPatch)
    const missingText =
      missingInputs.length > 0
        ? ` Missing inputs auto-assumed: ${missingInputs.join(", ")}.`
        : ""
    return {
      rawPrompt: promptInput,
      patch: finalPatch,
      floorPreferences: localFloorPreferences,
      constraints: promptConstraintsFromParse,
      source,
      summary: `${statusPrefix}${conflictWarning}${missingText}`,
      conflicts: localConflicts,
      missingInputs,
    }
  }
  const generateAISuggestions = (parsedPlan: ParsedPlan): AISuggestion[] => buildPromptSuggestions(parsedPlan.patch, parsedPlan.floorPreferences)
  const handleSuggestionSelection = (suggestionId: PromptPlanSuggestion["id"]) => {
    setSelectedWizardSuggestionId(suggestionId)
    setPromptMismatchReviewed(false)
    setPromptPipelineContext((prev) => ({
      ...prev,
      generatedLayout: null,
      roomMatrixReport: null,
      constraintReport: null,
    }))
    setPromptPipelineStage("suggestion_selected", {
      criticalConstraintsPass: false,
      previewReady: false,
      blockingReasons: ["Apply Selected Plan to continue pipeline."],
    })
  }
  const applyRequirementWizard = async () => {
    if (!ensureUnlockedForEdit("analyze a new prompt")) return
    const promptInput = wizardInput.trim()
    if (!promptInput) {
      setAiStatus("Please enter a requirement prompt first.")
      return
    }
    if (!previewPrompt.trim()) {
      setPreviewPrompt(promptInput)
    }
    setPromptDraftDirty(false)
    resetPromptPipeline()
    setWizardLoading(true)
    setAiStatus("Reading prompt and preparing plan suggestions...")
    try {
      const parsedPlan = await parseUserPrompt(promptInput)
      if (!parsedPlan) return
      const suggestions = generateAISuggestions(parsedPlan)
      const defaultSuggestion =
        suggestions.find((item) => item.id === "prompt_exact") ??
        suggestions.find((item) => item.feasibility === "feasible") ??
        suggestions.find((item) => item.id === "balanced") ??
        suggestions[0]
      setWizardSuggestions(suggestions)
      setSelectedWizardSuggestionId(defaultSuggestion?.id ?? null)
      setLastPromptPatch(parsedPlan.patch)
      setPromptConstraints(parsedPlan.constraints)
      setPromptMismatchReviewed(false)
      setPlanStage("suggested_plan")
      setPromptPipelineContext((prev) => ({
        ...prev,
        parsedPlan,
      }))
      setPromptPipelineStage(defaultSuggestion ? "suggestion_selected" : "prompt_analyzed", {
        criticalConstraintsPass: false,
        previewReady: false,
        blockingReasons: defaultSuggestion ? ["Apply Selected Plan to continue pipeline."] : ["Select an AI suggestion first."],
      })
      if (planLocked) {
        setAiStatus(`${parsedPlan.summary} Plan is locked. Unlock and then apply selected suggestion.`)
        return
      }
      setAiStatus(`${parsedPlan.summary} Suggestions ready. Select one and click Apply Selected Plan.`)
    } finally {
      setWizardLoading(false)
    }
  }

  const stairCutoutsByFloor = useMemo(() => {
    const byFloor = new Map<number, StairCutout[]>()
    for (const floor of floorsArray) {
      if (floor === 0) {
        byFloor.set(floor, [])
        continue
      }
      const cutouts = houseConfig.rooms
        .filter((room) => room.type === "Stairs" && room.floor === floor - 1)
        .map((room) => ({ x: room.x, z: room.z, w: room.w, l: room.l }))
      byFloor.set(floor, cutouts)
    }
    return byFloor
  }, [floorsArray, houseConfig.rooms])
  const groundParkingRooms = useMemo(
    () => houseConfig.rooms.filter((room) => room.type === "Parking" && room.floor === 0),
    [houseConfig.rooms],
  )
  const shouldUseParkingGateModel = modelAvailability.frontDoor && groundParkingRooms.length > 0
  const parkingGateMarkers = useMemo(
    () =>
      groundParkingRooms.map((room) => {
        if (plotFacing === "North") {
          return {
            id: `${room.id}-gate`,
            position: [room.x, 0, room.z - room.l / 2 + 0.06] as [number, number, number],
            rotation: [0, Math.PI, 0] as [number, number, number],
            targetSize: [Math.max(2.4, room.w * 0.7), 2.5, 0.28] as [number, number, number],
          }
        }
        if (plotFacing === "South") {
          return {
            id: `${room.id}-gate`,
            position: [room.x, 0, room.z + room.l / 2 - 0.06] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
            targetSize: [Math.max(2.4, room.w * 0.7), 2.5, 0.28] as [number, number, number],
          }
        }
        if (plotFacing === "East") {
          return {
            id: `${room.id}-gate`,
            position: [room.x + room.w / 2 - 0.06, 0, room.z] as [number, number, number],
            rotation: [0, -Math.PI / 2, 0] as [number, number, number],
            targetSize: [Math.max(2.4, room.l * 0.7), 2.5, 0.28] as [number, number, number],
          }
        }
        return {
          id: `${room.id}-gate`,
          position: [room.x - room.w / 2 + 0.06, 0, room.z] as [number, number, number],
          rotation: [0, Math.PI / 2, 0] as [number, number, number],
          targetSize: [Math.max(2.4, room.l * 0.7), 2.5, 0.28] as [number, number, number],
        }
      }),
    [groundParkingRooms, plotFacing],
  )

  const plannerSceneGroup = (
    <group>
      {visibleFloors.map((floor) => (
        <FloorShell
          key={`shell-${floor}`}
          floor={floor}
          floorHeight={houseConfig.floorHeight}
          plotLength={plot.length}
          plotWidth={plot.width}
          stairCutouts={stairCutoutsByFloor.get(floor) ?? []}
          xray={xray}
          wallMaterial={wallMaterial}
          floorMaterial={floorMaterial}
          plotFacing={plotFacing}
          boundaryEnabled={requirements.includeBoundary}
          landscapeEnabled={requirements.includeLandscapeGlass}
          showDefaultFrontGate={!shouldUseParkingGateModel}
        />
      ))}
      {shouldUseParkingGateModel &&
        parkingGateMarkers.map((gate) => (
          <OptionalModel
            key={gate.id}
            path={MODEL_PATHS.frontDoor}
            position={gate.position}
            rotation={gate.rotation}
            targetSize={gate.targetSize}
            scaleMultiplier={1}
          />
        ))}
      {xray &&
        visibleFloors.map((floor) => (
          <SystemOverlay
            key={`overlay-${floor}`}
            floor={floor}
            floorHeight={houseConfig.floorHeight}
            plotLength={plot.length}
            plotWidth={plot.width}
            mode={overlayMode}
          />
        ))}
      {showLayoutDebug &&
        visibleFloors.map((floor) => (
          <LayoutDebugOverlay
            key={`layout-debug-${floor}`}
            floor={floor}
            floorHeight={houseConfig.floorHeight}
            plotLength={plot.length}
            plotWidth={plot.width}
            rooms={houseConfig.rooms}
            snapLinks={snapLinks}
            stairCutouts={stairCutoutsByFloor.get(floor) ?? []}
          />
        ))}
      {visibleRooms.map((room) =>
        room.type === "Stairs" ? (
          <StairsMesh key={room.id} room={room} floorHeight={houseConfig.floorHeight} modelAvailability={modelAvailability} />
        ) : (
          <group key={room.id}>
            {room.type !== "Parking" && room.type !== "Garden" && room.type !== "Balcony" && (
              <StructuralColumns room={room} floorHeight={houseConfig.floorHeight} />
            )}
            <DraggableRoom
              room={room}
              siblingRooms={floorRoomsMap.get(room.floor) ?? []}
              floorHeight={houseConfig.floorHeight}
              selected={room.id === selectedRoomId}
              plotLength={plot.length}
              plotWidth={plot.width}
              xray={xray}
              modelAvailability={modelAvailability}
              colliding={collidingRoomIds.has(room.id)}
              traditionalDecor={traditionalDecor}
              activeHighlightType={highlightedRoomType}
              onSelect={setSelectedRoomId}
              onMove={moveRoomWithConstraints}
              onInteractionChange={setIsRoomInteracting}
            />
          </group>
        ),
      )}
      <SnapGuideOverlay
        guide={snapGuide}
        floorHeight={houseConfig.floorHeight}
        plotLength={plot.length}
        plotWidth={plot.width}
      />
    </group>
  )

  return (
    <div className="space-y-6">
      <input
        ref={surveyFileInputRef}
        type="file"
        className="hidden"
        accept={SURVEY_FILE_ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            handleSurveyImportFile(file)
          }
          event.target.value = ""
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">AI Architect House Planner</h1>
          <p className="text-muted-foreground">Multi-floor project planning with AI/manual inputs, civil validation, and engineering sync.</p>
          {(projectStatus || currentProjectOwner || adminMode) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {currentProjectId && <Badge variant="outline">{`Project ID: ${currentProjectId}`}</Badge>}
              {currentProjectOwner && <Badge variant="secondary">{`Owner: ${currentProjectOwner.name} (${currentProjectOwner.role})`}</Badge>}
              {adminMode && <Badge variant="destructive">Admin Control Mode</Badge>}
              {projectStatus && <span className="text-muted-foreground">{projectStatus}</span>}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{`Mode: ${planningMode === "prompt" ? "AI Prompt Planner" : "Manual Planner"}`}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={undoHistory} disabled={!historyMeta.canUndo} title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={redoHistory} disabled={!historyMeta.canRedo} title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Input
            value={currentProjectName}
            onChange={(event) => setCurrentProjectName(event.target.value)}
            placeholder="Project name"
            className="w-[220px]"
            disabled={planLocked}
          />
          <Button onClick={persistProject} disabled={savingProject}>
            {savingProject ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" onClick={() => { void downloadPlanPdf() }} disabled={!canRender3dPreview}>
            Download Full PDF
          </Button>
          {planLocked ? (
            <Button variant="outline" onClick={unlockPlanEditing}>
              Unlock Editing
            </Button>
          ) : (
            <Button variant="outline" onClick={finalizePlan}>
              Lock Final Plan
            </Button>
          )}
          <Button variant="outline" onClick={() => { void refreshMarketRates() }}>Refresh Rates</Button>
          <Button variant="secondary" onClick={() => { void generateHdPreview() }} disabled={generatingPreview || !canGeneratePromptPreview}>
            {generatingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate HD Preview
          </Button>
          <Badge variant="outline">{`Phase C - ${getRenderQualityLabel(renderQuality[0])}`}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <Card className="xl:col-span-4 self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Project Planner
            </CardTitle>
            <CardDescription>
              {planningMode === "manual"
                ? "Manual controls for plot, floors, rooms, market rates, and visualization."
                : "AI prompt flow with requirements, feasibility, validation, and visualization."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
            {planLocked && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                Plan is locked. Use Unlock Editing from the top action bar to modify requirements.
              </div>
            )}
            <fieldset disabled={planLocked} className="space-y-5 flex flex-col">
            {planningMode === "manual" && (
            <div className="rounded-md border p-3 space-y-3 order-1">
              <p className="text-sm font-medium">Step 1: Plot Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Length (ft)</Label>
                  <Input
                    type="number"
                    value={plannerInputs.depthFt}
                    onChange={(event) =>
                      setPlannerInputs((prev) => ({ ...prev, useCustomPlot: true, depthFt: clamp(Number.parseFloat(event.target.value), 20, 120) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Breadth (ft)</Label>
                  <Input
                    type="number"
                    value={plannerInputs.frontageFt}
                    onChange={(event) =>
                      setPlannerInputs((prev) => ({ ...prev, useCustomPlot: true, frontageFt: clamp(Number.parseFloat(event.target.value), 12, 100) }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Auto Area (sq ft)</Label>
                  <p className="h-10 rounded-md border bg-muted/40 px-3 text-sm flex items-center font-medium">{autoPlotAreaSqFt.toFixed(1)}</p>
                </div>
                <div className="space-y-1">
                  <Label>Floors</Label>
                  <Input type="number" value={houseConfig.floors} onChange={(event) => setFloors(Number.parseFloat(event.target.value))} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-xs font-medium">Manual Area Override</span>
                <Switch
                  checked={manualAreaOverrideEnabled}
                  onCheckedChange={(checked) => {
                    setManualAreaOverrideEnabled(checked)
                    if (!checked) {
                      setHouseConfig((prev) => ({ ...prev, totalSqFt: autoPlotAreaSqFt }))
                    }
                  }}
                />
              </div>
              {manualAreaOverrideEnabled && (
                <div className="space-y-1">
                  <Label>Override Total Sq Ft</Label>
                  <Input
                    type="number"
                    value={houseConfig.totalSqFt}
                    onChange={(event) => {
                      const nextTotalSqFt = clamp(Number.parseFloat(event.target.value), 200, 10000)
                      const nextMaxFloors = getMaxFloorsForPlotArea(nextTotalSqFt)
                      setHouseConfig((prev) => ({
                        ...prev,
                        totalSqFt: nextTotalSqFt,
                        floors: Math.round(clamp(prev.floors, 1, nextMaxFloors)),
                        rooms: prev.rooms.filter((room) => room.floor < nextMaxFloors),
                      }))
                      if (houseConfig.floors > nextMaxFloors) {
                        setRequirements((prev) => ({
                          ...prev,
                          includeStairs: nextMaxFloors > 1 ? prev.includeStairs : false,
                          balconyRooms: nextMaxFloors > 1 ? prev.balconyRooms : 0,
                        }))
                        setAiStatus(`Area updated. Max realistic floors for ${nextTotalSqFt.toFixed(0)} sq ft is ${nextMaxFloors}.`)
                      }
                    }}
                  />
                </div>
              )}
            </div>
            )}
            {planningMode === "manual" && (
            <div className="rounded-md border p-3 space-y-3 order-2">
              <p className="text-sm font-medium">Step 2: Family + Planning Inputs</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Family Size</Label>
                  <Input
                    type="number"
                    value={plannerInputs.familySize}
                    onChange={(event) =>
                      setPlannerInputs((prev) => ({ ...prev, familySize: Math.round(clamp(Number.parseFloat(event.target.value), 1, 20)) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Budget (Lakh INR)</Label>
                  <Input
                    type="number"
                    value={plannerInputs.budgetLakh}
                    onChange={(event) =>
                      setPlannerInputs((prev) => ({ ...prev, budgetLakh: clamp(Number.parseFloat(event.target.value), 0, 1000) }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Elderly Members</Label>
                  <Input
                    type="number"
                    value={plannerInputs.elderlyMembers}
                    onChange={(event) =>
                      setPlannerInputs((prev) => ({ ...prev, elderlyMembers: Math.round(clamp(Number.parseFloat(event.target.value), 0, 8)) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Children</Label>
                  <Input
                    type="number"
                    value={plannerInputs.childrenCount}
                    onChange={(event) =>
                      setPlannerInputs((prev) => ({ ...prev, childrenCount: Math.round(clamp(Number.parseFloat(event.target.value), 0, 10)) }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Future Expansion (Years)</Label>
                  <Input
                    type="number"
                    value={plannerInputs.futureExpansionYears}
                    onChange={(event) =>
                      setPlannerInputs((prev) => ({ ...prev, futureExpansionYears: Math.round(clamp(Number.parseFloat(event.target.value), 0, 30)) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Plot Orientation</Label>
                  <select
                    value={plotFacing}
                    onChange={(event) => setPlotFacing(event.target.value as PlotFacing)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="North">North</option>
                    <option value="East">East</option>
                    <option value="South">South</option>
                    <option value="West">West</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Bath Preference</Label>
                  <select
                    value={plannerInputs.bathPreference}
                    onChange={(event) =>
                      setPlannerInputs((prev) => ({ ...prev, bathPreference: event.target.value as BathPreference }))
                    }
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="auto">Auto</option>
                    <option value="attached">Attached Preferred</option>
                    <option value="common">Common Preferred</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Plan Style</Label>
                  <select
                    value={plannerInputs.planStyle}
                    onChange={(event) => setPlannerInputs((prev) => ({ ...prev, planStyle: event.target.value as PlanStyle }))}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="compact">Indian Compact</option>
                    <option value="balanced">Balanced</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Staircase Type</Label>
                  <select
                    value={plannerInputs.staircaseType}
                    onChange={(event) =>
                      setPlannerInputs((prev) => ({ ...prev, staircaseType: event.target.value as StaircaseType }))
                    }
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="dog-leg">Dog-Leg</option>
                    <option value="u-shape">U-Shape</option>
                    <option value="straight">Straight</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Road Side</Label>
                  <p className="h-10 rounded-md border bg-muted/40 px-3 text-sm flex items-center">{plotFacing}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-xs font-medium">Corner Plot</span>
                  <Switch
                    checked={plannerInputs.cornerPlot}
                    onCheckedChange={(checked) =>
                      setPlannerInputs((prev) => ({ ...prev, cornerPlot: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-xs font-medium">Parking Required</span>
                  <Switch
                    checked={plannerInputs.parkingRequired}
                    onCheckedChange={(checked) => {
                      setPlannerInputs((prev) => ({ ...prev, parkingRequired: checked }))
                      setRequirements((prev) => ({ ...prev, parkingSpaces: checked ? Math.max(prev.parkingSpaces, 1) : 0 }))
                    }}
                  />
                </div>
              </div>
            </div>
            )}
            {planningMode === "manual" && (
              <div className="rounded-md border p-3 space-y-3 order-3">
                <p className="text-sm font-medium">Step 3: Manual Room Add / Remove (All Types)</p>
                <div className="space-y-1">
                  <Label>Target Floor</Label>
                  <select
                    value={manualPlannerFloor}
                    onChange={(event) => setManualPlannerFloor(Math.round(clamp(Number.parseInt(event.target.value, 10), 0, houseConfig.floors - 1)))}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    {floorsArray.map((floor) => (
                      <option key={`manual-room-floor-${floor}`} value={floor}>{`Floor ${floor + 1}`}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  {ROOM_TYPE_OPTIONS.map((type) => {
                    const totalCount = countRoomsByType(type)
                    const floorCount = countRoomsByType(type, manualPlannerFloor)
                    const stairDisabled = type === "Stairs" && houseConfig.floors <= 1
                    return (
                      <div key={`manual-room-control-${type}`} className="flex items-center justify-between rounded-md border p-2 gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{type}</p>
                          <p className="text-[11px] text-muted-foreground">{`Floor ${manualPlannerFloor + 1}: ${floorCount} | Total: ${totalCount}`}</p>
                          {stairDisabled && <p className="text-[11px] text-amber-700">Stairs need at least 2 floors.</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={totalCount === 0 || stairDisabled}
                            onClick={() => removeRoomByType(type, manualPlannerFloor)}
                          >
                            Remove
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={stairDisabled}
                            onClick={() => addRoom(type, manualPlannerFloor)}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="rounded-md border p-3 space-y-3 order-0">
              <p className="text-sm font-medium">0. Planning Mode + User Requirements</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => switchPlanningMode("prompt")}
                  className={`rounded-md border p-3 text-left transition ${
                    planningMode === "prompt" ? "border-amber-500 bg-amber-50" : "border-border bg-background"
                  }`}
                >
                  <p className="text-sm font-medium">AI Prompt Planner</p>
                  <p className="text-xs text-muted-foreground">Describe your house in Hindi/Hinglish and get smart suggestions.</p>
                </button>
                <button
                  type="button"
                  onClick={() => switchPlanningMode("manual")}
                  className={`rounded-md border p-3 text-left transition ${
                    planningMode === "manual" ? "border-amber-500 bg-amber-50" : "border-border bg-background"
                  }`}
                >
                  <p className="text-sm font-medium">Manual Planner</p>
                  <p className="text-xs text-muted-foreground">Directly set room counts, floors, and controls.</p>
                </button>
              </div>
              {planningMode === "prompt" && (
                <>
                  <div className="space-y-2 rounded-md border p-2">
                    <Label>1. User Prompt</Label>
                    <Textarea
                      value={wizardInput}
                      onChange={(event) => {
                        setWizardInput(event.target.value)
                        setPromptDraftDirty(true)
                      }}
                      placeholder='Example: "1500 sqft 2 floor house. first floor: parking, kitchen, living. second floor: 2 bedroom, 1 bath, balcony." or "1500 sqft ghar, ground floor me parking + rasoi + hall, first floor me bedroom + bathroom + balcony."'
                      className="min-h-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Hindi, Hinglish, or mixed language prompt supported. Floor-wise likho: `ground/first/second` or `neeche/upar`.
                    </p>
                    <Button variant="secondary" onClick={applyRequirementWizard} disabled={wizardLoading} className="w-full">
                      {wizardLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Analyze Prompt & Suggest Plans
                    </Button>
                    {promptDraftDirty && (
                      <p className="text-xs text-amber-700">
                        Prompt changed. Click Analyze to refresh suggestions. Current applied plan stays active until re-analyze.
                      </p>
                    )}
                    <div className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-xs font-medium">Add Site + Family Inputs (Optional)</span>
                      <Switch checked={promptSiteFamilyEnabled} onCheckedChange={setPromptSiteFamilyEnabled} />
                    </div>
                    {promptSiteFamilyEnabled && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={plannerInputs.familySize}
                          onChange={(event) =>
                            setPlannerInputs((prev) => ({ ...prev, familySize: Math.round(clamp(Number.parseFloat(event.target.value), 1, 20)) }))
                          }
                          placeholder="Family size"
                        />
                        <Input
                          type="number"
                          value={plannerInputs.elderlyMembers}
                          onChange={(event) =>
                            setPlannerInputs((prev) => ({ ...prev, elderlyMembers: Math.round(clamp(Number.parseFloat(event.target.value), 0, 8)) }))
                          }
                          placeholder="Elderly members"
                        />
                        <Input
                          type="number"
                          value={plannerInputs.childrenCount}
                          onChange={(event) =>
                            setPlannerInputs((prev) => ({ ...prev, childrenCount: Math.round(clamp(Number.parseFloat(event.target.value), 0, 10)) }))
                          }
                          placeholder="Children"
                        />
                        <Input
                          type="number"
                          value={plannerInputs.futureExpansionYears}
                          onChange={(event) =>
                            setPlannerInputs((prev) => ({ ...prev, futureExpansionYears: Math.round(clamp(Number.parseFloat(event.target.value), 0, 30)) }))
                          }
                          placeholder="Future expansion years"
                        />
                        <div className="flex items-center justify-between rounded-md border px-2 h-10">
                          <span className="text-xs">Corner plot</span>
                          <Switch
                            checked={plannerInputs.cornerPlot}
                            onCheckedChange={(checked) => setPlannerInputs((prev) => ({ ...prev, cornerPlot: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-2 h-10">
                          <span className="text-xs">Parking required</span>
                          <Switch
                            checked={plannerInputs.parkingRequired}
                            onCheckedChange={(checked) => {
                              setPlannerInputs((prev) => ({ ...prev, parkingRequired: checked }))
                              setRequirements((prev) => ({ ...prev, parkingSpaces: checked ? Math.max(prev.parkingSpaces, 1) : 0 }))
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 rounded-md border p-2">
                    <Label>2. AI Suggestion</Label>
                    {wizardSuggestions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Prompt analyze karo, phir yahan Prompt Exact / Balanced / Compact / Parking-first suggestions aayenge.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {wizardSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => handleSuggestionSelection(suggestion.id)}
                            className={`w-full rounded-md border p-2 text-left transition ${
                              selectedWizardSuggestionId === suggestion.id
                                ? "border-amber-500 bg-amber-50"
                                : "border-border bg-background"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{suggestion.label}</span>
                              <Badge
                                variant={
                                  suggestion.feasibility === "feasible"
                                    ? "outline"
                                    : suggestion.feasibility === "partially_feasible"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {suggestion.feasibility.replaceAll("_", " ")}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{suggestion.summary}</p>
                            {suggestion.feasibilityNotes.length > 0 && (
                              <p className="text-xs text-amber-700 mt-1">{suggestion.feasibilityNotes.join(" | ")}</p>
                            )}
                          </button>
                        ))}
                        <Button onClick={applySelectedPlan} className="w-full">
                          Apply Selected Plan
                        </Button>
                        {parsedPromptPlan && (
                          <div className="rounded-md border p-2 space-y-2 text-xs">
                            <p className="font-medium">Prompt Parse Snapshot</p>
                            {promptDetectedRows.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                {promptDetectedRows.map((row) => (
                                  <p key={`prompt-detected-${row.label}`}>
                                    {row.label}: <span className="font-medium">{row.value}</span>
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No structured fields detected yet.</p>
                            )}
                            {parsedPromptPlan.missingInputs.length > 0 && (
                              <p className="text-amber-700">{`Missing: ${parsedPromptPlan.missingInputs.join(" | ")}`}</p>
                            )}
                            {promptRecommendedRows.length > 0 && (
                              <div className="space-y-1">
                                {promptRecommendedRows.map((item) => (
                                  <p key={item} className="text-emerald-700">{item}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {!promptPlanApplied && (
                          <p className="text-xs text-muted-foreground">
                            Apply selected plan first. Uske baad AI room matrix aur hard constraints validation active hoga.
                          </p>
                        )}
                        {promptPipelineState.planApplied && (
                        <div className="rounded-md border p-2 space-y-1 text-xs">
                          <p className="font-medium">Planning Engine Validation (Prompt)</p>
                          {selectedPromptSuggestion ? (
                            <>
                              <p>
                                Feasibility:{" "}
                                <span className={selectedPromptSuggestion.feasibility === "feasible" ? "text-emerald-700" : selectedPromptSuggestion.feasibility === "partially_feasible" ? "text-amber-700" : "text-rose-700"}>
                                  {selectedPromptSuggestion.feasibility.replaceAll("_", " ")}
                                </span>
                              </p>
                              {selectedPromptSuggestion.feasibilityNotes.length > 0 && (
                                <p className="text-muted-foreground">{selectedPromptSuggestion.feasibilityNotes.join(" | ")}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-muted-foreground">No suggestion selected.</p>
                          )}
                          {feasibilityReport && (
                            <div className="grid grid-cols-2 gap-2 rounded border p-2 text-[11px]">
                              <p>Gross: <span className="font-medium">{feasibilityReport.civilBreakdown.grossPlotAreaSqFt.toFixed(1)} sq ft</span></p>
                              <p>Open: <span className="font-medium">-{feasibilityReport.civilBreakdown.openSpaceDeductionSqFt.toFixed(1)} sq ft</span></p>
                              <p>Walls: <span className="font-medium">-{feasibilityReport.civilBreakdown.wallDeductionSqFt.toFixed(1)} sq ft</span></p>
                              <p>Usable/Floor: <span className="font-medium">{feasibilityReport.civilBreakdown.usablePerFloorSqFt.toFixed(1)} sq ft</span></p>
                              <p>Total Usable: <span className="font-medium">{feasibilityReport.civilBreakdown.usableTotalSqFt.toFixed(1)} sq ft</span></p>
                              <p>Program Need: <span className="font-medium">{feasibilityReport.requiredApproxSqFt.toFixed(1)} sq ft</span></p>
                            </div>
                          )}
                          {promptStairCheck && (
                            <p className={promptStairCheck.status === "PASS" ? "text-emerald-700" : "text-rose-700"}>
                              {promptStairCheck.stairRequired
                                ? promptStairCheck.stairProvided
                                  ? "Staircase check: PASS (multi-floor connection included)."
                                  : "Staircase check: FAIL (multi-floor plan needs stairs)."
                                : "Staircase check: PASS (single-floor layout)."}
                            </p>
                          )}
                          {layoutValidationReport?.valid ? (
                            <p className="text-emerald-700">2D validation: PASS</p>
                          ) : (
                            <p className="text-rose-700">{`2D validation: FAIL${layoutValidationReport?.issues[0] ? ` (${layoutValidationReport.issues[0]})` : ""}`}</p>
                          )}
                        </div>
                        )}
                        {promptPipelineState.matrixReady && promptRoomMatrix.length > 0 && (
                          <div className="rounded-md border p-2 space-y-2">
                            <p className="text-xs font-medium">AI Room Match Matrix</p>
                            <div className="grid grid-cols-6 gap-2 text-[11px] font-medium text-muted-foreground">
                              <span>Room</span>
                              <span className="text-right">Req</span>
                              <span className="text-right">Built</span>
                              <span className="text-right">Size</span>
                              <span className="text-right">Access</span>
                              <span className="text-right">Status</span>
                            </div>
                            {promptRoomMatrix.map((row) => (
                              <div key={`prompt-matrix-${row.label}`} className="grid grid-cols-6 gap-2 text-xs">
                                <span title={row.note}>{row.label}</span>
                                <span className="text-right">{row.required}</span>
                                <span className="text-right">{row.built}</span>
                                <span className={`text-right ${row.size === "Valid" ? "text-emerald-700" : row.size === "Compact" ? "text-amber-700" : "text-rose-700"}`}>{row.size}</span>
                                <span className={`text-right ${row.access === "Valid" ? "text-emerald-700" : row.access === "Limited" ? "text-amber-700" : "text-rose-700"}`}>{row.access}</span>
                                <span className={`text-right ${row.status === "Match" ? "text-emerald-700" : row.status === "Partial" ? "text-amber-700" : "text-rose-700"}`}>{row.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {promptPipelineState.constraintsReady && (
                          <div className="rounded-md border p-2 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Prompt vs 3D Hard Constraints</p>
                              {promptConstraintReport.checks.length > 0 ? (
                                <Badge variant="outline" className={promptConstraintReport.failedCount === 0 ? "border-emerald-500 text-emerald-700" : "border-rose-500 text-rose-700"}>
                                  {`${promptConstraintReport.score}%`}
                                </Badge>
                              ) : (
                                <Badge variant="outline">No checks yet</Badge>
                              )}
                            </div>
                            {promptConstraintReport.checks.length > 0 ? (
                              promptConstraintReport.checks.map((check) => (
                                <div key={check.id} className="rounded border px-2 py-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{check.label}</span>
                                    <span className={check.status === "pass" ? "text-emerald-700" : "text-rose-700"}>
                                      {check.status === "pass" ? "PASS" : "FAIL"}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground">{check.detail}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground">
                                Constraints pending. Plan apply ho gaya hai, ab `Auto-Match Prompt Layout` se re-sync kar sakte ho.
                              </p>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={fixPromptMismatchAndRegenerate}
                              disabled={!lastPromptPatch}
                              className="w-full"
                            >
                              Auto-Match Prompt Layout
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => { void generateHdPreview() }}
                              disabled={generatingPreview || !canGeneratePromptPreview}
                              className="w-full"
                            >
                              {generatingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                              Generate 3D Preview
                            </Button>
                            {!canGeneratePromptPreview && (
                              <p className="text-amber-700">{previewGenerationBlockedMessage}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="rounded-md border p-3 space-y-3 text-sm order-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">3. Current Market Rates + Site Survey</p>
                <Badge variant="outline">{selectedMarketProfile.label}</Badge>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rate Region</Label>
                <select
                  value={selectedMarketProfileId}
                  onChange={(event) => setSelectedMarketProfileId(event.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  {GEO_MARKET_PROFILES.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{selectedMarketProfile.supplierFeed}</p>
              </div>
              <p>
                Plot Approx: <span className="font-semibold">{plot.length.toFixed(1)} ft x {plot.width.toFixed(1)} ft</span>
              </p>
              <Separator />
              <p>Brick Rate: <span className="font-semibold">{formatInr(effectiveMarketRates.brickPerPiece)} / piece</span></p>
              <p>Cement Rate: <span className="font-semibold">{formatInr(effectiveMarketRates.cementPerBag)} / bag</span></p>
              <p>Sand Rate: <span className="font-semibold">{formatInr(effectiveMarketRates.sandPerTon)} / ton</span></p>
              <p>Steel Rate: <span className="font-semibold">{formatInr(effectiveMarketRates.steelPerTon)} / ton</span></p>
              <p>Labor Rate: <span className="font-semibold">{formatInr(selectedMarketProfile.laborRatePerSqFt)} / sq ft</span></p>
              <p className="text-xs text-muted-foreground">Rates As Of: {ratesAsOf ? new Date(ratesAsOf).toLocaleString() : "Loading..."}</p>
              <p className="text-xs text-muted-foreground">
                Materials {formatInr(geoCostEstimate.materials)} | Labor {formatInr(geoCostEstimate.labor)} | Contingency 15% {formatInr(geoCostEstimate.contingency)}
              </p>
              <p className="text-sm font-semibold">{`Geo-specific estimate: ${formatInr(geoCostEstimate.total)}`}</p>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium">Imported Site Survey</p>
                {surveyImport ? (
                  <>
                    <p className="text-xs text-muted-foreground">{`${surveyImport.fileName} (${surveyImport.fileType}, ${surveyImport.fileSizeKb.toFixed(1)} KB)`}</p>
                    <p className="text-xs text-muted-foreground">{`Imported: ${new Date(surveyImport.importedAt).toLocaleString()}`}</p>
                    {surveyImport.notes.slice(0, 2).map((note) => (
                      <p key={note} className="text-xs text-muted-foreground">{note}</p>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No survey imported yet. Use Import Site Survey.</p>
                )}
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3 order-4">
              <p className="text-sm font-semibold">4. X-Ray / Vastu + Material Controls</p>
              <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4" />
                X-Ray View
              </Label>
              <Switch checked={xray} onCheckedChange={setXray} />
            </div>

            <div className="flex items-center justify-between order-5">
              <Label>Vastu Mode</Label>
              <Switch checked={vastuEnabled} onCheckedChange={setVastuEnabled} />
            </div>

            <div className="space-y-1">
              <Label>Floor Focus</Label>
              <select
                value={floorFocus === "all" ? "all" : String(floorFocus)}
                onChange={(event) => {
                  const value = event.target.value
                  setFloorFocus(value === "all" ? "all" : Number.parseInt(value, 10))
                }}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All Floors</option>
                {floorsArray.map((floor) => (
                  <option key={`focus-floor-${floor}`} value={floor}>{`Floor ${floor + 1}`}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Focus a single floor for cleaner editing and faster render.</p>
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <Compass className="h-4 w-4" />
                Plot Facing
              </Label>
              <select
                value={plotFacing}
                onChange={(event) => setPlotFacing(event.target.value as PlotFacing)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="North">North</option>
                <option value="East">East</option>
                <option value="South">South</option>
                <option value="West">West</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Wall Material</Label>
                <select
                  value={wallMaterial}
                  onChange={(event) => setWallMaterial(event.target.value as WallMaterial)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="plaster">Plaster</option>
                  <option value="bricks">Bricks</option>
                  <option value="concrete">Concrete</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Floor Material</Label>
                <select
                  value={floorMaterial}
                  onChange={(event) => setFloorMaterial(event.target.value as FloorMaterial)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="wood">Wood</option>
                  <option value="marble">Marble</option>
                  <option value="tiles">Tiles</option>
                  <option value="makrana">Makrana Marble</option>
                  <option value="terracotta">Terracotta Tiles</option>
                </select>
              </div>
            </div>

              <div className="space-y-1">
                <Label>X-Ray Overlay</Label>
                <select
                value={overlayMode}
                onChange={(event) => setOverlayMode(event.target.value as OverlayMode)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                disabled={!xray}
              >
                <option value="none">None</option>
                <option value="electrical">Electrical Lines</option>
                <option value="plumbing">Plumbing Lines</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Presentation Float</Label>
              <Switch checked={presentationMode} onCheckedChange={setPresentationMode} />
            </div>

            <div className="grid grid-cols-2 gap-2 order-6">
              <div className="space-y-1">
                <Label>Camera Preset</Label>
                <select
                  value={cameraPreset}
                  onChange={(event) => {
                    setWalkthroughMode(false)
                    setCameraPreset(event.target.value as CameraPreset)
                  }}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="default">Default</option>
                  <option value="front">Front Elevation</option>
                  <option value="bird">Bird View</option>
                  <option value="cinematic">Cinematic</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Lighting Preset</Label>
                <select
                  value={lightingPreset}
                  onChange={(event) => setLightingPreset(event.target.value as LightingPreset)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="day">Day</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 rounded-md border p-3 order-7">
              <div className="flex items-center justify-between">
                <Label>Walkthrough Mode</Label>
                <Switch checked={walkthroughMode} onCheckedChange={setWalkthroughMode} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={walkthroughRooms.length === 0}
                  onClick={() =>
                    setWalkthroughIndex((prev) =>
                      walkthroughRooms.length === 0 ? 0 : (prev - 1 + walkthroughRooms.length) % walkthroughRooms.length,
                    )
                  }
                >
                  Prev Room
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={walkthroughRooms.length === 0}
                  onClick={() =>
                    setWalkthroughIndex((prev) =>
                      walkthroughRooms.length === 0 ? 0 : (prev + 1) % walkthroughRooms.length,
                    )
                  }
                >
                  Next Room
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {walkthroughRooms.length > 0
                  ? `Touring ${walkthroughRooms.length} room(s). Camera auto-hops every few seconds.`
                  : "Add non-stair rooms to start walkthrough."}
              </p>
            </div>

            <div className="space-y-2 order-8">
              <div className="flex items-center justify-between">
                <Label>Render Quality</Label>
                <span className="text-xs text-muted-foreground">{getRenderQualityLabel(renderQuality[0])}</span>
              </div>
              <Slider value={renderQuality} min={0} max={100} step={1} onValueChange={setRenderQuality} />
              <p className="text-xs text-muted-foreground">Higher quality increases shadow/detail cost.</p>
            </div>

            <div className="space-y-2 rounded-md border p-3 order-9">
              <p className="text-sm font-semibold">5. Generate 3D Button</p>
              <Button onClick={() => { void generateHdPreview() }} disabled={generatingPreview || !canGeneratePromptPreview} className="w-full">
                {generatingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate 3D Preview
              </Button>
              {!canGeneratePromptPreview && <p className="text-xs text-amber-700">{previewGenerationBlockedMessage}</p>}
            </div>

            <Separator className="order-10" />

            <div className="space-y-2 order-11">
              <Label className="flex items-center gap-2">
                <Move className="h-4 w-4" />
                Selected Room
              </Label>
              {!selectedRoom ? (
                <p className="text-sm text-muted-foreground">Click any room in 3D viewport to edit and drag.</p>
              ) : (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">
                    {selectedRoom.type} | Floor {selectedRoom.floor + 1}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedRoom.type}
                      onChange={(event) => updateSelectedRoomType(event.target.value as RoomType)}
                      className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      {ROOM_TYPE_OPTIONS.map((type) => (
                        <option key={`room-type-option-${type}`} value={type}>{type}</option>
                      ))}
                    </select>
                    <select
                      value={selectedRoom.floor}
                      onChange={(event) => updateSelectedRoomFloor(Number.parseInt(event.target.value, 10))}
                      className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      {floorsArray.map((floor) => (
                        <option key={`room-floor-option-${floor}`} value={floor}>{`Floor ${floor + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="number" value={selectedRoom.w} onChange={(event) => updateSelectedRoomDimension("w", Number.parseFloat(event.target.value))} />
                    <Input type="number" value={selectedRoom.l} onChange={(event) => updateSelectedRoomDimension("l", Number.parseFloat(event.target.value))} />
                    <Input type="number" value={selectedRoom.h} onChange={(event) => updateSelectedRoomDimension("h", Number.parseFloat(event.target.value))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={(selectedRoom.doorWidth ?? 0.95).toFixed(2)}
                      onChange={(event) => updateSelectedOpening("doorWidth", Number.parseFloat(event.target.value))}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={(selectedRoom.windowWidth ?? 1.2).toFixed(2)}
                      onChange={(event) => updateSelectedOpening("windowWidth", Number.parseFloat(event.target.value))}
                      disabled={!selectedRoom.hasWindow}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Window Available</Label>
                    <Switch
                      checked={selectedRoom.hasWindow}
                      onCheckedChange={(checked) => updateRoom(selectedRoom.id, { hasWindow: checked })}
                      disabled={selectedRoom.type === "Stairs" || selectedRoom.type === "Parking" || selectedRoom.type === "Garden" || selectedRoom.type === "Balcony"}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Inputs: width, length, height, door, window (ft)</p>
                  {vastuEnabled && (
                    <p className="text-xs text-muted-foreground">
                      Direction: <span className="font-medium">{vastuReport.roomDirections.get(selectedRoom.id) ?? "Center"}</span>
                    </p>
                  )}
                  {collidingRoomIds.has(selectedRoom.id) && (
                    <p className="text-xs text-destructive">Overlap detected. Move this room to avoid collision.</p>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeRoom(selectedRoom.id)}>
                    Remove Room
                  </Button>
                </div>
              )}
            </div>
            </fieldset>
          </CardContent>
        </Card>

        <Card className="xl:col-span-8 overflow-hidden self-start">
          <CardHeader>
            <CardTitle>3D Multi-Floor View</CardTitle>
          <CardDescription>Drag rooms to adjust layout. Floors stack automatically after requirement validation.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-[520px] max-h-[520px] overflow-hidden" ref={viewportCardRef}>
            {canRender3dPreview ? (
              <Canvas camera={{ position: [36, 28, 32], fov: 45 }} shadows dpr={[1, effectiveRenderDpr]} gl={{ preserveDrawingBuffer: true }}>
                <color attach="background" args={[lightingConfig.background]} />
                <WalkthroughCameraRig enabled={walkthroughMode} target={walkthroughTarget} />
                <SceneCameraRig enabled={!walkthroughMode && cameraPreset !== "default"} preset={cameraPreset} plotFacing={plotFacing} plotLength={plot.length} plotWidth={plot.width} />
                <ambientLight intensity={lightingConfig.ambient} />
                <directionalLight castShadow intensity={lightingConfig.directional} position={lightingConfig.directionalPos} shadow-mapSize-width={effectiveShadowMapSize} shadow-mapSize-height={effectiveShadowMapSize} />
                <Suspense fallback={null}>
                  <Environment preset={lightingConfig.env} />
                  {presentationMode ? (
                    <Float speed={1.4} rotationIntensity={0.06} floatIntensity={0.14}>{plannerSceneGroup}</Float>
                  ) : (
                    plannerSceneGroup
                  )}
                  <ContactShadows position={[0, -0.02, 0]} opacity={isRoomInteracting ? 0.25 : 0.5} scale={Math.max(plot.length, plot.width) + 18} blur={effectiveContactShadowBlur} far={8} />
                </Suspense>
                <OrbitControls
                  enabled={!walkthroughMode}
                  enablePan
                  enableZoom
                  enableRotate
                  maxPolarAngle={Math.PI / 2.02}
                  onStart={() => {
                    if (cameraPreset !== "default") {
                      setCameraPreset("default")
                    }
                  }}
                />
                <gridHelper args={[160, 80, "#94a3b8", "#e2e8f0"]} />
              </Canvas>
            ) : (
              <div className="h-full w-full grid place-items-center bg-slate-50 px-6 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium">3D Preview Locked Until Requirements Are Clear</p>
                  <p className="text-xs text-muted-foreground">{previewBlockedMessage}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI HD Preview Prompt</CardTitle>
          <CardDescription>Set prompt cues for AI still image and walkthrough generation from current validated layout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Preview Prompt</Label>
              <Input
                value={previewPrompt}
                onChange={(event) => setPreviewPrompt(event.target.value)}
                placeholder="Modern Indian villa exterior with warm evening light"
              />
            </div>
            <div className="space-y-1">
              <Label>Walkthrough Voice Cue</Label>
              <Input
                value={tourCue}
                onChange={(event) => setTourCue(event.target.value)}
                placeholder="Show me balcony view and then master bedroom"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { void generateHdPreview() }} disabled={generatingPreview || !canGeneratePromptPreview}>
              {generatingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate HD Preview
            </Button>
            <Button variant="outline" onClick={generateWalkthrough} disabled={generatingTour || !canRender3dPreview}>
              {generatingTour ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
              Generate AI Tour
            </Button>
          </div>
          {!canGeneratePromptPreview && <p className="text-xs text-amber-700">{previewGenerationBlockedMessage}</p>}
          {aiStatus && <p className="text-xs text-muted-foreground">{aiStatus}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Visualization Studio
          </CardTitle>
          <CardDescription>Generate photoreal preview images and request guided walkthrough videos from your current layout.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">HD Preview</p>
            {previewImageUrl ? (
              <div className="relative w-full h-64 rounded-md border overflow-hidden bg-slate-50">
                <Image
                  src={previewImageUrl || "/placeholder.jpg"}
                  alt="AI generated blueprint preview"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  unoptimized={previewImageUrl.startsWith("data:")}
                />
              </div>
            ) : (
              <div className="h-64 rounded-md border grid place-items-center text-sm text-muted-foreground">
                No image generated yet.
              </div>
            )}
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Immersive Tour</p>
            {tourVideoUrl ? (
              <video src={tourVideoUrl} controls className="w-full h-64 rounded-md border bg-black" />
            ) : (
              <div className="h-64 rounded-md border grid place-items-center text-sm text-muted-foreground">
                Video not ready. Use AI Tour to request a walkthrough.
              </div>
            )}
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Floor Map Preview</p>
            {effectiveFloorMapImageUrl ? (
              <div className="relative w-full h-[20rem] md:h-[22rem] rounded-md border overflow-hidden bg-slate-50">
                <Image
                  src={effectiveFloorMapImageUrl}
                  alt="2D floor map with room dimensions"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  unoptimized
                />
              </div>
            ) : (
              <div className="h-[20rem] md:h-[22rem] rounded-md border grid place-items-center text-sm text-muted-foreground">
                Floor map not available.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Compliance Check
          </CardTitle>
          <CardDescription>Municipality-wise bye-law guardrail for setbacks, FSI, plot coverage, and building height.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 space-y-1">
              <Label>City / Municipality</Label>
              <select
                value={selectedMunicipalityId}
                onChange={(event) => setSelectedMunicipalityId(event.target.value)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                {MUNICIPALITY_RULES.map((rule) => (
                  <option key={rule.id} value={rule.id}>{rule.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{`${selectedMunicipalityRule.authority} bye-law pack | Loaded: ${new Date(complianceRulesAsOf).toLocaleString()}`}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Municipal Score</p>
              <p className="text-2xl font-semibold">{municipalityCompliance.score}/100</p>
              <Badge
                variant={
                  municipalityCompliance.status === "PASS"
                    ? "secondary"
                    : municipalityCompliance.status === "REVIEW"
                      ? "outline"
                      : "destructive"
                }
              >
                {municipalityCompliance.status}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">FSI Used</p>
              <p className="font-semibold">{municipalityCompliance.metrics.fsi.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{`Max ${selectedMunicipalityRule.maxFsi.toFixed(2)}`}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Ground Coverage</p>
              <p className="font-semibold">{municipalityCompliance.metrics.coveragePercent.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{`Max ${selectedMunicipalityRule.maxCoveragePercent.toFixed(1)}%`}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Building Height</p>
              <p className="font-semibold">{municipalityCompliance.metrics.buildingHeightFt.toFixed(1)} ft</p>
              <p className="text-xs text-muted-foreground">{`Max ${selectedMunicipalityRule.maxHeightFt.toFixed(1)} ft`}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Setbacks (F/R/S)</p>
              <p className="font-semibold">
                {`${municipalityCompliance.metrics.frontSetbackFt.toFixed(1)} / ${municipalityCompliance.metrics.rearSetbackFt.toFixed(1)} / ${municipalityCompliance.metrics.sideSetbackFt.toFixed(1)} ft`}
              </p>
              <p className="text-xs text-muted-foreground">
                {`Req ${selectedMunicipalityRule.minFrontSetbackFt}/${selectedMunicipalityRule.minRearSetbackFt}/${selectedMunicipalityRule.minSideSetbackFt} ft`}
              </p>
            </div>
          </div>

          {regulatoryViolations.length > 0 ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 space-y-1 text-sm">
              <p className="font-medium text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Regulatory Violations
              </p>
              {regulatoryViolations.map((violation) => (
                <p key={violation.id} className="text-rose-700">{`${violation.label}: ${violation.detail} Fix: ${violation.fix}`}</p>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              No municipal red flags detected for current geometry and selected city rule pack.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Real-Time Engineering Table
          </CardTitle>
          <CardDescription>Floor-wise area, staircase deduction, perimeter, and volume sync.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Vastu Score Meter</p>
              <p className="text-2xl font-semibold">{vastuEnabled ? `${vastuReport.score}/100` : "Disabled"}</p>
              <Progress value={vastuEnabled ? vastuReport.score : 0} />
              <p className="text-xs text-muted-foreground">{vastuEnabled ? vastuInsight : "Enable Vastu mode for directional guidance."}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Plot Facing</p>
              <p className="text-lg font-semibold">{plotFacing}</p>
            </div>
            <VastuCompass facing={plotFacing} roomDirections={vastuReport.roomDirections} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-semibold">Phase 1 Civil Inputs</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Soil Class</Label>
                  <select
                    value={civilInputs.soilClass}
                    onChange={(event) => setCivilInputs((prev) => ({ ...prev, soilClass: event.target.value as CivilInputs["soilClass"] }))}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="Rock">Rock</option>
                    <option value="Dense">Dense</option>
                    <option value="Medium">Medium</option>
                    <option value="Soft">Soft</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>SBC (kN/m2)</Label>
                  <Input
                    type="number"
                    value={civilInputs.safeBearingCapacity}
                    onChange={(event) =>
                      setCivilInputs((prev) => ({ ...prev, safeBearingCapacity: clamp(Number.parseFloat(event.target.value), 60, 500) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Seismic Zone</Label>
                  <select
                    value={civilInputs.seismicZone}
                    onChange={(event) => setCivilInputs((prev) => ({ ...prev, seismicZone: event.target.value as CivilInputs["seismicZone"] }))}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                    <option value="V">V</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Wind Speed (m/s)</Label>
                  <Input
                    type="number"
                    value={civilInputs.basicWindSpeed}
                    onChange={(event) =>
                      setCivilInputs((prev) => ({ ...prev, basicWindSpeed: clamp(Number.parseFloat(event.target.value), 30, 70) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Groundwater Depth (ft)</Label>
                  <Input
                    type="number"
                    value={civilInputs.groundwaterDepth}
                    onChange={(event) =>
                      setCivilInputs((prev) => ({ ...prev, groundwaterDepth: clamp(Number.parseFloat(event.target.value), 2, 60) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Concrete / Steel</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={civilInputs.concreteGrade}
                      onChange={(event) => setCivilInputs((prev) => ({ ...prev, concreteGrade: event.target.value as CivilInputs["concreteGrade"] }))}
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="M20">M20</option>
                      <option value="M25">M25</option>
                      <option value="M30">M30</option>
                    </select>
                    <select
                      value={civilInputs.steelGrade}
                      onChange={(event) => setCivilInputs((prev) => ({ ...prev, steelGrade: event.target.value as CivilInputs["steelGrade"] }))}
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="Fe415">Fe415</option>
                      <option value="Fe500">Fe500</option>
                      <option value="Fe550">Fe550</option>
                    </select>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Structural pre-check updates live from these inputs. Final member sizing still needs licensed engineer approval.
              </p>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Structural Pre-Check</p>
                  <p className="text-2xl font-semibold">{structuralPrecheck.score}/100</p>
                  <Badge variant={structuralPrecheck.status === "PASS" ? "secondary" : structuralPrecheck.status === "REVIEW" ? "outline" : "destructive"}>
                    {structuralPrecheck.status}
                  </Badge>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Code Compliance</p>
                  <p className="text-2xl font-semibold">{complianceReport.score}/100</p>
                  <Badge variant={complianceReport.status === "PASS" ? "secondary" : complianceReport.status === "REVIEW" ? "outline" : "destructive"}>
                    {complianceReport.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>Max Span: <span className="font-medium">{structuralPrecheck.maxSpanFt.toFixed(1)} ft</span></p>
                <p>Design Load: <span className="font-medium">{structuralPrecheck.designLoadkNPerSqM.toFixed(2)} kN/m2</span></p>
                <p>Beam Depth: <span className="font-medium">{structuralPrecheck.suggestedBeamDepthM.toFixed(2)} m</span></p>
                <p>Column Size: <span className="font-medium">{structuralPrecheck.suggestedColumnSizeMm} mm</span></p>
              </div>
            </div>
          </div>

          {(collidingRoomIds.size > 0 || ventilationIssues.length > 0 || vastuWarnings.length > 0 || structuralPrecheck.status !== "PASS" || complianceReport.status !== "PASS" || regulatoryViolations.length > 0) && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1 text-sm">
              <p className="font-medium text-amber-900">
                {ventilationIssues.length > 0 ? "Incomplete Design" : "Design Warnings"}
              </p>
              <div className="pt-1 pb-2">
                <Button size="sm" variant="secondary" onClick={autoFixVastuLayout}>
                  Auto-Fix As Per Vastu
                </Button>
              </div>
              {Array.from(collidingRoomIds).slice(0, 4).map((roomId) => (
                <p key={`collision-${roomId}`} className="text-amber-800">{`Room ${roomId} overlaps with another room.`}</p>
              ))}
              {ventilationIssues.map((warning) => (
                <p key={warning} className="text-amber-800">{warning}</p>
              ))}
              {vastuWarnings.map((warning) => (
                <p key={warning} className="text-amber-800">{warning}</p>
              ))}
              {structuralPrecheck.checks.filter((check) => check.status !== "pass").map((check) => (
                <p key={`struct-${check.id}`} className="text-amber-800">{`${check.label}: ${check.detail}`}</p>
              ))}
              {complianceReport.checks.filter((check) => check.status !== "pass").map((check) => (
                <p key={`code-${check.id}`} className="text-amber-800">{`${check.label}: ${check.detail}`}</p>
              ))}
              {regulatoryViolations.map((violation) => (
                <p key={`municipal-${violation.id}`} className="text-rose-700">{`${violation.label}: ${violation.detail} Fix: ${violation.fix}`}</p>
              ))}
              {vastuReport.positives.map((positive) => (
                <p key={positive} className="text-emerald-700">{positive}</p>
              ))}
              {structuralPrecheck.recommendations.map((tip) => (
                <p key={tip} className="text-emerald-700">{tip}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {floorStats.map((stats) => (
              <div key={`stats-floor-${stats.floor}`} className="rounded-md border p-3 text-sm space-y-1">
                <p className="font-semibold">{`Floor ${stats.floor + 1}`}</p>
                <p>Room Area: <span className="font-medium">{stats.totalRoomArea.toFixed(1)} sq ft</span></p>
                <p>Stair Area: <span className="font-medium">{stats.stairsArea.toFixed(1)} sq ft</span></p>
                <p>Usable Area: <span className="font-medium">{stats.usableArea.toFixed(1)} sq ft</span></p>
                <p>Perimeter: <span className="font-medium">{stats.perimeter.toFixed(1)} ft</span></p>
                <p>Volume: <span className="font-medium">{stats.volume.toFixed(1)} cu ft</span></p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Gross Area</p>
              <p className="text-lg font-semibold">{totalStats.gross.toFixed(1)} sq ft</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Staircase Space</p>
              <p className="text-lg font-semibold">{totalStats.stairs.toFixed(1)} sq ft</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Net Usable Area</p>
              <p className="text-lg font-semibold">{totalStats.usable.toFixed(1)} sq ft</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Volume</p>
              <p className="text-lg font-semibold">{totalStats.volume.toFixed(1)} cu ft</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Carpet Area</p>
              <p className="text-lg font-semibold">{totalStats.carpetArea.toFixed(1)} sq ft</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Built-up Area</p>
              <p className="text-lg font-semibold">{totalStats.builtUpArea.toFixed(1)} sq ft</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Super Built-up Area</p>
              <p className="text-lg font-semibold">{totalStats.superBuiltUpArea.toFixed(1)} sq ft</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Outer Wall Area</p>
              <p className="text-lg font-semibold">{totalStats.netOuterWallArea.toFixed(1)} sq ft</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Estimated Bricks</p>
              <p className="text-lg font-semibold">{Math.round(totalStats.brickEstimate).toLocaleString()}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Paint Requirement</p>
              <p className="text-lg font-semibold">{totalStats.paintLiters.toFixed(1)} L</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Plumbing Efficiency Bonus</p>
              <p className="text-lg font-semibold">{plumbingBonus.bonusPercent}%</p>
              <p className="text-xs text-muted-foreground">{plumbingBonus.stackedPairs} stacked wet-area pairs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Bricks Cost</p>
              <p className="text-lg font-semibold">{formatInr(boqCost.bricksCost)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Cement Cost</p>
              <p className="text-lg font-semibold">{formatInr(boqCost.cementCost)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Sand Cost</p>
              <p className="text-lg font-semibold">{formatInr(boqCost.sandCost)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Steel Cost</p>
              <p className="text-lg font-semibold">{formatInr(boqCost.steelCost)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Estimated Material Total</p>
              <p className="text-lg font-semibold">{formatInr(boqCost.total)}</p>
            </div>
          </div>

          {floorWiseCost.length > 0 && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {floorWiseCost.map((item) => (
                  <div key={`cost-floor-${item.floor}`} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{`Floor ${item.floor + 1} Estimated Cost`}</p>
                    <p className="text-lg font-semibold">{formatInr(item.cost)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
