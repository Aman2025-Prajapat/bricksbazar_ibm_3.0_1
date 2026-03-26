"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Shield, CheckCircle, Star, Camera } from "lucide-react"

const qualityReports = [
  {
    product: "Premium Red Bricks",
    supplier: "Local Brick Co.",
    overallScore: 92,
    tests: [
      { name: "Compressive Strength", score: 95, status: "excellent", unit: "N/mm²" },
      { name: "Water Absorption", score: 88, status: "good", unit: "%" },
      { name: "Dimensional Accuracy", score: 90, status: "excellent", unit: "mm" },
      { name: "Durability", score: 94, status: "excellent", unit: "cycles" },
    ],
    certifications: ["ISI Mark", "BIS Certified", "Quality Tested"],
    lastTested: "2024-01-15",
    batchNumber: "LBC-2024-001",
  },
]

export default function QualityChecker() {
  const [selectedReport, setSelectedReport] = useState(0)
  const [actionMessage, setActionMessage] = useState("")

  const report = qualityReports[selectedReport]

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 75) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent":
        return (
          <Badge variant="default" className="bg-green-500">
            Excellent
          </Badge>
        )
      case "good":
        return <Badge variant="secondary">Good</Badge>
      case "fair":
        return <Badge variant="outline">Fair</Badge>
      default:
        return <Badge variant="destructive">Poor</Badge>
    }
  }

  const requestQualityCertificate = () => {
    const certificateContent = [
      "BricksBazar Quality Certificate",
      "--------------------------------",
      `Product: ${report.product}`,
      `Supplier: ${report.supplier}`,
      `Overall Score: ${report.overallScore}/100`,
      `Batch Number: ${report.batchNumber}`,
      `Test Date: ${new Date(report.lastTested).toLocaleDateString()}`,
      "",
      "Test Results:",
      ...report.tests.map((test) => `- ${test.name}: ${test.score}/100 (${test.status})`),
      "",
      `Generated On: ${new Date().toLocaleString()}`,
    ].join("\n")

    const blob = new Blob([certificateContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${report.product.replace(/\s+/g, "-").toLowerCase()}-quality-certificate.txt`
    link.click()
    URL.revokeObjectURL(url)

    setActionMessage("Quality certificate generated and downloaded.")
  }

  const scheduleQualityInspection = () => {
    const start = new Date(Date.now() + 48 * 60 * 60 * 1000)
    start.setMinutes(0, 0, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const fmt = (value: Date) => value.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const title = encodeURIComponent(`Quality Inspection - ${report.product}`)
    const details = encodeURIComponent(
      `Inspection for ${report.product} from ${report.supplier}. Batch: ${report.batchNumber}.`,
    )
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${fmt(start)}/${fmt(end)}`

    window.open(calendarUrl, "_blank", "noopener,noreferrer")
    setActionMessage(`Inspection slot created for ${start.toLocaleString()}.`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Quality Verification System
        </CardTitle>
        <CardDescription>AI-powered quality analysis and supplier verification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Overall Quality Score</span>
              </div>
              <p className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}>{report.overallScore}/100</p>
              <Progress value={report.overallScore} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Certifications</span>
              </div>
              <p className="text-2xl font-bold">{report.certifications.length}</p>
              <p className="text-sm text-muted-foreground">verified certificates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Last Tested</span>
              </div>
              <p className="text-lg font-bold">{new Date(report.lastTested).toLocaleDateString()}</p>
              <p className="text-sm text-muted-foreground">Batch: {report.batchNumber}</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Quality Test Results</h3>
          <div className="space-y-4">
            {report.tests.map((test, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{test.name}</h4>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(test.status)}
                    <span className={`font-bold ${getScoreColor(test.score)}`}>{test.score}/100</span>
                  </div>
                </div>
                <Progress value={test.score} className="mb-2" />
                <p className="text-sm text-muted-foreground">Test unit: {test.unit}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Certifications & Standards</h3>
          <div className="flex flex-wrap gap-2">
            {report.certifications.map((cert, index) => (
              <Badge key={index} variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {cert}
              </Badge>
            ))}
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Quality Guarantee</h4>
              <p className="text-sm text-blue-700 mt-1">
                This supplier has maintained consistent quality standards for over 12 months. All products are backed by
                our quality guarantee and return policy.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={requestQualityCertificate}>
            Request Quality Certificate
          </Button>
          <Button variant="outline" className="flex-1 bg-transparent" onClick={scheduleQualityInspection}>
            Schedule Quality Inspection
          </Button>
        </div>

        {actionMessage ? <div className="rounded-md border p-3 text-sm text-muted-foreground">{actionMessage}</div> : null}
      </CardContent>
    </Card>
  )
}
