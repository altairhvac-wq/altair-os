export type CompanyRole =
  | "owner"
  | "admin"
  | "dispatcher"
  | "technician"
  | "office_staff"
  | "subcontractor"
  | "customer";

export type MembershipStatus = "active" | "invited" | "suspended";

export type MembershipActivityType =
  | "team_invite_created"
  | "invite_accepted"
  | "member_role_changed"
  | "member_suspended"
  | "member_reactivated"
  | "company_switched";

export type CompanyStatus = "active" | "trial" | "suspended";

/** DB enum still includes legacy `lead`; app code normalizes to active. */
export type CustomerStatus = "active" | "inactive" | "lead";

export type LeadStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "estimate_sent"
  | "won"
  | "lost";

export type LeadSource =
  | "website"
  | "google"
  | "facebook"
  | "referral"
  | "network_referral"
  | "door_hanger"
  | "yard_sign"
  | "truck_wrap"
  | "other";

export type NetworkReferralUrgency =
  | "low"
  | "normal"
  | "urgent"
  | "emergency";

export type NetworkReferralStatus =
  | "sent"
  | "accepted"
  | "declined"
  | "converted"
  | "won"
  | "lost"
  | "cancelled";

/** `network_partners.relationship_status` — private partner CRM lifecycle. */
export type RelationshipStatus =
  | "preferred"
  | "active"
  | "pending"
  | "paused";

/** `network_invites.status` — trusted network invitation lifecycle. */
export type NetworkInviteStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "cancelled";

export type LeadActivityType =
  | "lead_created"
  | "call_logged"
  | "email_logged"
  | "note_added"
  | "status_changed"
  | "follow_up_changed"
  | "estimate_created"
  | "converted"
  | "won"
  | "lost";

export type CustomerActivityType =
  | "customer_created"
  | "customer_archived"
  | "customer_restored"
  | "customer_deleted"
  | "customer_moved_to_trash"
  | "customer_restored_from_trash"
  | "customer_permanently_deleted"
  | "equipment_added"
  | "equipment_updated"
  | "warranty_expiration_recorded";

export type JobStatus =
  | "scheduled"
  | "dispatched"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export type JobPriority = "low" | "normal" | "high" | "urgent";

export type DispatchAssignmentStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "unassigned";

export type JobActivityType =
  | "job_created"
  | "technician_assigned"
  | "technician_unassigned"
  | "start_route"
  | "start_work"
  | "complete_job"
  | "technician_arrived"
  | "work_started"
  | "work_completed"
  | "status_changed"
  | "job_cancelled"
  | "job_attachment_uploaded"
  | "job_material_added"
  | "invoice_created_for_completed_job"
  | "invoice_auto_created_from_completion"
  | "labor_entries_closed"
  | "job_labor_auto_closed"
  | "pending_expenses_resolved"
  | "material_costs_completed"
  | "estimate_routed_to_dispatch"
  | "estimate_authorized_on_site";

export type EstimateStatus =
  | "draft"
  | "sent"
  | "approved"
  | "declined"
  | "converted"
  | "cancelled";

export type EstimateActivityType =
  | "estimate_created"
  | "status_changed"
  | "estimate_sent"
  | "estimate_email_resent"
  | "estimate_approved"
  | "estimate_declined"
  | "estimate_cancelled"
  | "estimate_converted";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "cancelled";

export type InvoiceActivityType =
  | "invoice_created"
  | "invoice_sent"
  | "invoice_email_resent"
  | "status_changed"
  | "invoice_converted_from_estimate"
  | "invoice_voided"
  | "invoice_cancelled"
  | "invoice_updated"
  | "payment_recorded"
  | "invoice_paid";

export type ExpensePaymentMethod =
  | "company_card"
  | "personal_card"
  | "cash"
  | "other";

export type PaymentMethod =
  | "cash"
  | "check"
  | "card"
  | "bank_transfer"
  | "other";

export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "reimbursed";

export type ExpenseCategory =
  | "materials"
  | "fuel"
  | "tools"
  | "meals"
  | "lodging"
  | "vehicle"
  | "office"
  | "other";

export type ReceiptStatus = "missing" | "attached" | "pending";

export type ExpenseActivityType =
  | "expense_receipt_uploaded"
  | "expense_created"
  | "expense_submitted"
  | "expense_approved"
  | "expense_rejected"
  | "expense_reimbursed";

export type TimeEntryType = "clock" | "break" | "job_labor";

export type TimeActivityType =
  | "technician_clocked_in"
  | "technician_clocked_out"
  | "break_started"
  | "break_ended"
  | "job_labor_started"
  | "job_labor_ended";

export type NotificationType =
  | "job_assigned"
  | "job_completed"
  | "estimate_approved"
  | "invoice_paid"
  | "expense_submitted"
  | "expense_rejected"
  | "time_clocked_in"
  | "time_clocked_out"
  | "draft_invoice_ready";

export type NotificationEntityType =
  | "job"
  | "customer"
  | "estimate"
  | "invoice"
  | "expense"
  | "time_entry";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Timestamp = string;

export type UUID = string;
