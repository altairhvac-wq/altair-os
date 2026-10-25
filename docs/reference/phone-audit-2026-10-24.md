# Phone audit — 2026-10-24

Phone-only polish pass over the app at 375×812 (iPhone size, touch, 2× DPR).
Goal: technician ease of use. Screenshots (before/after) live in
`ui-audit/phone-2026-10-24/`. The audit is repeatable with
`node scripts/capture-phone-audit.mjs` (see "Re-running" below).

## Method

- Signed-in Playwright run against the local dev server using the existing
  founder auth state (`.playwright/founder-auth.json`), owner view mode forced
  to Technician for the technician routes and Owner / Admin for the admin ones.
- Every visible interactive control on each screen was hit-tested: size
  (44px minimum, flagged under 40px, "tiny" under 32px), overlap with another
  control, whether something else sits on top of the control's centre, and
  horizontal overflow.
- Routes: `/technician`, `/technician/schedule`, `/tech/time`,
  `/tech/receipts` (+ add sheet), `/tech/notifications`, the job detail
  overlay (via the new dev-only `/tech/demo/schedule`), and the admin
  `/`, `/work`, `/customers`, `/settings` for the owner on a phone.

## What was wrong (before)

Technician shell

1. **Three copies of the same menu.** The hamburger drawer listed Home / Time /
   Receipts / Alerts; the bottom tab bar listed Home / Time / Receipts /
   Alerts; the home screen app grid listed Schedule / Time / Receipts /
   Alerts. Schedule — the screen a technician works from — was the only
   destination not in the tab bar.
2. **Header controls blended and were too small.** Five controls in 375px:
   menu, "Altair OS" (wrapping to two lines) + company name (truncated to
   "Altair HV…"), "View as" (95×39), bell (36×36) flush against it, sign out.
3. **Tab bar scrolled sideways** with a 2px gap and no boundary between tabs.
4. **Install banner** had a 16px-tall "View instructions" link and a 24px
   dismiss target, and sat as a cream strip above the dark home wallpaper.
5. **Floating feedback bubble** covered the bottom-right of every screen
   (it sat on the Today card on the time page).
6. **Time page** opened with a "Back to Today" link and a four-line
   paragraph before the Clock In button.
7. **Receipt sheet** category chips scrolled sideways; "Vehicle" was cut off.
8. **Job detail** carried a second, legacy copy of the workflow controls
   ("Additional job controls — fallback controls if you need the previous
   next-step layout") under the command center, plus a redundant hint line
   under the status select; the work-history Retry link was 37×20.
9. Notifications "Mark all read" was 32px tall; week-strip days were 40px.

Admin shell on a phone (owner)

10. **Bell on top of the menu button.** The left slot was empty below `lg`
    (the greeting hides there), so the right-hand cluster slid left: the bell
    overlapped the hamburger, the trial pill covered the avatar, and the
    sign-out icon fell off the right edge. These are the "unclickable"
    controls.
11. **Two hamburgers on the home screen**: one in the header, one in the
    launcher card, both opening the same drawer.
12. Customers stat chips were 24px tall; the Today / All Jobs tabs 36px.

## What changed (after)

Technician shell

- **One navigation surface.** The hamburger drawer is gone from the technician
  shell (`TechnicianQuickNavDrawer` deleted). The bottom tab bar now has five
  equal-width, 56px-tall tabs with no sideways scroll: Home, Schedule, Time,
  Receipts, Alerts. Home only matches its exact path, so Schedule lights up
  on `/technician/schedule`.
- **Header = company name, bell, avatar.** The bell is a 44px target. The
  avatar opens the new **account sheet** (`shared/components/mobile/
  MobileAccountSheet.tsx`): name / role / email, photo change, company
  switch (when the user belongs to more than one), owner "View as" rows,
  install-on-this-phone, Send feedback, Sign out. Owners in technician view
  see "Technician view · owner access" under the company name.
- **Home screen** keeps the Today and Time clock widgets, drops the app grid
  (the tab bar now has every destination) and shows the **next job** as a
  card (customer, type, time, address, status; opens the job). The install
  banner lives inside the dark home, is a 56px row that opens `/install`, and
  has a separate 44px dismiss.
- **Job deep links** are `/technician/schedule?jobId=…` (notifications and the
  next-job card use it; old `/technician?jobId=` links redirect).
- **Time page**: title "Time clock", Clock In / Out is the first thing on
  screen at 56px tall, the explanation sits below it in one short paragraph,
  stat tiles and entry rows have their own surface.
- **Job detail**: legacy fallback block removed, status-select hint removed,
  Retry is a 44px target.
- Receipt category chips wrap; week-strip days and "Mark all read" are 44px.

Admin shell on a phone

- Header left slot shows **company name + role** (or "Viewing as technician /
  dispatch"), so the two sides can no longer collide. The menu button is
  hidden on `/` where the launcher has its own. Right side is bell + avatar;
  the avatar opens the same account sheet, with a **Subscription** row (trial
  / grace status, opens billing) in place of the header pill. View as, trial
  pill, desktop avatar and sign out remain unchanged from `md` up.
- The floating feedback bubble no longer renders on phones (it is in the
  sheet).
- Customers stat chips and Today / All Jobs tabs are 44px on phones.

Shared

- `CompactTimeClockBar` gained `size="hero"`.
- `CompanySwitcher` technician variant renders the company name at header
  weight.
- `TechnicianNavId` gained `"schedule"` (gated on `viewAssignedJobs`, same as
  jobs).

## Verified

- `npx tsc --noEmit`, `npm run lint`, `npm run build` pass.
- Re-run of the phone audit after the changes: no covered, overlapping,
  off-screen or sub-32px controls on any technician screen; the only sub-40px
  controls left are the seven week-strip days (39×44 — seven across 375px).
- Admin `/`, `/work`, `/customers`, `/settings`: header controls no longer
  overlap; remaining "offscreen-x" items are the intentional scrolling rails
  (destination rail, settings sub-nav).

## Not changed (judgement calls, for the owner)

- The schedule hero and the job command center both offer the field step
  (Start work etc.). That is deliberate — the hero is the one-tap path, the
  command center is the full set — and was left alone.
- The command center's "Recommended next step" for an on-site job with no
  quote is "Create Quote" with "Start Work" as a secondary action. That is
  workflow logic (`resolveJobWorkflow`), not layout, so it was not touched.
- The time page's Start break / End break buttons are both disabled when off
  the clock; acceptable, but a single context-aware button would be simpler.
- The Next.js dev-tools badge covers the Home tab in local development only.

## Re-running

```bash
node scripts/capture-phone-audit.mjs
```

```bash
node scripts/capture-phone-audit.mjs --mode owner_admin --routes /,/work,/customers,/settings
```

```bash
node scripts/capture-phone-audit.mjs --routes /tech/demo/schedule
```

The last one renders the real schedule screen with mock jobs on today's date
(development only) so the job hero and job detail can be checked without
seeding jobs in a real company.
