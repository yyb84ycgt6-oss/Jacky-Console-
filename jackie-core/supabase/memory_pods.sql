create extension if not exists pgcrypto;

create table if not exists public.memory_pods (
  id uuid primary key default gen_random_uuid(),
  user_id text default 'daigle',
  created_at timestamptz default now(),
  kind text check (kind in ('session_summary','pod','decision','artifact_ref')),
  summary text not null,
  full_text text,
  metadata jsonb
);

create index if not exists memory_pods_user_created_at_idx
  on public.memory_pods (user_id, created_at desc);
