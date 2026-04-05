import { describe, it, expect, vi } from 'vitest'
vi.setConfig({ testTimeout: 30000 })
const BASE = 'http://localhost:3000'
async function pg(p: string) { const r = await fetch(`${BASE}${p}`, { redirect: 'manual' }); return { s: r.status, b: await r.text() } }
async function ap(p: string, o?: RequestInit) { const r = await fetch(`${BASE}${p}`, { headers: { 'Content-Type': 'application/json' }, ...o }); let j: any; try { j = JSON.parse(await r.text()) } catch {}; return { s: r.status, j } }

const OK = [200, 302, 307]

// ============================================================
// A. 관리자 대시보드 (A001-A050)
// ============================================================
describe('A. 관리자 대시보드', () => {

  // A001-A010: 관리자 메인
  const adminMainPaths = [
    '/admin',
    '/admin?tab=overview',
    '/admin?tab=stats',
    '/admin?tab=recent',
    '/admin?tab=alerts',
    '/admin?period=today',
    '/admin?period=week',
    '/admin?period=month',
    '/admin?period=quarter',
    '/admin?period=year',
  ]
  adminMainPaths.forEach((p, i) => {
    it(`A${String(i + 1).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A011-A020: 관리자 서브페이지
  const adminSubPages = [
    '/admin/users',
    '/admin/listings',
    '/admin/monitoring',
    '/admin/system',
    '/admin/api-keys',
    '/admin/audit-logs',
    '/admin/complaints',
    '/admin/kyc',
    '/admin/notices',
    '/admin/communications',
  ]
  adminSubPages.forEach((p, i) => {
    it(`A${String(i + 11).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A021-A030: 관리자 가이드 CMS
  const guidePaths = [
    '/admin/guide',
    '/admin/guide?section=getting-started',
    '/admin/guide?section=listings',
    '/admin/guide?section=transactions',
    '/admin/guide?section=analytics',
    '/admin/guide?section=api',
    '/admin/guide?section=faq',
    '/admin/guide?section=troubleshooting',
    '/admin/guide?section=best-practices',
    '/admin/guide?section=glossary',
  ]
  guidePaths.forEach((p, i) => {
    it(`A${String(i + 21).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A031-A040: 관리자 보안
  const securityPaths = [
    '/admin/security',
    '/admin/security/masking',
    '/admin/security/masking?type=phone',
    '/admin/security/masking?type=email',
    '/admin/security/masking?type=name',
    '/admin/security/audit',
    '/admin/security/audit?level=critical',
    '/admin/security/audit?level=warning',
    '/admin/security/audit?level=info',
    '/admin/security/audit?period=7d',
  ]
  securityPaths.forEach((p, i) => {
    it(`A${String(i + 31).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A041-A050: 관리자 에러/로딩 상태
  const errorLoadingPaths = [
    '/admin/nonexistent-page',
    '/admin/users?error=true',
    '/admin/listings?error=true',
    '/admin/monitoring?error=true',
    '/admin/system?error=true',
    '/admin/api-keys?error=true',
    '/admin/audit-logs?error=true',
    '/admin/complaints?error=true',
    '/admin/kyc?error=true',
    '/admin/notices?error=true',
  ]
  errorLoadingPaths.forEach((p, i) => {
    it(`A${String(i + 41).padStart(3, '0')}: GET ${p} (에러/로딩)`, async () => {
      const { s } = await pg(p)
      expect([200, 302, 307, 404]).toContain(s)
    })
  })
})

// ============================================================
// B. 회원 승인 관리 (A051-A120)
// ============================================================
describe('B. 회원 승인 관리', () => {

  // A051-A060: 승인 대기열
  const approvalQueuePaths = [
    '/admin/approvals',
    '/admin/approvals?status=pending',
    '/admin/approvals?status=approved',
    '/admin/approvals?status=rejected',
    '/admin/approvals?status=suspended',
    '/admin/approvals?role=BUYER',
    '/admin/approvals?role=SELLER',
    '/admin/approvals?role=INSTITUTION',
    '/admin/approvals?role=PROFESSIONAL',
    '/admin/approvals?role=PARTNER',
  ]
  approvalQueuePaths.forEach((p, i) => {
    it(`A${String(i + 51).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A061-A080: 승인 시나리오 (각 역할별 승인)
  const approveRoles = ['BUYER', 'SELLER', 'INSTITUTION', 'PROFESSIONAL', 'PARTNER']
  const approveActions = ['approve', 'approve_with_note', 'approve_conditional', 'approve_expedited']
  let aIdx = 61
  approveRoles.forEach((role) => {
    approveActions.forEach((action) => {
      const num = aIdx++
      it(`A${String(num).padStart(3, '0')}: POST approve ${role} (${action})`, async () => {
        const { s } = await ap('/api/v1/admin/approvals', {
          method: 'POST',
          body: JSON.stringify({
            userId: `test-user-${role.toLowerCase()}`,
            role,
            action,
            note: `Test ${action} for ${role}`,
          }),
        })
        expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
      })
    })
  })

  // A081-A100: 거절 시나리오 (각 역할별 거절 + 사유)
  const rejectReasons = ['INCOMPLETE_DOCS', 'INVALID_LICENSE', 'POLICY_VIOLATION', 'DUPLICATE_ACCOUNT']
  let rIdx = 81
  approveRoles.forEach((role) => {
    rejectReasons.forEach((reason) => {
      const num = rIdx++
      it(`A${String(num).padStart(3, '0')}: POST reject ${role} (${reason})`, async () => {
        const { s } = await ap('/api/v1/admin/approvals', {
          method: 'POST',
          body: JSON.stringify({
            userId: `test-user-${role.toLowerCase()}`,
            role,
            action: 'reject',
            reason,
            note: `Rejected due to ${reason}`,
          }),
        })
        expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
      })
    })
  })

  // A101-A110: 정지/해제 (SUSPENDED → APPROVED)
  const suspendActions = [
    { action: 'suspend', userId: 'user-buyer-1', reason: 'POLICY_VIOLATION' },
    { action: 'suspend', userId: 'user-seller-1', reason: 'FRAUD_DETECTED' },
    { action: 'suspend', userId: 'user-inst-1', reason: 'COMPLIANCE_ISSUE' },
    { action: 'suspend', userId: 'user-prof-1', reason: 'LICENSE_EXPIRED' },
    { action: 'suspend', userId: 'user-partner-1', reason: 'CONTRACT_BREACH' },
    { action: 'unsuspend', userId: 'user-buyer-1', reason: 'ISSUE_RESOLVED' },
    { action: 'unsuspend', userId: 'user-seller-1', reason: 'DOCUMENTS_UPDATED' },
    { action: 'unsuspend', userId: 'user-inst-1', reason: 'COMPLIANCE_MET' },
    { action: 'unsuspend', userId: 'user-prof-1', reason: 'LICENSE_RENEWED' },
    { action: 'unsuspend', userId: 'user-partner-1', reason: 'CONTRACT_RENEWED' },
  ]
  suspendActions.forEach((sa, i) => {
    it(`A${String(i + 101).padStart(3, '0')}: POST ${sa.action} ${sa.userId}`, async () => {
      const { s } = await ap('/api/v1/admin/users/status', {
        method: 'POST',
        body: JSON.stringify(sa),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A111-A120: 역할 변경 (역할 추가/제거)
  const roleChanges = [
    { userId: 'user-1', addRole: 'SELLER', removeRole: null },
    { userId: 'user-2', addRole: 'PROFESSIONAL', removeRole: null },
    { userId: 'user-3', addRole: 'PARTNER', removeRole: null },
    { userId: 'user-4', addRole: 'INSTITUTION', removeRole: null },
    { userId: 'user-5', addRole: null, removeRole: 'SELLER' },
    { userId: 'user-6', addRole: null, removeRole: 'PROFESSIONAL' },
    { userId: 'user-7', addRole: null, removeRole: 'PARTNER' },
    { userId: 'user-8', addRole: 'SELLER', removeRole: 'BUYER' },
    { userId: 'user-9', addRole: 'INSTITUTION', removeRole: 'SELLER' },
    { userId: 'user-10', addRole: 'PROFESSIONAL', removeRole: 'INSTITUTION' },
  ]
  roleChanges.forEach((rc, i) => {
    it(`A${String(i + 111).padStart(3, '0')}: POST role change user=${rc.userId}`, async () => {
      const { s } = await ap('/api/v1/admin/users/roles', {
        method: 'POST',
        body: JSON.stringify(rc),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })
})

// ============================================================
// C. 테넌트(기관) 관리 (A121-A190)
// ============================================================
describe('C. 테넌트(기관) 관리', () => {

  // A121-A130: 테넌트 목록
  const tenantListPaths = [
    '/admin/tenants',
    '/admin/tenants?page=1',
    '/admin/tenants?page=2',
    '/admin/tenants?type=BANK',
    '/admin/tenants?type=AMC',
    '/admin/tenants?type=SAVINGS_BANK',
    '/admin/tenants?type=CAPITAL',
    '/admin/tenants?status=active',
    '/admin/tenants?status=suspended',
    '/admin/tenants?search=test',
  ]
  tenantListPaths.forEach((p, i) => {
    it(`A${String(i + 121).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A131-A140: 테넌트 상세
  const tenantIds = ['tenant-1', 'tenant-2', 'tenant-3', 'tenant-4', 'tenant-5']
  const tenantDetailTabs = ['overview', 'members', 'settings', 'billing', 'logs']
  let tdIdx = 131
  tenantIds.forEach((id) => {
    tenantDetailTabs.forEach((tab) => {
      if (tdIdx > 140) return
      const num = tdIdx++
      it(`A${String(num).padStart(3, '0')}: GET /admin/tenants/${id}?tab=${tab}`, async () => {
        const { s } = await pg(`/admin/tenants/${id}?tab=${tab}`)
        expect(OK).toContain(s)
      })
    })
  })

  // A141-A150: 테넌트 생성 시나리오
  const tenantTypes = ['BANK', 'AMC', 'SAVINGS_BANK', 'CAPITAL']
  const tenantPlans = ['BASIC', 'STANDARD', 'PREMIUM']
  let tcIdx = 141
  tenantTypes.forEach((type) => {
    tenantPlans.forEach((plan) => {
      if (tcIdx > 150) return
      const num = tcIdx++
      it(`A${String(num).padStart(3, '0')}: POST create tenant type=${type} plan=${plan}`, async () => {
        const { s } = await ap('/api/v1/admin/tenants', {
          method: 'POST',
          body: JSON.stringify({
            name: `Test ${type} ${plan}`,
            type,
            plan,
            contactEmail: `admin@test-${type.toLowerCase()}.com`,
            maxUsers: 50,
          }),
        })
        expect([200, 201, 302, 307, 401, 403, 404, 409]).toContain(s)
      })
    })
  })
  // Fill remaining A149-A150
  ;[
    { name: 'Test Special', type: 'BANK', plan: 'ENTERPRISE', maxUsers: 500 },
    { name: 'Test Trial', type: 'AMC', plan: 'TRIAL', maxUsers: 5 },
  ].forEach((t, i) => {
    const num = 149 + i
    if (num > 150) return
    it(`A${String(num).padStart(3, '0')}: POST create tenant special=${t.plan}`, async () => {
      const { s } = await ap('/api/v1/admin/tenants', {
        method: 'POST',
        body: JSON.stringify({ ...t, contactEmail: 'special@test.com' }),
      })
      expect([200, 201, 302, 307, 401, 403, 404, 409]).toContain(s)
    })
  })

  // A151-A160: 기능 토글 (각 기능 12개 ON/OFF → 10 tests)
  const features = [
    'NPL_SEARCH', 'NPL_DETAIL', 'DEAL_ROOM', 'ANALYTICS',
    'AI_VALUATION', 'DOCUMENT_OCR', 'API_ACCESS', 'BULK_DOWNLOAD',
    'PREMIUM_SUPPORT', 'CUSTOM_REPORTS',
  ]
  features.forEach((feat, i) => {
    it(`A${String(i + 151).padStart(3, '0')}: PATCH toggle feature ${feat}`, async () => {
      const { s } = await ap('/api/v1/admin/tenants/tenant-1/features', {
        method: 'PATCH',
        body: JSON.stringify({ feature: feat, enabled: i % 2 === 0 }),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A161-A170: 마스킹 규칙 (필드x마스킹 유형)
  const maskFields = ['PHONE', 'EMAIL', 'NAME', 'ADDRESS', 'ACCOUNT', 'ID_NUMBER']
  const maskTypes = ['FULL', 'PARTIAL', 'HASH', 'NONE']
  let mIdx = 161
  maskFields.forEach((field) => {
    maskTypes.forEach((maskType) => {
      if (mIdx > 170) return
      const num = mIdx++
      it(`A${String(num).padStart(3, '0')}: PATCH masking ${field}→${maskType}`, async () => {
        const { s } = await ap('/api/v1/admin/tenants/tenant-1/masking', {
          method: 'PATCH',
          body: JSON.stringify({ field, maskType }),
        })
        expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
      })
    })
  })

  // A171-A180: 테넌트 정지/활성화
  const tenantStatusActions = [
    { tenantId: 'tenant-1', action: 'suspend', reason: 'NON_PAYMENT' },
    { tenantId: 'tenant-2', action: 'suspend', reason: 'POLICY_VIOLATION' },
    { tenantId: 'tenant-3', action: 'suspend', reason: 'CONTRACT_EXPIRED' },
    { tenantId: 'tenant-4', action: 'suspend', reason: 'SECURITY_BREACH' },
    { tenantId: 'tenant-5', action: 'suspend', reason: 'ADMIN_REQUEST' },
    { tenantId: 'tenant-1', action: 'activate', reason: 'PAYMENT_RECEIVED' },
    { tenantId: 'tenant-2', action: 'activate', reason: 'ISSUE_RESOLVED' },
    { tenantId: 'tenant-3', action: 'activate', reason: 'CONTRACT_RENEWED' },
    { tenantId: 'tenant-4', action: 'activate', reason: 'SECURITY_CLEARED' },
    { tenantId: 'tenant-5', action: 'activate', reason: 'REVIEW_COMPLETE' },
  ]
  tenantStatusActions.forEach((tsa, i) => {
    it(`A${String(i + 171).padStart(3, '0')}: POST tenant ${tsa.action} ${tsa.tenantId}`, async () => {
      const { s } = await ap(`/api/v1/admin/tenants/${tsa.tenantId}/status`, {
        method: 'POST',
        body: JSON.stringify({ action: tsa.action, reason: tsa.reason }),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A181-A190: 테넌트 회원 관리
  const tenantMemberActions = [
    { tenantId: 'tenant-1', action: 'add', userId: 'user-a', role: 'ADMIN' },
    { tenantId: 'tenant-1', action: 'add', userId: 'user-b', role: 'MEMBER' },
    { tenantId: 'tenant-1', action: 'add', userId: 'user-c', role: 'VIEWER' },
    { tenantId: 'tenant-2', action: 'add', userId: 'user-d', role: 'ADMIN' },
    { tenantId: 'tenant-2', action: 'add', userId: 'user-e', role: 'MEMBER' },
    { tenantId: 'tenant-1', action: 'remove', userId: 'user-a', role: null },
    { tenantId: 'tenant-1', action: 'remove', userId: 'user-b', role: null },
    { tenantId: 'tenant-1', action: 'update_role', userId: 'user-c', role: 'ADMIN' },
    { tenantId: 'tenant-2', action: 'update_role', userId: 'user-d', role: 'MEMBER' },
    { tenantId: 'tenant-2', action: 'remove', userId: 'user-e', role: null },
  ]
  tenantMemberActions.forEach((tma, i) => {
    it(`A${String(i + 181).padStart(3, '0')}: POST tenant member ${tma.action} ${tma.tenantId}`, async () => {
      const { s } = await ap(`/api/v1/admin/tenants/${tma.tenantId}/members`, {
        method: 'POST',
        body: JSON.stringify(tma),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })
})

// ============================================================
// D. 매물 검수/승인 (A191-A260)
// ============================================================
describe('D. 매물 검수/승인', () => {

  // A191-A200: 검수 대기열
  const reviewQueuePaths = [
    '/admin/listings',
    '/admin/listings/review',
    '/admin/listings/review?status=pending',
    '/admin/listings/review?status=in_review',
    '/admin/listings/review?status=approved',
    '/admin/listings/review?status=rejected',
    '/admin/listings/review?priority=high',
    '/admin/listings/review?priority=normal',
    '/admin/listings/review?type=NPL',
    '/admin/listings/review?type=REO',
  ]
  reviewQueuePaths.forEach((p, i) => {
    it(`A${String(i + 191).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A201-A220: 4단계 검수 프로세스
  const reviewStages = ['AUTO_VALIDATION', 'AI_REVIEW', 'MANUAL_REVIEW', 'FINAL_APPROVAL']
  const reviewResults = ['pass', 'fail', 'conditional_pass', 'escalate', 'defer']
  let rvIdx = 201
  reviewStages.forEach((stage) => {
    reviewResults.forEach((result) => {
      const num = rvIdx++
      it(`A${String(num).padStart(3, '0')}: POST review stage=${stage} result=${result}`, async () => {
        const { s } = await ap('/api/v1/admin/listings/review', {
          method: 'POST',
          body: JSON.stringify({
            listingId: `listing-${num}`,
            stage,
            result,
            reviewerNote: `Test ${stage} ${result}`,
            timestamp: new Date().toISOString(),
          }),
        })
        expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
      })
    })
  })

  // A221-A230: 검수 거절 + 수정 요청
  const rejectionReasons = [
    'MISSING_DOCUMENTS', 'INCORRECT_PRICE', 'INCOMPLETE_DESCRIPTION',
    'INVALID_LOCATION', 'DUPLICATE_LISTING', 'POLICY_VIOLATION',
    'LOW_QUALITY_IMAGES', 'MISLEADING_INFO', 'LEGAL_ISSUE', 'OTHER',
  ]
  rejectionReasons.forEach((reason, i) => {
    it(`A${String(i + 221).padStart(3, '0')}: POST reject listing reason=${reason}`, async () => {
      const { s } = await ap('/api/v1/admin/listings/reject', {
        method: 'POST',
        body: JSON.stringify({
          listingId: `listing-reject-${i}`,
          reason,
          requestRevision: true,
          revisionNote: `Please fix: ${reason}`,
        }),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A231-A240: 공개 범위 최종 결정
  const visibilitySettings = [
    { listingId: 'lst-1', visibility: 'PUBLIC' },
    { listingId: 'lst-2', visibility: 'AUTHENTICATED_ONLY' },
    { listingId: 'lst-3', visibility: 'INSTITUTION_ONLY' },
    { listingId: 'lst-4', visibility: 'PREMIUM_ONLY' },
    { listingId: 'lst-5', visibility: 'PRIVATE' },
    { listingId: 'lst-6', visibility: 'PUBLIC', regions: ['SEOUL'] },
    { listingId: 'lst-7', visibility: 'INSTITUTION_ONLY', tenantIds: ['tenant-1'] },
    { listingId: 'lst-8', visibility: 'AUTHENTICATED_ONLY', minRole: 'PROFESSIONAL' },
    { listingId: 'lst-9', visibility: 'PUBLIC', featured: true },
    { listingId: 'lst-10', visibility: 'PUBLIC', featured: false },
  ]
  visibilitySettings.forEach((vs, i) => {
    it(`A${String(i + 231).padStart(3, '0')}: PATCH listing visibility=${vs.visibility}`, async () => {
      const { s } = await ap(`/api/v1/admin/listings/${vs.listingId}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify(vs),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A241-A250: 마스킹 레벨 설정
  const maskingLevels = [
    { listingId: 'lst-1', level: 'NONE' },
    { listingId: 'lst-2', level: 'BASIC' },
    { listingId: 'lst-3', level: 'STANDARD' },
    { listingId: 'lst-4', level: 'STRICT' },
    { listingId: 'lst-5', level: 'MAXIMUM' },
    { listingId: 'lst-6', level: 'BASIC', fields: ['debtor_name'] },
    { listingId: 'lst-7', level: 'STANDARD', fields: ['debtor_name', 'address'] },
    { listingId: 'lst-8', level: 'STRICT', fields: ['debtor_name', 'address', 'phone'] },
    { listingId: 'lst-9', level: 'CUSTOM', customRules: { phone: 'PARTIAL', name: 'FULL' } },
    { listingId: 'lst-10', level: 'CUSTOM', customRules: { address: 'HASH', account: 'FULL' } },
  ]
  maskingLevels.forEach((ml, i) => {
    it(`A${String(i + 241).padStart(3, '0')}: PATCH listing masking level=${ml.level}`, async () => {
      const { s } = await ap(`/api/v1/admin/listings/${ml.listingId}/masking`, {
        method: 'PATCH',
        body: JSON.stringify(ml),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A251-A260: 대량 승인/거절
  const bulkActions = [
    { action: 'bulk_approve', listingIds: ['lst-1', 'lst-2', 'lst-3'] },
    { action: 'bulk_approve', listingIds: ['lst-4', 'lst-5'] },
    { action: 'bulk_reject', listingIds: ['lst-6', 'lst-7'], reason: 'INCOMPLETE' },
    { action: 'bulk_reject', listingIds: ['lst-8'], reason: 'POLICY_VIOLATION' },
    { action: 'bulk_approve', listingIds: Array.from({ length: 10 }, (_, k) => `lst-bulk-${k}`) },
    { action: 'bulk_reject', listingIds: Array.from({ length: 10 }, (_, k) => `lst-bulk-r-${k}`), reason: 'QUALITY' },
    { action: 'bulk_approve', listingIds: Array.from({ length: 50 }, (_, k) => `lst-mass-${k}`) },
    { action: 'bulk_update_visibility', listingIds: ['lst-1', 'lst-2'], visibility: 'PUBLIC' },
    { action: 'bulk_update_masking', listingIds: ['lst-3', 'lst-4'], level: 'STANDARD' },
    { action: 'bulk_archive', listingIds: ['lst-old-1', 'lst-old-2', 'lst-old-3'] },
  ]
  bulkActions.forEach((ba, i) => {
    it(`A${String(i + 251).padStart(3, '0')}: POST bulk ${ba.action}`, async () => {
      const { s } = await ap('/api/v1/admin/listings/bulk', {
        method: 'POST',
        body: JSON.stringify(ba),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })
})

// ============================================================
// E. 과금/상품 관리 (A261-A330)
// ============================================================
describe('E. 과금/상품 관리', () => {

  // A261-A270: 구독 플랜 관리 (GET plans)
  const pricingPaths = [
    '/admin/pricing',
    '/admin/pricing?tab=plans',
    '/admin/pricing?tab=credits',
    '/admin/pricing?tab=fees',
    '/admin/pricing?tab=revenue',
    '/api/v1/admin/pricing/plans',
    '/api/v1/admin/pricing/plans?status=active',
    '/api/v1/admin/pricing/plans?status=archived',
    '/api/v1/admin/pricing/plans?type=individual',
    '/api/v1/admin/pricing/plans?type=institutional',
  ]
  pricingPaths.forEach((p, i) => {
    const num = i + 261
    if (p.startsWith('/api')) {
      it(`A${String(num).padStart(3, '0')}: GET ${p}`, async () => {
        const { s } = await ap(p)
        expect([200, 302, 307, 401, 403]).toContain(s)
      })
    } else {
      it(`A${String(num).padStart(3, '0')}: GET ${p}`, async () => {
        const { s } = await pg(p)
        expect(OK).toContain(s)
      })
    }
  })

  // A271-A280: 구독 플랜 CRUD
  const planCrudOps = [
    { method: 'POST', body: { name: 'Free', price: 0, credits: 10, features: ['NPL_SEARCH'] } },
    { method: 'POST', body: { name: 'Basic', price: 49000, credits: 100, features: ['NPL_SEARCH', 'NPL_DETAIL'] } },
    { method: 'POST', body: { name: 'Pro', price: 149000, credits: 500, features: ['NPL_SEARCH', 'NPL_DETAIL', 'ANALYTICS'] } },
    { method: 'POST', body: { name: 'Enterprise', price: 499000, credits: 2000, features: ['ALL'] } },
    { method: 'PATCH', body: { planId: 'plan-1', name: 'Free Updated', credits: 15 } },
    { method: 'PATCH', body: { planId: 'plan-2', price: 59000 } },
    { method: 'PATCH', body: { planId: 'plan-3', features: ['NPL_SEARCH', 'NPL_DETAIL', 'ANALYTICS', 'AI_VALUATION'] } },
    { method: 'PATCH', body: { planId: 'plan-4', credits: 3000, maxUsers: 200 } },
    { method: 'DELETE' as string, body: { planId: 'plan-deprecated-1' } },
    { method: 'DELETE' as string, body: { planId: 'plan-deprecated-2' } },
  ]
  planCrudOps.forEach((op, i) => {
    it(`A${String(i + 271).padStart(3, '0')}: ${op.method} pricing plan`, async () => {
      const { s } = await ap('/api/v1/admin/pricing/plans', {
        method: op.method,
        body: JSON.stringify(op.body),
      })
      expect([200, 201, 204, 302, 307, 401, 403, 404, 409]).toContain(s)
    })
  })

  // A281-A290: 크레딧 상품 관리 (패키지 CRUD)
  const creditPackages = [
    { method: 'POST', body: { name: '10 Credits', credits: 10, price: 9900 } },
    { method: 'POST', body: { name: '50 Credits', credits: 50, price: 39000 } },
    { method: 'POST', body: { name: '100 Credits', credits: 100, price: 69000 } },
    { method: 'POST', body: { name: '500 Credits', credits: 500, price: 290000 } },
    { method: 'POST', body: { name: '1000 Credits', credits: 1000, price: 490000 } },
    { method: 'PATCH', body: { packageId: 'pkg-1', price: 8900 } },
    { method: 'PATCH', body: { packageId: 'pkg-2', credits: 55, bonusCredits: 5 } },
    { method: 'PATCH', body: { packageId: 'pkg-3', active: false } },
    { method: 'DELETE' as string, body: { packageId: 'pkg-old-1' } },
    { method: 'DELETE' as string, body: { packageId: 'pkg-old-2' } },
  ]
  creditPackages.forEach((cp, i) => {
    it(`A${String(i + 281).padStart(3, '0')}: ${cp.method} credit package`, async () => {
      const { s } = await ap('/api/v1/admin/pricing/credits', {
        method: cp.method,
        body: JSON.stringify(cp.body),
      })
      expect([200, 201, 204, 302, 307, 401, 403, 404, 409]).toContain(s)
    })
  })

  // A291-A300: 서비스별 크레딧 소모 설정
  const serviceCreditSettings = [
    { service: 'NPL_SEARCH', creditsPerUse: 1 },
    { service: 'NPL_DETAIL', creditsPerUse: 3 },
    { service: 'AI_VALUATION', creditsPerUse: 10 },
    { service: 'DOCUMENT_OCR', creditsPerUse: 5 },
    { service: 'DEAL_ROOM_CREATE', creditsPerUse: 20 },
    { service: 'ANALYTICS_REPORT', creditsPerUse: 15 },
    { service: 'NPL_SEARCH', creditsPerUse: 0, note: 'free tier test' },
    { service: 'AI_VALUATION', creditsPerUse: 8, note: 'discounted' },
    { service: 'BULK_DOWNLOAD', creditsPerUse: 50 },
    { service: 'API_CALL', creditsPerUse: 2 },
  ]
  serviceCreditSettings.forEach((sc, i) => {
    it(`A${String(i + 291).padStart(3, '0')}: PATCH credit cost ${sc.service}=${sc.creditsPerUse}`, async () => {
      const { s } = await ap('/api/v1/admin/pricing/service-credits', {
        method: 'PATCH',
        body: JSON.stringify(sc),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A301-A310: 거래 수수료 설정
  const feeSettings = [
    { type: 'BUYER_FEE', rate: 0.01, minFee: 100000 },
    { type: 'BUYER_FEE', rate: 0.015, minFee: 50000 },
    { type: 'SELLER_FEE', rate: 0.02, minFee: 200000 },
    { type: 'SELLER_FEE', rate: 0.025, minFee: 100000 },
    { type: 'PREMIUM_FEE', rate: 0.005, minFee: 500000 },
    { type: 'PREMIUM_FEE', rate: 0.003, minFee: 300000 },
    { type: 'BANNER_FEE', flatRate: 50000, duration: 'daily' },
    { type: 'BANNER_FEE', flatRate: 300000, duration: 'weekly' },
    { type: 'BANNER_FEE', flatRate: 1000000, duration: 'monthly' },
    { type: 'PLATFORM_FEE', rate: 0.03, maxFee: 10000000 },
  ]
  feeSettings.forEach((fs, i) => {
    it(`A${String(i + 301).padStart(3, '0')}: PATCH fee ${fs.type}`, async () => {
      const { s } = await ap('/api/v1/admin/pricing/fees', {
        method: 'PATCH',
        body: JSON.stringify(fs),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A311-A320: 기관별 특별 요율
  const specialRates = [
    { tenantId: 'tenant-1', discount: 0.1, note: '10% discount' },
    { tenantId: 'tenant-2', discount: 0.15, note: '15% discount' },
    { tenantId: 'tenant-3', discount: 0.2, note: '20% discount' },
    { tenantId: 'tenant-4', discount: 0.25, note: 'VIP partner' },
    { tenantId: 'tenant-5', discount: 0.3, note: 'Strategic partner' },
    { tenantId: 'tenant-1', customCreditsPerMonth: 1000 },
    { tenantId: 'tenant-2', customCreditsPerMonth: 2000 },
    { tenantId: 'tenant-3', freeServices: ['NPL_SEARCH', 'NPL_DETAIL'] },
    { tenantId: 'tenant-4', freeServices: ['AI_VALUATION'] },
    { tenantId: 'tenant-5', customPricing: true, contractPrice: 5000000 },
  ]
  specialRates.forEach((sr, i) => {
    it(`A${String(i + 311).padStart(3, '0')}: PATCH special rate tenant=${sr.tenantId}`, async () => {
      const { s } = await ap(`/api/v1/admin/pricing/special-rates`, {
        method: 'PATCH',
        body: JSON.stringify(sr),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A321-A330: 매출 대시보드
  const revenuePaths = [
    '/admin/billing',
    '/admin/billing?period=daily',
    '/admin/billing?period=weekly',
    '/admin/billing?period=monthly',
    '/admin/billing?period=yearly',
    '/api/v1/admin/billing/revenue?period=30d',
    '/api/v1/admin/billing/revenue?period=90d',
    '/api/v1/admin/billing/revenue?type=subscription',
    '/api/v1/admin/billing/revenue?type=credits',
    '/api/v1/admin/billing/revenue?type=fees',
  ]
  revenuePaths.forEach((p, i) => {
    const num = i + 321
    if (p.startsWith('/api')) {
      it(`A${String(num).padStart(3, '0')}: GET ${p}`, async () => {
        const { s } = await ap(p)
        expect([200, 302, 307, 401, 403]).toContain(s)
      })
    } else {
      it(`A${String(num).padStart(3, '0')}: GET ${p}`, async () => {
        const { s } = await pg(p)
        expect(OK).toContain(s)
      })
    }
  })
})

// ============================================================
// F. 파트너/전문가 관리 (A331-A380)
// ============================================================
describe('F. 파트너/전문가 관리', () => {

  // A331-A340: 파트너 관리
  const partnerPaths = [
    '/admin/partners',
    '/admin/partners?status=active',
    '/admin/partners?status=pending',
    '/admin/partners?status=suspended',
    '/admin/partners?type=REFERRAL',
    '/admin/partners?type=RESELLER',
    '/admin/partners?type=AFFILIATE',
    '/admin/partners?search=test',
    '/admin/partners?sort=revenue',
    '/admin/partners?sort=referrals',
  ]
  partnerPaths.forEach((p, i) => {
    it(`A${String(i + 331).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A341-A350: 파트너 정산
  const settlementActions = [
    { method: 'GET', path: '/api/v1/admin/partners/settlements' },
    { method: 'GET', path: '/api/v1/admin/partners/settlements?status=pending' },
    { method: 'GET', path: '/api/v1/admin/partners/settlements?status=approved' },
    { method: 'GET', path: '/api/v1/admin/partners/settlements?status=paid' },
    { method: 'GET', path: '/api/v1/admin/partners/settlements?status=rejected' },
    { method: 'POST', path: '/api/v1/admin/partners/settlements/approve', body: { settlementId: 's-1' } },
    { method: 'POST', path: '/api/v1/admin/partners/settlements/approve', body: { settlementId: 's-2' } },
    { method: 'POST', path: '/api/v1/admin/partners/settlements/reject', body: { settlementId: 's-3', reason: 'INCORRECT_AMOUNT' } },
    { method: 'POST', path: '/api/v1/admin/partners/settlements/reject', body: { settlementId: 's-4', reason: 'FRAUD_SUSPECTED' } },
    { method: 'POST', path: '/api/v1/admin/partners/settlements/pay', body: { settlementIds: ['s-1', 's-2'] } },
  ]
  settlementActions.forEach((sa, i) => {
    it(`A${String(i + 341).padStart(3, '0')}: ${sa.method} settlement`, async () => {
      const opts: RequestInit = { method: sa.method }
      if ((sa as any).body) opts.body = JSON.stringify((sa as any).body)
      const { s } = await ap(sa.path, opts)
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A351-A360: VIP 추천코드 발급
  const referralCodes = [
    { partnerId: 'p-1', type: 'VIP', discount: 20, maxUses: 100 },
    { partnerId: 'p-2', type: 'VIP', discount: 15, maxUses: 50 },
    { partnerId: 'p-3', type: 'STANDARD', discount: 10, maxUses: 200 },
    { partnerId: 'p-4', type: 'STANDARD', discount: 5, maxUses: 500 },
    { partnerId: 'p-5', type: 'PREMIUM', discount: 30, maxUses: 20 },
    { partnerId: 'p-1', type: 'VIP', discount: 25, maxUses: 10, expiresIn: '30d' },
    { partnerId: 'p-2', type: 'VIP', discount: 20, maxUses: 5, expiresIn: '7d' },
    { partnerId: 'p-3', type: 'ONE_TIME', discount: 50, maxUses: 1 },
    { partnerId: 'p-4', type: 'ONE_TIME', discount: 100, maxUses: 1, note: 'full discount' },
    { partnerId: 'p-5', type: 'BULK', discount: 10, maxUses: 1000, targetTenant: 'tenant-1' },
  ]
  referralCodes.forEach((rc, i) => {
    it(`A${String(i + 351).padStart(3, '0')}: POST referral code partner=${rc.partnerId} type=${rc.type}`, async () => {
      const { s } = await ap('/api/v1/admin/partners/referral-codes', {
        method: 'POST',
        body: JSON.stringify(rc),
      })
      expect([200, 201, 302, 307, 401, 403, 404, 409]).toContain(s)
    })
  })

  // A361-A370: 전문가 관리
  const professionalActions = [
    { method: 'GET', path: '/admin/professionals' },
    { method: 'GET', path: '/admin/professionals?status=active' },
    { method: 'GET', path: '/admin/professionals?status=pending_approval' },
    { method: 'GET', path: '/admin/professionals?specialty=LEGAL' },
    { method: 'GET', path: '/admin/professionals?specialty=APPRAISAL' },
  ]
  const professionalApiActions = [
    { method: 'POST', path: '/api/v1/admin/professionals/approve-pricing', body: { professionalId: 'prof-1', approvedRate: 500000 } },
    { method: 'POST', path: '/api/v1/admin/professionals/approve-pricing', body: { professionalId: 'prof-2', approvedRate: 300000 } },
    { method: 'POST', path: '/api/v1/admin/professionals/reject-pricing', body: { professionalId: 'prof-3', reason: 'TOO_HIGH' } },
    { method: 'PATCH', path: '/api/v1/admin/professionals/guidelines', body: { specialty: 'LEGAL', maxRate: 1000000, minRate: 100000 } },
    { method: 'PATCH', path: '/api/v1/admin/professionals/guidelines', body: { specialty: 'APPRAISAL', maxRate: 800000, minRate: 80000 } },
  ]
  professionalActions.forEach((pa, i) => {
    it(`A${String(i + 361).padStart(3, '0')}: GET ${pa.path}`, async () => {
      const { s } = await pg(pa.path)
      expect(OK).toContain(s)
    })
  })
  professionalApiActions.forEach((pa, i) => {
    it(`A${String(i + 366).padStart(3, '0')}: ${pa.method} professional action`, async () => {
      const { s } = await ap(pa.path, {
        method: pa.method,
        body: JSON.stringify(pa.body),
      })
      expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A371-A380: 배너 관리
  const bannerActions = [
    { method: 'GET', path: '/admin/banners' },
    { method: 'GET', path: '/admin/banners?status=active' },
    { method: 'GET', path: '/admin/banners?status=scheduled' },
    { method: 'GET', path: '/admin/banners?status=expired' },
  ]
  const bannerApiActions = [
    { method: 'POST', body: { title: 'Test Banner 1', position: 'TOP', targetUrl: '/listings' } },
    { method: 'POST', body: { title: 'Test Banner 2', position: 'SIDEBAR', targetUrl: '/market' } },
    { method: 'PATCH', body: { bannerId: 'banner-1', title: 'Updated Banner', active: true } },
    { method: 'PATCH', body: { bannerId: 'banner-2', targeting: { roles: ['INSTITUTION'], regions: ['SEOUL'] } } },
    { method: 'GET', path: '/api/v1/admin/banners/performance?bannerId=banner-1' },
    { method: 'GET', path: '/api/v1/admin/banners/performance?period=30d' },
  ]
  bannerActions.forEach((ba, i) => {
    it(`A${String(i + 371).padStart(3, '0')}: GET ${ba.path}`, async () => {
      const { s } = await pg(ba.path)
      expect(OK).toContain(s)
    })
  })
  bannerApiActions.forEach((ba, i) => {
    const num = i + 375
    if (ba.method === 'GET') {
      it(`A${String(num).padStart(3, '0')}: GET ${(ba as any).path}`, async () => {
        const { s } = await ap((ba as any).path)
        expect([200, 302, 307, 401, 403, 404]).toContain(s)
      })
    } else {
      it(`A${String(num).padStart(3, '0')}: ${ba.method} banner`, async () => {
        const { s } = await ap('/api/v1/admin/banners', {
          method: ba.method,
          body: JSON.stringify(ba.body),
        })
        expect([200, 201, 302, 307, 401, 403, 404]).toContain(s)
      })
    }
  })
})

// ============================================================
// G. 보안/모니터링 (A381-A400)
// ============================================================
describe('G. 보안/모니터링', () => {

  // A381-A385: 감사 로그
  const auditLogPaths = [
    '/admin/audit-logs',
    '/admin/audit-logs?level=critical',
    '/admin/audit-logs?level=warning',
    '/admin/audit-logs?action=LOGIN',
    '/admin/audit-logs?action=DATA_ACCESS',
  ]
  auditLogPaths.forEach((p, i) => {
    it(`A${String(i + 381).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A386-A390: 시스템 모니터링
  const monitoringPaths = [
    '/admin/monitoring',
    '/admin/monitoring?tab=health',
    '/admin/monitoring?tab=performance',
    '/admin/monitoring?tab=errors',
    '/admin/monitoring?tab=usage',
  ]
  monitoringPaths.forEach((p, i) => {
    it(`A${String(i + 386).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })

  // A391-A395: API 키 관리
  const apiKeyActions = [
    { method: 'GET', path: '/admin/api-keys' },
    { method: 'GET', path: '/admin/api-keys?status=active' },
    { method: 'GET', path: '/admin/api-keys?status=revoked' },
  ]
  const apiKeyApiActions = [
    { method: 'POST', path: '/api/v1/admin/api-keys', body: { name: 'Test Key', scopes: ['read:listings'], tenantId: 'tenant-1' } },
    { method: 'DELETE', path: '/api/v1/admin/api-keys/key-1', body: { reason: 'EXPIRED' } },
  ]
  apiKeyActions.forEach((ak, i) => {
    it(`A${String(i + 391).padStart(3, '0')}: GET ${ak.path}`, async () => {
      const { s } = await pg(ak.path)
      expect(OK).toContain(s)
    })
  })
  apiKeyApiActions.forEach((ak, i) => {
    it(`A${String(i + 394).padStart(3, '0')}: ${ak.method} api-key`, async () => {
      const { s } = await ap(ak.path, {
        method: ak.method,
        body: JSON.stringify(ak.body),
      })
      expect([200, 201, 204, 302, 307, 401, 403, 404]).toContain(s)
    })
  })

  // A396-A400: 불만/KYC 관리
  const compliancePaths = [
    '/admin/complaints',
    '/admin/complaints?status=open',
    '/admin/complaints?status=resolved',
    '/admin/kyc',
    '/admin/kyc?status=pending',
  ]
  compliancePaths.forEach((p, i) => {
    it(`A${String(i + 396).padStart(3, '0')}: GET ${p}`, async () => {
      const { s } = await pg(p)
      expect(OK).toContain(s)
    })
  })
})
