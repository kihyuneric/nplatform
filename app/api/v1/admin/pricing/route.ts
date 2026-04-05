import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'pricing-config.json')

const DEFAULT_CONFIG = {
  plans: [
    { id: 1, name: 'Free', monthly: 0, annual: 0, credits: 10, features: '기본 검색, 뉴스 열람' },
    { id: 2, name: 'Starter', monthly: 29000, annual: 290000, credits: 100, features: '매물 열람, OCR 5건/월' },
    { id: 3, name: 'Professional', monthly: 99000, annual: 990000, credits: 500, features: 'NPL마켓, AI 분석, OCR 무제한' },
    { id: 4, name: 'Enterprise', monthly: 299000, annual: 2990000, credits: 2000, features: '전체 기능, 전담 매니저, API' },
  ],
  creditProducts: [
    { id: 1, name: '크레딧 50', credits: 50, price: 5000, bonus: 0 },
    { id: 2, name: '크레딧 200', credits: 200, price: 18000, bonus: 10 },
    { id: 3, name: '크레딧 500', credits: 500, price: 40000, bonus: 30 },
    { id: 4, name: '크레딧 1000', credits: 1000, price: 70000, bonus: 100 },
  ],
  serviceCredits: [
    { service: '매물 상세 열람', key: 'listing_view', credits: 5 },
    { service: 'OCR 분석 (1건)', key: 'ocr_scan', credits: 10 },
    { service: 'AI 가치평가', key: 'ai_valuation', credits: 20 },
    { service: '실사 보고서 요청', key: 'due_diligence', credits: 50 },
    { service: '계약서 생성', key: 'contract_gen', credits: 15 },
    { service: '시장 리포트', key: 'market_report', credits: 30 },
  ],
  fees: [
    { type: '거래 중개 수수료', key: 'brokerage', value: 2.5, valueType: 'PERCENT' },
    { type: '정산 수수료', key: 'settlement', value: 1000, valueType: 'FIXED' },
    { type: '전문가 매칭 수수료', key: 'expert_match', value: 10, valueType: 'PERCENT' },
    { type: '광고 수수료', key: 'advertising', value: 5, valueType: 'PERCENT' },
  ],
  updatedAt: new Date().toISOString(),
}

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG
}

function writeConfig(config: typeof DEFAULT_CONFIG) {
  try {
    const dir = path.dirname(CONFIG_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  } catch (e) {
    logger.error('Failed to write pricing config:', { error: e })
  }
}

export async function GET() {
  return NextResponse.json({ data: readConfig() }, {
    headers: { 'Cache-Control': 'no-store' }
  })
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const current = readConfig()
    const updated = { ...current, ...body, updatedAt: new Date().toISOString() }
    writeConfig(updated)
    return NextResponse.json({ success: true, data: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH)
    return NextResponse.json({ success: true, data: DEFAULT_CONFIG })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
