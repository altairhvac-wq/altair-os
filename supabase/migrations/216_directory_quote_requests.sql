-- Migration 216: quote requests from the public directory.
--
-- Needs 215 (the 'directory' lead source) first.
--
-- Builds on 210 (the public directory), 211 (claim your listing) and 214.
--
-- A visitor on a published listing can send that business a request: a
-- homeowner asking for a quote ("customer"), or a contractor offering sub
-- work ("sub"). The request is emailed to the listing's private contact
-- address, and when the listing is linked to an active Altair workspace it
-- also becomes a lead in that workspace (source 'directory', added in 215).
--
-- Each request is kept here so the owner can see abuse, a business's monthly
-- numbers can count requests, and a lead can point back to where it came
-- from. The visitor's details are personal data: the table is service-role
-- only (no anon, no authenticated access), and nothing here is ever shown on
-- a public page. A rate-limit subject is a hash, never an address.

create table if not exists public.directory_quote_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.directory_listings (id) on delete cascade,
  kind text not null,
  sender_name text not null,
  sender_phone text not null,
  sender_email text,
  sender_company text,
  place text not null default '',
  timing text not null default '',
  details text not null,
  -- 'sent': the business was emailed. 'not_sent': the email failed; the
  -- request is kept so the owner can see it and pass it on by hand.
  status text not null default 'sent',
  lead_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint directory_quote_requests_kind_check check (kind in ('customer', 'sub')),
  constraint directory_quote_requests_status_check check (status in ('sent', 'not_sent')),
  constraint directory_quote_requests_name_len check (char_length(sender_name) between 2 and 80),
  constraint directory_quote_requests_phone_len check (sender_phone ~ '^[0-9]{10}$'),
  constraint directory_quote_requests_email_len check (sender_email is null or char_length(sender_email) <= 254),
  constraint directory_quote_requests_company_len check (sender_company is null or char_length(sender_company) <= 80),
  constraint directory_quote_requests_place_len check (char_length(place) <= 60),
  constraint directory_quote_requests_timing_len check (char_length(timing) <= 40),
  constraint directory_quote_requests_details_len check (char_length(details) between 10 and 1000)
);

comment on table public.directory_quote_requests is
  'Quote and sub-work requests sent to directory listings (migration 215). Visitor contact details: service role only, never public.';

create index if not exists directory_quote_requests_listing_idx
  on public.directory_quote_requests (listing_id, created_at desc);

alter table public.directory_quote_requests enable row level security;

revoke all on table public.directory_quote_requests from public;
revoke all on table public.directory_quote_requests from anon;
revoke all on table public.directory_quote_requests from authenticated;
grant all on table public.directory_quote_requests to service_role;

