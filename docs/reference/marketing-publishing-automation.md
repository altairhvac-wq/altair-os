# Marketing publishing automation (the safety spine)

How a marketing post goes from an approval click to a real post on a real
account without a human pressing Publish — and every lever that stops it.

Source of truth for the design decisions: `docs/marketing/AUTONOMOUS_OPERATIONS_AUDIT_2026-10-25.md`
(sections 3 and 3a). This page describes what is implemented.

## The pieces

| Piece | Where |
| --- | --- |
| Kill switch | `MARKETING_PUBLISH_MODE` read by `lib/publishing/gate.ts` (`resolvePublishMode`) |
| Per-channel pause | `marketing_connected_accounts.publishing_paused` (+ metadata flag for Instagram), migration 204 |
| Approval that carries a destination | `app/actions/marketing-publish-approval.ts` |
| The queue | `marketing_publish_jobs` (migrations 184, 204), state machine in `shared/types/publish-job.ts` |
| The ledger (duplicate guard) | `marketing_channel_deliveries`, decisions in `shared/types/marketing-delivery.ts` |
| The publisher | `app/api/cron/marketing-publish/route.ts`, daily at 18:00 UTC (`vercel.json`) |
| Auto-approval policy (default off) | `MARKETING_AUTO_APPROVE_SOURCES`, `lib/publishing/auto-approve.ts` |
| Verifiers (offline) | `scripts/verify-publish-approval.mjs`, `verify-publish-gate.mjs`, `verify-marketing-delivery.mjs`, `verify-publish-job-machine.mjs`, `verify-youtube-upload.mjs` |

## State machine

Two tables, two jobs. The **queue** (`marketing_publish_jobs`) decides *when*;
the **ledger** (`marketing_channel_deliveries`) decides *whether anything may
be sent at all*. They share the key `(company_id, marketing_post_id, provider)`.

Queue states (`job_state`):

```
draft -> ready_for_approval -> approved -> scheduled -> publishing -> published
                                                 ^            |
                                                 +-- backoff -+-> failed
```

- `scheduled` with `run_after <= now` is the publisher's work list.
- `publishing` means a worker holds a 10-minute lease (`lease_expires_at`,
  `leased_by`). An expired lease is reclaimed by the next run; the ledger,
  not the queue, prevents the reclaimed attempt from publishing twice.
- A failed attempt goes back to `scheduled` with `run_after` pushed out
  (60 s, doubling); after `max_attempts` (3 for most providers) the job is
  `failed`. `published` means the queue is done — the ledger's
  `delivery_state` says what the provider actually has.
- `approved_by` is a profile id. `approved_by_policy` (migration 204) names a
  non-human approver (`policy:auto-approve`). Exactly one is set on an
  approved job; `approved_at` is set iff one of them is.

Ledger states (`delivery_state`): `in_flight`, `posted`, `draft`, `failed`.
`decideDelivery` lets a new attempt PROCEED only when there is no row or the
row is a *clean* `failed` — one that carries **no** `provider_media_id` and no
`provider_post_id`. A `failed` row that names a provider object (an upload
that was accepted, a readback that did not verify) is `NEEDS_RECONCILIATION`
and is never retried by software.

Post status (`marketing_posts.status`) is the human-facing summary and is set
alongside: approval sets `scheduled` (slot) or `ready` (no slot); the publisher
sets `posted` when the provider reports a live post.

## The approval contract (Publishing → Today)

"Approve for scheduled distribution" calls
`approveMarketingPostForDistributionAction(postId, { scheduledAt, connectedAccountId })`:

1. Requires company **owner/admin** (plus `dispatchJobs`). The old path
   accepted any `dispatchJobs` holder.
2. Resolves the **destination** for the post's channel with
   `shared/lib/marketing-publish-destination.ts`:
   - exactly one eligible connected account → that one;
   - the account the human named, if eligible → that one;
   - none → refuse ("connect one");
   - several and none named → refuse ("choose the destination"). The Today
     card shows a destination select only in this case. Nothing is ever
     inferred from a title or a caption.
   - Instagram's eligible accounts are Facebook Page rows with a linked
     Business account; the publish identity is the Business account id.
   - `website` posts publish to `altair_site`; `general` posts cannot be approved.
3. Updates the post exactly as before (through `updateMarketingPostAction`,
   so the schedule/status coupling lives in one place).
4. Upserts the queue row: `job_state` `scheduled` (slot) or `approved` (no
   slot), `connected_account_id` = the destination, `approved_by` = the
   clicker, `approved_at` = now, `scheduled_for` = `run_after` = the slot,
   `attempt` reset to 0. A row that is `publishing`, `published` or
   `cancelled` refuses the approval; `failed` is reopened (re-approving *is*
   "try again").
5. Records an `APPROVED` decision on `agent_marketing_decisions`
   (`subject_kind = marketing_post`). The decision channel is one row per
   post, so a post that already carries a decision keeps the first one.

Nothing publishes from the click.

## The publisher cron

`GET /api/cron/marketing-publish`, authenticated with `Authorization: Bearer
<CRON_SECRET>` like every other cron, 60 s function budget (the loop stops
leasing at 50 s and reports `deferred`), records a `platform_automation_runs`
row under `marketing_publish`, and is registered in the Sentry cron monitor
table. Schedule: `0 18 * * *` UTC — the Hobby plan allows one run per day, so
a slot earlier than 18:00 UTC publishes at 18:00 that day.

One run:

1. **Auto-approval step** (only when `MARKETING_AUTO_APPROVE_SOURCES` is set, see below).
2. **Mode check.** If `MARKETING_PUBLISH_MODE` is not exactly `live`, no job is
   leased and the response says so (`publishingSkipped`). The gate inside
   `dispatchPublish` checks the same switch again — the cron reaches the gate,
   it never bypasses it.
3. For up to 25 due rows (`scheduled` with `run_after` passed, or `publishing`
   with an expired lease), in `run_after` order:
   - a job whose channel is **paused** is left `scheduled` untouched (no
     attempt is burned against an operator's pause);
   - the row is leased with a compare-and-set on `(state, attempt, holder)`;
   - the destination is loaded and must be this company's, this provider's
     and connected; a job with **no `connected_account_id` never publishes**;
   - the post must still be publishable and target this provider; a post
     already `posted` (or a ledger row already `posted`/`draft`) settles the
     job `published` without a provider call;
   - the stored video is read through a short-lived grant; the copy is
     checked against the provider's limits exactly as the YouTube action does;
   - `dispatchPublish` is called with the same `DispatchInput` the YouTube
     action builds (website: `dispatchFirstParty` with the content package's
     `brief.seo`, `publishedBy` = the human approver — a policy-approved
     website job is refused because a page records a person);
   - the outcome is settled with `decideJobOutcome`; a live post marks the
     post `posted`.
4. **Channel pause rule.** A failure is scoped to the *post* (missing media,
   over-long copy, already delivered, needs reconciliation) or to the
   *channel* (credential, connection state, provider error). A dead credential
   (`NO_CREDENTIAL`, `REAUTH_REQUIRED`) pauses the channel immediately; any
   other channel-scoped failure pauses it once the job's attempts are
   exhausted. Post-scoped failures never pause a channel. The pause reason
   names the time, the post and the cause.

Response JSON reports `publishMode`, the auto-approval summary, per-run job
counts and up to 50 per-attempt records.

### What the publisher does not do

- Publish text/photo Facebook or Instagram posts: through `dispatchPublish`
  the Meta adapters publish Reels (video). Those legacy formats remain the
  hand-driven Server Actions in `app/actions/marketing-publish.ts`.
- Apply the HVAC direct-publish guard: this cron *is* the "scheduled
  distribution run" that guard points humans to.
- Lift YouTube visibility: uploads stay private; the readback now fails
  closed when YouTube reports no channel id.

## Pause controls

**Global:** `MARKETING_PUBLISH_MODE`. Anything other than the exact literal
`live` disarms every path — `dispatchPublish`, the publisher cron, and (new)
the four legacy Meta Server Actions plus the Marketing HQ Facebook action,
which refuse before any Graph call and before staging a post.

**Per channel:** `setConnectedAccountPublishingPauseAction({ connectedAccountId, provider?, paused, reason? })`
in `app/actions/marketing-connected-accounts.ts` (platform admin and company
owner/admin). `provider` omitted or equal to the row's provider pauses the
**row** (`publishing_paused`, `publishing_paused_reason`); `provider:
"instagram"` on a Facebook Page row pauses Instagram alone via
`metadata.publishingPausedProviders.instagram`. Read through
`decidePublishingPause`; enforced by the gate (`assertConnectionReady`), by
the legacy Page loader, and skipped-before-lease by the cron. The publisher
sets this pause itself after the failures described above; resuming is a
human action — there is no automatic resume.

## Auto-approval policy (default OFF)

`MARKETING_AUTO_APPROVE_SOURCES` — unset or empty means off. Set it to a
comma-separated list of `marketing_posts.source_type` values (for example
`agent_daily_reel`). On each run the cron considers up to 20 `draft` posts of
those sources that carry a stored video and a **measured** render QA of
`PASS`, and for each one with **exactly one** eligible destination account:
moves the post to `scheduled` for the next daily slot (tomorrow's run when the
cron is running — one day for a human to cancel), upserts the job with
`approved_by_policy = 'policy:auto-approve'` and no `approved_by`, and records
an `APPROVED` decision with no user. Unknown source names are reported in the
run response, not silently dropped. The policy never arms publishing and never
chooses between destinations.

## How to stop everything

1. Set `MARKETING_PUBLISH_MODE=off` (or remove it) on the deployment. The cron
   then leases nothing; every action refuses; nothing reaches a provider.
2. Unset `MARKETING_AUTO_APPROVE_SOURCES` if it was set.
3. For one channel only: pause it with the action above (or set
   `publishing_paused = true` on the row). The queue keeps its jobs.
4. To drop a job for good: set its `job_state` to `cancelled` (terminal). To
   stop a post: archive it (an archived post is unpublishable and the job
   fails without a provider call).

## Operating notes

- The cron runs daily, so a job's backoff (1, 2, 4 minutes) is effectively
  "next day"; three attempts is three days.
- Migration 204 must be applied before the connected-account queries will
  read (they select the new columns). Copy it to the Desktop migrations
  folder per the owner's convention once merged.
- Nothing here lifts `MARKETING_PUBLISH_MODE`; arming remains a deliberate
  operator edit of the deployment's environment.
