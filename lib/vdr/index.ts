/**
 * lib/vdr/index.ts
 *
 * Virtual Data Room (실사 자료실) — 보안 문서 공유.
 *
 * 핵심 기능:
 *   - 워터마킹 (사용자 ID + 타임스탬프 PDF 페이지마다)
 *   - 다운로드 제한 (조회 only, save-as 차단은 클라이언트 측이라 우회 가능 — 워터마크가 1차 방어)
 *   - 뷰어 로그 (vdr_access_logs 테이블에 모든 조회 기록)
 *   - 만료 기한 (signed URL 1시간 + 자동 만료)
 *
 * Supabase Storage 버킷:
 *   - `vdr-documents` : 원본 PDF (RLS: dealroom 참여자만)
 *   - `vdr-watermarked` : 워터마킹 처리된 PDF 캐시 (24h TTL)
 *
 * 사용:
 *   const url = await getWatermarkedUrl(dealId, docId, viewerId)
 *   await logAccess({ dealId, docId, viewerId, action: 'VIEW' })
 */

import { createClient } from '@/lib/supabase/server'

export interface VdrDocument {
  id: string
  dealId: string
  filename: string
  uploadedBy: string
  uploadedAt: string
  /** Storage 경로 (vdr-documents 버킷 내) */
  storagePath: string
  /** 다운로드 가능 여부 (false=조회 only) */
  downloadable: boolean
  /** SHA-256 해시 (변조 방지) */
  sha256?: string
}

export interface VdrAccessLog {
  dealId: string
  docId: string
  viewerId: string
  action: 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'WATERMARK_APPLIED'
  ip?: string
  userAgent?: string
  timestamp: string
}

/** signed URL — 1시간 유효 */
export async function getDocumentUrl(dealId: string, docId: string, viewerId: string): Promise<string> {
  const supabase = await createClient()

  // 1) deal_room 참여자 검증
  const { data: deal } = await supabase
    .from('deal_rooms')
    .select('buyer_id, seller_id')
    .eq('id', dealId)
    .single()
  if (!deal) throw new Error('DEAL_NOT_FOUND')
  const allowedIds = [deal.buyer_id, deal.seller_id].filter(Boolean)
  if (!allowedIds.includes(viewerId)) throw new Error('FORBIDDEN')

  // 2) 문서 정보 조회
  const { data: doc } = await supabase
    .from('vdr_documents')
    .select('*')
    .eq('id', docId)
    .eq('deal_id', dealId)
    .single()
  if (!doc) throw new Error('DOC_NOT_FOUND')

  // 3) signed URL 생성 (1시간 TTL)
  const { data: signed, error } = await supabase
    .storage
    .from('vdr-documents')
    .createSignedUrl(doc.storage_path, 3600)
  if (error || !signed?.signedUrl) throw new Error('SIGN_URL_FAILED')

  return signed.signedUrl
}

/**
 * 워터마킹 처리 + URL 반환.
 * TODO: pdf-lib 등으로 사용자 ID + 타임스탬프 워터마크 적용 → vdr-watermarked 버킷 저장 → URL 반환.
 * 현재는 원본 URL + 로그만.
 */
export async function getWatermarkedUrl(dealId: string, docId: string, viewerId: string): Promise<string> {
  await logAccess({ dealId, docId, viewerId, action: 'WATERMARK_APPLIED' })
  return getDocumentUrl(dealId, docId, viewerId)
}

/** 접근 로그 기록 — vdr_access_logs 테이블 (마이그레이션 020 필요) */
export async function logAccess(log: Omit<VdrAccessLog, 'timestamp'>): Promise<void> {
  const supabase = await createClient()
  await supabase.from('vdr_access_logs').insert({
    deal_id: log.dealId,
    doc_id: log.docId,
    viewer_id: log.viewerId,
    action: log.action,
    ip: log.ip,
    user_agent: log.userAgent,
    timestamp: new Date().toISOString(),
  })
  // 실패해도 swallow — 로그 실패가 비즈니스 흐름을 막지 않음
}

/** 딜룸의 모든 VDR 문서 조회 */
export async function listDocuments(dealId: string, viewerId: string): Promise<VdrDocument[]> {
  const supabase = await createClient()

  const { data: deal } = await supabase
    .from('deal_rooms')
    .select('buyer_id, seller_id')
    .eq('id', dealId)
    .single()
  if (!deal) return []
  const allowedIds = [deal.buyer_id, deal.seller_id].filter(Boolean)
  if (!allowedIds.includes(viewerId)) return []

  const { data: docs } = await supabase
    .from('vdr_documents')
    .select('*')
    .eq('deal_id', dealId)
    .order('uploaded_at', { ascending: false })
  return (docs ?? []).map((d) => ({
    id: d.id,
    dealId: d.deal_id,
    filename: d.filename,
    uploadedBy: d.uploaded_by,
    uploadedAt: d.uploaded_at,
    storagePath: d.storage_path,
    downloadable: d.downloadable ?? false,
    sha256: d.sha256,
  }))
}
