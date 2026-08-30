-- Controlled Facebook publish test — verification for post
--   613e237c-1d60-4d22-a9c8-26fa5f7fcc87
--
-- READ ONLY. SELECTs only. Run section A BEFORE the click, section B AFTER.
-- Nothing here publishes, retries, or modifies anything.

-- =====================================================================
-- A. BEFORE THE CLICK — confirm the starting line
--
-- Expect: eligible status, founder source type, and NO delivery row yet.
-- If a delivery row already exists, STOP and send it to me before clicking.
-- =====================================================================
select
  p.id,
  p.status,
  p.source_type,
  coalesce(p.founder_screenshot_reference, '') = '' as is_text_only,
  case
    when p.status = 'posted' then 'STOP — already marked posted'
    when p.status not in ('draft','ready','scheduled','failed')
      then 'STOP — status ' || p.status || ' is not publishable'
    when p.source_type not in ('founder_milestone','product_update')
      then 'STOP — not a founder draft; the action will refuse it'
    else 'READY to publish'
  end as precheck
from public.marketing_posts p
where p.id = '613e237c-1d60-4d22-a9c8-26fa5f7fcc87';

select
  count(*) as existing_delivery_rows,
  case when count(*) = 0
    then 'READY — no prior attempt'
    else 'STOP — a delivery row already exists; send it to me first' end as precheck
from public.marketing_channel_deliveries
where marketing_post_id = '613e237c-1d60-4d22-a9c8-26fa5f7fcc87';


-- =====================================================================
-- B. AFTER THE CLICK — the authoritative record
--
-- THIS QUERY IS THE ANSWER, not the UI message. The delivery row is
-- settled BEFORE the post status is updated, so if the two ever disagree,
-- this row is the one that reflects what Meta actually did.
-- =====================================================================
select
  d.provider,
  d.delivery_state,
  d.provider_post_id,
  d.provider_permalink,
  d.failure_detail,
  d.created_at   as claimed_at,
  d.settled_at,
  case
    when d.delivery_state = 'posted' and d.provider_post_id is not null
      then 'SUCCESS — Meta accepted; provider id persisted'
    when d.delivery_state = 'posted'
      then 'ODD — posted but no provider id; send me this row'
    when d.delivery_state = 'failed'
      then 'FAILED CLEANLY — nothing was created at Meta; safe to retry later'
    when d.delivery_state = 'in_flight'
      then 'AMBIGUOUS — DO NOT CLICK PUBLISH AGAIN. The call may have '
           || 'reached Meta. Check the Page manually, then send me this row.'
    else 'UNEXPECTED — send me this row'
  end as verdict
from public.marketing_channel_deliveries d
where d.marketing_post_id = '613e237c-1d60-4d22-a9c8-26fa5f7fcc87';

-- Did the post status change? Expect 'posted' on success.
--
-- A MISMATCH IS INFORMATIVE, NOT A CONTRADICTION: the delivery row is
-- settled first, so `delivery_state = 'posted'` with `status <> 'posted'`
-- means Meta accepted the post and only the local status write failed.
-- The post IS live. Do not republish.
select
  p.id,
  p.status,
  p.updated_at,
  case
    when p.status = 'posted' then 'Marked posted'
    else 'NOT marked posted — compare with the delivery row above'
  end as note
from public.marketing_posts p
where p.id = '613e237c-1d60-4d22-a9c8-26fa5f7fcc87';

-- Confirm blast radius: exactly ONE delivery row, Facebook only, nothing else.
select provider, delivery_state, count(*)
from public.marketing_channel_deliveries
group by provider, delivery_state
order by provider;
