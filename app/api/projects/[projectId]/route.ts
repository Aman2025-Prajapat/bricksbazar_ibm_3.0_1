import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/server/auth-user"
import { deleteProjectById, findProjectById, updateProjectById } from "@/lib/server/project-store"
import { findUserById } from "@/lib/server/user-store"

const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  jsonLayout: z.unknown().optional(),
  calculatedMaterials: z.unknown().optional(),
})

function getNoStoreHeaders() {
  return { "Cache-Control": "no-store, no-cache, must-revalidate" }
}

function canAccessProject(sessionUser: Awaited<ReturnType<typeof getSessionUser>>, ownerId: string) {
  if (!sessionUser) return false
  if (sessionUser.role === "admin") return true
  return sessionUser.userId === ownerId
}

export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getNoStoreHeaders() })
  }

  const { projectId } = params
  const project = await findProjectById(projectId)

  if (!project || !canAccessProject(sessionUser, project.userId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404, headers: getNoStoreHeaders() })
  }

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
    { headers: getNoStoreHeaders() },
  )
}

export async function PATCH(request: Request, { params }: { params: { projectId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getNoStoreHeaders() })
  }

  const { projectId } = params
  const existing = await findProjectById(projectId)
  if (!existing || !canAccessProject(sessionUser, existing.userId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404, headers: getNoStoreHeaders() })
  }

  try {
    const body = await request.json()
    const parsed = updateProjectSchema.safeParse(body)
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400, headers: getNoStoreHeaders() })
    }

    const project = await updateProjectById(projectId, parsed.data)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404, headers: getNoStoreHeaders() })
    }
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
      { headers: getNoStoreHeaders() },
    )
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500, headers: getNoStoreHeaders() })
  }
}

export async function DELETE(_request: Request, { params }: { params: { projectId: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getNoStoreHeaders() })
  }

  const { projectId } = params
  const existing = await findProjectById(projectId)
  if (!existing || !canAccessProject(sessionUser, existing.userId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404, headers: getNoStoreHeaders() })
  }

  await deleteProjectById(projectId)
  return NextResponse.json({ success: true }, { headers: getNoStoreHeaders() })
}
