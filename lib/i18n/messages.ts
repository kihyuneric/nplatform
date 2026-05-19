/**
 * lib/i18n/messages.ts
 *
 * 다국어 메시지 사전 (KO / EN / JA).
 *
 * 현재 정책: 브라우저 자동 번역 사용 → 기본 한국어
 * Phase 6 정식 i18n: useI18n() 훅 + document.documentElement.lang 감지
 *
 * 사용:
 *   import { t } from '@/lib/i18n/messages'
 *   const msg = t('exchange.listing.created', lang)
 */

export type Locale = 'ko' | 'en' | 'ja'

type Dict = Record<string, Record<Locale, string>>

const MESSAGES: Dict = {
  // ─── 공통 ────────────────────────────────────────
  'common.save': { ko: '저장', en: 'Save', ja: '保存' },
  'common.cancel': { ko: '취소', en: 'Cancel', ja: 'キャンセル' },
  'common.confirm': { ko: '확인', en: 'Confirm', ja: '確認' },
  'common.delete': { ko: '삭제', en: 'Delete', ja: '削除' },
  'common.edit': { ko: '수정', en: 'Edit', ja: '編集' },
  'common.loading': { ko: '로딩 중...', en: 'Loading...', ja: '読み込み中...' },
  'common.error': { ko: '오류가 발생했습니다', en: 'An error occurred', ja: 'エラーが発生しました' },
  'common.next': { ko: '다음', en: 'Next', ja: '次へ' },
  'common.previous': { ko: '이전', en: 'Previous', ja: '前へ' },
  'common.submit': { ko: '제출', en: 'Submit', ja: '送信' },

  // ─── Navigation ───────────────────────────────────
  'nav.exchange': { ko: '거래소', en: 'Exchange', ja: '取引所' },
  'nav.dealroom': { ko: '딜룸', en: 'Deal Room', ja: 'ディールルーム' },
  'nav.analysis': { ko: '분석', en: 'Analysis', ja: '分析' },
  'nav.community': { ko: '커뮤니티', en: 'Community', ja: 'コミュニティ' },
  'nav.my': { ko: '마이', en: 'My', ja: 'マイページ' },

  // ─── Listings ─────────────────────────────────────
  'listing.create': { ko: '매물 등록', en: 'Register Listing', ja: '物件登録' },
  'listing.search': { ko: '매물 탐색', en: 'Browse Listings', ja: '物件検索' },
  'listing.principal': { ko: '대출원금', en: 'Loan Principal', ja: '貸付元金' },
  'listing.appraisal': { ko: '감정가', en: 'Appraised Value', ja: '鑑定価格' },
  'listing.askingPrice': { ko: '희망 매각가', en: 'Asking Price', ja: '希望売却価格' },

  // ─── Analysis ─────────────────────────────────────
  'analysis.npl': { ko: 'NPL 분석', en: 'NPL Analysis', ja: 'NPL分析' },
  'analysis.profitability': { ko: '수익성 분석', en: 'Profitability Analysis', ja: '収益性分析' },
  'analysis.report': { ko: '분석 보고서', en: 'Analysis Report', ja: '分析レポート' },
  'analysis.roi': { ko: '수익률', en: 'ROI', ja: '利回り' },
  'analysis.irr': { ko: '연환산 IRR', en: 'Annualized IRR', ja: '年率IRR' },
  'analysis.risk': { ko: '리스크 점수', en: 'Risk Score', ja: 'リスクスコア' },
  'analysis.recovery': { ko: '예측 회수율', en: 'Predicted Recovery', ja: '予測回収率' },

  // ─── Deal Room ────────────────────────────────────
  'deal.signNda': { ko: 'NDA 서명', en: 'Sign NDA', ja: 'NDA署名' },
  'deal.uploadDoc': { ko: '문서 업로드', en: 'Upload Document', ja: 'ドキュメントアップロード' },
  'deal.signContract': { ko: '계약 서명', en: 'Sign Contract', ja: '契約署名' },
  'deal.escrowLock': { ko: '에스크로 입금', en: 'Lock Escrow', ja: 'エスクロー入金' },
  'deal.escrowRelease': { ko: '에스크로 정산', en: 'Release Escrow', ja: 'エスクロー精算' },

  // ─── XRF Terminal ─────────────────────────────────
  'xrf.dpu.return': { ko: 'DPU 회수액', en: 'DPU Return', ja: 'DPU 回収額' },
  'xrf.lp.roi': { ko: 'LP 수익률', en: 'LP ROI', ja: 'LP 利回り' },
  'xrf.duration': { ko: '운용기간', en: 'Duration', ja: '運用期間' },
  'xrf.ai.risk': { ko: 'AI 리스크 점수', en: 'AI Risk Score', ja: 'AI リスクスコア' },

  // ─── Errors ───────────────────────────────────────
  'error.unauthorized': { ko: '로그인이 필요합니다', en: 'Login required', ja: 'ログインが必要です' },
  'error.forbidden': { ko: '접근 권한이 없습니다', en: 'Forbidden', ja: 'アクセス権限がありません' },
  'error.notFound': { ko: '찾을 수 없습니다', en: 'Not found', ja: '見つかりません' },
  'error.validation': { ko: '입력값이 유효하지 않습니다', en: 'Invalid input', ja: '入力値が無効です' },
  'error.internal': { ko: '서버 오류가 발생했습니다', en: 'Server error', ja: 'サーバーエラーが発生しました' },
}

/**
 * 메시지 조회. key 없으면 key 자체 반환 (fallback).
 */
export function t(key: string, locale: Locale = 'ko'): string {
  const entry = MESSAGES[key]
  return entry?.[locale] ?? entry?.ko ?? key
}

/**
 * 브라우저 lang 감지 → Locale 매핑. SSR 안전.
 */
export function detectLocale(): Locale {
  if (typeof document === 'undefined') return 'ko'
  const raw = (document.documentElement.lang || 'ko').toLowerCase().slice(0, 2)
  return raw === 'en' ? 'en' : raw === 'ja' ? 'ja' : 'ko'
}
