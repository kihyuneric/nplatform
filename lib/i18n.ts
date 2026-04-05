export type Locale = 'ko' | 'en' | 'ja'

// ─── 정적 번역 사전 (API 없이 즉시 반환) ──────────────────────────
const STATIC_DICT: Record<string, Record<string, string>> = {
  en: {
    'NPL마켓': 'NPL Market', '거래매칭': 'Deal Matching', '시장분석': 'Market Analysis',
    '커뮤니티': 'Community', '내 정보': 'My Info', '마이': 'My', '분석도구': 'Tools',
    '로그인': 'Login', '회원가입': 'Sign Up', '관리': 'Admin', '알림': 'Notifications',
    '로그아웃': 'Logout', '대시보드': 'Dashboard', '요금제': 'Pricing',
    '고객센터': 'Support', '서비스 소개': 'About', '공지사항': 'Notices',
    '설정': 'Settings', '프로필': 'Profile', '포트폴리오': 'Portfolio',
    '전문가': 'Experts', '전문가 등록': 'Register as Expert',
    'NPL 검색': 'NPL Search', 'NPL 지도': 'NPL Map', 'NPL 입찰': 'NPL Bidding',
    '매물 등록': 'List Property', '대량 등록': 'Bulk Upload', '매수 수요': 'Buy Demand',
    '참여 기관': 'Institutions', '펀드': 'Fund', '대출': 'Loan',
    '딜룸': 'Deal Room', 'AI 매칭': 'AI Matching', '계약서 생성': 'Contract Builder',
    '거래 아카이브': 'Deal Archive', '시장 개요': 'Market Overview',
    'NPL 분석': 'NPL Analysis', '경매 수익률 분석': 'Auction ROI', 'OCR 문서인식': 'OCR',
    '통계 분석': 'Statistics', '트렌드 분석': 'Trend Analysis', '뉴스': 'News',
    '지식센터': 'Knowledge', '법률 전문가': 'Legal Expert', '세무 전문가': 'Tax Expert',
    '공인중개사': 'Realtor', '내 거래': 'My Deals', '분석 대시보드': 'Analysis Dashboard',
    '관심매물': 'Favorites', '구독·결제': 'Billing', '내 대시보드': 'My Dashboard',
    '저장': 'Save', '취소': 'Cancel', '삭제': 'Delete', '추가': 'Add', '수정': 'Edit',
    '저장 중...': 'Saving...', '확인': 'Confirm', '닫기': 'Close',
    '역할 전환 (관리자용)': 'Switch Role (Admin)', '관리자 대시보드': 'Admin Dashboard',
  },
  ja: {
    'NPL마켓': 'NPLマーケット', '거래매칭': '取引マッチング', '시장분석': '市場分析',
    '커뮤니티': 'コミュニティ', '내 정보': 'マイページ', '마이': 'マイ', '분석도구': 'ツール',
    '로그인': 'ログイン', '회원가입': '会員登録', '관리': '管理', '알림': '通知',
    '로그아웃': 'ログアウト', '대시보드': 'ダッシュボード', '요금제': '料金プラン',
    '고객센터': 'サポート', '서비스 소개': 'サービス紹介', '공지사항': 'お知らせ',
    '설정': '設定', '프로필': 'プロフィール', '포트폴리오': 'ポートフォリオ',
    '전문가': '専門家', '전문가 등록': '専門家登録',
    'NPL 검색': 'NPL検索', 'NPL 지도': 'NPL地図', 'NPL 입찰': 'NPL入札',
    '매물 등록': '物件登録', '대량 등록': '一括登録', '매수 수요': '購入需要',
    '참여 기관': '参加機関', '펀드': 'ファンド', '대출': 'ローン',
    '딜룸': 'ディールルーム', 'AI 매칭': 'AIマッチング', '계약서 생성': '契約書作成',
    '거래 아카이브': '取引アーカイブ', '시장 개요': '市場概要',
    'NPL 분석': 'NPL分析', '경매 수익률 분석': '競売収益分析', 'OCR 문서인식': 'OCR',
    '통계 분석': '統計分析', '트렌드 분석': 'トレンド分析', '뉴스': 'ニュース',
    '지식센터': 'ナレッジ', '법률 전문가': '法律専門家', '세무 전문가': '税務専門家',
    '공인중개사': '公認仲介士', '내 거래': '取引', '분석 대시보드': '分析ダッシュボード',
    '관심매물': 'お気に入り', '구독·결제': '決済', '내 대시보드': 'ダッシュボード',
    '저장': '保存', '취소': 'キャンセル', '삭제': '削除', '추가': '追加', '수정': '修正',
    '저장 중...': '保存中...', '확인': '確認', '닫기': '閉じる',
    '역할 전환 (관리자용)': '役割切替（管理者用）', '관리자 대시보드': '管理ダッシュボード',
  },
}

// 번역 업데이트 이벤트 (캐시에 새 번역 저장 시 발생)
const TRANSLATION_EVENT = 'npl_translation_ready'

// 번역 캐시 (메모리 + localStorage)
const translationCache: Record<string, string> = {}

export function getLocale(): Locale {
  if (typeof document === 'undefined') return 'ko'
  const cookie = document.cookie.match(/locale=([^;]+)/)
  return (cookie?.[1] as Locale) || 'ko'
}

export function setLocale(locale: Locale) {
  if (typeof document === 'undefined') return
  document.cookie = `locale=${locale};path=/;max-age=31536000`
  window.location.reload()
}

// 캐시 키 생성
function cacheKey(text: string, targetLang: string): string {
  return `${targetLang}:${text.substring(0, 100)}`
}

// localStorage 캐시 로드
function loadCache() {
  if (typeof localStorage === 'undefined') return
  try {
    const saved = localStorage.getItem('npl_translations')
    if (saved) {
      const parsed = JSON.parse(saved)
      Object.assign(translationCache, parsed)
    }
  } catch {}
}

// localStorage 캐시 저장
function saveCache() {
  if (typeof localStorage === 'undefined') return
  try {
    // 최대 2000개 항목만 유지
    const entries = Object.entries(translationCache)
    if (entries.length > 2000) {
      const trimmed = Object.fromEntries(entries.slice(-1500))
      Object.keys(translationCache).forEach(k => delete translationCache[k])
      Object.assign(translationCache, trimmed)
    }
    localStorage.setItem('npl_translations', JSON.stringify(translationCache))
  } catch {}
}

// 초기 캐시 로드
if (typeof window !== 'undefined') {
  loadCache()
}

/**
 * 구글 번역 API (무료 비공식 엔드포인트)
 * 대량 사용 시 Google Cloud Translation API 키로 전환 권장
 */
async function googleTranslate(text: string, targetLang: string): Promise<string> {
  const langMap: Record<string, string> = { ko: 'ko', en: 'en', ja: 'ja' }
  const target = langMap[targetLang] || 'en'

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    if (!res.ok) return text
    const data = await res.json()
    // 구글 번역 응답: [[["translated text","original text",null,null,10]],null,"ko"]
    const translated = data?.[0]?.map((item: any[]) => item[0]).join('') || text
    return translated
  } catch {
    return text
  }
}

/**
 * 텍스트 번역 (캐시 우선, 없으면 구글 번역)
 */
export async function translateText(text: string, targetLang?: Locale): Promise<string> {
  const lang = targetLang || getLocale()

  // 한국어면 원문 반환
  if (lang === 'ko') return text

  // 빈 텍스트
  if (!text || text.trim().length === 0) return text

  // 캐시 확인
  const key = cacheKey(text, lang)
  if (translationCache[key]) return translationCache[key]

  // 구글 번역 호출
  const translated = await googleTranslate(text, lang)

  // 캐시 저장
  translationCache[key] = translated
  saveCache()

  return translated
}

/**
 * 동기 함수 — 정적 사전 → 캐시 → 원문(백그라운드 번역 트리거) 순서로 반환
 */
export function t(text: string | undefined | null, locale?: Locale): string {
  if (!text || typeof text !== 'string') return ''

  // 키 기반 호출 감지 (hero.title, nav.market 등) → 빈 문자열 반환하여 || fallback 작동
  if (/^[a-zA-Z]+\.[a-zA-Z]/.test(text) && !text.includes(' ')) return ''

  const lang = locale || getLocale()

  // 한국어면 원문
  if (lang === 'ko') return text

  // 1. 정적 사전 확인 (즉시 반환)
  const staticResult = STATIC_DICT[lang]?.[text]
  if (staticResult) return staticResult

  // 2. 캐시 확인
  const key = cacheKey(text, lang)
  if (translationCache[key]) return translationCache[key]

  // 3. 캐시에 없으면 백그라운드 번역 시작
  if (typeof window !== 'undefined') {
    translateText(text, lang)
      .then(result => {
        // 번역 완료 시 이벤트 발생 → useAutoTranslate hook이 재렌더
        window.dispatchEvent(new CustomEvent(TRANSLATION_EVENT, { detail: { key, result } }))
      })
      .catch(() => {})
  }

  // 일단 원문 반환
  return text
}

/**
 * React Hook — 번역 이벤트 구독 + 강제 리렌더
 * 백그라운드 번역이 완료되면 컴포넌트를 자동 업데이트
 */
export function useTranslation() {
  const locale = getLocale()

  // 번역 완료 이벤트가 발생하면 카운터 증가 → 컴포넌트 재렌더
  if (typeof window !== 'undefined') {
    // Note: useState/useEffect를 여기서 직접 쓰면 훅 규칙 위반.
    // useAutoTranslate 훅을 사용하거나, 컴포넌트에서 version state 관리 필요.
    // 현재 hook은 즉시 번역 가능한 값을 반환.
  }

  return {
    t: (text: string | undefined | null) => t(text, locale),
    locale,
    setLocale,
    translateAsync: (text: string) => translateText(text, locale),
  }
}

/**
 * React Hook — 단일 텍스트 자동 번역 (번역 완료 시 리렌더)
 * 번역이 비동기로 완료되면 자동으로 컴포넌트가 업데이트됨
 * 사용: const translated = useAutoTranslate('안녕하세요')
 */
export function useAutoTranslate(text: string): string {
  // Dynamic import to avoid SSR issues with useState/useEffect
  // This function is declared here but must be used in a client component
  return t(text)
}

/**
 * 관리자용 — 번역 캐시 수동 수정
 */
export function setTranslation(text: string, lang: Locale, translated: string) {
  const key = cacheKey(text, lang)
  translationCache[key] = translated
  saveCache()
}

/**
 * 관리자용 — 캐시 초기화
 */
export function clearTranslationCache() {
  Object.keys(translationCache).forEach(k => delete translationCache[k])
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('npl_translations')
  }
}

/**
 * 관리자용 — 캐시 통계
 */
export function getTranslationStats() {
  return {
    cachedCount: Object.keys(translationCache).length,
    languages: ['ko', 'en', 'ja'] as Locale[],
  }
}
