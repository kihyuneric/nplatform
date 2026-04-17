// ─── 금융위원회 등록 체크리스트 ─────────────────────────────
// NPL 플랫폼 운영 시 검토해야 할 규제 분류 및 준수 항목.
// 법적 자문을 대체하지 않음 — 내부 검토 참고용.

export type RegStatus = "not-started" | "in-progress" | "completed" | "not-applicable"
export type RiskLevel = "critical" | "high" | "medium" | "low"

export interface ChecklistItem {
  id: string
  category: string
  title: string
  description: string
  legalBasis: string
  riskLevel: RiskLevel
  deadline?: string
  assignee?: string
  status: RegStatus
  notes: string
  dependencies: string[]  // 선행 필수 항목 id
}

export const REGULATORY_CHECKLIST: ChecklistItem[] = [
  // ─── 1. 사업 분류 ────────────────────────────────────
  {
    id: "REG-01",
    category: "사업 분류",
    title: "온라인투자연계금융업 해당 여부 판단",
    description: "NPL 중개 플랫폼이 온라인투자연계금융업법(P2P법) 적용 대상인지 판단. 투자자-차입자 연결 구조면 등록 필수.",
    legalBasis: "온라인투자연계금융업 및 이용자 보호에 관한 법률 제3조",
    riskLevel: "critical",
    status: "not-started",
    notes: "NPLatform은 '기존 NPL 매물의 매매 중개'이므로 신규 대출 연계가 아님 → P2P법 미적용 가능성 높으나 법률 자문 필수",
    dependencies: [],
  },
  {
    id: "REG-02",
    category: "사업 분류",
    title: "전자금융업 등록 필요 여부",
    description: "에스크로/결제 서비스 운영 시 전자금융업(전자지급결제대행/결제대금예치) 등록 의무 검토.",
    legalBasis: "전자금융거래법 제28조",
    riskLevel: "critical",
    status: "not-started",
    notes: "토스페이먼츠 PG사 위탁 시 자체 전자금융업 등록 불요 가능. PG사 계약서의 책임 분담 조항 확인 필요.",
    dependencies: [],
  },
  {
    id: "REG-03",
    category: "사업 분류",
    title: "유사수신행위 해당 여부",
    description: "공동투자 기능이 유사수신행위규제법 위반이 되지 않는지 검토. 원금/수익 보장 표현 금지.",
    legalBasis: "유사수신행위의 규제에 관한 법률 제2조",
    riskLevel: "critical",
    status: "not-started",
    notes: "공동투자 = 조합형/펀드형 구분. 투자 손실 가능성 명시 필수. '수익률 보장' 문구 절대 금지.",
    dependencies: [],
  },
  {
    id: "REG-04",
    category: "사업 분류",
    title: "투자중개업 등록 여부",
    description: "NPL 매물이 '증권'에 해당하면 자본시장법상 투자중개업 인가 필요. 채권 자체는 증권 미해당이나, 수익증권화 시 해당.",
    legalBasis: "자본시장과 금융투자업에 관한 법률 제6조, 제12조",
    riskLevel: "high",
    status: "not-started",
    notes: "NPL 원채권 직접 매매는 자본시장법 미적용. 수익증권·집합투자 구조 도입 시 재검토.",
    dependencies: [],
  },

  // ─── 2. 개인정보보호 ─────────────────────────────────
  {
    id: "REG-05",
    category: "개인정보보호",
    title: "개인정보 처리방침 작성 및 공시",
    description: "수집 항목, 목적, 보유 기간, 제3자 제공, 파기 절차 등을 명시한 처리방침 작성.",
    legalBasis: "개인정보 보호법 제30조",
    riskLevel: "high",
    status: "not-started",
    notes: "채무자 PII(이름, 주민번호, 주소) 포함 가능 → 민감정보 별도 동의 검토. lib/security/pii-masking.ts 9종 마스킹 구현 완료.",
    dependencies: [],
  },
  {
    id: "REG-06",
    category: "개인정보보호",
    title: "개인정보보호 책임자(CPO) 지정",
    description: "일정 규모 이상 개인정보 처리 시 CPO 지정 및 신고 의무.",
    legalBasis: "개인정보 보호법 제31조",
    riskLevel: "medium",
    status: "not-started",
    notes: "",
    dependencies: ["REG-05"],
  },
  {
    id: "REG-07",
    category: "개인정보보호",
    title: "개인정보 영향평가 실시",
    description: "민감정보·고유식별정보 5만건 이상 처리 시 영향평가 의무.",
    legalBasis: "개인정보 보호법 제33조",
    riskLevel: "medium",
    status: "not-started",
    notes: "5만건 시드 데이터에 가상 채무자 정보 포함 — 실서비스 전환 시 필수.",
    dependencies: ["REG-05"],
  },

  // ─── 3. 전자상거래 ────────────────────────────────────
  {
    id: "REG-08",
    category: "전자상거래",
    title: "통신판매업 신고",
    description: "온라인으로 유료 서비스(크레딧) 판매 시 통신판매업 신고 필수.",
    legalBasis: "전자상거래법 제12조",
    riskLevel: "high",
    status: "not-started",
    notes: "관할 구청 등록. 사업자등록증 + 구매안전서비스 이용확인증 필요.",
    dependencies: [],
  },
  {
    id: "REG-09",
    category: "전자상거래",
    title: "청약 철회/환불 정책 수립",
    description: "디지털 콘텐츠(크레딧, AI 분석 결과)의 환불 정책 수립. 7일 이내 청약 철회 원칙.",
    legalBasis: "전자상거래법 제17조",
    riskLevel: "medium",
    status: "not-started",
    notes: "크레딧 구매 후 사용 전이면 전액 환불, 사용 후 부분 환불 정책. lib/payments/toss.ts cancelPayment() 구현 완료.",
    dependencies: ["REG-08"],
  },

  // ─── 4. 자금세탁 방지 ─────────────────────────────────
  {
    id: "REG-10",
    category: "자금세탁방지",
    title: "고객확인(CDD) 절차 구축",
    description: "금융거래 시 고객 신원 확인 의무. PASS 본인인증 + KYB 사업자 검증으로 충족 가능.",
    legalBasis: "특정 금융거래정보의 보고 및 이용 등에 관한 법률 제5조의2",
    riskLevel: "high",
    status: "not-started",
    notes: "lib/auth/pass-verification.ts (CI/DI 해시) + lib/auth/kyb-verification.ts (사업자번호 검증) 구현 완료.",
    dependencies: [],
  },
  {
    id: "REG-11",
    category: "자금세탁방지",
    title: "의심거래보고(STR) 체계 수립",
    description: "비정상 거래 패턴 탐지 및 FIU 보고 체계 구축.",
    legalBasis: "특정금융거래정보법 제4조",
    riskLevel: "medium",
    status: "not-started",
    notes: "거래 금액 기준 (1천만원 이상 현금) 자동 보고. 에스크로 거래에서 패턴 이상 탐지 필요.",
    dependencies: ["REG-10"],
  },

  // ─── 5. 전자서명 / 전자문서 ───────────────────────────
  {
    id: "REG-12",
    category: "전자서명",
    title: "전자서명 법적 유효성 확보",
    description: "전자서명법 상 전자서명의 법적 효력 요건 충족 여부 확인. 서명자 본인 확인 + 내용 무결성.",
    legalBasis: "전자서명법 제3조",
    riskLevel: "high",
    status: "not-started",
    notes: "lib/payments/e-sign.ts — SHA-256 chain hash + CI 매칭으로 서명자 확인. 공인전자서명 수준은 아님 → 사서증서 효력.",
    dependencies: [],
  },

  // ─── 6. 플랫폼 운영 ──────────────────────────────────
  {
    id: "REG-13",
    category: "플랫폼 운영",
    title: "이용약관 작성 및 공시",
    description: "서비스 이용약관, 에스크로 약관, 크레딧 이용약관 등 작성.",
    legalBasis: "약관의 규제에 관한 법률 제3조",
    riskLevel: "high",
    status: "not-started",
    notes: "공정거래위원회 표준약관 참고. 불공정 조항 검토 필요.",
    dependencies: [],
  },
  {
    id: "REG-14",
    category: "플랫폼 운영",
    title: "분쟁 해결 절차 수립",
    description: "매수자-매도자 간 분쟁 중재 절차. 에스크로 분쟁, 하자 담보 책임 등.",
    legalBasis: "전자상거래법 제33조, 소비자기본법 제16조",
    riskLevel: "medium",
    status: "not-started",
    notes: "에스크로 동결(FROZEN) 상태에서의 분쟁 해결 프로세스 정의 필요.",
    dependencies: ["REG-13"],
  },
  {
    id: "REG-15",
    category: "플랫폼 운영",
    title: "정보보안 관리체계(ISMS) 인증 검토",
    description: "연매출 100억 이상 또는 이용자 100만 이상 시 ISMS 인증 의무. 사전 준비.",
    legalBasis: "정보통신망법 제47조",
    riskLevel: "low",
    status: "not-started",
    notes: "초기 단계에서는 의무 아니나, 금융 관련 서비스이므로 조기 준비 권장.",
    dependencies: [],
  },
]

// ─── 진행률 계산 ──────────────────────────────────────
export function getProgress(items: ChecklistItem[] = REGULATORY_CHECKLIST) {
  const total = items.filter(i => i.status !== "not-applicable").length
  const done = items.filter(i => i.status === "completed").length
  const inProgress = items.filter(i => i.status === "in-progress").length
  const critical = items.filter(i => i.riskLevel === "critical" && i.status !== "completed")
  return {
    total,
    done,
    inProgress,
    pct: total > 0 ? Math.round((done / total) * 100) : 0,
    criticalRemaining: critical.length,
    criticalItems: critical.map(i => i.id),
  }
}

export function getByCategory(items: ChecklistItem[] = REGULATORY_CHECKLIST) {
  const map = new Map<string, ChecklistItem[]>()
  for (const item of items) {
    if (!map.has(item.category)) map.set(item.category, [])
    map.get(item.category)!.push(item)
  }
  return map
}
