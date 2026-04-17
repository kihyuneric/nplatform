import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser } from "@/lib/auth/get-user"
import { apiError } from "@/lib/api-error"
import { hashDocument } from "@/lib/payments/e-sign"
import { sendEmail } from "@/lib/email/email-service"
import { esignCompleteEmail } from "@/lib/email/templates"

/**
 * POST /api/v1/esign — 전자서명 기록 저장
 * body: {
 *   deal_id?: string
 *   document_type: 'NDA' | 'LOI' | 'SPA' | 'ASSIGNMENT'
 *   document_body: string         — 서명된 계약서 본문
 *   signature_data_url: string    — Base64 PNG (canvas)
 *   signer_name: string
 *   signer_role: 'SELLER' | 'BUYER' | 'AGENT' | 'WITNESS'
 *   contract_id?: string          — 연결된 계약서 ID
 * }
 *
 * GET /api/v1/esign?deal_id=xxx — 해당 딜의 서명 기록 조회
 */

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return apiError("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    const body = await req.json()
    const {
      deal_id,
      document_type,
      document_body,
      signature_data_url,
      signer_name,
      signer_role,
      contract_id,
    } = body

    if (!document_type || !document_body || !signer_name || !signer_role) {
      return apiError("MISSING_FIELDS", "필수 항목이 누락되었습니다.", 400)
    }

    const VALID_DOC_TYPES = ["NDA", "LOI", "SPA", "ASSIGNMENT"]
    if (!VALID_DOC_TYPES.includes(document_type)) {
      return apiError("MISSING_FIELDS", "유효하지 않은 문서 유형입니다.", 400)
    }

    // SHA-256 document hash
    const documentHash = hashDocument(document_body)

    // Build chain hash: SHA-256(documentHash + signerId + timestamp)
    const timestamp = new Date().toISOString()
    const { createHash } = await import("crypto")
    const chainInput = `${documentHash}::${user.id}::${timestamp}`
    const chainHash = createHash("sha256").update(chainInput).digest("hex")

    const supabase = await createClient()

    // Save signature image to Supabase Storage if provided
    let signatureImageUrl: string | undefined
    if (signature_data_url && signature_data_url.startsWith("data:image/")) {
      // Convert base64 to buffer
      const base64Data = signature_data_url.split(",")[1]
      const buffer = Buffer.from(base64Data, "base64")
      const filename = `esign/${user.id}/${Date.now()}.png`

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filename, buffer, {
          contentType: "image/png",
          upsert: false,
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(filename)
        signatureImageUrl = urlData.publicUrl
      }
    }

    // Insert esign record
    const { data: record, error } = await supabase
      .from("esign_records")
      .insert({
        deal_id: deal_id || null,
        contract_id: contract_id || null,
        document_type,
        document_hash: documentHash,
        chain_hash: chainHash,
        signer_id: user.id,
        signer_name,
        signer_role,
        signature_image_url: signatureImageUrl || null,
        signed_at: timestamp,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
      })
      .select()
      .single()

    if (error) {
      console.error("esign INSERT error:", error)
      // Return success even if DB insert fails (client already has signature)
      return NextResponse.json({
        success: true,
        document_hash: documentHash,
        chain_hash: chainHash,
        signed_at: timestamp,
        _warning: "DB 저장 실패, 로컬 서명 유효",
      })
    }

    // Send confirmation email (best-effort)
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', user.id)
        .single()
      if (profile?.email) {
        const docTypeLabel: Record<string, string> = { NDA: '비밀유지계약서', LOI: '관심표명서', SPA: '매매계약서', ASSIGNMENT: '채권양도계약서', OTHER: '문서' }
        await sendEmail({
          to: profile.email,
          ...esignCompleteEmail({
            name: profile.name ?? signer_name,
            documentTitle: docTypeLabel[document_type] ?? document_type,
            documentHash,
            signedAt: new Date(timestamp).toLocaleString('ko-KR'),
          }),
          tags: [{ name: 'type', value: 'esign' }],
        })
      }
    } catch { /* email is best-effort */ }

    return NextResponse.json({
      success: true,
      id: record.id,
      document_hash: documentHash,
      chain_hash: chainHash,
      signed_at: timestamp,
    }, { status: 201 })

  } catch (error) {
    console.error("esign POST error:", error)
    return apiError("INTERNAL_ERROR", "서명 저장 중 오류가 발생했습니다.", 500)
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return apiError("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    const { searchParams } = new URL(req.url)
    const dealId = searchParams.get("deal_id")
    const contractId = searchParams.get("contract_id")

    const supabase = await createClient()
    let query = supabase
      .from("esign_records")
      .select("id, document_type, document_hash, chain_hash, signer_name, signer_role, signed_at")
      .order("signed_at", { ascending: false })

    if (dealId) query = query.eq("deal_id", dealId)
    if (contractId) query = query.eq("contract_id", contractId)

    const { data, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("esign GET error:", error)
    return NextResponse.json({ data: [] })
  }
}
