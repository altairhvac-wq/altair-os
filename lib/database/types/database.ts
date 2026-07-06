import type {
  CompanyInsert,
  CompanyMembershipInsert,
  CompanyMembershipRow,
  CompanyMembershipUpdate,
  CompanyRow,
  CompanyUpdate,
  CustomerInsert,
  CustomerRow,
  CustomerUpdate,
  CustomerActivityInsert,
  CustomerActivityRow,
  CustomerEquipmentInsert,
  CustomerEquipmentRow,
  CustomerEquipmentUpdate,
  DispatchAssignmentInsert,
  DispatchAssignmentRow,
  DispatchAssignmentUpdate,
  BillingSignatureInsert,
  BillingSignatureRow,
  BillingSignatureUpdate,
  EstimateApprovalTokenInsert,
  EstimateApprovalTokenRow,
  EstimateApprovalTokenUpdate,
  EstimateActivityInsert,
  EstimateActivityRow,
  EstimateInsert,
  EstimateLineItemInsert,
  EstimateLineItemRow,
  EstimateRow,
  EstimateUpdate,
  ExpenseActivityInsert,
  ExpenseActivityRow,
  ExpenseInsert,
  ExpenseRow,
  ExpenseUpdate,
  InvoiceActivityInsert,
  InvoiceActivityRow,
  InvoiceInsert,
  InvoiceLineItemInsert,
  InvoiceLineItemRow,
  InvoicePaymentInsert,
  InvoicePaymentRow,
  PaymentProviderEventInsert,
  PaymentProviderEventRow,
  PlatformAutomationRunInsert,
  PlatformAutomationRunRow,
  PlatformFounderSignalActionInsert,
  PlatformFounderSignalActionRow,
  CompanyPaymentAccountInsert,
  CompanyPaymentAccountRow,
  InvoicePaymentTokenInsert,
  InvoicePaymentTokenRow,
  InvoicePaymentTokenUpdate,
  InvoiceRow,
  InvoiceUpdate,
  ServiceItemInsert,
  ServiceItemRow,
  ServiceItemUpdate,
  JobInsert,
  JobRow,
  JobUpdate,
  LeadActivityInsert,
  LeadActivityRow,
  LeadInsert,
  LeadRow,
  JobActivityInsert,
  JobActivityRow,
  JobAttachmentInsert,
  JobAttachmentRow,
  JobMaterialInsert,
  JobMaterialRow,
  MembershipActivityInsert,
  MembershipActivityRow,
  ProfileInsert,
  ProfileRow,
  ProfileUpdate,
  TimeActivityInsert,
  TimeActivityRow,
  TimeEntryInsert,
  TimeEntryRow,
  TimeEntryUpdate,
  NotificationInsert,
  NotificationRow,
  NotificationUpdate,
  WorkflowReminderInsert,
  WorkflowReminderRow,
  WorkflowReminderUpdate,
  AlphaTrackerItemInsert,
  AlphaTrackerItemRow,
  AlphaTrackerItemUpdate,
  BetaFeedbackReportInsert,
  BetaFeedbackReportRow,
  TimeClockEntryInsert,
  TimeClockEntryRow,
  TimeClockEntryUpdate,
  NetworkPartnerInsert,
  NetworkPartnerRow,
  NetworkPartnerUpdate,
  NetworkInviteInsert,
  NetworkInviteRow,
  NetworkInviteUpdate,
  NetworkProfileInsert,
  NetworkProfileRow,
  NetworkProfileUpdate,
  NetworkReferralInsert,
  NetworkReferralRow,
  NetworkReferralUpdate,
} from "./core-tables";
import type { Json } from "./enums";

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: CompanyRow;
        Insert: CompanyInsert;
        Update: CompanyUpdate;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [
          {
            foreignKeyName: "profiles_default_company_id_fkey";
            columns: ["default_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_memberships: {
        Row: CompanyMembershipRow;
        Insert: CompanyMembershipInsert;
        Update: CompanyMembershipUpdate;
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_memberships_reports_to_member_id_fkey";
            columns: ["reports_to_member_id"];
            isOneToOne: false;
            referencedRelation: "company_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      alpha_tracker_items: {
        Row: AlphaTrackerItemRow;
        Insert: AlphaTrackerItemInsert;
        Update: AlphaTrackerItemUpdate;
        Relationships: [
          {
            foreignKeyName: "alpha_tracker_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alpha_tracker_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      beta_feedback_reports: {
        Row: BetaFeedbackReportRow;
        Insert: BetaFeedbackReportInsert;
        Update: Partial<BetaFeedbackReportInsert>;
        Relationships: [
          {
            foreignKeyName: "beta_feedback_reports_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_activities: {
        Row: MembershipActivityRow;
        Insert: MembershipActivityInsert;
        Update: Partial<MembershipActivityInsert>;
        Relationships: [
          {
            foreignKeyName: "membership_activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membership_activities_membership_id_fkey";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "company_memberships";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membership_activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: CustomerRow;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_activities: {
        Row: CustomerActivityRow;
        Insert: CustomerActivityInsert;
        Update: Partial<CustomerActivityInsert>;
        Relationships: [
          {
            foreignKeyName: "customer_activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_activities_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_equipment: {
        Row: CustomerEquipmentRow;
        Insert: CustomerEquipmentInsert;
        Update: CustomerEquipmentUpdate;
        Relationships: [
          {
            foreignKeyName: "customer_equipment_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_equipment_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_equipment_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_activities: {
        Row: LeadActivityRow;
        Insert: LeadActivityInsert;
        Update: Partial<LeadActivityInsert>;
        Relationships: [
          {
            foreignKeyName: "lead_activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_activities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: LeadRow;
        Insert: LeadInsert;
        Update: Partial<LeadInsert>;
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_assigned_user_id_fkey";
            columns: ["assigned_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_converted_customer_id_fkey";
            columns: ["converted_customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      network_profiles: {
        Row: NetworkProfileRow;
        Insert: NetworkProfileInsert;
        Update: NetworkProfileUpdate;
        Relationships: [
          {
            foreignKeyName: "network_profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      network_partners: {
        Row: NetworkPartnerRow;
        Insert: NetworkPartnerInsert;
        Update: NetworkPartnerUpdate;
        Relationships: [
          {
            foreignKeyName: "network_partners_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "network_partners_linked_company_id_fkey";
            columns: ["linked_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      network_invites: {
        Row: NetworkInviteRow;
        Insert: NetworkInviteInsert;
        Update: NetworkInviteUpdate;
        Relationships: [
          {
            foreignKeyName: "network_invites_source_company_id_fkey";
            columns: ["source_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "network_invites_source_user_id_fkey";
            columns: ["source_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "network_invites_accepted_company_id_fkey";
            columns: ["accepted_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "network_invites_accepted_user_id_fkey";
            columns: ["accepted_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      network_referrals: {
        Row: NetworkReferralRow;
        Insert: NetworkReferralInsert;
        Update: NetworkReferralUpdate;
        Relationships: [
          {
            foreignKeyName: "network_referrals_source_company_id_fkey";
            columns: ["source_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "network_referrals_target_company_id_fkey";
            columns: ["target_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "network_referrals_source_user_id_fkey";
            columns: ["source_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "network_referrals_target_lead_id_fkey";
            columns: ["target_lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "network_referrals_source_network_profile_id_fkey";
            columns: ["source_network_profile_id"];
            isOneToOne: false;
            referencedRelation: "network_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "network_referrals_target_network_profile_id_fkey";
            columns: ["target_network_profile_id"];
            isOneToOne: false;
            referencedRelation: "network_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: JobRow;
        Insert: JobInsert;
        Update: JobUpdate;
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_assigned_technician_id_fkey";
            columns: ["assigned_technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      dispatch_assignments: {
        Row: DispatchAssignmentRow;
        Insert: DispatchAssignmentInsert;
        Update: DispatchAssignmentUpdate;
        Relationships: [
          {
            foreignKeyName: "dispatch_assignments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dispatch_assignments_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dispatch_assignments_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_activities: {
        Row: JobActivityRow;
        Insert: JobActivityInsert;
        Update: Partial<JobActivityInsert>;
        Relationships: [
          {
            foreignKeyName: "job_activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_activities_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_attachments: {
        Row: JobAttachmentRow;
        Insert: JobAttachmentInsert;
        Update: Partial<JobAttachmentInsert>;
        Relationships: [
          {
            foreignKeyName: "job_attachments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_attachments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_attachments_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_materials: {
        Row: JobMaterialRow;
        Insert: JobMaterialInsert;
        Update: Partial<JobMaterialInsert>;
        Relationships: [
          {
            foreignKeyName: "job_materials_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_materials_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_materials_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_materials_service_item_id_fkey";
            columns: ["service_item_id"];
            isOneToOne: false;
            referencedRelation: "service_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_materials_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: ExpenseRow;
        Insert: ExpenseInsert;
        Update: ExpenseUpdate;
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_activities: {
        Row: ExpenseActivityRow;
        Insert: ExpenseActivityInsert;
        Update: Partial<ExpenseActivityInsert>;
        Relationships: [
          {
            foreignKeyName: "expense_activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_activities_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_signatures: {
        Row: BillingSignatureRow;
        Insert: BillingSignatureInsert;
        Update: BillingSignatureUpdate;
        Relationships: [
          {
            foreignKeyName: "billing_signatures_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "billing_signatures_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      estimates: {
        Row: EstimateRow;
        Insert: EstimateInsert;
        Update: EstimateUpdate;
        Relationships: [
          {
            foreignKeyName: "estimates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimates_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimates_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_line_items: {
        Row: EstimateLineItemRow;
        Insert: EstimateLineItemInsert;
        Update: Partial<EstimateLineItemInsert>;
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_line_items_service_item_id_fkey";
            columns: ["service_item_id"];
            isOneToOne: false;
            referencedRelation: "service_items";
            referencedColumns: ["id"];
          },
        ];
      };
      service_items: {
        Row: ServiceItemRow;
        Insert: ServiceItemInsert;
        Update: ServiceItemUpdate;
        Relationships: [
          {
            foreignKeyName: "service_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_approval_tokens: {
        Row: EstimateApprovalTokenRow;
        Insert: EstimateApprovalTokenInsert;
        Update: EstimateApprovalTokenUpdate;
        Relationships: [
          {
            foreignKeyName: "estimate_approval_tokens_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_approval_tokens_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_approval_tokens_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_activities: {
        Row: EstimateActivityRow;
        Insert: EstimateActivityInsert;
        Update: Partial<EstimateActivityInsert>;
        Relationships: [
          {
            foreignKeyName: "estimate_activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_activities_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: InvoiceRow;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_line_items: {
        Row: InvoiceLineItemRow;
        Insert: InvoiceLineItemInsert;
        Update: Partial<InvoiceLineItemInsert>;
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_line_items_service_item_id_fkey";
            columns: ["service_item_id"];
            isOneToOne: false;
            referencedRelation: "service_items";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_activities: {
        Row: InvoiceActivityRow;
        Insert: InvoiceActivityInsert;
        Update: Partial<InvoiceActivityInsert>;
        Relationships: [
          {
            foreignKeyName: "invoice_activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_activities_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_payments: {
        Row: InvoicePaymentRow;
        Insert: InvoicePaymentInsert;
        Update: Partial<InvoicePaymentInsert>;
        Relationships: [
          {
            foreignKeyName: "invoice_payments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_payments_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_provider_events: {
        Row: PaymentProviderEventRow;
        Insert: PaymentProviderEventInsert;
        Update: Partial<PaymentProviderEventInsert>;
        Relationships: [
          {
            foreignKeyName: "payment_provider_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_automation_runs: {
        Row: PlatformAutomationRunRow;
        Insert: PlatformAutomationRunInsert;
        Update: Partial<PlatformAutomationRunInsert>;
        Relationships: [];
      };
      platform_founder_signal_actions: {
        Row: PlatformFounderSignalActionRow;
        Insert: PlatformFounderSignalActionInsert;
        Update: Partial<PlatformFounderSignalActionInsert>;
        Relationships: [
          {
            foreignKeyName: "platform_founder_signal_actions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_payment_accounts: {
        Row: CompanyPaymentAccountRow;
        Insert: CompanyPaymentAccountInsert;
        Update: Partial<CompanyPaymentAccountInsert>;
        Relationships: [
          {
            foreignKeyName: "company_payment_accounts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_payment_tokens: {
        Row: InvoicePaymentTokenRow;
        Insert: InvoicePaymentTokenInsert;
        Update: InvoicePaymentTokenUpdate;
        Relationships: [
          {
            foreignKeyName: "invoice_payment_tokens_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_payment_tokens_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_payment_tokens_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      time_entries: {
        Row: TimeEntryRow;
        Insert: TimeEntryInsert;
        Update: TimeEntryUpdate;
        Relationships: [
          {
            foreignKeyName: "time_entries_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      time_clock_entries: {
        Row: TimeClockEntryRow;
        Insert: TimeClockEntryInsert;
        Update: TimeClockEntryUpdate;
        Relationships: [
          {
            foreignKeyName: "time_clock_entries_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_clock_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      time_activities: {
        Row: TimeActivityRow;
        Insert: TimeActivityInsert;
        Update: Partial<TimeActivityInsert>;
        Relationships: [
          {
            foreignKeyName: "time_activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_activities_time_entry_id_fkey";
            columns: ["time_entry_id"];
            isOneToOne: false;
            referencedRelation: "time_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_activities_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_activities_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_reminders: {
        Row: WorkflowReminderRow;
        Insert: WorkflowReminderInsert;
        Update: WorkflowReminderUpdate;
        Relationships: [
          {
            foreignKeyName: "workflow_reminders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      bootstrap_company_for_new_user: {
        Args: {
          p_company_name: string;
          p_trade?: string | null;
        };
        Returns: string;
      };
      list_active_member_user_ids_by_roles: {
        Args: {
          p_company_id: string;
          p_roles: CompanyMembershipRow["role"][];
        };
        Returns: string[];
      };
      assign_job_to_technician: {
        Args: {
          p_company_id: string;
          p_job_id: string;
          p_technician_id: string;
        };
        Returns: Json;
      };
      finalize_job_dispatch_assignments: {
        Args: {
          p_company_id: string;
          p_job_id: string;
          p_final_status: DispatchAssignmentRow["status"];
        };
        Returns: undefined;
      };
      generate_expense_number: {
        Args: {
          p_company_id: string;
        };
        Returns: string;
      };
      get_public_estimate_approval_view: {
        Args: {
          p_raw_token: string;
        };
        Returns: Json;
      };
      get_public_invoice_payment_view: {
        Args: {
          p_raw_token: string;
        };
        Returns: Json;
      };
      record_invoice_payment_atomic: {
        Args: {
          p_company_id: string;
          p_invoice_id: string;
          p_amount: number;
          p_payment_method: string;
          p_payment_date: string;
          p_reference?: string | null;
          p_notes?: string | null;
          p_expected_updated_at?: string | null;
          p_idempotency_key?: string | null;
          p_source?: string;
          p_provider?: string | null;
          p_provider_checkout_session_id?: string | null;
          p_provider_payment_id?: string | null;
          p_provider_metadata?: Json;
        };
        Returns: Json;
      };
      get_public_network_invite_preview: {
        Args: {
          p_raw_token: string;
        };
        Returns: Json;
      };
      accept_network_invite: {
        Args: {
          p_raw_token: string;
          p_accepted_company_id: string;
          p_accepted_user_id: string;
          p_signup_email: string;
        };
        Returns: Json;
      };
      accept_incoming_network_invite: {
        Args: {
          p_invite_id: string;
          p_accepted_company_id: string;
        };
        Returns: Json;
      };
      list_incoming_network_invites_for_user: {
        Args: {
          p_active_company_id: string;
        };
        Returns: Json;
      };
      repair_accepted_invite_partner_links_for_company: {
        Args: {
          p_company_id: string;
        };
        Returns: number;
      };
      remove_linked_network_partner: {
        Args: {
          p_company_id: string;
          p_linked_company_id: string;
        };
        Returns: NetworkPartnerRow;
      };
      rotate_network_invite_token: {
        Args: {
          p_invite_id: string;
          p_source_company_id: string;
          p_new_token_hash: string;
        };
        Returns: boolean;
      };
      update_received_network_referral_status: {
        Args: {
          p_referral_id: string;
          p_target_company_id: string;
          p_status: NetworkReferralRow["status"];
          p_decline_reason?: string | null;
        };
        Returns: NetworkReferralRow;
      };
      sync_network_referral_outcome_for_lead: {
        Args: {
          p_lead_id: string;
          p_target_company_id: string;
          p_new_status: Extract<
            NetworkReferralRow["status"],
            "converted" | "won" | "lost"
          >;
        };
        Returns: NetworkReferralRow | null;
      };
      upsert_linked_network_partner: {
        Args: {
          p_company_id: string;
          p_linked_company_id: string;
          p_partner_company_name: string;
          p_trade_type: string;
          p_service_area?: string;
          p_city?: string;
          p_state?: string;
        };
        Returns: NetworkPartnerRow;
      };
      submit_public_estimate_approval: {
        Args: {
          p_raw_token: string;
          p_signer_name: string;
          p_signature_data: string;
          p_authorized: boolean;
        };
        Returns: Json;
      };
      clear_company_demo_data: {
        Args: {
          p_company_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      company_role: CompanyMembershipRow["role"];
      membership_status: CompanyMembershipRow["status"];
      membership_activity_type: MembershipActivityRow["event_type"];
      company_status: CompanyRow["status"];
      customer_status: CustomerRow["status"];
      customer_activity_type: CustomerActivityRow["event_type"];
      job_status: JobRow["status"];
      job_priority: JobRow["priority"];
      dispatch_assignment_status: DispatchAssignmentRow["status"];
      job_activity_type: JobActivityRow["event_type"];
      estimate_status: EstimateRow["status"];
      estimate_activity_type: EstimateActivityRow["event_type"];
      invoice_status: InvoiceRow["status"];
      invoice_activity_type: InvoiceActivityRow["event_type"];
      invoice_payment_method: InvoicePaymentRow["payment_method"];
      expense_status: ExpenseRow["status"];
      expense_category: ExpenseRow["category"];
      expense_payment_method: ExpenseRow["payment_method"];
      receipt_status: ExpenseRow["receipt_status"];
      expense_activity_type: ExpenseActivityRow["event_type"];
      time_entry_type: TimeEntryRow["entry_type"];
      time_activity_type: TimeActivityRow["event_type"];
      notification_type: NotificationRow["type"];
      notification_entity_type: NotificationRow["entity_type"];
      alpha_tracker_type: AlphaTrackerItemRow["type"];
      alpha_tracker_severity: AlphaTrackerItemRow["severity"];
      alpha_tracker_status: AlphaTrackerItemRow["status"];
      alpha_tracker_device: AlphaTrackerItemRow["device"];
      network_referral_urgency: NetworkReferralRow["urgency"];
      network_referral_status: NetworkReferralRow["status"];
      network_invite_status: NetworkInviteRow["status"];
    };
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Replace this file with generated types after running:
 * npx supabase gen types typescript --project-id <id> > lib/database/types/database.ts
 */
