// ─────────────────────────────────────────────────────────
//  Dummy Data – DB 미연결 시 fallback 용 (결정적, 현실적)
// ─────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date('2026-03-13');
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// 키워드 카테고리
export type KeywordCategory = '거래/시장' | '개발/지역' | '정책/규제' | '투자/금융';

export const KEYWORD_CATEGORY_MAP: Record<string, KeywordCategory> = {
  '아파트': '거래/시장', '전세': '거래/시장', '매매': '거래/시장',
  '분양': '거래/시장', '청약': '거래/시장', '임대': '거래/시장',
  '오피스텔': '거래/시장', '빌라': '거래/시장', '실거래가': '거래/시장',
  '재건축': '개발/지역', '재개발': '개발/지역', 'GTX': '개발/지역',
  '역세권': '개발/지역', '신도시': '개발/지역', '개발': '개발/지역',
  '착공': '개발/지역', '위례': '개발/지역', '판교': '개발/지역',
  '분당': '개발/지역', '강남': '개발/지역', '동탄': '개발/지역',
  '미사': '개발/지역', '하남': '개발/지역', '송도': '개발/지역',
  '규제': '정책/규제', '정책': '정책/규제', '법안': '정책/규제',
  '초과이익': '정책/규제', '특별법': '정책/규제', '안전진단': '정책/규제',
  '상한제': '정책/규제', '임대차3법': '정책/규제', '용적률': '정책/규제',
  '금리': '투자/금융', '대출': '투자/금융', '투자': '투자/금융',
  '경매': '투자/금융', '특례보금자리론': '투자/금융', '낙찰가율': '투자/금융',
  '수익률': '투자/금융', '공실률': '투자/금융',
};

// ─── 현실적 뉴스 기사 25개 (NLP 점수 포함) ────────────────
export interface DummyArticle {
  id: number;
  title: string;
  summary: string;
  provider: string;
  published_at: string;
  sido: string;
  sigungu?: string;
  direction: string;
  direction_score: number;   // 방향성 확신도 0~1
  sentiment_score: number;   // 감성 점수 -1~1
  keywords: string[];
}

const DUMMY_ARTICLES: DummyArticle[] = [
  {
    id: 1,
    title: '강남 아파트 실거래가 2년 만에 반등…3.3㎡당 평균 7,200만원',
    summary: '강남구 아파트 실거래가가 전 분기 대비 6.2% 상승하며 2022년 이후 처음으로 반등했다. 잠실·압구정 등 주요 단지 위주로 매수세 유입이 확인됐다.',
    provider: '한국경제', published_at: daysAgo(0),
    sido: '서울', sigungu: '강남구',
    direction: '상승', direction_score: 0.92, sentiment_score: 0.74,
    keywords: ['아파트', '매매', '강남', '실거래가'],
  },
  {
    id: 2,
    title: '전세사기 특별법 국회 본회의 통과…피해자 1.2만 명 구제',
    summary: '전세사기 피해자 구제를 위한 특별법이 국회를 통과했다. 피해자들은 공공임대주택 우선 입주 자격을 받고 보증금 일부를 선지급 받을 수 있다.',
    provider: '연합뉴스', published_at: daysAgo(0),
    sido: '서울',
    direction: '중립', direction_score: 0.51, sentiment_score: 0.12,
    keywords: ['전세', '피해자', '특별법', '임대'],
  },
  {
    id: 3,
    title: 'GTX-A 개통 임박…수혜 역세권 아파트 매수세 급증',
    summary: 'GTX-A 노선 3월 말 정식 개통 예정에 따라 수서·동탄 등 역세권 아파트 매물이 줄고 호가가 올랐다. 동탄2신도시는 전주 대비 5,000만원 상승.',
    provider: '매일경제', published_at: daysAgo(0),
    sido: '경기', sigungu: '화성시',
    direction: '상승', direction_score: 0.88, sentiment_score: 0.65,
    keywords: ['GTX', '역세권', '아파트', '동탄'],
  },
  {
    id: 4,
    title: '재건축 초과이익 환수제 완화 추진…강남권 재건축 기대감 상승',
    summary: '국토부가 재건축 초과이익 환수제 부담금 기준을 1억 원에서 3억 원으로 높이는 방안을 검토 중이다. 강남·목동·여의도 재건축 추진 단지들이 수혜 예상.',
    provider: '조선일보', published_at: daysAgo(1),
    sido: '서울', sigungu: '강남구',
    direction: '상승', direction_score: 0.83, sentiment_score: 0.58,
    keywords: ['재건축', '규제', '강남', '초과이익'],
  },
  {
    id: 5,
    title: '한국은행, 기준금리 3.5% 동결…부동산 시장 관망세 지속',
    summary: '한국은행이 이달에도 기준금리를 3.5%로 동결했다. 전문가들은 하반기 인하 가능성을 점치며, 주택 매수 시기를 재보는 실수요자가 늘고 있다고 분석한다.',
    provider: '이데일리', published_at: daysAgo(1),
    sido: '서울',
    direction: '중립', direction_score: 0.54, sentiment_score: -0.08,
    keywords: ['금리', '한국은행', '동결', '투자'],
  },
  {
    id: 6,
    title: '수도권 청약 경쟁률 급등…평균 52:1 기록',
    summary: '이달 수도권 분양 단지들의 평균 청약 경쟁률이 52대 1을 기록했다. 인천 검단과 경기 광교가 각각 89:1, 123:1로 최고 경쟁률을 나타냈다.',
    provider: '머니투데이', published_at: daysAgo(1),
    sido: '경기', sigungu: '수원시',
    direction: '상승', direction_score: 0.86, sentiment_score: 0.71,
    keywords: ['청약', '분양', '수도권', '아파트'],
  },
  {
    id: 7,
    title: '서울 빌라 거래량 50% 급감…전세사기 여파 지속',
    summary: '서울 연립·다세대(빌라) 거래량이 전년 동기 대비 50% 가까이 줄었다. 전세사기 피해 확산에 따른 임차인 기피 현상이 원인으로 꼽힌다.',
    provider: '아시아경제', published_at: daysAgo(2),
    sido: '서울', sigungu: '노원구',
    direction: '하락', direction_score: 0.79, sentiment_score: -0.62,
    keywords: ['빌라', '거래량', '전세', '사기'],
  },
  {
    id: 8,
    title: '분양가 상한제 개편 검토…민간 택지 적용 완화 신호',
    summary: '정부가 민간 택지 분양가 상한제 적용 기준을 현실화하는 방안을 검토 중이다. 건설업계는 원가 반영률 향상을 기대하며 긍정적으로 받아들이고 있다.',
    provider: '서울경제', published_at: daysAgo(2),
    sido: '서울',
    direction: '상승', direction_score: 0.75, sentiment_score: 0.42,
    keywords: ['분양', '상한제', '정책', '규제'],
  },
  {
    id: 9,
    title: '인천 송도 오피스텔 공급 과잉 우려…공실률 18% 달해',
    summary: '인천 송도국제도시 오피스텔 공실률이 18%에 달하는 것으로 집계됐다. 대규모 공급이 이어지는 가운데 수요가 따라오지 못하는 상황이다.',
    provider: '뉴시스', published_at: daysAgo(2),
    sido: '인천', sigungu: '연수구',
    direction: '하락', direction_score: 0.81, sentiment_score: -0.55,
    keywords: ['오피스텔', '공실률', '송도', '분양'],
  },
  {
    id: 10,
    title: '특례보금자리론 2.0 출시…연 3.7% 고정금리',
    summary: '주택금융공사가 특례보금자리론 2.0을 출시했다. 연 3.7% 고정금리로 최대 5억 원까지 대출 가능하며, 출시 첫날 5만 건 신청이 몰렸다.',
    provider: '한국경제', published_at: daysAgo(3),
    sido: '서울',
    direction: '상승', direction_score: 0.78, sentiment_score: 0.55,
    keywords: ['특례보금자리론', '금리', '대출', '정책'],
  },
  {
    id: 11,
    title: '1인 가구 증가로 소형 아파트 수요 폭발…전용 59㎡ 인기',
    summary: '통계청 1인 가구 비율이 35%를 넘어서며 소형 아파트 수요가 폭발적으로 증가하고 있다. 전용 59㎡ 이하 소형 아파트의 거래 비중이 전체의 48%에 달한다.',
    provider: '매일경제', published_at: daysAgo(3),
    sido: '서울', sigungu: '마포구',
    direction: '상승', direction_score: 0.82, sentiment_score: 0.60,
    keywords: ['아파트', '매매', '분양'],
  },
  {
    id: 12,
    title: '부산 해운대 프리미엄 아파트 시장 한파…호가 20% 하락',
    summary: '부산 해운대구 고급 아파트 시장에 한파가 불고 있다. 엘시티 등 프리미엄 단지 호가가 최고점 대비 20% 이상 빠졌으며 거래도 끊긴 상태다.',
    provider: '연합뉴스', published_at: daysAgo(3),
    sido: '부산', sigungu: '해운대구',
    direction: '하락', direction_score: 0.87, sentiment_score: -0.68,
    keywords: ['아파트', '부산', '하락'],
  },
  {
    id: 13,
    title: '경기 판교·분당 스타트업 업무지구 확대…주거 수요 동반 상승 예상',
    summary: '성남시가 판교테크노밸리 3단지 조성을 확정함에 따라 분당·판교 일대 주거 수요도 함께 늘어날 것으로 전망된다.',
    provider: '아시아경제', published_at: daysAgo(4),
    sido: '경기', sigungu: '성남시분당구',
    direction: '상승', direction_score: 0.76, sentiment_score: 0.48,
    keywords: ['판교', '분당', '아파트', '개발'],
  },
  {
    id: 14,
    title: '재건축 안전진단 기준 완화 1년…강남 단지 14곳 통과',
    summary: '재건축 안전진단 기준이 완화된 지 1년이 지나며 강남권 노후 단지 14곳이 진단을 통과했다. 은마아파트도 지난달 조건부 적정 판정을 받았다.',
    provider: '조선일보', published_at: daysAgo(4),
    sido: '서울', sigungu: '강남구',
    direction: '상승', direction_score: 0.84, sentiment_score: 0.52,
    keywords: ['재건축', '안전진단', '강남', '규제'],
  },
  {
    id: 15,
    title: '전국 미분양 주택 7.2만 가구…지방 중소도시 적체 심화',
    summary: '국토부에 따르면 전국 미분양 주택이 7만 2,000가구를 넘어섰다. 충남·경북 등 지방 중소도시에서의 적체가 심각하며 건설사 유동성 우려가 커지고 있다.',
    provider: '이데일리', published_at: daysAgo(4),
    sido: '서울',
    direction: '하락', direction_score: 0.85, sentiment_score: -0.58,
    keywords: ['분양', '지방', '공실률'],
  },
  {
    id: 16,
    title: '위례신도시 트램 착공 확정…주변 아파트 호가 급등',
    summary: '위례선 트램이 착공을 확정하며 위례신도시 아파트 호가가 일제히 올랐다. 일부 단지는 전날보다 5,000만~1억 원 높은 가격에 매물이 나왔다.',
    provider: '머니투데이', published_at: daysAgo(5),
    sido: '경기', sigungu: '성남시수정구',
    direction: '상승', direction_score: 0.89, sentiment_score: 0.67,
    keywords: ['위례', '아파트', '개발'],
  },
  {
    id: 17,
    title: '역세권 주택 공급 확대 방안 발표…용적률 최대 700%',
    summary: '국토부가 역세권 복합개발 용적률을 최대 700%로 높이는 내용의 주택공급 대책을 발표했다. 수도권 30여 개 역 주변이 대상이다.',
    provider: '서울경제', published_at: daysAgo(5),
    sido: '서울',
    direction: '상승', direction_score: 0.80, sentiment_score: 0.50,
    keywords: ['역세권', '용적률', '정책', '개발'],
  },
  {
    id: 18,
    title: '서울 전세 시장 안정세…전세가율 55% 수준 유지',
    summary: '서울 아파트 전세가율이 55% 안팎에서 안정세를 보이고 있다. 전문가들은 당분간 급격한 변동은 없을 것으로 전망한다.',
    provider: '뉴시스', published_at: daysAgo(5),
    sido: '서울',
    direction: '중립', direction_score: 0.56, sentiment_score: 0.08,
    keywords: ['전세', '아파트', '매매'],
  },
  {
    id: 19,
    title: '경기 하남 미사강변도시 입주 10년…실거래가 2.5배 상승',
    summary: '미사강변도시 입주 10주년을 맞아 아파트 실거래가가 입주 초기 대비 2.5배 오른 것으로 나타났다. 한강 조망 프리미엄이 꾸준히 유지되고 있다.',
    provider: '한국경제', published_at: daysAgo(6),
    sido: '경기', sigungu: '하남시',
    direction: '상승', direction_score: 0.77, sentiment_score: 0.62,
    keywords: ['아파트', '실거래가', '하남', '미사'],
  },
  {
    id: 20,
    title: '강북 재개발 사업 속도…성북구 15곳 관리처분 신청',
    summary: '강북권 재개발 사업이 빨라지고 있다. 성북구에서만 15개 구역이 올해 관리처분계획 인가를 신청할 예정이며 이주가 본격화될 전망이다.',
    provider: '조선일보', published_at: daysAgo(6),
    sido: '서울', sigungu: '성북구',
    direction: '상승', direction_score: 0.81, sentiment_score: 0.45,
    keywords: ['재개발', '개발', '규제'],
  },
  {
    id: 21,
    title: '임대차 3법 손질 논의 재개…계약갱신청구권 축소 가능성',
    summary: '국회에서 임대차 3법 개정 논의가 재개됐다. 계약갱신청구권 기간을 현행 2+2에서 2+1로 단축하는 안이 유력하게 검토 중이다.',
    provider: '매일경제', published_at: daysAgo(7),
    sido: '서울',
    direction: '중립', direction_score: 0.58, sentiment_score: -0.10,
    keywords: ['임대', '임대차3법', '정책', '규제'],
  },
  {
    id: 22,
    title: '대구 수성구 고가 아파트 경매 낙찰가율 급락',
    summary: '대구 수성구 아파트 경매 낙찰가율이 70%대로 떨어졌다. 공급 과잉과 인구 유출로 지방 광역시 중에서도 낙폭이 가장 크다.',
    provider: '이데일리', published_at: daysAgo(7),
    sido: '대구', sigungu: '수성구',
    direction: '하락', direction_score: 0.84, sentiment_score: -0.60,
    keywords: ['경매', '낙찰가율', '아파트'],
  },
  {
    id: 23,
    title: '서울 오피스텔 공급 10년 만에 최저…희소성 부각',
    summary: '올해 서울 오피스텔 공급량이 10년 만에 최저치를 기록할 전망이다. 분양가 상승과 인허가 지연이 원인이며, 기존 물량의 희소성이 부각될 수 있다고 전문가들은 분석한다.',
    provider: '아시아경제', published_at: daysAgo(8),
    sido: '서울',
    direction: '중립', direction_score: 0.52, sentiment_score: 0.15,
    keywords: ['오피스텔', '분양', '공실률'],
  },
  {
    id: 24,
    title: '신생아 특례대출 2.0 출시…출산 가구 주거 지원 강화',
    summary: '정부가 출산 가구를 위한 신생아 특례대출 2.0을 출시했다. 자녀 수에 따라 최저 연 1.1%까지 대출이 가능하며, 소득 기준도 기존보다 상향됐다.',
    provider: '연합뉴스', published_at: daysAgo(8),
    sido: '서울',
    direction: '상승', direction_score: 0.73, sentiment_score: 0.50,
    keywords: ['대출', '특례보금자리론', '정책', '청약'],
  },
  {
    id: 25,
    title: '청약통장 가입자 수 10년 내 최저…청약제도 개편 필요성 제기',
    summary: '청약통장 가입자 수가 2,500만 명으로 줄어 10년 만의 최저치를 기록했다. 복잡한 청약제도와 당첨 가능성 저하가 원인으로 분석된다.',
    provider: '서울경제', published_at: daysAgo(9),
    sido: '서울',
    direction: '중립', direction_score: 0.55, sentiment_score: -0.18,
    keywords: ['청약', '분양', '정책'],
  },
];

// ─── 검색 API 더미 ─────────────────────────────────────────
export function getDummyNewsSearch(params?: {
  keyword?: string; sido?: string; provider?: string;
  direction?: string; period?: string; date?: string;
  limit?: number; offset?: number;
}) {
  const limit  = params?.limit  ?? 10;
  const offset = params?.offset ?? 0;

  let filtered = [...DUMMY_ARTICLES];

  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    filtered = filtered.filter(
      (a) => a.title.includes(params.keyword!) || a.summary.includes(params.keyword!) ||
             a.keywords.some((k) => k.toLowerCase().includes(kw)),
    );
  }
  if (params?.sido && params.sido !== '전국')
    filtered = filtered.filter((a) => a.sido === params.sido);
  if (params?.provider && params.provider !== '전체')
    filtered = filtered.filter((a) => a.provider === params.provider);
  if (params?.direction && params.direction !== '전체')
    filtered = filtered.filter((a) => a.direction === params.direction);
  if (params?.date)
    filtered = filtered.filter((a) => a.published_at === params.date);
  if (params?.period && params.period !== 'all') {
    const days: Record<string, number> = {
      today: 1, '1week': 7, '1month': 30, '3months': 90, '6months': 180,
    };
    const cutoff = daysAgo(days[params.period] ?? 9999);
    filtered = filtered.filter((a) => a.published_at >= cutoff);
  }

  return { list: filtered.slice(offset, offset + limit), total_count: filtered.length };
}

// ─── 기사 단건 조회 ────────────────────────────────────────
export function getDummyArticleById(id: number): DummyArticle | undefined {
  return DUMMY_ARTICLES.find((a) => a.id === id);
}

// ─── 통계 API 더미 ────────────────────────────────────────
export function getDummyNewsStats(_date?: string) {
  return [
    { pubdate: daysAgo(1), total: 23, up: 10, down: 5, neutral: 8 },
    { pubdate: daysAgo(2), total: 19, up:  8, down: 6, neutral: 5 },
  ];
}

// ─── 일간 키워드 순위 ──────────────────────────────────────
export function getDummyDailyTopKeywords(_date?: string) {
  return [
    { keyword: '아파트',   count: 120, rank: 1, change:  5 },
    { keyword: '전세',     count:  95, rank: 2, change: -2 },
    { keyword: '매매',     count:  88, rank: 3, change:  1 },
    { keyword: '청약',     count:  75, rank: 4, change:  3 },
    { keyword: '재건축',   count:  62, rank: 5, change: -1 },
    { keyword: '분양',     count:  55, rank: 6, change:  2 },
    { keyword: '금리',     count:  48, rank: 7, change: -3 },
    { keyword: '규제',     count:  42, rank: 8, change:  0 },
    { keyword: '투자',     count:  38, rank: 9, change:  4 },
    { keyword: '임대',     count:  35, rank: 10, change: -2 },
  ];
}

export function getDummyDailyKeywordStats(_date?: string) {
  return {
    date: daysAgo(0), total_articles: 350, total_keywords: 180,
    unique_keywords: 95, avg_keywords_per_article: 3.2,
    top_category: '거래/시장', sentiment: { positive: 42, negative: 28, neutral: 30 },
  };
}

export function getDummyDailyKeywordUpDown(_date?: string) {
  return {
    date: daysAgo(0),
    up: [
      { keyword: '청약',   change: 15, prev_rank:  8, curr_rank: 4 },
      { keyword: '투자',   change: 12, prev_rank: 15, curr_rank: 9 },
      { keyword: '아파트', change:  5, prev_rank:  3, curr_rank: 1 },
    ],
    down: [
      { keyword: '금리', change: -8, prev_rank: 2, curr_rank: 7 },
      { keyword: '전세', change: -5, prev_rank: 1, curr_rank: 2 },
      { keyword: '임대', change: -3, prev_rank: 8, curr_rank: 10 },
    ],
    new_entries: [{ keyword: '특례보금자리론', rank: 12 }, { keyword: 'GTX', rank: 18 }],
  };
}

// ─── 주간 키워드 순위 ──────────────────────────────────────
export function getDummyWeeklyTopKeywords(_w?: string) {
  return [
    { keyword: '아파트',   count: 520, rank: 1, change:  2 },
    { keyword: '매매',     count: 480, rank: 2, change: -1 },
    { keyword: '전세',     count: 445, rank: 3, change:  0 },
    { keyword: '청약',     count: 380, rank: 4, change:  3 },
    { keyword: '재건축',   count: 310, rank: 5, change: -2 },
    { keyword: '분양',     count: 290, rank: 6, change:  1 },
    { keyword: '금리',     count: 265, rank: 7, change: -1 },
    { keyword: '규제',     count: 230, rank: 8, change:  2 },
    { keyword: '투자',     count: 210, rank: 9, change:  0 },
    { keyword: '임대',     count: 195, rank: 10, change: -3 },
  ];
}

export function getDummyWeeklyKeywordStats(_w?: string) {
  return {
    week_start_date: daysAgo(6), total_articles: 2450, total_keywords: 1200,
    unique_keywords: 320, avg_keywords_per_article: 3.5,
    top_category: '거래/시장', sentiment: { positive: 40, negative: 30, neutral: 30 },
  };
}

export function getDummyWeeklyKeywordUpDown(_w?: string) {
  return {
    week_start_date: daysAgo(6),
    up: [{ keyword: '청약', change: 8, prev_rank: 7, curr_rank: 4 }, { keyword: '규제', change: 5, prev_rank: 10, curr_rank: 8 }],
    down: [{ keyword: '재건축', change: -4, prev_rank: 3, curr_rank: 5 }, { keyword: '임대', change: -6, prev_rank: 7, curr_rank: 10 }],
    new_entries: [{ keyword: '신도시', rank: 15 }],
  };
}

// ─── 히트맵 데이터 (90일, 결정적) ─────────────────────────
export function getDummyHeatmapData() {
  const base = new Date('2026-03-13');
  const wdTotals  = [10,12,9,14,11,8,13,15,10,12,9,11,14,8,12,10,13,9,15,11,10,14,12,8,11,13,10];
  const weTotals  = [2,0,3,1,0,2,1,3,0,2,1,0,3];
  const upRatios  = [0.5,0.6,0.4,0.65,0.35,0.55,0.45,0.7,0.4,0.6,0.5,0.45,0.55];
  const dnRatios  = [0.2,0.15,0.35,0.1,0.4,0.2,0.3,0.1,0.35,0.2,0.25,0.3,0.2];
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (89 - i));
    const dow = d.getDay();
    const isWe = dow === 0 || dow === 6;
    const wkIdx = Math.floor(i / 7) % upRatios.length;
    const ttlArr = isWe ? weTotals : wdTotals;
    const total = ttlArr[i % ttlArr.length];
    if (total === 0) return { date: d.toISOString().split('T')[0], total: 0, up: 0, down: 0, neutral: 0 };
    const up  = Math.round(total * upRatios[wkIdx]);
    const down = Math.round(total * dnRatios[wkIdx]);
    return { date: d.toISOString().split('T')[0], total, up, down, neutral: total - up - down };
  });
}

// ─── 감성 산점도 추가 데이터 ───────────────────────────────
export function getDummySentimentScatter() {
  const extra = [
    { id:101, title:'분당 재건축 조합원 입주권 경쟁 치열', direction:'상승', direction_score:0.88, sentiment_score:0.70, sido:'경기', keywords:['재건축','분당'] },
    { id:102, title:'대전 아파트 미분양 증가세', direction:'하락', direction_score:0.76, sentiment_score:-0.52, sido:'대전', keywords:['아파트','미분양'] },
    { id:103, title:'전국 오피스텔 공실률 사상 최고', direction:'하락', direction_score:0.82, sentiment_score:-0.65, sido:'전국', keywords:['오피스텔','공실률'] },
    { id:104, title:'하남 미사강변도시 입지 재평가', direction:'상승', direction_score:0.71, sentiment_score:0.48, sido:'경기', keywords:['하남','아파트'] },
    { id:105, title:'인천 검단 청약 경쟁률 역대급', direction:'상승', direction_score:0.90, sentiment_score:0.78, sido:'인천', keywords:['청약','아파트'] },
    { id:106, title:'광주 광산구 임대 시장 침체', direction:'하락', direction_score:0.68, sentiment_score:-0.40, sido:'광주', keywords:['임대'] },
    { id:107, title:'서울 강북 재개발 지역 관망세', direction:'중립', direction_score:0.50, sentiment_score:0.05, sido:'서울', keywords:['재개발'] },
    { id:108, title:'세종시 아파트 거래 회복세', direction:'상승', direction_score:0.66, sentiment_score:0.38, sido:'세종', keywords:['아파트','매매'] },
    { id:109, title:'부산 신도시 투자 수요 감소', direction:'하락', direction_score:0.73, sentiment_score:-0.45, sido:'부산', keywords:['신도시','투자'] },
    { id:110, title:'수도권 역세권 개발 수혜 예상', direction:'상승', direction_score:0.85, sentiment_score:0.60, sido:'경기', keywords:['역세권','GTX'] },
  ];
  return [
    ...DUMMY_ARTICLES.map(a => ({
      id: a.id, title: a.title,
      direction_score: a.direction_score, sentiment_score: a.sentiment_score,
      sido: a.sido, direction: a.direction, keywords: a.keywords,
    })),
    ...extra,
  ];
}

// ─── 지역별 레이더 데이터 ──────────────────────────────────
export function getDummyRegionRadar() {
  return {
    thisWeek: [
      { region:'서울', 상승전망:70, 기사량:85, 감성지수:65, 키워드다양성:80, 변동성:55 },
      { region:'경기', 상승전망:65, 기사량:75, 감성지수:60, 키워드다양성:70, 변동성:50 },
      { region:'인천', 상승전망:55, 기사량:60, 감성지수:52, 키워드다양성:65, 변동성:48 },
      { region:'부산', 상승전망:38, 기사량:55, 감성지수:40, 키워드다양성:60, 변동성:62 },
      { region:'대구', 상승전망:30, 기사량:45, 감성지수:34, 키워드다양성:50, 변동성:68 },
    ],
    lastWeek: [
      { region:'서울', 상승전망:60, 기사량:80, 감성지수:55, 키워드다양성:75, 변동성:60 },
      { region:'경기', 상승전망:60, 기사량:70, 감성지수:55, 키워드다양성:65, 변동성:55 },
      { region:'인천', 상승전망:50, 기사량:55, 감성지수:48, 키워드다양성:60, 변동성:52 },
      { region:'부산', 상승전망:42, 기사량:58, 감성지수:44, 키워드다양성:62, 변동성:58 },
      { region:'대구', 상승전망:35, 기사량:48, 감성지수:38, 키워드다양성:52, 변동성:65 },
    ],
  };
}

// ─── 키워드 공출현 네트워크 데이터 ────────────────────────
export function getDummyKeywordNetwork() {
  const nodes = [
    { id:'아파트',    count:120, category:'거래/시장'  as KeywordCategory },
    { id:'전세',      count: 95, category:'거래/시장'  as KeywordCategory },
    { id:'매매',      count: 88, category:'거래/시장'  as KeywordCategory },
    { id:'청약',      count: 75, category:'거래/시장'  as KeywordCategory },
    { id:'분양',      count: 55, category:'거래/시장'  as KeywordCategory },
    { id:'재건축',    count: 62, category:'개발/지역'  as KeywordCategory },
    { id:'GTX',       count: 48, category:'개발/지역'  as KeywordCategory },
    { id:'역세권',    count: 40, category:'개발/지역'  as KeywordCategory },
    { id:'강남',      count: 52, category:'개발/지역'  as KeywordCategory },
    { id:'규제',      count: 42, category:'정책/규제'  as KeywordCategory },
    { id:'정책',      count: 38, category:'정책/규제'  as KeywordCategory },
    { id:'금리',      count: 48, category:'투자/금융'  as KeywordCategory },
    { id:'대출',      count: 35, category:'투자/금융'  as KeywordCategory },
    { id:'경매',      count: 28, category:'투자/금융'  as KeywordCategory },
  ];
  const edges = [
    { source:'아파트', target:'전세',   weight:8 },
    { source:'아파트', target:'매매',   weight:7 },
    { source:'아파트', target:'청약',   weight:6 },
    { source:'아파트', target:'재건축', weight:5 },
    { source:'아파트', target:'강남',   weight:6 },
    { source:'아파트', target:'분양',   weight:5 },
    { source:'청약',   target:'분양',   weight:7 },
    { source:'재건축', target:'강남',   weight:8 },
    { source:'재건축', target:'규제',   weight:6 },
    { source:'GTX',    target:'역세권', weight:9 },
    { source:'역세권', target:'아파트', weight:4 },
    { source:'금리',   target:'대출',   weight:8 },
    { source:'금리',   target:'아파트', weight:4 },
    { source:'금리',   target:'경매',   weight:5 },
    { source:'규제',   target:'정책',   weight:7 },
    { source:'전세',   target:'규제',   weight:4 },
  ];
  return { nodes, edges };
}

// ─── 키워드 트렌드 (14일, 결정적) ─────────────────────────
export function getDummyKeywordTrend() {
  const series: Record<string, number[]> = {
    '아파트':  [105, 112, 108, 125, 118, 130, 122, 115, 128, 132, 120, 125, 118, 130],
    '전세':    [ 78,  82,  75,  90,  85,  88,  80,  76,  92,  86,  80,  85,  78,  90],
    '매매':    [ 72,  78,  70,  82,  88,  75,  80,  85,  78,  82,  88,  80,  75,  82],
    '청약':    [ 48,  52,  55,  48,  60,  65,  58,  52,  60,  68,  62,  58,  55,  65],
    '재건축':  [ 38,  42,  45,  40,  48,  52,  45,  38,  50,  45,  42,  48,  40,  45],
  };
  const trend = Array.from({ length: 14 }, (_, i) => {
    const date = new Date('2026-03-13');
    date.setDate(date.getDate() - (13 - i));
    const keywords: Record<string, number> = {};
    for (const [kw, vals] of Object.entries(series)) keywords[kw] = vals[i];
    return { date: date.toISOString().split('T')[0], keywords };
  });
  return { trend };
}
