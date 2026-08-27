-- Migration 161: aggregate the invoice and estimate queue strips.
--
-- ============================== THE DEFECT THIS CLOSES ==============================
-- Paging the Sales lists fixed the lists. It did not fix the strips above them.
--
--     buildInvoicesGlanceStats({ invoices, payments })
--     buildEstimatesGlanceStats({ estimates })
--
-- Both reduce over the array the view was handed. While the page loaded every
-- invoice that array was the book (up to PostgREST's silent 1,000-row ceiling);
-- once the list is served 50 rows at a time it is 50 rows, and a strip that says
--
--     Overdue   7   $12,480 owed
--
-- would be describing the newest fifty invoices while looking like a statement
-- about the company's receivables. That is a worse failure than the one paging
-- removed, because the number is smaller AND more confident.
--
-- The landing pill has the same problem from the other end:
-- resolveDefaultInvoiceWorkQueue walks the queues and picks the first with any
-- invoice in it, over the same array. Given one page it can land on a queue that
-- merely happens to be represented in the newest fifty.
--
-- ============================== WHY AN RPC ==============================
-- Counts alone would be head requests. These are counts AND sums —
-- sum(balance_due) per invoice queue, sum(total) per estimate queue — and
-- PostgREST cannot express an aggregate. Eleven queues would otherwise be
-- eleven full reads of the very rows this pass exists to stop reading.
--
-- ============================== THE LIFECYCLES ARE NOT THE SAME ==============================
-- Reproduced from lib/database/queries/document-queue-filters.ts, which is in
-- turn the SQL form of the shipped predicates. The asymmetry is the whole point:
--
--   INVOICES  getInvoiceLifecycleState checks deleted, then VOIDED, then
--             archived. So "active" excludes void and cancelled, and the Past
--             queue is (not deleted AND status in (void, cancelled)) —
--             archived is deliberately NOT excluded there, because a voided and
--             archived invoice reads as voided.
--
--   ESTIMATES getEstimateLifecycleState has no voided state. "Active" is simply
--             not deleted and not archived, for EVERY queue including Past, and
--             Past selects status in (converted, cancelled) from inside it.
--
-- Writing one by copying the other empties a queue quietly.
-- scripts/verify-document-filters-live.mjs already asserts both directions
-- against the real predicates; this migration adds the sums to the same shape.
--
-- ============================== PAID IS COLLECTED, NOT INVOICED ==============================
-- The Paid pill does not sum invoice totals. It sums the payment LEDGER
-- (invoice_payments.amount) for payments belonging to invoices in the paid
-- queue — sumCollectedFromPayments in shared/lib/invoices/invoices-glance-stats.ts.
-- Those are different numbers whenever an invoice was overpaid, refunded, or
-- settled across several payments, and the ledger is the one that is true.
--
-- ============================== PRIVILEGES ==============================
-- Explicit revoke/grant, because PostgreSQL's default is PUBLIC EXECUTE and
-- migration 158 shipped a function that inherited it. scripts/verify-function-grants.mjs
-- fails the build if this is ever omitted again.

begin;

create or replace function public.get_company_document_queue_metrics(
  p_company_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_invoices jsonb := '{}'::jsonb;
  v_estimates jsonb := '{}'::jsonb;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  -- A null actor gets zeros rather than a bypass. This function only reads, and
  -- every application caller is a signed-in user rendering their own hub.
  if v_user_id is null then
    return jsonb_build_object('invoices', v_invoices, 'estimates', v_estimates);
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  -- Both strips sit behind canViewBilling on the page. That is checked by the
  -- caller; the membership check above is what stops this crossing tenants.
  if not public.can_manage_billing(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  -- ------------------------------------------------------------------
  -- Invoices: count + sum(balance_due) per queue, plus collected.
  -- ------------------------------------------------------------------
  with active as (
    select i.*
    from public.invoices i
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.archived_at is null
      and i.status not in (
        'void'::public.invoice_status,
        'cancelled'::public.invoice_status
      )
  ),
  paid_ids as (
    select a.id from active a where a.status = 'paid'::public.invoice_status
  ),
  collected as (
    select coalesce(round(sum(p.amount), 2), 0) as amount
    from public.invoice_payments p
    where p.company_id = p_company_id
      and p.invoice_id in (select id from paid_ids)
  ),
  past as (
    -- Not deleted AND voiding status. Archived is intentionally not excluded.
    select count(*) as count
    from public.invoices i
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.status in (
        'void'::public.invoice_status,
        'cancelled'::public.invoice_status
      )
  )
  select jsonb_build_object(
    'draft', jsonb_build_object(
      'count', count(*) filter (where a.status = 'draft'::public.invoice_status),
      'amount', coalesce(round(sum(a.balance_due) filter (
        where a.status = 'draft'::public.invoice_status), 2), 0)
    ),
    'sent', jsonb_build_object(
      'count', count(*) filter (where a.status = 'sent'::public.invoice_status),
      'amount', coalesce(round(sum(a.balance_due) filter (
        where a.status = 'sent'::public.invoice_status), 2), 0)
    ),
    'partially_paid', jsonb_build_object(
      'count', count(*) filter (
        where a.status = 'partially_paid'::public.invoice_status),
      'amount', coalesce(round(sum(a.balance_due) filter (
        where a.status = 'partially_paid'::public.invoice_status), 2), 0)
    ),
    'overdue', jsonb_build_object(
      'count', count(*) filter (where a.status = 'overdue'::public.invoice_status),
      'amount', coalesce(round(sum(a.balance_due) filter (
        where a.status = 'overdue'::public.invoice_status), 2), 0)
    ),
    'paid', jsonb_build_object(
      'count', count(*) filter (where a.status = 'paid'::public.invoice_status),
      'amount', (select amount from collected)
    ),
    'past', jsonb_build_object(
      'count', (select count from past),
      'amount', 0
    )
  )
  into v_invoices
  from active a;

  -- ------------------------------------------------------------------
  -- Estimates: count + sum(total) per queue. No voided lifecycle.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    'draft', jsonb_build_object(
      'count', count(*) filter (where e.status = 'draft'::public.estimate_status),
      'amount', coalesce(sum(e.total) filter (
        where e.status = 'draft'::public.estimate_status), 0)
    ),
    'sent', jsonb_build_object(
      'count', count(*) filter (where e.status = 'sent'::public.estimate_status),
      'amount', coalesce(sum(e.total) filter (
        where e.status = 'sent'::public.estimate_status), 0)
    ),
    'approved', jsonb_build_object(
      'count', count(*) filter (where e.status = 'approved'::public.estimate_status),
      'amount', coalesce(sum(e.total) filter (
        where e.status = 'approved'::public.estimate_status), 0)
    ),
    'declined', jsonb_build_object(
      'count', count(*) filter (where e.status = 'declined'::public.estimate_status),
      'amount', coalesce(sum(e.total) filter (
        where e.status = 'declined'::public.estimate_status), 0)
    ),
    'past', jsonb_build_object(
      'count', count(*) filter (where e.status in (
        'converted'::public.estimate_status,
        'cancelled'::public.estimate_status)),
      'amount', coalesce(sum(e.total) filter (where e.status in (
        'converted'::public.estimate_status,
        'cancelled'::public.estimate_status)), 0)
    )
  )
  into v_estimates
  from public.estimates e
  where e.company_id = p_company_id
    and e.deleted_at is null
    and e.archived_at is null;

  return jsonb_build_object('invoices', v_invoices, 'estimates', v_estimates);
end;
$function$;

revoke all on function public.get_company_document_queue_metrics(uuid)
  from public;
revoke all on function public.get_company_document_queue_metrics(uuid)
  from anon;
grant execute on function public.get_company_document_queue_metrics(uuid)
  to authenticated, service_role;

commit;
