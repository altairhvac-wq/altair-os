# Altair Network — canonical models

The `/network` admin route (`app/(admin)/network/page.tsx`) renders **`NetworkReferralsPageView`** only. It is wired to Supabase for directory discovery, trusted partner links, invitations, and cross-company referrals.

## Canonical models

### `network_profiles` — directory identity

| Field | Meaning |
|-------|---------|
| **Purpose** | Public discovery profile — how a company presents itself for directory search and referral targeting |
| **Owner** | The company (`company_id`, unique) |
| **Canonical ID** | Row `id`; business key `company_id` |
| **Lifecycle** | Created (often hidden); admins toggle `is_visible`; referenced by referrals for audit |
| **Mutations** | Admins insert/update own profile; no client delete (cascade on company delete) |
| **Delete model** | Hard delete via `companies` cascade only |

### `network_partners` — private partner CRM / My Network

| Field | Meaning |
|-------|---------|
| **Purpose** | Per-company partner list. Rows with `linked_company_id` = one-sided trusted Altair company link (My Network V1). Rows without = external/manual subs (future CRM). |
| **Owner** | `company_id` — only that company manages its row |
| **Canonical ID** | Row `id`; for My Network links: **`(company_id, linked_company_id)`** |
| **Lifecycle** | `pending` (default) → `active` (add, invite accept, manual re-add) → `removed` (user remove). Manual add via `upsert_linked_network_partner` reactivates `removed`. Invite repair creates missing rows but **never** reactivates `removed`. |
| **Mutations** | Owner/admin add via RPC `upsert_linked_network_partner`; remove via RPC `remove_linked_network_partner` (sets `removed`); invite accept/repair via internal RPCs |
| **Delete model** | Soft lifecycle via `relationship_status`; no hard delete for linked partners |

**`linked_company_id`** is the canonical public identity for My Network links — one row per direction, one-sided management.

### `network_invites` — growth invitations

| Field | Meaning |
|-------|---------|
| **Purpose** | Invite contractors to join Altair; accepted signup creates bidirectional `network_partners` rows |
| **Owner** | `source_company_id` (+ `source_user_id` on insert) |
| **Canonical ID** | Row `id`; token lookup via `invite_token_hash` |
| **Lifecycle** | `pending` → `accepted` / `expired` / `cancelled` |
| **Mutations** | Source admin insert (pending only); status changes via SECURITY DEFINER RPCs only |
| **Delete model** | Status-based; no row delete |

**Boundary:** Invites create/repair partner links only. They do not create referrals or leads.

### `network_referrals` — cross-company lead handoff

| Field | Meaning |
|-------|---------|
| **Purpose** | Source company sends a customer to a target company |
| **Owner** | Source creates; target manages status/outcome |
| **Canonical ID** | Row `id`; optional `target_lead_id` (unique when set) |
| **Lifecycle** | `sent` → `accepted`/`declined` → `converted`/`won`/`lost` (lead sync) or `cancelled` |
| **Mutations** | Source admin insert; target status via RPC; outcome sync via RPC from lead pipeline |
| **Delete model** | Status-based; no row delete |

**Boundary:** Referrals create leads at send time. Outcome sync only maps lead status → referral status. Referrals never mutate `network_partners`.

## Mental model

```
network_profiles   → "Who can I find in the directory?"
network_partners   → "My private trusted partners." (linked_company_id = My Network V1)
network_invites    → "Invite them to Altair + link partners on accept."
network_referrals  → "I'm sending this lead to that company."
```

## Connection architecture (My Network V1)

- **Add / reactivate:** `upsert_linked_network_partner` → `relationship_status = active`
- **Remove:** `remove_linked_network_partner` → `relationship_status = removed` (one-sided; reciprocal row unchanged)
- **Invite repair:** Creates missing rows for accepted invites; preserves `removed` on either side
- **Manual add vs invite link:** Same row shape; manual add can reactivate `removed`; invite repair cannot
- **List filter:** Only `active` rows with `linked_company_id IS NOT NULL`

## Permissions alignment

| Capability | UI flag | Server action | DB |
|------------|---------|---------------|-----|
| Directory / send referrals / visibility | `canSendReferral` (`manageCompany`) | `assertReferralSender` | RLS + `can_send_network_referrals` |
| My Network / invites | `canManageNetwork` (`manageCompany`) | `assertNetworkManager` | `has_company_role(owner, admin)` on partner RPCs |
| Received referrals | `canManageReceivedReferrals` (`manageCustomers`) | `assertReferralReceiver` | `can_manage_customers` on status RPC |

## Live components

- `NetworkReferralsPageView.tsx` — page shell (directory + my network + invitations + sent/received tabs)
- `NetworkInviteForm.tsx`, `NetworkInvitationCard.tsx`, `NetworkInvitedByBanner.tsx` — invitations
- `NetworkDirectoryCard.tsx`, `NetworkProfileDetailPanel.tsx`, `NetworkTrustedBadge.tsx` — directory + trusted badges
- `SendReferralForm.tsx`, `NetworkReferralCard.tsx`, `NetworkReferralStatusBadge.tsx` — referrals

Types: `shared/types/network-referral.ts`, `shared/types/network-partner.ts`, `shared/types/network-invite.ts`

Actions: `app/actions/network-referrals.ts`, `app/actions/network-partners.ts`, `app/actions/network-invites.ts`

Queries: `lib/database/queries/network-*.ts`

## Removed mock partner CRM (V0)

The following were deleted in a tech-debt pass — never imported by any route:

- `NetworkPageView.tsx`, `NetworkBetaPageView.tsx`
- `MyNetworkContent`, `Partner*`, `Subcontract*`, mock data/types

When building partner CRM UI, wire to **`network_partners`** (and future `subcontract_jobs`), not `network_profiles`.
