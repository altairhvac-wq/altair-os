-- 177: no Storage object may be created for a company whose purge has begun.
--
-- ===================== THE RACE =====================
-- purge-company.mjs deletes the tenant's Storage objects, LISTS AGAIN to prove
-- the buckets are empty, and only then deletes the company row. An object that
-- arrives between the verification and the company delete survives as an
-- orphan, and the purge reports success over it.
--
-- Two write paths reach tenant Storage, and only one of them was closed:
--
--   company-files    RLS. "company members can upload company files" checks
--                    is_active_company_member, which reads company_memberships
--                    — and the purge deletes that table at position 40 of its
--                    65-table order, BEFORE the Storage sweep. So this path is
--                    already shut by the time cleanup starts.
--
--                    It is shut by ORDERING, not by a rule. Reorder
--                    tenant-delete-order.json and the window reopens silently.
--
--   marketing-media  NOT closed at all. lib/storage/marketing-media.ts uploads
--                    with createServiceRoleClient(), which bypasses RLS
--                    entirely. A render completing at any moment during the
--                    purge — including after the empty verification — writes
--                    under the company prefix and survives.
--
-- ===================== WHY A TRIGGER AND NOT A POLICY =====================
-- A policy cannot close the second path. RLS does not apply to service_role, and
-- the marketing upload is a legitimate server-side write that must keep working
-- for every company that is not being purged.
--
-- A BEFORE INSERT trigger fires for every writer, whatever role they hold. That
-- is the property being bought here: the fence is a fact about the row, not
-- about who is asking.
--
-- ===================== WHAT IS FENCED, AND WHEN =====================
-- `purging`, `failed` and `purged` — every state in which a purge has actually
-- started. The only unfenced states are `pending` (the grace period) and
-- `cancelled` (the customer changed their mind).
--
-- NOT `pending`. The grace period exists so a customer can change their mind;
-- the company is still operating and must keep working normally.
--
-- `failed` is fenced deliberately. A half-purged company is already broken —
-- most of its tables are gone — and letting new files land in it makes the
-- damage harder to reason about. Recovering such a company is an explicit
-- decision someone has to make by changing the request's status, which is the
-- right amount of friction.
--
-- ===================== WHAT IS NOT SOLVED HERE =====================
-- This is a fence, not a lock. It prevents new objects; it does not make the
-- purge atomic. The purge's own final re-listing is still what proves the
-- buckets are empty, and it must stay.

-- ---------------------------------------------------------------------------
-- The tenant prefix, per bucket.
--
-- Mirrors the shipped key builders, and is a separate function so the trigger
-- and its tests read the same definition:
--
--   lib/storage/company-files.ts     company/<id>/jobs|expenses/...
--   lib/storage/marketing-media.ts   <id>/video/<name>
--
-- Returns null for a bucket that is not tenant-prefixed (avatars,
-- founder-marketing-screenshots), and for a name that does not parse. A null
-- means "not a tenant object", which is never fenced.
create or replace function public.storage_object_company_id(
  p_bucket_id text,
  p_object_name text
)
returns uuid
language plpgsql
immutable
security definer
set search_path = public, pg_temp
as $$
declare
  v_parts text[];
  v_candidate text;
begin
  if p_bucket_id is null or p_object_name is null then
    return null;
  end if;

  v_parts := storage.foldername(p_object_name);

  if p_bucket_id = 'company-files' then
    if array_length(v_parts, 1) < 2 or v_parts[1] <> 'company' then
      return null;
    end if;
    v_candidate := v_parts[2];
  elsif p_bucket_id = 'marketing-media' then
    if array_length(v_parts, 1) < 1 then
      return null;
    end if;
    v_candidate := v_parts[1];
  else
    return null;
  end if;

  -- A key whose prefix is not a uuid belongs to no company, so it cannot be
  -- fenced by company. Parsed rather than cast so a malformed name is data and
  -- not an error on every upload.
  if v_candidate !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return null;
  end if;

  return v_candidate::uuid;
end;
$$;

revoke all on function public.storage_object_company_id(text, text) from public;
revoke all on function public.storage_object_company_id(text, text) from anon;
grant execute on function public.storage_object_company_id(text, text)
  to authenticated, service_role;

comment on function public.storage_object_company_id(text, text) is
  'The company a Storage object key belongs to, or null when the bucket is not tenant-prefixed. Mirrors the key builders in lib/storage/.';

-- ---------------------------------------------------------------------------
-- The fence itself.
create or replace function public.reject_storage_write_during_company_purge()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
begin
  v_company_id := public.storage_object_company_id(new.bucket_id, new.name);

  if v_company_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.company_deletion_requests r
    where r.company_id = v_company_id
      and r.status in ('purging', 'failed', 'purged')
  ) then
    raise exception
      'company_purge_in_progress: storage writes are fenced for company %',
      v_company_id
      -- A custom SQLSTATE, not check_violation. Supabase Storage flattens a
      -- database error to "database error, code: NNNNN" before the client sees
      -- it, so the CODE is the only thing that survives the trip — and a
      -- generic 23514 could be any constraint on the row. ALT77 can only be
      -- this.
      using errcode = 'ALT77';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_storage_write_during_company_purge() from public;

comment on function public.reject_storage_write_during_company_purge() is
  'Refuses a Storage write into a company whose purge has started. Fires for every role, service_role included, which is the point: the marketing-media upload path bypasses RLS.';

drop trigger if exists company_purge_storage_fence on storage.objects;

-- INSERT and UPDATE both. An update that moves an object INTO a fenced tenant's
-- prefix is the same event as creating one there, and a purging company should
-- receive no writes of any kind. The purge itself only deletes, so it cannot
-- block its own progress.
create trigger company_purge_storage_fence
  before insert or update on storage.objects
  for each row
  execute function public.reject_storage_write_during_company_purge();
