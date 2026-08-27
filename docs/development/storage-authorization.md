# company-files storage authorization

How receipts and job attachments are authorized, and the manual checklist that
must pass before the narrower policy is switched on.

## The defect

Migration 021's storage policy checked three things and stopped:

```sql
bucket_id = 'company-files'
and (storage.foldername(name))[1] = 'company'
and public.is_active_company_member(((storage.foldername(name))[2])::uuid)
```

Any active member of a company could read **any** object under that company's
prefix, regardless of whether the owning database row would let them read it.
A technician's row permissions are narrower than company membership — the
`expenses` SELECT policy restricts them to their own receipts — but the storage
policy was not, so possession of an object key defeated the row policy.

Practical exploitation needs a path leak, because expense and job ids are uuids
and not enumerable. That makes it a wrong-shape defect rather than a live
breach. It is still the wrong shape: an object and the row it belongs to should
be governed by one decision, not two that can drift.

## Path families

Both builders live in `lib/storage/company-files.ts` and are exhaustive:

```text
company/{companyId}/expenses/{expenseId}/{file}
company/{companyId}/jobs/{jobId}/{attachmentId}/{file}
```

## The authorization matrix

Migration 153 adds `public.can_read_company_file(name)`, which parses the path
and mirrors the SELECT policy of the owning row.

| Role | Expense receipts | Job attachments |
| --- | --- | --- |
| Owner | All | All |
| Admin | All | All |
| Office staff | All (`can_manage_billing`) | All (`can_view_operational_jobs`) |
| Dispatcher | All (`can_dispatch_jobs`) | All (`can_view_operational_jobs`) |
| Technician | **Own only** (`technician_id = auth.uid()`) | **Assigned jobs only** |
| Subcontractor | **Own only** | **Assigned jobs only** |
| Any other company | None | None |

Receipts mirror `public.expenses` (migration 103). Attachments mirror
`public.jobs` (migration 046) — an attachment is a view onto a job, so job
visibility is the right authority.

Every branch fails closed: an unknown path family, a missing row, a malformed
uuid, a path shorter than four segments, and an unauthenticated caller all
return false.

### Row metadata (migration 156 — resolved)

This was previously recorded as a known follow-on: `can_read_company_file` gated
the *bytes* of an attachment on job visibility, but `public.job_attachments`
kept a bare `is_active_company_member(company_id)` SELECT policy, so a
technician could still read the file name, caption and path of every attachment
in the company — including jobs they were never assigned to. File names and
captions routinely carry customer names and addresses, so the two halves of one
attachment disagreed in a way that leaked.

Migration 156 closes it by giving the row the same predicate the bytes already
had, on both SELECT and INSERT. The concern that held it back — that tightening
would break attachment lists — was checked rather than assumed, and does not
hold. `job_attachments` has exactly two read paths and both are already gated at
or above the new rule:

- `app/(admin)/work/[jobId]/page.tsx` and
  `app/actions/technician-job-work-history.ts` already refuse in application code
  when `job.assignedTechnicianId !== context.user.id`. RLS was *weaker* than the
  application's own rule; 156 moves that rule down into the database.
- `app/(admin)/customers/[customerId]/page.tsx` is guarded by
  `canManageCustomers` (owner/admin/dispatcher/office_staff), every one of which
  satisfies `can_view_operational_jobs`, so the new predicate is unconditionally
  true there.

Confirmed empirically: with 156 reverted in scratch, the live matrix fails on
exactly three assertions (technician sees an unassigned job's row, twice, and
can plant a row on an unassigned job) and nothing else.

## Rollout — the part that matters

**PostgreSQL combines PERMISSIVE policies with OR.** Adding migration 153 while
migration 021's broad policy still exists therefore changes *nothing*. That is
deliberate, and it is what makes the rollout safe.

1. **Apply migration 153.** No behaviour changes. Nothing can break.
2. **Run the checklist below** against a non-production copy.
3. **Apply migration 154**, which drops the broad policy. *This is the step
   where access actually narrows.* Be ready to roll back.

Rollback of 154 is re-creating the 021 policy; the exact SQL is in the
migration header.

## Manual verification checklist

Run against a **scratch project** restored from a backup, with both migrations
applied. Each row needs a signed-in session for that role.

| # | Actor | Action | Expected |
| --- | --- | --- | --- |
| 1 | Owner | Open any expense receipt | Allowed |
| 2 | Admin | Open any expense receipt | Allowed |
| 3 | Office staff | Open any expense receipt | Allowed |
| 4 | Dispatcher | Open any expense receipt | Allowed |
| 5 | Dispatcher | Open any job attachment | Allowed |
| 6 | Technician A | Open **their own** receipt | Allowed |
| 7 | Technician A | Open **Technician B's** receipt, using the exact object key | **Denied** |
| 8 | Technician A | Open an attachment on a job **assigned to them** | Allowed |
| 9 | Technician A | Open an attachment on a job **assigned to B** | **Denied** |
| 10 | Member of another company | Open anything under this company's prefix | **Denied** |
| 11 | Anyone | Upload a receipt | Allowed (INSERT policy unchanged) |

Rows 7 and 9 are the point of the exercise. The others confirm nothing broke.

### Exercising row 7 directly

The application will not offer Technician A a link to B's receipt, so construct
the request by hand. As an admin, read the key:

```sql
select receipt_storage_path
from public.expenses
where company_id = '<company>'
  and technician_id = '<technician B>'
  and receipt_status = 'attached'
limit 1;
```

Then, **signed in as Technician A**, ask for a signed URL for that exact key.
Before migration 154 it succeeds. After, it must fail.

```sql
-- as technician A, against the scratch project
select public.can_read_company_file('company/<company>/expenses/<expense id>/<file>');
-- expected: false
```

`can_read_company_file` can be called directly like this, which makes the whole
matrix testable in SQL without driving a browser for all eleven rows.

## What automated verification covers

`scripts/verify-phase4-controls.mjs` (in `verify:all`) asserts that the policy
mirrors the owning row rather than company membership, that every failure branch
returns false, that 153 does not drop the broad policy, that 154 does and
carries a rollback, and that the path families still match the two builders in
`lib/storage/company-files.ts`.

`scripts/verify-storage-matrix.mjs` (in `verify:all`) covers the drift risk
across the three files that must agree — the key builders, 153's parser, and the
154/156 policies — including that 156's row predicate is character-for-character
the same as 153's byte predicate, and that 156 introduces no new privileged
function (the migration 148 failure mode).

Neither is evidence about behavior. Structure agreeing with itself is not the
same as Postgres allowing and denying the right people.

### The live matrix

`scripts/verify-storage-matrix-live.mjs` closes that gap and supersedes the
manual checklist above for rows 7 and 9. It builds a disposable fixture company
in a scratch project, creates one user per role, signs each in with the anon key
for a genuine JWT, and drives the real RPC and real Storage API as those users.

```bash
node scripts/verify-storage-matrix-live.mjs --confirm <scratch-project-ref>
```

It proves, among 36 assertions, the two the checklist could not: a technician
reading their **own** receipt while being refused another technician's given the
exact object key, and a technician reading an attachment on an **assigned** job
while being refused one on an unassigned job. It also confirms the absence of
over-tightening — owner, admin, office staff and dispatcher all retain access —
and that the write path is untouched.

Safety: it requires `ALTAIR_LOADTEST_SUPABASE_URL`,
`ALTAIR_LOADTEST_SERVICE_ROLE_KEY` and `ALTAIR_LOADTEST_ANON_KEY`, never reads
the application's own credentials, refuses to run if the target matches
`NEXT_PUBLIC_SUPABASE_URL`, requires `--confirm` to match the target ref, and
cleans up after itself (`--clean` removes leftovers from an interrupted run).

## Related: orphaned objects

No code path deletes a Storage object, so a permanently deleted expense keeps
its receipt indefinitely. After migration 154 those orphans become unreadable by
anyone — the safe outcome — but they still exist and still cost money.

`scripts/reap-orphaned-storage.mjs` reports and, with two explicit flags,
removes them. It is dry-run by default and deliberately **not** wired into cron:
a scheduled job that decides which customer documents no longer matter is not
something to switch on casually.

```bash
export ALTAIR_STORAGE_REAPER_SUPABASE_URL="https://<ref>.supabase.co"
export ALTAIR_STORAGE_REAPER_SERVICE_ROLE_KEY="<service role key>"

# report only
node scripts/reap-orphaned-storage.mjs --confirm <ref>

# after reviewing the written report
node scripts/reap-orphaned-storage.mjs --confirm <ref> \
  --delete --i-understand-this-deletes-customer-files
```

An object is a candidate only when its path parses, its owning row is absent,
**and** it is older than the grace period (default 30 days). An unparseable
path, a missing timestamp, or a database lookup failure all result in the object
being reported and skipped — never deleted.
