import { FAQSystem } from "@/components/shared/faq-system"

export default function BuyerFAQPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="text-muted-foreground">Find answers to common questions about buying construction materials</p>
      </div>

      <FAQSystem />
    </div>
  )
}
