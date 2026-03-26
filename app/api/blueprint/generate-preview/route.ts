import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { getGeminiConfig } from "@/lib/server/env"

const requestSchema = z.object({
  prompt: z.string().optional().default(""),
  quality: z.enum(["draft", "balanced", "ultra"]).default("balanced"),
  layout: z.object({
    totalSqFt: z.number(),
    floors: z.number(),
    plotFacing: z.string(),
    wallMaterial: z.string(),
    floorMaterial: z.string(),
    vastuEnabled: z.boolean(),
    vastuScore: z.number(),
    rooms: z.array(
      z.object({
        type: z.string(),
        floor: z.number(),
        width: z.number(),
        length: z.number(),
        hasWindow: z.boolean(),
      }),
    ),
  }),
})

type ListModelsResponse = {
  models?: Array<{
    name?: string
    supportedGenerationMethods?: string[]
  }>
}

function buildPrompt(input: z.infer<typeof requestSchema>) {
  const roomSummary = input.layout.rooms
    .slice(0, 14)
    .map((room) => `Floor ${room.floor} ${room.type} ${room.width}x${room.length}ft ${room.hasWindow ? "windowed" : "no-window"}`)
    .join("; ")

  const extra = input.prompt.trim() ? ` User intent: ${input.prompt.trim()}.` : ""
  return [
    "Create a photorealistic architectural visualization for an Indian residential project.",
    `Quality: ${input.quality}. Built-up: ${input.layout.totalSqFt} sq ft. Floors: ${input.layout.floors}.`,
    `Plot facing: ${input.layout.plotFacing}. Wall material: ${input.layout.wallMaterial}. Floor finish: ${input.layout.floorMaterial}.`,
    `Vastu enabled: ${input.layout.vastuEnabled ? "yes" : "no"} (score ${input.layout.vastuScore}/100).`,
    `Layout rooms: ${roomSummary}.`,
    "Use realistic daylight, physically accurate materials, and grounded contact shadows under furniture.",
    extra,
  ]
    .join(" ")
    .trim()
}

function normalizeModelName(name: string) {
  return name.startsWith("models/") ? name : `models/${name}`
}

async function listGenerateModels(apiKey: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  const response = await fetch(endpoint, { method: "GET" })
  if (!response.ok) return []
  const data = (await response.json()) as ListModelsResponse
  return (data.models || [])
    .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
    .map((model) => model.name || "")
    .filter(Boolean)
}

async function tryModel(apiKey: string, modelName: string, prompt: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${normalizeModelName(modelName)}:generateContent?key=${apiKey}`
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  })

  const raw = await response.text()
  if (!response.ok) {
    return { imageUrl: null as string | null, error: `Model ${modelName} failed (${response.status}): ${raw.slice(0, 180)}` }
  }

  let parsed: any = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { imageUrl: null as string | null, error: `Model ${modelName} returned non-JSON response.` }
  }

  const parts: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> =
    parsed?.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((part) => part.inlineData?.data)
  if (!imagePart?.inlineData?.data) {
    return { imageUrl: null as string | null, error: `Model ${modelName} returned no image bytes.` }
  }

  const mime = imagePart.inlineData.mimeType || "image/png"
  return { imageUrl: `data:${mime};base64,${imagePart.inlineData.data}`, error: null as string | null }
}

async function generateWithGemini(prompt: string) {
  const { apiKey, imageModel } = getGeminiConfig()
  if (!apiKey) {
    return { imageUrl: null as string | null, error: "GEMINI_API_KEY is missing on server." }
  }

  const discovered = await listGenerateModels(apiKey)
  const discoveredImageModels = discovered.filter((name) => /image|imagen/i.test(name))
  const preferred = [
    imageModel,
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-preview-image-generation",
    "imagen-3.0-generate-002",
    "imagen-4.0-generate-001",
  ].filter(Boolean)

  const candidates = discoveredImageModels.length > 0
    ? Array.from(
      new Set([
        ...preferred.map(normalizeModelName),
        ...discoveredImageModels.map(normalizeModelName),
      ]),
    )
    : Array.from(
    new Set([
      ...preferred.map(normalizeModelName),
      ...discovered.map(normalizeModelName),
    ]),
    )

  const errors: string[] = []
  for (const model of candidates.slice(0, 10)) {
    const result = await tryModel(apiKey, model, prompt)
    if (result.imageUrl) {
      return { imageUrl: result.imageUrl, model, error: null as string | null }
    }
    errors.push(result.error || `Unknown error in ${model}`)
  }

  return {
    imageUrl: null as string | null,
    model: null as string | null,
    error:
      discoveredImageModels.length === 0
        ? "No image-capable Gemini model is available for this API key/region/tier. Use local snapshot fallback or enable a supported image model."
        : `No compatible image model succeeded. ${errors.slice(0, 3).join(" | ")}`,
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      )
    }

    const payload = requestSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json({ error: "Invalid preview request payload" }, { status: 400 })
    }

    const finalPrompt = buildPrompt(payload.data)
    const result = await generateWithGemini(finalPrompt)

    if (!result.imageUrl) {
      return NextResponse.json(
        {
          imageUrl: null,
          error: result.error || "Could not generate image preview.",
          fallback: true,
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      )
    }

    return NextResponse.json(
      {
        imageUrl: result.imageUrl,
        message: `HD preview generated using ${result.model || "Gemini"}.`,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    )
  } catch {
    return NextResponse.json({ error: "Preview generation failed" }, { status: 500 })
  }
}
