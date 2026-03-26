import { FAQSystem } from "@/components/shared/faq-system"

export default function SellerFAQPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Seller Help & Support</h1>
        <p className="text-muted-foreground">Find answers to questions about selling on BricksBazar</p>
      </div>

      <FAQSystem />
    </div>
  )
}
