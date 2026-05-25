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
  DispatchAssignmentInsert,
  DispatchAssignmentRow,
  DispatchAssignmentUpdate,
  EstimateActivityInsert,
  EstimateActivityRow,
  EstimateInsert,
  EstimateLineItemInsert,
  EstimateLineItemRow,
  EstimateRow,
  EstimateUpdate,
  InvoiceActivityInsert,
  InvoiceActivityRow,
  InvoiceInsert,
  InvoiceLineItemInsert,
  InvoiceLineItemRow,
  InvoicePaymentInsert,
  InvoicePaymentRow,
  InvoiceRow,
  InvoiceUpdate,
  ServiceItemInsert,
  ServiceItemRow,
  ServiceItemUpdate,
  JobInsert,
  JobRow,
  JobUpdate,
  JobActivityInsert,
  JobActivityRow,
  ProfileInsert,
  ProfileRow,
  ProfileUpdate,
} from "./core-tables";

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
            foreignKeyName: "company_memberships_user_id_fkey";
            columns: ["user_id"];
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
    };
    Views: Record<string, never>;
    Functions: {
      bootstrap_company_for_new_user: {
        Args: {
          p_company_name: string;
        };
        Returns: string;
      };
    };
    Enums: {
      company_role: CompanyMembershipRow["role"];
      membership_status: CompanyMembershipRow["status"];
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
    };
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Replace this file with generated types after running:
 * npx supabase gen types typescript --project-id <id> > lib/database/types/database.ts
 */
