import {
  CUSTOMER_NOTES,
  JOB_NOTES,
  LEAD_NOTES,
} from "@/shared/lib/help/notes/customers-and-jobs";
import {
  ESTIMATE_NOTES,
  EXPENSE_NOTES,
  INVOICE_NOTES,
  PRICE_BOOK_NOTES,
} from "@/shared/lib/help/notes/sales";
import { GETTING_STARTED_NOTES, SETTINGS_NOTES } from "@/shared/lib/help/notes/settings";
import { REPORTS_NOTES, TEAM_NOTES } from "@/shared/lib/help/notes/team-and-reports";
import { TECHNICIAN_NOTES } from "@/shared/lib/help/notes/technician";
import type { HelpNote } from "@/shared/lib/help/types";

/**
 * Every how-to note. Its own module, apart from the catalog helpers, so the
 * sitemap can list the notes without loading anything else.
 */
export const HELP_NOTES: readonly HelpNote[] = [
  ...GETTING_STARTED_NOTES,
  ...CUSTOMER_NOTES,
  ...LEAD_NOTES,
  ...JOB_NOTES,
  ...ESTIMATE_NOTES,
  ...INVOICE_NOTES,
  ...PRICE_BOOK_NOTES,
  ...EXPENSE_NOTES,
  ...TEAM_NOTES,
  ...REPORTS_NOTES,
  ...SETTINGS_NOTES,
  ...TECHNICIAN_NOTES,
];
