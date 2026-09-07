-- Repair for a database created from an older schema.sql than the one in
-- the repo: it was missing `created_at` (fixed separately) and — as ten
-- simultaneous 'active' rows proved — the one_active_session_per_user
-- index. Without that index every start adds another active row, and the
-- app then adopts the newest one on every boot, so each Cancel just
-- revealed the next. Run in the SQL Editor, top to bottom, while NO device
-- has a workout in progress (step 2 closes every active row).

-- 0. What guards exist right now? Expect to see one_active_session_per_user
--    and four policies (select/insert/update/delete). Anything missing
--    below is created by steps 3-4.
select indexname from pg_indexes where schemaname = 'public' and tablename = 'sessions';
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'sessions' order by cmd;

-- 1. Look before you leap.
select user_id, count(*) as active_rows, min(date) as oldest, max(date) as newest
from public.sessions
where status = 'active'
group by user_id;

-- 2. Close EVERY active row, the way the app's finish does: rows with logged
--    sets become completed history entries (set-less exercises stripped),
--    empty rows are deleted.
update public.sessions s
set status = 'completed',
    exercises = (
      select coalesce(jsonb_agg(ex), '[]'::jsonb)
      from jsonb_array_elements(s.exercises) ex
      where jsonb_array_length(coalesce(ex->'sets', '[]'::jsonb)) > 0
    )
where s.status = 'active'
  and exists (
    select 1 from jsonb_array_elements(s.exercises) ex
    where jsonb_array_length(coalesce(ex->'sets', '[]'::jsonb)) > 0
  );

delete from public.sessions
where status = 'active';

-- 3. The guard that makes a second active row impossible. Errors if step 2
--    was skipped and duplicates remain — that is the point.
create unique index if not exists one_active_session_per_user
  on public.sessions (user_id)
  where (status = 'active');

create index if not exists sessions_user_status_date_idx
  on public.sessions (user_id, status, date desc);

-- 4. Row Level Security, exactly as in schema.sql. Idempotent: each policy
--    is dropped and recreated. A missing delete/update policy makes the
--    app's deletes and updates silently affect zero rows — no error is
--    returned — which would also explain sessions that refuse to die.
alter table public.sessions enable row level security;

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);
drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);
drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own" on public.sessions
  for delete using (auth.uid() = user_id);

-- 5. Verify: zero active rows, the index present, four policies.
select count(*) as active_rows from public.sessions where status = 'active';
select indexname from pg_indexes where schemaname = 'public' and tablename = 'sessions';
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'sessions' order by cmd;
