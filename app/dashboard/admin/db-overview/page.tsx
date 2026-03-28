"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, RefreshCw, Server, Table as TableIcon } from "lucide-react"

type TableStat = {
  table: string
  label: string
  count: number
  exists: boolean
  note?: string
}

type DbOverviewPayload = {
  generatedAt: string
  database: {
    provider: string
    displayUrl: string
    isProductionLike: boolean
    connected: boolean
    connectionLatencyMs: number
    connectionError: string | null
  }
  totals: {
    trackedTableCount: number
    availableTableCount: number
    totalRows: number
  }
  tables: TableStat[]
  dataEntryPoints: string[]
  importHints: string[]
}

export default function AdminDbOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState<DbOverviewPayload | null>(null)

  const loadOverview = async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError("")

    try {
      const response = await fetch("/api/admin/db-overview", {
        credentials: "include",
        cache: "no-store",
      })
      const payload = (await response.json()) as DbOverviewPayload & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || "Could not load DB overview")
      }
      setData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load DB overview")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  const sortedTables = useMemo(() => {
    if (!data) return []
    return [...data.tables].sort((a, b) => b.count - a.count)
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">DB Overview</h1>
          <p className="text-muted-foreground">Prisma database health, table counts and real-world data entry map</p>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent" disabled={refreshing || loading} onClick={() => void loadOverview(true)}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Could not load DB overview</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connection</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-2">
                <Badge variant={data.database.connected ? "default" : "destructive"}>
                  {data.database.connected ? "Connected" : "Disconnected"}
                </Badge>
                <p className="text-xs text-muted-foreground">{data.database.connectionLatencyMs} ms</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Provider</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium uppercase">{data.database.provider}</p>
                </div>
                <p className="text-xs text-muted-foreground break-all">{data.database.displayUrl}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tracked Tables</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <p className="text-2xl font-bold">
                {data.totals.availableTableCount}/{data.totals.trackedTableCount}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <p className="text-2xl font-bold">{data.totals.totalRows.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5" />
            Table-wise Data Count
          </CardTitle>
          <CardDescription>
            Last refreshed: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <p className="text-sm text-muted-foreground">Loading table stats...</p>
          ) : (
            <div className="space-y-2">
              {sortedTables.map((entry) => (
                <div key={entry.table} className="flex items-center justify-between rounded border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">{entry.label}</p>
                    <p className="text-xs text-muted-foreground break-all">{entry.table}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{entry.count.toLocaleString()}</p>
                    <Badge variant={entry.exists ? "default" : "secondary"}>{entry.exists ? "active" : "missing"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Data Kahan Show Hota Hai
            </CardTitle>
            <CardDescription>Ye DB data dashboard me in flows se visible hota hai.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data?.dataEntryPoints || []).map((entry) => (
              <div key={entry} className="rounded border bg-muted/20 px-3 py-2">
                {entry}
              </div>
            ))}
            <div className="rounded border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Live table view direct dekhna ho to terminal me run karo: <code>npx prisma studio</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-Life Data Import Guide</CardTitle>
            <CardDescription>Jo practical real-world data use karna hai, uske liye recommended path.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(data?.importHints || []).map((hint) => (
              <div key={hint} className="rounded border bg-muted/20 px-3 py-2">
                {hint}
              </div>
            ))}
            <div className="rounded border px-3 py-2">
              <p className="font-medium">Import options</p>
              <p className="text-xs text-muted-foreground mt-1">
                1) Dashboard forms se entry (safest), 2) API calls se bulk seed, 3) Prisma Studio se manual correction.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
