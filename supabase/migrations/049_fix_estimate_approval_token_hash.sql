-- Fix public estimate approval RPCs: pgcrypto lives in the extensions schema on Supabase.
-- Without qualification, hash_estimate_approval_token fails with:
--   function digest(text, unknown) does not exist

create or replace function public.hash_estimate_approval_token(p_raw_token text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(trim(p_raw_token), 'sha256'), 'hex');
$$;

revoke all on function public.hash_estimate_approval_token(text) from public;
