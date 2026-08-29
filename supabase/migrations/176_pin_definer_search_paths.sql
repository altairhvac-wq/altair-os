-- 176: put pg_temp at the tail of every SECURITY DEFINER search_path.
--
-- ===================== WHAT THIS IS, AND WHAT IT IS NOT =====================
-- It is NOT a fix for unpinned functions. A sweep of pg_proc found zero of
-- those: all 78 SECURITY DEFINER functions in `public` already fix their
-- search_path, and the new rule in scripts/verify-function-grants.mjs keeps it
-- that way. Nothing here closes an open hole.
--
-- What it closes is a documented footgun in the SPELLING. Forty-seven of the
-- older functions set `search_path = public`; the thirty written from migration
-- 148 onward set `search_path = public, pg_temp`. That difference is not
-- cosmetic. PostgreSQL searches the temporary schema FIRST for relation names
-- when pg_temp is not listed in the path — listing it last is the documented
-- way to stop that. So `= public` leaves a SECURITY DEFINER body resolving
-- `company_members` to a temp table if the session has one by that name, and
-- `= public, pg_temp` does not.
--
-- ===================== HOW REACHABLE IS THAT, HONESTLY =====================
-- Not, today. The attack needs a temp relation created in the same session that
-- calls the function, and PostgREST offers no way to issue CREATE TEMP TABLE —
-- there is no arbitrary-SQL RPC in this schema. This is hardening against a
-- future where something else holds a session, not a live exposure. It is
-- listed as non-blocking.
--
-- ===================== WHY A SWEEP AND NOT 47 ALTER LINES =====================
-- Hand-transcribing 47 signatures is 47 chances to get an argument type wrong,
-- and one wrong signature aborts the migration. The catalog already knows every
-- signature, including overloads. The sweep also APPENDS rather than replaces:
-- one function is on `public, extensions` and must keep extensions on its path.
--
-- Idempotent: a function that already ends in pg_temp is skipped, so running
-- this twice changes nothing. Metadata only — no body, no ACL, no policy is
-- touched.

do $$
declare
  target record;
  current_path text;
begin
  for target in
    select
      p.oid,
      p.oid::regprocedure::text as signature,
      (
        select c.setting
        from unnest(p.proconfig) as c(setting)
        where c.setting like 'search_path=%'
        limit 1
      ) as config
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proconfig is not null
  loop
    current_path := substring(target.config from length('search_path=') + 1);

    -- Already ends with pg_temp, in any spacing. Leave it alone.
    if current_path ~* '(^|,)\s*pg_temp\s*$' then
      continue;
    end if;

    -- Mentioned but not last is a different decision than this migration is
    -- entitled to make: moving it would change resolution order for whatever
    -- follows it. Report by leaving it, so the verifier keeps flagging it.
    if current_path ~* '(^|,)\s*pg_temp\s*(,|$)' then
      continue;
    end if;

    execute format(
      'alter function %s set search_path = %s',
      target.signature,
      current_path || ', pg_temp'
    );
  end loop;
end
$$;
