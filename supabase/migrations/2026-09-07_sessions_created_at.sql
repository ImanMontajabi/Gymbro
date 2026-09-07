-- `sessions.created_at` exists in schema.sql but not in databases created
-- before it was added there. It records when the SERVER inserted the row,
-- as opposed to `date`, which the client sets to the workout's start time.
-- The gap between the two is what tells a replayed offline insert (old
-- `date`, fresh `created_at`) from a genuine start (both fresh).
--
-- Safe on any state of the table: existing rows are backfilled with the
-- time this runs, so the gap is only meaningful for rows inserted after
-- this migration.
alter table public.sessions
  add column if not exists created_at timestamptz not null default now();

-- 1. Works right now, before any new rows exist: a replayed insert keeps
--    the workout's ORIGINAL start time. If the newest active "Upper B" row
--    has a `date` hours or days old, it was replayed from a queue; if its
--    `date` is the moment you last tapped Cancel, it was a real start.
select id,
       status,
       date,
       (select count(*) from jsonb_array_elements(exercises) ex
        where jsonb_array_length(coalesce(ex->'sets', '[]'::jsonb)) > 0) as exercises_with_sets
from public.sessions
where routine_name = 'Upper B'
order by date desc
limit 20;

-- 2. For rows inserted after this migration: the same question, answered
--    by the server rather than by the client's clock.
select id,
       status,
       date,
       created_at,
       created_at - date as replay_lag
from public.sessions
where routine_name = 'Upper B'
order by created_at desc
limit 20;
