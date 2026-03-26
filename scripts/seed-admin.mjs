import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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
  const email = normalizeEmail(process.env.ADMIN_EMAIL || "admin@bricksbazar.com")
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
