-- Store the raw network-invite token encrypted (AES-256-GCM, integrations key)
-- alongside the existing sha256 hash.
--
-- Why: only the hash was persisted, so the invite URL could never be re-shown.
-- Every "Copy invite link" after a page refresh had to rotate the token,
-- silently invalidating any link the sender had already texted or emailed.
-- With the encrypted copy, Copy always returns the SAME link; rotation becomes
-- an explicit "generate new link" action (which also refreshes this column).
--
-- The hash remains the only value used for lookup/acceptance — the encrypted
-- copy is decrypted app-side (lib/integrations/crypto.ts) purely to rebuild
-- the shareable URL for the source company's admins. Legacy rows stay null and
-- fall back to the old rotate-on-copy behavior.

alter table public.network_invites
  add column if not exists invite_token_encrypted text;

comment on column public.network_invites.invite_token_encrypted is
  'AES-256-GCM payload (v1:iv:ciphertext:tag, integrations encryption key) of the raw invite token. Lets source-company admins re-copy the same invite link. Null on rows created before this column existed.';
