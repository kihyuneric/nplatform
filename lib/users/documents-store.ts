/**
 * lib/users/documents-store.ts
 *
 * 단일 in-memory 문서 스토어 (회원가입 + /my/kyc 공유).
 * - signup → POST /api/v1/users/documents 로 등록 (user_id=email)
 * - /my/kyc → GET/POST /api/v1/users/me/kyc-documents (현재 로그인 사용자 email/uid 기반)
 * - admin   → PATCH /api/v1/users/documents 로 PENDING/APPROVED/REJECTED 변경
 *
 * 모듈 레벨 배열은 Next.js dev/edge 런타임 워커 간 공유되지 않을 수 있으나
 * 본 데모 환경에서는 동일 워커 내에서 일관성을 유지한다.
 */

export type UserDocumentStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface UserDocument {
  id: string
  user_id: string          // 보통 email (signup 흐름) 혹은 user uuid
  type: string             // "사업자등록증" | "명함" | "신분증 사본" 등
  name: string
  data: string             // data-URL (base64) — 비어 있을 수 있음
  status: UserDocumentStatus
  uploaded_at: string
  reviewed_at?: string
  review_note?: string
}

/* ------------------------------------------------------------------ */
/*  Seed                                                                */
/* ------------------------------------------------------------------ */

const SEED: UserDocument[] = [
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
    review_note: "스캔 화질 미흡 — 재업로드 요청",
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

/* ------------------------------------------------------------------ */
/*  Singleton store (module-level)                                      */
/* ------------------------------------------------------------------ */

declare global {
  // eslint-disable-next-line no-var
  var __userDocumentsStore: { docs: UserDocument[]; nextId: number } | undefined
}

function ensureStore() {
  if (!globalThis.__userDocumentsStore) {
    globalThis.__userDocumentsStore = { docs: [...SEED], nextId: SEED.length + 1 }
  }
  return globalThis.__userDocumentsStore
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                                */
/* ------------------------------------------------------------------ */

/** 사용자 문서 전체 (모든 user_id 후보 OR) */
export function listDocumentsForUser(userIds: string[]): UserDocument[] {
  const set = new Set(userIds.filter(Boolean))
  return ensureStore().docs.filter(d => set.has(d.user_id))
}

/** type 별 가장 최근 문서 1건 */
export function latestDocumentByType(userIds: string[], type: string): UserDocument | undefined {
  const list = listDocumentsForUser(userIds).filter(d => d.type === type)
  list.sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
  return list[0]
}

/** 사용자 문서 추가 (status=PENDING) — 같은 type 기존 문서는 유지(이력 보존) */
export function addUserDocument(input: {
  user_id: string
  type: string
  name: string
  data: string
}): UserDocument {
  const store = ensureStore()
  const doc: UserDocument = {
    id: `doc-${String(store.nextId++).padStart(3, "0")}`,
    user_id: input.user_id,
    type: input.type,
    name: input.name,
    data: input.data || "",
    status: "PENDING",
    uploaded_at: new Date().toISOString(),
  }
  store.docs.push(doc)
  return doc
}

/** 관리자 검토 결과 패치 */
export function patchUserDocument(input: {
  doc_id: string
  status: UserDocumentStatus
  review_note?: string
}): UserDocument | undefined {
  const store = ensureStore()
  const doc = store.docs.find(d => d.id === input.doc_id)
  if (!doc) return undefined
  doc.status = input.status
  doc.reviewed_at = new Date().toISOString()
  if (input.review_note !== undefined) doc.review_note = input.review_note
  return doc
}

/** 전체 문서 (관리자용) */
export function listAllDocuments(): UserDocument[] {
  return ensureStore().docs
}
