"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calculator, Building2, TrendingDown, Download, Share, Save } from "lucide-react"

export default function EstimatorPage() {
  const [projectType, setProjectType] = useState("")
  const [area, setArea] = useState("")
  const [floors, setFloors] = useState("")
  const [location, setLocation] = useState("")
  const [estimate, setEstimate] = useState<any>(null)

  const handleCalculate = () => {
    // Mock calculation - replace with actual API call
    const baseRate = projectType === "residential" ? 1200 : projectType === "commercial" ? 1500 : 1000
    const totalArea = Number.parseInt(area) * Number.parseInt(floors || "1")
    const baseCost = totalArea * baseRate

    const materials = [
      {
        name: "Cement",
        quantity: Math.ceil(totalArea * 0.4),
        unit: "bags",
        rate: 420,
        amount: Math.ceil(totalArea * 0.4) * 420,
      },
      {
        name: "Bricks",
        quantity: Math.ceil(totalArea * 40),
        unit: "pieces",
        rate: 8.5,
        amount: Math.ceil(totalArea * 40) * 8.5,
      },
      {
        name: "Steel",
        quantity: Math.ceil(totalArea * 0.05),
        unit: "tons",
        rate: 65000,
        amount: Math.ceil(totalArea * 0.05) * 65000,
      },
      {
        name: "Sand",
        quantity: Math.ceil(totalArea * 0.3),
        unit: "tons",
        rate: 1200,
        amount: Math.ceil(totalArea * 0.3) * 1200,
      },
      {
        name: "Aggregate",
        quantity: Math.ceil(totalArea * 0.6),
        unit: "tons",
        rate: 1500,
        amount: Math.ceil(totalArea * 0.6) * 1500,
      },
    ]

    const totalMaterialCost = materials.reduce((sum, item) => sum + item.amount, 0)
    const laborCost = baseCost * 0.4
    const totalCost = totalMaterialCost + laborCost
    const savings = totalCost * 0.15 // 15% savings through platform

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calculator className="h-8 w-8 text-primary" />
          Smart Cost Estimator
        </h1>
        <p className="text-muted-foreground">Get instant cost estimates for your construction projects</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
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
                <Input
                  id="area"
                  type="number"
                  placeholder="e.g., 2000"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floors">Number of Floors</Label>
                <Input
                  id="floors"
                  type="number"
                  placeholder="e.g., 2"
                  value={floors}
                  onChange={(e) => setFloors(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mumbai">Mumbai</SelectItem>
                  <SelectItem value="delhi">Delhi</SelectItem>
                  <SelectItem value="bangalore">Bangalore</SelectItem>
                  <SelectItem value="chennai">Chennai</SelectItem>
                  <SelectItem value="hyderabad">Hyderabad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Special Requirements</Label>
              <Textarea id="requirements" placeholder="Any specific requirements or preferences..." rows={3} />
            </div>

            <Button onClick={handleCalculate} className="w-full gap-2" disabled={!projectType || !area}>
              <Calculator className="h-4 w-4" />
              Calculate Estimate
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {estimate ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Cost Estimate
                <Badge variant="secondary" className="gap-1">
                  <TrendingDown className="h-3 w-3" />
                  15% Saved
                </Badge>
              </CardTitle>
              <CardDescription>
                Estimated cost for {estimate.totalArea} sq ft {projectType} project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Project Cost</p>
                  <p className="text-2xl font-bold">₹{estimate.finalCost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">You Save</p>
                  <p className="text-2xl font-bold text-green-600">₹{estimate.savings.toLocaleString()}</p>
                </div>
              </div>

              {/* Material Breakdown */}
              <div>
                <h4 className="font-semibold mb-3">Material Breakdown</h4>
                <div className="space-y-2">
                  {estimate.materials.map((material: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {material.quantity} {material.unit} × ₹{material.rate}
                        </p>
                      </div>
                      <p className="font-semibold">₹{material.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Summary */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Material Cost:</span>
                  <span>₹{estimate.materialCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labor Cost:</span>
                  <span>₹{estimate.laborCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>₹{estimate.totalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Platform Savings (15%):</span>
                  <span>-₹{estimate.savings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Final Cost:</span>
                  <span>₹{estimate.finalCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1 gap-2">
                  <Save className="h-4 w-4" />
                  Save Estimate
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Download
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
                <p className="text-muted-foreground">Fill in your project details to get an instant cost estimate</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Estimates */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Estimates</CardTitle>
          <CardDescription>Your previously calculated project estimates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Residential Building - Phase 1", area: "2000 sq ft", cost: "₹12,50,000", date: "2 days ago" },
              { name: "Commercial Office Space", area: "5000 sq ft", cost: "₹35,75,000", date: "1 week ago" },
              { name: "Home Renovation Project", area: "1200 sq ft", cost: "₹6,80,000", date: "2 weeks ago" },
            ].map((estimate, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{estimate.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {estimate.area} • {estimate.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{estimate.cost}</p>
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
