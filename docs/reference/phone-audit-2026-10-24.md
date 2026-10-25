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

## Second pass — every admin screen on a phone (same day)

Audited as the owner at 375×812: `/`, `/work`, `/work/[id]`, `/dispatch`,
`/customers`, `/customers/[id]`, `/customers/import`, leads, `/sales`
(estimates, invoices, payments), `/expenses`, `/price-book`, `/team`,
time clock, `/payroll`, `/reports`, `/settings` (+ billing, company, team),
`/community`, `/schedule`, `/marketing`, `/alpha-tracker`.

What was wrong

1. **Every compact list header hid its title on phones** and showed only a
   truncated subtitle stub beside the buttons ("See what is hap…", "Find who
   y…"), so Work, Customers, Sales, Team, Expenses, Price Book all opened
   with an empty-looking strip.
2. **Customer profile section tabs printed on top of each other.** The
   segmented-item token is `flex: 1 1 0%` in unlayered CSS, so eight tabs
   were squeezed to ~30px each and Tailwind's `shrink-0` could not override
   it. Unreadable and unusable.
3. **Sub-44px targets everywhere the same primitives are used:** segmented
   controls (36px) on Work, customer profile, job workflow strip, Community;
   stat-strip filter chips (24px) on Customers, Estimates, Invoices, Leads;
   job detail "Edit job / Open dispatch" and section tabs (36px); customer
   profile action bar (36px); team roster name links (20px) and share-code
   copy buttons (36px); expense "Filters" toggle (30px); schedule week
   arrows (36px); "Back to Work" / "Customers" back links (20px); customer
   card email/phone/profile links (16px).
4. **Job detail title squeezed** to "JOB-" / "1111" beside its two header
   buttons.
5. At 375px "Customers" + Import + New Customer overflowed the header row
   and the title was pressed against the first button.

What changed

- `MasterPageHeader` (compact): the title now shows at every width, the
  subtitle yields below `md` when actions are present, and the row wraps on
  phones so actions drop under the title only when they do not fit (they
  stay right-aligned).
- `app/globals.css`: `.admin-segmented-item` is 44px below 768px, and a new
  `.admin-segmented-item-natural` modifier (natural width, no wrap) is used
  by the customer profile tab strip so it scrolls instead of overlapping.
- North Star `viewTabsItem` token: 44px on phones (Community and every other
  consumer).
- Stat strips (Customers, Estimates, Invoices, Leads): 44px chips on phones.
- Job detail: title takes the full row on phones with buttons underneath;
  header buttons, section tabs, back link and customer-card links are 44px.
- Customer profile: action bar buttons and back link 44px; section tabs
  scroll at natural width.
- Team roster: member name links and share-code buttons 44px; expense filter
  toggle and schedule week arrows 44px.
- `scripts/capture-phone-audit.mjs`: `--extra detail` opens the first row of a
  list page; interactions and late redirects no longer abort the run.

Checked and left alone: the destination rail, settings sub-nav, marketing
tabs, stat strips and the dispatch timeline scroll sideways by design
(flagged as "offscreen-x" by the script, which is expected); the 16px list
checkboxes sit inside 44px labels; Mapbox's own zoom/attribution controls
are third-party.

## Third pass — press every button (owner feedback, same day)

The owner reported a menu whose options opened off the screen, and that the
technician home still showed the destination icons twice.

- **Technician nav is now the icon chips.** The colour chips from the old
  home grid are the bottom tab bar (Home, Schedule, Time, Receipts, Alerts);
  they appear exactly once in the app. The home screen keeps the Today and
  Time clock widgets and the next-job card.
- **`scripts/capture-phone-audit.mjs --extra clickall`** presses every safe
  `<button>` and `<summary>` on a route (skipping anything that would mutate
  data: save, send, sign out, delete, clock in…), records what opened, and
  flags any dialog, menu, listbox or sheet whose box leaves the 375px viewport
  or causes horizontal overflow. The page reloads after each press so every
  control is tested from the same state. It also runs inside the technician
  job detail overlay.
- Run over the technician screens (home, schedule, job detail, time,
  receipts, alerts) and the admin screens (`/`, Work, Dispatch, Customers,
  Sales, Team, Expenses, Reports, Settings, Community, Price Book, Payroll,
  Schedule, a job detail, a customer profile). Every create sheet, edit
  dialog, drawer, notification panel and account sheet fit the viewport.
- **One real offender:** the Community **My Profile** menu. It right-aligned
  a 296px panel to a trigger that sits at the left of the header on phones,
  so it opened 103px off the left edge. It is now clamped to a 12px gutter
  on both sides.

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
