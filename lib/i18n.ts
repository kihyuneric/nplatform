import { useEffect, useState } from 'react'

export type Locale = 'ko' | 'en' | 'ja'

// ─── 정적 번역 사전 (API 없이 즉시 반환) ──────────────────────────
const STATIC_DICT: Record<string, Record<string, string>> = {
  en: {
    'NPL마켓': 'NPL Market', '거래매칭': 'Deal Matching', '시장분석': 'Market Analysis',
    '커뮤니티': 'Community', '내 정보': 'My Info', '마이': 'My', '분석도구': 'Tools',
    '거래소': 'Exchange', '분석': 'Analysis', '마이 페이지': 'My Page',
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
    '거래소': 'エクスチェンジ', '분석': '分析', '마이 페이지': 'マイページ',
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
    // ── Actions ────────────────────────────────────────────────
    '검색': '検索', '초기화': 'リセット', '필터': 'フィルター', '정렬': '並べ替え',
    '적용': '適用', '다운로드': 'ダウンロード', '내보내기': 'エクスポート', '불러오기': 'インポート',
    '복사': 'コピー', '공유': '共有', '새로고침': '更新', '이전': '前へ',
    '다음': '次へ', '더 보기': 'もっと見る', '전체 보기': 'すべて見る', '상세 보기': '詳細を見る',
    // ── Exchange ───────────────────────────────────────────────
    '아파트': 'アパート', '오피스텔': 'オフィステル', '상가': '商業施設', '토지': '土地',
    '공장': '工場', '기타': 'その他', '부실채권': '不良債権',
    '감정가': '鑑定価格', '최저입찰가': '最低入札価格', '채권금액': '債権金額',
    '낙찰가율': '落札率', '할인율': '割引率', '위험등급': 'リスクグレード',
    '지역': '地域', '유형': 'タイプ', '가격': '価格', '등급': 'グレード',
    '활성': '公開中', '임시저장': '下書き', '숨김': '非公開', '매각완료': '売却済み',
    '보관됨': 'アーカイブ', '승인대기': '承認待ち', '심사중': '審査中',
    // ── Analysis ───────────────────────────────────────────────
    '수익률': '収益率', '내부수익률': '内部収益率', '투자회수기간': '投資回収期間',
    '손익분기': '損益分岐点', '순이익': '純利益', '취득비용': '取得費用',
    '예상시세': '予想市場価格', '낮음': '低', '중간': '中', '높음': '高',
    '투자 추천': '投資推奨', '투자 검토': '検討中', '투자 위험': '要注意',
    '투자 부적합': '不適合', '입찰가율': '入札率%',
    // ── Deal stages ────────────────────────────────────────────
    '초기 협의': '初期協議', 'NDA 체결': 'NDA締結', 'LOI 제출': 'LOI提出',
    '실사 진행': 'デューデリジェンス', '계약 체결': '契約締結', '클로징': 'クロージング',
    '거래 완료': '取引完了', '거래 취소': '取引キャンセル',
    // ── Portfolio / KYC ────────────────────────────────────────
    '총 투자액': '総投資額', '평균 ROI': '平均収益率', '진행 중': '進行中', '완료': '完了',
    '관심 매물': 'お気に入り', '투자 현황': '投資状況', '비교 분析': '比較分析',
    '수익 시뮬레이션': '収益シミュレーション', '본인인증': '本人確認',
    '투자자 인증': '投資家認証', '심사 대기': '審査待ち', '인증 완료': '認証済み',
    '대부업체': '貸金業者', '전문 투자자': 'プロ投資家', '일반 투자자': '一般投資家',
    // ── Status ─────────────────────────────────────────────────
    '로딩 중...': '読み込み中...', '데이터가 없습니다.': 'データがありません。',
    '오류가 발생했습니다.': 'エラーが発生しました。', '다시 시도': '再試行',
    '성공': '成功', '실패': '失敗', '경고': '警告', '읽지 않음': '未読', '전체': 'すべて',
  },
}

// ── 거래소 페이지 번역 추가 ────────────────────────────────────────────
Object.assign(STATIC_DICT.en, {
  // 거래소 헤더
  '규제 준수형 NPL 거래소': 'Regulatory-Compliant NPL Exchange',
  '담보 정보는 공개 · 개인정보는 자동 마스킹.': 'Collateral info is public · PII is auto-masked.',
  '4단계 티어 모델': '4-Tier Access Model',
  '로 규제 준수와 거래 편의를 동시에 확보합니다.': 'ensures both compliance and transaction convenience.',
  '매물 등록': 'List Property',
  '지도에서 보기': 'View on Map',
  '전체 매물': 'Total Listings',
  '실시간': 'Live',
  '평균 할인율': 'Avg. Discount',
  '채권잔액 대비': 'vs. Principal',
  '평균 완성도': 'Avg. Completeness',
  '자료 제공 지수': 'Data Quality Index',
  '참여 기관': 'Institutions',
  '은행·AMC': 'Banks & AMCs',
  // 필터
  '매물 유형': 'Listing Type',
  '담보 유형': 'Collateral Type',
  '전체': 'All',
  'NPL': 'NPL',
  '일반 부동산': 'General Real Estate',
  '주거용': 'Residential',
  '상업/산업용': 'Commercial / Industrial',
  '토지': 'Land',
  '기타': 'Other',
  '기관 유형': 'Institution Type',
  '매각 방식': 'Sale Method',
  '최소 자료 완성도': 'Min. Data Completeness',
  '세부': 'Sub',
  '적용 필터:': 'Active:',
  '전체 초기화': 'Clear All',
  // 담보 소분류
  '아파트': 'Apartment',
  '오피스텔(주거용)': 'Officetel (Residential)',
  '빌라·연립': 'Villa / Row House',
  '단독·다가구': 'Detached / Multi-family',
  '도시형생활주택': 'Urban Living Housing',
  '근린시설/상가': 'Commercial / Retail',
  '사무실/사무소': 'Office',
  '오피스텔(업무용)': 'Officetel (Commercial)',
  '상업용빌딩': 'Commercial Building',
  '공장/창고': 'Factory / Warehouse',
  '호텔/숙박': 'Hotel / Accommodation',
  '대지': 'Lot',
  '임야': 'Forest / Mountain',
  '농지(전/답)': 'Farmland',
  '잡종지': 'Mixed-use Land',
  // 정렬
  '최신순': 'Newest',
  '할인율 높은순': 'Highest Discount',
  '완성도 높은순': 'Best Quality',
  '채권잔액 큰순': 'Largest Principal',
  // 카드
  '채권잔액': 'Principal',
  '매각희망가': 'Asking Price',
  '감정가': 'Appraised Value',
  '할인율': 'Discount Rate',
  '예상 절감액': 'Est. Savings',
  '상세 보기': 'View Details',
  '건 매칭': 'matches',
  '카드': 'Card',
  '리스트': 'List',
  '수수료 상한 매도·매수 각 0.9% 적용': 'Seller & Buyer fee cap 0.9% each',
  // 매물 등록
  '기관 확인': 'Institution',
  '담보 · 지역': 'Collateral & Region',
  '채권 · 금액': 'Bond & Amount',
  '채권상세·권리': 'Bond Detail & Rights',
  '선택 자료': 'Optional Docs',
  '검토 · 제출': 'Review & Submit',
  '규제 준수형 매물 등록': 'Regulatory-Compliant Listing',
  // 상세 페이지
  '다음 단계': 'Next Steps',
  'NDA 체결': 'Sign NDA',
  'LOI 제출': 'Submit LOI',
  '딜룸 입장': 'Enter Deal Room',
  'AI 상세 분석 요청': 'Request AI Analysis',
  '관심 매물 등록됨': '♥ Watchlisted',
  '관심 매물 담기': 'Add to Watchlist',
  'AI 투자 분석': 'AI Investment Analysis',
  'Claude NPL Engine · 실시간': 'Claude NPL Engine · Live',
  '예상 회수율': 'Est. Recovery Rate',
  'AI 권고 입찰가': 'AI Recommended Bid',
  '이상 징후 없음': 'No Anomalies',
  '주의 필요': 'Caution Required',
  '매칭 수요': 'Matching Demand',
  '매수자 수수료 안내': 'Buyer Fee Info',
  '기준 거래가': 'Reference Price',
  '수수료율': 'Fee Rate',
  '예상 수수료': 'Est. Fee',
  '기본 수수료': 'Base Fee',
  '거래 성사 시': 'Upon Closing',
  '에스크로 계좌로 자동 정산': 'Auto-settled via Escrow',
  '제공 자료': 'Documents Provided',
  '감정평가서': 'Appraisal Report',
  '등기부등본': 'Registry Document',
  '권리관계': 'Rights Summary',
  '임차현황': 'Tenancy Status',
  '현장사진': 'Site Photos',
  '재무자료': 'Financial Data',
  // 마이페이지
  '내 대시보드': 'My Dashboard',
  '총 거래 금액': 'Total Deal Value',
  '진행 중인 거래': 'Active Deals',
  '관심 매물': 'Watchlist',
  '완료된 거래': 'Completed Deals',
  '최근 활동': 'Recent Activity',
  '내 거래 현황': 'My Deal Status',
  '샘플 데이터 표시 중': 'Showing Sample Data',
  '로그인 후 실제 데이터가 표시됩니다': 'Login to see real data',
  '로그인하기': 'Login',
  // NPL 분석
  'NPL 수익성 분석': 'NPL Profitability Analysis',
  '채권번호': 'Bond No.',
  '샘플 데이터로 시작': 'Start with Sample',
  '분석 시작': 'Start Analysis',
  '수익성 분석 결과': 'Profitability Analysis Result',
  '순수익': 'Net Profit',
  '투자 수익률': 'ROI',
  '내부수익률': 'IRR',
  '손익분기': 'Break-Even',
  '리스크 등급': 'Risk Grade',
  '시나리오 분석': 'Scenario Analysis',
  'AI 예측': 'AI Prediction',
  'AI 서술 분석': 'AI Narrative Analysis',
  '보수적': 'Conservative',
  '기본': 'Base Case',
  '공격적': 'Aggressive',
  '낙관적': 'Optimistic',
  '비관적': 'Pessimistic',
})

Object.assign(STATIC_DICT.ja, {
  // 거래소 헤더
  '규제 준수형 NPL 거래소': '規制準拠型 NPLエクスチェンジ',
  '담보 정보는 공개 · 개인정보는 자동 마스킹.': '担保情報は公開・個人情報は自動マスキング。',
  '4단계 티어 모델': '4段階ティアモデル',
  '로 규제 준수와 거래 편의를 동시에 확보합니다.': 'により規制準拠と取引利便性を両立します。',
  '매물 등록': '物件登録',
  '지도에서 보기': '地図で見る',
  '전체 매물': '全物件',
  '실시간': 'リアルタイム',
  '평균 할인율': '平均割引率',
  '채권잔액 대비': '債権残高比',
  '평균 완성도': '平均完成度',
  '자료 제공 지수': '資料提供指数',
  '참여 기관': '参加機関',
  '은행·AMC': '銀行・AMC',
  '매물 유형': '物件タイプ',
  '담보 유형': '担保タイプ',
  '전체': 'すべて',
  '주거용': '住宅用',
  '상업/산업용': '商業・産業用',
  '토지': '土地',
  '기관 유형': '機関タイプ',
  '매각 방식': '売却方法',
  '최소 자료 완성도': '最低資料完成度',
  '세부': '詳細',
  '적용 필터:': '適用フィルター:',
  '전체 초기화': 'すべてリセット',
  '아파트': 'アパート',
  '오피스텔(주거용)': 'オフィステル(住宅用)',
  '빌라·연립': 'ビラ・連立',
  '단독·다가구': '一戸建て・多世帯',
  '도시형생활주택': '都市型生活住宅',
  '근린시설/상가': '近隣施設・商業',
  '사무실/사무소': 'オフィス',
  '오피스텔(업무용)': 'オフィステル(業務用)',
  '상업용빌딩': '商業ビル',
  '공장/창고': '工場・倉庫',
  '호텔/숙박': 'ホテル・宿泊',
  '대지': '宅地',
  '임야': '山林',
  '농지(전/답)': '農地',
  '잡종지': '雑種地',
  '최신순': '最新順',
  '할인율 높은순': '割引率高い順',
  '완성도 높은순': '完成度高い順',
  '채권잔액 큰순': '債権残高大きい順',
  '채권잔액': '債権残高',
  '매각희망가': '売却希望価格',
  '감정가': '鑑定価格',
  '할인율': '割引率',
  '예상 절감액': '予想節約額',
  '상세 보기': '詳細を見る',
  '건 매칭': '件マッチ',
  '카드': 'カード',
  '리스트': 'リスト',
  '기관 확인': '機関確認',
  '담보 · 지역': '担保・地域',
  '채권 · 금액': '債権・金額',
  '선택 자료': '任意書類',
  '검토 · 제출': '確認・提出',
  '다음 단계': '次のステップ',
  'NDA 체결': 'NDA締結',
  'LOI 제출': 'LOI提出',
  '딜룸 입장': 'ディールルームへ',
  'AI 투자 분석': 'AI投資分析',
  '예상 회수율': '予想回収率',
  'AI 권고 입찰가': 'AI推奨入札価格',
  '이상 징후 없음': '異常なし',
  '주의 필요': '要注意',
  '매수자 수수료 안내': '買主手数料案内',
  '기준 거래가': '基準取引価格',
  '수수료율': '手数料率',
  '예상 수수료': '予想手数料',
  '기본 수수료': '基本手数料',
  '내 대시보드': 'マイダッシュボード',
  '총 거래 금액': '総取引金額',
  '진행 중인 거래': '進行中取引',
  '완료된 거래': '完了取引',
  'NPL 수익성 분석': 'NPL収益性分析',
  '채권번호': '債権番号',
  '분석 시작': '分析開始',
  '수익성 분석 결과': '収益性分析結果',
  '순수익': '純利益',
  '투자 수익률': '投資収益率',
  '리스크 등급': 'リスクグレード',
  '시나리오 분석': 'シナリオ分析',
  'AI 예측': 'AI予測',
  '보수적': '保守的',
  '기본': 'ベースケース',
  '공격적': '積極的',
})

// ── 영어 사전 추가 항목 (위 STATIC_DICT.en에 병합) ──────────────────────
Object.assign(STATIC_DICT.en, {
  // ── Actions ────────────────────────────────────────────────
  '검색': 'Search', '초기화': 'Reset', '필터': 'Filter', '정렬': 'Sort',
  '적용': 'Apply', '다운로드': 'Download', '내보내기': 'Export', '불러오기': 'Import',
  '복사': 'Copy', '공유': 'Share', '새로고침': 'Refresh', '이전': 'Previous',
  '다음': 'Next', '더 보기': 'Load more', '전체 보기': 'View all', '상세 보기': 'View details',
  // ── Exchange ───────────────────────────────────────────────
  '아파트': 'Apartment', '오피스텔': 'Officetel', '상가': 'Commercial', '토지': 'Land',
  '공장': 'Factory', '기타': 'Other', '부실채권': 'Non-Performing Loan',
  '감정가': 'Appraised Value', '최저입찰가': 'Min. Bid Price', '채권금액': 'Principal Amount',
  '낙찰가율': 'Bid Rate', '할인율': 'Discount Rate', '위험등급': 'Risk Grade',
  '지역': 'Region', '유형': 'Type', '가격': 'Price', '등급': 'Grade',
  '활성': 'Active', '임시저장': 'Draft', '숨김': 'Hidden', '매각완료': 'Sold',
  '보관됨': 'Archived', '승인대기': 'Pending', '심사중': 'Under Review',
  // ── Analysis ───────────────────────────────────────────────
  '수익률': 'ROI', '내부수익률': 'IRR', '투자회수기간': 'Payback Period',
  '손익분기': 'Break-Even', '순이익': 'Net Profit', '취득비용': 'Acquisition Cost',
  '예상시세': 'Expected Market Value', '낮음': 'Low', '중간': 'Medium', '높음': 'High',
  '투자 추천': 'Recommended', '투자 검토': 'Under Review', '투자 위험': 'Risky',
  '투자 부적합': 'Not Suitable', '입찰가율': 'Bid Rate %',
  // ── Deal stages ────────────────────────────────────────────
  '초기 협의': 'Initial Discussion', 'NDA 체결': 'NDA Signed', 'LOI 제출': 'LOI Submitted',
  '실사 진행': 'Due Diligence', '계약 체결': 'Contract Signed', '클로징': 'Closing',
  '거래 완료': 'Completed', '거래 취소': 'Cancelled',
  // ── Portfolio / KYC ────────────────────────────────────────
  '총 투자액': 'Total Investment', '평균 ROI': 'Average ROI', '진행 중': 'In Progress', '완료': 'Completed',
  '관심 매물': 'Watchlist', '투자 현황': 'Portfolio Status', '비교 분析': 'Comparison Analysis',
  '수익 시뮬레이션': 'Profit Simulation', '본인인증': 'Identity Verification',
  '투자자 인증': 'Investor Verification', '심사 대기': 'Awaiting Review', '인증 완료': 'Verified',
  '대부업체': 'Money Lender', '전문 투자자': 'Professional Investor', '일반 투자자': 'General Investor',
  // ── Status ─────────────────────────────────────────────────
  '로딩 중...': 'Loading...', '데이터가 없습니다.': 'No data available.',
  '오류가 발생했습니다.': 'An error occurred.', '다시 시도': 'Try again',
  '성공': 'Success', '실패': 'Failed', '경고': 'Warning', '읽지 않음': 'Unread', '전체': 'All',
})

// ── EN 대규모 확장 ─────────────────────────────────────────────────────────
Object.assign(STATIC_DICT.en, {
  // ── Analysis tools ─────────────────────────────────────────────────────
  '인사이트 · 분석 대시보드': 'Insights & Analysis Dashboard',
  'NPL 수익성 분석 · 경매 수익률 계산기 · AI 딜 코파일럿 · OCR 문서 인식까지 — 모든 분석 도구를 한 곳에서': 'NPL Profitability · Auction ROI Calculator · AI Deal Copilot · OCR — all analysis tools in one place',
  'AI 분석 완료': 'AI Analyses Done',
  '평균 예측 정확도': 'Avg. Prediction Accuracy',
  '이번 달 분석': 'Analyses This Month',
  '평균 소요 시간': 'Avg. Processing Time',
  '분석 도구': 'Analysis Tools',
  '데모 체험': 'Try Demo',
  '분석 시작': 'Start Analysis',
  '샘플 결과 보기': 'View Sample Result',
  '데모 프리셋 체험': 'Try Demo Preset',
  'AI 질문 체험': 'Try AI Q&A',
  '최근 분석 내역': 'Recent Analyses',
  'NPL 수익성 분석': 'NPL Profitability Analysis',
  '경매 수익률 분석기': 'Auction ROI Analyzer',
  'NPL 가격지수 (NBI)': 'NPL Price Index (NBI)',
  '실사 체크리스트': 'Due Diligence Checklist',
  'AI 딜 코파일럿': 'AI Deal Copilot',
  '계약서 자동 검토': 'Auto Contract Review',
  'OCR 문서 인식': 'OCR Document Extraction',
  // Profitability form
  '채권 기본 정보': 'Bond Information',
  '담보물 정보': 'Collateral Information',
  '딜 조건 설정': 'Deal Conditions',
  'AI 분석 옵션': 'AI Analysis Options',
  '채권번호': 'Bond No.',
  '채권 잔여 원금': 'Remaining Principal',
  '총 채권액': 'Total Claim Amount',
  '연체 원금': 'Overdue Principal',
  '연체 이자': 'Overdue Interest',
  '연체 일수': 'Days Past Due',
  '매입률': 'Purchase Rate',
  '매입가': 'Purchase Price',
  '예상 낙찰가율': 'Expected Bid Rate',
  '예상 경매 기간': 'Expected Auction Period',
  '보유 기간': 'Holding Period',
  '선순위 채권': 'Senior Claim',
  '임차인 보증금': 'Tenant Deposit',
  '배당 순서': 'Distribution Order',
  '배당 분석': 'Distribution Analysis',
  '워터폴 차트': 'Waterfall Chart',
  '시나리오 분석': 'Scenario Analysis',
  '강세 시나리오': 'Bull Scenario',
  '기준 시나리오': 'Base Scenario',
  '약세 시나리오': 'Bear Scenario',
  'Monte Carlo 시뮬레이션': 'Monte Carlo Simulation',
  '손실 확률': 'Loss Probability',
  'AI 투자의견': 'AI Investment Opinion',
  'AI 투자의견 서술': 'AI Investment Narrative',
  '투자 의견': 'Investment Opinion',
  'IRR': 'IRR',
  'ROI': 'ROI',
  '연환산 수익률': 'Annualized ROI',
  '회수 예상액': 'Expected Recovery',
  '손익분기점': 'Break-Even Point',
  '투자 적합': 'Investment Suitable',
  '투자 부적합': 'Not Suitable',
  // Auction Simulator
  '경매 수익률 분석기 v2.0': 'Auction ROI Analyzer v2.0',
  '2024 세율 적용': '2024 Tax Rates Applied',
  '취득세·양도세·중개보수·법무사비용 자동 계산 — 15가지 부동산 유형 지원': 'Auto-calc acquisition tax, transfer tax, broker & legal fees — 15 property types',
  '프리셋': 'Presets',
  '시나리오 저장': 'Save Scenario',
  '초기화': 'Reset',
  '기본 정보': 'Basic Info',
  '부동산 유형': 'Property Type',
  '감정가': 'Appraised Value',
  '낙찰가': 'Winning Bid',
  '예상 매각가': 'Expected Sale Price',
  '조정대상지역': 'Regulated Area',
  '2주택 이상 시 중과 적용': 'Heavy tax applies for 2+ homes',
  '매입자 유형': 'Buyer Type',
  '개인 (양도소득세)': 'Individual (Capital Gains Tax)',
  '매매사업자 (종합소득세)': 'Business (Income Tax)',
  '고급 설정 (비용·대출)': 'Advanced (Costs & Loan)',
  '선순위채권': 'Senior Debt',
  '수리·인테리어 비용': 'Repair / Renovation',
  '경매 비용': 'Auction Costs',
  '법무사 비용 (직접 입력)': 'Legal Fees (manual)',
  '자동 계산값': 'Auto-calculated',
  '대출 조건': 'Loan Terms',
  '대출금액': 'Loan Amount',
  '대출 금리 (연)': 'Annual Interest Rate',
  '중도상환수수료율': 'Prepayment Fee Rate',
  '예상 수익률': 'Expected ROI',
  '순 수익': 'Net Profit',
  '총 투자금': 'Total Investment',
  '낙찰가율': 'Bid Rate',
  '비용 구성': 'Cost Breakdown',
  '세금 상세': 'Tax Details',
  '취득세': 'Acquisition Tax',
  '지방교육세': 'Local Education Tax',
  '농어촌특별세': 'Rural Special Tax',
  '양도소득세': 'Capital Gains Tax',
  '지방소득세': 'Local Income Tax',
  '세금 합계': 'Total Tax',
  '낙찰가별 수익률 (민감도 분석)': 'ROI by Bid Price (Sensitivity Analysis)',
  '저장된 시나리오 비교': 'Saved Scenario Comparison',
  '수익 구조 분석': 'Profit Structure Analysis',
  '비용 항목별 누적 손익 폭포차트': 'Cumulative P&L waterfall by cost item',
  '낙찰가율별 수익률 곡선': 'ROI Curve by Bid Rate',
  '입찰가 변화에 따른 ROI 민감도 — 최적 입찰가율 탐색': 'ROI sensitivity by bid price — find optimal bid rate',
  '현재': 'Current',
  '딜룸 연동됨': 'Linked to Deal Room',
  '이 분석 결과를 딜룸에 첨부할 수 있습니다': 'You can attach this analysis to the deal room',
  '딜룸으로 이동': 'Go to Deal Room',
  // Copilot
  'NPL 코파일럿': 'NPL Copilot',
  'AI NPL Copilot': 'AI NPL Copilot',
  '새 대화 시작': 'New Conversation',
  '최근 대화': 'Recent Chats',
  'NPL 투자 분석, 리스크 검토, 전략 수립을 AI와 함께': 'NPL investment analysis, risk review, and strategy — with AI',
  '아래 예시 질문을 클릭하면 바로 체험할 수 있습니다 — 로그인 불필요': 'Click an example below to try instantly — no login required',
  '물건 분석': 'Property Analysis',
  '수익률 계산': 'ROI Calculation',
  '법률 리스크': 'Legal Risk',
  '체험 추천': 'Try This',
  '클릭하여 전송 →': 'Click to send →',
  '분석 중...': 'Analyzing...',
  'NPL 분석에 대해 무엇이든 물어보세요...': 'Ask anything about NPL analysis...',
  'Enter: 전송 · Shift+Enter: 줄바꿈 · AI 응답은 참고용입니다.': 'Enter: send · Shift+Enter: newline · AI responses are for reference only.',
  // OCR
  '문서를 업로드하면 AI가 자동으로 핵심 데이터를 추출합니다': 'Upload documents to auto-extract key data with AI',
  '등기부등본 업로드': 'Upload Registry Document',
  '감정평가서 업로드': 'Upload Appraisal Report',
  '채권원장 업로드': 'Upload Bond Ledger',
  'PDF · 이미지 업로드': 'Upload PDF · Image',
  '드래그하거나 클릭하여 업로드': 'Drag or click to upload',
  '지원 형식: PDF, JPG, PNG, DOCX, HWP': 'Supported: PDF, JPG, PNG, DOCX, HWP',
  '추출 결과': 'Extraction Results',
  '분석에 연결': 'Link to Analysis',
  // Contract Review
  '계약서를 업로드하면 AI가 위험 조항을 자동 감지합니다': 'Upload a contract for AI to auto-detect risky clauses',
  '위험 조항': 'Risky Clause',
  '표준 조항': 'Standard Clause',
  '검토 의견': 'Review Comment',
  '수정 제안': 'Suggested Revision',
  '고위험': 'High Risk',
  '중위험': 'Medium Risk',
  '저위험': 'Low Risk',
  // Due Diligence
  '완료율': 'Completion Rate',
  '항목 완료': 'Items Done',
  '미완료': 'Incomplete',
  '리스크 감지': 'Risk Detected',
  '현장 실사': 'Site Inspection',
  '등기·권리 검토': 'Registry & Rights Review',
  '임대차 확인': 'Tenancy Verification',
  '법적 리스크': 'Legal Risk',
  '환경 리스크': 'Environmental Risk',
  // ── My page ──────────────────────────────────────────────────────────────
  '내 정보': 'My Account',
  '마이페이지': 'My Page',
  '내 대시보드': 'My Dashboard',
  '총 투자 금액': 'Total Investment',
  '진행 중인 거래': 'Active Deals',
  '완료된 거래': 'Completed Deals',
  '관심 매물': 'Watchlist',
  '최근 활동': 'Recent Activity',
  '내 거래 현황': 'My Deal Status',
  '샘플 데이터 표시 중': 'Showing Sample Data',
  '로그인 후 실제 데이터가 표시됩니다': 'Login to see real data',
  '로그인하기': 'Login',
  // Portfolio
  '포트폴리오': 'Portfolio',
  '관심 매물 탭': 'Watchlist',
  '투자 현황': 'Investment Status',
  '비교 분析': 'Comparison Analysis',
  '비교 분석': 'Comparison Analysis',
  '수익 시뮬레이션': 'Profit Simulation',
  '전체 투자 수익률': 'Total Portfolio ROI',
  '가중평균 리스크등급': 'Weighted Avg. Risk Grade',
  '총 투자 건수': 'Total Investments',
  '지역별 분포': 'Regional Distribution',
  '유형별 분포': 'Type Distribution',
  // Billing
  '구독·결제': 'Billing',
  '현재 요금제': 'Current Plan',
  '무료': 'Free',
  '기본': 'Basic',
  '프로': 'Pro',
  '엔터프라이즈': 'Enterprise',
  '다음 갱신일': 'Next Renewal',
  '결제 수단': 'Payment Method',
  '청구서': 'Invoice',
  '인보이스': 'Invoice',
  '결제 내역': 'Payment History',
  '크레딧': 'Credits',
  '잔여 크레딧': 'Remaining Credits',
  '크레딧 충전': 'Buy Credits',
  '요금제 변경': 'Change Plan',
  '구독 취소': 'Cancel Subscription',
  // KYC
  'KYC 인증': 'KYC Verification',
  '본인인증': 'Identity Verification',
  '투자자 인증': 'Investor Verification',
  '신분증 업로드': 'Upload ID',
  '사업자등록증': 'Business Registration',
  '재무제표': 'Financial Statement',
  '제출 완료': 'Submitted',
  '심사 대기': 'Awaiting Review',
  '승인됨': 'Approved',
  '반려됨': 'Rejected',
  '인증 완료': 'Verified',
  '인증 미완료': 'Not Verified',
  'L0 - 기본': 'L0 - Basic',
  'L1 - 인증 투자자': 'L1 - Verified Investor',
  'L2 - 전문 투자자': 'L2 - Professional Investor',
  'L3 - 기관': 'L3 - Institution',
  // Notifications
  '알림 설정': 'Notification Settings',
  '이메일 알림': 'Email Notifications',
  '인앱 알림': 'In-App Notifications',
  'SMS 알림': 'SMS Notifications',
  '새 매물 알림': 'New Listing Alert',
  '거래 업데이트': 'Deal Updates',
  '시스템 공지': 'System Notice',
  '모두 읽음': 'Mark All Read',
  '읽지 않은 알림': 'Unread Notifications',
  // Settings
  '계정 설정': 'Account Settings',
  '비밀번호 변경': 'Change Password',
  '현재 비밀번호': 'Current Password',
  '새 비밀번호': 'New Password',
  '비밀번호 확인': 'Confirm Password',
  '언어 설정': 'Language',
  '테마': 'Theme',
  '라이트 모드': 'Light Mode',
  '다크 모드': 'Dark Mode',
  '시스템 설정': 'System Default',
  '개인정보 처리방침': 'Privacy Policy',
  '이용약관': 'Terms of Service',
  '탈퇴': 'Delete Account',
  '탈퇴하기': 'Delete My Account',
  // Seller
  '매도자 관리': 'Seller Management',
  '내 매물': 'My Listings',
  '등록 매물': 'Listed Properties',
  '조회수': 'Views',
  '관심수': 'Watchlisted',
  '문의수': 'Inquiries',
  '정산 현황': 'Settlement Status',
  '정산 완료': 'Settled',
  '정산 대기': 'Awaiting Settlement',
  // Partner
  '파트너': 'Partner',
  '추천 코드': 'Referral Code',
  '추천 현황': 'Referral Status',
  '총 추천수': 'Total Referrals',
  '추천 수익': 'Referral Earnings',
  '리더보드': 'Leaderboard',
  // Developer
  'API 키': 'API Key',
  'API 키 발급': 'Generate API Key',
  'API 키 삭제': 'Delete API Key',
  '사용량': 'Usage',
  '일일 한도': 'Daily Limit',
  '월간 사용량': 'Monthly Usage',
  '엔드포인트': 'Endpoint',
  '요청 성공': 'Successful Requests',
  '요청 실패': 'Failed Requests',
  '평균 응답시간': 'Avg. Response Time',
  // Professional
  '전문가 등록': 'Register as Expert',
  '변호사': 'Attorney',
  '법무사': 'Legal Clerk',
  '세무사': 'Tax Accountant',
  '감정평가사': 'Appraiser',
  '공인중개사': 'Licensed Realtor',
  '자격증 업로드': 'Upload Certificate',
  '경력 사항': 'Career History',
  '소개글': 'Introduction',
  '전문 분야': 'Specialization',
  // ── Deals ─────────────────────────────────────────────────────────────
  '거래 목록': 'Deals',
  '진행 중': 'In Progress',
  '거래 단계': 'Deal Stage',
  '거래 ID': 'Deal ID',
  '매도자': 'Seller',
  '매수자': 'Buyer',
  '담당자': 'Manager',
  '거래 금액': 'Deal Amount',
  '예상 완료일': 'Expected Close Date',
  '단계 변경': 'Change Stage',
  '거래 취소': 'Cancel Deal',
  '딜룸': 'Deal Room',
  '메시지': 'Message',
  '파일 첨부': 'Attach File',
  '거래 계약': 'Deal Contract',
  '전자서명': 'e-Signature',
  'NDA': 'NDA',
  'LOI': 'LOI',
  '계약서': 'Contract',
  '매매계약서': 'Purchase Agreement',
  '채권양도계약서': 'Bond Assignment Agreement',
  // ── Exchange sub-pages ──────────────────────────────────────────────
  '법원 경매 정보': 'Court Auction Info',
  '경매 일정': 'Auction Schedule',
  '경매 사건번호': 'Case No.',
  '물건 명칭': 'Property Name',
  '최저매각가격': 'Minimum Sale Price',
  '입찰 보증금': 'Bid Deposit',
  '경매 일시': 'Auction Date',
  '담당 법원': 'Court',
  '매수 수요 등록': 'Register Buy Demand',
  '원하는 조건': 'Desired Conditions',
  '투자 예산': 'Investment Budget',
  '선호 지역': 'Preferred Region',
  '선호 담보 유형': 'Preferred Collateral Type',
  '목표 수익률': 'Target ROI',
  '매칭 결과': 'Matching Results',
  // ── Statistics ────────────────────────────────────────────────────────
  '시장 동향': 'Market Trends',
  '전국 평균 낙찰가율': 'National Avg. Bid Rate',
  '전국 낙찰률': 'National Closing Rate',
  '거래량 추이': 'Transaction Volume Trend',
  '지역별 히트맵': 'Regional Heatmap',
  '기간 선택': 'Select Period',
  '1개월': '1 Month',
  '3개월': '3 Months',
  '6개월': '6 Months',
  '1년': '1 Year',
  '전년 대비': 'YoY',
  '전월 대비': 'MoM',
  // ── NPL Financial Terms ──────────────────────────────────────────────
  'NPL': 'NPL',
  '부실채권': 'Non-Performing Loan',
  '론세일': 'Loan Sale',
  '자산유동화': 'Asset Securitization',
  '근저당': 'Collateral Mortgage',
  '선순위 근저당': 'Senior Mortgage',
  '후순위 근저당': 'Junior Mortgage',
  '임차인': 'Tenant',
  '선순위': 'Senior',
  '후순위': 'Junior',
  '배당': 'Distribution',
  '배당표': 'Distribution Table',
  '낙찰': 'Winning Bid',
  '유찰': 'No Sale',
  '재경매': 'Re-auction',
  '명도': 'Eviction',
  '인도': 'Delivery',
  '청산': 'Liquidation',
  '회수율': 'Recovery Rate',
  '원금 손실률': 'Principal Loss Rate',
  '담보 비율': 'Collateral Ratio',
  'LTV': 'LTV',
  'LTV (담보인정비율)': 'LTV (Loan-to-Value)',
  '채무자': 'Debtor',
  '채권자': 'Creditor',
  '채권 양도': 'Bond Assignment',
  '채권 매입': 'Bond Purchase',
  '경락대금': 'Auction Proceeds',
  '배당 청구': 'Distribution Claim',
  // ── Guide / Knowledge ─────────────────────────────────────────────────
  '가이드': 'Guide',
  'NPL 투자 가이드': 'NPL Investment Guide',
  '초보자 가이드': 'Beginner Guide',
  '용어 사전': 'Glossary',
  '투자 케이스': 'Investment Cases',
  '성공 사례': 'Success Stories',
  '실패 사례': 'Lessons Learned',
  '법률 자료': 'Legal Resources',
  '세금 가이드': 'Tax Guide',
  '경매 가이드': 'Auction Guide',
  '직접 해보기': 'Try It Now',
  '다음 단계': 'Next Steps',
  '이전 단계': 'Previous Step',
  // ── UI Patterns ───────────────────────────────────────────────────────
  '데모 체험 모드': 'Demo Mode',
  '실제 분석 시작 →': 'Start Real Analysis →',
  '데모 체험 모드 — 실제 매물이 아닙니다': 'Demo Mode — This is not a real listing',
  '샘플 매물': 'Sample Listings',
  '로그인 없이 체험': 'Try Without Login',
  '지금 시작': 'Get Started',
  '무료로 시작': 'Start Free',
  '도움이 필요하신가요?': 'Need help?',
  '고객센터에 문의하기': 'Contact Support',
  '처음으로': 'Back to Start',
  '분석으로 돌아가기': 'Back to Analysis',
  '목록으로 돌아가기': 'Back to List',
  '홈으로': 'Home',
  '페이지당': 'Per page',
  '총': 'Total',
  '건 중': 'of',
  '페이지': 'Page',
  '첫 페이지': 'First',
  '마지막 페이지': 'Last',
  // Error / Status
  '데이터를 불러오는 중...': 'Loading data...',
  '저장하는 중...': 'Saving...',
  '처리 중...': 'Processing...',
  '업로드 중...': 'Uploading...',
  '검색 중...': 'Searching...',
  '권한이 없습니다': 'Unauthorized',
  '페이지를 찾을 수 없습니다': 'Page not found',
  '서버 오류가 발생했습니다': 'Server error',
  '네트워크 오류': 'Network error',
  '입력값을 확인해주세요': 'Please check your inputs',
  '필수 항목입니다': 'This field is required',
  '저장되었습니다': 'Saved successfully',
  '삭제되었습니다': 'Deleted successfully',
  '제출되었습니다': 'Submitted successfully',
  '복사되었습니다': 'Copied to clipboard',
  '변경사항이 없습니다': 'No changes',
})

// ── JA 대규모 확장 ─────────────────────────────────────────────────────────
Object.assign(STATIC_DICT.ja, {
  // Analysis tools
  '인사이트 · 분석 대시보드': 'インサイト・分析ダッシュボード',
  'AI 분석 완료': 'AI分析完了',
  '평균 예측 정확도': '平均予測精度',
  '이번 달 분석': '今月の分析',
  '평균 소요 시간': '平均処理時間',
  '분석 도구': '分析ツール',
  '데모 체험': 'デモ体験',
  '샘플 결과 보기': 'サンプル結果を見る',
  '데모 프리셋 체험': 'デモプリセット体験',
  'AI 질문 체험': 'AI質問体験',
  '최근 분석 내역': '最近の分析履歴',
  'NPL 수익성 분석': 'NPL収益性分析',
  '경매 수익률 분석기': '競売収益分析器',
  'NPL 가격지수 (NBI)': 'NPL価格指数（NBI）',
  '실사 체크리스트': 'DDチェックリスト',
  'AI 딜 코파일럿': 'AIディールコパイロット',
  '계약서 자동 검토': '契約書自動チェック',
  'OCR 문서 인식': 'OCR文書認識',
  // Profitability form
  '채권 기본 정보': '債権基本情報',
  '담보물 정보': '担保物情報',
  '딜 조건 설정': 'ディール条件設定',
  'AI 분석 옵션': 'AI分析オプション',
  '채권 잔여 원금': '債権残余元金',
  '총 채권액': '総債権額',
  '연체 원금': '延滞元金',
  '연체 이자': '延滞利子',
  '연체 일수': '延滞日数',
  '매입률': '買入率',
  '매입가': '買入価格',
  '예상 낙찰가율': '予想落札率',
  '예상 경매 기간': '予想競売期間',
  '보유 기간': '保有期間',
  '선순위 채권': '先順位債権',
  '임차인 보증금': '賃借人保証金',
  '배당 순서': '配当順序',
  '배당 분析': '配当分析',
  '배당 분석': '配当分析',
  '워터폴 차트': 'ウォーターフォールチャート',
  '강세 시나리오': '強気シナリオ',
  '기준 시나리오': '基準シナリオ',
  '약세 시나리오': '弱気シナリオ',
  'Monte Carlo 시뮬레이션': 'モンテカルロシミュレーション',
  '손실 확률': '損失確率',
  'AI 투자의견': 'AI投資意見',
  'AI 투자의견 서술': 'AI投資意見叙述',
  '투자 의견': '投資意見',
  '연환산 수익률': '年換算収益率',
  '회수 예상액': '回収予想額',
  '손익분기점': '損益分岐点',
  '투자 적합': '投資適合',
  // Auction Simulator
  '경매 수익률 분석기 v2.0': '競売収益分析器 v2.0',
  '2024 세율 적용': '2024年税率適用',
  '프리셋': 'プリセット',
  '시나리오 저장': 'シナリオ保存',
  '기본 정보': '基本情報',
  '부동산 유형': '不動産タイプ',
  '낙찰가': '落札価格',
  '예상 매각가': '予想売却価格',
  '조정대상지역': '調整対象地域',
  '매입자 유형': '購入者タイプ',
  '개인 (양도소득세)': '個人（譲渡所得税）',
  '매매사업자 (종합소득세)': '事業者（総合所得税）',
  '고급 설정 (비용·대출)': '詳細設定（費用・ローン）',
  '선순위채권': '先順位債権',
  '수리·인테리어 비용': '修理・内装費',
  '경매 비용': '競売費用',
  '대출 조건': 'ローン条件',
  '대출금액': 'ローン金額',
  '대출 금리 (연)': '年利率',
  '중도상환수수료율': '繰上返済手数料率',
  '예상 수익률': '予想収益率',
  '순 수익': '純利益',
  '총 투자금': '総投資額',
  '비용 구성': '費用構成',
  '세금 상세': '税金詳細',
  '취득세': '取得税',
  '지방교육세': '地方教育税',
  '농어촌특별세': '農漁村特別税',
  '양도소득세': '譲渡所得税',
  '지방소득세': '地方所得税',
  '세금 합계': '税金合計',
  '낙찰가별 수익률 (민감도 분석)': '落札価格別収益率（感度分析）',
  '현재': '現在',
  '딜룸으로 이동': 'ディールルームへ',
  // Copilot
  'NPL 코파일럿': 'NPLコパイロット',
  '새 대화 시작': '新しい会話',
  '최근 대화': '最近の会話',
  '물건 분석': '物件分析',
  '수익률 계산': '収益率計算',
  '법률 리스크': '法律リスク',
  '체험 추천': 'おすすめ',
  '클릭하여 전송 →': 'クリックして送信 →',
  '분析 중...': '分析中...',
  // My page
  '내 정보': 'マイページ',
  '총 투자 금액': '総投資額',
  '최근 활동': '最近の活動',
  '내 거래 현황': '取引状況',
  '샘플 데이터 표시 중': 'サンプルデータ表示中',
  '로그인 후 실제 데이터가 표시됩니다': 'ログイン後に実データが表示されます',
  '로그인하기': 'ログイン',
  // Portfolio
  '투자 현황': '投資状況',
  '비교 분析': '比較分析',
  '수익 시뮬레이션': '収益シミュレーション',
  '전체 투자 수익률': '総ポートフォリオ収益率',
  '가중평균 리스크등급': '加重平均リスクグレード',
  '총 투자 건수': '総投資件数',
  '지역별 분포': '地域別分布',
  '유형별 분포': 'タイプ別分布',
  // Billing
  '구독·결제': 'サブスクリプション・決済',
  '현재 요금제': '現在のプラン',
  '무료': '無料',
  '프로': 'プロ',
  '엔터프라이즈': 'エンタープライズ',
  '다음 갱신일': '次回更新日',
  '결제 수단': '支払い方法',
  '결제 내역': '支払い履歴',
  '크레딧': 'クレジット',
  '잔여 크레딧': '残クレジット',
  '크레딧 충전': 'クレジット購入',
  '요금제 변경': 'プラン変更',
  '구독 취소': 'サブスクリプション解約',
  // KYC
  'KYC 인증': 'KYC認証',
  '투자자 인증': '投資家認証',
  '신분증 업로드': '身分証アップロード',
  '사업자등록증': '事業者登録証',
  '제출 완료': '提出完了',
  '승인됨': '承認済み',
  '반려됨': '不承認',
  'L0 - 기본': 'L0 - 基本',
  'L1 - 인증 투자자': 'L1 - 認証投資家',
  'L2 - 전문 투자자': 'L2 - プロ投資家',
  'L3 - 기관': 'L3 - 機関',
  // Notifications
  '알림 설정': '通知設定',
  '이메일 알림': 'メール通知',
  '인앱 알림': 'アプリ内通知',
  'SMS 알림': 'SMS通知',
  '새 매물 알림': '新規物件通知',
  '거래 업데이트': '取引更新',
  '시스템 공지': 'システムお知らせ',
  '모두 읽음': 'すべて既読',
  // Settings
  '계정 설정': 'アカウント設定',
  '비밀번호 변경': 'パスワード変更',
  '언어 설정': '言語設定',
  '테마': 'テーマ',
  '라이트 모드': 'ライトモード',
  '다크 모드': 'ダークモード',
  '개인정보 처리방침': 'プライバシーポリシー',
  '이용약관': '利用規約',
  '탈퇴': '退会',
  // Deals
  '거래 목록': '取引一覧',
  '거래 단계': '取引ステージ',
  '매도자': '売り手',
  '매수자': '買い手',
  '담당자': '担当者',
  '거래 금액': '取引金額',
  '예상 완료일': '予想完了日',
  '딜룸': 'ディールルーム',
  '전자서명': '電子署名',
  '계약서': '契約書',
  '매매계약서': '売買契約書',
  '채권양도계약서': '債権譲渡契約書',
  // NPL Financial Terms
  '부실채권': '不良債権',
  '론세일': 'ローンセール',
  '자산유동화': '資産流動化',
  '근저당': '根抵当権',
  '선순위 근저당': '先順位根抵当',
  '후순위 근저당': '後順位根抵当',
  '임차인': '賃借人',
  '선순위': '先順位',
  '후순위': '後順位',
  '배당': '配当',
  '배당표': '配当表',
  '낙찰': '落札',
  '유찰': '不落',
  '재경매': '再競売',
  '명도': '明渡し',
  '청산': '清算',
  '회수율': '回収率',
  '담보 비율': '担保比率',
  'LTV (담보인정비율)': 'LTV（担保認定比率）',
  '채무자': '債務者',
  '채권자': '債権者',
  '채권 양도': '債権譲渡',
  '채권 매입': '債権購入',
  '경락대금': '競落代金',
  // UI Patterns
  '데모 체험 모드': 'デモ体験モード',
  '지금 시작': '今すぐ始める',
  '무료로 시작': '無料で始める',
  '분석으로 돌아가기': '分析に戻る',
  '목록으로 돌아가기': '一覧に戻る',
  '홈으로': 'ホームへ',
  '페이지당': '件/ページ',
  '총': '合計',
  // Error / Status
  '데이터를 불러오는 중...': 'データ読み込み中...',
  '저장하는 중...': '保存中...',
  '처리 중...': '処理中...',
  '업로드 중...': 'アップロード中...',
  '권한이 없습니다': '権限がありません',
  '페이지를 찾을 수 없습니다': 'ページが見つかりません',
  '서버 오류가 발생했습니다': 'サーバーエラーが発生しました',
  '네트워크 오류': 'ネットワークエラー',
  '저장되었습니다': '保存しました',
  '삭제되었습니다': '削除しました',
  '제출되었습니다': '提出しました',
  '복사되었습니다': 'コピーしました',
  // Statistics
  '시장 동향': '市場動向',
  '전국 평균 낙찰가율': '全国平均落札率',
  '전국 낙찰률': '全国落札率',
  '거래량 추이': '取引量推移',
  '지역별 히트맵': '地域別ヒートマップ',
  '기간 선택': '期間選択',
  '전년 대비': '前年比',
  '전월 대비': '前月比',
  // Guide
  '가이드': 'ガイド',
  'NPL 투자 가이드': 'NPL投資ガイド',
  '초보자 가이드': '初心者ガイド',
  '용어 사전': '用語集',
  '투자 케이스': '投資ケース',
  '성공 사례': '成功事例',
  '직접 해보기': '試してみる',
})

// 번역 업데이트 이벤트 (캐시에 새 번역 저장 시 발생)
const TRANSLATION_EVENT = 'npl_translation_ready'

// 번역 캐시 (메모리 + localStorage)
const translationCache: Record<string, string> = {}

export function getLocale(): Locale {
  if (typeof document === 'undefined') return 'ko'
  const cookie = document.cookie.match(/locale=([^;]+)/)
  return (cookie?.[1] as Locale) || 'ko'
}

export function setLocale(locale: Locale, opts?: { reload?: boolean }) {
  if (typeof document === 'undefined') return
  document.cookie = `locale=${locale};path=/;max-age=31536000`
  // React 훅이 감지할 수 있도록 이벤트 디스패치
  try { window.dispatchEvent(new CustomEvent('npl_locale_change', { detail: locale })) } catch {}
  // 기본적으로 reload (AutoTranslate가 DOM을 다시 스캔해야 안정적)
  if (opts?.reload !== false) window.location.reload()
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
 * 백그라운드 번역이 완료되면 컴포넌트를 자동 업데이트하고,
 * locale 쿠키 변경도 감지하여 재렌더
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof document === 'undefined' ? 'ko' : getLocale()
  )
  const [, setVersion] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. 번역 캐시 업데이트 이벤트 → 재렌더
    const onTranslationReady = () => setVersion(v => v + 1)
    window.addEventListener(TRANSLATION_EVENT, onTranslationReady)

    // 2. locale 변경 이벤트 (다른 탭/컴포넌트에서 변경)
    const onLocaleChange = () => {
      const next = getLocale()
      setLocaleState(next)
    }
    window.addEventListener('npl_locale_change', onLocaleChange)
    window.addEventListener('storage', onLocaleChange)

    // 3. 쿠키 폴링 (1초 주기)
    const poll = setInterval(() => {
      const next = getLocale()
      setLocaleState(prev => (prev !== next ? next : prev))
    }, 1000)

    return () => {
      window.removeEventListener(TRANSLATION_EVENT, onTranslationReady)
      window.removeEventListener('npl_locale_change', onLocaleChange)
      window.removeEventListener('storage', onLocaleChange)
      clearInterval(poll)
    }
  }, [])

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
  const { t: translate } = useTranslation()
  return translate(text)
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
