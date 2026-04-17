// ─── B2B 영업 자료 구조화 데이터 ────────────────────────────
// 1-pager 콘텐츠 + 데모 시나리오 + 타깃 고객 프로파일

export interface OnePager {
  headline: string
  subheadline: string
  problemStatements: string[]
  solutionPoints: { icon: string; title: string; description: string }[]
  keyMetrics: { value: string; label: string }[]
  targetAudience: string[]
  differentiators: string[]
  ctaText: string
  ctaLink: string
}

export interface DemoScenario {
  id: string
  title: string
  persona: string
  duration: string
  steps: { step: number; action: string; screen: string; talkingPoint: string }[]
  expectedOutcome: string
}

export interface TargetProfile {
  segment: string
  companySize: string
  decisionMaker: string
  painPoints: string[]
  budget: string
  dealCycle: string
  approachStrategy: string
}

// ─── 1-Pager ────────────────────────────────────────────
export const ONE_PAGER: OnePager = {
  headline: "NPLatform — 한국 최초 NPL 통합 거래 플랫폼",
  subheadline: "부실채권·부동산 매매의 전 과정을 하나의 플랫폼에서. AI 분석, 안전 결제, 전자서명까지.",
  problemStatements: [
    "NPL 매물 정보가 5개 이상 플랫폼에 분산 — 물건 하나 분석에 평균 4시간 소요",
    "거래 상대방 신원 확인 수단 부재 — 연간 100건+ 사기 피해 발생",
    "에스크로 없는 직접 송금 — 수억원 거래에서 결제 사고 위험",
    "권리분석·시세 파악에 전문 지식 필수 — 초보 투자자 진입 장벽",
  ],
  solutionPoints: [
    {
      icon: "Search",
      title: "통합 거래소",
      description: "법원경매 35,000+ 건 + NPL 직거래 15,000+ 건을 하나의 대시보드에서 검색·비교·필터링",
    },
    {
      icon: "Brain",
      title: "AI 자동 분석",
      description: "권리분석 10종 + 시세비교 + 입찰가 가이드 + 계약서 자동 생성. 분석 시간 4시간 → 3분",
    },
    {
      icon: "Shield",
      title: "신뢰 거래",
      description: "PASS 본인인증 + KYB 사업자 검증 + L0~L3 티어 시스템으로 거래 상대방 신원 보증",
    },
    {
      icon: "Lock",
      title: "안전 결제",
      description: "토스페이먼츠 에스크로 + 마일스톤 분할 지급 + 7일 쿨링오프. 수억원도 안전하게",
    },
    {
      icon: "FileSignature",
      title: "전자서명 계약",
      description: "NDA/LOI/매매계약서 전자서명. SHA-256 chain hash로 위변조 방지. 다자 동시 서명",
    },
    {
      icon: "TrendingUp",
      title: "시장 인텔리전스",
      description: "NBI 지수 일일 갱신 + 지역별 낙찰가율 트렌드 + AI 인사이트 알림",
    },
  ],
  keyMetrics: [
    { value: "50,000+", label: "매물 DB" },
    { value: "3분", label: "AI 분석 소요" },
    { value: "17개", label: "광역시도 커버" },
    { value: "15개", label: "금융기관 연동" },
    { value: "99.9%", label: "가동률 목표" },
    { value: "SOC 2", label: "보안 인증 예정" },
  ],
  targetAudience: [
    "AMC (자산관리회사) — 대량 NPL 매각/매수 채널",
    "저축은행·캐피탈 — 부실채권 정리 플랫폼",
    "개인 NPL 투자자 — 분석 도구 + 안전 거래",
    "법무법인 — 경매/NPL 관련 법률 서비스 제공",
    "부동산 펀드 — 실사/계약 자동화",
  ],
  differentiators: [
    "경매 + NPL 직거래 통합 — 국내 유일",
    "AI 권리분석 — 등기부 10종 권리 자동 파싱 (특허 출원 예정)",
    "4단계 신뢰 티어 (L0~L3) — 유사수신 방지 겸 사용자 보호",
    "에스크로 마일스톤 결제 — NPL 도메인 최적화",
    "전자서명 chain hash — 다자 계약의 위변조 완전 방지",
  ],
  ctaText: "파트너십 문의 / 데모 신청",
  ctaLink: "https://nplatform.co.kr/partner",
}

// ─── 데모 시나리오 3종 ──────────────────────────────────
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "DEMO-AMC",
    title: "AMC 대량 매각 시나리오",
    persona: "AMC NPL 매각 담당 팀장",
    duration: "15분",
    steps: [
      { step: 1, action: "거래소 대시보드 진입", screen: "/exchange", talkingPoint: "50,000건 DB에서 실시간 필터링. 지역·유형·가격대 즉시 검색." },
      { step: 2, action: "매물 등록 (벌크 업로드)", screen: "/my/seller", talkingPoint: "CSV/엑셀로 수백 건 일괄 등록. AI가 자동으로 등급 분류·시세 산정." },
      { step: 3, action: "매수자 관심도 확인", screen: "/deals", talkingPoint: "칸반 보드에서 NDA→LOI→실사→계약 진행 현황 한눈에 파악." },
      { step: 4, action: "에스크로 결제", screen: "/deals/[id]", talkingPoint: "마일스톤 기반: 채권양도통지 30% → 근저당이전 50% → 인수확인 20%." },
      { step: 5, action: "전자서명 체결", screen: "/deals/[id]/sign", talkingPoint: "NDA/LOI/매매계약 전자서명. 서명 즉시 chain hash로 무결성 보장." },
    ],
    expectedOutcome: "벌크 매각 프로세스 2주 → 3일 단축. 매수자 풀 확대.",
  },
  {
    id: "DEMO-INDIVIDUAL",
    title: "개인 투자자 첫 매물 분석 시나리오",
    persona: "NPL 투자 1년차 개인 투자자",
    duration: "10분",
    steps: [
      { step: 1, action: "법원경매 탐색", screen: "/auction", talkingPoint: "지도 기반 경매 매물 탐색. 지역·면적·감정가 필터." },
      { step: 2, action: "AI 분석 실행", screen: "/analysis/new", talkingPoint: "클릭 한 번으로 권리분석 + 시세 비교 + 입찰가 가이드. 3분 완료." },
      { step: 3, action: "분석 결과 확인", screen: "/analysis/[id]", talkingPoint: "리스크 등급 A~E, 예상 ROI, 선순위 채권 비율, 대항력 경고." },
      { step: 4, action: "AI Copilot 질문", screen: "/analysis/copilot", talkingPoint: "'이 물건 3회 유찰인데 4회차 적정가는?' → AI가 근거 제시." },
      { step: 5, action: "키워드 알림 설정", screen: "/my/notifications", talkingPoint: "'강남 아파트 3억 이하' 등록 → 조건 매칭 매물 실시간 알림." },
    ],
    expectedOutcome: "분석 시간 4시간 → 3분. 신뢰도 높은 투자 판단.",
  },
  {
    id: "DEMO-BANK",
    title: "저축은행 NPL 정리 시나리오",
    persona: "저축은행 여신관리부 차장",
    duration: "12분",
    steps: [
      { step: 1, action: "기관 회원 가입 (L3)", screen: "/my/verify", talkingPoint: "PASS 인증 + KYB 사업자 검증 → 즉시 L3 기관 등급." },
      { step: 2, action: "부실채권 패키지 등록", screen: "/my/seller", talkingPoint: "100건 일괄 등록. Visibility: VIP → L2 이상만 열람 가능." },
      { step: 3, action: "NBI 시장 인텔리전스", screen: "/analysis?tab=npi", talkingPoint: "NBI 지수로 지역별 매각 적기 판단. 지금 서울은 상승 추세." },
      { step: 4, action: "매수자 접근 관리", screen: "/deals", talkingPoint: "NDA 미체결 매수자에겐 마스킹 처리. 4단계 정보 개방." },
      { step: 5, action: "정산 보고서", screen: "/my/portfolio", talkingPoint: "체결 건별 정산 현황. 에스크로 마일스톤 진행률 실시간." },
    ],
    expectedOutcome: "NPL 정리 비용 40% 절감. 매각 소요 기간 3개월 → 3주.",
  },
]

// ─── 타깃 고객 프로파일 ─────────────────────────────────
export const TARGET_PROFILES: TargetProfile[] = [
  {
    segment: "AMC (자산관리회사)",
    companySize: "50~300명",
    decisionMaker: "대표이사 / NPL사업부장",
    painPoints: ["매수자 풀 제한", "수작업 매각 프로세스", "계약 관리 비효율"],
    budget: "월 200~500만원",
    dealCycle: "2~4주",
    approachStrategy: "AMC 협회 세미나 참석 → 1:1 데모 → 파일럿 10건 → 연간 계약",
  },
  {
    segment: "저축은행·캐피탈",
    companySize: "100~500명",
    decisionMaker: "여신관리부장 / CRO",
    painPoints: ["NPL 비율 관리 압박", "매각 채널 다변화 필요", "규제 보고 부담"],
    budget: "월 500~2,000만원",
    dealCycle: "4~8주 (내부 승인 포함)",
    approachStrategy: "금감원 공시 기반 NPL 비율 높은 기관 타겟 → CFO 레터 → 데모 → PoC",
  },
  {
    segment: "개인 NPL 투자자",
    companySize: "개인",
    decisionMaker: "본인",
    painPoints: ["정보 분산", "분석 시간", "사기 위험"],
    budget: "월 3~10만원 (크레딧)",
    dealCycle: "즉시 (프리미엄 전환 1~3일)",
    approachStrategy: "NPL 카페/유튜브 마케팅 → 무료 AI 분석 3건 → 유료 전환 → 월정액",
  },
  {
    segment: "법무법인·법무사",
    companySize: "3~30명",
    decisionMaker: "대표 법무사 / 파트너 변호사",
    painPoints: ["신규 의뢰 확보", "반복적 권리분석 업무", "고객 관리"],
    budget: "월 10~50만원",
    dealCycle: "1~2주",
    approachStrategy: "전문가 등록 (/services/experts) → 프로필 노출 → 의뢰 연결 수수료 모델",
  },
]
