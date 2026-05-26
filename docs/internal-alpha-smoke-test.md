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
- [ ] Create a new account with company name
- [ ] If email confirmation is enabled: confirm email, then sign in
- [ ] If no company context: complete `/setup` with company name
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

- [ ] Navigate to `/time` (admin) or technician time UI
- [ ] Clock in for a technician/time entry
- [ ] Clock out — entry shows completed duration/status
- [ ] Entry visible in time list after refresh

---

## Invoice flow

- [ ] Navigate to `/invoices`
- [ ] Create or open an invoice linked to customer/job as supported
- [ ] Update invoice status (draft → sent or equivalent)
- [ ] Record a payment if payment UI is available
- [ ] Invoice detail reflects status changes after refresh

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
