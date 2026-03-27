import path from "node:path"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import { getDeliveryById } from "@/lib/server/market-store"

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function detectImageExtension(buffer: Uint8Array): "png" | "jpg" | "webp" | null {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png"
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg"
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp"
  }
  return null
}

export async function POST(request: Request, { params }: { params: { deliveryId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const delivery = await getDeliveryById(params.deliveryId)
  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
  }

  const canUpload =
    sessionUser.role === "admin" ||
    sessionUser.role === "distributor" ||
    (sessionUser.role === "seller" && delivery.sellerId === sessionUser.userId)

  if (!canUpload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const image = formData.get("image")
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 })
  }

  if (image.size <= 0 || image.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File size must be between 1 byte and 5MB" }, { status: 400 })
  }

  const bytes = new Uint8Array(await image.arrayBuffer())
  const ext = detectImageExtension(bytes)
  if (!ext) {
    return NextResponse.json({ error: "Only PNG, JPG and WEBP images are allowed" }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "pod")
  await mkdir(uploadDir, { recursive: true })

  const fileName = `${params.deliveryId}-${randomUUID()}.${ext}`
  const filePath = path.join(uploadDir, fileName)
  await writeFile(filePath, bytes)

  return NextResponse.json({
    podImageUrl: `/uploads/pod/${fileName}`,
    fileName,
    size: image.size,
  })
}
