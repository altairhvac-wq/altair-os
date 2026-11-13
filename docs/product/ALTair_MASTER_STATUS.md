# ALTAIR MASTER STATUS

Last Updated: 2026-07-05

> **Source of truth for current product state.** For production module inventory see `ALTair_BRAIN.md`. For active sprint scope see `ALTair_CURRENT_SPRINT.md`. For future experience sequencing see `ALTair_V2_ROADMAP.md`.

---

## Documentation Hierarchy

Company foundation (mission, standard, personality, principles, Canon) lives under `docs/foundation/`. See `docs/README.md`.

| Document | Responsibility |
|----------|----------------|
| `ALTair_MASTER_STATUS.md` | Current product state only |
| `ALTair_CURRENT_SPRINT.md` | Active sprint only |
| `ALTair_BRAIN.md` | Architecture and confirmed production inventory |
| `ALTair_V2_ROADMAP.md` | Future experience-layer sequencing |
| `docs/design/ALTAIR_ART_DIRECTION.md` | Product visual philosophy |
| `docs/design/ALTAIR_EXPERIENCE_MAP.md` | Experience architecture (Command Center, Workspace, Operations, Intelligence) |
| `docs/design/ALTAIR_COMPONENT_SYSTEM.md` | Reusable V2 component definitions |
| `docs/design/ALTAIR_DESIGN_FOUNDATION.md` | Product UI design constitution |
| `FOUNDER_MODE.md` | Pointer → `docs/foundation/The_Altair_Principles.md` |
| `docs/development/CHAT_START_PROMPT.md` / `SESSION_CLOSE_PROMPT.md` | Session workflow checklists |
| `docs/development/ALTAIR_SESSION_LOG.md` | Historical session record |
| `docs/reference/internal-alpha-smoke-test.md` | Deploy verification checklist |
| `docs/archive/architecture/backend-data-map.md` | **Outdated planning doc** — do not treat as production truth |

---

## Current Stage

**Status: Beta-ready — Sprint 2E dry run passed (no code P0 blockers); Founder Brain foundation on `/platform`; North Star experience layer shipped behind flag; Stripe payments, workflow reminders, and trade-aware onboarding live; authenticated production smoke + migrations `108`/`109` on Supabase required before first external company**

Altair OS is a production-grade multi-tenant field service operating system on Vercel + Supabase, preparing for small-company beta testing.

**North Star flag:** `NEXT_PUBLIC_NORTH_STAR_SHELL=true` enables Mission Control Original Refined across admin surfaces. Legacy UI remains when the flag is off. See `lib/beta/north-star-shell.ts`.

**Beta status:** Beta-ready. Run authenticated production/user-data smoke (`docs/reference/internal-alpha-smoke-test.md`) before first external company onboarding.

---

## What Shipped Since Last Doc Sync (2026-06-17 → 2026-07-03)

~187 commits. Confirmed in code:

### North Star Production Migration (Phase 9 — behind flag)

| Phase | Focus | Status |
|-------|-------|--------|
| **M1** | Grouped desktop left sidebar shell | **Complete** |
| **M2** | Dashboard pilot — Mission Control hero, Action/Work/Money operating board | **Complete** |
| **M3** | Customers list + Customer 360 detail pilot | **Complete** |
| **M4** | Jobs list + job detail pilot | **Complete** |
| **M5** | Estimates + invoices list/detail/document pilots | **Complete** |
| **M6** | Expenses list + detail pilot | **Complete** |
| **M7** | Price book / service items catalog pilot | **Complete** |
| **M8** | Reports + tax summary pilot | **Complete** |
| **M9** | Admin time / labor review pilot | **Complete** |
| **M10** | Settings configuration workspace pilot | **Complete** |
| **M11** | Network referral workspace pilot | **Complete** |
| **Community Phase 1** | Community orientation shell on `/network` | **Complete** |
| **M12** | Team member profile pilot | **Complete** |
| **M13** | Platform admin pilot | **Complete** |
| **M14** | Leads work queue pilot | **Complete** |
| **Dispatch** | North Star command shell + mobile polish | **Complete** |

Code lives in `shared/components/*/north-star-m*` folders. Primary reference remains `/altair-shell-color-lab-v1` (palette `mission-control-refined`).

### Payments (Stripe Connect)

- Company payment accounts foundation
- Stripe Connect Express onboarding from Settings
- Public invoice Pay Now (`/invoice-payment/[token]`) with gated checkout sessions
- Stripe webhook verification and atomic checkout payment recording
- Manual payment recording via atomic RPC
- Payment link email sending
- Technician-facing payment link generation
- Twilio SMS payment links (when configured)

### Workflow Reminder Engine

- Durable `workflow_reminders` table with snooze/dismiss/complete
- Evaluator service for unpaid invoices (7d), stale estimates (7d), lead follow-ups, ready-to-invoice jobs
- Daily production cron at 12:00 UTC (`/api/cron/workflow-reminders`), compatible with the current Vercel Hobby plan
- Dashboard surfacing via `WorkflowRemindersSection`

### Trade-Aware Onboarding

- Company `trade` column on bootstrap (`supabase/migrations/107_company_trade.sql`)
- Trade selection on signup and `/setup`
- Invited users defer company bootstrap until invite acceptance

### Design Lab

- Founder design lab at `/platform/design-lab` — click-to-edit color targets, presets, contrast guardrails, theme export, dashboard replica canvas, company-scoped saved themes (`design_lab_themes`) with explicit promote-to-live / revert (live CSS var injection on `.admin-north-star-shell` for the active company)

### Dashboard Brain (Operational Prioritization)

- Dashboard action queue prioritization and secondary band collapse
- Lead actions, accepted estimates, and unpaid invoice follow-ups surfaced on dashboard
- Scoped dashboard surface editing (design lab integration)

### Founder Brain Foundation (Platform Admin)

- `/platform` Mission Hero — one clear "do this first" founder action from ranked signals
- Platform priority engine — blocking/high bugs, stuck onboarding, inactive companies, diagnostics, **reliability signals**
- Needs Attention panel — ranked cross-tenant signals with deep links
- Cross-tenant activation funnel — customer → job → estimate → invoice → payment → fully activated
- **Reliability Pulse** — cron health, payment webhooks, Stripe Connect risks, platform env checks
- **Customer Health Pulse** — per-company activation stage, healthy/watch/needs-help counts, top outreach targets (Sprint 2C)
- **Founder Action Loop** — mark contacted, snooze, resolve, notes on derived founder signals; fingerprint-based re-surfacing (Sprint 2D)
- `platform_founder_signal_actions` table — durable founder outreach state on signal keys (migration `109`)
- `platform_automation_runs` table — durable workflow reminder cron run tracking (migration `108`)
- Reuses `payment_provider_events` and `company_payment_accounts` for payment/Stripe health (read-only)

### Production Hardening

- Operational RLS tightening (`103_tighten_operational_rls.sql`)
- Public token RPC hardening (`104_harden_public_token_rpcs.sql`)
- Signup email verification callback fix
- Smoke workflow hardening (draft estimates, billing view refresh after payment)
- North Star contrast polish across major admin surfaces

### Other Confirmed Additions

- Marketing (`/marketing`) — simplified 2026-10-25 to three tabs: **Today** (one approval queue for agent videos, website articles, Facebook text posts and Marketing HQ social ideas, above the Chief of Staff, attention items and activity), **Library** (every post with Drafts / Approved / Published / Archived filters, live website pages, a small editor for wording) and **Settings** (automation status, every connected account, brand & goals). All direct publish buttons, the Performance and History tabs, the manual post editor/templates/recurring/mark-posted tools and the founder screenshot controls were removed; Approve → scheduled `marketing-publish` run is the only publish path. `/marketing/hq` redirects to `/marketing`.
- YouTube publishing (private-only) — YouTube Connect (`/settings/integrations`, offline consent, per-channel rows, encrypted refresh tokens); founder Today control uploads a `channel_target='youtube'` draft as a PRIVATE video through `dispatchPublish` (kill switch + recorded approval + channel-identity readback; visibility is not a parameter anywhere); durable token lifecycle with a daily credential-maintenance pass in the `marketing-insights` cron (proven-terminal REAUTH_REQUIRED, CAS secret writes, refresh-token preservation)
- YouTube lane hardening — media identity proven at upload (the asset's `client_reported_sha256` rides the read grant and the transport hashes the fetched bytes BEFORE the PUT; mismatch uploads nothing), deterministic Shorts eligibility from measured asset facts (`shared/types/youtube-shorts.ts`, tri-state, surfaced on the publish control), truthful expiry badge ("Auto-refresh", info tone — expired-but-refreshable is a capability, not an activity or a warning), and the daily agent reel now drafts for YouTube alongside Facebook/Instagram (`/api/agent/draft-posts` accepts `youtube`; agent-platform PR #18 sends it; drafts only — publish remains the founder's private-only click)
- Mobile install experience (`/install`) — PWA guidance with device-specific walkthrough
- Electrical demo seed pack
- Network workspace tab restructure and parity fixes
- Altair Community Phase 1 orientation experience on `/network` (user-facing Community shell; Network backend retained; Help Requests and future content types not yet implemented; route/database rename deferred)
- Scheduled publishing safety spine (migration `205`) — Publishing → Today approval now writes a `marketing_publish_jobs` row with the explicit destination account and approver (owner/admin); a daily `marketing-publish` cron (18:00 UTC) leases due jobs through the queue state machine and publishes only via `dispatchPublish` when `MARKETING_PUBLISH_MODE=live`; per-channel pause on connected accounts (row column + Instagram metadata flag) enforced by the gate and by the legacy Meta actions (which now honour the kill switch); `failed` deliveries that carry a provider id are never retried by software; YouTube channel readback fails closed; optional default-off auto-approval policy (`MARKETING_AUTO_APPROVE_SOURCES`). See `docs/reference/marketing-publishing-automation.md`
- Public website SEO (Phase 0) — `/insights` index of published site pages (anonymous; migration 187 RLS decides what appears) linked from the public nav and footer; article pages compose Open Graph with the shared `og.png` and keep the original `datePublished` on revisions; `sitemap.xml` (`app/sitemap.ts`) lists the core pages, `/how-it-works`, the comparison pages, the HVAC landing pages and the Resource Center on `PUBLIC_SITE_ORIGIN` (or `ALTAIR_SITE_ORIGIN` when set) plus every published page's stored canonical; Organization + SoftwareApplication/Offer JSON-LD on `/` and `/pricing` read from the plan catalog; FAQPage JSON-LD only where an FAQ is rendered (pricing, the HVAC landing pages, the comparison pages). The agent bridge `/api/agent/draft-posts` accepts `channel: 'website'` with an `seo` brief (publish-gate limits applied at the door) and writes a `marketing_content_packages` row plus a `channel_target='website'` DRAFT keyed by `source_job_id` (migration `204`, not yet applied in production); nothing publishes a page without a recorded human approval, and the website publish action is still to be built
- Public website, video and speed (2026-11-11/12, PRs #56–#67, all merged and live):
  - The homepage hero plays a muted 30 s loop of the product commercial; "Watch" plays the full 2:27 (`HeroCommercialVideo`). `/how-it-works` hosts it with chapters, a transcript and VideoObject + Clip JSON-LD (`shared/lib/site/commercial-video.ts`).
  - Comparison pages `/servicetitan-alternative` and `/jobber-housecall-pro-alternatives` (`shared/lib/site/comparison-pages.ts`). Altair prices are read from the plan catalog; competitor facts are sourced and dated 2026-11-11 and need a re-check before they are relied on later.
  - Stylesheets: the root layout loads none. `(marketing)` and `(auth)` load `app/public.css` (utilities only for public files, about 220 KB); every other route loads `app/app.css` (about 450 KB) through its layout; the root 404/error pages use the 2 KB `app/status-page.css`. See `docs/product/ALTAIR_ARCHITECTURE.md` (Stylesheet entries); `scripts/verify-public-stylesheet.mjs` guards it in CI.
  - Speed: 242 unused files removed; the Meta Pixel loads on first interaction or 5 s after load; Geist Mono is not preloaded; Turnstile starts on first form interaction; signed-in layouts make one auth check per request and run the billing gate alongside their other reads. Live homepage, slow-phone Lighthouse (DevTools throttling, median of 3): score 58 → 77, first paint 4.1 s → 2.8 s, fully usable 8.0 s → 3.6 s.
  - Gold loading feedback: a top progress bar on link clicks (`NavigationProgress`) and the Altair gear spinner (`GearSpinner`) in loading states, on the website, admin and technician app.
  - Retired design experiments removed (command-center-v1, workspace-v1, the North Star dashboard and shell concept routes, `/tech/demo`); their old addresses redirect in `next.config.ts`. `/platform/design-lab` is the live theming tool and stays.
- Public website, landing page and free tools (2026-11-12, site audit follow-up):
  - The logged-out homepage is a landing page again (`HomeLandingPage`: what it is, the price, the trial button and "Sign in" on the first screen, then the commercial, product tour, 5-user price comparison, onboarding, pricing, FAQ and free tools). `/login` is unchanged; the previous sign-in-form homepage is kept as `LoginLandingPage` and is one line to restore in `app/(marketing)/welcome/page.tsx`.
  - `/about` names the founder and the company facts the owner has stated (`shared/lib/site/about.ts`; add a fact there only when the owner has stated it) and repeats the "not built yet" list. `/for-techs` is a page for technicians: two calculators, the training channel, the phone view, and a ready-written "send this to your boss" message.
  - Six free calculators (`shared/lib/resources/catalog.ts`): labor rate, job profitability, break-even, maintenance agreement pricing, technician pay (hourly / flat rate / commission) and callback cost. Each math module is pure and checked against a hand-worked example in `scripts/verify-resource-center.mjs`.
  - "Email me these results" (`/api/resources/email-results`): the server recomputes the result from the inputs, is rate limited per address and per inbox (`public.resource_email`), and stores an address only when the opt-in box is ticked, as pending until the emailed link is pressed (`resource_email_subscribers`, `lib/resources/subscribers.ts`). Confirm and unsubscribe pages act only on a button press. No newsletter is sent by the product yet; the list is only collected. Needs migration `209` in production (results email works without it; the opt-in is then reported as unavailable).
  - Engagement counts on Platform analytics → Website ("What visitors did"): video plays, trial-button presses, calculator use, template downloads, results emails and send-to-boss, by name only, never anything typed. Needs migration `209`; the panel says "not measured yet" until then.
- Public contractor directory, phase 1 (`/directory`, migration `210`): anyone can search published listings by trade, city or ZIP and state; a contractor lists a business with one form and no account (`/directory/list`). A listing is stored as `pending_email`, moves to `pending_review` when the lister presses the button behind the emailed, signed manage link (`lib/directory/links.ts`), and becomes public only when a platform admin approves it at `/platform/directory`. The same link edits or removes the listing; an edit to a live listing waits in `pending_changes` and the live page is unchanged until approved. Tables are service-role only; public pages read through `directory_search_listings` / `directory_public_listing`, which return public columns of published rows and never the lister's email. Rate limits `public.directory_submit`, `public.directory_manage_link`, `public.directory_report`; there is no Turnstile on the form (the app holds no Turnstile secret), so the protections are the hidden trap field, the limits, email confirmation and owner approval. It is a standalone table: in-app `network_profiles` are not public. Published listings also appear inside the signed-in Community > Directory tab (North Star surface), in their own group, each tagged "Public listing" and described as not on Altair yet, or "Your listing" when it was listed with the viewer own sign-in email (`shared/components/network/CommunityPublicListing.tsx`, data from `listListingsForCommunity()`, the same public function): a member can call them, open their site, or start the existing invitation form filled in with the listing's name, phone and trade. A referral cannot be sent to a public listing, because there is no workspace on the other side. Claim your listing (migration `211`): a published listing can be linked to an Altair workspace from Community > Directory. Only an owner or admin may link, and only when their confirmed sign-in email is the email the listing was confirmed with (`app/actions/directory-claim.ts`, data layer `lib/directory/claims.ts`); a workspace may link up to 3 listings; an owner or admin of the linked workspace may unlink. A linked listing whose workspace has application access is shown publicly with "Altair member" and is listed ahead of non-members (both public pages say so and say what the mark means). "Has access" is the billing resolver's answer by the app shell's rule (`resolveCompanyBillingAccess` + `billingPolicyAllowsAppShell`), stored as `member_active` when the listing is linked and re-asked for every linked listing by the daily `billing-maintenance` run, so a lapsed workspace loses the mark within a day and gets it back within a day of becoming active. The public functions return only `is_member`, never the workspace id. In Community a linked business that also has a visible Community profile is shown once (as a member); one without a visible profile is tagged "Altair member" and is not offered an invitation. The manage page explains linking and carries the trial link (`data-cta="directory-manage-member"`). Not built yet: radius search, linking for someone whose sign-in email differs from the listing's email. Rules and wiring are checked by `scripts/verify-directory.mjs`.
- Platform analytics (`/platform/analytics`, platform admins only) — overview, website traffic, acquisition funnel, product usage, revenue (MRR kept separate from collected revenue) and marketing-by-source tabs; first-party cookieless tracking (`/api/analytics/collect`, GPC/DNT honoured, no IP or user agent stored) and first-touch signup attribution. Tracking needs migration `202` in production, and its 25-month retention sweep (run by the billing maintenance cron) needs migration `203`; see `docs/reference/platform-analytics.md`

---

## Foundation Already Complete (Pre-2026-06-17)

Master Shell V2, Visual Polish Passes A–F, Micro-Interaction Batches A–B, Interaction Bug-Fix Pass A, and pre-beta interaction fixes remain **complete** on major admin surfaces. Focused smoke test passed (2026-06-16).

Legacy `ListCommandCenterLayout` and `ListCommandCenterLoadingState` **removed**.

Dispatch Phase 5 mobile viewport lock remains **intentionally deferred** (board must stay visible under mobile sheets).

---

## Current Priorities

### Priority 1: Authenticated Production Smoke (Active)

Exercise core workflows on real tenant data before first external company onboarding. Checklist: `docs/reference/internal-alpha-smoke-test.md`.

Focus areas: signup/trade onboarding, customers → jobs → dispatch → technician completion → estimate → invoice → Stripe/manual payment, workflow reminders, time/expenses.

### Priority 2: First External Beta Companies (Next)

Onboard a small number of real companies after smoke passes. Reduce friction, validate operational trust, collect feedback via Alpha Tracker and beta bug reports.

### Priority 3: Deferred Experience Tracks

- Technician Experience V2 — eliminate `/tech` mock infrastructure
- Command Center / Workspace prototype wholesale adoption (Phase 6)
- Micro-Interaction Batch C
- Broad dark mode, route/page transitions
- Overlay/detail consistency for estimate/invoice overlays
- Platform/alpha utility shell migration (`/alpha-tracker`, `/platform`, `/platform/bugs`) — only if needed for beta

---

## Active Work

- Authenticated production/user-data smoke validation (operational gate)
- Confirm Supabase migrations `108` and `109` applied on production
- North Star flag-on stability monitoring across admin surfaces

## Sprint 2E Dry Run Verdict (2026-07-05)

**Code:** Ready for first HVAC beta company after operational prerequisites. `npx tsc --noEmit` and `npm run build` passed with no route, type, or permission regressions found in audit.

**Operational gates before invite:**

- Apply all Supabase migrations through `109_platform_founder_signal_actions.sql`
- Set Vercel env: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` (required); Stripe + Resend recommended
- Run `docs/reference/internal-alpha-smoke-test.md` on production with real tenant data
- Configure Supabase Auth redirect URLs for production domain

**Deferred (non-blocking):** payment step not in onboarding checklist; no bug-submit push notification; expired snooze badge UX; `docs/reference/internal-alpha-smoke-test.md` Coming Soon section outdated (alpha gates currently empty).

---

## Known Issues (Non-Blocking for Beta)

- `/tech` root still contains mock infrastructure (Technician Experience V2 deferred)
- Dispatch Phase 5 mobile viewport lock intentionally deferred
- `EstimatesLoadingState` uses default skeleton props (no summary strip skeleton)
- Invoice/estimate overlay modes use raw layout instead of `MasterDetailPageLayout` (overlay consistency deferred)
- North Star experience requires `NEXT_PUBLIC_NORTH_STAR_SHELL=true` — not yet default-on
- Stripe Connect and Twilio SMS require environment configuration per company/deploy
- `docs/archive/architecture/backend-data-map.md` describes pre-Supabase mock state — outdated

---

## Immediate Goal (Next 30 Days)

Get Altair into the hands of a small number of real companies after authenticated production smoke validates core workflows.

Success metrics:

- Authenticated smoke passes on production/user data
- Companies can onboard with trade selection
- Companies can create customers, estimates, jobs, dispatch technicians, and collect payments (manual + Stripe when configured)
- Workflow reminders surface actionable follow-ups on dashboard
- Admin surfaces feel consistent and premium under North Star when flag is enabled

---

## Long-Term Vision

Altair OS becomes a Living Operating System that trades companies genuinely enjoy opening every morning — intelligent, helpful, calm, organized, and delightful rather than feeling like another management system.
