/**
 * lib/ocr/google-document-ai.ts
 *
 * Google Document AI 통합 — OCR 95% 정확도 목표.
 *
 * 환경변수:
 *   GOOGLE_APPLICATION_CREDENTIALS  (서비스 계정 JSON 경로 또는 stringified)
 *   GOOGLE_DOC_AI_PROJECT_ID
 *   GOOGLE_DOC_AI_LOCATION          (us / eu / asia-northeast3)
 *   GOOGLE_DOC_AI_PROCESSOR_ID      (Form Parser / Specialized parser)
 *
 * 현재 OCR 흐름:
 *   - Phase 1 (현행): Claude Vision API
 *   - Phase 2 (목표): Google Document AI → Claude Vision fallback
 *
 * 사용:
 *   const result = await extractWithDocumentAi(pdfBuffer, 'BOND_AGREEMENT')
 *   if (result.confidence < 0.9) { /* fallback to Claude * / }
 */

export type DocCategory =
  | 'BOND_AGREEMENT'        // 채권양수도계약서
  | 'REGISTRY'              // 등기부등본
  | 'APPRAISAL_REPORT'      // 감정평가서
  | 'AUCTION_NOTICE'        // 경매 공고
  | 'GENERIC'

export interface OcrResult {
  /** 추출된 raw 텍스트 */
  text: string
  /** 구조화 데이터 (form fields) */
  fields: Record<string, { value: string; confidence: number }>
  /** 전체 정확도 (0~1) */
  confidence: number
  /** 모델/소스 */
  source: 'google-doc-ai' | 'claude-vision' | 'fallback'
  /** 처리 시간 (ms) */
  durationMs: number
}

const isConfigured = () =>
  !!process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  !!process.env.GOOGLE_DOC_AI_PROJECT_ID &&
  !!process.env.GOOGLE_DOC_AI_PROCESSOR_ID

/**
 * Google Document AI 호출.
 * @google-cloud/documentai 의존성 필요 (Phase 2 활성화 시 npm install)
 */
export async function extractWithDocumentAi(
  pdfBuffer: ArrayBuffer,
  _category: DocCategory = 'GENERIC',
): Promise<OcrResult> {
  const startTs = Date.now()

  if (!isConfigured()) {
    // TODO Phase 2 활성화:
    //   const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai')
    //   const client = new DocumentProcessorServiceClient()
    //   const name = `projects/${PROJECT}/locations/${LOCATION}/processors/${PROCESSOR}`
    //   const [result] = await client.processDocument({
    //     name, rawDocument: { content: Buffer.from(pdfBuffer).toString('base64'), mimeType: 'application/pdf' }
    //   })
    //   return parseDocAiResponse(result.document, category)
    throw new Error('Google Document AI 미구성 — Phase 2 활성화 필요')
  }

  // Placeholder — 실제 구현은 의존성 설치 후
  return {
    text: '',
    fields: {},
    confidence: 0,
    source: 'fallback',
    durationMs: Date.now() - startTs,
  }
}

/**
 * 통합 OCR — Doc AI 시도 → 실패/저신뢰 시 Claude Vision fallback.
 *
 * Phase 1: Claude Vision only (현행 /api/v1/ocr 와 동일)
 * Phase 2: Doc AI → Claude Vision cascading
 */
export async function extractText(
  pdfBuffer: ArrayBuffer,
  category: DocCategory = 'GENERIC',
): Promise<OcrResult> {
  if (isConfigured()) {
    try {
      const result = await extractWithDocumentAi(pdfBuffer, category)
      if (result.confidence >= 0.9) return result
      // 저신뢰도 → Claude Vision fallback (구현 시 추가)
    } catch {
      // fallthrough
    }
  }

  // Phase 1 fallback — 호출자에게 Claude Vision 사용 안내
  // 실제 /api/v1/ocr 는 fromImage / fromPDF 함수 별도 호출 (lib/ocr/extractors.ts)
  throw new Error('Document AI 미구성 — /api/v1/ocr 의 Claude Vision 경로 사용 필요')
}
