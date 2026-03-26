"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Verified, MapPin, Star, Award, Truck, Clock } from "lucide-react"

interface FairAlgorithmDisplayProps {
  supplier: {
    id: string
    name: string
    type: "local" | "distributor" | "premium"
    rating: number
    distance: number
    verified: boolean
    localBadge: boolean
    deliveryReliability: number
    responseTime: number
  }
  fairnessScore: number
  trustBadges: string[]
  showDetails?: boolean
}

export function FairAlgorithmDisplay({
  supplier,
  fairnessScore,
  trustBadges,
  showDetails = false,
}: FairAlgorithmDisplayProps) {
  const getFairnessColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-blue-600"
    if (score >= 0.4) return "text-yellow-600"
    return "text-gray-600"
  }

  const getFairnessLabel = (score: number) => {
    if (score >= 0.8) return "Excellent Choice"
    if (score >= 0.6) return "Good Choice"
    if (score >= 0.4) return "Fair Choice"
    return "Consider Alternatives"
  }

  return (
    <div className="space-y-3">
      {/* Trust Badges */}
      <div className="flex flex-wrap gap-1">
        {trustBadges.map((badge, index) => (
          <Badge key={index} variant={badge.includes("Local") ? "default" : "secondary"} className="text-xs gap-1">
            {badge.includes("Verified") && <Verified className="h-3 w-3" />}
            {badge.includes("Local") && <MapPin className="h-3 w-3" />}
            {badge.includes("Rated") && <Star className="h-3 w-3" />}
            {badge.includes("Delivery") && <Truck className="h-3 w-3" />}
            {badge.includes("Response") && <Clock className="h-3 w-3" />}
            {badge}
          </Badge>
        ))}
      </div>

      {/* Fairness Score */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Fair Choice Score</span>
            </div>
            <span className={`text-sm font-bold ${getFairnessColor(fairnessScore)}`}>
              {Math.round(fairnessScore * 100)}%
            </span>
          </div>
          <Progress value={fairnessScore * 100} className="h-2 mb-1" />
          <p className={`text-xs ${getFairnessColor(fairnessScore)}`}>{getFairnessLabel(fairnessScore)}</p>
        </CardContent>
      </Card>

      {/* Local First Highlight */}
      {supplier.type === "local" && supplier.localBadge && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-green-700">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">Supporting Local Business</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Choosing local suppliers helps your community and reduces delivery costs
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rating:</span>
            <span className="font-medium">{supplier.rating}/5.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Distance:</span>
            <span className="font-medium">{supplier.distance}km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reliability:</span>
            <span className="font-medium">{supplier.deliveryReliability}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Response:</span>
            <span className="font-medium">{supplier.responseTime}h</span>
          </div>
        </div>
      )}
    </div>
  )
}
