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

export type JobStatus =
  | "scheduled"
  | "dispatched"
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Timestamp = string;

export type UUID = string;
