# Financial information ownership — Phase 4

Presentation-only ownership for North Star office Job Detail Money path.

## Before

| Surface | Owned facts |
|---|---|
| Side-rail Billing card | Collected, outstanding, estimate/invoice links |
| Profitability section | Collected, invoiced, outstanding, costs, margin, labor, projected revenue + Billing anchor |
| Review checklist | Closeout readiness + invoice create/view shortcuts |
| JobNextActionCard | Next executable financial/workflow CTA |
| Header / Command Plate | No financial amounts (Phase 3) |

Problems:
- Document progression and payment state were split across side rail + profitability
- Billing deep link landed on profitability, not document progression
- Collected / outstanding repeated on two prominent surfaces

## After

| Surface | Owns |
|---|---|
| **JobNextActionCard** | Next executable financial action when financial work is next |
| **Money path** (`#job-detail-billing`) | Estimate → Invoice → Payment document progression and payment summary |
| **Profitability** | Direct costs, gross profit/margin, labor, projected-revenue analysis |
| **Review checklist** | Closeout readiness and missing financial requirements |
| Side-rail Billing card | Unmounted on North Star Job Detail (legacy component retained) |

## Money path structure

Compact three-stage region (stacks on mobile):

1. **Estimate** — number, operational status, total when available, View estimate
2. **Invoice** — number, status, total when available, View invoice
3. **Payment** — status, collected, outstanding, invoiced total, View payment details

No primary mutation CTAs. Secondary document navigation only.
