import type { UserRole } from "@/lib/auth"
import { prisma } from "@/lib/server/prisma"

export type StoredUser = {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string | null
  verified: boolean
  createdAt: string
  passwordHash: string
}

let userTableReady = false

async function ensureUserTable() {
  if (userTableReady) return

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'buyer',
      "avatar" TEXT,
      "verified" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`)
  userTableReady = true
}

function mapUser(user: {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string | null
  verified: boolean
  createdAt: Date
  passwordHash: string
}): StoredUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    verified: user.verified,
    createdAt: user.createdAt.toISOString(),
    passwordHash: user.passwordHash,
  }
}

export async function listUsers() {
  await ensureUserTable()
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  })
  return users.map((user) => mapUser(user))
}

export async function findUserByEmail(email: string) {
  await ensureUserTable()
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  })
  return user ? mapUser(user) : null
}

export async function findUserByIdentifier(identifier: string) {
  await ensureUserTable()
  const normalized = identifier.trim().toLowerCase()
  if (!normalized) return null

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalized }, { name: normalized }, { id: normalized }],
    },
  })

  return user ? mapUser(user) : null
}

export async function findUserById(id: string) {
  await ensureUserTable()
  const user = await prisma.user.findUnique({ where: { id } })
  return user ? mapUser(user) : null
}

export async function createUser(input: {
  name: string
  email: string
  role: UserRole
  passwordHash: string
}) {
  await ensureUserTable()
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      passwordHash: input.passwordHash,
      verified: false,
      avatar: null,
    },
  })

  return mapUser(user)
}

export async function updateUserByEmail(
  email: string,
  updates: Partial<Pick<StoredUser, "name" | "role" | "passwordHash" | "verified" | "avatar">>,
) {
  await ensureUserTable()
  const normalized = email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email: normalized } })
  if (!existing) return null

  const user = await prisma.user.update({
    where: { email: normalized },
    data: {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.role !== undefined ? { role: updates.role } : {}),
      ...(updates.passwordHash !== undefined ? { passwordHash: updates.passwordHash } : {}),
      ...(updates.verified !== undefined ? { verified: updates.verified } : {}),
      ...(updates.avatar !== undefined ? { avatar: updates.avatar } : {}),
    },
  })

  return mapUser(user)
}
