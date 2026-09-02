-- Grant the agent queues' sequences to service_role.
--
-- ============ THE BUG THIS FIXES, PRECISELY ============
-- Migrations 142, 188 and 189 each created a queue with a `seq bigserial`
-- delivery cursor and granted `all on TABLE ... to service_role`. A table
-- grant does NOT cover the sequence bigserial creates behind the column, and
-- in this database the default privileges did not either — so every
-- service-role INSERT into the three queues failed with:
--
--   42501: permission denied for sequence agent_chief_messages_seq_seq
--
-- which `mapDatabaseError` renders as "You do not have permission to perform
-- this action." The founder read that as an authorization failure and audited
-- the gates; the gates were never involved. Verified live on 2026-09-01 with
-- FK-violating probe inserts against all three tables: each returned 42501
-- naming its sequence, so the SELECT paths worked (pull looked healthy) while
-- every write was broken — questions could not be queued, answers could not
-- be recorded, and no human decision has ever been recordable (the decisions
-- table held zero rows).
--
-- ============ WHY A SEPARATE MIGRATION ============
-- 142/188/189 are already applied in production and will not re-run there.
-- They are ALSO being fixed in-repo so a fresh environment replaying the
-- history never reproduces the bug; this file exists for every environment
-- that already ran the unfixed versions. Grants are idempotent, so both
-- running is harmless.
--
-- `usage` is what nextval() needs; `select` lets currval-style reads work.
-- Nothing is granted to `authenticated` or `anon`: operators never insert
-- into these queues directly, and the sequences follow the tables' posture.

grant usage, select on sequence public.agent_marketing_decisions_seq_seq to service_role;
grant usage, select on sequence public.agent_chief_messages_seq_seq to service_role;
grant usage, select on sequence public.agent_work_requests_seq_seq to service_role;
