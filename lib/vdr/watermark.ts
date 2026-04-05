// ============================================================
// lib/vdr/watermark.ts
// VDR PDF Watermarking – 문서 보안을 위한 사용자 정보 워터마크
//
// NOTE: pdf-lib이 package.json에 없습니다.
// 현재 구현은 스텁(stub)으로, 원본 바이트를 그대로 반환합니다.
// pdf-lib 추가 후 아래 TODO 구현을 활성화하세요:
//   npm install pdf-lib
//
// TODO(watermark): pdf-lib 설치 후 아래 주석 처리된 구현으로 교체
// import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
// ============================================================

export interface WatermarkOptions {
  /** Supabase user UUID */
  userId: string
  /** 표시 이름 */
  userName: string
  /** 사용자 이메일 */
  userEmail: string
  /** 요청자 IP (선택) */
  ipAddress?: string
  /** 문서 UUID */
  documentId: string
  /** 워터마크 타임스탬프 (기본: 현재 시각) */
  timestamp?: Date
  /** 불투명도 0~1 (기본: 0.15) */
  opacity?: number
  /** 커스텀 워터마크 텍스트 (기본: buildWatermarkText 결과) */
  text?: string
  /** 위치 전략 (기본: 'diagonal') */
  position?: 'diagonal' | 'center' | 'footer'
}

export interface WatermarkResult {
  success: boolean
  watermarkedPdfBytes?: Uint8Array
  watermarkedPdfBase64?: string
  error?: string
}

// ─── 워터마크 텍스트 생성 ─────────────────────────────────

function buildWatermarkText(options: WatermarkOptions): string {
  const date = (options.timestamp ?? new Date()).toLocaleDateString('ko-KR')
  return [
    options.userName,
    options.userEmail,
    options.ipAddress ? `IP: ${options.ipAddress}` : '',
    date,
    `DOC: ${options.documentId.slice(0, 8)}`,
  ]
    .filter(Boolean)
    .join('  |  ')
}

// ─── 메인 워터마크 함수 ───────────────────────────────────

/**
 * PDF에 사용자 정보 워터마크를 추가합니다.
 *
 * pdf-lib이 설치되지 않아 현재는 스텁 동작:
 * - 원본 바이트를 그대로 반환
 * - 워터마크 텍스트와 옵션을 콘솔에 로깅
 *
 * TODO(watermark): pdf-lib 설치 후 아래 구현으로 교체
 * ```typescript
 * import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
 *
 * const pdfDoc = await PDFDocument.load(inputBytes)
 * const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
 * const pages = pdfDoc.getPages()
 * const watermarkText = options.text ?? buildWatermarkText(options)
 * const opacity = options.opacity ?? 0.15
 *
 * for (const page of pages) {
 *   const { width, height } = page.getSize()
 *   const fontSize = Math.min(width, height) * 0.035
 *   const textWidth = font.widthOfTextAtSize(watermarkText, fontSize)
 *
 *   // 대각선 중앙 워터마크
 *   if (options.position !== 'footer') {
 *     page.drawText(watermarkText, {
 *       x: (width - textWidth) / 2,
 *       y: height / 2,
 *       size: fontSize,
 *       font,
 *       color: rgb(0.5, 0.5, 0.5),
 *       opacity,
 *       rotate: degrees(45),
 *     })
 *   }
 *
 *   // 하단 footer 워터마크 (항상)
 *   const footerSize = Math.min(width, height) * 0.018
 *   page.drawText(watermarkText, {
 *     x: 20,
 *     y: 12,
 *     size: footerSize,
 *     font,
 *     color: rgb(0.4, 0.4, 0.4),
 *     opacity: 0.3,
 *   })
 * }
 *
 * const watermarkedBytes = await pdfDoc.save()
 * ```
 */
export async function addWatermarkToPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  options: WatermarkOptions
): Promise<WatermarkResult> {
  try {
    const watermarkText = options.text ?? buildWatermarkText(options)

    // 스텁 로깅 (pdf-lib 미설치)
    console.warn(
      '[VDR Watermark] pdf-lib이 설치되지 않아 워터마크 없이 원본 반환:\n' +
        `  documentId: ${options.documentId}\n` +
        `  userId:     ${options.userId}\n` +
        `  text:       ${watermarkText}`
    )

    // 원본 바이트를 Uint8Array로 정규화
    const inputBytes =
      pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)

    // base64 변환
    let base64 = ''
    try {
      // Node.js 환경
      base64 = Buffer.from(inputBytes).toString('base64')
    } catch {
      // 브라우저 환경 (엣지 케이스)
      base64 = btoa(String.fromCharCode(...inputBytes))
    }

    return {
      success: true,
      watermarkedPdfBytes: inputBytes,
      watermarkedPdfBase64: base64,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '워터마크 처리 중 알 수 없는 오류'
    console.error('[VDR Watermark] 오류:', err)
    return {
      success: false,
      error: message,
    }
  }
}
