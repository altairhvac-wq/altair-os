# Internal Alpha Smoke Test Checklist

Run this checklist after each production or preview deploy that matters for internal alpha. Mark each item pass/fail and note blockers.

**Prerequisites**

- Deploy completed on Vercel
- Supabase migrations applied
- Test accounts: owner/admin, dispatcher, technician, office staff (create as needed)
- Owner has verified `/settings/system-check`

---

## Auth and onboarding

### Signup → setup → dashboard

- [ ] Open `/signup` on deployed URL
- [ ] Create a new account with company name and trade selection
- [ ] If email confirmation is enabled: confirm email, then sign in
- [ ] If no company context: complete `/setup` with company name and trade
- [ ] Land on admin dashboard (`/`) without errors
- [ ] Internal Alpha banner visible in admin shell (production)

### Login redirect safety

- [ ] Sign out and sign in again — lands on correct home for role
- [ ] Visit `/login?next=/customers`, sign in — lands on `/customers` (admin roles)
- [ ] Alpha: `/login?next=/estimates` redirects away from Coming Soon path after login

---

## Customer creation

- [ ] Navigate to `/customers`
- [ ] Create a new customer with name, contact, and address fields
- [ ] Customer appears in list
- [ ] Open customer detail page — data persists after refresh

---

## Job creation

- [ ] Navigate to `/jobs`
- [ ] Create a job linked to the test customer
- [ ] Job appears in jobs list with expected status
- [ ] Open job detail — workflow controls load without error

---

## Dispatch assignment

- [ ] Navigate to `/dispatch`
- [ ] Unassigned jobs panel loads
- [ ] Assign test job to a technician
- [ ] Assignment persists after refresh
- [ ] Technician workload cards reflect assignment

---

## Expense with receipt

- [ ] Navigate to `/expenses`
- [ ] Create an expense with amount, category, and date
- [ ] Upload a receipt image/PDF
- [ ] Receipt preview or signed URL loads for authorized user
- [ ] Expense appears in list with correct status

---

## Clock in/out

- [ ] Navigate to `/time-clock` (admin) or `/tech/time` (technician)
- [ ] Clock in for a technician/time entry
- [ ] Clock out — entry shows completed duration/status
- [ ] Entry visible in time list after refresh

---

## Invoice flow

- [ ] Navigate to `/invoices`
- [ ] Create or open an invoice linked to customer/job as supported
- [ ] Update invoice status (draft → sent or equivalent)
- [ ] Record a manual payment if payment UI is available
- [ ] If Stripe configured: open public Pay Now link and complete checkout (or verify gated state when not configured)
- [ ] Invoice detail reflects status and balance changes after refresh

---

## Workflow reminders (dashboard)

- [ ] Sign in as owner/admin with operational data (overdue invoice, stale estimate, or lead follow-up)
- [ ] Dashboard shows workflow reminders section (North Star or legacy view)
- [ ] Reminder links route to the correct entity

---

## Team invite + accept

- [ ] As owner/admin, open `/settings`
- [ ] Invite a new team member (use a fresh email)
- [ ] Invitee receives invite (email or pending invite UI)
- [ ] Invitee signs up or logs in and accepts invite
- [ ] Invitee appears in team members table with correct role
- [ ] Invitee can access routes allowed for their role

---

## Technician login routing

- [ ] Sign in as technician (or role with technician home)
- [ ] Lands on `/technician` (not admin dashboard)
- [ ] Technician nav shows expected items only
- [ ] Assigned job from dispatch appears on technician job list
- [ ] Technician workflow transitions (En Route → Arrived → Start Work → Complete) succeed via the trusted RPC path

> **Security (migration 116):** Assigned technicians no longer have a direct `UPDATE` policy on `jobs`. Workflow status changes go exclusively through `transition_job_workflow_status` (migration 115). Dispatcher direct updates remain allowed for dispatch/admin job edits.

---

## Technician weak-network resilience (closed beta)

This pass is **not** offline sync. It covers connectivity awareness, safe retries, form preservation, and duplicate-submit guards while online/unstable.

### Connectivity banner

- [ ] Sign in as technician on `/technician`
- [ ] In DevTools, set Network to Offline (or disable device radio)
- [ ] Amber **No connection** banner appears in the technician shell
- [ ] Restore network — brief green **Back online** banner appears, then clears

### Duplicate-submit / pending guards

- [ ] Open an assigned job and tap a workflow action (e.g. En Route / Arrived / Start Work) twice quickly — only one status change applies; button stays pending
- [ ] Start Route (when it dispatches) — double-tap does not double-dispatch; maps open only after a successful status update
- [ ] Complete job — double-submit does not create duplicate completion side effects

### Form preservation on failure

- [ ] On a job, fill materials / expense / estimate fields, then force a failure (Offline or throttle + submit)
- [ ] Error copy mentions connection/retry and that entries are still present
- [ ] Typed values remain on screen; reconnect and retry succeeds without re-entering everything

### Photo / receipt retry

- [ ] Upload a job photo while Offline or with upload interrupted — error shows; file remains ready to retry
- [ ] Tap **Retry upload** after reconnect — upload succeeds without re-picking the file
- [ ] Same check for expense receipt attach (existing expense) and create-expense-with-receipt from the technician expense form

### Work history retry

- [ ] Open job work history while Offline (or after a failed load) — error + **Retry** control
- [ ] Reconnect, tap Retry — attachments/materials/expenses load

### Clock-out after complete (connection messaging)

- [ ] Complete a job while clocked in so the shift clock-out prompt appears
- [ ] If clock-out fails due to connection, an on-screen error appears and the shift remains open (no silent failure)

---

## Role-based nav check

For each test role, verify sidebar/mobile nav:

| Role | Should see | Should NOT see (examples) |
|------|------------|---------------------------|
| Owner | Dashboard, Dispatch, Settings, … | — |
| Admin | Same as owner for admin nav | — |
| Dispatcher | Dispatch, Jobs, Customers, … | Settings (if restricted) |
| Technician | Technician app routes | Admin dispatch/settings |
| Office staff | Billing-adjacent routes per permissions | Dispatch (if restricted) |

- [ ] Owner nav matches expectations
- [ ] Admin nav matches expectations
- [ ] Dispatcher nav matches expectations
- [ ] Technician nav matches expectations
- [ ] Office staff nav matches expectations

---

## Direct URL Coming Soon checks (alpha hardening)

With alpha hardening enabled (production default):

- [ ] `/estimates` → Coming Soon view (not broken/error)
- [ ] `/estimates/<id>` → Coming Soon view
- [ ] `/price-book` → Coming Soon view
- [ ] `/network` → Coming Soon view
- [ ] These routes are hidden from admin nav

---

## System check (owner)

- [ ] Sign in as owner
- [ ] Open `/settings/system-check`
- [ ] Required env vars: **Pass**
- [ ] Supabase connection: **Pass**
- [ ] Active company context: **Pass**
- [ ] Current user profile: **Pass**
- [ ] bootstrap RPC: **Pass**
- [ ] company-files bucket: **Pass**
- [ ] Migration marker: **Pass**

---

## Sign-off

| Field | Value |
|-------|-------|
| Deploy URL | |
| Deploy type | Preview / Production |
| Date | |
| Tester | |
| Result | Pass / Fail |
| Blockers | |

---

## Related docs

- Deploy setup: `docs/internal-alpha-deployment-checklist.md`
