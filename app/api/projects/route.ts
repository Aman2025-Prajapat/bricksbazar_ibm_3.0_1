import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { createProject, listProjects } from "@/lib/server/project-store"
import { findUserById } from "@/lib/server/user-store"

const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  jsonLayout: z.unknown(),
  calculatedMaterials: z.unknown(),
})

function getNoStoreHeaders() {
  return { "Cache-Control": "no-store, no-cache, must-revalidate" }
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getNoStoreHeaders() })
  }

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get("scope")
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10)
  const limit = Number.isNaN(limitRaw) ? 50 : Math.min(Math.max(limitRaw, 1), 200)
  const userIdFilter = searchParams.get("userId")
  const isAdmin = sessionUser.role === "admin"

  const where =
    isAdmin && scope === "all"
      ? {
          ...(userIdFilter ? { userId: userIdFilter } : {}),
        }
      : { userId: sessionUser.userId }

  const allProjects = await listProjects()
  const projects = allProjects
    .filter((project) => {
      if ("userId" in where && typeof where.userId === "string") {
        return project.userId === where.userId
      }
      return true
    })
    .sort((a, b) => Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)))
    .slice(0, limit)

  const projectsWithOwner = await Promise.all(
    projects.map(async (project) => {
      const owner = await findUserById(project.userId)
      return {
        ...project,
        user: owner
          ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
              role: owner.role,
            }
          : {
              id: project.userId,
              name: "Unknown User",
              email: "unknown@local",
              role: "buyer",
            },
      }
    }),
  )

  return NextResponse.json({ projects: projectsWithOwner }, { headers: getNoStoreHeaders() })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getNoStoreHeaders() })
  }

  try {
    const body = await request.json()
    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid project payload" }, { status: 400, headers: getNoStoreHeaders() })
    }

    const project = await createProject({
      userId: sessionUser.userId,
      name: parsed.data.name,
      jsonLayout: parsed.data.jsonLayout,
      calculatedMaterials: parsed.data.calculatedMaterials,
    })
    const owner = await findUserById(project.userId)

    return NextResponse.json(
      {
        project: {
          ...project,
          user: owner
            ? {
                id: owner.id,
                name: owner.name,
                email: owner.email,
                role: owner.role,
              }
            : {
                id: project.userId,
                name: "Unknown User",
                email: "unknown@local",
                role: "buyer",
              },
        },
      },
      { status: 201, headers: getNoStoreHeaders() },
    )
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500, headers: getNoStoreHeaders() })
  }
}
