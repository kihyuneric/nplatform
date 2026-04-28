/**
 * /api/v1/users/me/kyc-documents
 *
 * GET   현재 로그인 사용자의 KYC 문서(사업자등록증·명함) 최신 1건씩.
 * POST  본인 KYC 문서 업로드 — PENDING 으로 등록.
 *
 * signup 흐름은 user_id=email 로 저장하므로, 본 라우트는 [user.email, user.id, fallback]
 * 모두 OR 조회하여 회원가입 시 업로드된 문서를 그대로 노출한다.
 */

import { NextRequest, NextResponse } from "next/server"
import { Errors } from "@/lib/api-error"
import { getAuthUser } from "@/lib/auth/get-user"
import {
  addUserDocument,
  latestDocumentByType,
  listDocumentsForUser,
} from "@/lib/users/documents-store"

const ALLOWED_TYPES = ["사업자등록증", "명함"] as const
type AllowedType = typeof ALLOWED_TYPES[number]

const FALLBACK_USER_IDS = ["user-001"] // 데모 환경: 인증 미연결 시 기본 데모 사용자

async function resolveUserIds(): Promise<string[]> {
  const user = await getAuthUser()
  const ids: string[] = []
  if (user?.email) ids.push(user.email)
  if (user?.id) ids.push(user.id)
  if (ids.length === 0) ids.push(...FALLBACK_USER_IDS)
  return ids
}

/* ------------------------------------------------------------------ */
/*  GET                                                                 */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const userIds = await resolveUserIds()
    // 두 슬롯 type 별 최신 1건만 반환
    const documents = ALLOWED_TYPES
      .map(type => latestDocumentByType(userIds, type))
      .filter(Boolean)

    // 빈 응답이면 본인 모든 문서를 한번 더 조회해 디버그 노출 (참고용)
    const allOwnDocs = listDocumentsForUser(userIds)

    return NextResponse.json({
      documents,
      _meta: { total_owned: allOwnDocs.length, user_ids: userIds },
    })
  } catch {
    return Errors.internal("문서를 불러오지 못했습니다.")
  }
}

/* ------------------------------------------------------------------ */
/*  POST   { type, name, data }                                         */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const type = String(body?.type ?? "")
    const name = String(body?.name ?? "")
    const data = String(body?.data ?? "")

    if (!ALLOWED_TYPES.includes(type as AllowedType)) {
      return Errors.badRequest(`type 은 ${ALLOWED_TYPES.join(" / ")} 중 하나여야 합니다.`)
    }
    if (!name) {
      return Errors.badRequest("name 은 필수입니다.")
    }
    if (data && data.length > 7_000_000) {
      return Errors.badRequest("파일 크기는 5MB 이하여야 합니다.")
    }

    const userIds = await resolveUserIds()
    // 본인 식별자 중 가장 안정적인 것 (email > uuid > fallback) 으로 저장
    const ownerId = userIds[0]

    const doc = addUserDocument({ user_id: ownerId, type, name, data })
    return NextResponse.json({ document: doc }, { status: 201 })
  } catch {
    return Errors.badRequest("요청 형식이 올바르지 않습니다.")
  }
}
