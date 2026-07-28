# Workflow language comparison — Phase 3

Presentation-only vocabulary alignment. Persisted `jobs.status` values, transition rules, and `resolveJobWorkflow` / `getJobNextBusinessAction` resolution logic are unchanged.

## Job status badge (canonical field status)

| Status value | Before | After |
|---|---|---|
| `scheduled` | Scheduled | Scheduled |
| `dispatched` | En Route | En Route |
| `arrived` | On Site | On Site |
| `in_progress` | In Progress | In Progress |
| `completed` | Completed | Completed |
| `cancelled` | Cancelled | Cancelled |

Filter option casing for `in_progress` now matches the badge (`In Progress`).

## Header terminal banner

| Surface | Before | After |
|---|---|---|
| Completed banner | Work completed | Completed (via `formatJobStatus`) |

## Workflow timeline stages

| Stage id | Before | After |
|---|---|---|
| `job_created` | Job Created | Created |
| `technician_assigned` | Technician Assigned | Assigned |
| `inspection` | Inspection | Inspection |
| `estimate_created` | Estimate Created | Estimate |
| `customer_approval` | Customer Approval | Approval |
| `work_in_progress` | Work In Progress | In Progress |
| `work_completed` | Work Completed | Work completed |
| `invoice_created` | Invoice Created | Invoice |
| `payment_received` | Payment Received | Payment |
| `completed` | Completed | Completed |

Timeline subtitle prefix: `Current:` → `Stage:` so it does not compete with the job-status badge.

## Next Command card

| Surface | Before | After |
|---|---|---|
| North Star eyebrow | Next action | Next command |
| Legacy eyebrow | Next action | Next action (unchanged) |
| Terminal complete chip | Job workflow complete | Completed |
| Stage hint | Current stage: … | Stage: … |

## Ownership (unchanged behavior)

- Job status badge = canonical field status
- Timeline = journey stage map (uses stage labels above)
- Header banners = waiting / blocking / terminal context
- JobNextActionCard = normal executable next step
- ReopenCompletedJobControl = completed-job exception only
