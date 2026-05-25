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
  DispatchAssignmentInsert,
  DispatchAssignmentRow,
  DispatchAssignmentUpdate,
  JobInsert,
  JobRow,
  JobUpdate,
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
      job_status: JobRow["status"];
      job_priority: JobRow["priority"];
      dispatch_assignment_status: DispatchAssignmentRow["status"];
    };
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Replace this file with generated types after running:
 * npx supabase gen types typescript --project-id <id> > lib/database/types/database.ts
 */
