# Altair Network — three models, one route

The `/network` admin route (`app/(admin)/network/page.tsx`) renders **`NetworkReferralsPageView`** only. It is wired to Supabase for directory discovery and cross-company referrals.

## Do not confuse these tables

| Table | Purpose | Scope | Live code |
|-------|---------|-------|-----------|
| **`network_profiles`** | Public/internal **directory profile** — how a company presents itself for discovery and referral targeting | One row per company; `is_visible` controls directory listing | `lib/database/queries/network-profiles.ts`, directory cards/panels |
| **`network_partners`** | Private **company partner CRM** — subcontractor relationships, contact details, relationship status. **Network Connections V1** uses rows with `linked_company_id` as the source company's one-sided "My Network" / trusted partners list. | Per-company partner list; not shared across tenants | `lib/database/queries/network-partners.ts`, My Network tab + directory badges |
| **`network_referrals`** | Cross-company **lead handoff** — source company sends a customer to a target company | Tracks customer payload, status lifecycle, optional `target_lead_id` | `lib/database/queries/network-referrals.ts`, `app/actions/network-referrals.ts`, referral cards/forms |

### Mental model

```
network_profiles   → "Who can I find in the directory?"
network_referrals  → "I'm sending this lead to that company."
network_partners   → "My private trusted partners / subs." (linked_company_id = My Network V1)
```

**`network_partners` with `linked_company_id`** is the private "My Network" layer: one-sided, no target approval in V1, managed only by the source company (owner/admin). External subs without an Altair account can still use `network_partners` rows without `linked_company_id` (future CRM UI).

Referrals may reference `source_network_profile_id` / `target_network_profile_id` for audit context, but the referral row is the handoff record. Accepted referrals create leads via `lib/database/services/network-referral-lead.ts` — that pipeline is separate from partner CRM.

## Live components (V1 referrals + connections)

- `NetworkReferralsPageView.tsx` — page shell (directory + my network + sent/received tabs)
- `NetworkDirectoryCard.tsx`, `NetworkProfileDetailPanel.tsx`, `NetworkTrustedBadge.tsx` — directory (`network_profiles`) + trusted badges (`network_partners`)
- `SendReferralForm.tsx`, `NetworkReferralCard.tsx`, `NetworkReferralStatusBadge.tsx` — referrals (`network_referrals`)

Types: `shared/types/network-referral.ts` (profiles + referrals), `shared/types/network-partner.ts` (My Network / `network_partners`), `shared/types/network.ts` (trade types + initials helper only).

Actions: `app/actions/network-referrals.ts`, `app/actions/network-partners.ts`

## Removed mock partner CRM (V0)

The following were **deleted** in a tech-debt pass — they were never imported by any route:

- `NetworkPageView.tsx`, `NetworkBetaPageView.tsx` — mock partner/subcontract UI
- `MyNetworkContent`, `Partner*`, `Subcontract*`, `NetworkPageHeader`, `NetworkSearchFilterBar`, `NetworkEmptyState`, `NetworkLoadingState`
- `shared/data/mock-network-partners.ts`, `mock-subcontract-jobs.ts`
- `shared/types/network-utils.ts` (filters/forms for mock UI only)

When building partner CRM UI, wire to **`network_partners`** (and future `subcontract_jobs`), not `network_profiles`.
