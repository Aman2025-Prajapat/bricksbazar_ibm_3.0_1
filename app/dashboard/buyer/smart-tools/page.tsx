import PriceComparison from "@/components/smart-tools/price-comparison"
import QualityChecker from "@/components/smart-tools/quality-checker"
import DeliveryOptimizer from "@/components/smart-tools/delivery-optimizer"
import EnhancedLocationCosting from "@/components/smart-tools/enhanced-location-costing"
import ConstructionPlanning from "@/components/smart-tools/construction-planning"

export default function SmartToolsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Smart Tools</h1>
        <p className="text-muted-foreground">AI-powered tools to help you make better purchasing decisions</p>
      </div>

      <div className="space-y-8">
        <EnhancedLocationCosting />
        <ConstructionPlanning />
        <PriceComparison />
        <QualityChecker />
        <DeliveryOptimizer />
      </div>
    </div>
  )
}
