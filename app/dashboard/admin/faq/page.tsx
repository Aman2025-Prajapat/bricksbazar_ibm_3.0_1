import { FAQSystem } from "@/components/shared/faq-system"

export default function AdminFAQPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">FAQ Management</h1>
        <p className="text-muted-foreground">Manage frequently asked questions and help content</p>
      </div>

      <FAQSystem />
    </div>
  )
}
