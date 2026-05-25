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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Timestamp = string;

export type UUID = string;
