/**
 * fix-any-types.js
 * API 라우트의 Record<string, any> 패턴을 적절한 타입으로 교체
 */
const { readFileSync, writeFileSync, readdirSync, statSync } = require('fs')
const { join } = require('path')

const ROOT = join(__dirname, '../app/api/v1')
let changed = 0

function walkRoutes(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walkRoutes(full)
    else if (entry === 'route.ts') processFile(full)
  }
}

function processFile(filePath) {
  let src = readFileSync(filePath, 'utf8')
  const orig = src

  // 1. filters: Record<string, any> → QueryFilters
  src = src.replace(/filters:\s*Record<string,\s*any>/g, 'filters: QueryFilters')

  // 2. const filters: Record<string, any> = {} → const filters: QueryFilters = {}
  src = src.replace(/const\s+filters:\s*Record<string,\s*any>\s*=/g, 'const filters: QueryFilters =')

  // 3. (t: any) => / (d: any) => / (row: any) => / (item: any) => → (t) => etc.
  src = src.replace(/\((\w+):\s*any\)\s*=>/g, '($1) =>')

  // 4. Add QueryFilters import if needed
  if (src.includes('QueryFilters') && !src.includes("from '@/lib/db-types'") && !src.includes('from "@/lib/db-types"')) {
    // Insert after first import line
    src = src.replace(/^(import .+\n)/m, `$1import type { QueryFilters } from '@/lib/db-types'\n`)
  }

  if (src !== orig) {
    writeFileSync(filePath, src)
    changed++
    console.log('✓', filePath.split('api/v1')[1] || filePath)
  }
}

walkRoutes(ROOT)
console.log(`\n완료: ${changed}개 수정`)
