"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, FileUp, Loader2, UploadCloud } from "lucide-react"

type ImportIssue = {
  rowNo: number
  reason: string
}

type PreviewRow = {
  rowNo: number
  orderNumber: string
  amount: number
  status: string
  method: string
  createdAt: string | null
}

type ImportResponse = {
  mode: "preview" | "apply"
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    created?: number
    updated?: number
    applyFailed?: number
  }
  previewRows: PreviewRow[]
  issues: ImportIssue[]
  error?: string
}

export default function AdminImportsPage() {
  const [csvText, setCsvText] = useState("")
  const [fileName, setFileName] = useState("")
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ImportResponse | null>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    setFileName(file.name)
    setError("")
    setResult(null)
  }

  const callImportApi = async (action: "preview" | "apply") => {
    if (!csvText.trim()) {
      setError("CSV file upload karo ya CSV text paste karo.")
      return
    }

    if (action === "preview") {
      setLoading(true)
    } else {
      setApplying(true)
    }
    setError("")

    try {
      const response = await fetch("/api/admin/import/distributor-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, csvText }),
      })
      const payload = (await response.json()) as ImportResponse
      if (!response.ok) {
        throw new Error(payload.error || "Import request failed")
      }
      setResult(payload)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import request failed")
    } finally {
      setLoading(false)
      setApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CSV Imports</h1>
        <p className="text-muted-foreground">Import distributor payments CSV into payment records with preview and validation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            Distributor Payments Import
          </CardTitle>
          <CardDescription>
            Required CSV columns: <code>orderNumber</code> (or <code>orderId</code>). Optional: <code>status</code>, <code>method</code>, <code>grossOrderAmount</code>, <code>date</code>, <code>paymentId</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0] || null
              void handleFile(file)
            }}
          />

          {fileName ? (
            <p className="text-sm text-muted-foreground">
              Selected file: <span className="font-medium">{fileName}</span>
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button variant="outline" className="bg-transparent" onClick={() => void callImportApi("preview")} disabled={loading || applying}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
              Preview Import
            </Button>
            <Button onClick={() => void callImportApi("apply")} disabled={loading || applying || !result || result.summary.validRows === 0}>
              {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
              Apply Import
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Rows</p>
                <p className="text-2xl font-bold">{result.summary.totalRows}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Valid Rows</p>
                <p className="text-2xl font-bold text-emerald-600">{result.summary.validRows}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Invalid Rows</p>
                <p className="text-2xl font-bold text-amber-600">{result.summary.invalidRows}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-2xl font-bold">{result.summary.created ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="text-2xl font-bold">{result.summary.updated ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Apply Failed</p>
                <p className="text-2xl font-bold text-destructive">{result.summary.applyFailed ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Preview Rows (first 20)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.previewRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No valid rows to preview.</p>
              ) : (
                result.previewRows.map((row) => (
                  <div key={row.rowNo} className="flex items-center justify-between rounded border p-3 text-sm">
                    <div>
                      <p className="font-medium">Row {row.rowNo} - {row.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Amount: Rs {row.amount.toLocaleString()} | Method: {row.method} | Date: {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "auto"}
                      </p>
                    </div>
                    <Badge variant={row.status === "paid" ? "default" : row.status === "failed" ? "destructive" : "secondary"}>
                      {row.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Validation Issues
              </CardTitle>
              <CardDescription>First 100 issues shown.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.issues.length === 0 ? (
                <p className="text-sm text-emerald-700">No validation issues found.</p>
              ) : (
                result.issues.map((issue, index) => (
                  <div key={`${issue.rowNo}-${index}`} className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Row {issue.rowNo}: {issue.reason}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
