-- =====================================================================
-- Read-only verification of migrations 141 and 142.
--
-- Paste into the Supabase SQL editor for project `altair-os`
-- (ref acsmgzkbvstrbggsukyx), or run with psql against that database.
--
-- INSPECTION ONLY. Every statement is a SELECT. This script contains no
-- CREATE, ALTER, DROP, GRANT, REVOKE, INSERT, UPDATE or DELETE. It cannot
-- change schema, data, or privileges.
--
-- SAFE WHEN THE TABLES DO NOT EXIST. Nothing here queries a target table
-- directly. Existence is resolved through `to_regclass`, and every later
-- query reads the system catalogs, which are always present. If one or both
-- tables are missing, the script still runs to completion and says so —
-- it does not abort partway and leave you guessing which check failed.
--
-- Expected end state after migrations 141 and 142:
--   * both tables exist and are empty
--   * RLS enabled on both
--   * service_role holds SELECT/INSERT/UPDATE/DELETE
--   * anon, authenticated and PUBLIC hold NOTHING
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. EXISTENCE — resolved via to_regclass, never by touching the table.
--    `to_regclass` returns NULL for a missing relation instead of raising,
--    which is what makes this safe to run before the migrations.
-- ---------------------------------------------------------------------
select
  t.table_name,
  to_regclass('public.' || t.table_name) is not null            as table_exists,
  coalesce(c.relrowsecurity, false)                             as rls_enabled,
  coalesce(c.relforcerowsecurity, false)                        as rls_forced,
  case
    when to_regclass('public.' || t.table_name) is null then 'MISSING — migration not applied to this database'
    when not coalesce(c.relrowsecurity, false)          then 'PRESENT but RLS DISABLED — investigate'
    else 'PRESENT, RLS enabled'
  end                                                           as verdict
from (values ('agent_marketing_snapshots'), ('agent_marketing_decisions')) as t(table_name)
left join pg_class c
       on c.oid = to_regclass('public.' || t.table_name)
order by t.table_name;


-- ---------------------------------------------------------------------
-- 2. MIGRATION LEDGER — did the CLI record 141 and 142 as applied?
--
--    A plain `from supabase_migrations.schema_migrations` would abort the
--    whole script on a database where that schema does not exist, because
--    PostgreSQL resolves relation names at PARSE time — a WHERE guard runs
--    too late to help. The read is therefore performed through
--    `query_to_xml`, which takes SQL as TEXT and executes it at run time,
--    inside a CASE that never evaluates that branch when the ledger is
--    absent. Still a plain SELECT; nothing is created or modified.
-- ---------------------------------------------------------------------
select
  case
    when to_regclass('supabase_migrations.schema_migrations') is null
      then 'supabase_migrations.schema_migrations not present — cannot read the ledger (this is not itself a failure)'
    else 'ledger present — rows below'
  end as ledger_status;

select
  (xpath('/row/version/text()', r))[1]::text as version,
  (xpath('/row/name/text()',    r))[1]::text as migration_name
from (
  select unnest(xpath('/table/row', doc)) as r
  from (
    select case
      when to_regclass('supabase_migrations.schema_migrations') is null
        then '<table/>'::xml
      else query_to_xml(
        $ledger$
          select version, name
          from supabase_migrations.schema_migrations
          where version in ('141','142') or name ilike '%agent_marketing%'
          order by version
        $ledger$, false, false, '')
    end as doc
  ) s
) t;


-- ---------------------------------------------------------------------
-- 3. PRIVILEGES — the check that actually matters.
--
--    Uses has_table_privilege(), which reports the EFFECTIVE privilege a
--    role holds, including anything inherited through role membership or
--    granted to PUBLIC. This is stronger than reading
--    information_schema.role_table_grants, which shows only directly
--    granted rows and would miss a privilege reaching anon via PUBLIC.
--
--    PUBLIC is checked explicitly via the 'public' pseudo-role: a grant to
--    PUBLIC reaches every role in the database, including anon, and is the
--    most likely way these tables get accidentally exposed.
--
--    READ THIS RESULT FIRST. Expected:
--      anon           -> all false
--      authenticated  -> all false
--      public         -> all false
--      service_role   -> all true
--    Any `true` on anon, authenticated or public is a finding: it means a
--    browser session can read marketing state pushed by the Agent Platform.
-- ---------------------------------------------------------------------
--    NULL-SAFE BY CONSTRUCTION. The table is passed as a `regclass` OID
--    obtained from `to_regclass`, not as a name. `has_table_privilege` is
--    strict, so a missing table yields NULL rather than raising — the check
--    cannot abort the script, and does not depend on the planner evaluating
--    a WHERE clause before the target list. A missing ROLE is handled the
--    same way, via a lookup that yields NULL when the role is absent.
select
  r.grantee,
  t.table_name,
  case when p.oid is null then 'table missing'
       when r.roleoid is null and r.grantee <> 'public' then 'role not present in this database'
       else null end                                                      as note,
  has_table_privilege(r.grantee, p.oid, 'SELECT')                         as can_select,
  has_table_privilege(r.grantee, p.oid, 'INSERT')                         as can_insert,
  has_table_privilege(r.grantee, p.oid, 'UPDATE')                         as can_update,
  has_table_privilege(r.grantee, p.oid, 'DELETE')                         as can_delete,
  case
    when p.oid is null then 'n/a — table missing'
    when r.roleoid is null and r.grantee <> 'public' then 'n/a — role missing'
    when r.grantee = 'service_role' then
      case when has_table_privilege(r.grantee, p.oid, 'SELECT')
            and has_table_privilege(r.grantee, p.oid, 'INSERT')
            and has_table_privilege(r.grantee, p.oid, 'UPDATE')
            and has_table_privilege(r.grantee, p.oid, 'DELETE')
           then 'OK — service_role has required access'
           else 'PROBLEM — service_role is missing required access' end
    else
      case when has_table_privilege(r.grantee, p.oid, 'SELECT')
             or has_table_privilege(r.grantee, p.oid, 'INSERT')
             or has_table_privilege(r.grantee, p.oid, 'UPDATE')
             or has_table_privilege(r.grantee, p.oid, 'DELETE')
           then 'PROBLEM — this role must have NO access'
           else 'OK — no access' end
  end as verdict
from (
  select g.grantee,
         (select pr.oid from pg_roles pr where pr.rolname = g.grantee) as roleoid
  from (values ('anon'), ('authenticated'), ('public'), ('service_role')) as g(grantee)
) r
cross join (
  select v.table_name, to_regclass('public.' || v.table_name) as oid
  from (values ('agent_marketing_snapshots'), ('agent_marketing_decisions')) as v(table_name)
) p
cross join lateral (select p.table_name) as t(table_name)
order by t.table_name, r.grantee;

-- 3b. Directly granted rows, for cross-reference against the effective
--     privileges above. A row here for anon or authenticated is a finding.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('agent_marketing_snapshots', 'agent_marketing_decisions')
order by table_name, grantee, privilege_type;


-- ---------------------------------------------------------------------
-- 4. ROW COUNTS — from the planner's statistics, not from the tables.
--    reltuples avoids selecting from a relation that may not exist and
--    costs nothing on a large table. -1 means "never analyzed"; for these
--    two tables 0 or -1 both mean "no rows have been written", which is the
--    expected state until the Altair OS routes are deployed.
-- ---------------------------------------------------------------------
select
  t.table_name,
  case when to_regclass('public.' || t.table_name) is null
       then null else c.reltuples::bigint end as estimated_rows,
  case
    when to_regclass('public.' || t.table_name) is null then 'n/a — table missing'
    when c.reltuples <= 0 then 'empty, as expected pre-deployment'
    else 'has rows — something has written to this table'
  end as verdict
from (values ('agent_marketing_snapshots'), ('agent_marketing_decisions')) as t(table_name)
left join pg_class c on c.oid = to_regclass('public.' || t.table_name)
order by t.table_name;


-- ---------------------------------------------------------------------
-- 5. COLUMNS — expect 9 for snapshots, 13 for decisions.
-- ---------------------------------------------------------------------
select table_name, ordinal_position, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('agent_marketing_snapshots', 'agent_marketing_decisions')
order by table_name, ordinal_position;


-- ---------------------------------------------------------------------
-- 6. CONSTRAINTS — expect on 141 the version and dropped_items checks;
--    on 142 unique (company_id, decision_key) plus the subject_kind,
--    decision and note-length checks.
-- ---------------------------------------------------------------------
select rel.relname as table_name,
       con.conname as constraint_name,
       case con.contype when 'p' then 'primary key'
                        when 'f' then 'foreign key'
                        when 'u' then 'unique'
                        when 'c' then 'check'
                        else con.contype::text end as kind,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname in ('agent_marketing_snapshots', 'agent_marketing_decisions')
order by rel.relname, con.contype, con.conname;


-- ---------------------------------------------------------------------
-- 7. INDEXES — expect received_at desc on 141; (company_id, seq) and the
--    partial unapplied index on 142.
-- ---------------------------------------------------------------------
select tablename as table_name, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('agent_marketing_snapshots', 'agent_marketing_decisions')
order by tablename, indexname;


-- ---------------------------------------------------------------------
-- 8. RLS POLICIES — expect NONE. These tables are reached only by
--    server-side code holding the service role, which bypasses RLS. A
--    policy here would mean someone intended direct client access.
-- ---------------------------------------------------------------------
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('agent_marketing_snapshots', 'agent_marketing_decisions')
order by tablename, policyname;
