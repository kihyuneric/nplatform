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

// ─── Anthropic Claude 번역 (1차 · 가장 안정적) ──────────────
async function claudeTranslate(texts: string[], targetLang: string): Promise<string[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error("[/api/v1/translate] claudeTranslate: ANTHROPIC_API_KEY missing")
    return null
  }
  const langName = targetLang === "en" ? "English" : "Japanese"

  // NPLatform 도메인 용어 — 영문 표기 그대로 유지 (번역 X)
  const PRESERVE_TERMS = [
    "NPL", "XRF", "NPLatform", "RLUSD", "USDC", "XRPL", "MPT", "AMM", "SPV",
    "KRW", "USD", "JPY", "ROI", "IRR", "XIRR", "DPI", "TVPI", "MoM", "LP",
    "GP", "AUM", "P&L", "EBITDA", "KYC", "AML", "MAS", "FSC", "BIS", "PE",
    "VC", "RWA", "DD", "LOI", "NDA", "TP",
  ]
  const preserveNote = `IMPORTANT: Keep these terms unchanged (do NOT translate): ${PRESERVE_TERMS.join(", ")}.`

  // 배치 라벨 (해시 방식 — 깨짐 방지)
  const numbered = texts.map((t, i) => `<<${i + 1}>>${t}<</${i + 1}>>`).join("\n")
  const prompt = `You are a professional Korean→${langName} translator for NPLatform (Non-Performing Loan trading platform).

${preserveNote}

Translate each Korean line to natural, formal ${langName}. Use proper financial terminology. Preserve numbers, currency symbols, and percentages exactly. Do NOT add explanations or notes.

Output format: Respond with each translation wrapped in the same delimiter pattern <<N>>...<</N>>. One per line.

Input:
${numbered}

Output:`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // 최신 haiku 모델 (2025-10 출시) — 폴백 체인 제거하고 명시적 모델 명
        model: "claude-haiku-4-5",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.error(`[/api/v1/translate] Claude API error ${res.status}:`, errText.slice(0, 500))
      return null
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> }
    const out = data?.content?.[0]?.text ?? ""
    if (!out) {
      console.error("[/api/v1/translate] Claude empty response")
      return null
    }
    // <<N>>...<</N>> 패턴 파싱 (해시 방식 — 정확)
    const result: string[] = new Array(texts.length).fill("")
    const re = /<<(\d+)>>([\s\S]*?)<<\/(\d+)>>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(out)) !== null) {
      const idx = parseInt(m[1], 10) - 1
      if (m[1] === m[3] && idx >= 0 && idx < texts.length) {
        result[idx] = m[2].trim()
      }
    }
    // 누락된 항목 — 폴백 표시 (원문 유지)
    const missing = result.filter((r, i) => !r && texts[i]).length
    if (missing > 0) {
      console.warn(`[/api/v1/translate] Claude parsed ${texts.length - missing}/${texts.length} (missing ${missing})`)
    }
    return result.map((r, i) => r || texts[i])
  } catch (err) {
    console.error("[/api/v1/translate] Claude exception:", err)
    return null
  }
}

// ─── Google Translate 비공식 (3차 시도) ─────────────────────
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

// ─── 한글 정상 응답 검증 (Google 깨진 응답 방어) ─────────────
//   Google 비공식 API 가 Vercel 서버리스 환경에서 깨진 응답을 보내는 케이스 감지.
//   - 영어 응답에 ASCII 외 깨진 문자가 섞이거나
//   - 일본어 응답에 의미 없는 반복 패턴이 나오면 reject
function isValidTranslation(translated: string, targetLang: string): boolean {
  if (!translated || translated.length === 0) return false
  // 깨진 문자 (Replacement Character · Latin-1 Supplement extended) 포함 시 reject
  if (/[\uFFFD\u00C0-\u00FF]{2,}/.test(translated)) return false
  // 영어 결과에 한글 부호 (조합형 등) 또는 깨진 문자 포함 시 reject
  if (targetLang === "en" && /[\u0080-\u00BF\u0100-\u052F\u3131-\u318E\uAC00-\uD7A3]/.test(translated)) return false
  // 일본어 결과에 한글 섞이면 reject (영문 도메인 용어 NPL/XRF는 OK)
  if (targetLang === "ja" && /[ㄱ-ㆎ가-힣]/.test(translated)) return false
  // 동일 단어 4회 이상 반복 (강화: 8→4) — "Tweets by Tweets by ..." 즉시 차단
  const words = translated.split(/\s+/).filter(w => w.length >= 2)
  if (words.length > 4) {
    const counts = new Map<string, number>()
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
    for (const c of counts.values()) if (c >= 4) return false
  }
  // 동일 짧은 substring 4회 이상 반복 (강화: 7→3)
  const repeat = translated.match(/(.{4,15})\1{3,}/)
  if (repeat) return false
  // Google 광고/UI 응답 차단
  if (/^(Tweets by|Click here|Translate this|Loading\.\.\.)/i.test(translated)) return false
  return true
}

// ─── 서버 in-memory 캐시 (lambda warm 동안 유지) ───────────
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

// ─── 단일 텍스트 번역 (폴백 체인 — MyMemory 우선 + cache) ───
async function translateOne(text: string, targetLang: string): Promise<string> {
  if (!text || text.trim().length === 0) return text
  if (text.length > MAX_TEXT_LENGTH) return text

  // 0차: in-memory 캐시
  const cached = memCacheGet(text, targetLang)
  if (cached) return cached

  // 1차: MyMemory (Vercel 서버리스에서 안정적)
  const m = await myMemoryTranslate(text, targetLang)
  if (m && m !== text && isValidTranslation(m, targetLang)) {
    memCacheSet(text, targetLang, m)
    return m
  }

  // 2차: Google (검증 통과 시만 채택)
  const g = await googleTranslate(text, targetLang)
  if (g && g !== text && isValidTranslation(g, targetLang)) {
    memCacheSet(text, targetLang, g)
    return g
  }

  // 폴백: 원문 (캐시 X — 다음 요청 시 재시도 가능)
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

    // 0차 · in-memory 캐시 hit/miss 분리
    const needTranslate: { idx: number; text: string }[] = []
    const cachedTranslations = new Array<string>(texts.length)
    texts.forEach((t, i) => {
      const c = memCacheGet(t, targetLang)
      if (c) {
        cachedTranslations[i] = c
      } else {
        needTranslate.push({ idx: i, text: t })
      }
    })

    let translations: string[] = cachedTranslations.slice()

    if (needTranslate.length > 0) {
      // 1차 · Anthropic Claude (배치 번역)
      const claudeInput = needTranslate.map(n => n.text)
      const claudeResults = await claudeTranslate(claudeInput, targetLang)

      if (claudeResults && claudeResults.length === claudeInput.length) {
        // Claude 응답 검증 — 깨지지 않은 라인만 채택, 나머지는 폴백
        const claudeFinal = await Promise.all(
          claudeResults.map(async (r, i) => {
            const original = claudeInput[i]
            if (r && r !== original && isValidTranslation(r, targetLang)) {
              memCacheSet(original, targetLang, r)
              return r
            }
            return translateOne(original, targetLang)
          }),
        )
        needTranslate.forEach((n, i) => { translations[n.idx] = claudeFinal[i] })
      } else {
        // Claude 키 없거나 실패 → 폴백 체인
        const fallbackResults = await Promise.all(claudeInput.map(t => translateOne(t, targetLang)))
        needTranslate.forEach((n, i) => { translations[n.idx] = fallbackResults[i] })
      }
    }

    return NextResponse.json(
      { translations },
      {
        // 일시적 cache 비활성화 (깨진 응답이 CDN 에 캐싱된 케이스 방어)
        // 추후 안정화 후 다시 s-maxage 길게 설정
        headers: {
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
