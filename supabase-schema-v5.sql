-- ============================================================
-- FitTrack – Schema v5: Custom exercises + Routines  (run after v4)
-- Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

create table if not exists public.custom_exercises (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '[]',
  updated_at timestamptz default now()
);
create table if not exists public.routines (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '[]',
  updated_at timestamptz default now()
);

alter table public.custom_exercises enable row level security;
alter table public.routines         enable row level security;

create policy "own custom_ex select" on public.custom_exercises for select using (auth.uid() = user_id);
create policy "own custom_ex insert" on public.custom_exercises for insert with check (auth.uid() = user_id);
create policy "own custom_ex update" on public.custom_exercises for update using (auth.uid() = user_id);
create policy "own custom_ex delete" on public.custom_exercises for delete using (auth.uid() = user_id);

create policy "own routines select" on public.routines for select using (auth.uid() = user_id);
create policy "own routines insert" on public.routines for insert with check (auth.uid() = user_id);
create policy "own routines update" on public.routines for update using (auth.uid() = user_id);
create policy "own routines delete" on public.routines for delete using (auth.uid() = user_id);
