// ─── PR 보도자료 + 매체 컨택 리스트 ─────────────────────────

export interface PressRelease {
  version: string
  date: string
  embargo?: string
  headline: string
  subHeadline: string
  body: string[]     // 단락별 배열
  boilerplate: string
  contact: {
    name: string
    title: string
    email: string
    phone: string
  }
}

export interface MediaContact {
  outlet: string
  beat: string
  reporter: string
  email: string
  notes: string
  priority: "A" | "B" | "C"
}

export const PRESS_RELEASE: PressRelease = {
  version: "1.0.0",
  date: "2026-04-15",
  headline: "NPLatform, 한국 최초 AI 기반 NPL 통합 거래 플랫폼 출시",
  subHeadline: "5만 건 매물 DB · AI 자동 분석 · 에스크로 안전결제를 하나의 플랫폼에서",
  body: [
    "NPLatform(대표 OOO)이 한국 최초의 AI 기반 부실채권(NPL) 통합 거래 플랫폼을 정식 출시했다고 밝혔다.",

    "NPLatform은 법원경매 35,000건과 NPL 직거래 매물 15,000건을 통합 제공하며, AI가 등기부등본 권리분석, 시세 비교, 입찰가 가이드, 계약서 자동 생성까지 수행한다. 기존에 4시간 이상 걸리던 매물 분석을 3분으로 단축하는 것이 핵심이다.",

    "플랫폼은 4단계 신뢰 티어(L0~L3)를 도입해 본인인증(PASS)과 사업자 검증(KYB)을 통과한 사용자에게만 상세 매물 정보를 단계적으로 개방한다. 이를 통해 거래 상대방 신원을 보증하면서도 유사수신행위 규제를 준수한다.",

    "결제 안전성을 위해 토스페이먼츠 에스크로 시스템을 도입했다. 채권양도통지서 발송(30%), 근저당이전 등기(50%), 인수확인서 수령(20%)의 3단계 마일스톤 기반 분할 지급과 7일 쿨링오프 기간을 적용해 수억원 규모의 NPL 거래에서도 안전한 결제를 보장한다.",

    "전자서명 시스템은 SHA-256 기반 체인 해시로 다자 계약의 위변조를 원천 차단하며, NDA(비밀유지계약)와 LOI(투자의향서) 표준 템플릿을 한국어·영어로 제공한다.",

    "OOO 대표는 '연간 10조원 규모의 NPL 시장이 여전히 오프라인과 인맥 중심으로 운영되고 있다. NPLatform은 정보 비대칭을 해소하고 투명한 거래 환경을 만들어 시장 참여자 모두의 효율성을 높이겠다'고 말했다.",

    "NPLatform은 현재 AMC(자산관리회사), 저축은행, 개인 NPL 투자자를 대상으로 베타 서비스를 운영 중이며, 2026년 하반기 정식 오픈을 목표로 하고 있다.",
  ],
  boilerplate: "NPLatform은 AI 기술을 활용한 한국 최초의 부실채권(NPL) 통합 거래 플랫폼이다. 법원경매와 NPL 직거래 매물의 검색·분석·거래·결제를 하나의 플랫폼에서 제공하며, 4단계 신뢰 시스템과 에스크로 결제로 안전한 거래 환경을 구축하고 있다.",
  contact: {
    name: "OOO",
    title: "대표이사",
    email: "press@nplatform.co.kr",
    phone: "02-0000-0000",
  },
}

export const MEDIA_CONTACTS: MediaContact[] = [
  // A등급 — 핀테크/금융 전문
  { outlet: "한국경제", beat: "핀테크·금융IT", reporter: "담당기자", email: "", notes: "핀테크 스타트업 보도 다수", priority: "A" },
  { outlet: "매일경제", beat: "부동산·금융", reporter: "담당기자", email: "", notes: "NPL 시장 기획기사 이력", priority: "A" },
  { outlet: "조선비즈", beat: "스타트업·IT", reporter: "담당기자", email: "", notes: "AI 서비스 집중 보도", priority: "A" },
  { outlet: "이데일리", beat: "금융·증권", reporter: "담당기자", email: "", notes: "저축은행 NPL 관련 보도 다수", priority: "A" },
  { outlet: "더벨", beat: "IB·구조화금융", reporter: "담당기자", email: "", notes: "NPL 딜 플로우 전문 매체", priority: "A" },

  // B등급 — IT/스타트업
  { outlet: "플래텀", beat: "스타트업", reporter: "담당기자", email: "", notes: "프롭테크 카테고리", priority: "B" },
  { outlet: "벤처스퀘어", beat: "스타트업·투자", reporter: "담당기자", email: "", notes: "펀딩 뉴스 중심", priority: "B" },
  { outlet: "블로터", beat: "IT·테크", reporter: "담당기자", email: "", notes: "AI 서비스 리뷰", priority: "B" },
  { outlet: "디지털데일리", beat: "금융IT", reporter: "담당기자", email: "", notes: "금융권 디지털전환 보도", priority: "B" },
  { outlet: "지디넷코리아", beat: "IT·AI", reporter: "담당기자", email: "", notes: "B2B SaaS 트렌드", priority: "B" },

  // C등급 — 부동산 전문
  { outlet: "한국부동산신문", beat: "부동산", reporter: "담당기자", email: "", notes: "경매/NPL 전문 섹션", priority: "C" },
  { outlet: "아시아경제", beat: "부동산·경제", reporter: "담당기자", email: "", notes: "부동산 특화 섹션", priority: "C" },
  { outlet: "머니투데이", beat: "금융·부동산", reporter: "담당기자", email: "", notes: "프롭테크 보도 이력", priority: "C" },
  { outlet: "서울경제", beat: "금융", reporter: "담당기자", email: "", notes: "금융 혁신 보도", priority: "C" },
  { outlet: "파이낸셜뉴스", beat: "금융·핀테크", reporter: "담당기자", email: "", notes: "핀테크 규제 이슈", priority: "C" },
]
