# Altair OS — Supabase Data Model (Phase 1)

This document plans the core multi-tenant auth foundation. Frontend modules still use mock data; these tables are the first backend slice to wire up page by page.

## Design goals

- One Supabase Auth user maps to one `profiles` row.
- A user can belong to multiple companies through `company_memberships`.
- Every operational record (customers, jobs, invoices, etc.) will scope to `company_id`.
- Row Level Security (RLS) will enforce tenant isolation in Phase 2.

## Entity overview

```text
auth.users
    │
    └── profiles (1:1)
            │
            └── company_memberships (1:N)
                    │
                    └── companies (N:1)
```

## Tables

### `profiles`

Extends `auth.users` with app-specific identity fields.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Same as `auth.users.id` |
| `email` | text | Denormalized from auth for query convenience |
| `full_name` | text | Nullable display name |
| `phone` | text | Nullable |
| `avatar_url` | text | Nullable |
| `default_company_id` | uuid FK | Active company switcher default |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `companies`

Tenant root for all Altair OS business data.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text | Display name |
| `slug` | text unique | URL-safe identifier |
| `status` | enum | `active`, `trial`, `suspended` |
| `timezone` | text | Default `America/New_York` (legacy); app resolves unset to browser or `America/Denver` |
| `phone`, `email` | text | Nullable contact info |
| address fields | text | Nullable service business address |
| `country` | text | Default `US` |
| `settings` | jsonb | Feature flags and preferences |
| `created_at`, `updated_at` | timestamptz | |

### `company_memberships`

Join table for user ↔ company access with role.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `company_id` | uuid FK | References `companies.id` |
| `user_id` | uuid FK | References `profiles.id` |
| `role` | enum | See roles below |
| `status` | enum | `active`, `invited`, `suspended` |
| `invited_by` | uuid FK | Nullable, references `profiles.id` |
| `invited_at`, `joined_at` | timestamptz | Invitation lifecycle |
| `created_at`, `updated_at` | timestamptz | |

Unique constraint: `(company_id, user_id)`.

## Roles

Mapped to product areas in `ARCHITECTURE.md`:

| Role | Primary surfaces |
| --- | --- |
| `owner` | Full admin + billing + settings |
| `admin` | Admin command center |
| `dispatcher` | Dispatch board, job assignment |
| `technician` | `/tech` mobile dashboard |
| `office_staff` | Customers, estimates, invoices |
| `subcontractor` | Network module |
| `customer` | Future customer portal |

Permission helpers live in `lib/database/types/roles.ts`.

## Future module tables (not in Phase 1 migration)

Each module will add `company_id` and RLS policies:

- `customers`
- `jobs`
- `estimates`
- `invoices`
- `expenses`
- `time_entries`
- `network_partners` — private per-company partner CRM; **My Network V1** uses `linked_company_id` rows (migration `075`)
- `network_profiles` — public/internal directory profile for cross-company discovery (live; migration `073`)
- `network_referrals` — cross-company lead handoff between companies (live; migration `073`)
- `subcontract_jobs` — planned; not migrated

See `shared/components/network/README.md` for how these differ. Do not use `network_profiles` for private partner CRM.

## Connection order (recommended)

1. Auth + company bootstrap (signup creates company + owner membership)
2. Customers
3. Jobs + dispatch
4. Technician dashboard
5. Estimates, invoices, time, expenses
6. Network + reports

## Type generation

After applying migrations in Supabase:

```bash
npx supabase gen types typescript --project-id <project-id> > lib/database/types/database.generated.ts
```

Then merge or replace the placeholder in `lib/database/types/database.ts`.
