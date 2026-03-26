"use client"

import { useSearchParams } from "next/navigation"
import { BlueprintStudio } from "@/components/blueprint/blueprint-studio"

export default function AdminPlannerStudioPage() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get("projectId")

  return <BlueprintStudio projectId={projectId} adminMode />
}

