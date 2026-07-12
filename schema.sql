-- Ludex content site schema
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Run
-- This replaces the old game-platform tables (profiles/games/comments/scores/likes/subs)
-- with a single table for deals + news posts.

drop table if exists public.posts cascade;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('deal', 'news')),
  title text not null,
  summary text,
  url text not null unique,
  image_url text,
  store_or_source text,
  price_current numeric,
  price_original numeric,
  discount_pct numeric,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index posts_kind_published_idx on public.posts (kind, published_at desc);

alter table public.posts enable row level security;

-- Anyone (anon key) can read
create policy "Public read access"
  on public.posts for select
  using (true);

-- Only the service_role key can insert/update/delete (n8n uses this, not the anon key)
create policy "Service role write access"
  on public.posts for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
