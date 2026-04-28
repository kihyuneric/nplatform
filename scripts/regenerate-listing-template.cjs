/**
 * scripts/regenerate-listing-template.cjs
 *
 * NPL 매물 등록 엑셀 템플릿 — McKinsey 다중 Sheet 구조 (Phase G7+ 2026-04-28).
 *
 * 매물 등록 폼 (/exchange/sell, /analysis/profitability) 의 모든 입력 항목이
 * 1:1 로 엑셀에서 작성 가능하도록 9개 시트로 구조화:
 *
 *   Sheet 01 · 표지 · 사용 가이드
 *   Sheet 02 · 매각사 정보 (institution)
 *   Sheet 03 · 담보 정보 (collateral · 주소)
 *   Sheet 04 · 채권 정보 (claim · 최초 대출원금/현재 원금/이자/금리)
 *   Sheet 05 · 가치 평가 (appraisal · 감정가/AI 시세)
 *   Sheet 06 · 매각 조건 (sale · 기준 옵션 + 할인율 + 매각가)
 *   Sheet 07 · 권리관계 (rights · 선/후순위 · 임차)
 *   Sheet 08 · 특수조건 V2 18항목 (ownership/cost/liquidity)
 *   Sheet 09 · 입력 데이터 (1-row payload — 시스템 업로드용)
 *
 * 실행:
 *   node scripts/regenerate-listing-template.cjs
 *
 * 결과:
 *   public/templates/NPLatform_매물등록_템플릿.xlsx 갱신
 */
'use strict'

const path = require('path')
const XLSX = require('xlsx')

const OUT_PATH = path.resolve(__dirname, '..', 'public', 'templates', 'NPLatform_매물등록_템플릿.xlsx')

// ─────────────────────────────────────────────────────────────────────────
// 헬퍼 — 셀 스타일 (XLSX 모듈은 styling 제한 — 셀 폭/병합만 지원)
// ─────────────────────────────────────────────────────────────────────────

function makeWS(rows, colWidths) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  if (colWidths) ws['!cols'] = colWidths.map(w => ({ wch: w }))
  return ws
}

function setMerges(ws, merges) {
  ws['!merges'] = (ws['!merges'] ?? []).concat(merges)
}

// ─────────────────────────────────────────────────────────────────────────
// Sheet 01 · 표지 + 가이드
// ─────────────────────────────────────────────────────────────────────────

const COVER_ROWS = [
  ['NPLATFORM · 매물 등록 템플릿'],
  ['Investment Memorandum · NPL Listing Submission Template'],
  [''],
  ['Phase G7+ · 2026-04-28'],
  ['(주) 트랜스파머 · NPLatform Engineering'],
  [''],
  [''],
  ['── 사용 안내 ──────────────────────────────────────────────────'],
  [''],
  ['1. 본 템플릿은 9개 Sheet 로 구성되어 있습니다.'],
  ['   · Sheet 02 ~ Sheet 08 까지 매각사가 직접 작성'],
  ['   · Sheet 09 (입력 데이터) 는 시스템 업로드용 1-row payload (자동 생성 가능)'],
  [''],
  ['2. 셀 입력 규칙'],
  ['   · 금액: 원 단위 정수 (1648045960 — 콤마/단위 표기 X)'],
  ['   · 금리: 소수점 2자리 (18.00 — % 기호 X)'],
  ['   · 날짜: YYYY-MM-DD (2026-04-28)'],
  ['   · 드롭다운 옵션은 Sheet 별 안내 참고'],
  [''],
  ['3. 핵심 정책 (NPLatform 공식)'],
  ['   · 채권잔액 = 대출원금 (현재) + 미수이자 + 연체이자'],
  ['   · 매각 기준: 대출원금 OR 대출잔액 중 1개 선택'],
  ['     - 대출원금 기준 → 매각가 = 대출원금 × (1 − 할인율)'],
  ['     - 대출잔액 기준 → 매각가 = 채권잔액 × (1 − 할인율)'],
  ['   · 수익권 금액 (공부상 채권최고액) = 최초 대출원금 × 110~140%'],
  ['     ※ 일부 상환된 경우 ≠ (현재) 대출원금 × 1.4 — 반드시 최초 원금 base'],
  ['   · LTV = (선순위 채권최고액 + 대출원금) / 감정가'],
  [''],
  ['4. 업로드 흐름'],
  ['   · 본 파일을 NPLatform 매물 등록 페이지(/exchange/sell)에서 업로드'],
  ['   · OCR 자동 파싱 → 9개 Sheet 데이터 → 폼 자동 채움'],
  ['   · 사용자 검토 → 등록 완료'],
  [''],
  ['── 시트 구성 ──────────────────────────────────────────────────'],
  [''],
  ['Sheet 01 · 표지 (현재 시트)'],
  ['Sheet 02 · 매각사 정보 (institution) — 채권자/판매자'],
  ['Sheet 03 · 담보 정보 (collateral) — 주소/면적/유형'],
  ['Sheet 04 · 채권 정보 (claim) — 최초/현재 원금, 이자, 금리'],
  ['Sheet 05 · 가치 평가 (appraisal) — 감정가/AI 시세'],
  ['Sheet 06 · 매각 조건 (sale) — 기준 옵션 + 할인율 + 매각가'],
  ['Sheet 07 · 권리관계 (rights) — 선/후순위 + 임차 현황'],
  ['Sheet 08 · 특수조건 V2 (special_conditions) — 18항목 체크리스트'],
  ['Sheet 09 · 입력 데이터 (payload) — 1-row 통합 데이터 (시스템 업로드용)'],
  [''],
  ['── 문의 ─────────────────────────────────────────────────────'],
  [''],
  ['NPLatform 매각사 지원: biz@transfarmer.co.kr'],
]

// ─────────────────────────────────────────────────────────────────────────
// Sheet 02 · 매각사 정보
// ─────────────────────────────────────────────────────────────────────────

const INSTITUTION_ROWS = [
  ['Sheet 02 · 매각사 정보 (Institution)'],
  [''],
  ['항목', '값', '비고'],
  ['매각사명',                    '주식회사 에이에프투자대부',  '실명 입력 (시스템에서 마스킹 처리)'],
  ['매각사 유형',                 'MONEY_LENDER',                'BANK / SAVINGS_BANK / MUTUAL_CREDIT / AMC / MONEY_LENDER / FUND / SECURITIES / INSURANCE / CAPITAL / CREDIT_CARD / INDIVIDUAL / CORPORATION'],
  ['매각 카테고리',               'NPL',                         'NPL / REO / UPL'],
  ['전속 매각 여부',              'FALSE',                        'TRUE/FALSE — NPLatform 단독 매각 시 TRUE'],
  ['담당자명',                    '○○○',                        '실명 (마스킹 처리)'],
  ['담당자 연락처',               '02-XXXX-XXXX',                ''],
  ['담당자 이메일',               'contact@example.com',         ''],
  ['기준일',                       '2026-04-28',                  '채권잔액·연체이자 계산 기준일 YYYY-MM-DD'],
]

// ─────────────────────────────────────────────────────────────────────────
// Sheet 03 · 담보 정보
// ─────────────────────────────────────────────────────────────────────────

const COLLATERAL_ROWS = [
  ['Sheet 03 · 담보 정보 (Collateral)'],
  [''],
  ['항목', '값', '비고'],
  ['담보유형',                    '토지',                                                                  '아파트 / 오피스텔 / 다세대(빌라) / 단독주택 / 상가 / 사무실 / 공장 / 창고 / 토지 / 임야 / 호텔 / 기타'],
  ['시도',                        '서울특별시',                                                            '드롭다운'],
  ['시군구',                      '종로구',                                                                ''],
  ['읍면동/상세주소',             '홍지동 76-1번지 외 7필지(81-1, 81-4, 81-6, 81-7, 82, 83, 76-30)',     ''],
  ['전체 주소 (한 줄)',           '서울특별시 종로구 홍지동 76-1번지 외 7필지',                            '시스템 자동 합성 가능'],
  ['전용면적 (㎡)',               5193.00,                                                                  '소수점 2자리'],
  ['공급면적 (㎡)',               5193.00,                                                                  '토지일 경우 동일'],
  ['용도지역',                    '제1종일반주거지역',                                                    ''],
  ['추가 주소 (포트폴리오)',      '',                                                                       '복합 담보일 경우 줄바꿈으로 추가 주소 나열'],
  ['채무자 유형',                  '개인',                                                                  '개인 / 법인'],
  ['채무자명',                    '박**',                                                                  '마스킹 처리된 이름 (시스템에서 추가 마스킹)'],
  ['채무자·소유자 동일',          'TRUE',                                                                  'TRUE/FALSE'],
]

// ─────────────────────────────────────────────────────────────────────────
// Sheet 04 · 채권 정보 (핵심 — 사용자 정책)
// ─────────────────────────────────────────────────────────────────────────

const CLAIM_ROWS = [
  ['Sheet 04 · 채권 정보 (Claim)'],
  [''],
  ['【 핵심 정책 】'],
  ['  · 채권잔액 = 대출원금 (현재) + 미수이자 + 연체이자'],
  ['  · 최초 대출원금 ≠ 대출원금 (현재) — 일부 상환된 경우'],
  ['  · 수익권 금액(채권최고액) = 최초 대출원금 × 110~140%'],
  [''],
  ['항목',                           '값',          '단위 / 옵션',                              '비고'],
  ['최초 대출원금',                  1700000000,    '원',                                       '대출 약정 시점 원금. 수익권 base'],
  ['대출원금 (현재)',                1648045960,    '원',                                       '일부 상환된 경우 < 최초 대출원금'],
  ['미수이자 (정상이자 누적)',       0,             '원',                                       '없으면 0'],
  ['연체이자 (매입 시점 누적)',      81273499,      '원',                                       '기준일 기준 누적 연체이자'],
  ['채권잔액 (자동 계산)',           1729319459,    '원',                                       '= 대출원금 + 미수이자 + 연체이자'],
  ['대출 금리 (정상)',               18.00,          '% (소수점 2자리)',                        '약정 금리'],
  ['연체 금리',                      20.00,          '% (소수점 2자리)',                        '연체 시점부터 적용'],
  ['연체 시작일',                    '2026-03-03',   'YYYY-MM-DD',                              ''],
  ['기한이익상실일',                 '2026-03-03',   'YYYY-MM-DD',                              '없으면 연체시작 + 60일 자동'],
  ['수익권금액 (공부상 채권최고액)', 2380000000,    '원',                                       '= 최초 대출원금 × 110~140% (1차 근저당 표준)'],
  ['수익권 multiplier',              1.40,           '소수 (1.10 ~ 1.40)',                       '수익권금액 / 최초 대출원금'],
]

// ─────────────────────────────────────────────────────────────────────────
// Sheet 05 · 가치 평가
// ─────────────────────────────────────────────────────────────────────────

const APPRAISAL_ROWS = [
  ['Sheet 05 · 가치 평가 (Appraisal & Market Value)'],
  [''],
  ['항목',                       '값',           '단위',                     '비고'],
  ['감정가 (공부)',               6673016000,    '원',                       '감정평가서 기준'],
  ['감정평가일',                  '2026-04-23',   'YYYY-MM-DD',               ''],
  ['AI 시세 (현재)',              7490203000,    '원',                       'NPLatform AI 또는 외부 시세'],
  ['AI 시세 메모',                '인근 1km 실거래 평균 273만원/㎡', '',     '근거 출처'],
  ['LTV',                         60.12,          '%',                        '= (선순위 + 대출원금) / 감정가 × 100'],
  ['예상 낙찰가율',               71.40,          '% (3개월 평균)',           '지역·물건 통계 기반'],
  ['경매개시결정일',              '2026-04-23',   'YYYY-MM-DD',               '없으면 빈칸'],
]

// ─────────────────────────────────────────────────────────────────────────
// Sheet 06 · 매각 조건 (사용자 정책 핵심)
// ─────────────────────────────────────────────────────────────────────────

const SALE_ROWS = [
  ['Sheet 06 · 매각 조건 (Sale Terms)'],
  [''],
  ['【 매각 기준 옵션 】'],
  ['  옵션 A — 대출원금 기준  : 매각가 = 대출원금 (현재) × (1 − 할인율 A)'],
  ['  옵션 B — 대출잔액 기준  : 매각가 = 채권잔액 × (1 − 할인율 B)'],
  ['  ※ 매각사가 둘 중 하나만 선택. 양쪽 모두 작성한 경우 "매각 기준" 컬럼이 우선.'],
  [''],
  ['항목',                           '값',           '단위 / 옵션',                            '비고'],
  ['매각 기준',                       '대출잔액',     'PRINCIPAL(대출원금) / CLAIM_BALANCE(대출잔액)', '둘 중 1개 선택'],
  ['',                                '',             '',                                       ''],
  ['── 옵션 A · 대출원금 기준 ─────────────────────────────────────', '', '', ''],
  ['할인율 (대출원금 대비)',          '',             '% (소수점 2자리)',                       '0% = 대출원금 전액 매각가 / 5% = 5% 할인'],
  ['매각희망가 (대출원금 기준)',      '',             '원',                                     '= 대출원금 × (1 − 할인율 A) — 자동 계산 가능'],
  ['',                                '',             '',                                       ''],
  ['── 옵션 B · 대출잔액 기준 ─────────────────────────────────────', '', '', ''],
  ['할인율 (대출잔액 대비)',          0,              '% (소수점 2자리)',                       '0% = 채권잔액 전액 매각가'],
  ['매각희망가 (대출잔액 기준)',      1729319459,    '원',                                     '= 채권잔액 × (1 − 할인율 B)'],
  ['',                                '',             '',                                       ''],
  ['── 공통 ─────────────────────────────────────────────────────────', '', '', ''],
  ['최저매각가',                      1729319459,    '원',                                     '경매 시 최저매각가'],
  ['계약금',                          172931946,     '원',                                     '매각가 × 10% (자동 계산)'],
  ['계약일',                          '2026-05-30',   'YYYY-MM-DD',                             ''],
  ['잔금일',                          '2026-06-30',   'YYYY-MM-DD',                             ''],
  ['매각 방식',                       '일괄매각',     '일괄매각 / 분할매각 / 경매 / 협의매각',   ''],
  ['공개 가시성',                     'PUBLIC',       'PUBLIC / MEMBERS / VIP / TARGETED',      ''],
  ['매도자 수수료율',                 0.005,          '소수 (0.003 ~ 0.009)',                    '0.5% (default), 0.3~0.9% 범위'],
  ['공개 마감일',                     '2026-05-30',   'YYYY-MM-DD',                             ''],
]

// ─────────────────────────────────────────────────────────────────────────
// Sheet 07 · 권리관계
// ─────────────────────────────────────────────────────────────────────────

const RIGHTS_ROWS = [
  ['Sheet 07 · 권리관계 (Rights)'],
  [''],
  ['【 LTV 산정식 】'],
  ['  LTV = (선순위 채권최고액 + 대출원금) / 감정가 × 100'],
  [''],
  ['항목',                           '값',           '단위',                  '비고'],
  ['1순위 권리자',                    '농협은행',     '',                       '실명 입력 (시스템 처리)'],
  ['1순위 권리 종류',                 '근저당권',     '근저당권 / 전세권 / 가압류 / 가처분 / 임차권 / 압류', ''],
  ['1순위 채권최고액',                2364000000,    '원',                     '설정금액'],
  ['1순위 설정일',                    '2024-09-03',   'YYYY-MM-DD',             ''],
  ['',                                '',             '',                      ''],
  ['후순위 권리자 수',                0,              '건',                     '0이면 후순위 없음'],
  ['후순위 채권최고액 합계',          0,              '원',                     ''],
  ['',                                '',             '',                      ''],
  ['── 임차 현황 ────────────────────────────────────────────', '', '', ''],
  ['임차인 수',                       0,              '명',                     '0 = 임차인 없음'],
  ['보증금 합계',                     0,              '원',                     ''],
  ['월세 합계',                       0,              '원',                     ''],
  ['공실 여부',                       '해당사항 없음', '공실 / 임차 / 해당사항 없음', ''],
]

// ─────────────────────────────────────────────────────────────────────────
// Sheet 08 · 특수조건 V2 18항목
// ─────────────────────────────────────────────────────────────────────────

const SPECIAL_ROWS = [
  ['Sheet 08 · 특수조건 V2 18항목 (Special Conditions)'],
  [''],
  ['【 사용법 】 해당 셀에 O / TRUE / 1 입력 시 체크. 빈칸 / X / FALSE / 0 = 미체크.'],
  ['【 권리관계 점수 】 max(20, 100 − Σ감점)'],
  [''],
  ['카테고리',         '항목',                       '키 (시스템)',                 '감점',  '체크',  '설명'],
  ['🔴 소유권 리스크', '전세권만 매각',               'leasehold_only_sale',         60,      '',     '전세권 단독 경매 · 소유권 이전 불가'],
  ['🔴 소유권 리스크', '선순위 등기권리 존재',        'senior_registry_rights',      50,      'O',    '선순위 근저당·지상권·임차권 등'],
  ['🔴 소유권 리스크', '대항력 있는 임차인',          'opposable_tenant',            45,      '',     '주택임대차보호법 · 보증금 인수'],
  ['🔴 소유권 리스크', '유치권 / 법정지상권',         'lien_or_statutory_easement',  45,      '',     '제3자 점유 · 명도 제한'],
  ['🔴 소유권 리스크', '지분입찰',                    'share_auction',               40,      '',     '공유지분만 매각'],
  ['🟠 비용 리스크',   '당해세',                      'inherent_tax',                40,      '',     '해당 부동산 부과 조세 · 최우선 배당'],
  ['🟠 비용 리스크',   '토지 별도등기',               'land_separate_registry',      35,      '',     '건물·토지 등기 분리'],
  ['🟠 비용 리스크',   '임금채권',                    'wage_claim',                  30,      '',     '최종 3개월분 + 퇴직금 3년분'],
  ['🟠 비용 리스크',   '임차권 등기',                 'lease_registration',          30,      '',     '대항력 유지 · 보증금 인수'],
  ['🟠 비용 리스크',   '대지권 미등기',               'site_right_unregistered',     30,      '',     '건물만 매각 · 대지사용권 별도'],
  ['🟠 비용 리스크',   '조세 / 4대보험',              'tax_and_social_insurance',    20,      '',     '국세·지방세·국민연금 체납'],
  ['🟠 비용 리스크',   '재해보상',                    'disaster_compensation',       18,      '',     '산재 보상금 체납'],
  ['🟡 유동성 리스크', '무허가건축물',                'illegal_building',            45,      '',     '건축허가 無 · 철거 대상'],
  ['🟡 유동성 리스크', '맹지',                        'landlocked',                  35,      '',     '도로 접근 無 · 건축 제약'],
  ['🟡 유동성 리스크', '사용승인 미필',               'no_use_approval',             30,      '',     '준공검사 미완료'],
  ['🟡 유동성 리스크', '분묘기지권',                  'grave_base_right',            30,      '',     '타인 묘지 존재 (토지 한정)'],
  ['🟡 유동성 리스크', '위반건축물',                  'code_violation',              25,      '',     '건축물대장 등재 · 양성화비'],
  ['🟡 유동성 리스크', '농취증 필요',                 'farmland_qualification',      20,      '',     '농지법 제8조 · 취득자격 제한'],
]

// ─────────────────────────────────────────────────────────────────────────
// Sheet 09 · 입력 데이터 (1-row payload — 시스템 업로드용)
// ─────────────────────────────────────────────────────────────────────────

const PAYLOAD_HEADERS = [
  // 매각사
  'institution_name', 'institution_type', 'listing_category', 'is_exclusive', 'reference_date',
  // 담보
  'collateral_type', 'sido', 'sigungu', 'address', 'land_area', 'building_area', 'zoning',
  'debtor_type', 'debtor_owner_same',
  // 채권 (핵심)
  'initial_principal', 'loan_principal', 'unpaid_interest', 'overdue_interest',
  'normal_rate', 'overdue_rate', 'delinquency_start_date', 'acceleration_date',
  'beneficial_amount', 'max_bond_multiplier',
  // 가치 평가
  'appraisal_value', 'appraisal_date', 'ai_market_value', 'ltv_ratio', 'expected_bid_ratio',
  // 매각 조건
  'discount_basis', 'discount_rate_principal', 'discount_rate_balance',
  'asking_price', 'minimum_bid', 'contract_amount', 'contract_date', 'closing_date',
  'sale_method', 'visibility', 'seller_fee_rate', 'deadline',
  // 권리관계
  'rights_priority_1', 'rights_kind_1', 'max_claim_amount', 'rights_setup_date_1',
  'subordinate_count', 'subordinate_total_amount',
  'tenant_count', 'deposit', 'monthly_rent', 'vacancy_status',
  // 특수조건 V2 (18항목 — TRUE/FALSE)
  'sc_leasehold_only_sale', 'sc_senior_registry_rights', 'sc_opposable_tenant',
  'sc_lien_or_statutory_easement', 'sc_share_auction',
  'sc_inherent_tax', 'sc_land_separate_registry', 'sc_wage_claim',
  'sc_lease_registration', 'sc_site_right_unregistered',
  'sc_tax_and_social_insurance', 'sc_disaster_compensation',
  'sc_illegal_building', 'sc_landlocked', 'sc_no_use_approval',
  'sc_grave_base_right', 'sc_code_violation', 'sc_farmland_qualification',
]

const PAYLOAD_EXAMPLE = [
  // 매각사
  '주식회사 에이에프투자대부', 'MONEY_LENDER', 'NPL', false, '2026-04-28',
  // 담보
  '토지', '서울특별시', '종로구',
  '서울특별시 종로구 홍지동 76-1번지 외 7필지(81-1, 81-4, 81-6, 81-7, 82, 83, 76-30)',
  5193.00, 0, '제1종일반주거지역',
  '개인', true,
  // 채권
  1700000000, 1648045960, 0, 81273499,
  18.00, 20.00, '2026-03-03', '2026-03-03',
  2380000000, 1.40,
  // 가치 평가
  6673016000, '2026-04-23', 7490203000, 60.12, 71.40,
  // 매각 조건
  'CLAIM_BALANCE', '', 0,
  1729319459, 1729319459, 172931946, '2026-05-30', '2026-06-30',
  '일괄매각', 'PUBLIC', 0.005, '2026-05-30',
  // 권리관계
  '농협은행', '근저당권', 2364000000, '2024-09-03',
  0, 0,
  0, 0, 0, '해당사항 없음',
  // 특수조건 V2
  false, true, false, false, false,
  false, false, false, false, false,
  false, false, false, false, false,
  false, false, false,
]

// ─────────────────────────────────────────────────────────────────────────
// Build workbook
// ─────────────────────────────────────────────────────────────────────────

function main() {
  const wb = XLSX.utils.book_new()

  // Sheet 01 — 표지
  {
    const ws = makeWS(COVER_ROWS, [80])
    XLSX.utils.book_append_sheet(wb, ws, '01_표지')
  }

  // Sheet 02 — 매각사
  {
    const ws = makeWS(INSTITUTION_ROWS, [28, 38, 60])
    XLSX.utils.book_append_sheet(wb, ws, '02_매각사')
  }

  // Sheet 03 — 담보
  {
    const ws = makeWS(COLLATERAL_ROWS, [28, 70, 60])
    XLSX.utils.book_append_sheet(wb, ws, '03_담보')
  }

  // Sheet 04 — 채권
  {
    const ws = makeWS(CLAIM_ROWS, [32, 18, 24, 50])
    XLSX.utils.book_append_sheet(wb, ws, '04_채권')
  }

  // Sheet 05 — 가치평가
  {
    const ws = makeWS(APPRAISAL_ROWS, [22, 18, 22, 50])
    XLSX.utils.book_append_sheet(wb, ws, '05_가치평가')
  }

  // Sheet 06 — 매각조건 (핵심 — 사용자 정책)
  {
    const ws = makeWS(SALE_ROWS, [32, 18, 36, 60])
    XLSX.utils.book_append_sheet(wb, ws, '06_매각조건')
  }

  // Sheet 07 — 권리관계
  {
    const ws = makeWS(RIGHTS_ROWS, [22, 18, 12, 40])
    XLSX.utils.book_append_sheet(wb, ws, '07_권리관계')
  }

  // Sheet 08 — 특수조건 V2
  {
    const ws = makeWS(SPECIAL_ROWS, [16, 28, 32, 8, 8, 60])
    XLSX.utils.book_append_sheet(wb, ws, '08_특수조건')
  }

  // Sheet 09 — 입력 데이터 (payload)
  {
    const ws = makeWS([PAYLOAD_HEADERS, PAYLOAD_EXAMPLE], PAYLOAD_HEADERS.map(() => 22))
    XLSX.utils.book_append_sheet(wb, ws, '09_입력데이터')
  }

  XLSX.writeFile(wb, OUT_PATH)
  console.log('✅ Template (multi-sheet) written:', OUT_PATH)
  console.log(`   Sheets: 9 — 표지/매각사/담보/채권/가치/매각조건/권리/특수조건/입력데이터`)
}

main()
