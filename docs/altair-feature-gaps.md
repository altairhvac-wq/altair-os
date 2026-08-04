# Altair feature gaps

Running list of capabilities that are **not real product features yet** in this codebase. Do not build a fake UI, invent sample numbers, or imply these exist. Prefer honest empty states, omit the element, or leave a clear “not available” affordance until the real model ships.

Companion docs: [`.cursor/rules/altair-design-system.mdc`](../.cursor/rules/altair-design-system.mdc) (data honesty), [`altair-build-roadmap.md`](./altair-build-roadmap.md) (UI redesign status).

| Gap | Status | Notes / code anchors |
|-----|--------|----------------------|
| Technician photos | Placeholder / incomplete | Field photo UX exists in places (`TechnicianPhotoSheet`, job attachment upload paths), but do not treat technician photo capture as a finished, universally reliable product feature. Legacy `/tech` still uses “coming soon” toasts (`TechnicianDashboardView`). Do not invent photo counts or fake galleries. |
| Reviews collection system | Not built | No end-to-end path to request, collect, store, or aggregate customer reviews for technicians or the company. `/technicians` shows an honest “No reviews yet” empty state only — do not invent stars, averages, or review counts. Related: no technician star/score model on team, jobs, or dispatch. |
| PTO / leave tracking | Not built | No PTO, time-off, or leave-balance model. Do not invent availability-from-PTO, leave calendars, or remaining-days metrics on `/technicians`, team profile, or dispatch. |
| Referral attribution | Not built | `member_share_code` on `company_memberships` (migration `125`) is display/copy only on `/technicians` and team profile. Do not claim lead/customer attribution, conversion counts, or “referred by” linkage from codes until tracking ships. Distinct from Network/Community B2B `network_referrals`. |
| Customer memberships | Not built | No customer loyalty / membership-tier product. Do not confuse with `company_memberships` (team access). |
| Customer reviews | Not built | No review ingestion or display product. Community docs explicitly avoid public star-rating behavior. Overlaps Reviews collection system above for technician roster UI. |
| Real CLV model | Not built | Reports “lifetime revenue” is **all-time payments collected** (`sumCollectedRevenue` / `invoice_payments`), labeled as not a CLV model (`CustomerHealthCard`, `ReportCustomerHealth`). Do not present that total as modeled CLV. |
| Customer response-time tracking | Not built | No SLA / first-response / reply-time metrics. Do not invent averages. |
| Inbound call tracking | Not built | No call log, telephony integration, or missed-call pipeline. |
| Revenue / profit forecast module | Not built | No forward forecast model. Momentum copy must stay directional and not claim forecast accuracy (`dashboard-operational-momentum`). |
| Auto-generated insights engine | Not built | AI summary cards / operational insight helpers may exist for scoped summaries; there is no autonomous insights engine that invents priorities or narratives without traced inputs. Do not fabricate insight strings. |
| Business Score (composite grade) | **Paused** | Composite “Business Score” grade is paused pending an explicit rubric decision. Operational health heuristics elsewhere must not be rebranded as a Business Score without that decision. |
| Native lead value / amount tracking | Not built | Leads have **Source** (attribution channel) but no reliable monetary value field. Do not show a Value / pipeline-amount column from fragile estimate linkage. Needs either a first-class value/amount on `leads`, or a real `lead_id` FK on estimates (or equivalent durable join) before UI can surface lead value honestly. |
| Job field-tasks checklist | Not built | No first-class per-job task / checklist model for field work. Do not invent Tasks UI, fake completion counts, or placeholder checklists on Job Details. |
| Job estimated / scheduled duration | Not built | No durable estimated or scheduled duration field wired for Job Details. Do not invent Est. Duration / schedule-length metrics from guesses or mock values. |
| Settings notification channel toggles | Not built | No `user_notification_preferences` / company notif-settings table. `/settings/notifications` is an in-app inbox preview only — do not invent per-type email/SMS/in-app toggles. |
| Settings units / locale / theme / default views | Not built | No schema for imperial/metric, date-format, currency display, theme, or persisted calendar/schedule view. `/settings/preferences` is timezone-only (`companies.timezone`). |

## How to use this list

1. Before adding a KPI, badge, or section that sounds like one of the above — check here first.
2. If you need a layout placeholder during redesign, use empty/honest states; never seed fake values.
3. When a gap is truly implemented (schema + write path + traced reads), remove or update the row and note the owning modules.
4. Money collected remains payment-ledger truth (`invoice_payments`) even after related features ship — see the design-system rule.
