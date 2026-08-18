-- 매물별 마케팅 진행 체크리스트 + 반응 집계 (운영사 ↔ 매각사 공유)
-- 적용: Supabase Dashboard > SQL Editor 에 붙여넣어 실행 (1회)

create table if not exists public.listing_marketing (
  listing_id text primary key,
  checklist jsonb not null default '{}'::jsonb,
  consult_count int not null default 0,
  interest_count int not null default 0,
  nda_count int not null default 0,
  deal_stage text not null default '',   -- 관심등록 / 실사진행 / 가격협의 / 최종계약
  matched_at date,                       -- 매칭날짜 — 이후 업데이트 내역 알림 기준점
  npl_status text not null default '',   -- 진행중 / 협의중 / 매각완료
  detail jsonb not null default '{}'::jsonb,  -- 세부내역 (표준 양식 40개 필드 · 대분류/소분류/내용)
  nda_requests jsonb not null default '[]'::jsonb,  -- NDA 요청 이력 [{id,signer,email,requested_at,status,decided_at}] · status: 운영사 검토/승인/거절
  updated_at timestamptz not null default now()
);

-- 기존 테이블에 컬럼 추가 (재실행 안전)
alter table public.listing_marketing add column if not exists deal_stage text not null default '';
alter table public.listing_marketing add column if not exists matched_at date;
alter table public.listing_marketing add column if not exists npl_status text not null default '';
alter table public.listing_marketing add column if not exists detail jsonb not null default '{}'::jsonb;
alter table public.listing_marketing add column if not exists nda_requests jsonb not null default '[]'::jsonb;

alter table public.listing_marketing enable row level security;

drop policy if exists lm_select on public.listing_marketing;
create policy lm_select on public.listing_marketing for select using (true);
drop policy if exists lm_insert on public.listing_marketing;
create policy lm_insert on public.listing_marketing for insert with check (true);
drop policy if exists lm_update on public.listing_marketing;
create policy lm_update on public.listing_marketing for update using (true);

-- 복수 역할 회원 모델 (D1 · 2026-08-18) — 매각 회원이자 매입 회원 겸용 가능
alter table public.users add column if not exists roles jsonb not null default '[]'::jsonb;      -- 예: ["SELLER","BUYER"]
alter table public.users add column if not exists buyer_kind text not null default '';           -- CORP(법인) / INDIVIDUAL(개인자산가)

-- 메인 히어로 PRIVATE DEAL 카드 (단일 행 id=1) — 운영자 관리자 등록/수정/삭제
create table if not exists public.main_hero (
  id int primary key default 1,
  no text not null default 'N-01',            -- 관리번호
  tag text not null default 'PRIVATE · NPL',  -- 상단 라벨
  title text not null default '',             -- 제목 (예: 서울 종로구 · 토지)
  address text not null default '',           -- 마스킹 주소 (예: 서울 종로구 홍지동 *** · 토지 5,193㎡)
  appraisal text not null default '',         -- 감정가 (억 단위 숫자, 예: 66.7)
  principal text not null default '',         -- 총 채권액
  max_claim text not null default '',         -- 수익권금액(채권최고액)
  asking text not null default '',            -- 협의가
  updated_at timestamptz not null default now(),
  constraint main_hero_single check (id = 1)
);

alter table public.main_hero enable row level security;
drop policy if exists hero_select on public.main_hero;
create policy hero_select on public.main_hero for select using (true);
drop policy if exists hero_insert on public.main_hero;
create policy hero_insert on public.main_hero for insert with check (true);
drop policy if exists hero_update on public.main_hero;
create policy hero_update on public.main_hero for update using (true);
drop policy if exists hero_delete on public.main_hero;
create policy hero_delete on public.main_hero for delete using (true);

-- NPLATFORM 소개 · 언론보도 (제목 + URL 새창 링크) — 운영자 관리자 CRUD
create table if not exists public.press_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  url text not null default '',
  photo_url text not null default '',   -- 좌측 썸네일 이미지 URL
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.press_articles add column if not exists photo_url text not null default '';

alter table public.press_articles enable row level security;
drop policy if exists pa_select on public.press_articles;
create policy pa_select on public.press_articles for select using (true);
drop policy if exists pa_insert on public.press_articles;
create policy pa_insert on public.press_articles for insert with check (true);
drop policy if exists pa_update on public.press_articles;
create policy pa_update on public.press_articles for update using (true);
drop policy if exists pa_delete on public.press_articles;
create policy pa_delete on public.press_articles for delete using (true);

-- 메인 '이번 주 하이라이트 물건 8건' — 운영자 관리자 CRUD ↔ 메인 카드 노출
create table if not exists public.main_highlights (
  id uuid primary key default gen_random_uuid(),
  no text not null default '',          -- 관리번호 표기 (예: N-01)
  location text not null default '',    -- 지역 (예: 서울 종로구)
  category text not null default '',    -- 유형 (예: 토지)
  appraisal text not null default '',   -- 감정가 (예: 66.7억)
  principal text not null default '',   -- 총 채권액
  max_claim text not null default '',   -- 수익권금액(채권최고액)
  asking text not null default '',      -- 협의가
  photo_url text not null default '',   -- 카드 이미지 URL
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.main_highlights enable row level security;
drop policy if exists mh_select on public.main_highlights;
create policy mh_select on public.main_highlights for select using (true);
drop policy if exists mh_insert on public.main_highlights;
create policy mh_insert on public.main_highlights for insert with check (true);
drop policy if exists mh_update on public.main_highlights;
create policy mh_update on public.main_highlights for update using (true);
drop policy if exists mh_delete on public.main_highlights;
create policy mh_delete on public.main_highlights for delete using (true);

create or replace function public.increment_listing_metric(p_listing_id text, p_field text, p_delta int)
returns void language plpgsql security definer as $$
begin
  insert into public.listing_marketing (listing_id) values (p_listing_id)
  on conflict (listing_id) do nothing;
  if p_field = 'interest' then
    update public.listing_marketing
      set interest_count = greatest(0, interest_count + p_delta), updated_at = now()
      where listing_id = p_listing_id;
  elsif p_field = 'nda' then
    update public.listing_marketing
      set nda_count = greatest(0, nda_count + p_delta), updated_at = now()
      where listing_id = p_listing_id;
  end if;
end $$;
