-- Migration 163: make "does this customer already exist?" a lookup.
--
-- ============================== THE DEFECT ==============================
-- findCustomerByContact answers the question that decides whether converting a
-- lead links to an existing customer or creates a new one, and whether a CSV
-- import updates a row or duplicates it. It answered it like this:
--
--     select * from customers where company_id = ? and deleted_at is null
--     -- ...then filter the whole array in JavaScript
--
-- PostgREST caps that at 1,000 rows. So on a tenant with more than a thousand
-- customers the function cannot see the older ones, reports "no match", and the
-- caller creates a SECOND customer record for a person who is already there.
-- The failure is silent, permanent, and lands on the oldest — which is to say
-- the longest-standing — customers first.
--
-- ============================== WHY A COLUMN AND NOT A FILTER ==============================
-- The matching rule is not string equality. From shared/lib/phone.ts:
--
--     phonesMatch(a, b) = digits(a) = digits(b)
--                         OR (both have >= 10 digits AND their last 10 match)
--
-- Phone numbers are stored as typed — "(555) 123-4567", "555.123.4567",
-- "+1 555 123 4567" — so no ilike, prefix or suffix filter reproduces that. A
-- candidate query plus an in-memory re-check would work, but it would be a
-- HEURISTIC guarding a correctness decision: the recall depends on where the
-- digits happen to fall relative to the separators, and a near-miss silently
-- duplicates a customer.
--
-- A generated column makes it exact instead. The expression below is the phone
-- rule, not an approximation of it:
--
--     >= 10 digits  ->  the last 10          (the "both long" branch)
--     <  10 digits  ->  all of them          (the equality branch)
--
-- Case by case, that is the same predicate:
--   both >= 10   keys are the last 10 of each, equal iff the rule says so
--   both <  10   keys are the full digit strings, equal iff the rule says so
--   mixed        the short one's key is shorter than 10 and the long one's is
--                exactly 10, so they cannot collide — and the rule is false
--                there too, because equality fails and "both long" fails
--
-- email_match_key is the same idea for the email side: lower(trim(...)), which
-- is what the JavaScript did before comparing.
--
-- ============================== GENERATED, NOT TRIGGERED ==============================
-- STORED GENERATED means the value cannot drift from the column it derives from,
-- there is no trigger to forget on a bulk insert, and no backfill to run: the
-- column is computed for every existing row when it is added. regexp_replace
-- with a constant pattern is IMMUTABLE, which is what makes that legal.
--
-- ============================== THE INDEXES ==============================
-- Partial on deleted_at is null, because that is the only scope this lookup
-- ever runs in.

begin;

alter table public.customers
  add column if not exists phone_match_key text
  generated always as (
    case
      when length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) >= 10
        then right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)
      else regexp_replace(coalesce(phone, ''), '\D', '', 'g')
    end
  ) stored;

alter table public.customers
  add column if not exists email_match_key text
  generated always as (lower(btrim(coalesce(email, '')))) stored;

create index if not exists customers_company_phone_match_key_idx
  on public.customers (company_id, phone_match_key)
  where deleted_at is null;

create index if not exists customers_company_email_match_key_idx
  on public.customers (company_id, email_match_key)
  where deleted_at is null;

commit;
