-- Internal unit cost on price book items for job material cost snapshots.

alter table public.service_items
  add column if not exists unit_cost numeric(12, 2)
  check (unit_cost is null or unit_cost >= 0);
