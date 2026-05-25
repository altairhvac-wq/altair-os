import type {
  CompanyInsert,
  CompanyMembershipInsert,
  CompanyMembershipRow,
  CompanyMembershipUpdate,
  CompanyRow,
  CompanyUpdate,
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
    };
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Replace this file with generated types after running:
 * npx supabase gen types typescript --project-id <id> > lib/database/types/database.ts
 */
