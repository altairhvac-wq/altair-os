import "server-only";

/**
 * What a workspace export contains, and what it must never contain.
 *
 * ============================== WHY EVERY TABLE IS NAMED ==============================
 * An export built by "select everything with a company_id" leaks whatever is
 * added next. The failure is silent and one-directional: nobody notices a
 * credential in an export until it is already in someone's downloads folder.
 *
 * So every tenant-scoped table is classified here, and
 * verify-workspace-export-live reads the live schema and fails if a table
 * exists that this file does not name. Adding a table means making a decision
 * about it, which is the point.
 *
 * ============================== THE THREE CATEGORIES ==============================
 *   business    the customer's own records. Exported.
 *   credential  tokens, secrets, encrypted material, security metadata.
 *               NEVER exported — an export is a file that leaves the building.
 *   internal    platform operations and product tooling. Not the customer's
 *               data and not useful to them; excluded to keep the export
 *               something a person can actually read.
 */

export type WorkspaceExportCategory = "business" | "credential" | "internal";

export type WorkspaceExportTable = {
  table: string;
  category: WorkspaceExportCategory;
  /** How rows are narrowed to one tenant. */
  scope: "company_id" | "none";
  /**
   * Columns to omit from an otherwise-exported table. Empty means every
   * column. Anything listed is named because it is sensitive, not because it
   * is uninteresting.
   */
  omitColumns?: string[];
  /**
   * The column(s) to page by, in order.
   *
   * Defaults to ["id"], which most tables have. Some do not:
   * company_document_counters is keyed (company_id, document_type), and a page
   * walk with no stable order can repeat or skip rows. Named explicitly rather
   * than discovered, so an unorderable table fails loudly at review time
   * instead of silently exporting a partial one.
   */
  orderBy?: string[];
  /** Required for anything not exported. */
  reason?: string;
};

/**
 * Column names that look like credentials.
 *
 * Used by the verifier, not at runtime: every column matching this in an
 * EXPORTED table must be either omitted above or listed in
 * SENSITIVE_COLUMN_ALLOWANCES with a reason. A regex cannot be the rule itself
 * -- ai_usage_events.prompt_tokens is a count, design_lab_themes.tokens are
 * design tokens -- but it is an excellent way to force a decision.
 */
export const SENSITIVE_COLUMN_PATTERN =
  /token|secret|encrypted|password|hash|nonce|api_key|credential/i;

/**
 * Columns that match the pattern and are exported anyway, each with why.
 *
 * Keyed "table.column". Anything not here and not omitted fails the verifier.
 */
export const SENSITIVE_COLUMN_ALLOWANCES: Record<string, string> = {
  "ai_usage_events.prompt_tokens": "a count of model tokens, not a credential",
  "ai_usage_events.completion_tokens": "a count of model tokens",
  "ai_usage_events.total_tokens": "a count of model tokens",
  "company_ai_limits.monthly_token_ceiling": "a count of model tokens",
  "design_lab_themes.tokens": "design tokens — colours and spacing",
  "marketing_posts.suggested_hashtags": "post copy",
  "marketing_connected_accounts.token_expires_at":
    "an expiry timestamp. The token itself lives in " +
    "marketing_connected_account_secrets, which is not exported",
};

export const WORKSPACE_EXPORT_TABLES: WorkspaceExportTable[] = [
  // ---------------------------------------------------------------- business
  { table: "customers", category: "business", scope: "company_id" },
  { table: "customer_activities", category: "business", scope: "company_id" },
  { table: "customer_equipment", category: "business", scope: "company_id" },
  { table: "jobs", category: "business", scope: "company_id" },
  { table: "job_activities", category: "business", scope: "company_id" },
  { table: "job_attachments", category: "business", scope: "company_id" },
  { table: "job_materials", category: "business", scope: "company_id" },
  { table: "estimates", category: "business", scope: "company_id" },
  { table: "estimate_line_items", category: "business", scope: "company_id" },
  { table: "estimate_activities", category: "business", scope: "company_id" },
  { table: "invoices", category: "business", scope: "company_id" },
  { table: "invoice_line_items", category: "business", scope: "company_id" },
  { table: "invoice_activities", category: "business", scope: "company_id" },
  { table: "invoice_payments", category: "business", scope: "company_id" },
  { table: "expenses", category: "business", scope: "company_id" },
  { table: "expense_activities", category: "business", scope: "company_id" },
  { table: "leads", category: "business", scope: "company_id" },
  { table: "lead_activities", category: "business", scope: "company_id" },
  { table: "dispatch_assignments", category: "business", scope: "company_id" },
  { table: "time_entries", category: "business", scope: "company_id" },
  { table: "time_activities", category: "business", scope: "company_id" },
  { table: "time_clock_entries", category: "business", scope: "company_id" },
  { table: "service_items", category: "business", scope: "company_id" },
  { table: "workflow_reminders", category: "business", scope: "company_id" },
  { table: "notifications", category: "business", scope: "company_id" },
  {
    table: "company_document_counters",
    category: "business",
    scope: "company_id",
    // No id column; the primary key is (company_id, document_type).
    orderBy: ["document_type"],
  },
  {
    table: "billing_signatures",
    category: "business",
    scope: "company_id",
    // signature_data is the captured image. It is the customer's own proof
    // that work was authorised, so it belongs in their export.
  },
  { table: "membership_activities", category: "business", scope: "company_id" },
  {
    table: "company_memberships",
    category: "business",
    scope: "company_id",
    // member_share_code is a shareable credential for joining the company.
    omitColumns: ["member_share_code"],
  },
  { table: "marketing_posts", category: "business", scope: "company_id" },
  { table: "marketing_items", category: "business", scope: "company_id" },
  { table: "marketing_media_assets", category: "business", scope: "company_id" },
  { table: "marketing_metrics", category: "business", scope: "company_id" },
  { table: "marketing_directives", category: "business", scope: "company_id" },
  { table: "marketing_runs", category: "business", scope: "company_id" },
  {
    table: "marketing_channel_deliveries",
    category: "business",
    scope: "company_id",
  },
  {
    table: "marketing_connected_accounts",
    category: "business",
    scope: "company_id",
    // Which accounts are connected is the customer's own fact. The tokens are
    // in a separate table that is not exported at all.
  },
  { table: "network_profiles", category: "business", scope: "company_id" },
  { table: "network_partners", category: "business", scope: "company_id" },
  { table: "network_help_requests", category: "business", scope: "company_id" },
  { table: "network_help_offers", category: "business", scope: "company_id" },
  { table: "sms_opt_outs", category: "business", scope: "company_id" },
  { table: "design_lab_themes", category: "business", scope: "company_id" },
  { table: "beta_feedback_reports", category: "business", scope: "company_id" },

  // ------------------------------------------------------------- credential
  {
    table: "marketing_connected_account_secrets",
    category: "credential",
    scope: "none",
    reason:
      "encrypted OAuth access and refresh tokens. The whole point of the table",
  },
  {
    table: "marketing_oauth_states",
    category: "credential",
    scope: "company_id",
    reason: "CSRF state for an in-flight OAuth handshake",
  },
  {
    table: "estimate_approval_tokens",
    category: "credential",
    scope: "company_id",
    reason:
      "bearer tokens for the public approval link. A hash still lets a leaked " +
      "export confirm a guessed token",
  },
  {
    table: "invoice_payment_tokens",
    category: "credential",
    scope: "company_id",
    reason: "bearer tokens for the public payment link",
  },
  {
    table: "network_invites",
    category: "credential",
    scope: "none",
    reason: "encrypted invite tokens",
  },
  {
    table: "security_audit_events",
    category: "credential",
    scope: "company_id",
    reason:
      "authentication events including failures. Security-only metadata, and " +
      "a record of who tried to get in rather than of the customer's business",
  },
  {
    table: "payment_provider_events",
    category: "credential",
    scope: "company_id",
    reason:
      "raw provider webhook payloads, which carry payment-instrument metadata " +
      "the application never needed to store in an export",
  },
  {
    table: "company_payment_accounts",
    category: "credential",
    scope: "company_id",
    reason: "connected payment-provider account identifiers",
  },
  {
    table: "company_billing_accounts",
    category: "credential",
    scope: "company_id",
    reason: "provider billing-customer identifiers",
  },

  // ---------------------------------------------------------------- internal
  {
    table: "ai_rate_limit_counters",
    category: "internal",
    scope: "company_id",
    reason: "operational counters with no meaning outside this system",
  },
  {
    table: "ai_usage_events",
    category: "internal",
    scope: "company_id",
    reason: "internal token accounting",
  },
  {
    table: "company_ai_limits",
    category: "internal",
    scope: "company_id",
    reason:
      "our per-tenant AI spending ceilings, which are a term of their plan " +
      "rather than a record they created",
  },
  {
    table: "company_subscriptions",
    category: "internal",
    scope: "company_id",
    reason: "our billing state for this tenant, not their business records",
  },
  {
    table: "subscription_event_ledger",
    category: "internal",
    scope: "company_id",
    reason: "our billing event log",
  },
  {
    table: "payment_attempts",
    category: "internal",
    scope: "company_id",
    reason: "provider attempt bookkeeping; the resulting payments are exported",
  },
  {
    table: "payment_disputes",
    category: "internal",
    scope: "company_id",
    reason: "provider dispute bookkeeping",
  },
  {
    table: "payment_reconciliations",
    category: "internal",
    scope: "company_id",
    reason: "provider reconciliation bookkeeping",
  },
  {
    table: "agent_marketing_decisions",
    category: "internal",
    scope: "company_id",
    reason:
      "intermediate state of the marketing agent. The posts and media it " +
      "produced are exported; the deliberation that led to them is not a " +
      "record the customer authored",
  },
  {
    table: "agent_marketing_snapshots",
    category: "internal",
    scope: "company_id",
    reason:
      "point-in-time inputs the marketing agent read. Derived from data that " +
      "is itself exported, so including it would duplicate rather than add",
  },
  {
    table: "alpha_tracker_items",
    category: "internal",
    scope: "company_id",
    reason: "our own product tracker",
  },
  {
    table: "platform_founder_signal_actions",
    category: "internal",
    scope: "company_id",
    reason:
      "our own operator actions against this tenant. Not their record, and " +
      "arguably not one they should be handed",
  },
];

export const EXPORTED_TABLES = WORKSPACE_EXPORT_TABLES.filter(
  (entry) => entry.category === "business",
);

export function findExportTable(
  table: string,
): WorkspaceExportTable | undefined {
  return WORKSPACE_EXPORT_TABLES.find((entry) => entry.table === table);
}
