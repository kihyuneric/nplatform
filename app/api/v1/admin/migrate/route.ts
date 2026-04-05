import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { readFile } from 'fs/promises'
import path from 'path'

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
  try {
    // In production, query information_schema.tables:
    // const { data } = await supabase
    //   .from('information_schema.tables')
    //   .select('table_name')
    //   .eq('table_schema', 'public')

    // Mock: return all tables as pending
    const tableStatus = EXPECTED_TABLES.map((name) => ({
      name,
      status: 'PENDING' as 'EXISTS' | 'PENDING',
      rowCount: 0,
    }))

    return NextResponse.json({
      _mock: true,
      totalExpected: EXPECTED_TABLES.length,
      existing: 0,
      pending: EXPECTED_TABLES.length,
      tables: tableStatus,
      migrationFile: 'supabase/migrations/001_full_schema.sql',
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check migration status', detail: String(error) },
      { status: 500 }
    )
  }
}

// POST: Execute migration from SQL file
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'migrate' // 'migrate' | 'seed'

    if (action === 'migrate') {
      // In production:
      // 1. Read supabase/migrations/001_full_schema.sql
      // 2. Split into statements and execute via supabase client
      // const sqlPath = path.join(process.cwd(), 'supabase/migrations/001_full_schema.sql')
      // const sql = await readFile(sqlPath, 'utf-8')
      // const statements = sql.split(';').filter(s => s.trim())
      // for (const stmt of statements) {
      //   await supabase.rpc('exec_sql', { sql: stmt })
      // }

      // Mock response
      return NextResponse.json({
        _mock: true,
        success: true,
        action: 'migrate',
        message: '마이그레이션이 성공적으로 완료되었습니다.',
        tablesCreated: EXPECTED_TABLES.length,
        tables: EXPECTED_TABLES,
        executedAt: new Date().toISOString(),
        duration: '2.4s',
      })
    }

    if (action === 'seed') {
      // Mock seed data insertion
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

    return Errors.badRequest('Unknown action: ${action}')
  } catch (error) {
    return NextResponse.json(
      { error: 'Migration execution failed', detail: String(error) },
      { status: 500 }
    )
  }
}
