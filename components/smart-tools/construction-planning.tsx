"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Calendar, CheckCircle, AlertTriangle, Users } from "lucide-react"

const projectPhases = [
  {
    name: "Foundation",
    duration: 15,
    materials: ["Cement", "Steel", "Sand", "Aggregate"],
    laborRequired: 8,
    cost: 250000,
    dependencies: [],
    status: "completed",
  },
  {
    name: "Structure",
    duration: 30,
    materials: ["Cement", "Steel", "Bricks", "Sand"],
    laborRequired: 12,
    cost: 450000,
    dependencies: ["Foundation"],
    status: "completed",
  },
  {
    name: "Walls & Partitions",
    duration: 20,
    materials: ["Bricks", "Cement", "Sand"],
    laborRequired: 10,
    cost: 180000,
    dependencies: ["Structure"],
    status: "completed",
  },
  {
    name: "Roofing",
    duration: 12,
    materials: ["Cement", "Steel", "Tiles"],
    laborRequired: 6,
    cost: 120000,
    dependencies: ["Walls & Partitions"],
    status: "completed",
  },
  {
    name: "Finishing",
    duration: 25,
    materials: ["Paint", "Tiles", "Fixtures"],
    laborRequired: 8,
    cost: 200000,
    dependencies: ["Roofing"],
    status: "completed",
  },
]

type ProjectType = "residential" | "commercial" | "industrial" | "renovation"

type PhasePlan = (typeof projectPhases)[number] & {
  adjustedPhaseDuration: number
  startDay: number
  endDay: number
}

export default function ConstructionPlanning() {
  const [projectType, setProjectType] = useState<ProjectType>("residential")
  const [projectSize, setProjectSize] = useState("2000")
  const [timeline, setTimeline] = useState("standard")
  const [budget, setBudget] = useState("1200000")
  const [specialRequirements, setSpecialRequirements] = useState("")
  const [planMessage, setPlanMessage] = useState("")
  const [generatedPlan, setGeneratedPlan] = useState("")

  const totalDuration = projectPhases.reduce((sum, phase) => sum + phase.duration, 0)
  const totalCost = projectPhases.reduce((sum, phase) => sum + phase.cost, 0)
  const totalLaborDays = projectPhases.reduce((sum, phase) => sum + phase.duration * phase.laborRequired, 0)
  const parsedProjectSize = Number.parseInt(projectSize, 10) || 0
  const parsedBudget = Number.parseInt(budget, 10) || 0

  const getTimelineMultiplier = () => {
    switch (timeline) {
      case "fast":
        return 0.8
      case "standard":
        return 1.0
      case "relaxed":
        return 1.3
      default:
        return 1.0
    }
  }

  const adjustedDuration = Math.ceil(totalDuration * getTimelineMultiplier())
  const adjustedCost = timeline === "fast" ? totalCost * 1.2 : totalCost
  const budgetProgress = parsedBudget > 0 ? Math.min((adjustedCost / parsedBudget) * 100, 100) : 0

  const projectTypeLabel =
    projectType === "commercial"
      ? "Commercial Building"
      : projectType === "industrial"
        ? "Industrial Structure"
        : projectType === "renovation"
          ? "Renovation Project"
          : "Residential Building"

  const buildPhasePlan = (): PhasePlan[] =>
    projectPhases.map((phase, index) => {
      const adjustedPhaseDuration = Math.ceil(phase.duration * getTimelineMultiplier())
      const startDay = projectPhases
        .slice(0, index)
        .reduce((sum, current) => sum + Math.ceil(current.duration * getTimelineMultiplier()), 0)
      const endDay = startDay + adjustedPhaseDuration

      return {
        ...phase,
        adjustedPhaseDuration,
        startDay,
        endDay,
      }
    })

  const generateDetailedPlan = () => {
    if (parsedProjectSize <= 0) {
      setPlanMessage("Please enter a valid project size before generating a plan.")
      return
    }
    if (parsedBudget <= 0) {
      setPlanMessage("Please enter a valid budget before generating a plan.")
      return
    }

    const phasePlan = buildPhasePlan()
    const formattedPlan = [
      "BricksBazar Detailed Construction Plan",
      "--------------------------------------",
      `Project Type: ${projectTypeLabel}`,
      `Project Size: ${parsedProjectSize.toLocaleString()} sq ft`,
      `Timeline Preference: ${timeline}`,
      `Estimated Duration: ${adjustedDuration} days`,
      `Estimated Cost: Rs. ${Math.round(adjustedCost).toLocaleString()}`,
      `Budget: Rs. ${parsedBudget.toLocaleString()}`,
      specialRequirements.trim() ? `Special Requirements: ${specialRequirements.trim()}` : "Special Requirements: None",
      "",
      "Phase-wise Timeline:",
      ...phasePlan.map(
        (phase) =>
          `- ${phase.name}: Day ${phase.startDay + 1} to Day ${phase.endDay} (${phase.adjustedPhaseDuration} days)`,
      ),
      "",
      "Optimization Notes:",
      "- Order high-volume materials in bulk.",
      "- Keep delivery windows aligned with active phase to reduce storage costs.",
      "- Track critical path dependencies daily.",
    ].join("\n")

    setGeneratedPlan(formattedPlan)
    setPlanMessage("Detailed plan generated successfully.")

    try {
      const record = {
        id: `PLAN-${Date.now()}`,
        createdAt: new Date().toISOString(),
        projectType,
        projectSize: parsedProjectSize,
        timeline,
        budget: parsedBudget,
        specialRequirements: specialRequirements.trim(),
        estimatedDurationDays: adjustedDuration,
        estimatedCost: Math.round(adjustedCost),
        plan: formattedPlan,
      }
      const raw = window.localStorage.getItem("bb_generated_plans_v1")
      const history = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : []
      window.localStorage.setItem("bb_generated_plans_v1", JSON.stringify([record, ...history]))
    } catch {
      // Ignore local storage failures.
    }
  }

  const savePlanningTemplate = () => {
    if (parsedProjectSize <= 0 || parsedBudget <= 0) {
      setPlanMessage("Please complete size and budget before saving a planning template.")
      return
    }

    const template = {
      id: `TPL-${Date.now()}`,
      name: `${projectTypeLabel} - ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      projectType,
      projectSize: parsedProjectSize,
      timeline,
      budget: parsedBudget,
      specialRequirements: specialRequirements.trim(),
    }

    try {
      const raw = window.localStorage.getItem("bb_planning_templates_v1")
      const existing = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : []
      window.localStorage.setItem("bb_planning_templates_v1", JSON.stringify([template, ...existing]))
      setPlanMessage("Planning template saved successfully.")
    } catch {
      setPlanMessage("Could not save template locally in this browser.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Customized Construction Planning
        </CardTitle>
        <CardDescription>AI-powered project planning with timeline and resource optimization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Project Type</label>
            <Select value={projectType} onValueChange={(value) => setProjectType(value as ProjectType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential Building</SelectItem>
                <SelectItem value="commercial">Commercial Building</SelectItem>
                <SelectItem value="industrial">Industrial Structure</SelectItem>
                <SelectItem value="renovation">Renovation Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Size (sq ft)</label>
            <Input
              type="number"
              value={projectSize}
              onChange={(event) => setProjectSize(event.target.value)}
              placeholder="Enter size"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Timeline</label>
            <Select value={timeline} onValueChange={setTimeline}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast Track (-20% time, +20% cost)</SelectItem>
                <SelectItem value="standard">Standard Timeline</SelectItem>
                <SelectItem value="relaxed">Relaxed (+30% time, same cost)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Budget (Rs.)</label>
            <Input
              type="number"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="Enter budget"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Total Duration</span>
              </div>
              <p className="text-2xl font-bold">{adjustedDuration} days</p>
              <p className="text-sm text-muted-foreground">~ {Math.ceil(adjustedDuration / 30)} months</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-medium">Estimated Cost</span>
              </div>
              <p className="text-2xl font-bold">Rs. {(adjustedCost / 100000).toFixed(1)}L</p>
              <p className="text-sm text-muted-foreground">all inclusive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Labor Days</span>
              </div>
              <p className="text-2xl font-bold">{totalLaborDays}</p>
              <p className="text-sm text-muted-foreground">total person-days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Phases</span>
              </div>
              <p className="text-2xl font-bold">{projectPhases.length}</p>
              <p className="text-sm text-muted-foreground">construction phases</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {buildPhasePlan().map((phase) => (
                  <div key={phase.name} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{phase.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={phase.status === "completed" ? "default" : "secondary"} className="capitalize">
                          {phase.status}
                        </Badge>
                        <Badge variant="outline">
                          Day {phase.startDay + 1}-{phase.endDay}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                      <div>
                        <p className="text-muted-foreground">Duration:</p>
                        <p className="font-semibold">{phase.adjustedPhaseDuration} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cost:</p>
                        <p className="font-semibold">Rs. {(phase.cost / 100000).toFixed(1)}L</p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Materials needed:</p>
                      <div className="flex flex-wrap gap-1">
                        {phase.materials.map((material) => (
                          <Badge key={material} variant="secondary" className="text-xs">
                            {material}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resource Planning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Budget Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Estimated Cost:</span>
                    <span className="font-semibold">Rs. {(adjustedCost / 100000).toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Your Budget:</span>
                    <span className="font-semibold">Rs. {(parsedBudget / 100000).toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Difference:</span>
                    <span className={`font-semibold ${parsedBudget >= adjustedCost ? "text-green-600" : "text-red-600"}`}>
                      Rs. {Math.abs(parsedBudget - adjustedCost).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Progress value={budgetProgress} className="mt-2" />
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Critical Path Items</h4>
                <div className="space-y-2">
                  {["Foundation approval", "Steel delivery", "Weather dependency"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Optimization Suggestions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Bulk order materials for 15% savings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Schedule deliveries to avoid storage costs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Parallel execution can save 10 days</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Special Requirements</label>
          <Textarea
            placeholder="Any specific requirements, constraints, or preferences for your project..."
            rows={3}
            value={specialRequirements}
            onChange={(event) => setSpecialRequirements(event.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={generateDetailedPlan}>
            Generate Detailed Plan
          </Button>
          <Button variant="outline" className="flex-1 bg-transparent" onClick={savePlanningTemplate}>
            Save Planning Template
          </Button>
        </div>

        {planMessage ? <div className="rounded-md border p-3 text-sm text-muted-foreground">{planMessage}</div> : null}

        {generatedPlan ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium mb-2">Generated Plan Preview</p>
            <pre className="text-xs whitespace-pre-wrap leading-relaxed text-muted-foreground">{generatedPlan}</pre>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
