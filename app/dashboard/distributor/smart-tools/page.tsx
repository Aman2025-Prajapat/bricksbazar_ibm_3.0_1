"use client"

import DistributorRouteOptimizer from "@/components/smart-tools/distributor-route-optimizer"

export default function DistributorSmartToolsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Distributor Smart Tools</h1>
        <p className="text-muted-foreground">AI-powered tools for route optimization and delivery management</p>
      </div>

      <div className="space-y-8">
        <DistributorRouteOptimizer />
      </div>
    </div>
  )
}
