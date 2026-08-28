-- Migration 171: the payment ledger's count and sum, without reading it.
--
-- ============================== WHY ==============================
-- The Sales hub's "Total collected" glance stat is an all-time figure. It was
-- computed in the browser from the array the page had been handed --
-- listInvoicePayments, which PostgREST caps at 1,000 rows -- so on a tenant
-- with 7,857 payments it read $2,310,475 of a true $17,946,072 and a count of
-- 1,000, under a label saying "All-time collected from the payment ledger".
--
-- The first fix walked the ledger a page at a time reading one column. That is
-- correct and it is what the week and month summaries beside it already do, but
-- all-time is a different size of problem: eight sequential round trips, each
-- evaluating the RLS policy over every row it returns. Measured on the
-- scale-seeded tenant, the Payments tab went to 16.4 s.
--
-- A sum is not a read. PostgREST cannot express one without a function, so this
-- is the function.
--
-- ============================== BOUNDS ARE OPTIONAL ==============================
-- Null bounds mean all time, which is what the glance stat wants. The
-- parameters exist so the week and month summaries can move here later without
-- a second function; they still walk today, over windows small enough that it
-- does not matter.
--
-- Date bounds are compared against payment_date, which is a DATE column -- no
-- time-zone conversion happens here, and the caller resolves the window in the
-- company's zone exactly as it does now.
--
-- ============================== PRIVILEGES ==============================
-- The payment ledger is billing data, so the gate is can_manage_billing rather
-- than the broader reports predicate used by 169 and 170. A member without
-- billing access gets zeros rather than an error, matching what the page shows
-- them today.
--
-- Explicit revoke before the grants; scripts/verify-function-grants.mjs fails
-- any migration that relies on PostgreSQL's PUBLIC EXECUTE default.

begin;

create or replace function public.get_company_payment_ledger_totals(
  p_company_id uuid,
  p_start_date date default null,
  p_end_date date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_empty jsonb := jsonb_build_object('authorized', false, 'count', 0, 'total', 0);
  v_result jsonb;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  if v_user_id is null then
    return v_empty;
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  if not public.can_manage_billing(p_company_id) then
    return v_empty;
  end if;

  select jsonb_build_object(
    'authorized', true,
    'count', count(*),
    'total', coalesce(sum(p.amount), 0)
  )
  into v_result
  from public.invoice_payments p
  where p.company_id = p_company_id
    and (p_start_date is null or p.payment_date >= p_start_date)
    and (p_end_date is null or p.payment_date <= p_end_date);

  return v_result;
end;
$function$;

revoke all on function public.get_company_payment_ledger_totals(uuid, date, date)
  from public;
revoke all on function public.get_company_payment_ledger_totals(uuid, date, date)
  from anon;
grant execute on function public.get_company_payment_ledger_totals(uuid, date, date)
  to authenticated, service_role;

commit;
