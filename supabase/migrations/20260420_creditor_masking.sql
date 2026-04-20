-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1-M · 채권자 명칭 마스킹 (Sprint 3 · D5)
-- ═══════════════════════════════════════════════════════════════════════════
-- 목적: 거래소/경매 노출 시 채권자 앞 3글자를 마스킹하여 민감 정보 보호.
--       "신한은행" → "***은행"  ·  "우리카드" → "***카드"  ·  "저축" → "***"
--
-- 적용 대상:
--   1) public.court_auctions.creditor_name  (018_court_auction_tables.sql)
--
-- 정책:
--   - 보이는 엔드포인트: 비로그인 / BUYER / 매수 측 (일반 조회)
--   - 원본 공개 엔드포인트: SUPER_ADMIN / SELLER(본인 매물) / 채권자 본인
--   - 정책은 API 레이어에서 결정 — DB는 "mask()" 함수 + 뷰를 제공.
--
-- 호환성:
--   - 기존 컬럼 creditor_name 유지 (breaking change 없음).
--   - 신규: mask_creditor(text) 함수 + court_auctions_public 뷰
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. 마스킹 함수 (순수 함수 — IMMUTABLE)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mask_creditor(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  v_len int;
  v_mask_len int := 3;  -- 앞 3글자 고정 마스킹
BEGIN
  IF name IS NULL OR length(trim(name)) = 0 THEN
    RETURN NULL;
  END IF;

  v_len := length(name);

  -- 3글자 이하는 전체 마스킹 (접미사 없음)
  IF v_len <= v_mask_len THEN
    RETURN repeat('*', v_len);
  END IF;

  -- 4글자 이상: 앞 3글자를 ***로, 나머지 그대로
  RETURN repeat('*', v_mask_len) || substring(name FROM v_mask_len + 1);
END;
$$;

COMMENT ON FUNCTION public.mask_creditor(text) IS
  'Phase 1-M: 채권자명 앞 3글자 마스킹. "신한은행"→"***은행". IMMUTABLE → 인덱스 가능.';

-- ──────────────────────────────────────────────────────────────────────────
-- 2. 공개용 뷰 (원본 컬럼 대신 마스킹된 컬럼 노출)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.court_auctions_public
WITH (security_invoker = true) AS
SELECT
  id,
  case_number,
  court_name,
  address,
  property_type,
  appraisal_value,
  minimum_bid,
  sale_date,
  round_number,
  sale_result,
  status,
  -- 마스킹된 채권자명
  public.mask_creditor(creditor_name) AS creditor_name_masked,
  -- NULL 표시 (원본은 뷰에 포함하지 않음)
  created_at,
  updated_at
FROM public.court_auctions;

COMMENT ON VIEW public.court_auctions_public IS
  'Phase 1-M: 공개 조회용 뷰. creditor_name은 mask_creditor()로 변환되어 노출됨.';

-- ──────────────────────────────────────────────────────────────────────────
-- 3. 권한 — authenticated / anon 모두 공개 뷰만 SELECT 가능
-- ──────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.court_auctions_public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.mask_creditor(text) TO authenticated, anon;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. RLS — 원본 court_auctions는 기존 정책 유지, 뷰는 security_invoker로 계승
-- ──────────────────────────────────────────────────────────────────────────
-- (court_auctions의 RLS가 이미 설정되어 있다면 뷰는 자동으로 상속)
-- security_invoker=true → 뷰 접근 시 실행자 권한으로 검사.

-- ──────────────────────────────────────────────────────────────────────────
-- 5. 검증 쿼리 (참고용)
-- ──────────────────────────────────────────────────────────────────────────
-- SELECT public.mask_creditor('신한은행');       -- 기대: '***은행'
-- SELECT public.mask_creditor('우리카드');       -- 기대: '***카드'
-- SELECT public.mask_creditor('NH농협');         -- 기대: '***농협'
-- SELECT public.mask_creditor('ABC');             -- 기대: '***'
-- SELECT public.mask_creditor(NULL);              -- 기대: NULL
-- SELECT public.mask_creditor('');                -- 기대: NULL
