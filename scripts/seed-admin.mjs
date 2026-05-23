import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import fs from "node:fs"
import path from "node:path"

const prisma = new PrismaClient()

function loadDotEnvIfNeeded() {
  if (process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD) return
  const envPath = path.join(process.cwd(), ".env")
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, "utf-8")
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const idx = trimmed.indexOf("=")
    if (idx <= 0) return
    const key = trimmed.slice(0, idx).trim()
    const valueRaw = trimmed.slice(idx + 1).trim()
    const unquoted =
      (valueRaw.startsWith("\"") && valueRaw.endsWith("\"")) ||
      (valueRaw.startsWith("'") && valueRaw.endsWith("'"))
        ? valueRaw.slice(1, -1)
        : valueRaw
    if (!process.env[key]) {
      process.env[key] = unquoted
    }
  })
}

loadDotEnvIfNeeded()

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function isStrongPassword(password) {
  return (
    password.length >= 10 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

async function main() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || "")
  const name = String(process.env.ADMIN_NAME || "Admin").trim() || "Admin"
  const password = String(process.env.ADMIN_PASSWORD || "")

  if (!email || !email.includes("@")) {
    throw new Error("ADMIN_EMAIL is invalid")
  }
  if (!isStrongPassword(password)) {
    throw new Error("ADMIN_PASSWORD must be 10+ chars with letter, number, and special char")
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: "admin",
      passwordHash,
      verified: true,
    },
    create: {
      email,
      name,
      role: "admin",
      passwordHash,
      verified: true,
    },
  })

  console.log(`Admin ready: ${user.email} (${user.role})`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
