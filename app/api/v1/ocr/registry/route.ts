/**
 * /api/v1/ocr/registry
 *
 * POST — 등기부등본 PDF/이미지 → V2 18 카탈로그 자동 매핑.
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-9 항목 처리.
 *
 * 흐름:
 *   1. 사용자가 등기부등본 PDF/이미지 업로드
 *   2. Claude Vision OCR (기존 /api/v1/ocr 재사용)
 *   3. 추출된 raw text 를 lib/ocr/registry-mapper 로 V2 카탈로그 매핑
 *   4. 자동체크된 키 + 후보 키 + evidence 반환
 *   5. 사용자가 UI 에서 검토 후 contract / npl_case_rights 에 저장
 *
 * 사용자 정책 정합:
 *   - 외부 OCR (Naver CLOVA, Google Vision) 미연동 — Claude Vision 단독
 *   - 자동체크는 confidence ≥ 0.7 매칭만, 나머지는 후보로만 제시
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import { mapRegistryToV2Catalog, type OcrRegistryInput } from '@/lib/ocr/registry-mapper'

interface RegistryOcrBody {
  /** 이미 OCR 처리된 raw text (선택) — 미지원 시 fileBase64 사용 */
  raw_text?: string
  /** PDF/이미지 base64 (선택) — Claude Vision 호출 */
  file_base64?: string
  /** 파일 MIME 타입 */
  mime_type?: string
  /** 추가 추출 메타 (지목 / 권리 / 부담 사항 등) */
  extracted?: OcrRegistryInput['extracted']
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    const body = (await req.json()) as Partial<RegistryOcrBody>

    // ─── 입력 결정: raw_text 우선, 없으면 OCR 호출 ───────────
    let rawText = body.raw_text?.trim() ?? ''

    if (!rawText && body.file_base64) {
      // 기존 /api/v1/ocr 라우트 재사용 — 이미 Claude Vision 통합
      const ocrUrl = new URL('/api/v1/ocr', req.url)
      const ocrRes = await fetch(ocrUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 인증 쿠키 forwarding
          ...(req.headers.get('cookie') ? { cookie: req.headers.get('cookie')! } : {}),
        },
        body: JSON.stringify({
          file_base64: body.file_base64,
          mime_type: body.mime_type ?? 'application/pdf',
          context: 'registry',
        }),
      })

      if (!ocrRes.ok) {
        return apiError('INTERNAL_ERROR', `OCR 호출 실패 (${ocrRes.status})`, 500)
      }
      const ocrData = await ocrRes.json() as { text?: string; raw?: string }
      rawText = (ocrData.text ?? ocrData.raw ?? '').trim()
    }

    if (!rawText) {
      return apiError('BAD_REQUEST', 'raw_text 또는 file_base64 필수', 400)
    }

    if (rawText.length < 50) {
      return apiError('BAD_REQUEST', 'OCR 결과가 너무 짧습니다 (50자 미만) — 이미지 품질 확인 필요', 400)
    }

    // ─── V2 카탈로그 매핑 ──────────────────────────────────
    const result = mapRegistryToV2Catalog({
      rawText,
      extracted: body.extracted,
    })

    return NextResponse.json({
      ok: true,
      result,
      summary: {
        auto_checked_count: result.autoCheckedKeys.length,
        candidate_count: result.candidateKeys.length,
        total_catalog_size: result.conditions.length,
        average_confidence: result.averageConfidence,
        analyzed_at: result.analyzedAt,
      },
      // UI 가이드: 자동체크된 키와 후보 키 분리 표시
      auto_checked_keys: result.autoCheckedKeys,
      candidate_keys: result.candidateKeys,
    })
  } catch (err) {
    console.error('[ocr/registry POST]', err)
    return apiError('INTERNAL_ERROR', '등기부 분석 실패', 500)
  }
}
