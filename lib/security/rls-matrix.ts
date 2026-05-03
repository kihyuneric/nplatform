/**
 * lib/security/rls-matrix.ts
 *
 * RLS 정책 매트릭스 SSoT (P0-11 · 2026-05-03)
 *
 * 진단서 NPLatform_Code_Gap_Audit 의 P0-11 항목 처리.
 * Supabase RLS 정책의 의도를 코드로 명시 → 정책 변경 시 테스트가 자동 감지.
 *
 * 매트릭스 구조:
 *   table × role × operation = ExpectedBehavior
 *
 * 활용:
 *   - __tests__/security/rls-matrix.test.ts 가 본 매트릭스 무결성 검증
 *   - SUPABASE_TEST_URL 환경변수 있을 때 실제 supabase 호출로 검증
 *   - CI 게이트: 매트릭스에 명시된 정책이 실제 supabase 와 일치하지 않으면 빌드 실패
 */

export type RlsRole = 'anon' | 'service_role' | 'admin' | 'super_admin' | 'seller' | 'buyer' | 'partner'
export type RlsOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
export type ExpectedBehavior = 'ALLOW' | 'DENY' | 'OWN_ONLY' | 'PARTY_ONLY'

export interface RlsRule {
  /** 동일 row 에 대한 작업 결과 */
  expected: ExpectedBehavior
  /** 정책 정의 위치 (마이그레이션 파일) */
  source: string
  /** 추가 제약 (예: published=true 만 / signed_at 있을 때만) */
  condition?: string
}

export interface RlsTableMatrix {
  /** 테이블 명 */
  table: string
  /** role × operation 매트릭스 */
  rules: Partial<Record<RlsRole, Partial<Record<RlsOperation, RlsRule>>>>
  /** 비즈니스 의미 — 테스트 실패 시 onCall 가이드 */
  businessRationale: string
}

// ─── RLS 매트릭스 (한국 비즈니스 핵심 8 테이블) ────────────────
export const RLS_MATRIX: RlsTableMatrix[] = [
  {
    table: 'npl_listings',
    businessRationale:
      '매도자가 등록한 매물은 본인 + ACTIVE/PUBLIC 상태 row 만 외부 노출. ' +
      'PII 마스킹은 application layer 책임 (이 매트릭스는 row-level 만).',
    rules: {
      anon: {
        SELECT: { expected: 'ALLOW', source: '010_rls_policies.sql', condition: "status='ACTIVE' AND visibility='PUBLIC'" },
      },
      seller: {
        SELECT: { expected: 'OWN_ONLY', source: '010_rls_policies.sql', condition: 'seller_id=auth.uid() OR (status=ACTIVE AND visibility=PUBLIC)' },
        INSERT: { expected: 'OWN_ONLY', source: '010_rls_policies.sql', condition: 'seller_id=auth.uid()' },
        UPDATE: { expected: 'OWN_ONLY', source: '010_rls_policies.sql', condition: 'seller_id=auth.uid()' },
        DELETE: { expected: 'OWN_ONLY', source: '010_rls_policies.sql', condition: 'seller_id=auth.uid()' },
      },
      buyer: {
        SELECT: { expected: 'ALLOW', source: '010_rls_policies.sql', condition: "status='ACTIVE'" },
      },
      admin: {
        SELECT: { expected: 'ALLOW', source: '010_rls_policies.sql' },
        UPDATE: { expected: 'ALLOW', source: '010_rls_policies.sql' },
        DELETE: { expected: 'ALLOW', source: '010_rls_policies.sql' },
      },
    },
  },
  {
    table: 'deal_room_messages',
    businessRationale:
      '딜룸 채팅은 참여자 (buyer/seller) 만. INSERT 시 user_id 본인 강제. ' +
      'admin 은 분쟁 조사 목적으로 SELECT 만 가능 (UPDATE/DELETE 불허).',
    rules: {
      buyer: {
        SELECT: { expected: 'PARTY_ONLY', source: '022_dealroom_v6.sql', condition: 'deal_room_participants 에 본인 있음' },
        INSERT: { expected: 'PARTY_ONLY', source: '022_dealroom_v6.sql', condition: 'user_id=auth.uid() AND 본인이 참여자' },
      },
      seller: {
        SELECT: { expected: 'PARTY_ONLY', source: '022_dealroom_v6.sql' },
        INSERT: { expected: 'PARTY_ONLY', source: '022_dealroom_v6.sql' },
      },
      admin: {
        SELECT: { expected: 'ALLOW', source: '022_dealroom_v6.sql' },
      },
    },
  },
  {
    table: 'esign_records',
    businessRationale:
      '서명 기록은 서명자 본인 + 거래 참여자 SELECT. ' +
      '5년 보관 정책 — DELETE 는 retention_until 경과 후 SUPER_ADMIN 만.',
    rules: {
      buyer: {
        SELECT: { expected: 'PARTY_ONLY', source: '20260415_esign_records.sql', condition: 'signer_id=auth.uid() OR deal 참여' },
        INSERT: { expected: 'OWN_ONLY', source: '20260415_esign_records.sql', condition: 'signer_id=auth.uid()' },
      },
      seller: {
        SELECT: { expected: 'PARTY_ONLY', source: '20260415_esign_records.sql' },
        INSERT: { expected: 'OWN_ONLY', source: '20260415_esign_records.sql' },
      },
      admin: {
        SELECT: { expected: 'ALLOW', source: '20260415_esign_records.sql' },
        UPDATE: { expected: 'ALLOW', source: '20260415_esign_records.sql' },
        DELETE: { expected: 'DENY', source: '20260503_esign_retention.sql', condition: 'retention_until 만료 전 거부' },
      },
      super_admin: {
        DELETE: { expected: 'ALLOW', source: '20260503_esign_retention.sql', condition: 'retention_until 만료 후 또는 무관 (super_admin)' },
      },
    },
  },
  {
    table: 'escrow_workflows',
    businessRationale:
      'ESCROW 워크플로우는 buyer/seller 본인 SELECT, admin 만 INSERT/UPDATE. ' +
      '자체 ESCROW 정책 (P0-6) — NPLatform 자금 보관 X.',
    rules: {
      buyer: {
        SELECT: { expected: 'PARTY_ONLY', source: '20260503_escrow_workflow.sql', condition: 'buyer_id=auth.uid()' },
      },
      seller: {
        SELECT: { expected: 'PARTY_ONLY', source: '20260503_escrow_workflow.sql', condition: 'seller_id=auth.uid()' },
      },
      admin: {
        SELECT: { expected: 'ALLOW', source: '20260503_escrow_workflow.sql' },
        INSERT: { expected: 'ALLOW', source: '20260503_escrow_workflow.sql' },
        UPDATE: { expected: 'ALLOW', source: '20260503_escrow_workflow.sql' },
      },
    },
  },
  {
    table: 'commission_invoices',
    businessRationale:
      '수수료 인보이스는 recipient (buyer/seller) 본인 + admin SELECT. ' +
      '결제 처리 후 status PAID 변경은 결제 webhook 만.',
    rules: {
      buyer: {
        SELECT: { expected: 'OWN_ONLY', source: '020_commission_tables.sql', condition: 'recipient_id=auth.uid()' },
      },
      seller: {
        SELECT: { expected: 'OWN_ONLY', source: '020_commission_tables.sql', condition: 'recipient_id=auth.uid()' },
      },
      admin: {
        SELECT: { expected: 'ALLOW', source: '020_commission_tables.sql' },
      },
    },
  },
  {
    table: 'favorites',
    businessRationale:
      '즐겨찾기는 본인 전용 — 다른 사용자가 누가 무엇을 즐겨찾기 했는지 알 수 없음.',
    rules: {
      buyer: {
        SELECT: { expected: 'OWN_ONLY', source: '010_rls_policies.sql', condition: 'user_id=auth.uid()' },
        INSERT: { expected: 'OWN_ONLY', source: '010_rls_policies.sql' },
        DELETE: { expected: 'OWN_ONLY', source: '010_rls_policies.sql' },
      },
      seller: {
        SELECT: { expected: 'OWN_ONLY', source: '010_rls_policies.sql' },
      },
    },
  },
  {
    table: 'notifications',
    businessRationale:
      '알림은 수신자 본인만. 송신은 service_role (서버) 만.',
    rules: {
      buyer: {
        SELECT: { expected: 'OWN_ONLY', source: '008_notification_tables.sql', condition: 'user_id=auth.uid()' },
        UPDATE: { expected: 'OWN_ONLY', source: '008_notification_tables.sql', condition: 'is_read 토글만' },
      },
      seller: {
        SELECT: { expected: 'OWN_ONLY', source: '008_notification_tables.sql' },
        UPDATE: { expected: 'OWN_ONLY', source: '008_notification_tables.sql' },
      },
      service_role: {
        INSERT: { expected: 'ALLOW', source: '008_notification_tables.sql' },
      },
    },
  },
  {
    table: 'contract_requests',
    businessRationale:
      'LOI/매수의향/본계약 요청 — buyer/seller 양측 SELECT, buyer INSERT.',
    rules: {
      buyer: {
        SELECT: { expected: 'PARTY_ONLY', source: '010_rls_policies.sql', condition: 'buyer_id=auth.uid()' },
        INSERT: { expected: 'OWN_ONLY', source: '010_rls_policies.sql', condition: 'buyer_id=auth.uid()' },
      },
      seller: {
        SELECT: { expected: 'PARTY_ONLY', source: '010_rls_policies.sql', condition: 'seller_id=auth.uid()' },
        UPDATE: { expected: 'PARTY_ONLY', source: '010_rls_policies.sql', condition: 'seller_id=auth.uid() (status 변경)' },
      },
      admin: {
        SELECT: { expected: 'ALLOW', source: '010_rls_policies.sql' },
        UPDATE: { expected: 'ALLOW', source: '010_rls_policies.sql' },
      },
    },
  },
]

// ─── 헬퍼 ────────────────────────────────────────────────────
export function getMatrixForTable(table: string): RlsTableMatrix | undefined {
  return RLS_MATRIX.find((m) => m.table === table)
}

export function getExpected(
  table: string,
  role: RlsRole,
  op: RlsOperation,
): ExpectedBehavior | null {
  const matrix = getMatrixForTable(table)
  if (!matrix) return null
  return matrix.rules[role]?.[op]?.expected ?? null
}

export function listTables(): string[] {
  return RLS_MATRIX.map((m) => m.table)
}

/** 매트릭스 통계 — 마케팅/감사 자료에서 인용 */
export function getMatrixStats(): {
  totalTables: number
  totalRules: number
  byRole: Record<RlsRole, number>
} {
  const byRole: Record<string, number> = {}
  let totalRules = 0
  RLS_MATRIX.forEach((m) => {
    Object.entries(m.rules).forEach(([role, ops]) => {
      const count = Object.keys(ops ?? {}).length
      byRole[role] = (byRole[role] ?? 0) + count
      totalRules += count
    })
  })
  return {
    totalTables: RLS_MATRIX.length,
    totalRules,
    byRole: byRole as Record<RlsRole, number>,
  }
}
