-- One-off cleanup for duplicate 'active' sessions, plus the guard that
-- should have prevented them. Run in the Supabase SQL Editor. Every
-- statement is scoped per user, so it is safe on a multi-user database.
--
-- Background: the app reads "the" active session with a single-row query.
-- Once a user had two active rows that query errored, the app treated the
-- error as "no active session", the user started a new routine, and the
-- duplicates multiplied. The client is fixed to read the newest row, and
-- the unique index below makes a second active row impossible again.

-- 0. Look before you leap: how many active rows does each user have?
select user_id, count(*) as active_rows, max(date) as newest
from public.sessions
where status = 'active'
group by user_id
order by active_rows desc;

-- 1. Delete stale active sessions with NO logged sets — the app deletes
--    these itself on "پایان تمرین", so nothing of value is lost. The newest
--    active session per user is kept regardless, in case it is a workout
--    actually in progress right now.
delete from public.sessions s
where s.status = 'active'
  and s.id <> (
    select id from public.sessions n
    where n.user_id = s.user_id and n.status = 'active'
    order by n.date desc limit 1
  )
  and not exists (
    select 1 from jsonb_array_elements(s.exercises) ex
    where jsonb_array_length(coalesce(ex->'sets', '[]'::jsonb)) > 0
  );

-- 2. Stale active sessions that DO have logged sets become completed
--    history entries, with set-less exercises stripped out — the same shape
--    the app writes on a normal finish. Again the newest per user is left
--    alone.
update public.sessions s
set status = 'completed',
    exercises = (
      select coalesce(jsonb_agg(ex), '[]'::jsonb)
      from jsonb_array_elements(s.exercises) ex
      where jsonb_array_length(coalesce(ex->'sets', '[]'::jsonb)) > 0
    )
where s.status = 'active'
  and s.id <> (
    select id from public.sessions n
    where n.user_id = s.user_id and n.status = 'active'
    order by n.date desc limit 1
  );

-- 3. Re-create the guard from schema.sql (idempotent). This fails if any
--    user still has more than one active row, which is the point — steps 1
--    and 2 must have run first.
create unique index if not exists one_active_session_per_user
  on public.sessions (user_id)
  where (status = 'active');

-- 4. Verify: every user should now show at most 1.
select user_id, count(*) as active_rows
from public.sessions
where status = 'active'
group by user_id;
