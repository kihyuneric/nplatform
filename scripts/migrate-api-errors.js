#!/usr/bin/env node
/**
 * migrate-api-errors.js
 * API 라우트 에러 응답을 표준 ErrorResponse 포맷으로 일괄 변환
 *
 * 변환 규칙:
 *  { error: 'message' }        → { error: { code, message } }
 *  catch (e: any) { e.message } → catch (e) { fromUnknown(e) }
 */

const { readFileSync, writeFileSync, readdirSync, statSync } = require('fs')
const { join } = require('path')

const ROOT = join(__dirname, '../app/api/v1')

let filesChanged = 0
let filesSkipped = 0

function walkRoutes(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walkRoutes(full)
    } else if (entry === 'route.ts') {
      processFile(full)
    }
  }
}

function processFile(filePath) {
  const original = readFileSync(filePath, 'utf8')
  let src = original

  // ── 1. Skip files already fully migrated (all errors are structured) ──
  // If no plain { error: 'string' } pattern, skip
  const hasPlainError = /NextResponse\.json\(\s*\{\s*error:\s*['"`][^'"`]+['"`]\s*\}/.test(src)
  const hasCatchAny = /catch\s*\(\s*\w+\s*:\s*any\s*\)/.test(src)
  if (!hasPlainError && !hasCatchAny) {
    filesSkipped++
    return
  }

  // ── 2. Add import if not present ──
  const importLine = "import { Errors, fromUnknown } from '@/lib/api-error'"
  if (!src.includes("from '@/lib/api-error'") && !src.includes('from "@/lib/api-error"')) {
    // Insert after first import line
    src = src.replace(
      /^(import .+\n)/m,
      `$1${importLine}\n`
    )
  }

  // ── 3. Convert catch (e: any) → catch (e) ──
  src = src.replace(/catch\s*\(\s*(\w+)\s*:\s*any\s*\)/g, 'catch ($1)')

  // ── 4. Convert { error: e.message } with status 500 → fromUnknown(e) ──
  src = src.replace(
    /return NextResponse\.json\(\s*\{\s*error:\s*(\w+)\.message\s*\}\s*,\s*\{\s*status:\s*500\s*\}\s*\)/g,
    'return fromUnknown($1)'
  )

  // ── 5. Convert plain string errors by status code ──
  // status: 401
  src = src.replace(
    /NextResponse\.json\(\s*\{\s*error:\s*(['"`])([^'"`]+)\1\s*\}\s*,\s*\{\s*status:\s*401\s*\}\s*\)/g,
    "Errors.unauthorized('$2')"
  )
  // status: 403
  src = src.replace(
    /NextResponse\.json\(\s*\{\s*error:\s*(['"`])([^'"`]+)\1\s*\}\s*,\s*\{\s*status:\s*403\s*\}\s*\)/g,
    "Errors.forbidden('$2')"
  )
  // status: 404
  src = src.replace(
    /NextResponse\.json\(\s*\{\s*error:\s*(['"`])([^'"`]+)\1\s*\}\s*,\s*\{\s*status:\s*404\s*\}\s*\)/g,
    "Errors.notFound('$2')"
  )
  // status: 400 (bad request / validation)
  src = src.replace(
    /NextResponse\.json\(\s*\{\s*error:\s*(['"`])([^'"`]+)\1\s*\}\s*,\s*\{\s*status:\s*400\s*\}\s*\)/g,
    "Errors.badRequest('$2')"
  )
  // status: 500
  src = src.replace(
    /NextResponse\.json\(\s*\{\s*error:\s*(['"`])([^'"`]+)\1\s*\}\s*,\s*\{\s*status:\s*500\s*\}\s*\)/g,
    "Errors.internal('$2')"
  )

  if (src !== original) {
    writeFileSync(filePath, src, 'utf8')
    filesChanged++
    console.log(`✓ ${filePath.replace(ROOT, '')}`)
  } else {
    filesSkipped++
  }
}

walkRoutes(ROOT)
console.log(`\n완료: ${filesChanged}개 수정, ${filesSkipped}개 스킵`)
