"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calculator, TrendingDown, MapPin, Truck, Leaf, DollarSign } from "lucide-react"
import { fairAlgorithm, type Product } from "@/lib/fair-algorithm"

type CostComparisonInput = Omit<Product, "totalCost">

interface EnhancedProduct extends Product {
  productCost: number
  fairnessScore: number
  savings: number
  trustBadges: string[]
}

interface CostComparisonProps {
  products: CostComparisonInput[]
  quantity: number
}

export function EnhancedCostComparison({ products, quantity }: CostComparisonProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  // Calculate costs and fairness scores for all products
  const enhancedProducts: EnhancedProduct[] = products.map((product) => {
    const costAnalysis = fairAlgorithm.calculateTotalCost(
      { ...product, totalCost: product.price * quantity + product.deliveryCost },
      quantity,
    )
    const trustBadges = fairAlgorithm.getTrustBadges(product.supplier)

    return {
      ...product,
      ...costAnalysis,
      trustBadges,
    }
  })

  // Sort by Fair Algorithm score
  const sortedProducts = [...enhancedProducts].sort((a, b) => b.fairnessScore - a.fairnessScore)

  const bestLocalOption = enhancedProducts.find((p) => p.supplier.type === "local")
  const bestDistributorOption = enhancedProducts.find((p) => p.supplier.type === "distributor")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Smart Cost Comparison with Fair Algorithm
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Local vs Distributor Comparison */}
        {bestLocalOption && bestDistributorOption && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Best Local Option</span>
                </div>
                <h4 className="font-semibold">{bestLocalOption.supplier.name}</h4>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Product Cost:</span>
                    <span>Rs. {bestLocalOption.productCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Cost:</span>
                    <span>Rs. {bestLocalOption.deliveryCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Community Savings:</span>
                    <span>-Rs. {bestLocalOption.savings.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Cost:</span>
                    <span>Rs. {(bestLocalOption.totalCost - bestLocalOption.savings).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Best Distributor Option</span>
                </div>
                <h4 className="font-semibold">{bestDistributorOption.supplier.name}</h4>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Product Cost:</span>
                    <span>Rs. {bestDistributorOption.productCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Cost:</span>
                    <span>Rs. {bestDistributorOption.deliveryCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Platform Fee:</span>
                    <span>Rs. {(bestDistributorOption.productCost * 0.07).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Cost:</span>
                    <span>
                      Rs. {(bestDistributorOption.totalCost + bestDistributorOption.productCost * 0.07).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Options Ranked by Fair Algorithm */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            All Options (Ranked by Fairness)
          </h3>

          {sortedProducts.map((product, index) => (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all ${
                selectedProduct === product.id ? "ring-2 ring-primary" : ""
              } ${index === 0 ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200" : ""}`}
              onClick={() => setSelectedProduct(selectedProduct === product.id ? null : product.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {index === 0 && <Badge className="bg-yellow-500 text-white">Recommended</Badge>}
                    <div>
                      <h4 className="font-semibold">{product.supplier.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{product.supplier.distance}km away</span>
                        <span>|</span>
                        <span>{product.supplier.rating}/5.0 rating</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">Rs. {product.totalCost.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">total cost</p>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {product.trustBadges.map((badge: string, badgeIndex: number) => (
                    <Badge key={badgeIndex} variant="outline" className="text-xs">
                      {badge}
                    </Badge>
                  ))}
                </div>

                {/* Fairness Score */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Fair Choice Score:</span>
                    <Badge variant={product.fairnessScore >= 0.7 ? "default" : "secondary"}>
                      {Math.round(product.fairnessScore * 100)}%
                    </Badge>
                  </div>

                  {product.supplier.type === "local" && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Leaf className="h-3 w-3" />
                      <span className="text-xs">Supports Local</span>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {selectedProduct === product.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Product Cost:</span>
                        <span>Rs. {product.productCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Cost:</span>
                        <span>Rs. {product.deliveryCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform Fee:</span>
                        <span>
                          Rs.{" "}
                          {(
                            fairAlgorithm.calculateCommission(product.supplier, product.productCost) *
                            product.productCost
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Time:</span>
                        <span>{product.supplier.responseTime}h response</span>
                      </div>
                    </div>

                    <Button className="w-full" size="sm">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Get Detailed Quote
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="bg-gradient-to-r from-gray-50 to-slate-50">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">Why This Ranking?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Local suppliers get priority to support your community</li>
              <li>- Verified suppliers are ranked higher for trust</li>
              <li>- Rating and proximity are considered for quality</li>
              <li>- Price is balanced with other factors for fairness</li>
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
