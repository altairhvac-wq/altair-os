# Reference

Operational checklists, QA notes, audits, and launch readiness documents.

## What belongs here

- Smoke-test and deployment checklists
- Beta / payments QA notes
- Demo account audits
- Other procedural references that support shipping

## What does not belong here

- Product state sources of truth → `docs/product/`
- Product UI design → `docs/design/`
- Development / session guides → `docs/development/`
- Foundation philosophy → `docs/foundation/`
- Creative production libraries → `docs/creative/`
- Marketing storyboards → `docs/marketing/`
- Closed validation artifacts → `docs/archive/`

## Authority

These documents are procedural. They do not override foundation, Canon, or product status docs.

| Document | Use |
|----------|-----|
| [`internal-alpha-smoke-test.md`](./internal-alpha-smoke-test.md) | Authenticated production smoke |
| [`internal-alpha-deployment-checklist.md`](./internal-alpha-deployment-checklist.md) | Deployment checklist |
| [`beta-launch-readiness.md`](./beta-launch-readiness.md) | Beta readiness |
| [`stripe-payments-beta-qa.md`](./stripe-payments-beta-qa.md) | Stripe payments QA |
| [`demo-account-audit.md`](./demo-account-audit.md) | Demo account audit |

## Recommended reading order

1. `docs/product/ALTair_MASTER_STATUS.md` (what stage we are in)
2. The checklist relevant to the task (smoke, deploy, QA, audit)
