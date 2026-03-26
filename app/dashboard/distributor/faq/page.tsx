import { FAQSystem } from "@/components/shared/faq-system"

export default function DistributorFAQPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Distributor Help & Support</h1>
        <p className="text-muted-foreground">Find answers to questions about delivery and logistics</p>
      </div>

      <FAQSystem />
    </div>
  )
}
