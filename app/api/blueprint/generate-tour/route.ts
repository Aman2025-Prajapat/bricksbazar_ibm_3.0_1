import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"

const requestSchema = z.object({
  cue: z.string().optional().default(""),
  quality: z.enum(["draft", "balanced", "ultra"]).default("balanced"),
  layout: z.object({
    totalSqFt: z.number(),
    floors: z.number(),
    plotFacing: z.string(),
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
      return NextResponse.json({ error: "Invalid tour request payload" }, { status: 400 })
    }

    const cue = payload.data.cue.trim() || "Show key elevations and primary living spaces"
    const roomHighlights = payload.data.layout.rooms
      .slice(0, 10)
      .map((room) => `F${room.floor}-${room.type}`)
      .join(", ")

    const providerUrl = process.env.VEO_PROVIDER_URL
    const providerKey = process.env.VEO_PROVIDER_API_KEY

    if (!providerUrl || !providerKey) {
      return NextResponse.json(
        {
          error: "AI Tour provider not configured. Set VEO_PROVIDER_URL and VEO_PROVIDER_API_KEY.",
          message: `Cue captured: "${cue}". Highlights: ${roomHighlights}.`,
          videoUrl: null,
          fallback: true,
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      )
    }

    const providerResponse = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${providerKey}`,
      },
      body: JSON.stringify({
        cue,
        quality: payload.data.quality,
        layout: payload.data.layout,
      }),
    })

    const providerData = (await providerResponse.json().catch(() => ({}))) as {
      videoUrl?: string
      message?: string
      jobId?: string
      error?: string
    }

    if (!providerResponse.ok) {
      return NextResponse.json(
        {
          error: providerData.error || "AI Tour provider request failed.",
          videoUrl: null,
          fallback: true,
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
      )
    }

    return NextResponse.json(
      {
        videoUrl: providerData.videoUrl || null,
        jobId: providerData.jobId || null,
        message: providerData.message || "AI Tour request accepted by provider.",
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    )
  } catch {
    return NextResponse.json({ error: "Tour generation failed" }, { status: 500 })
  }
}
