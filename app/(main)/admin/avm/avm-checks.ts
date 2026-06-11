/**
 * AVM 평가 응답 필드 체크리스트 (1차 개발계획 §3).
 *
 * gateway/scripts/smoke_v1.py 의 검정과 동일한 규칙 — 화면에서
 * 응답을 받을 때마다 실행해 카드별 합격/불합격 배지를 만든다.
 * 응답에 없는 필드는 조용히 숨기지 않고 MISSING으로 표시한다.
 */

export interface CheckResult {
  key: string
  name: string
  status: 'PASS' | 'FAIL' | 'MISSING'
  detail: string
}

type Obj = Record<string, any>

const fmt = (v: unknown) =>
  typeof v === 'number' ? v.toLocaleString('ko-KR') : String(v ?? 'null')

export function runAvmChecks(d: Obj | null | undefined): CheckResult[] {
  const out: CheckResult[] = []
  const push = (key: string, name: string, ok: boolean | null, detail: string) =>
    out.push({ key, name, status: ok === null ? 'MISSING' : ok ? 'PASS' : 'FAIL', detail })

  if (!d) return [{ key: 'root', name: '응답 본문', status: 'MISSING', detail: 'data 없음' }]

  push('status', 'status 값 유효',
    d.status ? ['AUTO_APPROVED_CANDIDATE', 'MANUAL_REVIEW_REQUIRED'].includes(d.status) : null,
    fmt(d.status))

  const mv = d.marketValue
  const est: number = mv?.estimatedValueKrw ?? 0
  push('estimated', 'marketValue.estimatedValueKrw > 0', mv ? est > 0 : null, fmt(est))

  const ws: Obj = mv?.weights ?? null
  const wsum = ws ? (Object.values(ws) as number[]).reduce((a, b) => a + b, 0) : 0
  push('weights', '방법별 가중치 합 ≈ 1.0', ws ? Math.abs(wsum - 1) < 0.01 : null,
    ws ? `합 ${wsum.toFixed(4)}: ${JSON.stringify(ws)}` : 'weights 없음')

  const ci = d.conformalInterval
  push('conformal-method', 'conformal method = SPLIT_CONFORMAL_RATIO',
    ci ? ci.method === 'SPLIT_CONFORMAL_RATIO' : null,
    ci ? `${ci.method} (coverage ${ci.coverage})` : 'conformalInterval 없음 — 미학습 버전이거나 재학습 필요')

  push('conformal-order', '예측구간 low < 추정가 < high',
    ci && est ? ci.lowValueKrw < est && est < ci.highValueKrw : null,
    ci ? `${fmt(ci.lowValueKrw)} < ${fmt(est)} < ${fmt(ci.highValueKrw)} (FSD ${ci.fsd})` : '—')

  const cg = d.confidenceGrade
  push('grade', '신뢰등급 A~E', cg ? 'ABCDE'.includes(cg.grade) : null,
    cg ? `${cg.grade} (FSD ${cg.fsd}) 강등: ${(cg.degradeReasons ?? []).join(', ') || '없음'}` : 'confidenceGrade 없음')

  if (cg && typeof cg.fsd === 'number' && !(cg.degradeReasons ?? []).length) {
    const f = cg.fsd
    const band = f <= 0.09 ? 'A' : f <= 0.14 ? 'B' : f <= 0.21 ? 'C' : f <= 0.30 ? 'D' : 'E'
    push('grade-band', 'FSD-등급 밴드 일치 (강등 없을 때)', cg.grade === band, `fsd=${f} → 기대 ${band}, 실제 ${cg.grade}`)
  }

  const ud = d.usageDecision
  push('usage', 'usageDecision 유효',
    ud ? ['AUTO_ACCEPT', 'REVIEW_REQUIRED', 'NOT_USABLE'].includes(ud.decision) : null,
    ud ? `${ud.purpose}: ${ud.decision}` : 'usageDecision 없음')

  const gr = d.guardrail
  push('guardrail', '가드레일 PASS/WARN/FATAL',
    gr ? ['PASS', 'WARN', 'FATAL'].includes(gr.overall) : null,
    gr ? `${gr.overall} ${(gr.flags ?? []).map((f: Obj) => f.code).join(', ')}` : 'guardrail 없음')

  if (gr?.overall === 'FATAL') {
    const stops: string[] = d.uncertainty?.stopReasons ?? []
    push('fatal-stop', 'FATAL 시 stopReasons 포함', stops.length > 0, stops.join(', ') || 'stopReasons 비어있음')
  }

  const pv: Obj = d.purposeValues ?? null
  const needed = ['MARKET', 'CONSERVATIVE', 'COLLATERAL', 'LIQUIDATION', 'INVESTMENT']
  push('purposes', '목적별 가치 5종', pv ? needed.every((k) => k in pv) : null,
    pv ? Object.keys(pv).join(', ') : 'purposeValues 없음')

  if (pv) {
    const v = (k: string) => pv[k]?.valueKrw ?? 0
    push('haircut', '헤어컷 순서 MARKET ≥ COLLATERAL ≥ LIQUIDATION',
      v('MARKET') >= v('COLLATERAL') && v('COLLATERAL') >= v('LIQUIDATION'),
      `${fmt(v('MARKET'))} ≥ ${fmt(v('COLLATERAL'))} ≥ ${fmt(v('LIQUIDATION'))}`)
  }

  const dq = d.dataQuality
  push('quality', 'dataQuality 0~100',
    dq ? dq.score >= 0 && dq.score <= 100 : null,
    dq ? `${dq.score}점 (${dq.grade})` : 'dataQuality 없음')

  const tp: Obj = d.coreResult?.taskPredictions ?? null
  push('tasks', 'taskPredictions (과제별 원시 예측)',
    tp ? 'SALE_MARKET_VALUE' in tp : null,
    tp ? Object.keys(tp).join(', ') : 'taskPredictions 없음 — AI 모델 미사용')

  push('hash', 'resultHash SHA-256 (64자)',
    d.resultHash ? String(d.resultHash).length === 64 : null,
    String(d.resultHash ?? 'null').slice(0, 16) + '…')

  push('vid', 'valuationId 존재', d.valuationId ? true : null, fmt(d.valuationId))

  return out
}
