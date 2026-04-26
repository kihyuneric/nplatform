-- ─────────────────────────────────────────────────────────────────────────────
-- 025_npl_listings_additional_addresses.sql
--
-- Phase G7+ — 다수 주소 지원.
-- 단일 매물에 여러 주소를 등록할 수 있도록 npl_listings.additional_addresses
-- (JSONB 배열) 컬럼을 추가한다. 빈 배열이면 기존 단일 주소만 사용 (기존 동작 호환).
--
-- 각 항목 스키마: { sido, sigungu, detail, location, address }
--   · sido      — REGIONS.value (예: "11")
--   · sigungu   — 시/군/구
--   · detail    — 상세 주소
--   · location  — 표시용 "{시도라벨} {시군구}"
--   · address   — 표시용 전체 주소 "{location} {detail}"
--
-- 사용 시나리오
--   · 포트폴리오 매각 (여러 부동산 묶음)
--   · 복합 담보 (1개 채권에 여러 부동산이 담보로 설정)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE npl_listings
  ADD COLUMN IF NOT EXISTS additional_addresses JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 인덱스 — 추가 주소가 1건 이상인 매물만 쉽게 필터링.
CREATE INDEX IF NOT EXISTS idx_npl_listings_has_extra_addr
  ON npl_listings ((jsonb_array_length(additional_addresses)))
  WHERE jsonb_array_length(additional_addresses) > 0;

COMMENT ON COLUMN npl_listings.additional_addresses IS
  'Phase G7+ 다수 주소 (포트폴리오·복합 담보). 각 항목: {sido,sigungu,detail,location,address}';
