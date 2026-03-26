import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Central reporting workspace for marketplace performance and audits.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reports Module</CardTitle>
          <CardDescription>Use this page to integrate downloadable operational and financial reports.</CardDescription>
        </CardHeader>
        <CardContent>
          Report pipelines can be connected to real backend data in the next phase.
        </CardContent>
      </Card>
    </div>
  )
}
