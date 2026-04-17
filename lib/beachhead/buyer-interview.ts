// ─── 매수자 인터뷰 가이드 ───────────────────────────────────
// NPL 매수 의향자 10명 대상 구조화 인터뷰 스크립트.
// 목적: 핵심 페인포인트 도출 → 기능 우선순위 결정 → PMF 검증.

export interface InterviewQuestion {
  id: string
  phase: "ice-break" | "discovery" | "pain-point" | "solution" | "close"
  question: string
  probes: string[]          // 후속 질문
  scoreAxis?: string        // 연결되는 페인포인트 축
}

export interface PainPoint {
  id: string
  label: string
  description: string
  severity: 1 | 2 | 3 | 4 | 5
  frequency: "daily" | "weekly" | "monthly" | "per-deal"
  currentWorkaround: string
  nplatformSolution: string
}

export interface InterviewRecord {
  intervieweeId: string
  role: "individual" | "amc" | "institution" | "fund-manager"
  experience_years: number
  annual_deal_count: number
  date: string
  responses: {
    questionId: string
    answer: string
    painRating?: number        // 1~5
    quote?: string             // 인용 가능 발언
  }[]
  topPainPoints: string[]       // PainPoint.id 순서대로
}

// ─── 인터뷰 스크립트 (5단계 × 총 25문항) ─────────────────
export const INTERVIEW_SCRIPT: InterviewQuestion[] = [
  // Phase 1: Ice-break (5분)
  { id: "IB-01", phase: "ice-break", question: "NPL 투자를 시작하게 된 계기가 무엇인가요?", probes: ["몇 년 전?", "첫 거래 기억나시나요?"] },
  { id: "IB-02", phase: "ice-break", question: "최근 한 달간 검토하신 물건이 몇 건 정도 되나요?", probes: ["주로 어디서 물건을 발굴하시나요?"], scoreAxis: "deal-sourcing" },
  { id: "IB-03", phase: "ice-break", question: "현재 NPL 투자에 가장 많은 시간을 쓰는 단계는 무엇인가요?", probes: ["그 단계에서 어떤 툴을 쓰시나요?"], scoreAxis: "time-sink" },

  // Phase 2: Discovery (10분)
  { id: "DI-01", phase: "discovery", question: "물건 발굴부터 낙찰까지 전체 과정을 설명해 주세요.", probes: ["각 단계에서 누구와 협업하시나요?", "정보 수집에 가장 시간이 오래 걸리는 부분은?"], scoreAxis: "workflow" },
  { id: "DI-02", phase: "discovery", question: "권리분석 시 가장 까다로운 점은 무엇인가요?", probes: ["등기부등본 해석?", "대항력 판단?", "외부 전문가 의뢰 빈도?"], scoreAxis: "rights-analysis" },
  { id: "DI-03", phase: "discovery", question: "시세 비교/감정 과정은 어떻게 하시나요?", probes: ["어떤 데이터 소스를 신뢰하시나요?", "정확도에 만족하시나요?"], scoreAxis: "valuation" },
  { id: "DI-04", phase: "discovery", question: "입찰가를 결정할 때 가장 고민되는 요소는?", probes: ["몇 회차 유찰이 적정?", "경쟁자 파악 방법?"], scoreAxis: "bid-decision" },
  { id: "DI-05", phase: "discovery", question: "계약 체결에서 가장 신경 쓰이는 리스크는?", probes: ["사기/부실 정보?", "서류 위변조?"], scoreAxis: "contract-risk" },

  // Phase 3: Pain-point deep dive (15분)
  { id: "PP-01", phase: "pain-point", question: "현재 투자 과정에서 가장 불편하거나 비효율적인 부분 3가지를 꼽으면?", probes: ["1번부터 5점 척도로?"], scoreAxis: "top-pains" },
  { id: "PP-02", phase: "pain-point", question: "물건 정보를 한 곳에서 비교하기 어렵다는 점은 얼마나 심각한가요? (1~5)", probes: ["현재 몇 개 사이트를 돌아다니시나요?", "월 몇 시간?"], scoreAxis: "fragmentation" },
  { id: "PP-03", phase: "pain-point", question: "신뢰할 수 있는 거래 상대방을 찾기 어렵다는 점은? (1~5)", probes: ["과거 거래 사고 경험?", "KYC 부재의 문제?"], scoreAxis: "counterparty-trust" },
  { id: "PP-04", phase: "pain-point", question: "에스크로/안전결제 없이 직접 송금하는 것에 대한 불안감은? (1~5)", probes: ["현재 어떤 결제 방식?", "사기 피해 사례 들으신 적?"], scoreAxis: "payment-safety" },
  { id: "PP-05", phase: "pain-point", question: "AI가 권리분석/시세분석을 자동으로 해준다면 얼마나 유용할까요? (1~5)", probes: ["어떤 수준의 정확도가 필요?", "최종 결정은 본인이?"], scoreAxis: "ai-analysis" },
  { id: "PP-06", phase: "pain-point", question: "동일 물건에 대해 다른 투자자의 관심도/경쟁 상황을 알 수 있다면? (1~5)", probes: ["현재 경쟁자 파악 방법은?"], scoreAxis: "competition-intel" },
  { id: "PP-07", phase: "pain-point", question: "NDA/LOI 같은 계약서 작성·관리를 플랫폼이 해준다면? (1~5)", probes: ["현재 법무사/변호사 비용?"], scoreAxis: "contract-automation" },

  // Phase 4: Solution validation (10분)
  { id: "SV-01", phase: "solution", question: "이런 기능이 있다면 유료로 이용하실 의향이 있으시나요?", probes: ["월 얼마까지?", "건당 과금 선호? 구독 선호?"], scoreAxis: "willingness-to-pay" },
  { id: "SV-02", phase: "solution", question: "NPLatform 같은 플랫폼이 가장 먼저 해결해줬으면 하는 것 하나만 꼽으면?", probes: ["그 이유는?"], scoreAxis: "must-have" },
  { id: "SV-03", phase: "solution", question: "현재 사용 중인 도구/서비스 중 가장 마음에 드는 것은?", probes: ["어떤 점이 좋은가요?", "부족한 점은?"], scoreAxis: "competitive-landscape" },
  { id: "SV-04", phase: "solution", question: "전문투자자 인증(KYC)을 거쳐야 고급 물건을 볼 수 있다면 동의하시나요?", probes: ["어느 수준의 인증이 합리적?"], scoreAxis: "tier-acceptance" },
  { id: "SV-05", phase: "solution", question: "다른 투자자와 공동투자 기능이 있다면 관심 있으시나요?", probes: ["최소 투자금 기준?", "신뢰 기준?"], scoreAxis: "co-invest" },

  // Phase 5: Close (5분)
  { id: "CL-01", phase: "close", question: "혹시 제가 놓친 중요한 문제가 있을까요?", probes: [] },
  { id: "CL-02", phase: "close", question: "주변에 NPL 투자하시는 분 중 인터뷰 가능한 분이 계실까요?", probes: ["소개 가능?"] },
  { id: "CL-03", phase: "close", question: "베타 출시 시 초기 사용자로 참여하실 의향이 있으시나요?", probes: ["이메일?", "카카오톡?"] },
]

// ─── 핵심 페인포인트 맵 ───────────────────────────────────
export const PAIN_POINT_MAP: PainPoint[] = [
  {
    id: "PP-FRAG",
    label: "정보 분산",
    description: "법원경매 사이트, 등기소, 국토부 실거래가, 개별 AMC 사이트 등 5개 이상 플랫폼을 돌아다녀야 물건 하나를 분석할 수 있음",
    severity: 5,
    frequency: "per-deal",
    currentWorkaround: "엑셀 수동 취합, 북마크 폴더, 카톡방 공유",
    nplatformSolution: "통합 거래소 + AI 자동 수집 (court_auction_listings + deal_listings)",
  },
  {
    id: "PP-RIGHTS",
    label: "권리분석 난이도",
    description: "등기부 해석, 선순위/후순위 정리, 대항력 판단에 전문 지식 필요. 법무사 의뢰 시 건당 30~50만원",
    severity: 4,
    frequency: "per-deal",
    currentWorkaround: "법무사 의뢰 또는 경험 기반 수동 판단",
    nplatformSolution: "AI 권리분석 (lib/ai/rights-analysis.ts) — 10가지 권리유형 자동 파싱 + 5개 리스크 발견",
  },
  {
    id: "PP-VALUATION",
    label: "시세 파악 불확실성",
    description: "경매 물건의 적정가를 판단하기 어려움. 실거래가/감정가/낙찰가율 간 괴리가 크고 지역/물건별 차이가 큼",
    severity: 4,
    frequency: "per-deal",
    currentWorkaround: "과거 낙찰 사례 수동 비교, 부동산 중개인 문의",
    nplatformSolution: "AI 시세분석 (lib/ai/market-comps.ts) — IQR trimmed mean + 95% CI + 17개 광역시도 drift",
  },
  {
    id: "PP-TRUST",
    label: "거래 상대방 신뢰",
    description: "매도자(AMC/개인)의 신원/재무 상태를 확인할 방법이 부재. 사기/부실매물 위험",
    severity: 5,
    frequency: "per-deal",
    currentWorkaround: "인맥 기반 평판 확인, 현장 실사",
    nplatformSolution: "PASS 본인인증 + KYB 사업자 검증 + L0~L3 티어 신뢰 등급",
  },
  {
    id: "PP-PAYMENT",
    label: "결제 안전성",
    description: "수천만~수억원 직접 송금. 에스크로 없이 상호 신뢰에만 의존. 중간 사기 위험",
    severity: 5,
    frequency: "per-deal",
    currentWorkaround: "법무사 계좌 이용 또는 직접 대면 거래",
    nplatformSolution: "토스페이먼츠 에스크로 (lib/payments/escrow.ts) — 마일스톤 기반 분할 지급 + 7일 쿨링오프",
  },
  {
    id: "PP-CONTRACT",
    label: "계약 관리 수작업",
    description: "NDA/LOI/매매계약서를 매 건 수작업. 누락 조항, 불리한 조건 미발견 리스크",
    severity: 3,
    frequency: "per-deal",
    currentWorkaround: "이전 계약서 복사-붙여넣기, 변호사 검토",
    nplatformSolution: "AI 계약서 생성 (lib/ai/contract-generator.ts) — 4개 템플릿 + 리스크 조항 자동 주입",
  },
  {
    id: "PP-COMPETITION",
    label: "경쟁 정보 부재",
    description: "동일 물건에 얼마나 많은 투자자가 관심을 보이는지 파악 불가. 과열/저평가 판단 어려움",
    severity: 3,
    frequency: "weekly",
    currentWorkaround: "경매장 현장 관찰, 카톡방 정보",
    nplatformSolution: "관심 매물 카운터 + 독점딜 priority window (lib/lockin/exclusive-deal.ts)",
  },
  {
    id: "PP-LEARNING",
    label: "학습 곡선",
    description: "NPL 투자 진입 장벽이 높음. 용어/절차/법률 지식 부족으로 초보자 이탈률 높음",
    severity: 3,
    frequency: "daily",
    currentWorkaround: "유튜브, 카페, 유료 강의",
    nplatformSolution: "AI Copilot (lib/ai/copilot.ts) — 7개 KNOWLEDGE 항목 + 교육 콘텐츠 /services/learn",
  },
]

// ─── 인터뷰 분석 헬퍼 ─────────────────────────────────────
export function aggregatePainScores(records: InterviewRecord[]): {
  painId: string
  label: string
  avgSeverity: number
  mentionCount: number
}[] {
  const painScoreMap = new Map<string, number[]>()
  const mentionMap = new Map<string, number>()

  for (const record of records) {
    for (const ppId of record.topPainPoints) {
      mentionMap.set(ppId, (mentionMap.get(ppId) ?? 0) + 1)
    }
    for (const resp of record.responses) {
      if (resp.painRating != null) {
        const q = INTERVIEW_SCRIPT.find(q => q.id === resp.questionId)
        if (q?.scoreAxis) {
          const ppId = axisToPainId(q.scoreAxis)
          if (ppId) {
            if (!painScoreMap.has(ppId)) painScoreMap.set(ppId, [])
            painScoreMap.get(ppId)!.push(resp.painRating)
          }
        }
      }
    }
  }

  return PAIN_POINT_MAP.map(pp => {
    const scores = painScoreMap.get(pp.id) ?? []
    const avg = scores.length > 0
      ? scores.reduce((s, v) => s + v, 0) / scores.length
      : pp.severity
    return {
      painId: pp.id,
      label: pp.label,
      avgSeverity: +avg.toFixed(1),
      mentionCount: mentionMap.get(pp.id) ?? 0,
    }
  }).sort((a, b) => b.avgSeverity - a.avgSeverity)
}

function axisToPainId(axis: string): string | null {
  const map: Record<string, string> = {
    "fragmentation":       "PP-FRAG",
    "rights-analysis":     "PP-RIGHTS",
    "valuation":           "PP-VALUATION",
    "counterparty-trust":  "PP-TRUST",
    "payment-safety":      "PP-PAYMENT",
    "contract-automation": "PP-CONTRACT",
    "competition-intel":   "PP-COMPETITION",
    "ai-analysis":         "PP-RIGHTS",
  }
  return map[axis] ?? null
}
