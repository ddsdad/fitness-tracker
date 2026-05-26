-- ============================================================
-- FitTrack – Schema v2  (run AFTER supabase-schema.sql)
-- Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── Measurement history ───────────────────────────────────────────────────────
-- One row per measurement update (bodyweight, chest, bench PR, etc.)
create table if not exists public.measurement_history (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       text not null,           -- YYYY-MM-DD
  metric     text not null,           -- 'bodyweight' | 'chest' | 'bench' | …
  value      real not null,
  unit       text default 'kg'
);
create index if not exists idx_mh_user on public.measurement_history(user_id, date);

alter table public.measurement_history enable row level security;
create policy "own mh select" on public.measurement_history for select using (auth.uid() = user_id);
create policy "own mh insert" on public.measurement_history for insert with check (auth.uid() = user_id);
create policy "own mh delete" on public.measurement_history for delete using (auth.uid() = user_id);

-- ── Leaderboard stats (public-readable) ──────────────────────────────────────
-- Each user has one row; everyone can SELECT, only owner can UPDATE.
create table if not exists public.leaderboard_stats (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Athlete',
  updated_at   timestamptz default now(),
  stats        jsonb not null default '{}'
  -- stats shape:
  -- { sessionsWeek, sessionsMonth, sessionsAllTime,
  --   volumeWeek, streak,
  --   benchPR, squatPR, deadliftPR,
  --   bodyweight, weightChangeWeek, weightChangeMonth, unit }
);

alter table public.leaderboard_stats enable row level security;
create policy "public lb read"   on public.leaderboard_stats for select using (true);
create policy "own lb insert"    on public.leaderboard_stats for insert with check (auth.uid() = user_id);
create policy "own lb update"    on public.leaderboard_stats for update using (auth.uid() = user_id);
create policy "own lb delete"    on public.leaderboard_stats for delete using (auth.uid() = user_id);
