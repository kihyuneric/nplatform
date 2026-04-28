import { NextRequest, NextResponse } from "next/server"
import { Errors } from '@/lib/api-error'
import {
  listDocumentsForUser,
  addUserDocument,
  patchUserDocument,
  listAllDocuments,
} from "@/lib/users/documents-store"

/* ------------------------------------------------------------------ */
/*  GET  ?user_id=xxx                                                   */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id")
  if (!userId) {
    // 관리자 콘솔 등에서 user_id 없이 호출하면 전체 반환 (호환성 유지)
    return NextResponse.json({ documents: listAllDocuments() })
  }
  return NextResponse.json({ documents: listDocumentsForUser([userId]) })
}

/* ------------------------------------------------------------------ */
/*  POST  { user_id, type, name, data }                                */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, type, name, data } = body

    if (!user_id || !type || !name) {
      return Errors.badRequest('user_id, type, and name are required')
    }
    if (data && data.length > 7_000_000) {
      return Errors.badRequest('File too large (max 5MB)')
    }

    const doc = addUserDocument({ user_id, type, name, data: data || "" })
    return NextResponse.json({ document: doc }, { status: 201 })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH  { doc_id, status, review_note? }                             */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { doc_id, status, review_note } = body

    if (!doc_id || !status) {
      return Errors.badRequest('doc_id and status are required')
    }
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return Errors.badRequest('Invalid status')
    }

    const doc = patchUserDocument({ doc_id, status, review_note })
    if (!doc) return Errors.notFound('Document not found')
    return NextResponse.json({ document: doc })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}
