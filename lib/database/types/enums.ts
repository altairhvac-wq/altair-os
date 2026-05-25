export type CompanyRole =
  | "owner"
  | "admin"
  | "dispatcher"
  | "technician"
  | "office_staff"
  | "subcontractor"
  | "customer";

export type MembershipStatus = "active" | "invited" | "suspended";

export type CompanyStatus = "active" | "trial" | "suspended";

export type CustomerStatus = "active" | "inactive" | "lead";

export type CustomerActivityType = "customer_created";

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
  | "start_route"
  | "start_work"
  | "complete_job"
  | "technician_arrived"
  | "work_started"
  | "work_completed"
  | "status_changed"
  | "job_cancelled";

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
  | "status_changed"
  | "invoice_converted_from_estimate"
  | "invoice_voided"
  | "invoice_cancelled"
  | "payment_recorded"
  | "invoice_paid";

export type PaymentMethod =
  | "cash"
  | "check"
  | "card"
  | "bank_transfer"
  | "other";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Timestamp = string;

export type UUID = string;
