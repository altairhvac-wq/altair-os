# Altair Current Sprint

Sprint: **Beta Launch Dry Run (2E)**

Last Updated: 2026-07-05

> **Source of truth for active sprint only.** For current product state see `ALTair_MASTER_STATUS.md`. For confirmed production inventory see `ALTair_BRAIN.md`.

---

## Goal

Complete a full beta launch dry run — audit signup through Founder Brain without feature work. Fix only true P0/P1 launch blockers.

---

## Completed This Sprint Window

1. **Beta launch dry run audit (Sprint 2E)** — traced signup → onboarding → core workflow → payments → bug reporting → Founder Brain → automation; classified findings; `npx tsc --noEmit` and `npm run build` passed; no code P0 blockers found
2. **Deployment checklist sync** — `docs/internal-alpha-deployment-checklist.md` updated for beta-required env vars and migrations `108`/`109`
3. **Founder Brain foundation (Sprint 2A–2D)** — Mission Hero, Reliability Pulse, Customer Health Pulse, Needs Attention, activation funnel, founder action loop (prior sprints)

---

## In Progress

1. **Authenticated production/user-data smoke** — run `docs/internal-alpha-smoke-test.md` against deployed production with real tenant data (operational gate before first HVAC beta company)
2. **Supabase migrations `108` and `109`** — apply on production if not yet applied
3. **North Star flag-on stability** — monitor admin surfaces with `NEXT_PUBLIC_NORTH_STAR_SHELL=true`

---

## Smoke Focus Areas

Prioritize these workflows during smoke (all must pass before external beta):

- Signup with trade selection → `/setup` → dashboard
- Customer create → job create → dispatch assign → technician complete
- Estimate send → public approval → job/invoice path
- Invoice send → manual payment record → balance update
- Stripe Connect setup → public Pay Now checkout (when env configured)
- Workflow reminders appear on dashboard after evaluator runs
- Time clock in/out and expense with receipt upload

---

## Next (After Smoke Passes)

- First external company beta onboarding
- Address any smoke blockers only — no speculative feature work
- Consider default-on North Star flag after sustained flag-on stability
- Founder Brain phase 3 (email/SMS delivery ledger) — only when durable tracking exists
- Founder Brain CRM/analytics expansion — customer health pulse is the current customer-success surface
- Founder Brain action loop expansion — assignment queues, bulk actions, email/SMS delivery ledger (Sprint 2D shipped minimal loop)

---

## Out of Scope

- New modules or feature expansion
- More North Star concept iteration or palette exploration
- Technician Experience V2 (`/tech` mock cleanup) — deferred post-beta unless smoke blocks
- Database schema changes, new server actions, or route additions unless smoke finds a blocker
- Founder Brain expansion beyond foundation (Stripe analytics, cron health, impersonation)

---

## Reference

| Need | Document |
|------|----------|
| Current product state | `ALTair_MASTER_STATUS.md` |
| Production inventory | `ALTair_BRAIN.md` |
| Experience roadmap (future) | `ALTair_V2_ROADMAP.md` |
| Deploy smoke checklist | `docs/internal-alpha-smoke-test.md` |
| Deploy env checklist | `docs/internal-alpha-deployment-checklist.md` |
| North Star flag | `lib/beta/north-star-shell.ts` |
| Session close workflow | `SESSION_CLOSE_PROMPT.md` |
