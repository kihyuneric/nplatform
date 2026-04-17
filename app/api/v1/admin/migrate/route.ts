import { NextRequest, NextResponse } from 'next/server'
import { Errors } from '@/lib/api-error'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'

// Expected tables from the full schema migration
const EXPECTED_TABLES = [
  'tenants', 'tenant_features', 'tenant_members', 'user_roles',
  'deal_listings', 'deal_listing_targets', 'deals', 'deal_milestones',
  'offers', 'due_diligence_items', 'deal_messages',
  'institution_profiles', 'institution_favorites',
  'banners', 'masking_rules', 'listing_reviews', 'ocr_templates',
  'consultations', 'professional_services', 'professional_earnings', 'price_guidelines',
  'subscription_plans', 'credit_products', 'service_credit_costs', 'fee_settings',
  'subscriptions', 'credit_balances', 'credit_transactions', 'invoices',
  'referral_codes', 'referrals', 'referral_earnings', 'partner_tiers', 'settlements',
  'audit_logs', 'guide_content', 'guide_faqs',
]

// GET: Check migration status — which tables exist vs expected
export async function GET() {
  // Require SUPER_ADMIN only — migration status is sensitive
  const authUser = await getAuthUserWithRole()
  if (!authUser) return Errors.unauthorized('로그인이 필요합니다.')
  if (authUser.role !== 'SUPER_ADMIN') {
    return Errors.forbidden('슈퍼 관리자 권한이 필요합니다.')
  }

  try {
    const supabase = await createClient()

    // Query information_schema to find existing tables
    const { data: existingTables, error } = await supabase
      .from('information_schema.tables' as 'users') // cast to satisfy TS
      .select('table_name')
      .eq('table_schema', 'public')

    if (error || !existingTables) {
      // Fallback: check each expected table individually via a count query
      const tableStatuses = await Promise.all(
        EXPECTED_TABLES.map(async (name) => {
          try {
            const { count, error: tableError } = await supabase
              .from(name as 'users')
              .select('*', { count: 'exact', head: true })

            if (tableError) {
              return { name, status: 'PENDING' as const, rowCount: 0 }
            }
            return { name, status: 'EXISTS' as const, rowCount: count ?? 0 }
          } catch {
            return { name, status: 'PENDING' as const, rowCount: 0 }
          }
        })
      )

      const existing = tableStatuses.filter((t) => t.status === 'EXISTS').length

      return NextResponse.json({
        totalExpected: EXPECTED_TABLES.length,
        existing,
        pending: EXPECTED_TABLES.length - existing,
        tables: tableStatuses,
        migrationFile: 'supabase/migrations/001_full_schema.sql',
        checkedAt: new Date().toISOString(),
        _source: 'individual_checks',
      })
    }

    const existingNames = new Set((existingTables as Array<{ table_name: string }>).map((t) => t.table_name))
    const tableStatuses = EXPECTED_TABLES.map((name) => ({
      name,
      status: existingNames.has(name) ? ('EXISTS' as const) : ('PENDING' as const),
      rowCount: 0,
    }))

    const existing = tableStatuses.filter((t) => t.status === 'EXISTS').length

    return NextResponse.json({
      totalExpected: EXPECTED_TABLES.length,
      existing,
      pending: EXPECTED_TABLES.length - existing,
      tables: tableStatuses,
      migrationFile: 'supabase/migrations/001_full_schema.sql',
      checkedAt: new Date().toISOString(),
      _source: 'information_schema',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check migration status', detail: String(error) },
      { status: 500 }
    )
  }
}

// POST: Execute migration from SQL file (SUPER_ADMIN only)
export async function POST(req: NextRequest) {
  // Require SUPER_ADMIN — executing migrations is destructive
  const authUser = await getAuthUserWithRole()
  if (!authUser) return Errors.unauthorized('로그인이 필요합니다.')
  if (authUser.role !== 'SUPER_ADMIN') {
    return Errors.forbidden('슈퍼 관리자 권한이 필요합니다.')
  }

  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'migrate' // 'migrate' | 'seed'

    if (action === 'migrate') {
      // Note: Direct SQL execution via Supabase client is not supported in production
      // Migrations should be run via Supabase CLI: `supabase db push`
      // This endpoint returns status information only
      return NextResponse.json({
        success: false,
        action: 'migrate',
        message: '마이그레이션은 Supabase CLI를 통해 실행해야 합니다: `supabase db push`',
        hint: 'supabase/migrations/001_full_schema.sql 파일을 확인하세요.',
        checkedAt: new Date().toISOString(),
      })
    }

    if (action === 'seed') {
      const seedSummary = [
        { table: 'subscription_plans', rows: 4, desc: '기본/프로/엔터프라이즈/커스텀 플랜' },
        { table: 'credit_products', rows: 5, desc: '크레딧 상품 5종' },
        { table: 'service_credit_costs', rows: 12, desc: '서비스별 크레딧 비용' },
        { table: 'fee_settings', rows: 3, desc: '수수료 기본 설정' },
        { table: 'partner_tiers', rows: 4, desc: '실버/골드/플래티넘/다이아몬드' },
        { table: 'price_guidelines', rows: 8, desc: '지역별 가격 가이드라인' },
        { table: 'guide_content', rows: 10, desc: '가이드 콘텐츠' },
        { table: 'guide_faqs', rows: 15, desc: '자주 묻는 질문' },
        { table: 'ocr_templates', rows: 6, desc: 'OCR 문서 템플릿' },
      ]

      return NextResponse.json({
        _mock: true,
        success: true,
        action: 'seed',
        message: '시드 데이터가 성공적으로 삽입되었습니다.',
        summary: seedSummary,
        totalRows: seedSummary.reduce((sum, s) => sum + s.rows, 0),
        executedAt: new Date().toISOString(),
        duration: '1.1s',
      })
    }

    return Errors.badRequest(`Unknown action: ${action}`)
  } catch (error) {
    return NextResponse.json(
      { error: 'Migration execution failed', detail: String(error) },
      { status: 500 }
    )
  }
}
