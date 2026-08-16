-- Gymbro — Phase 9 schema (routines, exercises, sessions) + RLS.
-- Run this once in the Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Routines: the reusable templates shown on the home screen.
-- ---------------------------------------------------------------------------
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Exercises: belong to a routine. rest_time is in seconds and drives the
-- auto rest timer, same as before.
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  rest_time integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sessions: one row per workout. `status` is 'active' while it's in
-- progress (this is what used to be gymbro_active_session in LocalStorage)
-- and flips to 'completed' on "پایان تمرین" (this is what used to be
-- gymbro_history). `exercises` is a JSONB snapshot of that session's
-- exercises + logged sets — kept as JSONB (rather than normalized further)
-- since it's an append-only log, not something edited via foreign keys.
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  routine_name text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  date timestamptz not null default now(),
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Only one in-progress workout per user at a time (mirrors the app's
-- single-activeSession model).
create unique index one_active_session_per_user
  on public.sessions (user_id)
  where (status = 'active');

create index sessions_user_status_date_idx
  on public.sessions (user_id, status, date desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — every table is scoped to auth.uid(). No cross-user
-- reads or writes are possible, even via the anon key from the browser.
-- ---------------------------------------------------------------------------
alter table public.routines enable row level security;
alter table public.exercises enable row level security;
alter table public.sessions enable row level security;

create policy "routines_select_own" on public.routines
  for select using (auth.uid() = user_id);
create policy "routines_insert_own" on public.routines
  for insert with check (auth.uid() = user_id);
create policy "routines_update_own" on public.routines
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routines_delete_own" on public.routines
  for delete using (auth.uid() = user_id);

create policy "exercises_select_own" on public.exercises
  for select using (auth.uid() = user_id);
create policy "exercises_insert_own" on public.exercises
  for insert with check (auth.uid() = user_id);
create policy "exercises_update_own" on public.exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercises_delete_own" on public.exercises
  for delete using (auth.uid() = user_id);

create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_delete_own" on public.sessions
  for delete using (auth.uid() = user_id);
