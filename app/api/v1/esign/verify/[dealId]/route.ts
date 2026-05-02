/**
 * /api/v1/esign/verify/[dealId]
 *
 * GET — deal 의 모든 esign_records chain hash 정합성 검증.
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-7 항목 (자체 hash chain 강화).
 * 분쟁 시 또는 정기 감사 시 호출 — chain 이 깨졌는지 즉시 판별.
 *
 * 검증 알고리즘:
 *   1. esign_records 를 signed_at 시간순으로 가져옴
 *   2. document_hash 부터 출발해 SHA-256 누적
 *      acc[0] = document_hash[0]
 *      acc[i] = SHA256(acc[i-1] + record[i].chain_hash)  // 또는 record 자체의 chain_hash 사용
 *   3. 각 row 의 chain_hash 가 재계산값과 일치하는지 비교
 *   4. 만일 깨진 row 발견 시 즉시 reject + 관리자 알림 권고
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'

interface EsignRow {
  id: string
  document_type: string
  document_hash: string
  chain_hash: string
  signer_name: string
  signer_role: string
  signed_at: string
  retention_until: string | null
  revoked_at: string | null
}

interface VerifyEntry {
  id: string
  document_type: string
  signer_name: string
  signer_role: string
  signed_at: string
  document_hash: string
  stored_chain_hash: string
  recomputed_chain_hash: string
  is_valid: boolean
  retention_until: string | null
  retention_status: 'ACTIVE' | 'EXPIRED' | 'NOT_SET'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> },
) {
  try {
    const { dealId } = await params

    const user = await getAuthUser()
    if (!user) {
      return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    const supabase = await createClient()

    // RPC 또는 직접 SELECT — fn_esign_chain_for_deal 마이그레이션이 적용되었다고 가정
    const { data: rows, error } = await supabase
      .from('esign_records')
      .select('id, document_type, document_hash, chain_hash, signer_name, signer_role, signed_at, retention_until, revoked_at')
      .eq('deal_id', dealId)
      .is('revoked_at', null)
      .order('signed_at', { ascending: true })

    if (error) {
      return apiError('INTERNAL_ERROR', `조회 실패: ${error.message}`, 500)
    }

    const records = (rows ?? []) as EsignRow[]

    if (records.length === 0) {
      return NextResponse.json({
        deal_id: dealId,
        record_count: 0,
        chain_valid: null,
        message: '본 거래에 등록된 전자서명 기록이 없습니다.',
      })
    }

    // ── Chain hash 재계산 ─────────────────────────────────
    // 알고리즘: 각 row 의 chain_hash 는 SHA256(prev_chain_hash + document_hash + signer_id + signed_at)
    // 단순화: SHA256(prev_chain_hash + document_hash)
    let prevHash = ''
    const verified: VerifyEntry[] = records.map((r) => {
      const recomputed = createHash('sha256')
        .update(prevHash + r.document_hash)
        .digest('hex')

      const isValid = recomputed === r.chain_hash
      prevHash = r.chain_hash  // 다음 row 누적

      const now = Date.now()
      const retentionStatus: VerifyEntry['retention_status'] =
        !r.retention_until ? 'NOT_SET'
        : new Date(r.retention_until).getTime() < now ? 'EXPIRED'
        : 'ACTIVE'

      return {
        id: r.id,
        document_type: r.document_type,
        signer_name: r.signer_name,
        signer_role: r.signer_role,
        signed_at: r.signed_at,
        document_hash: r.document_hash,
        stored_chain_hash: r.chain_hash,
        recomputed_chain_hash: recomputed,
        is_valid: isValid,
        retention_until: r.retention_until,
        retention_status: retentionStatus,
      }
    })

    const allValid = verified.every((v) => v.is_valid)
    const brokenAtIndex = verified.findIndex((v) => !v.is_valid)

    return NextResponse.json({
      deal_id: dealId,
      record_count: records.length,
      chain_valid: allValid,
      broken_at: brokenAtIndex === -1 ? null : {
        index: brokenAtIndex,
        record_id: verified[brokenAtIndex]!.id,
        signer: verified[brokenAtIndex]!.signer_name,
        signed_at: verified[brokenAtIndex]!.signed_at,
      },
      verified_at: new Date().toISOString(),
      records: verified,
      // 보관 만료 카운트
      retention_summary: {
        active: verified.filter((v) => v.retention_status === 'ACTIVE').length,
        expired: verified.filter((v) => v.retention_status === 'EXPIRED').length,
        not_set: verified.filter((v) => v.retention_status === 'NOT_SET').length,
      },
    })
  } catch (err) {
    console.error('[esign/verify GET]', err)
    return apiError('INTERNAL_ERROR', 'chain hash 검증 실패', 500)
  }
}
