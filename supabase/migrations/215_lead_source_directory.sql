-- Migration 215: a lead source for requests from the public directory.
--
-- A quote or sub-work request sent from a directory listing (migration 216)
-- becomes a lead in the listing's workspace when that workspace is an active
-- Altair member. This value lets the Leads screen say where it came from.
--
-- On its own because 'alter type ... add value' cannot share a transaction
-- with statements that use the new value.

alter type public.lead_source add value if not exists 'directory';
