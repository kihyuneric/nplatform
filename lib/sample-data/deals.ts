// ─────────────────────────────────────────────────────────
//  Centralized Sample Deals – 50개 거래 데이터 (다양한 진행 단계)
// ─────────────────────────────────────────────────────────

export type DealStage =
  | 'INQUIRY'       // 문의
  | 'NDA_SIGNED'    // NDA 체결
  | 'DUE_DILIGENCE' // 실사 진행
  | 'NEGOTIATION'   // 가격 협상
  | 'CONTRACT'      // 계약 체결
  | 'PAYMENT'       // 대금 납부
  | 'TRANSFER'      // 채권 이전
  | 'COMPLETED'     // 완료
  | 'CANCELLED'     // 취소

export interface SampleDeal {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  stage: DealStage
  offered_price: number
  final_price: number | null
  discount_rate: number | null
  messages_count: number
  professional_id: string | null
  started_at: string
  updated_at: string
  completed_at: string | null
  notes: string
}

const 억 = 100_000_000

export const SAMPLE_DEALS: SampleDeal[] = [
  // ── COMPLETED (5건) ─────────────────────────────────────
  { id: 'deal-001', listing_id: 'lst-a01', buyer_id: 'user-b4', seller_id: 'user-s1', stage: 'COMPLETED', offered_price: 15 * 억, final_price: 16.2 * 억, discount_rate: 42.1, messages_count: 34, professional_id: 'user-p1', started_at: '2026-02-18', updated_at: '2026-03-15', completed_at: '2026-03-15', notes: '압구정 현대아파트. 감정가 대비 57.9% 매입.' },
  { id: 'deal-002', listing_id: 'lst-o10', buyer_id: 'user-b2', seller_id: 'user-s2', stage: 'COMPLETED', offered_price: 3.5 * 억, final_price: 3.8 * 억, discount_rate: 45.7, messages_count: 18, professional_id: null, started_at: '2026-01-10', updated_at: '2026-03-10', completed_at: '2026-03-10', notes: '광주 상무지구 오피스. 임차인 인수 조건.' },
  { id: 'deal-003', listing_id: 'lst-a02', buyer_id: 'user-b6', seller_id: 'user-s2', stage: 'COMPLETED', offered_price: 10 * 억, final_price: 10.8 * 억, discount_rate: 50.9, messages_count: 28, professional_id: 'user-p3', started_at: '2026-02-22', updated_at: '2026-03-18', completed_at: '2026-03-18', notes: '잠실엘스. 감정가 대비 49.1% 매입.' },
  { id: 'deal-004', listing_id: 'lst-c01', buyer_id: 'user-b1', seller_id: 'user-s3', stage: 'COMPLETED', offered_price: 7 * 억, final_price: 7.8 * 억, discount_rate: 48.0, messages_count: 22, professional_id: 'user-p4', started_at: '2026-02-25', updated_at: '2026-03-20', completed_at: '2026-03-20', notes: '강남역 지하상가. 유동인구 우수 입지.' },
  { id: 'deal-005', listing_id: 'lst-l07', buyer_id: 'user-b3', seller_id: 'user-s3', stage: 'COMPLETED', offered_price: 1 * 억, final_price: 1.1 * 억, discount_rate: 56.0, messages_count: 8, professional_id: null, started_at: '2025-12-20', updated_at: '2026-02-25', completed_at: '2026-02-25', notes: '포천 임야. 저가 매입 성공.' },

  // ── TRANSFER (2건) ──────────────────────────────────────
  { id: 'deal-006', listing_id: 'lst-a03', buyer_id: 'user-b4', seller_id: 'user-s3', stage: 'TRANSFER', offered_price: 22 * 억, final_price: 23.5 * 억, discount_rate: 47.8, messages_count: 42, professional_id: 'user-p1', started_at: '2026-01-28', updated_at: '2026-03-21', completed_at: null, notes: '아크로리버파크 채권이전 진행 중.' },
  { id: 'deal-007', listing_id: 'lst-o01', buyer_id: 'user-b2', seller_id: 'user-s1', stage: 'TRANSFER', offered_price: 30 * 억, final_price: 32 * 억, discount_rate: 38.5, messages_count: 38, professional_id: 'user-p2', started_at: '2026-01-22', updated_at: '2026-03-19', completed_at: null, notes: '역삼 오피스 채권이전 서류 접수 완료.' },

  // ── PAYMENT (2건) ───────────────────────────────────────
  { id: 'deal-008', listing_id: 'lst-o02', buyer_id: 'user-b4', seller_id: 'user-s2', stage: 'PAYMENT', offered_price: 55 * 억, final_price: 58 * 억, discount_rate: 38.9, messages_count: 56, professional_id: 'user-p1', started_at: '2026-02-05', updated_at: '2026-03-20', completed_at: null, notes: '여의도 오피스빌딩. 대금 분할 납부 중.' },
  { id: 'deal-009', listing_id: 'lst-m02', buyer_id: 'user-b1', seller_id: 'user-s4', stage: 'PAYMENT', offered_price: 20 * 억, final_price: 21.5 * 억, discount_rate: 38.6, messages_count: 30, professional_id: null, started_at: '2026-01-28', updated_at: '2026-03-18', completed_at: null, notes: '안산 공장. 1차 대금 납부 완료.' },

  // ── CONTRACT (2건) ──────────────────────────────────────
  { id: 'deal-010', listing_id: 'lst-a04', buyer_id: 'user-b5', seller_id: 'user-s1', stage: 'CONTRACT', offered_price: 6 * 억, final_price: 6.5 * 억, discount_rate: 45.8, messages_count: 20, professional_id: 'user-p4', started_at: '2026-03-05', updated_at: '2026-03-21', completed_at: null, notes: '마포래미안 계약서 작성 중.' },
  { id: 'deal-011', listing_id: 'lst-l01', buyer_id: 'user-b4', seller_id: 'user-s1', stage: 'CONTRACT', offered_price: 25 * 억, final_price: 27 * 억, discount_rate: 35.7, messages_count: 24, professional_id: 'user-p1', started_at: '2026-01-15', updated_at: '2026-03-19', completed_at: null, notes: '동탄 토지. 법률검토 완료.' },

  // ── NEGOTIATION (3건) ───────────────────────────────────
  { id: 'deal-012', listing_id: 'lst-o03', buyer_id: 'user-b6', seller_id: 'user-s3', stage: 'NEGOTIATION', offered_price: 12 * 억, final_price: null, discount_rate: null, messages_count: 15, professional_id: 'user-p2', started_at: '2026-02-20', updated_at: '2026-03-21', completed_at: null, notes: '종로 오피스. 가격 조율 중.' },
  { id: 'deal-013', listing_id: 'lst-c03', buyer_id: 'user-b1', seller_id: 'user-s1', stage: 'NEGOTIATION', offered_price: 15 * 억, final_price: null, discount_rate: null, messages_count: 12, professional_id: null, started_at: '2026-01-22', updated_at: '2026-03-20', completed_at: null, notes: '이태원 상가. 공실 리스크 협의.' },
  { id: 'deal-014', listing_id: 'lst-m03', buyer_id: 'user-b8', seller_id: 'user-s1', stage: 'NEGOTIATION', offered_price: 14 * 억, final_price: null, discount_rate: null, messages_count: 10, professional_id: 'user-p3', started_at: '2026-02-10', updated_at: '2026-03-18', completed_at: null, notes: '시흥 공장. 기계설비 감정 진행.' },

  // ── DUE_DILIGENCE (2건) ─────────────────────────────────
  { id: 'deal-015', listing_id: 'lst-a09', buyer_id: 'user-b2', seller_id: 'user-s4', stage: 'DUE_DILIGENCE', offered_price: 7 * 억, final_price: null, discount_rate: null, messages_count: 8, professional_id: 'user-p3', started_at: '2026-03-05', updated_at: '2026-03-21', completed_at: null, notes: '해운대 아파트. 현장 실사 예정.' },
  { id: 'deal-016', listing_id: 'lst-l04', buyer_id: 'user-b5', seller_id: 'user-s4', stage: 'DUE_DILIGENCE', offered_price: 12 * 억, final_price: null, discount_rate: null, messages_count: 6, professional_id: null, started_at: '2026-02-18', updated_at: '2026-03-20', completed_at: null, notes: '세종시 토지. 용도변경 가능성 확인 중.' },

  // ── NDA_SIGNED (2건) ────────────────────────────────────
  { id: 'deal-017', listing_id: 'lst-o05', buyer_id: 'user-b7', seller_id: 'user-s1', stage: 'NDA_SIGNED', offered_price: 18 * 억, final_price: null, discount_rate: null, messages_count: 4, professional_id: null, started_at: '2026-03-15', updated_at: '2026-03-20', completed_at: null, notes: '판교 오피스. NDA 체결 후 자료 요청.' },
  { id: 'deal-018', listing_id: 'lst-m09', buyer_id: 'user-b3', seller_id: 'user-s3', stage: 'NDA_SIGNED', offered_price: 5 * 억, final_price: null, discount_rate: null, messages_count: 3, professional_id: 'user-p4', started_at: '2026-03-12', updated_at: '2026-03-19', completed_at: null, notes: '광주 모텔. 수익성 분석 대기.' },

  // ── INQUIRY (1건) ───────────────────────────────────────
  { id: 'deal-019', listing_id: 'lst-m10', buyer_id: 'user-b8', seller_id: 'user-s4', stage: 'INQUIRY', offered_price: 3.5 * 억, final_price: null, discount_rate: null, messages_count: 2, professional_id: null, started_at: '2026-03-20', updated_at: '2026-03-21', completed_at: null, notes: '원주 주유소. 환경평가 문의.' },

  // ── CANCELLED (1건) ─────────────────────────────────────
  { id: 'deal-020', listing_id: 'lst-l03', buyer_id: 'user-b7', seller_id: 'user-s3', stage: 'CANCELLED', offered_price: 2 * 억, final_price: null, discount_rate: null, messages_count: 5, professional_id: null, started_at: '2026-01-08', updated_at: '2026-02-15', completed_at: null, notes: '양평 임야. 접근성 문제로 취소.' },

  // ══════════════════════════════════════════════════════════
  //  추가 30건 (deal-021 ~ deal-050)
  // ══════════════════════════════════════════════════════════

  // ── COMPLETED 추가 (5건) ──────────────────────────────────
  { id: 'deal-021', listing_id: 'lst-v01', buyer_id: 'user-b5', seller_id: 'user-s2', stage: 'COMPLETED', offered_price: 2.5 * 억, final_price: 2.7 * 억, discount_rate: 37.2, messages_count: 16, professional_id: 'user-p2', started_at: '2026-01-05', updated_at: '2026-03-01', completed_at: '2026-03-01', notes: '강서구 빌라. 임차인 승계 조건 완료.' },
  { id: 'deal-022', listing_id: 'lst-c04', buyer_id: 'user-b3', seller_id: 'user-s2', stage: 'COMPLETED', offered_price: 4.2 * 억, final_price: 4.5 * 억, discount_rate: 40.0, messages_count: 22, professional_id: null, started_at: '2025-12-15', updated_at: '2026-02-28', completed_at: '2026-02-28', notes: '부산 서면 상가. 임차인 확보 상태.' },
  { id: 'deal-023', listing_id: 'lst-l10', buyer_id: 'user-b6', seller_id: 'user-s2', stage: 'COMPLETED', offered_price: 0.9 * 억, final_price: 1.0 * 억, discount_rate: 50.0, messages_count: 10, professional_id: 'user-p3', started_at: '2025-11-20', updated_at: '2026-02-10', completed_at: '2026-02-10', notes: '여주 토지. 저가 매입 성공.' },
  { id: 'deal-024', listing_id: 'lst-m04', buyer_id: 'user-b8', seller_id: 'user-s2', stage: 'COMPLETED', offered_price: 3.8 * 억, final_price: 4.2 * 억, discount_rate: 40.0, messages_count: 20, professional_id: 'user-p4', started_at: '2026-01-10', updated_at: '2026-03-08', completed_at: '2026-03-08', notes: '은평구 다세대. 역세권 안정적 수익형.' },
  { id: 'deal-025', listing_id: 'lst-o08', buyer_id: 'user-b4', seller_id: 'user-s4', stage: 'COMPLETED', offered_price: 8.5 * 억, final_price: 9.2 * 억, discount_rate: 42.5, messages_count: 32, professional_id: 'user-p1', started_at: '2026-01-15', updated_at: '2026-03-12', completed_at: '2026-03-12', notes: '부산 센텀시티 오피스. 우량 임차인.' },

  // ── TRANSFER 추가 (2건) ───────────────────────────────────
  { id: 'deal-026', listing_id: 'lst-f01', buyer_id: 'user-b2', seller_id: 'user-s2', stage: 'TRANSFER', offered_price: 30 * 억, final_price: 33 * 억, discount_rate: 34.0, messages_count: 48, professional_id: 'user-p1', started_at: '2026-02-01', updated_at: '2026-03-22', completed_at: null, notes: '화성 공장. 채권이전 서류 진행 중.' },
  { id: 'deal-027', listing_id: 'lst-w02', buyer_id: 'user-b5', seller_id: 'user-s3', stage: 'TRANSFER', offered_price: 22 * 억, final_price: 24 * 억, discount_rate: 36.8, messages_count: 36, professional_id: 'user-p2', started_at: '2026-01-20', updated_at: '2026-03-20', completed_at: null, notes: '인천 물류창고. 채권이전 접수 완료.' },

  // ── PAYMENT 추가 (2건) ────────────────────────────────────
  { id: 'deal-028', listing_id: 'lst-a11', buyer_id: 'user-b1', seller_id: 'user-s1', stage: 'PAYMENT', offered_price: 4 * 억, final_price: 4.5 * 억, discount_rate: 37.5, messages_count: 18, professional_id: null, started_at: '2026-02-10', updated_at: '2026-03-21', completed_at: null, notes: '울산 아파트. 1차 대금 납부 완료.' },
  { id: 'deal-029', listing_id: 'lst-o11', buyer_id: 'user-b6', seller_id: 'user-s3', stage: 'PAYMENT', offered_price: 13 * 억, final_price: 14 * 억, discount_rate: 36.4, messages_count: 28, professional_id: 'user-p3', started_at: '2026-02-05', updated_at: '2026-03-22', completed_at: null, notes: '울산 오피스. 분할 납부 진행.' },

  // ── CONTRACT 추가 (3건) ───────────────────────────────────
  { id: 'deal-030', listing_id: 'lst-c14', buyer_id: 'user-b3', seller_id: 'user-s3', stage: 'CONTRACT', offered_price: 4.8 * 억, final_price: 5.2 * 억, discount_rate: 38.8, messages_count: 14, professional_id: 'user-p4', started_at: '2026-02-28', updated_at: '2026-03-22', completed_at: null, notes: '서귀포 상가. 계약서 법률검토 중.' },
  { id: 'deal-031', listing_id: 'lst-d01', buyer_id: 'user-b7', seller_id: 'user-s3', stage: 'CONTRACT', offered_price: 4.8 * 억, final_price: 5.3 * 억, discount_rate: 37.6, messages_count: 16, professional_id: null, started_at: '2026-03-01', updated_at: '2026-03-21', completed_at: null, notes: '성북구 다세대. 계약서 작성 중.' },
  { id: 'deal-032', listing_id: 'lst-h01', buyer_id: 'user-b4', seller_id: 'user-s4', stage: 'CONTRACT', offered_price: 10 * 억, final_price: 11 * 억, discount_rate: 38.9, messages_count: 26, professional_id: 'user-p2', started_at: '2026-02-15', updated_at: '2026-03-22', completed_at: null, notes: '부산 모텔. 운영권 이전 조건 협의 완료.' },

  // ── NEGOTIATION 추가 (4건) ────────────────────────────────
  { id: 'deal-033', listing_id: 'lst-f02', buyer_id: 'user-b2', seller_id: 'user-s3', stage: 'NEGOTIATION', offered_price: 17 * 억, final_price: null, discount_rate: null, messages_count: 12, professional_id: 'user-p1', started_at: '2026-02-20', updated_at: '2026-03-22', completed_at: null, notes: '천안 공장. 설비가치 감정 협의 중.' },
  { id: 'deal-034', listing_id: 'lst-w01', buyer_id: 'user-b8', seller_id: 'user-s2', stage: 'NEGOTIATION', offered_price: 15 * 억, final_price: null, discount_rate: null, messages_count: 10, professional_id: null, started_at: '2026-03-01', updated_at: '2026-03-21', completed_at: null, notes: '용인 창고. 냉장설비 감가 논의.' },
  { id: 'deal-035', listing_id: 'lst-a13', buyer_id: 'user-b5', seller_id: 'user-s3', stage: 'NEGOTIATION', offered_price: 3 * 억, final_price: null, discount_rate: null, messages_count: 8, professional_id: 'user-p3', started_at: '2026-03-05', updated_at: '2026-03-22', completed_at: null, notes: '광주 아파트. 감정가 대비 할인율 조율.' },
  { id: 'deal-036', listing_id: 'lst-l14', buyer_id: 'user-b1', seller_id: 'user-s4', stage: 'NEGOTIATION', offered_price: 10 * 억, final_price: null, discount_rate: null, messages_count: 6, professional_id: null, started_at: '2026-02-25', updated_at: '2026-03-20', completed_at: null, notes: '속초 토지. 숙박시설 개발 계획 협의.' },

  // ── DUE_DILIGENCE 추가 (4건) ──────────────────────────────
  { id: 'deal-037', listing_id: 'lst-f03', buyer_id: 'user-b4', seller_id: 'user-s4', stage: 'DUE_DILIGENCE', offered_price: 38 * 억, final_price: null, discount_rate: null, messages_count: 8, professional_id: 'user-p1', started_at: '2026-03-10', updated_at: '2026-03-22', completed_at: null, notes: '양산 공장. 환경영향평가 진행 중.' },
  { id: 'deal-038', listing_id: 'lst-h03', buyer_id: 'user-b7', seller_id: 'user-s2', stage: 'DUE_DILIGENCE', offered_price: 12 * 억, final_price: null, discount_rate: null, messages_count: 6, professional_id: 'user-p4', started_at: '2026-03-08', updated_at: '2026-03-21', completed_at: null, notes: '가평 펜션단지. 현장 실사 진행.' },
  { id: 'deal-039', listing_id: 'lst-g01', buyer_id: 'user-b3', seller_id: 'user-s1', stage: 'DUE_DILIGENCE', offered_price: 6.5 * 억, final_price: null, discount_rate: null, messages_count: 5, professional_id: null, started_at: '2026-03-12', updated_at: '2026-03-22', completed_at: null, notes: '이천 주유소. 토양오염 재검사.' },
  { id: 'deal-040', listing_id: 'lst-w04', buyer_id: 'user-b6', seller_id: 'user-s1', stage: 'DUE_DILIGENCE', offered_price: 26 * 억, final_price: null, discount_rate: null, messages_count: 7, professional_id: 'user-p2', started_at: '2026-03-05', updated_at: '2026-03-21', completed_at: null, notes: '당진 물류창고. 구조안전진단 중.' },

  // ── NDA_SIGNED 추가 (3건) ─────────────────────────────────
  { id: 'deal-041', listing_id: 'lst-c12', buyer_id: 'user-b1', seller_id: 'user-s1', stage: 'NDA_SIGNED', offered_price: 3.8 * 억, final_price: null, discount_rate: null, messages_count: 3, professional_id: null, started_at: '2026-03-18', updated_at: '2026-03-22', completed_at: null, notes: '김해 상가. NDA 체결 후 상세 자료 요청.' },
  { id: 'deal-042', listing_id: 'lst-o15', buyer_id: 'user-b8', seller_id: 'user-s3', stage: 'NDA_SIGNED', offered_price: 10 * 억, final_price: null, discount_rate: null, messages_count: 4, professional_id: 'user-p3', started_at: '2026-03-15', updated_at: '2026-03-21', completed_at: null, notes: '안양 오피스. 임차인 현황 자료 대기.' },
  { id: 'deal-043', listing_id: 'lst-f04', buyer_id: 'user-b5', seller_id: 'user-s1', stage: 'NDA_SIGNED', offered_price: 24 * 억, final_price: null, discount_rate: null, messages_count: 2, professional_id: null, started_at: '2026-03-20', updated_at: '2026-03-22', completed_at: null, notes: '광양 공장. NDA 체결, 설비 목록 요청.' },

  // ── INQUIRY 추가 (3건) ────────────────────────────────────
  { id: 'deal-044', listing_id: 'lst-a14', buyer_id: 'user-b2', seller_id: 'user-s4', stage: 'INQUIRY', offered_price: 5.5 * 억, final_price: null, discount_rate: null, messages_count: 1, professional_id: null, started_at: '2026-03-21', updated_at: '2026-03-22', completed_at: null, notes: '대구 달서구 아파트. 초기 문의 단계.' },
  { id: 'deal-045', listing_id: 'lst-d05', buyer_id: 'user-b7', seller_id: 'user-s3', stage: 'INQUIRY', offered_price: 5 * 억, final_price: null, discount_rate: null, messages_count: 2, professional_id: null, started_at: '2026-03-20', updated_at: '2026-03-22', completed_at: null, notes: '고양 다세대. 임차인 현황 문의.' },
  { id: 'deal-046', listing_id: 'lst-l11', buyer_id: 'user-b4', seller_id: 'user-s1', stage: 'INQUIRY', offered_price: 5 * 억, final_price: null, discount_rate: null, messages_count: 1, professional_id: null, started_at: '2026-03-22', updated_at: '2026-03-22', completed_at: null, notes: '논산 토지. 용도 확인 문의.' },

  // ── CANCELLED 추가 (4건) ──────────────────────────────────
  { id: 'deal-047', listing_id: 'lst-g03', buyer_id: 'user-b3', seller_id: 'user-s3', stage: 'CANCELLED', offered_price: 6 * 억, final_price: null, discount_rate: null, messages_count: 8, professional_id: 'user-p2', started_at: '2026-01-15', updated_at: '2026-02-20', completed_at: null, notes: '거제 주유소. 환경정화비용 과다로 취소.' },
  { id: 'deal-048', listing_id: 'lst-h04', buyer_id: 'user-b6', seller_id: 'user-s3', stage: 'CANCELLED', offered_price: 5 * 억, final_price: null, discount_rate: null, messages_count: 6, professional_id: null, started_at: '2025-12-10', updated_at: '2026-02-05', completed_at: null, notes: '제주 게스트하우스. 시장 악화로 투자 철회.' },
  { id: 'deal-049', listing_id: 'lst-c08', buyer_id: 'user-b8', seller_id: 'user-s2', stage: 'CANCELLED', offered_price: 1.5 * 억, final_price: null, discount_rate: null, messages_count: 4, professional_id: null, started_at: '2026-02-05', updated_at: '2026-03-01', completed_at: null, notes: '강릉 근생. 공실 리스크 판단 후 취소.' },
  { id: 'deal-050', listing_id: 'lst-l06', buyer_id: 'user-b1', seller_id: 'user-s2', stage: 'CANCELLED', offered_price: 1.5 * 억, final_price: null, discount_rate: null, messages_count: 3, professional_id: null, started_at: '2026-01-22', updated_at: '2026-02-28', completed_at: null, notes: '춘천 토지. 개발제한구역 확인 후 취소.' },
]

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  INQUIRY: '문의',
  NDA_SIGNED: 'NDA 체결',
  DUE_DILIGENCE: '실사 진행',
  NEGOTIATION: '가격 협상',
  CONTRACT: '계약 체결',
  PAYMENT: '대금 납부',
  TRANSFER: '채권 이전',
  COMPLETED: '완료',
  CANCELLED: '취소',
}

export const DEAL_STAGE_ORDER: DealStage[] = [
  'INQUIRY', 'NDA_SIGNED', 'DUE_DILIGENCE', 'NEGOTIATION',
  'CONTRACT', 'PAYMENT', 'TRANSFER', 'COMPLETED',
]
