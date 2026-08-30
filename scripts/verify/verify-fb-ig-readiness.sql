-- Facebook / Instagram publish readiness — READ ONLY.
--
-- Paste into the Supabase SQL editor for project `altair-os`.
-- SELECTs only. Creates nothing, changes nothing, publishes nothing.
-- Does NOT touch migration 143.
--
-- Answers the two questions the repo cannot answer by itself:
--   (2) is the Page/Instagram relationship actually recorded?
--   (3) is the delivery-record path actually reachable?

-- =====================================================================
-- 1. THE CONNECTED PAGE
--
-- The publish action requires, in this order: provider = 'facebook',
-- status = 'connected', and a non-empty provider_resource_id (the Page id).
-- Any one of these missing is a hard stop before Meta is contacted.
-- =====================================================================
select
  a.id                       as connected_account_id,
  a.company_id,
  a.provider,
  a.status,
  a.provider_resource_name   as page_name,
  a.provider_resource_id is not null
    and length(trim(a.provider_resource_id)) > 0        as has_page_id,
  a.token_expires_at,
  a.token_expires_at is null
    or a.token_expires_at > now()                        as token_not_expired,
  a.scopes,
  case
    when a.status <> 'connected' then 'BLOCKED — reconnect Facebook'
    when coalesce(trim(a.provider_resource_id), '') = ''
      then 'BLOCKED — connection has no Page id; reconnect and choose a Page'
    when a.token_expires_at is not null and a.token_expires_at <= now()
      then 'BLOCKED — token expired; reconnect Facebook'
    else 'READY for Facebook text publish'
  end                                                    as facebook_verdict
from public.marketing_connected_accounts a
where a.provider = 'facebook'
order by a.created_at desc;

-- =====================================================================
-- 2. THE INSTAGRAM RELATIONSHIP
--
-- Instagram has no separate login here: it rides on the Facebook Page's
-- linked IG Business account, read out of the connected account's metadata.
-- `getFacebookPageInstagramBusinessAccountId` accepts EITHER shape below —
-- checking only one would produce a false negative.
-- =====================================================================
select
  a.id                                   as connected_account_id,
  a.provider_resource_name               as page_name,
  a.metadata ? 'instagramBusinessAccountId'          as has_flat_ig_key,
  a.metadata -> 'instagram_business_account' ? 'id'  as has_nested_ig_key,
  coalesce(
    nullif(a.metadata ->> 'instagramBusinessAccountId', ''),
    nullif(a.metadata -> 'instagram_business_account' ->> 'id', '')
  ) is not null                          as instagram_resolvable,
  case
    when coalesce(
           nullif(a.metadata ->> 'instagramBusinessAccountId', ''),
           nullif(a.metadata -> 'instagram_business_account' ->> 'id', '')
         ) is not null
      then 'READY — Instagram Business account is linked'
    else 'NOT READY — link an Instagram Business account to this Page in '
         || 'Meta Business Suite, then RECONNECT Facebook so metadata is refreshed'
  end                                    as instagram_verdict
from public.marketing_connected_accounts a
where a.provider = 'facebook';

-- =====================================================================
-- 3. THE DELIVERY-RECORD PATH
--
-- Migration 143 is applied. What matters now is that the publish path can
-- actually write a claim. Three things must hold.
-- =====================================================================

-- 3a. The enum accepts the two provider values the code passes as literals.
--     A mismatch here fails the INSERT at publish time, not at build time.
select
  bool_or(e.enumlabel = 'facebook')  as accepts_facebook,
  bool_or(e.enumlabel = 'instagram') as accepts_instagram,
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as all_provider_values
from pg_enum e
join pg_type t on t.oid = e.enumtypid
where t.typname = 'marketing_connected_provider';

-- 3b. service_role can write; anon cannot; authenticated can read only.
--     Read via has_table_privilege so inherited/PUBLIC grants are included.
select
  r.grantee,
  has_table_privilege(r.grantee, 'public.marketing_channel_deliveries', 'SELECT') as can_select,
  has_table_privilege(r.grantee, 'public.marketing_channel_deliveries', 'INSERT') as can_insert,
  has_table_privilege(r.grantee, 'public.marketing_channel_deliveries', 'UPDATE') as can_update,
  case
    when r.grantee = 'service_role' then
      case when has_table_privilege(r.grantee, 'public.marketing_channel_deliveries', 'INSERT')
        then 'OK — the publish path can claim' else 'BLOCKED — claims will fail' end
    when has_table_privilege(r.grantee, 'public.marketing_channel_deliveries', 'INSERT')
      then 'PROBLEM — this role must not write deliveries'
    else 'OK'
  end as verdict
from (values ('anon'), ('authenticated'), ('public'), ('service_role')) as r(grantee);

-- 3c. Nothing has been delivered yet. Expect zero rows before the test;
--     exactly one 'posted' row for the chosen post afterwards.
select delivery_state, provider, count(*)
from public.marketing_channel_deliveries
group by delivery_state, provider
order by provider, delivery_state;

-- =====================================================================
-- 4. CANDIDATE POSTS FOR THE CONTROLLED TEST
--
-- The publish action refuses anything that is not a founder draft
-- ('founder_milestone' or 'product_update') in a publishable status
-- (draft / ready / scheduled / failed) with non-empty body text.
--
-- A text-only candidate is preferred for the first test: it skips the
-- screenshot resolver entirely, so a failure can only come from the token,
-- the claim, or Meta itself.
-- =====================================================================
select
  p.id                        as marketing_post_id,
  p.status,
  p.source_type,
  p.channel,
  coalesce(p.founder_screenshot_reference, '') = '' as is_text_only,
  left(coalesce(p.body, p.title, ''), 60)           as preview,
  case
    when p.source_type not in ('founder_milestone', 'product_update')
      then 'NOT ELIGIBLE — not a founder draft'
    when p.status not in ('draft', 'ready', 'scheduled', 'failed')
      then 'NOT ELIGIBLE — status ' || p.status
    when coalesce(p.founder_screenshot_reference, '') = ''
      then 'PREFERRED — text-only founder draft'
    else 'ELIGIBLE — has a screenshot (image post path)'
  end                         as candidate_verdict
from public.marketing_posts p
order by
  (p.source_type in ('founder_milestone', 'product_update')) desc,
  p.created_at desc
limit 20;
