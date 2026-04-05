import { NextResponse } from "next/server"
import { isSampleMode } from "@/lib/data-layer"

export async function GET() {
  const isSample = await isSampleMode()
  return NextResponse.json({ isSample })
}
