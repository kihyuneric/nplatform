import { NextResponse } from "next/server"
import { getMemoryStoreRef, getLoadedTables, isSampleMode } from "@/lib/data-layer"

/**
 * GET: Export all data as a single JSON file (all tables combined)
 * This allows backing up data before transitions.
 */
export async function GET() {
  const isSample = await isSampleMode()
  const store = getMemoryStoreRef()
  const loadedTables = getLoadedTables()

  const tableSummary: Record<string, { count: number; records: Record<string, unknown>[] }> = {}
  const exportData = {
    _meta: {
      exportedAt: new Date().toISOString(),
      isSample,
      version: "1.0",
      platform: "NPLATFORM",
    },
    tables: tableSummary,
  }

  for (const table of loadedTables) {
    const records = store[table] || []
    if (records.length > 0) {
      tableSummary[table] = {
        count: records.length,
        records,
      }
    }
  }

  const json = JSON.stringify(exportData, null, 2)

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="nplatform-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
