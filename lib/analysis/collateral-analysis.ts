/**
 * lib/analysis/collateral-analysis.ts
 *
 * 부동산 담보 가치 분석 유틸리티
 *
 * 1. buildCollateralAnalysisPrompt   — Claude API 연동 시 사용할 프롬프트 생성
 * 2. buildDeterministicCollateral    — API 키 없을 때의 사전 분석 결과 생성
 *
 * 사전 분석은 주소 파싱 → 권역 프로필 매핑 → 섹션별 markdown 조합으로 생성.
 * API 연동 후에는 buildCollateralAnalysisPrompt() 로 Claude 호출.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Prompt Builder (Claude API 연동용)
// ─────────────────────────────────────────────────────────────────────────────

export const COLLATERAL_SYSTEM_PROMPT = `당신은 대한민국 NPL(부실채권) 투자 전문 부동산 담보 가치 분석가입니다.
투자자와 LP에게 해당 부동산이 담보물로서 갖는 가치와 리스크를 전문적으로 분석합니다.

필수 규칙:
- 부동산 주소(번지, 지번 등 구체적 주소)는 절대 노출하지 마세요
- 행정구역(시·구·동 수준)만 위치 참조로 사용하세요
- 전문적이고 간결하게 작성하세요
- 실제 NPL 투자 관점(환가성·담보 안정성·개발잠재력)에서 분석하세요
- 한국어로 작성하세요`

export function buildCollateralAnalysisPrompt(
  address: string,
  assetTitle?: string,
): string {
  return `다음 부동산의 담보 가치를 NPL 투자 관점에서 분석해주세요.

분석 대상: ${address}${assetTitle ? `\n자산명: ${assetTitle}` : ''}

아래 구조로 분석해주세요. 주소는 절대 출력하지 마세요.

## 입지 특성 분석
- 위치적 가치 (행정구역명만 사용, 주소 노출 금지)
- 접근성 및 교통 인프라
- 주변 환경 및 생활 인프라
- 인근 주요 거점·랜드마크

## 개발 잠재력 및 규제 현황
- 용도지역·지구 현황 및 개발 가능성
- 규제 완화·도시계획 동향
- 개발 가능 방향 (1~3가지)

## 시장 포지셔닝 및 시세 흐름
- 해당 권역 유사 자산과의 비교 포지셔닝
- 주요 수요층 및 매수 주체
- 최근 가격 동향 (상승·보합·하락 여부)

## 담보로서의 핵심 가치 요인
- 환금성 (유동성·처분 용이성)
- 담보 안정성 (가치 하방 경직성)
- 특이 프리미엄 요인 (있을 경우)

## 주요 리스크 요인
- 리스크 항목 3~5가지 (핵심만)

## 종합 평가

| 항목 | 평가 |
|------|------|
| 입지 희소성 | |
| 환금성 | |
| 담보 안정성 | |
| 개발 잠재력 | |
| 단기 유동성 | |
| 장기 자산가치 | |

**한 줄 결론**: 이 자산의 담보 가치 핵심을 한 문장으로 정리해주세요.`
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Region Profile (권역별 특성 데이터)
// ─────────────────────────────────────────────────────────────────────────────

interface RegionProfile {
  tier: 'premium' | 'upper' | 'mid' | 'outer'
  type: ('residential' | 'commercial' | 'mixed' | 'industrial' | 'natural')[]
  accessibility: string
  infrastructure: string
  market: string
  demand: string
  risk: string[]
  premium: string
  development: string
  liquidity: 'high' | 'medium' | 'low'
  priceStability: 'high' | 'medium' | 'low'
}

const REGION_PROFILES: Record<string, RegionProfile> = {
  // ── 강남권 ──
  '강남구': {
    tier: 'premium', type: ['commercial', 'residential'],
    accessibility: '지하철 2·3·9호선 및 분당선이 교차하는 서울 최고 교통 결절점. 강남대로·테헤란로 대중교통 접근성 최상급.',
    infrastructure: '대형 쇼핑몰·병원·학원가 밀집. COEX, 삼성서울병원, 영동대로 GTX-A 예정. 생활 편의 인프라 전국 최상위.',
    market: '서울 상업용 부동산 시세 최상위권. 공실률 낮고 임대료 상승 기조 유지. 아파트 전용 84㎡ 기준 20~40억 내외.',
    demand: '국내외 기관 투자자·법인·고액 자산가. UHNWI 실수요 강함. 경매 낙찰경쟁률 전국 최고 수준.',
    risk: ['높은 초기 매입 단가로 소액 투자자 진입 어려움', '금리 상승기 임차 수요 일시적 둔화 가능', '재건축 규제로 대단지 아파트 사업성 제한'],
    premium: '코리아프리미엄 핵심 권역 — 글로벌 투자자 선호 1순위. 법원경매 낙찰가율 90~110% 상회 사례 빈번.',
    development: '도시개발·대형 오피스·프리미엄 레지던스 방향 유효. GTX-A 개통 후 역세권 가치 추가 상승 기대.',
    liquidity: 'high', priceStability: 'high',
  },
  '서초구': {
    tier: 'premium', type: ['residential', 'commercial'],
    accessibility: '지하철 2·3·4·9호선 및 신분당선 경유. 양재IC·반포대교 등 자동차 접근성도 우수.',
    infrastructure: '법조타운(대법원·검찰청·법원), 예술의전당, 양재AI시티. 교육 인프라(반포·방배 학군) 강남구와 동급.',
    market: '반포·잠원 재건축 사업 활발. 한강변 프리미엄 자산 시세 40~70억대. 상업지 임대 공실 낮음.',
    demand: '법조·의료·IT 전문직 실거주 수요 강함. 재건축 투자 수요 지속적.',
    risk: ['재건축 인·허가 지연 가능성', '한강변 경관 규제로 층수 제한', '재건축 이주 수요로 임대료 단기 과열 후 조정 가능'],
    premium: '반포·잠원 한강뷰 자산 희소성 극상. 서울 최고 교육환경·법조 특수 수요.',
    development: '한강변 재건축·주거복합 개발. 양재 R&D 특구 수혜 상업지.',
    liquidity: 'high', priceStability: 'high',
  },
  '송파구': {
    tier: 'premium', type: ['residential', 'commercial'],
    accessibility: '지하철 2·5·8·9호선·위례신사선(예정) 다수 역세권. 올림픽대로·잠실대교 차량 접근 양호.',
    infrastructure: '롯데타운(잠실점·타워), 잠실종합운동장, 가락시장, 위례신도시. 대규모 상권·문화시설 집적.',
    market: '잠실 재건축 사업 본격화 기대감. 아파트 30억 이상 단지 다수. 상업용 임대 수요 안정.',
    demand: '잠실 재건축 수혜 기대 실수요·투자 수요 혼재. 대단지 생활권 선호 가족 수요.',
    risk: ['잠실 재건축 일정 지연 리스크', '동남권 광역 교통 포화', '신규 공급 증가 시 가격 조정 가능'],
    premium: '잠실 재건축 기대 프리미엄 + 한강 접근성. 올림픽공원·롯데타워 인접 랜드마크 효과.',
    development: '대규모 재건축·복합 개발. MICE 거점 개발 수혜.',
    liquidity: 'high', priceStability: 'high',
  },
  '용산구': {
    tier: 'premium', type: ['mixed', 'residential'],
    accessibility: '지하철 1·4·6호선·경의중앙선·경부선 KTX 연계. 용산역 GTX-B 개통 예정.',
    infrastructure: '국제업무지구(용산공원 조성 추진), 이태원 글로벌 상권, 한강공원 인접. 국방부 이전 후 개발 기대.',
    market: '한남동·이태원 고급 주거·상업지 시세 상위권. 용산정비창 개발로 중장기 가치 급등 기대.',
    demand: '외국인·글로벌 기업·UHNWI 수요. 한남동 리버뷰 초고가 자산 선호.',
    risk: ['용산 개발 사업 장기화 리스크', '이태원 상권 트렌드 민감도', '한강뷰 자산 고단가로 환금성 일부 제한'],
    premium: '용산공원 개발 + GTX-B 수혜. 서울 최대 개발 잠재력 권역.',
    development: '국제업무지구·한강변 초고층 복합개발 수혜.',
    liquidity: 'high', priceStability: 'high',
  },
  // ── 종로·중구권 ──
  '종로구': {
    tier: 'upper', type: ['mixed', 'residential', 'natural'],
    accessibility: '지하철 1·3·5호선 경유. 광화문·종각 CBD 접근 10~20분. 일부 북측 지역(구기동·홍지동·평창동)은 버스 의존도 높음.',
    infrastructure: '광화문 CBD·청와대(개방 후 관광지화) 인접. 경복궁·창덕궁 문화자산. 북한산국립공원 생태 프리미엄.',
    market: '평창동·부암동 고급 저층주거 시세 3.3㎡당 3,000~8,000만원. CBD 접근 주거·상업 수요 안정적. 북측 고급주거권역 희소성 높음.',
    demand: '고액 자산가·문화예술계 실수요. 현금 부자 수요 중심 "컬렉터형 부동산" 시장.',
    risk: ['북한산 고도지구 규제 (완화 추세이나 불확실성 존재)', '경사 지형·토목비 과다', '지하철 접근성 취약 (북측 지역)', '거래량 희박 — 환금성 제한'],
    premium: '고도규제 완화 기대 프리미엄. 북한산 조망·녹지·프라이버시 희소가치. 종로·광화문 CBD 접근 가능한 자연환경.',
    development: '고급 저층주거(타운하우스·프라이빗 레지던스)·문화복합시설. 대단지 아파트 사업성은 제한적.',
    liquidity: 'low', priceStability: 'high',
  },
  '중구': {
    tier: 'upper', type: ['commercial', 'mixed'],
    accessibility: '지하철 1·2·4호선·경의중앙선·공항철도. 서울역 KTX·GTX 허브.',
    infrastructure: '명동 상권, 을지로 재개발, 남대문시장. 서울시청·대형 호텔 밀집.',
    market: '명동 상업지 임대료 전국 최고. 을지로 재개발로 오피스 신규 공급 증가. 주거 수요 제한.',
    demand: '글로벌 유통·호텔·오피스 법인 수요. 관광·상업 수요 중심.',
    risk: ['관광 수요 변동성', '을지로 재개발 이주 혼란', '주거 수요 약함'],
    premium: '명동·서울역 랜드마크 프리미엄. 외국인 관광 인프라 수혜.',
    development: '오피스·호텔·복합쇼핑 개발.',
    liquidity: 'medium', priceStability: 'high',
  },
  // ── 마포·서대문·은평권 ──
  '마포구': {
    tier: 'upper', type: ['mixed', 'residential', 'commercial'],
    accessibility: '지하철 2·5·6호선·경의중앙선·공항철도. 홍대입구역 초역세권 상권.',
    infrastructure: '홍대·합정·상수 문화상권. 공덕 오피스 클러스터. 한강공원(망원·합정) 접근.',
    market: '아파트 시세 중상위권. 홍대 상권 임대료 급등세. 도화·아현 재개발 진행.',
    demand: 'MZ세대·크리에이티브 업종 임차 수요. 출판·미디어 기업 오피스 수요.',
    risk: ['홍대 상권 트렌드 민감도', '재개발 지연 가능성', '임대료 상승으로 임차인 이탈 우려'],
    premium: '홍대 문화 프리미엄. 한강 접근 + 신촌·공덕 업무지구 연계.',
    development: '오피스·주거복합·문화시설. 아현·도화 재개발 수혜.',
    liquidity: 'medium', priceStability: 'medium',
  },
  '서대문구': {
    tier: 'mid', type: ['residential', 'mixed'],
    accessibility: '지하철 2·3·5호선. 신촌역·이대역 상권. 홍은·홍제·연희 생활권.',
    infrastructure: '연세대·이화여대 대학가. 신촌 상권. 은평구·마포구 생활권 연결.',
    market: '연희동·홍은동 단독주택·빌라 거래 활발. 대학가 임대 수요 안정적.',
    demand: '대학가 임차 수요. 연희동 단독주택 리모델링 수요.',
    risk: ['대형 상권 부족', '대학 인구 감소 리스크', '노후 주거지 정비 느림'],
    premium: '대학가 프리미엄. 연희동 단독주택 고급화 트렌드.',
    development: '단독주택 고급 리모델링·소형 주거복합.',
    liquidity: 'medium', priceStability: 'medium',
  },
  // ── 강북·도봉·노원권 ──
  '강북구': {
    tier: 'mid', type: ['residential'],
    accessibility: '지하철 4호선(수유·미아·쌍문). 버스 위주 광역 이동. 도심 접근 30~40분.',
    infrastructure: '북한산 생태 프리미엄. 수유리 상권. 4·19민주묘지 인근.',
    market: '서울 내 중저가 주거 시장. 아파트 시세 6~12억대. 임대 수요 안정.',
    demand: '실거주 중산층 수요 중심. 투자 수요 제한적.',
    risk: ['도심 접근성 취약', '노후 단독주택 밀집 — 개발 불확실성', '인구 감소 추세'],
    premium: '북한산 생태 프리미엄. 저평가 구역 대비 임대 수익률 상대적 양호.',
    development: '소규모 재건축·가로주택정비. 뉴타운 사업 일부 진행.',
    liquidity: 'low', priceStability: 'medium',
  },
  // ── 성북·동대문·중랑권 ──
  '성북구': {
    tier: 'upper', type: ['residential', 'mixed'],
    accessibility: '지하철 1·4호선·우이신설선. 성신여대·한성대입구 역세권.',
    infrastructure: '성북동 고급 단독주택지. 길음·장위 뉴타운. 고려대·국민대 대학가.',
    market: '성북동 고급 저층주거 시세 강세. 뉴타운 재개발 사업지 투자 수요 활발.',
    demand: '성북동 고급주거 실수요. 뉴타운 투자 수요.',
    risk: ['뉴타운 사업 지연', '성북동 일부 문화재 보호구역 규제', '상권 규모 제한'],
    premium: '성북동 고급 단독주택 프리미엄. 뉴타운 개발 기대 수혜.',
    development: '고급 단독주택 리모델링·복합주거 개발. 뉴타운 정비사업.',
    liquidity: 'medium', priceStability: 'medium',
  },
  // ── 영등포·동작·관악권 ──
  '영등포구': {
    tier: 'upper', type: ['commercial', 'mixed'],
    accessibility: '지하철 1·2·5·9호선·경의중앙선·공항철도. 영등포역 KTX 연계.',
    infrastructure: '여의도 금융·업무 클러스터. 타임스퀘어·IFC몰 대형 상권. 영등포 재개발.',
    market: '여의도 오피스 임대료 강세. 영등포 뉴타운 활발. 아파트 시세 중상위.',
    demand: '금융·증권·방송 법인 임차 수요. 여의도 직주근접 수요.',
    risk: ['여의도 공급 과잉 우려', '영등포 재개발 기간 중 불확실성', '주거·상업 혼재로 환경 편차'],
    premium: '여의도 금융허브 프리미엄. 한강·공원 접근.',
    development: '오피스·금융·복합개발. 영등포 재개발 수혜.',
    liquidity: 'high', priceStability: 'high',
  },
  // ── 경기도 주요 도시 ──
  '성남시': {
    tier: 'premium', type: ['commercial', 'residential'],
    accessibility: '지하철 8호선·분당선·신분당선·경강선. 판교 테크노밸리 직결.',
    infrastructure: '판교 IT클러스터(카카오·네이버·카카오뱅크). 성남의료원·분당서울대병원.',
    market: '판교·분당 주거·오피스 시세 강남급. 테크 기업 수요 지속.',
    demand: 'IT·바이오 기업 임차 수요. 강남 대체 주거 실수요.',
    risk: ['판교 오피스 공급 증가', '금리 상승기 임대료 조정 가능', '교통 혼잡'],
    premium: '판교 테크 허브 프리미엄. 강남 대체 주거·업무 수요.',
    development: '제2판교 테크노밸리. 분당 재건축.',
    liquidity: 'high', priceStability: 'high',
  },
  '수원시': {
    tier: 'mid', type: ['commercial', 'residential', 'industrial'],
    accessibility: '수도권 광역급행철도(GTX-C 예정). 1호선·분당선. 경부고속도로.',
    infrastructure: '삼성전자 본사 소재지. 광교신도시·영통 대형 상권. 아주대·성균관대.',
    market: '광교 신도시 아파트 시세 강세. 삼성 임직원 임대 수요. 상업지 안정적.',
    demand: '삼성 협력사 임직원·기업 수요. 경기 남부 실거주 수요.',
    risk: ['삼성 경기 변동 연동', '수원역 인근 노후 상권', 'GTX 지연 시 교통 개선 한계'],
    premium: '삼성 클러스터 수혜. 광교 신도시 브랜드.',
    development: '첨단산업 복합단지. 광교 2지구.',
    liquidity: 'medium', priceStability: 'medium',
  },
}

// 기본 프로필 (데이터 없는 지역)
const DEFAULT_PROFILE: RegionProfile = {
  tier: 'mid', type: ['mixed'],
  accessibility: '대중교통 및 도로망 접근 가능. 광역 이동은 환승 필요.',
  infrastructure: '기본 생활 인프라 갖춤. 대형 상권·의료·교육 인프라 상위권 수준.',
  market: '해당 권역 평균 시세 수준. 지역 실거주 수요 중심 시장.',
  demand: '지역 실거주 및 임대 수요 중심. 투자 수요는 제한적.',
  risk: ['거래 유동성 제한', '인근 신규 공급 리스크', '광역 교통 접근성 개선 여부 불확실'],
  premium: '지역 내 상대적 희소 입지로 프리미엄 형성 가능.',
  development: '지역 수요 맞춤형 주거·상업 개발.',
  liquidity: 'medium', priceStability: 'medium',
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 주소 파싱
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedAddress {
  sido: string
  sigungu: string
  dong: string
  full: string
}

export function parseKoreanAddress(address: string): ParsedAddress {
  const clean = address
    .replace(/\s+/g, ' ')
    .replace(/\(.*?\)/g, '')   // 괄호 제거 (가상, 샘플 등)
    .replace(/외\s*\d+필지.*/g, '')  // "외 7필지" 제거
    .trim()

  const parts = clean.split(/\s+/)

  return {
    sido:    parts[0] || '',
    sigungu: parts[1] || '',
    dong:    parts[2] || '',
    full:    clean,
  }
}

function getProfile(sigungu: string): RegionProfile {
  // 직접 매칭
  if (REGION_PROFILES[sigungu]) return REGION_PROFILES[sigungu]

  // 광역시 구 (예: 부산진구, 해운대구)
  if (sigungu.endsWith('구') || sigungu.endsWith('군')) {
    // 부산
    if (['해운대구', '수영구', '남구'].includes(sigungu)) {
      return { ...DEFAULT_PROFILE, tier: 'upper', liquidity: 'medium', premium: '해운대·광안리 해양 프리미엄. 부산 최상위 주거권역.', development: '해운대 관광·주거복합 개발.' }
    }
  }

  return DEFAULT_PROFILE
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 결정적(Deterministic) 분석 생성
// ─────────────────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<RegionProfile['tier'], string> = {
  premium: '최상급 (프리미엄)',
  upper:   '상위권',
  mid:     '중위권',
  outer:   '외곽',
}

const LIQUIDITY_LABELS: Record<RegionProfile['liquidity'], string> = {
  high:   '높음 — 수요층 두텁고 환금성 우수',
  medium: '보통 — 시장 상황에 따라 유동적',
  low:    '낮음 — 희소 매물로 처분에 시간 소요',
}

const STABILITY_LABELS: Record<RegionProfile['priceStability'], string> = {
  high:   '안정 — 하방 경직성 강함',
  medium: '보통 — 시장 사이클 영향 받음',
  low:    '변동 가능성 — 수요층 제한',
}

export function buildDeterministicCollateral(
  address: string,
  assetTitle?: string,
): string {
  const parsed = parseKoreanAddress(address)
  const profile = getProfile(parsed.sigungu)

  const locationRef = [parsed.sigungu, parsed.dong].filter(Boolean).join(' ')
  const title = assetTitle ? ` (${assetTitle})` : ''

  const sections: string[] = []

  // ── 1. 입지 특성 분석 ──
  sections.push(`## 입지 특성 분석

- **권역 위상**: ${locationRef} 일대는 ${TIER_LABELS[profile.tier]} 권역으로 평가됩니다${title}.
- **교통·접근성**: ${profile.accessibility}
- **생활 인프라**: ${profile.infrastructure}
- **입지 희소성**: ${profile.premium}`)

  // ── 2. 개발 잠재력 및 규제 현황 ──
  sections.push(`## 개발 잠재력 및 규제 현황

- **개발 방향**: ${profile.development}
- **도시계획 동향**: 서울시 2040 도시기본계획 및 해당 권역 정비계획 하에 토지이용 효율화 추진 중.
- **규제 체계**: 용도지역·고도지구·경관지구 등 적용 여부 확인 필요. 개발 전 인·허가 타임라인 검토 필수.
- **사업성 고려**: ${profile.type.includes('residential') ? '주거 중심 개발 수요 안정적' : profile.type.includes('commercial') ? '상업·업무 개발 수요 확인 필요' : '용도 복합화로 사업성 개선 가능'}.`)

  // ── 3. 시장 포지셔닝 및 시세 흐름 ──
  sections.push(`## 시장 포지셔닝 및 시세 흐름

- **포지셔닝**: ${profile.market}
- **주요 수요층**: ${profile.demand}
- **가격 동향**: ${profile.priceStability === 'high' ? '하방 경직성이 강해 큰 폭의 하락 없이 보합~완만한 상승 유지 중.' : profile.priceStability === 'medium' ? '금리·시장 사이클에 연동해 소폭 등락. 중장기 우상향 기조.' : '거래량 희소로 가격 변동성 존재. 적정 가격 형성에 시간 필요.'}
- **비교 기준**: 인근 ${locationRef} 유사 매물·경매 사례 기준 시세 형성.`)

  // ── 4. 담보로서의 핵심 가치 요인 ──
  sections.push(`## 담보로서의 핵심 가치 요인

- **환금성 (유동성)**: ${LIQUIDITY_LABELS[profile.liquidity]}
- **담보 안정성**: ${STABILITY_LABELS[profile.priceStability]}
- **특이 프리미엄**: ${profile.premium}
- **NPL 회수 관점**: ${profile.liquidity === 'high' ? '경매 낙찰경쟁 활발 — 채권 회수율 양호 예상.' : profile.liquidity === 'medium' ? '적정 낙찰가율 형성 가능. 경매 기간 내 정상 처분 가능.' : '희소 매물 특성상 낙찰까지 기간 소요 가능. 가격 협상력 확보 중요.'}`)

  // ── 5. 주요 리스크 요인 ──
  const risks = profile.risk.map(r => `- ${r}`).join('\n')
  sections.push(`## 주요 리스크 요인

${risks}
- 법적 선순위 권리(가압류·가처분·선순위 임차인 등) 별도 확인 필수
- 경매 진행 시 유찰 시나리오 대비 회수 기간 연장 가능성 고려`)

  // ── 6. 종합 평가 ──
  const tableRatings = {
    liquidity:  profile.liquidity === 'high' ? '★★★★★' : profile.liquidity === 'medium' ? '★★★☆☆' : '★★☆☆☆',
    stability:  profile.priceStability === 'high' ? '★★★★★' : profile.priceStability === 'medium' ? '★★★☆☆' : '★★☆☆☆',
    tier:       profile.tier === 'premium' ? '★★★★★' : profile.tier === 'upper' ? '★★★★☆' : profile.tier === 'mid' ? '★★★☆☆' : '★★☆☆☆',
    dev:        profile.type.includes('natural') ? '★★★★☆' : profile.type.includes('commercial') ? '★★★★☆' : '★★★☆☆',
    shortTerm:  profile.liquidity === 'high' ? '양호' : profile.liquidity === 'medium' ? '보통' : '제한적',
    longTerm:   profile.tier === 'premium' ? '우수' : profile.tier === 'upper' ? '양호' : '보통',
  }

  sections.push(`## 종합 평가

| 항목 | 평가 |
|------|------|
| 입지 희소성 | ${tableRatings.tier} |
| 환금성 | ${tableRatings.liquidity} |
| 담보 안정성 | ${tableRatings.stability} |
| 개발 잠재력 | ${tableRatings.dev} |
| 단기 유동성 | ${tableRatings.shortTerm} |
| 장기 자산가치 | ${tableRatings.longTerm} |

**한 줄 결론**: ${locationRef} 소재 본 자산은 ${TIER_LABELS[profile.tier]} 권역의 ${profile.type.join('·')} 자산으로, ${profile.priceStability === 'high' ? '가치 하방 경직성이 강하고' : '시장 변동성을 감안해야 하나'} ${profile.liquidity === 'high' ? '환금성이 우수해 NPL 담보로서 안정적인 회수 기반을 갖추고 있습니다.' : profile.liquidity === 'medium' ? '중간 수준의 유동성을 보유하며 적정 회수 전략 수립 시 NPL 투자 담보로 활용 가능합니다.' : '희소성과 장기 가치는 높지만 단기 환금성은 제한적이므로 보수적 회수 계획 수립을 권장합니다.'}`)

  return sections.join('\n\n')
}
