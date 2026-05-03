/**
 * POST /api/v1/translate
 *
 * 서버사이드 번역 프록시 — 비용 효율 우선 (사용자 정책 2026-05-03).
 *
 * 폴백 체인 (1차부터 시도, 성공 시 즉시 반환):
 *   1. Google Cloud Translation API v2 (GOOGLE_TRANSLATE_API_KEY)
 *      - $0.02 / 1M chars · 가장 저렴 + 안정적
 *   2. DeepL Free API (DEEPL_API_KEY)
 *      - 500k chars/월 무료 · 고품질
 *   3. MyMemory (무료 · 5000 chars/일/IP)
 *      - 깨진 응답 검증 강화
 *   4. Google Translate 비공식 (검증 강화 · 무료 fallback)
 *
 * 사용자 정책:
 *   - 생성형 AI (Claude) 비용 지불 안 함 (Google ~1/100 비용)
 *   - NPL/XRF/KRW/USD 등 도메인 용어 보존은 Google Cloud
 *     "glossary" 기능 또는 placeholder 치환으로 처리
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

// ─── 도메인 용어 보존 (translate 전 placeholder 치환, 후 복원) ───
//   Google/DeepL 모두 NPL/XRF 같은 약어를 어색하게 풀어쓰는 경우가 있음
//   "NPL" → "비ロ1" 같은 unique placeholder 로 치환 후, 응답에서 다시 복원
const PRESERVE_TERMS = [
  "NPLatform", "RLUSD", "USDC", "XRPL",
  "NPL", "XRF", "MPT", "AMM", "SPV", "LP", "GP", "AUM", "P&L", "EBITDA",
  "KYC", "AML", "MAS", "FSC", "BIS", "PE", "VC", "RWA", "DD", "LOI", "NDA",
  "ROI", "IRR", "XIRR", "DPI", "TVPI", "MoM", "TP", "KRW", "USD", "JPY",
] as const

function applyPreservation(text: string): { masked: string; map: Map<string, string> } {
  const map = new Map<string, string>()
  let masked = text
  PRESERVE_TERMS.forEach((term, i) => {
    // 단어 경계 체크 — 단독 약어만 치환 (NPLATFORM 안의 NPL 등 제외)
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
    if (pattern.test(masked)) {
      const placeholder = `__NPL_T${i}__`  // ASCII placeholder, 번역기가 건드리지 않음
      masked = masked.replace(pattern, placeholder)
      map.set(placeholder, term)
    }
  })
  return { masked, map }
}

function restorePreservation(translated: string, map: Map<string, string>): string {
  let result = translated
  map.forEach((original, placeholder) => {
    // 번역기가 placeholder 를 약간 변형해도 복원 (예: "__NPL_T0__" → "__NPL T0__" → 모두 복원)
    const variants = [
      placeholder,
      placeholder.replace(/_/g, ' _'),
      placeholder.replace(/__/g, ' '),
    ]
    variants.forEach(v => {
      result = result.split(v).join(original)
    })
  })
  return result
}

// ─── 1차 · Google Cloud Translation API v2 (공식 · 가장 저렴) ──
async function googleCloudTranslate(text: string, targetLang: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  if (!apiKey) return null

  const { masked, map } = applyPreservation(text)
  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        q: masked,
        source: "ko",
        target: targetLang,
        format: "text",
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.error(`[/api/v1/translate] Google Cloud ${res.status}:`, errText.slice(0, 300))
      return null
    }
    const data = (await res.json()) as { data?: { translations?: Array<{ translatedText?: string }> } }
    const translated = data?.data?.translations?.[0]?.translatedText
    if (!translated) return null
    return restorePreservation(translated, map)
  } catch (err) {
    console.error("[/api/v1/translate] Google Cloud exception:", err)
    return null
  }
}

// ─── 2차 · DeepL Free API (500k chars/월 무료 · 고품질) ────────
async function deepLTranslate(text: string, targetLang: string): Promise<string | null> {
  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey) return null

  const { masked, map } = applyPreservation(text)
  // DeepL 은 EN-US/EN-GB 구분, JA 그대로
  const target = targetLang === "en" ? "EN-US" : "JA"
  try {
    const url = "https://api-free.deepl.com/v2/translate"
    const params = new URLSearchParams()
    params.append("auth_key", apiKey)
    params.append("text", masked)
    params.append("source_lang", "KO")
    params.append("target_lang", target)
    params.append("preserve_formatting", "1")

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
      body: params.toString(),
    })
    if (!res.ok) {
      console.error(`[/api/v1/translate] DeepL ${res.status}`)
      return null
    }
    const data = (await res.json()) as { translations?: Array<{ text?: string }> }
    const translated = data?.translations?.[0]?.text
    if (!translated) return null
    return restorePreservation(translated, map)
  } catch (err) {
    console.error("[/api/v1/translate] DeepL exception:", err)
    return null
  }
}

// ─── 3차 · MyMemory (무료 · 5000 chars/일/IP) ────────────────
async function myMemoryTranslate(text: string, targetLang: string): Promise<string | null> {
  const { masked, map } = applyPreservation(text)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(masked)}&langpair=ko|${targetLang}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number }
    const translated = data?.responseData?.translatedText
    if (!translated) return null
    if (translated.toUpperCase().startsWith("WARNING") || translated.toUpperCase().startsWith("MYMEMORY")) {
      return null
    }
    return restorePreservation(translated, map)
  } catch {
    return null
  }
}

// ─── 4차 · Google Translate 비공식 (무료 · 마지막 폴백) ──────
async function googleUnofficialTranslate(text: string, targetLang: string): Promise<string | null> {
  const { masked, map } = applyPreservation(text)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${targetLang}&dt=t&q=${encodeURIComponent(masked)}`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
      },
    })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const raw = new TextDecoder("utf-8").decode(buf)
    let data: unknown
    try { data = JSON.parse(raw) } catch { return null }
    if (!Array.isArray(data) || !Array.isArray((data as unknown[])[0])) return null
    const segments = (data as unknown[])[0] as unknown[]
    const translated = segments
      .map((seg) => (Array.isArray(seg) && typeof seg[0] === "string" ? (seg[0] as string) : ""))
      .join("")
    if (!translated) return null
    return restorePreservation(translated, map)
  } catch {
    return null
  }
}

// ─── 한글 정상 응답 검증 ────────────────────────────────────
function isValidTranslation(translated: string, targetLang: string): boolean {
  if (!translated || translated.length === 0) return false
  if (/[�À-ÿ]{2,}/.test(translated)) return false
  if (targetLang === "en" && /[-¿Ā-ԯㄱ-ㆎ가-힣]/.test(translated)) return false
  if (targetLang === "ja" && /[ㄱ-ㆎ가-힣]/.test(translated)) return false
  // 동일 단어 4회 이상 반복
  const words = translated.split(/\s+/).filter(w => w.length >= 2)
  if (words.length > 4) {
    const counts = new Map<string, number>()
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
    for (const c of counts.values()) if (c >= 4) return false
  }
  // 동일 substring 4회 이상 반복
  if (translated.match(/(.{4,15})\1{3,}/)) return false
  // Google 광고/UI 응답 차단
  if (/^(Tweets by|Click here|Translate this|Loading\.\.\.)/i.test(translated)) return false
  // Google 무의미 응답 차단
  const NONSENSE = [/in the middle of nowhere/i, /^(yes|no|please|thank you|hello)\s*\.?\s*$/i, /^[a-z]\s*$/i]
  if (NONSENSE.some(p => p.test(translated))) return false
  return true
}

// ─── 서버 in-memory 캐시 (lambda warm 동안) ────────────────
const memCache = new Map<string, string>()
const MEM_CACHE_MAX = 5000
function memCacheGet(text: string, targetLang: string): string | null {
  return memCache.get(`${targetLang}::${text}`) ?? null
}
function memCacheSet(text: string, targetLang: string, value: string) {
  if (memCache.size >= MEM_CACHE_MAX) {
    const keys = memCache.keys()
    for (let i = 0; i < 10; i++) {
      const k = keys.next().value
      if (k) memCache.delete(k)
    }
  }
  memCache.set(`${targetLang}::${text}`, value)
}

// ─── 단일 텍스트 번역 (4단계 폴백) ────────────────────────────
async function translateOne(text: string, targetLang: string): Promise<string> {
  if (!text || text.trim().length === 0) return text
  if (text.length > MAX_TEXT_LENGTH) return text

  // 0차: in-memory 캐시
  const cached = memCacheGet(text, targetLang)
  if (cached) return cached

  // 1차: Google Cloud Translation v2 (공식 · 저렴)
  const gc = await googleCloudTranslate(text, targetLang)
  if (gc && gc !== text && isValidTranslation(gc, targetLang)) {
    memCacheSet(text, targetLang, gc)
    return gc
  }

  // 2차: DeepL Free (500k/월 무료)
  const dl = await deepLTranslate(text, targetLang)
  if (dl && dl !== text && isValidTranslation(dl, targetLang)) {
    memCacheSet(text, targetLang, dl)
    return dl
  }

  // 3차: MyMemory (무료)
  const mm = await myMemoryTranslate(text, targetLang)
  if (mm && mm !== text && isValidTranslation(mm, targetLang)) {
    memCacheSet(text, targetLang, mm)
    return mm
  }

  // 4차: Google 비공식 (무료 last resort)
  const gu = await googleUnofficialTranslate(text, targetLang)
  if (gu && gu !== text && isValidTranslation(gu, targetLang)) {
    memCacheSet(text, targetLang, gu)
    return gu
  }

  // 모두 실패 → 원문 보존 (다음 요청 시 재시도)
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

    // 병렬 번역 (각 텍스트 독립 폴백 체인)
    const translations = await Promise.all(texts.map((t) => translateOne(t, targetLang)))

    return NextResponse.json(
      { translations },
      {
        headers: {
          // 디버깅 단계 — 캐시 비활성. 안정화 후 s-maxage 길게 설정.
          "Cache-Control": "no-store, no-cache, must-revalidate",
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
