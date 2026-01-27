-- Supabase schema for profilemaker
-- Run in: Supabase Dashboard → SQL Editor

-- Extensions
create extension if not exists pgcrypto;

-- Leaders (stores full Leader Bible JSON + a few indexed/derived fields)
create table if not exists public.leaders (
  id uuid primary key default gen_random_uuid(),
  leader_key text unique not null, -- metadata.leaderId
  name text,
  tagline text,
  vertical text,
  sub_domains text[],
  tier text,
  composite_score integer,
  profile_pic_url text,
  welcome_video_url text,
  model text,
  raw_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-updated updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leaders_updated_at on public.leaders;
create trigger set_leaders_updated_at
before update on public.leaders
for each row execute function public.set_updated_at();

-- Assets (avatar images, trailers, etc.)
create table if not exists public.leader_assets (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.leaders(id) on delete cascade,
  asset_type text not null check (asset_type in ('avatar', 'trailer')),
  url text,
  provider text,
  provider_prediction_id text,
  prompt text,
  negative_prompt text,
  style_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leader_assets_leader_id_idx on public.leader_assets(leader_id);
create index if not exists leader_assets_provider_pred_idx on public.leader_assets(provider, provider_prediction_id);

-- Chat logs (one row per non-streaming chat call)
create table if not exists public.leader_chat_logs (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.leaders(id) on delete cascade,
  messages jsonb not null, -- array of {role, content}
  output_text text not null,
  model text not null,
  response_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists leader_chat_logs_leader_id_idx on public.leader_chat_logs(leader_id);

-- RLS
alter table public.leaders enable row level security;
alter table public.leader_assets enable row level security;
alter table public.leader_chat_logs enable row level security;

-- Public read-only (optional):
-- Allow anyone (anon) to read leaders + assets. Chat logs stay private by default.
drop policy if exists "leaders_read_all" on public.leaders;
create policy "leaders_read_all"
on public.leaders
for select
to anon
using (true);

drop policy if exists "leader_assets_read_all" on public.leader_assets;
create policy "leader_assets_read_all"
on public.leader_assets
for select
to anon
using (true);

-- No insert/update/delete policies for anon → browser cannot write.
-- Server uses SERVICE_ROLE_KEY, which bypasses RLS.


