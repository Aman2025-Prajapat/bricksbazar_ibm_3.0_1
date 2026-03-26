"use client"

import SellerInventoryOptimizer from "@/components/smart-tools/seller-inventory-optimizer"
import SellerPricingOptimizer from "@/components/smart-tools/seller-pricing-optimizer"

export default function SellerSmartToolsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Seller Smart Tools</h1>
        <p className="text-muted-foreground">AI-powered tools to optimize your inventory and pricing strategies</p>
      </div>

      <div className="space-y-8">
        <SellerInventoryOptimizer />
        <SellerPricingOptimizer />
      </div>
    </div>
  )
}
