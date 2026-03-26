"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, TrendingUp, AlertTriangle, Target, BarChart3 } from "lucide-react"

const inventoryData = [
  {
    product: "Premium Red Bricks",
    currentStock: 15000,
    optimalStock: 20000,
    demandTrend: "increasing",
    reorderPoint: 5000,
    leadTime: 7,
    profitMargin: 25,
    seasonalFactor: 1.2,
  },
  {
    product: "OPC Cement 50kg",
    currentStock: 150,
    optimalStock: 300,
    demandTrend: "stable",
    reorderPoint: 50,
    leadTime: 3,
    profitMargin: 18,
    seasonalFactor: 1.0,
  },
  {
    product: "River Sand",
    currentStock: 0,
    optimalStock: 50,
    demandTrend: "high",
    reorderPoint: 10,
    leadTime: 2,
    profitMargin: 30,
    seasonalFactor: 1.4,
  },
]

export default function SellerInventoryOptimizer() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly")
  const [selectedProduct, setSelectedProduct] = useState("all")

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "text-green-600"
      case "high":
        return "text-blue-600"
      case "stable":
        return "text-yellow-600"
      default:
        return "text-gray-600"
    }
  }

  const getStockStatus = (current: number, optimal: number, reorder: number) => {
    if (current === 0) return { status: "Out of Stock", color: "destructive" }
    if (current <= reorder) return { status: "Low Stock", color: "secondary" }
    if (current < optimal * 0.8) return { status: "Below Optimal", color: "outline" }
    return { status: "Good Stock", color: "default" }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Smart Inventory Optimizer
        </CardTitle>
        <CardDescription>AI-powered inventory management and demand forecasting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Analysis Period</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Product Filter</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="bricks">Bricks</SelectItem>
                <SelectItem value="cement">Cement</SelectItem>
                <SelectItem value="sand">Sand & Aggregates</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Optimal Stock Value</span>
              </div>
              <p className="text-2xl font-bold">₹8.5L</p>
              <p className="text-sm text-muted-foreground">recommended</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Profit Potential</span>
              </div>
              <p className="text-2xl font-bold">₹2.1L</p>
              <p className="text-sm text-muted-foreground">this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Reorder Alerts</span>
              </div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">products need restocking</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">Turnover Rate</span>
              </div>
              <p className="text-2xl font-bold">6.2x</p>
              <p className="text-sm text-muted-foreground">annual average</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Inventory Analysis</h3>
          <div className="space-y-4">
            {inventoryData.map((item, index) => {
              const stockStatus = getStockStatus(item.currentStock, item.optimalStock, item.reorderPoint)
              const stockPercentage = (item.currentStock / item.optimalStock) * 100

              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{item.product}</h4>
                      <Badge variant={stockStatus.color as any}>{stockStatus.status}</Badge>
                      <Badge variant="outline" className={getTrendColor(item.demandTrend)}>
                        {item.demandTrend} demand
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{item.profitMargin}% margin</p>
                      <p className="text-sm text-muted-foreground">profit</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                      <p className="font-semibold">{item.currentStock.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Optimal Stock</p>
                      <p className="font-semibold">{item.optimalStock.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reorder Point</p>
                      <p className="font-semibold">{item.reorderPoint.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lead Time</p>
                      <p className="font-semibold">{item.leadTime} days</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Stock Level</span>
                      <span>{stockPercentage.toFixed(0)}% of optimal</span>
                    </div>
                    <Progress value={Math.min(stockPercentage, 100)} />
                  </div>

                  {item.currentStock <= item.reorderPoint && (
                    <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <p className="text-sm font-medium text-orange-900">
                          Reorder Recommendation: {(item.optimalStock - item.currentStock).toLocaleString()} units
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1">Generate Reorder Report</Button>
          <Button variant="outline" className="flex-1 bg-transparent">
            Set Auto-Reorder Rules
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
