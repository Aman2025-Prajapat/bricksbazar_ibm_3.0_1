import crypto from "node:crypto"
import bcrypt from "bcryptjs"
import type { UserRole } from "@/lib/auth"
import { prisma } from "@/lib/server/prisma"

export type VerificationRequestRole = "seller" | "distributor"
export type VerificationRequestStatus = "pending" | "approved" | "rejected"

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

export type VerificationRequestInput = {
  userId: string
  requestedRole: VerificationRequestRole
  businessName: string
  contactPhone: string
  businessAddress: string
  city: string
  state: string
  pincode: string
  gstNumber?: string
  idProofType: string
  idProofNumber: string
}

export type StoredVerificationRequest = {
  id: string
  userId: string
  requestedRole: VerificationRequestRole
  businessName: string
  contactPhone: string
  businessAddress: string
  city: string
  state: string
  pincode: string
  gstNumber?: string
  idProofType: string
  idProofNumber: string
  status: VerificationRequestStatus
  adminNotes?: string
  reviewedAt?: string
  reviewedBy?: string
  createdAt: string
  updatedAt: string
}

let userTableReady = false
let verificationTableReady = false
let defaultAdminReady = false

function isTrue(value: string | undefined) {
  const normalized = (value || "").trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

function isStrongPassword(password: string) {
  return (
    password.length >= 10 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

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

async function ensureVerificationTable() {
  if (verificationTableReady) return

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_verification_requests (
      id TEXT NOT NULL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      requested_role TEXT NOT NULL,
      business_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      business_address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      gst_number TEXT,
      id_proof_type TEXT NOT NULL,
      id_proof_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_notes TEXT,
      reviewed_at DATETIME,
      reviewed_by TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS market_verification_requests_status_idx ON market_verification_requests(status)",
  )
  verificationTableReady = true
}

async function ensureUserStoreTables() {
  await ensureUserTable()
  await ensureVerificationTable()
  await ensureDefaultAdminAccount()
}

async function ensureDefaultAdminAccount() {
  if (defaultAdminReady) return

  // Auto-seeding admin at runtime is disabled by default for safety.
  // Enable explicitly only in controlled environments.
  if (!isTrue(process.env.AUTO_SEED_ADMIN_ON_BOOT)) {
    return
  }

  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase()
  const password = String(process.env.ADMIN_PASSWORD || "").trim()
  if (!email || !email.includes("@") || !isStrongPassword(password)) {
    // Skip bootstrapping when admin email/password is missing or weak.
    return
  }

  const name = String(process.env.ADMIN_NAME || "Admin").trim() || "Admin"
  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.upsert({
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

  defaultAdminReady = true
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

type VerificationRequestRow = {
  id: string
  user_id: string
  requested_role: VerificationRequestRole
  business_name: string
  contact_phone: string
  business_address: string
  city: string
  state: string
  pincode: string
  gst_number: string | null
  id_proof_type: string
  id_proof_number: string
  status: VerificationRequestStatus
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

function mapVerificationRequest(row: VerificationRequestRow): StoredVerificationRequest {
  return {
    id: row.id,
    userId: row.user_id,
    requestedRole: row.requested_role,
    businessName: row.business_name,
    contactPhone: row.contact_phone,
    businessAddress: row.business_address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    gstNumber: row.gst_number ?? undefined,
    idProofType: row.id_proof_type,
    idProofNumber: row.id_proof_number,
    status: row.status,
    adminNotes: row.admin_notes ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listUsers() {
  await ensureUserStoreTables()
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  })
  return users.map((user) => mapUser(user))
}

export async function findUserByEmail(email: string) {
  await ensureUserStoreTables()
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  })
  return user ? mapUser(user) : null
}

export async function findUserByIdentifier(identifier: string) {
  await ensureUserStoreTables()
  const raw = identifier.trim()
  const normalized = raw.toLowerCase()
  if (!normalized) return null

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalized }, { id: raw }, { name: raw }],
    },
  })

  if (user) {
    return mapUser(user)
  }

  const byCaseInsensitiveName = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "User" WHERE lower(name) = lower(?) LIMIT 1`,
    raw,
  )
  if (byCaseInsensitiveName.length === 0) {
    return null
  }

  return findUserById(byCaseInsensitiveName[0].id)
}

export async function findUserById(id: string) {
  await ensureUserStoreTables()
  const user = await prisma.user.findUnique({ where: { id } })
  return user ? mapUser(user) : null
}

export async function getUserVerificationMapByIds(userIds: string[]) {
  await ensureUserStoreTables()
  const uniqueIds = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)))
  if (uniqueIds.length === 0) {
    return new Map<string, boolean>()
  }

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, verified: true },
  })

  const map = new Map<string, boolean>()
  uniqueIds.forEach((id) => map.set(id, false))
  users.forEach((user) => {
    map.set(user.id, user.verified)
  })
  return map
}

export async function createUser(input: {
  name: string
  email: string
  role: UserRole
  passwordHash: string
}) {
  await ensureUserStoreTables()
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      passwordHash: input.passwordHash,
      verified: input.role === "buyer",
      avatar: null,
    },
  })

  return mapUser(user)
}

export async function updateUserByEmail(
  email: string,
  updates: Partial<Pick<StoredUser, "name" | "role" | "passwordHash" | "verified" | "avatar">>,
) {
  await ensureUserStoreTables()
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

export async function updateUserById(
  userId: string,
  updates: Partial<Pick<StoredUser, "name" | "role" | "passwordHash" | "verified" | "avatar">>,
) {
  await ensureUserStoreTables()
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) return null

  const user = await prisma.user.update({
    where: { id: userId },
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

export async function createOrUpdateVerificationRequest(input: VerificationRequestInput) {
  await ensureUserStoreTables()
  const now = new Date().toISOString()
  const requestId = crypto.randomUUID()

  await prisma.$executeRawUnsafe(
    `INSERT INTO market_verification_requests
     (id, user_id, requested_role, business_name, contact_phone, business_address, city, state, pincode, gst_number, id_proof_type, id_proof_number, status, admin_notes, reviewed_at, reviewed_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       requested_role = excluded.requested_role,
       business_name = excluded.business_name,
       contact_phone = excluded.contact_phone,
       business_address = excluded.business_address,
       city = excluded.city,
       state = excluded.state,
       pincode = excluded.pincode,
       gst_number = excluded.gst_number,
       id_proof_type = excluded.id_proof_type,
       id_proof_number = excluded.id_proof_number,
       status = 'pending',
       admin_notes = NULL,
       reviewed_at = NULL,
       reviewed_by = NULL,
       updated_at = excluded.updated_at`,
    requestId,
    input.userId,
    input.requestedRole,
    input.businessName,
    input.contactPhone,
    input.businessAddress,
    input.city,
    input.state,
    input.pincode,
    input.gstNumber ?? null,
    input.idProofType,
    input.idProofNumber,
    "pending",
    null,
    null,
    null,
    now,
    now,
  )

  return getVerificationRequestByUserId(input.userId)
}

export async function getVerificationRequestByUserId(userId: string) {
  await ensureUserStoreTables()
  const rows = await prisma.$queryRawUnsafe<VerificationRequestRow[]>(
    `SELECT id, user_id, requested_role, business_name, contact_phone, business_address, city, state, pincode, gst_number, id_proof_type, id_proof_number, status, admin_notes, reviewed_at, reviewed_by, created_at, updated_at
     FROM market_verification_requests
     WHERE user_id = ?
     LIMIT 1`,
    userId,
  )
  return rows.length ? mapVerificationRequest(rows[0]) : null
}

export async function listVerificationRequests(status?: VerificationRequestStatus) {
  await ensureUserStoreTables()
  const whereClause = status ? "WHERE status = ?" : ""
  const rows = await prisma.$queryRawUnsafe<VerificationRequestRow[]>(
    `SELECT id, user_id, requested_role, business_name, contact_phone, business_address, city, state, pincode, gst_number, id_proof_type, id_proof_number, status, admin_notes, reviewed_at, reviewed_by, created_at, updated_at
     FROM market_verification_requests
     ${whereClause}
     ORDER BY updated_at DESC`,
    ...(status ? [status] : []),
  )
  return rows.map(mapVerificationRequest)
}

export async function reviewVerificationRequest(input: {
  userId: string
  decision: "approve" | "reject"
  adminId: string
  adminNotes?: string
}) {
  await ensureUserStoreTables()
  const existing = await getVerificationRequestByUserId(input.userId)
  if (!existing) return null

  const nextStatus: VerificationRequestStatus = input.decision === "approve" ? "approved" : "rejected"
  const now = new Date().toISOString()

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE market_verification_requests
       SET status = ?, admin_notes = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
       WHERE user_id = ?`,
      nextStatus,
      input.adminNotes?.trim() || null,
      now,
      input.adminId,
      now,
      input.userId,
    )

    await tx.user.update({
      where: { id: input.userId },
      data: {
        verified: input.decision === "approve",
      },
    })
  })

  const [user, request] = await Promise.all([findUserById(input.userId), getVerificationRequestByUserId(input.userId)])
  return { user, request }
}

export async function syncOperatorVerificationState(userId: string) {
  await ensureUserStoreTables()
  const user = await findUserById(userId)
  if (!user) {
    return { user: null, request: null }
  }

  if (user.role !== "seller" && user.role !== "distributor") {
    return { user, request: null }
  }

  const request = await getVerificationRequestByUserId(userId)
  if (!request) {
    if (user.verified) {
      const downgraded = await updateUserById(userId, { verified: false })
      return { user: downgraded ?? user, request: null }
    }
    return { user, request: null }
  }

  const shouldBeVerified = request.status === "approved"
  if (user.verified !== shouldBeVerified) {
    const synced = await updateUserById(userId, { verified: shouldBeVerified })
    return { user: synced ?? user, request }
  }

  return { user, request }
}
