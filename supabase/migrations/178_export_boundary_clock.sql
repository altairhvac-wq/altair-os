-- 178: the export boundary must come from the database clock.
--
-- ===================== WHY =====================
-- The workspace export excludes rows created after the instant it began, by
-- filtering `created_at <= boundary`. That instant was captured with
-- `new Date().toISOString()` in Node — a DIFFERENT clock from the one that
-- stamps created_at.
--
-- Measured against this project's database: the application host's clock ran
-- roughly 700 ms AHEAD of the database's. That is the dangerous direction. A
-- boundary in the future relative to the stamping clock means a row inserted
-- shortly AFTER the export started still gets a created_at earlier than the
-- boundary, and is silently included — the export's own consistency contract
-- broken by clock skew rather than by anything in its logic.
--
-- It is not fixable with a safety margin. A margin is a guess about skew that
-- is wrong in one direction or the other, and picking one would make the
-- boundary a timing assumption instead of a fact.
--
-- One clock stamps the rows. The same clock has to draw the line.
--
-- ===================== WHY A FUNCTION AND NOT A SELECT =====================
-- PostgREST exposes no way to read now() without one, and adding a general SQL
-- endpoint to read a clock would be a much larger thing than this needs. The
-- function takes no arguments, reads nothing, and returns a timestamp.

create or replace function public.export_boundary()
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- now() and not clock_timestamp(): the transaction's start time is stable
  -- within a call and is what row defaults use.
  select now();
$$;

revoke all on function public.export_boundary() from public;
revoke all on function public.export_boundary() from anon;
-- service_role only. The export runs there, and a boundary is not something a
-- session should be able to read as a general clock oracle.
grant execute on function public.export_boundary() to service_role;

comment on function public.export_boundary() is
  'The database clock, for the workspace export to draw its boundary with. Exists because the application host''s clock is not the clock that stamps created_at, and was measured running ahead of it.';
