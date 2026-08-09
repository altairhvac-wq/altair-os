-- Community: "companies near me" radius search over `network_profiles`.
-- Distance uses the existing latitude/longitude columns (migration 085),
-- which were previously write-only with no consumer ("dead columns" per the
-- Community audit). The write path is added in application code
-- (updateCompanyNetworkProfile geocodes city/state/postal_code via Mapbox
-- and fills these in on every profile save) — this migration only adds the
-- read-side radius search RPC.
--
-- Only companies that have explicitly opted in via show_on_map are
-- returned — this is consistent with the existing map-preview opt-in
-- (see NetworkMapPreviewPanel / canEnableNetworkMapVisibility).

create or replace function public.get_nearby_network_profiles(
  p_lat double precision,
  p_lng double precision,
  p_radius_miles double precision,
  p_exclude_company_id uuid default null
)
returns table (
  id uuid,
  company_id uuid,
  distance_miles double precision
)
language sql
stable
security definer
set search_path = public
as $$
  -- Haversine distance in miles (earth radius ~3958.8 mi). Fine-grained
  -- enough for city/ZIP-precision pins; no PostGIS dependency needed.
  -- Distance computed in a CTE first since a WHERE clause can't reference
  -- a sibling SELECT alias directly in Postgres.
  with candidates as (
    select
      np.id,
      np.company_id,
      (
        3958.8 * acos(
          least(1.0, greatest(-1.0,
            cos(radians(p_lat)) * cos(radians(np.latitude))
              * cos(radians(np.longitude) - radians(p_lng))
              + sin(radians(p_lat)) * sin(radians(np.latitude))
          ))
        )
      ) as distance_miles
    from public.network_profiles np
    where np.is_visible = true
      and np.show_on_map = true
      and np.latitude is not null
      and np.longitude is not null
      and (p_exclude_company_id is null or np.company_id <> p_exclude_company_id)
  )
  select id, company_id, distance_miles
  from candidates
  where distance_miles <= p_radius_miles
  order by distance_miles asc
  limit 50;
$$;

revoke all on function public.get_nearby_network_profiles(double precision, double precision, double precision, uuid) from public;
grant execute on function public.get_nearby_network_profiles(double precision, double precision, double precision, uuid) to authenticated;
