-- ============================================================
-- FitTrack – Schema v4: Recipes  (run after v3)
-- Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

create table if not exists public.recipes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '[]',   -- array of recipe objects
  updated_at timestamptz default now()
);

alter table public.recipes enable row level security;
create policy "own recipes select" on public.recipes for select using (auth.uid() = user_id);
create policy "own recipes insert" on public.recipes for insert with check (auth.uid() = user_id);
create policy "own recipes update" on public.recipes for update using (auth.uid() = user_id);
create policy "own recipes delete" on public.recipes for delete using (auth.uid() = user_id);
