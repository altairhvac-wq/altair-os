-- Close the referral loop at real work: record when a referred customer's
-- job is actually COMPLETED in the receiving company's workspace.
--
-- Chain: network_referral -> target lead (source='network_referral') ->
-- lead.converted_customer_id -> jobs.customer_id. Jobs have no lead_id, so
-- the honest linkage is "a job for the customer this referral's lead
-- converted to, completed after the referral was sent".
--
-- Semantics:
--   - job_completed_at / completed_job_id are a NEW independent fact
--     ("real work happened"), separate from referral status (won/lost still
--     comes from the lead outcome via 081/137's machinery).
--   - First completed job wins; later completions never overwrite.
--   - Referrals that were declined or cancelled are never stamped.
--   - Only jobs created at/after the referral count — pre-existing jobs for
--     a customer the lead merely got linked to are not this referral's work.

alter table public.network_referrals
  add column if not exists job_completed_at timestamptz;

alter table public.network_referrals
  add column if not exists completed_job_id uuid references public.jobs (id) on delete set null;

comment on column public.network_referrals.job_completed_at is
  'When the first qualifying job for the referred customer was completed in the receiving company''s workspace. Null until real work completes.';

comment on column public.network_referrals.completed_job_id is
  'The job whose completion stamped job_completed_at (first qualifying completion wins).';

create index if not exists network_referrals_completed_job_id_idx
  on public.network_referrals (completed_job_id)
  where completed_job_id is not null;

-- Called best-effort from the job-completion path. Returns the updated
-- referral row, or null when this job doesn't trace back to an unstamped
-- referral (the overwhelmingly common case).
create or replace function public.sync_network_referral_job_completion(
  p_job_id uuid,
  p_target_company_id uuid
)
returns public.network_referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs%rowtype;
  v_referral public.network_referrals%rowtype;
begin
  if not public.is_active_company_member(p_target_company_id) then
    raise exception 'Not authorized to sync referral job completion';
  end if;

  select j.*
  into v_job
  from public.jobs j
  where j.id = p_job_id
    and j.company_id = p_target_company_id;

  if not found or v_job.status <> 'completed' then
    return null;
  end if;

  select nr.*
  into v_referral
  from public.network_referrals nr
  join public.leads l
    on l.id = nr.target_lead_id
  where nr.target_company_id = p_target_company_id
    and nr.job_completed_at is null
    and nr.status not in ('declined', 'cancelled')
    and l.company_id = p_target_company_id
    and l.source = 'network_referral'
    and l.converted_customer_id = v_job.customer_id
    and v_job.created_at >= nr.created_at
  order by nr.created_at asc
  limit 1
  for update of nr;

  if not found then
    return null;
  end if;

  update public.network_referrals
  set
    job_completed_at = coalesce(v_job.completed_at, now()),
    completed_job_id = v_job.id
  where id = v_referral.id
    and job_completed_at is null
  returning * into v_referral;

  if not found then
    return null;
  end if;

  return v_referral;
end;
$$;

revoke all on function public.sync_network_referral_job_completion(uuid, uuid) from public;
grant execute on function public.sync_network_referral_job_completion(uuid, uuid) to authenticated;
