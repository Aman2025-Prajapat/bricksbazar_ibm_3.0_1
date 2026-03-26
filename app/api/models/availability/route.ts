import { NextResponse } from "next/server"
import { access } from "fs/promises"
import path from "path"

export const runtime = "nodejs"

const MODEL_FILES = {
  frontDoor: "front-gate-door.glb",
  livingRoom: "living-room.glb",
  kitchenRoom: "kitchen-room.glb",
  bathroomRoom: "bathroom-room.glb",
  poojaRoom: "pooja-room.glb",
  stairsRoom: "stairs-room.glb",
  sofa: "sofa.glb",
  bed: "bed.glb",
  sink: "sink.glb",
  toilet: "toilet.glb",
  door: "door-frame.glb",
  window: "window-frame.glb",
} as const

async function fileExists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function GET() {
  const modelsDir = path.join(process.cwd(), "public", "models")

  const checks = await Promise.all(
    Object.entries(MODEL_FILES).map(async ([key, fileName]) => {
      const exists = await fileExists(path.join(modelsDir, fileName))
      return [key, exists] as const
    }),
  )

  const models = Object.fromEntries(checks)
  return NextResponse.json({ models }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } })
}
