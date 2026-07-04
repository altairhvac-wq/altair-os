# Altair Current Sprint

Sprint: **Beta Readiness & Production Hardening**

Last Updated: 2026-07-03

> **Source of truth for active sprint only.** For current product state see `ALTair_MASTER_STATUS.md`. For confirmed production inventory see `ALTair_BRAIN.md`.

---

## Goal

Validate that Altair is ready for first external company beta testing after the major post-M1 delivery window (~187 commits since 2026-06-17).

North Star experience layer (M1–M14 + dispatch), Stripe Connect payments, workflow reminders, trade-aware onboarding, dashboard operational prioritization, and **Founder Brain foundation on `/platform`** are **shipped**. This sprint focuses on **trust verification** — not speculative feature expansion.

---

## Completed This Sprint Window

1. **Founder Brain foundation (Sprint 2A)** — `/platform` Mission Hero, priority engine, Needs Attention panel, cross-tenant activation funnel
2. **Founder Brain reliability signals (Sprint 2B)** — cron health tracking, payment webhook visibility, Stripe Connect risks, platform env checks, Reliability Pulse UI
3. **First 10 Minutes activation** — dashboard onboarding hero and checklist improvements (prior session)

---

## In Progress

1. **Authenticated production/user-data smoke** — run `docs/internal-alpha-smoke-test.md` against deployed production with real tenant data
2. **Beta onboarding preparation** — confirm signup → trade setup → core operating loop works end-to-end
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
