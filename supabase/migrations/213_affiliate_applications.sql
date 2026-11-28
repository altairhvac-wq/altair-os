-- Migration 213: applications to the affiliate program.
--
-- altair-op.com/affiliates has one form. Someone who wants to recommend
-- Altair Operating System and earn a commission fills it in; the owner reads
-- each application and approves or declines it at /platform/affiliates.
--
-- ============================ WHAT THIS IS NOT ============================
-- It is not referral tracking and it is not payouts. For the first partners
-- the owner makes each partner's code in Stripe, reads what each coded
-- customer paid from Stripe once a month, and pays by hand. This table holds
-- an application and the decision on it, and nothing about money.
--
-- ============================ WHO MAY DO WHAT ============================
-- Nobody but the service role touches this table. An applicant has no
-- account, so there is no session for RLS to check, and every column is
-- private (a name, an email address, what they told us about their business).
-- The application therefore:
--   * WRITES through the service role, in server code, after it has checked
--     the form and the rate limit (app/actions/affiliates.ts);
--   * READS and DECIDES through the service role, after it has authorised a
--     platform admin (app/actions/platform-affiliates.ts).
-- There is no public read of any kind.
--
-- Additive only. Applying this migration changes no existing row, and it can
-- be run twice.

create table if not exists public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),

  full_name text not null,
  email text not null,
  business_name text not null,
  partner_type text not null,
  -- Where their audience is. https only.
  audience_url text not null,
  linkedin_url text,
  audience_size text not null,
  audience_description text not null,
  promotion_plan text not null,
  -- Software companies they already work with or are sponsored by.
  existing_partnerships text not null default '',
  state text not null,
  -- The sentence beside the box they ticked, as it was shown.
  rules_text text not null,

  status text not null default 'new',
  -- The code the owner gave an approved partner. The owner creates the
  -- matching promotion code in Stripe by hand; nothing here does.
  partner_code text,
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint affiliate_applications_name_len
    check (char_length(full_name) between 2 and 80),
  constraint affiliate_applications_email_shape
    check (
      email = lower(email)
      and char_length(email) between 6 and 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  constraint affiliate_applications_business_len
    check (char_length(business_name) between 2 and 100),
  constraint affiliate_applications_type_check
    check (
      partner_type in (
        'coach', 'bookkeeper', 'media', 'educator', 'agency', 'supplier', 'contractor', 'other'
      )
    ),
  -- https only: no javascript: or data: URL can satisfy these.
  constraint affiliate_applications_audience_url_shape
    check (
      audience_url ~ '^https://[a-z0-9.-]+\.[a-z]{2,}(/[^[:space:]]*)?(\?[^[:space:]]*)?$'
      and char_length(audience_url) <= 200
    ),
  constraint affiliate_applications_linkedin_url_shape
    check (
      linkedin_url is null
      or (
        linkedin_url ~ '^https://([a-z0-9-]+\.)?linkedin\.com(/[^[:space:]]*)?(\?[^[:space:]]*)?$'
        and char_length(linkedin_url) <= 200
      )
    ),
  constraint affiliate_applications_audience_size_check
    check (audience_size in ('under_500', '500_2k', '2k_10k', '10k_50k', 'over_50k', 'clients')),
  constraint affiliate_applications_audience_description_len
    check (char_length(audience_description) between 20 and 400),
  constraint affiliate_applications_promotion_plan_len
    check (char_length(promotion_plan) between 20 and 400),
  constraint affiliate_applications_partnerships_len
    check (char_length(existing_partnerships) <= 300),
  constraint affiliate_applications_state_shape
    check (state ~ '^[A-Z]{2}$'),
  constraint affiliate_applications_rules_len
    check (char_length(rules_text) between 10 and 400),
  constraint affiliate_applications_status_check
    check (status in ('new', 'approved', 'declined')),
  constraint affiliate_applications_code_shape
    check (partner_code is null or partner_code ~ '^[A-Z0-9]{3,20}$'),
  constraint affiliate_applications_review_note_len
    check (review_note is null or char_length(review_note) <= 500),
  -- A decision records when it was made; a code belongs to an approved partner.
  constraint affiliate_applications_decision_is_complete
    check (status = 'new' or reviewed_at is not null),
  constraint affiliate_applications_code_needs_approval
    check (partner_code is null or status = 'approved')
);

comment on table public.affiliate_applications is
  'Applications to the affiliate program from altair-op.com/affiliates, and the owner''s decision on each. Every column is private. No tracking or payout data. Service role only.';

-- One open application per inbox: a second submission from the same address
-- while the first is still waiting replaces its answers instead of adding a
-- second row to the owner's queue.
create unique index if not exists affiliate_applications_one_open_per_inbox_idx
  on public.affiliate_applications (email)
  where status = 'new';

-- Two partners cannot be given the same code.
create unique index if not exists affiliate_applications_partner_code_idx
  on public.affiliate_applications (partner_code)
  where partner_code is not null;

create index if not exists affiliate_applications_review_idx
  on public.affiliate_applications (status, created_at desc);

drop trigger if exists affiliate_applications_set_updated_at on public.affiliate_applications;
create trigger affiliate_applications_set_updated_at
  before update on public.affiliate_applications
  for each row execute function public.set_updated_at();

alter table public.affiliate_applications enable row level security;

-- No policies on purpose: with RLS on and no policy, anon and authenticated
-- can read and write nothing even if a grant were added by mistake.
revoke all on table public.affiliate_applications from public;
revoke all on table public.affiliate_applications from anon;
revoke all on table public.affiliate_applications from authenticated;
grant all on table public.affiliate_applications to service_role;
