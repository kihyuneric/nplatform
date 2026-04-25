#!/usr/bin/env node
/**
 * scripts/extract-i18n-keys.mjs · Phase L · P3-3
 *
 * NPLatform 빌드타임 STATIC_DICT 누락 검출 도구.
 *
 * 작동 방식:
 *   1. lib/i18n.ts 에서 STATIC_DICT.en 키 목록 추출
 *   2. app/** + components/** 의 .tsx 파일에서 한국어 텍스트 추출
 *      · JSX 텍스트 노드 (>한국어<)
 *      · 문자열 리터럴 ('한국어', "한국어", `한국어`)
 *      · placeholder/title/aria-label 속성
 *   3. STATIC_DICT 미등록 한국어를 빈도순 정렬 출력
 *   4. --strict 모드: 100건 이상 미등록 시 exit 1 (CI fail)
 *
 * 사용:
 *   node scripts/extract-i18n-keys.mjs              # 누락 목록 출력
 *   node scripts/extract-i18n-keys.mjs --top 50     # 상위 N 만
 *   node scripts/extract-i18n-keys.mjs --strict     # CI fail 모드
 *   node scripts/extract-i18n-keys.mjs --files      # 미등록 텍스트가 있는 파일 목록도 표시
 *
 * 디자인 시스템 v2.5 §6.2 정책:
 *   "모든 UI 텍스트는 STATIC_DICT 등록 의무"
 *   PR Review 체크리스트에 통합 가능 (CI 경고)
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"

// ────────────────────────────────────────────────────────────────────────────
// CLI
// ────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const STRICT = args.includes("--strict")
const SHOW_FILES = args.includes("--files")
const TOP_N = (() => {
  const i = args.indexOf("--top")
  if (i === -1) return 200
  const n = parseInt(args[i + 1] ?? "200", 10)
  return Number.isFinite(n) && n > 0 ? n : 200
})()

const ROOT = resolve(process.cwd())
const I18N_PATH = join(ROOT, "lib", "i18n.ts")
const SCAN_DIRS = ["app", "components"]
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.claude/,
  /\.git/,
  /_legacy/,
  /test|spec/i,
]

// ────────────────────────────────────────────────────────────────────────────
// 1. STATIC_DICT.en 키 추출
// ────────────────────────────────────────────────────────────────────────────
function extractDictKeys() {
  const src = readFileSync(I18N_PATH, "utf-8")
  const keys = new Set()
  // ko 키만 추출 — `'한국어 텍스트': 'English'` 패턴
  // 작은따옴표/큰따옴표 모두 지원
  const re = /['"]([^'"]*[\u3131-\u318E\uAC00-\uD7A3][^'"]*)['"]\s*:/g
  let m
  while ((m = re.exec(src)) !== null) {
    keys.add(m[1])
  }
  return keys
}

// ────────────────────────────────────────────────────────────────────────────
// 2. .tsx 파일 재귀 수집
// ────────────────────────────────────────────────────────────────────────────
function collectTsx(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const full = join(dir, name)
    // SKIP 패턴은 ROOT 기준 상대 경로에만 적용 (워크트리 경로 자체에 .claude 가 들어있어도 안전)
    const rel = relative(ROOT, full)
    if (SKIP_PATTERNS.some(p => p.test(rel))) continue
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      collectTsx(full, out)
    } else if (st.isFile() && (full.endsWith(".tsx") || full.endsWith(".ts"))) {
      out.push(full)
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────────────
// 3. 한국어 텍스트 추출 (단일 파일)
//    - JSX 텍스트: 태그 사이의 텍스트 노드
//    - 문자열 리터럴 안의 한국어
//    - aria-label / placeholder / title 등 속성
//    필터: 주석/import/export 라인 제외, URL/경로 제외
// ────────────────────────────────────────────────────────────────────────────
const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/
const HANGUL_TEXT = /([\u3131-\u318E\uAC00-\uD7A3][\u3131-\u318E\uAC00-\uD7A3 \w·.,!?:;\-/+()%~&'"]*?)/

function extractKoreanFromFile(file) {
  let src
  try {
    src = readFileSync(file, "utf-8")
  } catch {
    return []
  }
  const found = []
  const lines = src.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 주석 / import / export 라인 skip
    const trim = line.trim()
    if (
      trim.startsWith("//") ||
      trim.startsWith("/*") ||
      trim.startsWith("*") ||
      trim.startsWith("import ") ||
      trim.startsWith("export ") && !trim.includes(":")
    ) {
      // export const STEPS = ['...'] 같은 케이스는 잡힘 (continue 안 함)
      if (!trim.includes("'") && !trim.includes('"') && !trim.includes("`")) continue
    }
    if (!HANGUL.test(line)) continue
    // 문자열 리터럴 (single/double/template) 안의 한국어
    const stringRe = /(['"`])((?:(?!\1)[^\\]|\\.)*?[\u3131-\u318E\uAC00-\uD7A3](?:(?!\1)[^\\]|\\.)*?)\1/g
    let m
    while ((m = stringRe.exec(line)) !== null) {
      const text = m[2].trim()
      if (!text) continue
      if (text.length < 2) continue
      // 주석 안 / 경로 안 skip
      if (text.startsWith("/") || text.startsWith("http")) continue
      found.push({ text, file, line: i + 1 })
    }
    // JSX 텍스트 노드 (>한국어<)
    const jsxRe = />\s*([^<>{}\n]*[\u3131-\u318E\uAC00-\uD7A3][^<>{}\n]*?)\s*</g
    while ((m = jsxRe.exec(line)) !== null) {
      const text = m[1].trim().replace(/\s+/g, " ")
      if (!text || text.length < 2) continue
      found.push({ text, file, line: i + 1 })
    }
  }
  return found
}

// ────────────────────────────────────────────────────────────────────────────
// 4. 메인
// ────────────────────────────────────────────────────────────────────────────
function main() {
  console.log("─".repeat(72))
  console.log("NPLatform · STATIC_DICT 누락 검출 (Phase L · P3-3)")
  console.log("─".repeat(72))

  const dictKeys = extractDictKeys()
  console.log(`✓ STATIC_DICT 등록 키: ${dictKeys.size}개`)

  const files = []
  for (const d of SCAN_DIRS) collectTsx(join(ROOT, d), files)
  console.log(`✓ 스캔 파일: ${files.length}개 (.tsx/.ts)`)

  // 미등록 한국어 누적
  const missing = new Map() // text → { count, files: Set }
  let totalFound = 0

  for (const f of files) {
    const items = extractKoreanFromFile(f)
    for (const it of items) {
      totalFound++
      if (dictKeys.has(it.text)) continue
      const cur = missing.get(it.text)
      if (cur) {
        cur.count++
        cur.files.add(relative(ROOT, it.file))
      } else {
        missing.set(it.text, { count: 1, files: new Set([relative(ROOT, it.file)]) })
      }
    }
  }

  console.log(`✓ 발견된 한국어 텍스트 총 ${totalFound}건 (중복 포함)`)
  console.log(`✓ 미등록 고유 텍스트: ${missing.size}건`)
  console.log()

  if (missing.size === 0) {
    console.log("✅ 모든 한국어 텍스트가 STATIC_DICT 에 등록되어 있습니다.")
    process.exit(0)
  }

  // 빈도순 정렬
  const sorted = Array.from(missing.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, TOP_N)

  console.log(`상위 ${sorted.length}건 미등록 (빈도순):`)
  console.log("─".repeat(72))
  for (const [text, info] of sorted) {
    const display = text.length > 60 ? text.slice(0, 57) + "..." : text
    console.log(`  ${String(info.count).padStart(3)} × ${display}`)
    if (SHOW_FILES) {
      const fileList = Array.from(info.files).slice(0, 3)
      for (const f of fileList) console.log(`         ↳ ${f}`)
      if (info.files.size > 3) console.log(`         ↳ ... +${info.files.size - 3}`)
    }
  }

  console.log("─".repeat(72))
  console.log(`💡 lib/i18n.ts STATIC_DICT.en + STATIC_DICT.ja 양쪽에 추가 필요`)
  console.log()

  // CI strict 모드
  if (STRICT && missing.size > 100) {
    console.error(`❌ STRICT MODE: 미등록 ${missing.size} > 100 — CI fail`)
    process.exit(1)
  }
  process.exit(0)
}

main()
