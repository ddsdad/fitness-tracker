-- ============================================================
-- FitTrack – Schema v3: Friend Leagues  (run after v2)
-- Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

create table if not exists public.leagues (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  code       text not null unique,            -- short join code, e.g. 'AB7K9'
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.league_members (
  league_id  uuid not null references public.leagues(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  joined_at  timestamptz default now(),
  primary key (league_id, user_id)
);

alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;

-- Leagues: public read (needed to join by code); owner manages
create policy "leagues read"   on public.leagues for select using (true);
create policy "leagues insert" on public.leagues for insert with check (auth.uid() = owner_id);
create policy "leagues update" on public.leagues for update using (auth.uid() = owner_id);
create policy "leagues delete" on public.leagues for delete using (auth.uid() = owner_id);

-- Members: public read (needed to build a league board); you manage your own row
create policy "members read"   on public.league_members for select using (true);
create policy "members insert" on public.league_members for insert with check (auth.uid() = user_id);
create policy "members delete" on public.league_members for delete using (auth.uid() = user_id);
