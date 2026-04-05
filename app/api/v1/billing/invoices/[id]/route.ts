import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { getById } from '@/lib/data-layer'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: invoice } = await getById('invoices', id)

    if (!invoice) {
      return Errors.notFound('Invoice not found')
    }

    return NextResponse.json({ data: invoice })
  } catch {
    return Errors.internal('Internal server error')
  }
}
