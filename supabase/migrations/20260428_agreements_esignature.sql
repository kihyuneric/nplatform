-- ─────────────────────────────────────────────────────────────────────────
-- agreements — 자체 전자서명 NDA / LOI 파이프라인
--
-- 목적:
--   · 매수자가 매물 검토 단계에서 NDA / LOI 를 자체 전자서명으로 체결.
--   · 5년 보관 의무 (전자서명법 / 신용정보법) — expires_at 기본 +5년.
--   · 감사로그 (audit_log) 로 created/signed/viewed/approved/rejected 추적.
--   · PDF 는 Supabase Storage ('agreements' bucket) 에 저장, pdf_path 만 row 에.
--
-- 권한 (RLS):
--   · 매수자(buyer_id) 본인 — 자기 row SELECT/INSERT 가능
--   · 매도자(seller_id, listing.seller_id 와 일치) — 자기 매물의 row SELECT/UPDATE
--   · ADMIN/SUPER_ADMIN — 전체 SELECT/UPDATE/DELETE
-- ─────────────────────────────────────────────────────────────────────────

-- agreement_type enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'agreement_type') then
    create type agreement_type as enum ('NDA', 'LOI');
  end if;
  if not exists (select 1 from pg_type where typname = 'agreement_status') then
    create type agreement_status as enum ('PENDING', 'SIGNED', 'APPROVED', 'REJECTED', 'EXPIRED');
  end if;
end$$;

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  type agreement_type not null,
  status agreement_status not null default 'PENDING',

  -- 관계
  listing_id uuid not null,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid not null,                                -- listing.seller_id 캐시
  deal_room_id uuid,

  -- 서명자 정보
  signer_name text not null,                              -- 서명자 실명
  signer_company text,                                    -- 서명자 소속 (선택)
  signer_email text,                                      -- 통보용
  signature_data text not null,                           -- base64 PNG (서명 캔버스)
  signed_at timestamptz not null default now(),
  signed_ip inet,                                         -- 서명 시점 IP (감사용)
  signed_user_agent text,                                 -- 서명 시점 UA (감사용)

  -- PDF 저장
  pdf_path text,                                          -- supabase storage path (agreements/{type}/{yyyy}/{id}.pdf)
  pdf_size_bytes integer,
  pdf_sha256 text,                                        -- 위변조 방지 해시

  -- 만료 (5년)
  expires_at timestamptz not null default (now() + interval '5 years'),

  -- 감사로그 (JSONB array)
  audit_log jsonb not null default '[]'::jsonb,           -- [{event, at, by, ip?, ua?, note?}]

  -- LOI 전용 필드 (NDA 일 땐 null)
  loi_amount bigint,                                      -- 매수 희망가 (KRW)
  loi_funding_plan text,                                  -- CASH / LEVERAGED / FUND
  loi_duration_days integer,                              -- 실사 기간 (일)
  loi_acquisition_entity text,                            -- 인수 주체
  loi_seller_message text,                                -- 매도자에게 메시지

  -- NDA 전용 필드 (LOI 일 땐 null)
  nda_clause_version text,                                -- NDA 조항 버전 ('v1' 등)
  nda_clauses_accepted jsonb,                             -- 동의한 조항 목록 (선택)

  -- 메타
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────
create index if not exists idx_agreements_listing on public.agreements (listing_id);
create index if not exists idx_agreements_buyer on public.agreements (buyer_id, type);
create index if not exists idx_agreements_seller on public.agreements (seller_id, type, status);
create index if not exists idx_agreements_status on public.agreements (status, expires_at);
create index if not exists idx_agreements_signed_at on public.agreements (signed_at desc);

-- 매물 + 매수자 + type 별로 1건만 활성 (PENDING/SIGNED/APPROVED) 가능
create unique index if not exists ux_agreements_buyer_listing_type_active
  on public.agreements (listing_id, buyer_id, type)
  where status in ('PENDING', 'SIGNED', 'APPROVED');

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.agreements enable row level security;

-- 매수자 본인: 자기 row 조회
drop policy if exists "agreements_buyer_select" on public.agreements;
create policy "agreements_buyer_select" on public.agreements
  for select using (buyer_id = auth.uid());

-- 매도자 본인: 자기 매물의 row 조회 + 승인/거절 update
drop policy if exists "agreements_seller_select" on public.agreements;
create policy "agreements_seller_select" on public.agreements
  for select using (seller_id = auth.uid());

drop policy if exists "agreements_seller_review" on public.agreements;
create policy "agreements_seller_review" on public.agreements
  for update using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

-- 매수자: insert 가능
drop policy if exists "agreements_buyer_insert" on public.agreements;
create policy "agreements_buyer_insert" on public.agreements
  for insert with check (buyer_id = auth.uid());

-- ADMIN/SUPER_ADMIN — service-role 키로 우회 (별도 정책 불필요).

-- ─── trigger: updated_at ─────────────────────────────────────────────────
create or replace function public.touch_agreements_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_agreements_updated_at on public.agreements;
create trigger trg_agreements_updated_at
  before update on public.agreements
  for each row execute function public.touch_agreements_updated_at();

-- ─── audit log helper — append 전용 ──────────────────────────────────────
create or replace function public.append_agreement_audit(
  agreement_id uuid,
  event text,
  by_user uuid default auth.uid(),
  ip inet default null,
  ua text default null,
  note text default null
) returns void language plpgsql security definer as $$
begin
  update public.agreements
    set audit_log = audit_log || jsonb_build_object(
      'event', event,
      'at', now(),
      'by', by_user,
      'ip', ip::text,
      'ua', ua,
      'note', note
    )
  where id = agreement_id;
end$$;

grant execute on function public.append_agreement_audit(uuid, text, uuid, inet, text, text) to authenticated;

-- ─── Storage bucket 생성 (agreements PDF 저장) ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agreements',
  'agreements',
  false,
  10 * 1024 * 1024,  -- 10MB
  array['application/pdf']
)
on conflict (id) do nothing;

-- bucket RLS — 매수자/매도자/admin 만 자기 row 의 PDF 다운로드 가능
drop policy if exists "agreements_storage_select" on storage.objects;
create policy "agreements_storage_select" on storage.objects
  for select using (
    bucket_id = 'agreements' and (
      -- service-role 우회 (admin)
      auth.role() = 'service_role'
      -- 매수자/매도자 본인 — agreement row 매칭
      or exists (
        select 1 from public.agreements a
        where a.pdf_path = storage.objects.name
          and (a.buyer_id = auth.uid() or a.seller_id = auth.uid())
      )
    )
  );

drop policy if exists "agreements_storage_insert" on storage.objects;
create policy "agreements_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'agreements'
    and (auth.role() = 'service_role' or auth.uid() is not null)
  );

comment on table public.agreements is
  '자체 전자서명 NDA / LOI 이력 — 5년 보관 (전자서명법). audit_log 필수.';
