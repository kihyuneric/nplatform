#!/usr/bin/env node
/**
 * scripts/rag/seed-corpus.mjs
 *
 * RAG 코퍼스 시드 스크립트 — 5,000+ 청크 임베딩
 *
 * 데이터 소스 (3종):
 *   1) docs/rag/legal/*.md        — 법령·시행령·시행규칙 청크 (~2,000건)
 *   2) docs/rag/precedent/*.md    — NPL 관련 판례 요약 (~1,500건)
 *   3) docs/rag/guide/*.md        — NPL 매입·실사·정산 가이드 (~1,500건)
 *
 * 동작:
 *   1) 각 md 파일 읽어 1000자 청크 + 200자 overlap 분할
 *   2) /api/v1/rag/ingest POST 로 일괄 전송 (ADMIN_SECRET 필요)
 *   3) Voyage AI (voyage-multilingual-2) 임베딩 → pgvector 저장
 *
 * 사용:
 *   ADMIN_SECRET=... NEXT_PUBLIC_BASE_URL=https://nplatform-pi.vercel.app \
 *     node scripts/rag/seed-corpus.mjs --dry-run
 *   node scripts/rag/seed-corpus.mjs --source legal,precedent,guide --batch 50
 *
 * Flags:
 *   --dry-run        실제 호출 없이 청크 개수만 보고
 *   --source <list>  legal,precedent,guide 중 일부만
 *   --batch <n>      한 번에 ingest 할 문서 수 (default 20)
 *   --replace        기존 doc_id 행 삭제 후 재시드 (멱등성)
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')

// ─── 설정 ────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

// ─── CLI parsing ──────────────────────────────────────
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const replace = args.includes('--replace')
const sourceArg = args[args.indexOf('--source') + 1]
const batchArg = args[args.indexOf('--batch') + 1]
const SOURCES = (sourceArg && !sourceArg.startsWith('--')) ? sourceArg.split(',') : ['legal', 'precedent', 'guide']
const BATCH_SIZE = batchArg ? parseInt(batchArg, 10) : 20

console.log(`[RAG seed] dry-run=${dryRun} replace=${replace} sources=${SOURCES.join(',')} batch=${BATCH_SIZE}`)
console.log(`[RAG seed] target: ${BASE_URL}/api/v1/rag/ingest`)

if (!dryRun && !ADMIN_SECRET) {
  console.error('❌ ADMIN_SECRET 또는 SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

// ─── 청크 분할 ────────────────────────────────────────
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = []
  for (let i = 0; i < text.length; i += size - overlap) {
    chunks.push(text.slice(i, i + size).trim())
    if (i + size >= text.length) break
  }
  return chunks.filter(c => c.length > 100)
}

// ─── 파일 수집 ────────────────────────────────────────
async function collectDocs(source) {
  const dir = path.join(REPO_ROOT, 'docs', 'rag', source)
  try {
    const files = await fs.readdir(dir)
    const docs = []
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const fullPath = path.join(dir, file)
      const content = await fs.readFile(fullPath, 'utf-8')
      const chunks = chunkText(content)
      chunks.forEach((chunk, idx) => {
        docs.push({
          doc_id: `${source}/${file.replace('.md', '')}-${idx}`,
          source,
          title: file.replace('.md', ''),
          content: chunk,
          metadata: { file, chunk_index: idx, total_chunks: chunks.length },
        })
      })
    }
    return docs
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`[skip] ${dir} 존재 안 함 — docs/rag/${source}/ 에 .md 파일 추가 필요`)
      return []
    }
    throw err
  }
}

// ─── Ingest 호출 ──────────────────────────────────────
async function ingest(documents) {
  const res = await fetch(`${BASE_URL}/api/v1/rag/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({
      documents,
      chunk_size: CHUNK_SIZE,
      chunk_overlap: CHUNK_OVERLAP,
      replace_existing: replace,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── 메인 ─────────────────────────────────────────────
async function main() {
  let totalChunks = 0
  let totalSent = 0

  for (const source of SOURCES) {
    const docs = await collectDocs(source)
    console.log(`[${source}] ${docs.length} chunks`)
    totalChunks += docs.length

    if (dryRun) continue

    // 배치 단위로 ingest
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE)
      try {
        const result = await ingest(batch)
        totalSent += batch.length
        console.log(`  ✓ batch ${i / BATCH_SIZE + 1}: ${batch.length} chunks → ${result?.data?.inserted ?? '?'} inserted`)
      } catch (err) {
        console.error(`  ✗ batch ${i / BATCH_SIZE + 1} failed:`, err.message)
      }
    }
  }

  console.log(`\n[Summary]`)
  console.log(`  Total chunks discovered: ${totalChunks}`)
  if (!dryRun) console.log(`  Total sent to API: ${totalSent}`)
  console.log(`  Target: 5,000+ for production RAG`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
