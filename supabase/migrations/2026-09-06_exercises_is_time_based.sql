-- Adds the time-based flag to exercises (see schema.sql). Run once in the
-- Supabase SQL Editor on any database created before this column existed —
-- the app's routine query selects it, so routines fail to load until the
-- column is present. Idempotent: safe to re-run.
alter table public.exercises
  add column if not exists is_time_based boolean not null default false;
