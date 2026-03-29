"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calculator, Building2, TrendingDown, Download, Share, Save, Loader2 } from "lucide-react"
import { downloadPdfDocument } from "@/lib/pdf-export"

type MaterialLine = {
  name: string
  quantity: number
  unit: string
  rate: number
  amount: number
}

type EstimateResult = {
  totalArea: number
  materials: MaterialLine[]
  materialCost: number
  laborCost: number
  totalCost: number
  savings: number
  finalCost: number
}

type MarketRates = {
  brickPerPiece: number
  cementPerBag: number
  sandPerTon: number
  steelPerTon: number
}

const mpLocationMultiplier: Record<string, number> = {
  bhopal: 1.0,
  indore: 1.03,
  jabalpur: 0.99,
  gwalior: 1.02,
  ujjain: 0.98,
  rewa: 0.97,
}

function roundCurrency(value: number) {
  return Math.round(value)
}

export default function EstimatorPage() {
  const [projectType, setProjectType] = useState("")
  const [area, setArea] = useState("")
  const [floors, setFloors] = useState("")
  const [location, setLocation] = useState("")
  const [estimate, setEstimate] = useState<EstimateResult | null>(null)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [ratesError, setRatesError] = useState("")
  const [marketRates, setMarketRates] = useState<MarketRates>({
    brickPerPiece: 7.4,
    cementPerBag: 382,
    sandPerTon: 1380,
    steelPerTon: 61100,
  })

  useEffect(() => {
    let cancelled = false
    const loadRates = async () => {
      try {
        const response = await fetch("/api/market-rates", { cache: "no-store" })
        const payload = (await response.json()) as { rates?: MarketRates; error?: string }
        if (!response.ok || !payload.rates) {
          throw new Error(payload.error || "Could not load market rates")
        }
        if (!cancelled) {
          setMarketRates(payload.rates)
        }
      } catch (error) {
        if (!cancelled) {
          setRatesError(error instanceof Error ? error.message : "Could not load market rates")
        }
      } finally {
        if (!cancelled) {
          setRatesLoading(false)
        }
      }
    }

    void loadRates()
    return () => {
      cancelled = true
    }
  }, [])

  const rateMultiplier = useMemo(() => {
    if (!location) return 1
    return mpLocationMultiplier[location] || 1
  }, [location])

  const handleCalculate = () => {
    const parsedArea = Number.parseInt(area, 10)
    const parsedFloors = Number.parseInt(floors || "1", 10)
    if (!parsedArea || !parsedFloors) return

    const baseRatePerSqFt = projectType === "residential" ? 1200 : projectType === "commercial" ? 1500 : 1100
    const totalArea = parsedArea * parsedFloors
    const baseCost = totalArea * baseRatePerSqFt * rateMultiplier

    const materials: MaterialLine[] = [
      {
        name: "Cement",
        quantity: Math.ceil(totalArea * 0.4),
        unit: "bags",
        rate: roundCurrency(marketRates.cementPerBag * rateMultiplier),
        amount: roundCurrency(Math.ceil(totalArea * 0.4) * marketRates.cementPerBag * rateMultiplier),
      },
      {
        name: "Bricks",
        quantity: Math.ceil(totalArea * 40),
        unit: "pieces",
        rate: Number((marketRates.brickPerPiece * rateMultiplier).toFixed(2)),
        amount: roundCurrency(Math.ceil(totalArea * 40) * marketRates.brickPerPiece * rateMultiplier),
      },
      {
        name: "Steel",
        quantity: Math.ceil(totalArea * 0.05),
        unit: "tons",
        rate: roundCurrency(marketRates.steelPerTon * rateMultiplier),
        amount: roundCurrency(Math.ceil(totalArea * 0.05) * marketRates.steelPerTon * rateMultiplier),
      },
      {
        name: "Sand",
        quantity: Math.ceil(totalArea * 0.3),
        unit: "tons",
        rate: roundCurrency(marketRates.sandPerTon * rateMultiplier),
        amount: roundCurrency(Math.ceil(totalArea * 0.3) * marketRates.sandPerTon * rateMultiplier),
      },
      {
        name: "Aggregate",
        quantity: Math.ceil(totalArea * 0.6),
        unit: "tons",
        rate: roundCurrency(980 * rateMultiplier),
        amount: roundCurrency(Math.ceil(totalArea * 0.6) * 980 * rateMultiplier),
      },
    ]

    const totalMaterialCost = materials.reduce((sum, item) => sum + item.amount, 0)
    const laborCost = roundCurrency(baseCost * 0.4)
    const totalCost = totalMaterialCost + laborCost
    const savings = roundCurrency(totalCost * 0.12)

    setEstimate({
      totalArea,
      materials,
      materialCost: totalMaterialCost,
      laborCost,
      totalCost,
      savings,
      finalCost: totalCost - savings,
    })
  }

  const handleDownloadEstimate = () => {
    if (!estimate) return

    const materials = estimate.materials.map(
      (material, index) =>
        `${index + 1}. ${material.name} | ${material.quantity} ${material.unit} x Rs. ${material.rate.toLocaleString()} = Rs. ${material.amount.toLocaleString()}`,
    )

    downloadPdfDocument({
      filename: `estimate-${(projectType || "project").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`,
      title: "BricksBazar Cost Estimate Report",
      subtitle: `${projectType || "Project"} | ${estimate.totalArea.toLocaleString()} sq ft`,
      meta: [
        `Location: ${location || "Not selected"}`,
        `Floors: ${floors || "1"}`,
      ],
      sections: [
        { heading: "Material Breakdown", lines: materials },
        {
          heading: "Cost Summary",
          lines: [
            `Material Cost: Rs. ${estimate.materialCost.toLocaleString()}`,
            `Labor Cost: Rs. ${estimate.laborCost.toLocaleString()}`,
            `Subtotal: Rs. ${estimate.totalCost.toLocaleString()}`,
            `Savings (12%): Rs. ${estimate.savings.toLocaleString()}`,
            `Final Cost: Rs. ${estimate.finalCost.toLocaleString()}`,
          ],
        },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calculator className="h-8 w-8 text-primary" />
          Smart Cost Estimator
        </h1>
        <p className="text-muted-foreground">Madhya Pradesh market-linked estimate for your construction project</p>
      </div>

      {ratesError ? <p className="text-sm text-destructive">{ratesError}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Enter your project specifications for accurate estimation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-type">Project Type</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential Building</SelectItem>
                  <SelectItem value="commercial">Commercial Building</SelectItem>
                  <SelectItem value="industrial">Industrial Structure</SelectItem>
                  <SelectItem value="renovation">Renovation Project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Built-up Area (sq ft)</Label>
                <Input id="area" type="number" placeholder="e.g., 2000" value={area} onChange={(e) => setArea(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floors">Number of Floors</Label>
                <Input id="floors" type="number" placeholder="e.g., 2" value={floors} onChange={(e) => setFloors(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Madhya Pradesh Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bhopal">Bhopal</SelectItem>
                  <SelectItem value="indore">Indore</SelectItem>
                  <SelectItem value="jabalpur">Jabalpur</SelectItem>
                  <SelectItem value="gwalior">Gwalior</SelectItem>
                  <SelectItem value="ujjain">Ujjain</SelectItem>
                  <SelectItem value="rewa">Rewa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Special Requirements</Label>
              <Textarea id="requirements" placeholder="Any specific structural or material requirements..." rows={3} />
            </div>

            <Button onClick={handleCalculate} className="w-full gap-2" disabled={!projectType || !area || ratesLoading}>
              {ratesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Calculate Estimate
            </Button>
          </CardContent>
        </Card>

        {estimate ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Cost Estimate
                <Badge variant="secondary" className="gap-1">
                  <TrendingDown className="h-3 w-3" />
                  12% Optimized
                </Badge>
              </CardTitle>
              <CardDescription>
                Estimated cost for {estimate.totalArea} sq ft {projectType} project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Project Cost</p>
                  <p className="text-2xl font-bold">Rs. {estimate.finalCost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">You Save</p>
                  <p className="text-2xl font-bold text-green-600">Rs. {estimate.savings.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Material Breakdown</h4>
                <div className="space-y-2">
                  {estimate.materials.map((material) => (
                    <div key={material.name} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {material.quantity} {material.unit} x Rs. {material.rate.toLocaleString()}
                        </p>
                      </div>
                      <p className="font-semibold">Rs. {material.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Material Cost:</span>
                  <span>Rs. {estimate.materialCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labor Cost:</span>
                  <span>Rs. {estimate.laborCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>Rs. {estimate.totalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Platform Savings (12%):</span>
                  <span>-Rs. {estimate.savings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Final Cost:</span>
                  <span>Rs. {estimate.finalCost.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2">
                  <Save className="h-4 w-4" />
                  Save Estimate
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent" onClick={handleDownloadEstimate}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Share className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-96">
              <div className="text-center">
                <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Calculate</h3>
                <p className="text-muted-foreground">
                  Fill in project details to generate MP market-linked estimate with latest rates.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Estimates</CardTitle>
          <CardDescription>Your previously calculated project estimates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Bhopal Residential Villa", area: "2200 sq ft", cost: "Rs. 12,90,000", date: "2 days ago" },
              { name: "Indore Retail Block", area: "4800 sq ft", cost: "Rs. 33,40,000", date: "1 week ago" },
              { name: "Jabalpur Renovation Package", area: "1400 sq ft", cost: "Rs. 7,25,000", date: "2 weeks ago" },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.area} | {item.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{item.cost}</p>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
