"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Building2, RefreshCw, Trash2 } from "lucide-react"

type ProjectRecord = {
  id: string
  userId: string
  name: string
  jsonLayout: unknown
  calculatedMaterials: unknown
  updatedAt: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

type ProjectsResponse = {
  projects: ProjectRecord[]
}

function getRoomCount(layout: unknown) {
  if (!layout || typeof layout !== "object") return 0
  const value = (layout as { houseConfig?: { rooms?: unknown[] } }).houseConfig?.rooms
  return Array.isArray(value) ? value.length : 0
}

function getFloors(layout: unknown) {
  if (!layout || typeof layout !== "object") return "-"
  const floors = (layout as { houseConfig?: { floors?: number } }).houseConfig?.floors
  return typeof floors === "number" ? floors.toString() : "-"
}

export default function AdminPlannerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/projects?scope=all&limit=200", { cache: "no-store" })
      const data = (await response.json()) as ProjectsResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "Could not load projects")
      }
      setProjects(data.projects ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load projects")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const filteredProjects = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return projects
    return projects.filter((project) => {
      const haystack = `${project.name} ${project.user.name} ${project.user.email}`.toLowerCase()
      return haystack.includes(search)
    })
  }, [projects, query])

  const handleDelete = async (projectId: string) => {
    setDeletingId(projectId)
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || "Delete failed")
      }
      setProjects((prev) => prev.filter((project) => project.id !== projectId))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Planner Control</h1>
          <p className="text-muted-foreground">View, open, and manage all user planning projects from one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin/planner/studio">
            <Button>
              <Building2 className="h-4 w-4 mr-2" />
              Open Studio
            </Button>
          </Link>
          <Button variant="outline" onClick={loadProjects} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Registry</CardTitle>
          <CardDescription>Admin can inspect any saved blueprint and open it in studio mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by project name, owner name, or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          ) : filteredProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects found.</p>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div key={project.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Owner: {project.user.name} ({project.user.email})
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">{project.user.role}</Badge>
                        <Badge variant="outline">{`${getRoomCount(project.jsonLayout)} rooms`}</Badge>
                        <Badge variant="outline">{`${getFloors(project.jsonLayout)} floors`}</Badge>
                        <span className="text-muted-foreground">{`Updated ${new Date(project.updatedAt).toLocaleString()}`}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/admin/planner/studio?projectId=${project.id}`)}
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(project.id)}
                        disabled={deletingId === project.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingId === project.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
