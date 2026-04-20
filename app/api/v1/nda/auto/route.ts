/**
 * POST /api/v1/nda/auto
 *
 * Phase 3-E: NDA 자동 생성 · 원클릭 서명
 *
 * 흐름:
 *   1) 인증 확인
 *   2) listing + seller (institution) 메타 조회
 *   3) 현재 사용자 프로필 조회 (institution_kyc_profiles)
 *   4) NDA_KO_V1 템플릿 변수 자동 바인딩
 *   5) action=preview → 미리보기 JSON 반환
 *      action=sign    → SignSession 생성 + npl_ndas insert + audit_logs 기록
 *
 * 요청 body: { listing_id: string, action?: "preview" | "sign" }
 *
 * 응답 (preview):
 *   { ok, preview, body, missing[], documentHash, expiryDate }
 *
 * 응답 (sign):
 *   { ok, ndaId, sessionId, documentHash, chainHash?, signedAt, pdfUrl? }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { getTemplate, bindVariables } from "@/lib/beachhead/nda-loi-templates"
import { createSignSession, hashDocument } from "@/lib/payments/e-sign"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── Helpers ────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

// ─── Main Handler ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // ─── 1) 인증 ─────────────────────────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 },
      )
    }

    // ─── 2) Body ─────────────────────────────────────────────
    let body: { listing_id?: string; action?: "preview" | "sign" }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_BODY", message: "JSON 본문 파싱 실패" } },
        { status: 400 },
      )
    }

    const { listing_id, action = "preview" } = body
    if (!listing_id) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELD", message: "listing_id 필수" } },
        { status: 400 },
      )
    }

    // ─── 3) Listing 조회 ─────────────────────────────────────
    const { data: listing, error: listingErr } = await supabase
      .from("npl_listings")
      .select(
        "id, title, seller_id, collateral_type, sido, sigungu, address, address_masked, claim_amount, appraised_value",
      )
      .eq("id", listing_id)
      .single()

    if (listingErr || !listing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "매물을 찾을 수 없습니다." } },
        { status: 404 },
      )
    }

    // ─── 4) 이미 서명했는지 ──────────────────────────────────
    const { data: existingNda } = await supabase
      .from("npl_ndas")
      .select("id, signed_at")
      .eq("user_id", user.id)
      .eq("listing_id", listing_id)
      .maybeSingle()

    if (existingNda && action === "sign") {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_SIGNED",
            message: "이미 이 매물에 대해 NDA를 체결하셨습니다.",
          },
          data: { ndaId: existingNda.id, signedAt: existingNda.signed_at },
        },
        { status: 409 },
      )
    }

    // ─── 5) Seller (institution) 프로필 조회 ───────────────
    // 우선 institution_kyc_profiles 를 조회하고, 없으면 기본값 사용
    let disclosureName = "NPLatform 매도자"
    let disclosureBizNo = "000-00-00000"
    let disclosureAddress = "대한민국"
    let disclosureRep = "담당자"

    if (listing.seller_id) {
      const { data: sellerKyc } = await supabase
        .from("institution_kyc_profiles")
        .select("company_name, business_number, representative_name")
        .eq("user_id", listing.seller_id)
        .maybeSingle()

      if (sellerKyc) {
        disclosureName = sellerKyc.company_name ?? disclosureName
        disclosureBizNo = sellerKyc.business_number ?? disclosureBizNo
        disclosureRep = sellerKyc.representative_name ?? disclosureRep
      }
    }

    // ─── 6) Recipient (현재 사용자) 프로필 조회 ────────────
    let recipientName = user.email?.split("@")[0] ?? "수령자"
    let recipientBizNo = "000-00-00000"
    let recipientAddress = "대한민국"
    let recipientRep = recipientName

    const { data: userKyc } = await supabase
      .from("institution_kyc_profiles")
      .select("company_name, business_number, representative_name")
      .eq("user_id", user.id)
      .maybeSingle()

    if (userKyc) {
      recipientName = userKyc.company_name ?? recipientName
      recipientBizNo = userKyc.business_number ?? recipientBizNo
      recipientRep = userKyc.representative_name ?? recipientRep
    }

    // ─── 7) 템플릿 바인딩 ─────────────────────────────────
    const template = getTemplate("NDA", "ko")
    if (!template) {
      return NextResponse.json(
        { error: { code: "TEMPLATE_MISSING", message: "NDA 템플릿을 찾을 수 없습니다." } },
        { status: 500 },
      )
    }

    const effectiveDate = fmtDate(new Date())
    const expiryDate = fmtDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)) // 6 개월

    const vars: Record<string, string> = {
      DISCLOSER_NAME: disclosureName,
      DISCLOSER_BIZNO: disclosureBizNo,
      DISCLOSER_ADDRESS: disclosureAddress,
      DISCLOSER_REPRESENTATIVE: disclosureRep,
      RECIPIENT_NAME: recipientName,
      RECIPIENT_BIZNO: recipientBizNo,
      RECIPIENT_ADDRESS: recipientAddress,
      RECIPIENT_REPRESENTATIVE: recipientRep,
      LISTING_ID: listing.id,
      LISTING_TITLE: listing.title ?? "NPL 매물",
      LISTING_COLLATERAL_ADDRESS: listing.address_masked ?? listing.address ?? "",
      EFFECTIVE_DATE: effectiveDate,
      EXPIRY_DATE: expiryDate,
      PENALTY_AMOUNT: "1억원",
    }

    const { filled, missing } = bindVariables(template, vars)
    const documentHash = hashDocument(filled)

    // ─── 8) action=preview → 즉시 반환 ─────────────────────
    if (action === "preview") {
      return NextResponse.json({
        ok: true,
        data: {
          preview: filled.slice(0, 1500),
          body: filled,
          missing,
          documentHash,
          effectiveDate,
          expiryDate,
          templateId: template.id,
          templateVersion: template.version,
          listing: {
            id: listing.id,
            title: listing.title,
          },
        },
      })
    }

    // ─── 9) action=sign → 서명 기록 생성 ────────────────────
    if (action !== "sign") {
      return NextResponse.json(
        { error: { code: "BAD_ACTION", message: `알 수 없는 action: ${action}` } },
        { status: 400 },
      )
    }

    // 누락 변수가 있어도 서명 가능하지만 경고 플래그 부여
    const hasMissing = missing.length > 0

    // SignSession 생성 (SELLER + BUYER) — CI 는 추후 PASS 연동 시 바인딩
    let sessionId: string | null = null
    let chainHash: string | null = null
    try {
      const session = createSignSession({
        documentId: `NDA-${listing.id}-${user.id.slice(0, 8)}`,
        documentBody: filled,
        signers: [
          {
            userId: listing.seller_id ?? "00000000-0000-0000-0000-000000000000",
            role: "SELLER",
            name: disclosureName,
            email: "seller@nplatform.local", // 실제 이메일은 institution_kyc_profiles 에 없을 수 있음
          },
          {
            userId: user.id,
            role: "BUYER",
            name: recipientName,
            email: user.email ?? "recipient@nplatform.local",
          },
        ],
        ttlDays: 180,
      })
      sessionId = session.id
      chainHash = session.chainHash ?? null
    } catch (err: any) {
      // SignSession 생성 실패해도 원클릭 NDA 는 기록 (fallback)
      logger.warn("[nda/auto] SignSession 생성 실패", { error: err?.message })
    }

    // ─── 10) npl_ndas insert ─────────────────────────────────
    const ipAddress = getIp(req)
    const { data: nda, error: ndaErr } = await supabase
      .from("npl_ndas")
      .insert({
        user_id: user.id,
        listing_id: listing.id,
        ip_address: ipAddress,
        signed_at: new Date().toISOString(),
      })
      .select("id, signed_at")
      .single()

    if (ndaErr || !nda) {
      return NextResponse.json(
        { error: { code: "INSERT_FAILED", message: ndaErr?.message ?? "NDA 기록 실패" } },
        { status: 500 },
      )
    }

    // ─── 11) Audit log ───────────────────────────────────────
    try {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "NDA_AUTO_SIGN",
        resource_type: "listing",
        resource_id: listing.id,
        details: {
          nda_id: nda.id,
          listing_title: listing.title,
          sign_session_id: sessionId,
          document_hash: documentHash,
          chain_hash: chainHash,
          template: template.id,
          template_version: template.version,
          effective_date: effectiveDate,
          expiry_date: expiryDate,
          missing_vars: missing,
        },
        ip_address: ipAddress,
      })
    } catch (err) {
      // audit 실패는 NDA 서명을 막지 않음
      logger.warn("[nda/auto] audit_logs insert 실패", { error: err })
    }

    // ─── 12) 결과 반환 ──────────────────────────────────────
    return NextResponse.json(
      {
        ok: true,
        data: {
          ndaId: nda.id,
          signSessionId: sessionId,
          documentHash,
          chainHash,
          signedAt: nda.signed_at,
          effectiveDate,
          expiryDate,
          templateId: template.id,
          templateVersion: template.version,
          missing,
          hasMissingVars: hasMissing,
          pdfUrl: null, // 추후 워터마크 PDF 생성 파이프라인 연결 지점
          // 딜룸 접근 승격 신호 (UI 가 로컬에서 L1 → L2 처리)
          grantAccessLevel: "L2",
        },
      },
      { status: 201 },
    )
  } catch (err: any) {
    logger.error("[nda/auto] 처리 실패", { error: err?.message ?? err })
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err?.message ?? "NDA 자동화 처리 중 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    )
  }
}
