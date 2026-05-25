-- Add optional category to price book items.

alter table public.service_items
  add column if not exists category text;
