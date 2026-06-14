-- Network Connections V1
--
-- Wires "My Network" / trusted partners to the existing network_partners table.
-- Rows with linked_company_id are the private one-sided trusted-partner list for
-- Altair directory companies (distinct from network_profiles discovery and
-- network_referrals lead handoff). Only the source company manages its list;
-- target approval is not required in V1.

-- Prevent duplicate links to the same Altair company per source company.
create unique index if not exists network_partners_company_linked_company_uidx
  on public.network_partners (company_id, linked_company_id)
  where linked_company_id is not null;

-- Prevent a company from adding itself to its own network.
alter table public.network_partners
  drop constraint if exists network_partners_no_self_link;

alter table public.network_partners
  add constraint network_partners_no_self_link
  check (linked_company_id is null or linked_company_id <> company_id);

create index if not exists network_partners_linked_company_id_idx
  on public.network_partners (linked_company_id)
  where linked_company_id is not null;
