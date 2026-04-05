import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function handleApiError(error: unknown, context?: string) {
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', details: error.errors }
    }, { status: 400 })
  }

  console.error(`[API Error${context ? ` - ${context}` : ''}]`, error)

  return NextResponse.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }, { status: 500 })
}
