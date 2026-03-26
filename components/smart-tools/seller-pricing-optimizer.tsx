"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Target, DollarSign, BarChart3, AlertCircle } from "lucide-react"

const pricingData = [
  {
    product: "Premium Red Bricks",
    currentPrice: 8.5,
    suggestedPrice: 9.2,
    marketAverage: 8.8,
    competitorMin: 7.8,
    competitorMax: 10.1,
    demandElasticity: 0.7,
    profitMargin: 25,
    salesVolume: 5000,
    priceOptimization: "increase",
  },
  {
    product: "OPC Cement 50kg",
    currentPrice: 420,
    suggestedPrice: 435,
    marketAverage: 425,
    competitorMin: 410,
    competitorMax: 450,
    demandElasticity: 0.5,
    profitMargin: 18,
    salesVolume: 150,
    priceOptimization: "increase",
  },
]

export default function SellerPricingOptimizer() {
  const [selectedProduct, setSelectedProduct] = useState("Premium Red Bricks")
  const [priceStrategy, setPriceStrategy] = useState("profit")

  const currentData = pricingData.find((p) => p.product === selectedProduct) || pricingData[0]

  const getOptimizationColor = (optimization: string) => {
    switch (optimization) {
      case "increase":
        return "text-green-600"
      case "decrease":
        return "text-red-600"
      case "maintain":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const calculatePotentialRevenue = (newPrice: number) => {
    const priceChange = (newPrice - currentData.currentPrice) / currentData.currentPrice
    const volumeChange = -currentData.demandElasticity * priceChange
    const newVolume = currentData.salesVolume * (1 + volumeChange)
    return newPrice * newVolume
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Smart Pricing Optimizer
        </CardTitle>
        <CardDescription>AI-powered dynamic pricing and profit optimization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Product</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pricingData.map((product) => (
                  <SelectItem key={product.product} value={product.product}>
                    {product.product}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Pricing Strategy</label>
            <Select value={priceStrategy} onValueChange={setPriceStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit">Maximize Profit</SelectItem>
                <SelectItem value="volume">Maximize Volume</SelectItem>
                <SelectItem value="market">Match Market</SelectItem>
                <SelectItem value="competitive">Beat Competition</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Current Price</span>
              </div>
              <p className="text-2xl font-bold">₹{currentData.currentPrice}</p>
              <p className="text-sm text-muted-foreground">per unit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Suggested Price</span>
              </div>
              <p className="text-2xl font-bold">₹{currentData.suggestedPrice}</p>
              <p className="text-sm text-muted-foreground">optimized</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">Market Average</span>
              </div>
              <p className="text-2xl font-bold">₹{currentData.marketAverage}</p>
              <p className="text-sm text-muted-foreground">competitor avg</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Profit Margin</span>
              </div>
              <p className="text-2xl font-bold">{currentData.profitMargin}%</p>
              <p className="text-sm text-muted-foreground">current margin</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Competitor Range:</span>
                  <span className="font-medium">
                    ₹{currentData.competitorMin} - ₹{currentData.competitorMax}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Your Position:</span>
                  <Badge variant="outline">
                    {currentData.currentPrice < currentData.marketAverage ? "Below Market" : "Above Market"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Demand Elasticity:</span>
                  <span className="font-medium">{currentData.demandElasticity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Monthly Volume:</span>
                  <span className="font-medium">{currentData.salesVolume.toLocaleString()} units</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">
                    Recommendation: {currentData.priceOptimization === "increase" ? "Increase" : "Decrease"} price by ₹
                    {Math.abs(currentData.suggestedPrice - currentData.currentPrice).toFixed(2)}
                  </p>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Expected revenue increase: ₹
                  {(
                    calculatePotentialRevenue(currentData.suggestedPrice) -
                    calculatePotentialRevenue(currentData.currentPrice)
                  ).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Simulator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Test Price (₹)</label>
                <Input
                  type="number"
                  defaultValue={currentData.currentPrice}
                  step="0.1"
                  placeholder="Enter test price"
                />
              </div>

              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium">Impact Simulation</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Estimated Volume:</p>
                    <p className="font-semibold">{(currentData.salesVolume * 0.95).toLocaleString()} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Revenue Change:</p>
                    <p className="font-semibold text-green-600">+₹12,500</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profit Change:</p>
                    <p className="font-semibold text-green-600">+₹8,750</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Market Position:</p>
                    <p className="font-semibold">Competitive</p>
                  </div>
                </div>
              </div>

              <Button className="w-full">Apply Price Change</Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1">Set Dynamic Pricing Rules</Button>
          <Button variant="outline" className="flex-1 bg-transparent">
            Schedule Price Updates
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
