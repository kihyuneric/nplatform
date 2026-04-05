import { NextRequest, NextResponse } from "next/server"
import { Errors, fromUnknown } from '@/lib/api-error'
import { getAllRules, updateRule } from "@/lib/permissions"

// GET: list all permission rules
export async function GET() {
  const rules = getAllRules()
  return NextResponse.json({ data: rules })
}

// PATCH: update a rule (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { feature, ...updates } = body

    if (!feature) {
      return Errors.badRequest('feature is required')
    }

    const rules = getAllRules()
    const existing = rules.find(r => r.feature === feature)
    if (!existing) {
      return Errors.notFound('Feature not found')
    }

    updateRule(feature, updates)

    return NextResponse.json({ data: { feature, updated: true } })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}
