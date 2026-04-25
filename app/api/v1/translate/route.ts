/**
 * POST /api/v1/translate
 *
 * 서버사이드 번역 프록시 (Phase L).
 *
 * 클라이언트에서 직접 Google Translate 비공식 엔드포인트를 호출하면:
 *   1) 브라우저 CSP 정책에 추가 허용 필요
 *   2) Google CAPTCHA / rate limit 에 자주 차단됨
 *   3) 캐시 공유 불가 (사용자별 localStorage)
 *
 * 서버 프록시로 우회:
 *   1) 서버는 CSP 영향 없음
 *   2) 다중 폴백 (Google → MyMemory → 원문)
 *   3) 향후 Anthropic/OpenAI 번역으로 업그레이드 가능
 *
 * Body: { texts: string[], targetLang: 'en' | 'ja' }
 * Response: { translations: string[] }   ← 입력 순서 보존
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TARGET_LANGS = new Set(["en", "ja"])
const MAX_TEXTS = 50
const MAX_TEXT_LENGTH = 5000

// ─── Google Translate 비공식 (1차 시도) ─────────────────────
async function googleTranslate(text: string, targetLang: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, {
      headers: {
        // 브라우저 같은 헤더로 실제 응답 받기 (User-Agent만 있으면 깨진 응답 옴)
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
      },
    })
    if (!res.ok) return null
    // UTF-8 명시 디코드 (응답 헤더가 charset 미지정 시 fetch 가 자동 추측 → 한글 깨짐)
    const buf = await res.arrayBuffer()
    const raw = new TextDecoder("utf-8").decode(buf)
    let data: unknown
    try { data = JSON.parse(raw) } catch { return null }
    // 응답 형태: [[["translated", "original", null, null, 10]], null, "ko"]
    if (!Array.isArray(data) || !Array.isArray((data as unknown[])[0])) return null
    const segments = (data as unknown[])[0] as unknown[]
    const translated = segments
      .map((seg) => (Array.isArray(seg) && typeof seg[0] === "string" ? (seg[0] as string) : ""))
      .join("")
    return translated || null
  } catch {
    return null
  }
}

// ─── MyMemory (2차 폴백) ────────────────────────────────────
//   Google 차단 시 대안. 무료 (5000 chars/day per IP)
async function myMemoryTranslate(text: string, targetLang: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|${targetLang}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number }
    const translated = data?.responseData?.translatedText
    if (!translated) return null
    // MyMemory 가 "WARNING: ..." 같은 응답 주는 경우 제외
    if (translated.toUpperCase().startsWith("WARNING") || translated.toUpperCase().startsWith("MYMEMORY")) {
      return null
    }
    return translated
  } catch {
    return null
  }
}

// ─── 단일 텍스트 번역 (폴백 체인) ─────────────────────────
async function translateOne(text: string, targetLang: string): Promise<string> {
  if (!text || text.trim().length === 0) return text
  if (text.length > MAX_TEXT_LENGTH) return text

  // 1차: Google
  const g = await googleTranslate(text, targetLang)
  if (g && g !== text) return g

  // 2차: MyMemory
  const m = await myMemoryTranslate(text, targetLang)
  if (m && m !== text) return m

  // 폴백: 원문
  return text
}

// ─── 라우트 핸들러 ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { texts?: unknown; targetLang?: unknown }
    const texts = Array.isArray(body.texts) ? body.texts.filter((t) => typeof t === "string") as string[] : []
    const targetLang = typeof body.targetLang === "string" ? body.targetLang : ""

    if (!TARGET_LANGS.has(targetLang)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "targetLang must be 'en' or 'ja'" } },
        { status: 400 },
      )
    }
    if (texts.length === 0) {
      return NextResponse.json({ translations: [] })
    }
    if (texts.length > MAX_TEXTS) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: `최대 ${MAX_TEXTS}개까지 한 번에 번역 가능` } },
        { status: 400 },
      )
    }

    // 병렬 번역 (Promise.all)
    const translations = await Promise.all(texts.map((t) => translateOne(t, targetLang)))

    return NextResponse.json(
      { translations },
      {
        // CDN 캐시 1일 (동일 텍스트 반복 호출 방지)
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    )
  } catch (err) {
    console.error("[/api/v1/translate]", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "번역 실패" } },
      { status: 500 },
    )
  }
}
