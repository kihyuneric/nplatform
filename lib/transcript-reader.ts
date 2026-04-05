/**
 * 대본 전문 접근 모듈
 * 원본 JSON 파일(341MB)에서 전체 대본 텍스트를 읽어 제공합니다.
 * 서버 사이드에서만 사용 가능합니다.
 */

import * as fs from 'fs'
import { logger } from '@/lib/logger'
import * as path from 'path'

const TRANSCRIPT_FILE = path.resolve('C:/Users/82106/Desktop/부동산 대본/경매인플루언서 대본 총정리.json')

// 컬럼 인덱스
const COL = {
  CHANNEL: 0,
  TOPIC: 1,
  CH_URL: 2,
  TITLE: 3,
  DATE: 4,
  URL: 5,
  TRANSCRIPT: 6,
  SUBTITLE_TYPE: 7,
  CRAWL_DATE: 8,
  SOURCE: 9,
}

export interface TranscriptData {
  youtube_id: string
  channel_name: string
  title: string
  transcript: string          // 전체 대본 텍스트
  upload_date: string | null
  video_url: string
}

// 메모리 캐시 (서버 사이드)
let transcriptCache: Map<string, TranscriptData> | null = null
let channelIndex: Map<string, string[]> | null = null  // channel_name → youtube_id[]

function extractVideoId(url: string): string | null {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

/**
 * 전체 대본 데이터를 메모리에 로드 (최초 1회)
 */
function ensureLoaded(): void {
  if (transcriptCache) return

  logger.info('[TranscriptReader] Loading transcript data...')
  const start = Date.now()

  const raw = JSON.parse(fs.readFileSync(TRANSCRIPT_FILE, 'utf-8'))
  const rows = raw.rows as any[][]

  transcriptCache = new Map()
  channelIndex = new Map()

  for (const row of rows) {
    const url = row[COL.URL]
    const vid = extractVideoId(url)
    if (!vid) continue

    const transcript = row[COL.TRANSCRIPT] || ''
    if (transcript.length < 50) continue  // 너무 짧은 대본 제외

    const channelName = row[COL.CHANNEL] || ''

    transcriptCache.set(vid, {
      youtube_id: vid,
      channel_name: channelName,
      title: row[COL.TITLE] || '',
      transcript,
      upload_date: row[COL.DATE] || null,
      video_url: url,
    })

    // 채널 인덱스
    if (!channelIndex!.has(channelName)) {
      channelIndex!.set(channelName, [])
    }
    channelIndex!.get(channelName)!.push(vid)
  }

  console.log(`[TranscriptReader] Loaded ${transcriptCache.size} transcripts in ${Date.now() - start}ms`)
}

/**
 * 특정 영상의 전체 대본 반환
 */
export function getFullTranscript(youtubeId: string): string {
  ensureLoaded()
  return transcriptCache!.get(youtubeId)?.transcript || ''
}

/**
 * 특정 영상의 메타데이터 + 전체 대본 반환
 */
export function getTranscriptData(youtubeId: string): TranscriptData | null {
  ensureLoaded()
  return transcriptCache!.get(youtubeId) || null
}

/**
 * 여러 영상의 대본 데이터 일괄 조회
 */
export function getTranscriptsBatch(youtubeIds: string[]): TranscriptData[] {
  ensureLoaded()
  return youtubeIds
    .map(id => transcriptCache!.get(id))
    .filter((d): d is TranscriptData => d !== null)
}

/**
 * 대본에서 특정 키워드 주변 텍스트 추출
 * 키워드가 등장하는 위치 ± contextChars 만큼의 텍스트를 반환
 */
export function getTranscriptSegments(
  youtubeId: string,
  keywords: string[],
  contextChars: number = 500
): string[] {
  const transcript = getFullTranscript(youtubeId)
  if (!transcript) return []

  const segments: string[] = []
  const seen = new Set<number>()  // 중복 방지 (시작 위치)

  for (const kw of keywords) {
    let idx = 0
    while (idx < transcript.length) {
      const pos = transcript.indexOf(kw, idx)
      if (pos === -1) break

      // 가까운 위치 중복 방지
      const roundedPos = Math.floor(pos / 200) * 200
      if (seen.has(roundedPos)) {
        idx = pos + kw.length
        continue
      }
      seen.add(roundedPos)

      const start = Math.max(0, pos - contextChars)
      const end = Math.min(transcript.length, pos + kw.length + contextChars)
      segments.push(transcript.substring(start, end))

      idx = pos + kw.length
    }
  }

  return segments
}

/**
 * 개념(concept)에 매핑된 영상들의 대본 수집
 * Supabase에서 매핑 정보를 조회한 후, 원본 대본을 로드
 */
export async function getTranscriptsForConcept(
  conceptId: number,
  limit: number = 30,
  minRelevance: number = 0.3
): Promise<Array<TranscriptData & { relevance: number; matched_keywords: string[] }>> {
  ensureLoaded()

  // Supabase에서 매핑 정보 조회
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: mappings } = await supabase
    .from('ont_youtube_concept')
    .select('youtube_id, relevance, matched_keywords')
    .eq('concept_id', conceptId)
    .gte('relevance', minRelevance)
    .order('relevance', { ascending: false })
    .limit(limit)

  if (!mappings || mappings.length === 0) return []

  // 대본 전문 로드
  return mappings
    .map(m => {
      const data = transcriptCache!.get(m.youtube_id)
      if (!data) return null
      return {
        ...data,
        relevance: m.relevance,
        matched_keywords: m.matched_keywords || [],
      }
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
}

/**
 * 대본 텍스트에서 개념 관련 핵심 구간만 추출 (AI 컨텍스트 최적화)
 * 전체 대본 대신, 키워드 관련 구간만 모아서 토큰 절약
 */
export function extractRelevantSegments(
  transcripts: TranscriptData[],
  keywords: string[],
  maxTotalChars: number = 15000
): string {
  const allSegments: Array<{ text: string; channel: string; title: string }> = []

  for (const t of transcripts) {
    const segments = getTranscriptSegments(t.youtube_id, keywords, 400)
    for (const seg of segments) {
      allSegments.push({
        text: seg.trim(),
        channel: t.channel_name,
        title: t.title,
      })
    }
  }

  // 총 글자수 제한 내에서 구간 수집
  let result = ''
  let charCount = 0

  for (const seg of allSegments) {
    const entry = `\n[전문가 강의 발췌 — "${seg.title}"]\n${seg.text}\n`
    if (charCount + entry.length > maxTotalChars) break
    result += entry
    charCount += entry.length
  }

  return result
}

/**
 * 통계 정보
 */
export function getTranscriptStats(): {
  totalTranscripts: number
  totalChannels: number
  avgLength: number
  lengthDistribution: Record<string, number>
} {
  ensureLoaded()

  let totalLength = 0
  const dist: Record<string, number> = {
    '<500': 0, '500-2000': 0, '2000-5000': 0, '5000-10000': 0, '>10000': 0,
  }

  for (const [, data] of transcriptCache!) {
    const len = data.transcript.length
    totalLength += len
    if (len < 500) dist['<500']++
    else if (len < 2000) dist['500-2000']++
    else if (len < 5000) dist['2000-5000']++
    else if (len < 10000) dist['5000-10000']++
    else dist['>10000']++
  }

  return {
    totalTranscripts: transcriptCache!.size,
    totalChannels: channelIndex!.size,
    avgLength: Math.round(totalLength / transcriptCache!.size),
    lengthDistribution: dist,
  }
}
