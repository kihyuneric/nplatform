-- ============================================================
-- 20260416_ml_training_runs.sql
-- ML retraining pipeline tables (Phase 6-4)
-- ============================================================

-- ─── model_registry ──────────────────────────────────────────
create table if not exists public.model_registry (
  id uuid primary key default gen_random_uuid(),
  model_type text not null check (model_type in ('price', 'risk', 'matching', 'recovery', 'bid_rate')),
  version text not null,
  name text,
  status text not null check (status in ('active', 'shadow', 'deprecated', 'training')),
  algorithm text not null,
  features jsonb default '[]'::jsonb,
  metrics jsonb default '{}'::jsonb,
  traffic_pct integer default 0 check (traffic_pct between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  promoted_at timestamptz,
  unique (model_type, version)
);

create index if not exists idx_model_registry_type_status
  on public.model_registry (model_type, status);

-- ─── ml_training_runs ────────────────────────────────────────
create table if not exists public.ml_training_runs (
  id text primary key,
  model_type text not null check (model_type in ('price', 'risk', 'matching', 'recovery', 'bid_rate')),
  status text not null check (status in ('requested', 'running', 'completed', 'failed')),
  sample_count integer default 0,
  metrics_before jsonb,
  metrics_after jsonb,
  promoted_version text,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_by uuid references auth.users(id)
);

create index if not exists idx_ml_training_runs_type_started
  on public.ml_training_runs (model_type, started_at desc);
create index if not exists idx_ml_training_runs_status
  on public.ml_training_runs (status);

-- ─── deals: prediction tracking columns ──────────────────────
-- (Safe to re-run — alter-if-not-exists pattern)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='deals' and column_name='predicted_price') then
    alter table public.deals add column predicted_price numeric;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='deals' and column_name='predicted_recovery') then
    alter table public.deals add column predicted_recovery numeric;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='deals' and column_name='recovery_amount') then
    alter table public.deals add column recovery_amount numeric;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='deals' and column_name='days_to_close') then
    alter table public.deals add column days_to_close integer;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='deals' and column_name='risk_grade_predicted') then
    alter table public.deals add column risk_grade_predicted text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='deals' and column_name='risk_grade_actual') then
    alter table public.deals add column risk_grade_actual text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='deals' and column_name='completed_at') then
    alter table public.deals add column completed_at timestamptz;
  end if;
end$$;

-- ─── RLS policies ────────────────────────────────────────────
alter table public.model_registry enable row level security;
alter table public.ml_training_runs enable row level security;

drop policy if exists "admin read model_registry" on public.model_registry;
create policy "admin read model_registry" on public.model_registry
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "admin write model_registry" on public.model_registry;
create policy "admin write model_registry" on public.model_registry
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "admin read ml_training_runs" on public.ml_training_runs;
create policy "admin read ml_training_runs" on public.ml_training_runs
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "admin write ml_training_runs" on public.ml_training_runs;
create policy "admin write ml_training_runs" on public.ml_training_runs
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─── Seed initial model versions (idempotent) ────────────────
insert into public.model_registry (model_type, version, name, status, algorithm, features, metrics, traffic_pct, promoted_at)
values
  ('price',    '1.0.0', 'NPL Price Predictor v1', 'active', 'SimpleNN',
   '["collateral_type","region","principal_amount","appraised_value","ltv","delinquency_months","debtor_count","area_sqm"]'::jsonb,
   '{"mape":12.5,"sample_count":1200,"validated_at":"2026-01-15T00:00:00Z"}'::jsonb, 100, now()),
  ('risk',     '1.0.0', 'Risk Classifier v1',      'active', 'XGBoost',
   '["collateral_type","ltv","delinquency_months","court_region","economic_index"]'::jsonb,
   '{"accuracy":0.82,"f1_score":0.78,"auc_roc":0.86,"sample_count":850,"validated_at":"2026-01-15T00:00:00Z"}'::jsonb, 100, now()),
  ('recovery', '1.0.0', 'Recovery Predictor v1',   'active', 'Ensemble',
   '["collateral_type","principal_amount","ltv","region","court_processing_days"]'::jsonb,
   '{"mape":15.3,"sample_count":620,"validated_at":"2026-01-15T00:00:00Z"}'::jsonb, 100, now())
on conflict (model_type, version) do nothing;

comment on table public.model_registry is 'ML model version registry with metrics and A/B routing (Phase 6-4)';
comment on table public.ml_training_runs is 'ML retraining pipeline run history with before/after metrics (Phase 6-4)';
