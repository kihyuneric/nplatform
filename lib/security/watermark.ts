// ─── 워터마크 생성 (문서/화면) ──────────────────────────

/**
 * 캔버스에 워터마크 텍스트 그리기 (PDF/이미지 워터마크용)
 */
export function createWatermarkText(params: {
  userId: string
  userName?: string
  timestamp?: Date
}): string {
  const { userId, userName, timestamp = new Date() } = params
  const ts = timestamp.toISOString().slice(0, 19).replace("T", " ")
  const name = userName || userId.slice(0, 8)
  return `NPLatform | ${name} | ${ts}`
}

/**
 * CSS 기반 화면 워터마크 생성 (배경 패턴)
 * 반환값을 style.backgroundImage에 적용
 */
export function generateCSSWatermark(text: string): string {
  // SVG 기반 대각선 텍스트 패턴
  const encoded = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
      <text transform="rotate(-30 150 100)" x="10" y="100"
        font-family="sans-serif" font-size="12" fill="rgba(0,0,0,0.04)"
        >${text}</text>
    </svg>`
  )
  return `url("data:image/svg+xml,${encoded}")`
}

/**
 * 다운로드 시 파일명에 워터마크 추가
 */
export function watermarkFilename(originalName: string, userId: string): string {
  const ext = originalName.split(".").pop() || ""
  const base = originalName.replace(`.${ext}`, "")
  const stamp = userId.slice(0, 8) + "_" + Date.now().toString(36)
  return `${base}_wm_${stamp}.${ext}`
}
