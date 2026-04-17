// ============================================================
// lib/vdr/watermark.ts
// VDR PDF Watermarking – 문서 보안을 위한 사용자 정보 워터마크
// ============================================================

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

// ─── 타입 정의 ────────────────────────────────────────────

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

// ─── 그리드 워터마크 적용 (내부 헬퍼) ──────────────────────

async function applyWatermarkGrid(
  pdfDoc: PDFDocument,
  watermarkText: string,
  timestampText: string,
  opacity: number,
  position: 'diagonal' | 'center' | 'footer'
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()

  for (const page of pages) {
    const { width, height } = page.getSize()

    if (position !== 'footer') {
      // 그리드 패턴: 150px 수평 간격, 200px 수직 간격
      const gridSpacingX = 150
      const gridSpacingY = 200
      const fontSize = 48

      // 대각선(-45도) 텍스트를 그리드 전체에 반복
      for (let y = 0; y < height + gridSpacingY; y += gridSpacingY) {
        for (let x = -gridSpacingX; x < width + gridSpacingX; x += gridSpacingX) {
          page.drawText(watermarkText, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
            opacity,
            rotate: degrees(-45),
          })
        }
      }

      // 타임스탬프 라인 (작은 크기, 같은 그리드)
      const tsFontSize = 14
      for (let y = gridSpacingY / 2; y < height + gridSpacingY; y += gridSpacingY) {
        for (let x = -gridSpacingX; x < width + gridSpacingX; x += gridSpacingX) {
          page.drawText(timestampText, {
            x,
            y,
            size: tsFontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
            opacity: opacity * 0.8,
            rotate: degrees(-45),
          })
        }
      }
    }

    // 하단 footer 워터마크 (항상 추가)
    const footerFontSize = 8
    const footerText = `${watermarkText}  |  ${timestampText}`
    const footerTextWidth = font.widthOfTextAtSize(footerText, footerFontSize)
    page.drawText(footerText, {
      x: Math.max(10, (width - footerTextWidth) / 2),
      y: 10,
      size: footerFontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.3,
    })
  }
}

// ─── 메인 워터마크 함수 (WatermarkOptions 형태) ──────────────

/**
 * PDF에 사용자 정보 워터마크를 추가합니다.
 *
 * @param pdfBytes - 원본 PDF 바이트
 * @param options  - WatermarkOptions (userId, userName, userEmail, documentId 필수)
 */
export async function addWatermarkToPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  options: WatermarkOptions
): Promise<WatermarkResult>

/**
 * PDF에 커스텀 텍스트 워터마크를 추가합니다.
 *
 * @param pdfBytes      - 원본 PDF 바이트
 * @param watermarkText - 워터마크 텍스트
 * @param options       - 선택적 WatermarkOptions
 */
export async function addWatermarkToPdf(
  pdfBytes: Uint8Array,
  watermarkText: string,
  options?: Partial<WatermarkOptions>
): Promise<Uint8Array>

// ─── 구현 ─────────────────────────────────────────────────

export async function addWatermarkToPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  optionsOrText: WatermarkOptions | string,
  extraOptions?: Partial<WatermarkOptions>
): Promise<WatermarkResult | Uint8Array> {
  // 오버로드 분기: 두 번째 인자가 string이면 단순 텍스트 오버로드
  const isTextOverload = typeof optionsOrText === 'string'

  try {
    const inputBytes =
      pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)

    let watermarkText: string
    let timestampText: string
    let opacity: number
    let position: 'diagonal' | 'center' | 'footer'

    if (isTextOverload) {
      const rawText = optionsOrText as string
      const opts = extraOptions ?? {}
      const ts = new Date()
      watermarkText = rawText
      timestampText = ts.toLocaleString('ko-KR')
      opacity = opts.opacity ?? 0.15
      position = opts.position ?? 'diagonal'
    } else {
      const opts = optionsOrText as WatermarkOptions
      const ts = opts.timestamp ?? new Date()
      watermarkText = opts.text ?? buildWatermarkText({ ...opts, timestamp: ts })
      timestampText = ts.toLocaleString('ko-KR')
      opacity = opts.opacity ?? 0.15
      position = opts.position ?? 'diagonal'
    }

    // PDF 로드 및 워터마크 적용
    const pdfDoc = await PDFDocument.load(inputBytes, {
      ignoreEncryption: true,
    })

    await applyWatermarkGrid(pdfDoc, watermarkText, timestampText, opacity, position)

    const watermarkedBytes = await pdfDoc.save()

    if (isTextOverload) {
      // 단순 텍스트 오버로드: Uint8Array 직접 반환
      return watermarkedBytes
    }

    // WatermarkOptions 오버로드: WatermarkResult 반환
    let base64 = ''
    try {
      base64 = Buffer.from(watermarkedBytes).toString('base64')
    } catch {
      base64 = btoa(String.fromCharCode(...watermarkedBytes))
    }

    return {
      success: true,
      watermarkedPdfBytes: watermarkedBytes,
      watermarkedPdfBase64: base64,
    } satisfies WatermarkResult

  } catch (err) {
    const message = err instanceof Error ? err.message : '워터마크 처리 중 알 수 없는 오류'
    console.error('[VDR Watermark] 오류 – 원본 반환:', err)

    if (isTextOverload) {
      // 폴백: 원본 바이트 반환
      return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
    }

    return {
      success: false,
      error: message,
    } satisfies WatermarkResult
  }
}
