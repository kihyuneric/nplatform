import { NextRequest, NextResponse } from "next/server"
import { Errors, fromUnknown } from '@/lib/api-error'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UserDocument {
  id: string
  user_id: string
  type: string
  name: string
  data: string          // data-URL (base64)
  status: "PENDING" | "APPROVED" | "REJECTED"
  uploaded_at: string
  reviewed_at?: string
}

/* ------------------------------------------------------------------ */
/*  In-memory store (demo / mock)                                      */
/* ------------------------------------------------------------------ */

const documents: UserDocument[] = [
  {
    id: "doc-001",
    user_id: "user-001",
    type: "사업자등록증",
    name: "사업자등록증_김민수.pdf",
    data: "",
    status: "APPROVED",
    uploaded_at: "2026-02-10T09:00:00Z",
    reviewed_at: "2026-02-11T14:00:00Z",
  },
  {
    id: "doc-002",
    user_id: "user-001",
    type: "신분증 사본",
    name: "신분증_김민수.jpg",
    data: "",
    status: "APPROVED",
    uploaded_at: "2026-02-10T09:05:00Z",
    reviewed_at: "2026-02-11T14:05:00Z",
  },
  {
    id: "doc-003",
    user_id: "user-002",
    type: "사업자등록증",
    name: "사업자등록증_이서연.pdf",
    data: "",
    status: "PENDING",
    uploaded_at: "2026-03-20T11:30:00Z",
  },
  {
    id: "doc-004",
    user_id: "user-003",
    type: "자격증 사본",
    name: "자격증_박지훈.pdf",
    data: "",
    status: "REJECTED",
    uploaded_at: "2026-03-15T08:00:00Z",
    reviewed_at: "2026-03-16T10:00:00Z",
  },
  {
    id: "doc-005",
    user_id: "user-003",
    type: "사업자등록증",
    name: "사업자등록증_박지훈.pdf",
    data: "",
    status: "PENDING",
    uploaded_at: "2026-03-15T08:05:00Z",
  },
  {
    id: "doc-006",
    user_id: "user-004",
    type: "신분증 사본",
    name: "신분증_최유진.jpg",
    data: "",
    status: "APPROVED",
    uploaded_at: "2026-03-01T10:00:00Z",
    reviewed_at: "2026-03-02T09:00:00Z",
  },
  {
    id: "doc-007",
    user_id: "user-004",
    type: "명함",
    name: "명함_최유진.jpg",
    data: "",
    status: "APPROVED",
    uploaded_at: "2026-03-01T10:05:00Z",
    reviewed_at: "2026-03-02T09:05:00Z",
  },
]

let nextId = 8

/* ------------------------------------------------------------------ */
/*  GET  ?user_id=xxx                                                   */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id")
  if (!userId) {
    return Errors.badRequest('user_id is required')
  }

  const userDocs = documents.filter((d) => d.user_id === userId)
  return NextResponse.json({ documents: userDocs })
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

    // Validate base64 size (~5 MB max after decoding)
    if (data && data.length > 7_000_000) {
      return Errors.badRequest('File too large (max 5MB)')
    }

    const doc: UserDocument = {
      id: `doc-${String(nextId++).padStart(3, "0")}`,
      user_id,
      type,
      name,
      data: data || "",
      status: "PENDING",
      uploaded_at: new Date().toISOString(),
    }
    documents.push(doc)

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH  { doc_id, status }                                           */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { doc_id, status } = body

    if (!doc_id || !status) {
      return Errors.badRequest('doc_id and status are required')
    }
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return Errors.badRequest('Invalid status')
    }

    const doc = documents.find((d) => d.id === doc_id)
    if (!doc) {
      return Errors.notFound('Document not found')
    }

    doc.status = status
    doc.reviewed_at = new Date().toISOString()

    return NextResponse.json({ document: doc })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}
