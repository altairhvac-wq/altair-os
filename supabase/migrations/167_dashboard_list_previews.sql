-- Migration 167: the dashboard's card lists, fetched bounded.
--
-- ============================== WHAT THE DASHBOARD ACTUALLY RENDERS ==============================
-- Every attention card on the dashboard has the same shape:
--
--     { count: <predicate over the whole book>.length,
--       items: <the same array>.slice(0, 5 or 10) }
--
-- Nothing renders a whole array. Not one card. The counts already come from SQL
-- (migration 158's aggregate, active in production and proven equal to the
-- shipped predicates by verify-dashboard-equality-live). The ITEMS were still
-- being produced by loading every invoice, every estimate and every expense the
-- company has and slicing ten rows off the end of a filter.
--
-- ============================== WHY THIS IS ROWS, NOT COUNTS ==============================
-- Migration 158 answers "how many". This answers "which ten", using the SAME
-- predicates, copied from 158 rather than re-derived — so the count on a card
-- and the rows beneath it cannot disagree about what they are counting.
--
-- Each list also reproduces the ORDER the TypeScript produced, because a card
-- showing "the ten worst" must not quietly show ten arbitrary ones:
--
--   overdue / draft invoices, draft estimates,
--   pending expenses                    created_at desc, matching listInvoices,
--                                       listEstimates and listExpenses, which
--                                       the slice was taken from
--   unpaid follow-up                    daysUnpaid DESC
--   stale sent estimates                daysSinceSent DESC
--   recent receipts                     see below — this one is not what it looks
--                                       like
--
-- ============================== FOUR ORDERING FAULTS THE DIFFERENTIAL FOUND ==============================
-- The first version of this migration ordered every list by created_at desc
-- and stopped there. Every one of the following was caught by comparing
-- against the shipped predicate's own output IN ORDER rather than as a set,
-- and none of them would have shown up in a count.
--
--   1. NO TIEBREAKER. The seeded tenant has many rows sharing a created_at,
--      and `order by created_at desc` leaves those in an order Postgres is
--      free to change between runs. So is listInvoices, which has the same
--      gap — meaning the OLD dashboard could show a different ten rows on two
--      consecutive renders of unchanged data. Every list here now ends in
--      `id asc`, which is a small improvement on the behaviour it replaces
--      rather than a reproduction of it.
--
--   2. FOLLOW-UP ORDERED BY THE WRONG KEY. daysUnpaid is a floor() of days,
--      so two invoices hours apart can share a daysUnpaid. Ordering by the
--      reference timestamp ascending is NOT the same as ordering by
--      daysUnpaid descending once ties exist, and Array.prototype.sort is
--      stable, so the TypeScript keeps its input order within a tie. Ordered
--      by the computed integer, then the input order.
--
--   3. STALE SENT, identically.
--
--   4. RECENT RECEIPTS SORT BY DATE, NOT TIMESTAMP. This one is invisible in
--      the source: the sort reads `new Date(expense.createdAt)`, and
--      mapExpenseRow sets `createdAt: toDateOnly(row.created_at)` — so the
--      time of day has already been discarded before the comparison runs.
--      Every receipt created on the same day therefore ties, and the stable
--      sort leaves them in listExpenses order. Reproduced as
--      created_at::date desc, then created_at desc, then id.
--
-- ============================== THE PREDICATES ==============================
-- Copied from migration 158, which is the version already proven against the
-- shipped TypeScript. Restating the derivations so the two files can be
-- compared without inferring anything:
--
--   overdue          hasInvoiceUnpaidBalance AND status = 'overdue'
--                    -> status = 'overdue' and balance_due > 0
--                    (isActiveInvoice excludes void/cancelled, and 'overdue' is
--                     neither, so the active test is implied by the status)
--
--   unsent invoice   status = 'draft'
--   unsent estimate  status = 'draft'
--
--   follow-up        isInvoiceAwaitingFollowUp: status in (sent, partially_paid),
--                    balance_due > 0, and floor(days since
--                    coalesce(issue_date, created_at)) >= 7
--
--   stale sent       isEstimateAwaitingRecovery: status = 'sent', a first
--                    estimate_sent activity exists, and floor(days since it) >= 7
--
--   pending expense  status = 'submitted'
--   recent receipt   receipt_status = 'attached'
--
-- The two thresholds are passed in rather than hard-coded, so
-- UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS and ESTIMATE_RECOVERY_THRESHOLD_DAYS
-- stay defined in one place — TypeScript — and cannot drift from a copy in SQL.
--
-- ============================== THE LIMIT IS AN ARGUMENT ==============================
-- The dashboard's own limits are 5 and 10. Passing the limit in means a card
-- that later shows twelve rows does not silently show ten: the caller states
-- what it needs and the SQL honours it. scripts/verify-dashboard-lists-live.mjs
-- asserts each list equals the shipped predicate's own output truncated to the
-- same limit, so an off-by-one in either direction fails.
--
-- ============================== PRIVILEGES ==============================
-- SECURITY DEFINER, pinned search_path, membership-gated, and additionally
-- gated on can_manage_billing because every list here is financial. Explicit
-- revoke before the grant, because PostgreSQL's default is PUBLIC EXECUTE.

begin;

create or replace function public.get_company_dashboard_lists(
  p_company_id uuid,
  p_reference timestamptz,
  p_follow_up_days integer,
  p_recovery_days integer,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 100);
  v_empty jsonb := jsonb_build_object(
    'overdueInvoices', '[]'::jsonb,
    'unsentInvoices', '[]'::jsonb,
    'followUpInvoices', '[]'::jsonb,
    'unsentEstimates', '[]'::jsonb,
    'staleSentEstimates', '[]'::jsonb,
    'pendingExpenses', '[]'::jsonb,
    'recentReceipts', '[]'::jsonb,
    'rejectedExpenseCount', 0,
    'acceptedEstimatesNeedingScheduling', '[]'::jsonb,
    'acceptedEstimatesNeedingSchedulingCount', 0
  );
  v_result jsonb;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  -- A null actor gets empty lists rather than a bypass.
  if v_user_id is null then
    return v_empty;
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  -- Every list below is invoice, estimate or expense data. A caller without
  -- billing access gets empty lists, matching the TypeScript, which passes
  -- empty arrays for those reads rather than erroring.
  if not public.can_manage_billing(p_company_id) then
    return v_empty;
  end if;

  select jsonb_build_object(
    'overdueInvoices', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select i.id, i.invoice_number, i.customer_id, i.job_id, i.status,
               i.total, i.balance_due, i.due_date, i.issue_date, i.created_at,
               c.name as customer_name, c.email as customer_email
        from public.invoices i
        left join public.customers c on c.id = i.customer_id
        where i.company_id = p_company_id
          and i.deleted_at is null
          and i.archived_at is null
          and i.status = 'overdue'::public.invoice_status
          and i.balance_due > 0
        order by i.created_at desc, i.id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),

    'unsentInvoices', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select i.id, i.invoice_number, i.customer_id, i.job_id, i.status,
               i.total, i.balance_due, i.due_date, i.issue_date, i.created_at,
               c.name as customer_name, c.email as customer_email
        from public.invoices i
        left join public.customers c on c.id = i.customer_id
        where i.company_id = p_company_id
          and i.deleted_at is null
          and i.archived_at is null
          and i.status = 'draft'::public.invoice_status
        order by i.created_at desc, i.id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),

    -- daysUnpaid DESC, so the reference date ascending. floor() matches
    -- daysSinceReference's floor(elapsedMs / 86400000).
    'followUpInvoices', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select i.id, i.invoice_number, i.customer_id, i.job_id, i.status,
               i.total, i.balance_due, i.due_date, i.issue_date, i.created_at,
               c.name as customer_name, c.email as customer_email,
               floor(
                 extract(epoch from (
                   p_reference - coalesce(i.issue_date::timestamptz, i.created_at)
                 )) / 86400
               )::integer as days_unpaid
        from public.invoices i
        left join public.customers c on c.id = i.customer_id
        where i.company_id = p_company_id
          and i.deleted_at is null
          and i.archived_at is null
          and i.status in (
                'sent'::public.invoice_status,
                'partially_paid'::public.invoice_status
              )
          and i.balance_due > 0
          and floor(
                extract(epoch from (
                  p_reference - coalesce(i.issue_date::timestamptz, i.created_at)
                )) / 86400
              ) >= p_follow_up_days
        order by days_unpaid desc, i.created_at desc, i.id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),

    'unsentEstimates', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select e.id, e.estimate_number, e.customer_id, e.job_id, e.status,
               e.total, e.created_at,
               c.name as customer_name, c.email as customer_email
        from public.estimates e
        left join public.customers c on c.id = e.customer_id
        where e.company_id = p_company_id
          and e.deleted_at is null
          and e.archived_at is null
          and e.status = 'draft'::public.estimate_status
        order by e.created_at desc, e.id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),

    -- daysSinceSent DESC, so the first estimate_sent activity ascending. The
    -- lateral is the same one migration 158 uses for staleSentCount.
    'staleSentEstimates', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select e.id, e.estimate_number, e.customer_id, e.job_id, e.status,
               e.total, e.created_at,
               c.name as customer_name, c.email as customer_email,
               sent.sent_at,
               floor(
                 extract(epoch from (p_reference - sent.sent_at)) / 86400
               )::integer as days_since_sent
        from public.estimates e
        left join public.customers c on c.id = e.customer_id
        left join lateral (
          select min(a.created_at) as sent_at
          from public.estimate_activities a
          where a.estimate_id = e.id
            and a.company_id = e.company_id
            and a.event_type = 'estimate_sent'
        ) sent on true
        where e.company_id = p_company_id
          and e.deleted_at is null
          and e.archived_at is null
          and e.status = 'sent'::public.estimate_status
          and sent.sent_at is not null
          and floor(
                extract(epoch from (p_reference - sent.sent_at)) / 86400
              ) >= p_recovery_days
        order by days_since_sent desc, e.created_at desc, e.id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),

    'pendingExpenses', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select x.id, x.expense_number, x.merchant, x.amount, x.status,
               x.category, x.purchase_date, x.receipt_status, x.job_id,
               x.technician_id, x.created_at
        from public.expenses x
        where x.company_id = p_company_id
          and x.deleted_at is null
          and x.archived_at is null
          and x.status = 'submitted'::public.expense_status
        order by x.created_at desc, x.id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),

    'recentReceipts', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select x.id, x.expense_number, x.merchant, x.amount, x.status,
               x.category, x.purchase_date, x.receipt_status, x.job_id,
               x.technician_id, x.created_at
        from public.expenses x
        where x.company_id = p_company_id
          and x.deleted_at is null
          and x.archived_at is null
          and x.receipt_status = 'attached'::public.receipt_status
        -- date, not timestamp: mapExpenseRow truncates createdAt before the
        -- shipped sort ever sees it.
        order by x.created_at::date desc, x.created_at desc, x.id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),


    -- ============================== APPROVED ESTIMATES STILL NEEDING ACTION ==============================
    -- isApprovedEstimateNeedingScheduling, expanded. Approved, not archived, not
    -- deleted, and then one of three things:
    --
    --   no job linked at all                          -> needs action
    --   a job id that resolves to no row              -> needs action
    --   a linked job that is scheduled AND unassigned -> needs action
    --
    -- Every other linked-job state returns false, including completed and
    -- cancelled. isJobUnassigned tests assignedTechnicianId AND assignedTechnician,
    -- but the second is the profile NAME produced by the join and is only ever
    -- populated when the id is — so the id alone is the faithful test.
    --
    -- Sort: approvedAt desc, then createdAt desc, then id asc, matching
    -- compareAcceptedEstimateScheduling. approvedAt is the earliest
    -- estimate_approved activity, the same shape as sentAt above, because there
    -- is no approved_at column — see estimate-lifecycle-timestamps.ts. NULLS LAST
    -- reproduces the JavaScript, where a NaN Date.parse falls through to the
    -- created_at comparison rather than sorting first.
    'acceptedEstimatesNeedingScheduling', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select e.id, e.estimate_number, e.customer_id, e.job_id, e.status,
               e.total, e.created_at,
               c.name as customer_name, c.email as customer_email,
               j.job_number,
               approved.approved_at
        from public.estimates e
        left join public.customers c on c.id = e.customer_id
        left join public.jobs j
          on j.id = e.job_id and j.company_id = e.company_id
        left join lateral (
          select min(a.created_at) as approved_at
          from public.estimate_activities a
          where a.estimate_id = e.id
            and a.company_id = e.company_id
            and a.event_type = 'estimate_approved'
        ) approved on true
        where e.company_id = p_company_id
          and e.deleted_at is null
          and e.archived_at is null
          and e.status = 'approved'::public.estimate_status
          and (
            e.job_id is null
            or j.id is null
            or (
              j.status = 'scheduled'::public.job_status
              and j.assigned_technician_id is null
            )
          )
        order by approved.approved_at desc nulls last, e.created_at desc, e.id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),

    'acceptedEstimatesNeedingSchedulingCount', (
      select count(*)
      from public.estimates e
      left join public.jobs j
        on j.id = e.job_id and j.company_id = e.company_id
      where e.company_id = p_company_id
        and e.deleted_at is null
        and e.archived_at is null
        and e.status = 'approved'::public.estimate_status
        and (
          e.job_id is null
          or j.id is null
          or (
            j.status = 'scheduled'::public.job_status
            and j.assigned_technician_id is null
          )
        )
    ),

    'rejectedExpenseCount', (
      select count(*)
      from public.expenses x
      where x.company_id = p_company_id
        and x.deleted_at is null
        and x.archived_at is null
        and x.status = 'rejected'::public.expense_status
    )
  )
  into v_result;

  return v_result;
end;
$function$;

revoke all on function public.get_company_dashboard_lists(
  uuid, timestamptz, integer, integer, integer
) from public;
revoke all on function public.get_company_dashboard_lists(
  uuid, timestamptz, integer, integer, integer
) from anon;
grant execute on function public.get_company_dashboard_lists(
  uuid, timestamptz, integer, integer, integer
) to authenticated, service_role;

commit;
