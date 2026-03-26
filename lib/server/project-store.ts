import { prisma } from "@/lib/server/prisma"

export type StoredProject = {
  id: string
  userId: string
  name: string
  jsonLayout: unknown
  calculatedMaterials: unknown
  createdAt: string
  updatedAt: string
}

type ProjectRow = {
  id: string
  user_id: string
  name: string
  json_layout: string
  calculated_materials: string
  created_at: string
  updated_at: string
}

let projectTableReady = false

async function ensureProjectTable() {
  if (projectTableReady) return

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS projects_store (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      json_layout TEXT NOT NULL,
      calculated_materials TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_projects_store_user_id ON projects_store(user_id)",
  )
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_projects_store_updated_at ON projects_store(updated_at DESC)",
  )

  projectTableReady = true
}

function mapProject(row: ProjectRow): StoredProject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    jsonLayout: JSON.parse(row.json_layout),
    calculatedMaterials: JSON.parse(row.calculated_materials),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listProjects() {
  await ensureProjectTable()

  const rows = await prisma.$queryRawUnsafe<ProjectRow[]>(
    "SELECT id, user_id, name, json_layout, calculated_materials, created_at, updated_at FROM projects_store ORDER BY datetime(updated_at) DESC",
  )
  return rows.map(mapProject)
}

export async function findProjectById(id: string) {
  await ensureProjectTable()

  const rows = await prisma.$queryRawUnsafe<ProjectRow[]>(
    "SELECT id, user_id, name, json_layout, calculated_materials, created_at, updated_at FROM projects_store WHERE id = ? LIMIT 1",
    id,
  )

  return rows.length ? mapProject(rows[0]) : null
}

export async function createProject(input: {
  userId: string
  name: string
  jsonLayout: unknown
  calculatedMaterials: unknown
}) {
  await ensureProjectTable()

  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  await prisma.$executeRawUnsafe(
    `INSERT INTO projects_store
     (id, user_id, name, json_layout, calculated_materials, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.userId,
    input.name,
    JSON.stringify(input.jsonLayout ?? null),
    JSON.stringify(input.calculatedMaterials ?? null),
    now,
    now,
  )

  return {
    id,
    userId: input.userId,
    name: input.name,
    jsonLayout: input.jsonLayout,
    calculatedMaterials: input.calculatedMaterials,
    createdAt: now,
    updatedAt: now,
  }
}

export async function updateProjectById(
  id: string,
  updates: Partial<Pick<StoredProject, "name" | "jsonLayout" | "calculatedMaterials">>,
) {
  await ensureProjectTable()

  const existing = await findProjectById(id)
  if (!existing) return null

  const next: StoredProject = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await prisma.$executeRawUnsafe(
    `UPDATE projects_store
     SET name = ?, json_layout = ?, calculated_materials = ?, updated_at = ?
     WHERE id = ?`,
    next.name,
    JSON.stringify(next.jsonLayout ?? null),
    JSON.stringify(next.calculatedMaterials ?? null),
    next.updatedAt,
    id,
  )

  return next
}

export async function deleteProjectById(id: string) {
  await ensureProjectTable()

  const result = await prisma.$executeRawUnsafe("DELETE FROM projects_store WHERE id = ?", id)
  return result > 0
}
