-- Migration 219: how a price book item's price was worked out.
--
-- ============================ WHAT THIS IS ============================
-- A price book item has always been a name, a price and a cost. That is
-- enough to put it on an estimate, and not enough to keep it right: when a
-- company raises its labor rate, nothing knows which prices were built from
-- the old one, or how.
--
-- Four columns record that:
--
--   book_hours            the labor time the price allows for
--   parts_markup_percent  what was added on top of the part's cost
--                         (unit_cost already holds the part's cost)
--   price_source          'manual': the owner typed the price, leave it alone
--                         'rate':   price = book_hours x the company's labor
--                                   rate + unit_cost x (1 + markup)
--   setup_key             a stable name for an item the guided setup made
--                         ('service_call', 'hvac_capacitor', ...), so running
--                         the setup again updates that item and does not make
--                         a second one
--
-- The guided setup writes rate-priced items. When the labor rate changes in
-- Business numbers (migration 218), the product can list every 'rate' item
-- with its old and new price and let the owner apply them. Items the owner
-- priced by hand stay 'manual' and are never touched.
--
-- ============================ EXISTING ROWS ============================
-- Every existing item becomes price_source 'manual' with the other three
-- columns empty: exactly what it is today. No price changes. Reads, writes
-- and policies on service_items are unchanged; an insert that does not name
-- the new columns behaves as before.
--
-- Additive only, and it can be run twice.

alter table public.service_items
  add column if not exists book_hours numeric(6, 2),
  add column if not exists parts_markup_percent numeric(6, 2),
  add column if not exists price_source text not null default 'manual',
  add column if not exists setup_key text;

alter table public.service_items drop constraint if exists service_items_book_hours_range;
alter table public.service_items
  add constraint service_items_book_hours_range
  check (book_hours is null or book_hours between 0 and 1000);

alter table public.service_items drop constraint if exists service_items_parts_markup_range;
alter table public.service_items
  add constraint service_items_parts_markup_range
  check (parts_markup_percent is null or parts_markup_percent between 0 and 1000);

alter table public.service_items drop constraint if exists service_items_price_source_known;
alter table public.service_items
  add constraint service_items_price_source_known
  check (price_source in ('manual', 'rate'));

-- A price that claims to come from the rate has to say how many hours it is.
alter table public.service_items drop constraint if exists service_items_rate_price_has_hours;
alter table public.service_items
  add constraint service_items_rate_price_has_hours
  check (price_source <> 'rate' or book_hours is not null);

alter table public.service_items drop constraint if exists service_items_setup_key_shape;
alter table public.service_items
  add constraint service_items_setup_key_shape
  check (setup_key is null or setup_key ~ '^[a-z0-9_]{1,60}$');

comment on column public.service_items.book_hours is
  'Labor time this price allows for. Set on items priced from the company labor rate.';
comment on column public.service_items.parts_markup_percent is
  'Percent added on top of unit_cost when the price was worked out. 50 sells a $10 part for $15.';
comment on column public.service_items.price_source is
  'manual: the price was typed. rate: price = book_hours x labor rate + unit_cost x (1 + markup).';
comment on column public.service_items.setup_key is
  'Stable name for an item created by the guided setup, unique per company among items not in the trash.';

-- One live item per setup key per company. An item in the trash does not
-- block the setup from making that item again.
create unique index if not exists service_items_company_setup_key_idx
  on public.service_items (company_id, setup_key)
  where setup_key is not null and deleted_at is null;
