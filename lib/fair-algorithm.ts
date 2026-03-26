// Fair Algorithm System for BricksBazar
// Balances big distributors vs local retailers through intelligent scoring

export interface Supplier {
  id: string
  name: string
  type: "local" | "distributor" | "premium"
  rating: number
  distance: number
  verified: boolean
  localBadge: boolean
  reviewCount: number
  responseTime: number // hours
  deliveryReliability: number // percentage
  priceCompetitiveness: number // 0-1 scale
}

export interface Product {
  id: string
  name: string
  price: number
  supplier: Supplier
  deliveryCost: number
  totalCost: number
}

export interface FairAlgorithmConfig {
  localBoost: number // 0.3 = 30% boost for local suppliers
  verificationWeight: number // 0.2 = 20% weight for verification
  ratingWeight: number // 0.25 = 25% weight for rating
  proximityWeight: number // 0.15 = 15% weight for proximity
  priceWeight: number // 0.1 = 10% weight for price (intentionally low)
}

const DEFAULT_CONFIG: FairAlgorithmConfig = {
  localBoost: 0.3,
  verificationWeight: 0.2,
  ratingWeight: 0.25,
  proximityWeight: 0.15,
  priceWeight: 0.1,
}

export class FairAlgorithm {
  private config: FairAlgorithmConfig

  constructor(config: FairAlgorithmConfig = DEFAULT_CONFIG) {
    this.config = config
  }

  // Calculate Fair Score for each supplier
  calculateFairScore(supplier: Supplier, maxDistance = 50): number {
    let score = 0

    // 1. Local First Policy - boost local suppliers
    if (supplier.type === "local" && supplier.localBadge) {
      score += this.config.localBoost
    }

    // 2. Verification Score
    if (supplier.verified) {
      score += this.config.verificationWeight
    }

    // 3. Rating Score (normalized to 0-1)
    const ratingScore = (supplier.rating - 1) / 4 // Convert 1-5 to 0-1
    score += ratingScore * this.config.ratingWeight

    // 4. Proximity Score (closer = better)
    const proximityScore = Math.max(0, 1 - supplier.distance / maxDistance)
    score += proximityScore * this.config.proximityWeight

    // 5. Price Competitiveness (intentionally low weight)
    score += supplier.priceCompetitiveness * this.config.priceWeight

    return Math.min(1, score) // Cap at 1.0
  }

  // Dynamic Commission Calculator
  calculateCommission(supplier: Supplier, orderValue: number): number {
    const baseCommission = 0.05 // 5% base

    if (supplier.type === "local") {
      return baseCommission * 0.6 // 40% reduction for local suppliers
    } else if (supplier.type === "distributor") {
      return baseCommission * 1.4 // 40% increase for distributors
    }

    return baseCommission
  }

  // Sort products using Fair Algorithm
  sortProductsByFairness(products: Product[]): Product[] {
    return products.sort((a, b) => {
      const scoreA = this.calculateFairScore(a.supplier)
      const scoreB = this.calculateFairScore(b.supplier)

      // Higher fair score = better ranking
      return scoreB - scoreA
    })
  }

  // Get trust badges for suppliers
  getTrustBadges(supplier: Supplier): string[] {
    const badges: string[] = []

    if (supplier.verified) badges.push("Verified Supplier")
    if (supplier.type === "local" && supplier.localBadge) badges.push("Local Verified")
    if (supplier.rating >= 4.5) badges.push("Top Rated")
    if (supplier.deliveryReliability >= 95) badges.push("Reliable Delivery")
    if (supplier.responseTime <= 2) badges.push("Quick Response")

    return badges
  }

  // Calculate total cost including delivery and fair pricing
  calculateTotalCost(
    product: Product,
    quantity: number,
  ): {
    productCost: number
    deliveryCost: number
    totalCost: number
    fairnessScore: number
    savings: number
  } {
    const productCost = product.price * quantity
    const deliveryCost = product.deliveryCost
    const totalCost = productCost + deliveryCost
    const fairnessScore = this.calculateFairScore(product.supplier)

    // Calculate potential savings from supporting local suppliers
    const savings = product.supplier.type === "local" ? deliveryCost * 0.3 : 0

    return {
      productCost,
      deliveryCost,
      totalCost,
      fairnessScore,
      savings,
    }
  }
}

export const fairAlgorithm = new FairAlgorithm()
