import { NextResponse } from "next/server"
import { getMarketRates } from "@/lib/server/market-store"

export async function GET() {
  try {
    const rates = await getMarketRates()
    return NextResponse.json(
      { rates, asOf: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    )
  } catch {
    return NextResponse.json({ error: "Unable to load market rates" }, { status: 500 })
  }
}
