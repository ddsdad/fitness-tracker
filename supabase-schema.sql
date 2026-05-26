-- ============================================================
-- FitTrack – Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists public.workout_sessions (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  synced_at  timestamptz default now()
);

create table if not exists public.checkins (
  user_id    uuid not null references auth.users(id) on delete cascade,
  week       int  not null,
  data       jsonb not null default '{}',
  primary key (user_id, week)
);

create table if not exists public.goals (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists public.nutrition_logs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       text not null,
  data       jsonb not null default '{}',
  updated_at timestamptz default now(),
  primary key (user_id, date)
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles       enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.checkins       enable row level security;
alter table public.goals          enable row level security;
alter table public.nutrition_logs enable row level security;

-- profiles
create policy "own profile select" on public.profiles for select using (auth.uid() = user_id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "own profile update" on public.profiles for update using (auth.uid() = user_id);
create policy "own profile delete" on public.profiles for delete using (auth.uid() = user_id);

-- workout_sessions
create policy "own sessions select" on public.workout_sessions for select using (auth.uid() = user_id);
create policy "own sessions insert" on public.workout_sessions for insert with check (auth.uid() = user_id);
create policy "own sessions update" on public.workout_sessions for update using (auth.uid() = user_id);
create policy "own sessions delete" on public.workout_sessions for delete using (auth.uid() = user_id);

-- checkins
create policy "own checkins select" on public.checkins for select using (auth.uid() = user_id);
create policy "own checkins insert" on public.checkins for insert with check (auth.uid() = user_id);
create policy "own checkins update" on public.checkins for update using (auth.uid() = user_id);
create policy "own checkins delete" on public.checkins for delete using (auth.uid() = user_id);

-- goals
create policy "own goals select" on public.goals for select using (auth.uid() = user_id);
create policy "own goals insert" on public.goals for insert with check (auth.uid() = user_id);
create policy "own goals update" on public.goals for update using (auth.uid() = user_id);
create policy "own goals delete" on public.goals for delete using (auth.uid() = user_id);

-- nutrition_logs
create policy "own nutrition select" on public.nutrition_logs for select using (auth.uid() = user_id);
create policy "own nutrition insert" on public.nutrition_logs for insert with check (auth.uid() = user_id);
create policy "own nutrition update" on public.nutrition_logs for update using (auth.uid() = user_id);
create policy "own nutrition delete" on public.nutrition_logs for delete using (auth.uid() = user_id);
