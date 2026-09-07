-- Server-side backstop against "zombie" workouts. Run in the SQL Editor.
--
-- A queued INSERT replayed from a device's offline queue carries the
-- session's ORIGINAL start time in `date`. No genuine workout is started
-- and still in progress six hours later, so an 'active' insert whose start
-- is older than that can only be a stale replay — from any device, on any
-- build of the app. Reject it here so no client bug can resurrect a
-- workout again.

create or replace function public.reject_stale_active_session()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' and new.date < now() - interval '6 hours' then
    raise exception 'stale active session (started %, rejected as a replay)', new.date
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_reject_stale_active on public.sessions;
create trigger sessions_reject_stale_active
  before insert on public.sessions
  for each row execute function public.reject_stale_active_session();

-- Diagnostics live in 2026-09-07_sessions_created_at.sql.
