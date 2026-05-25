import type {
  CompanyRole,
  CompanyStatus,
  Json,
  MembershipStatus,
  Timestamp,
  UUID,
} from "./enums";

export type CompanyRow = {
  id: UUID;
  name: string;
  slug: string;
  status: CompanyStatus;
  timezone: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  settings: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ProfileRow = {
  id: UUID;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  default_company_id: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CompanyMembershipRow = {
  id: UUID;
  company_id: UUID;
  user_id: UUID;
  role: CompanyRole;
  status: MembershipStatus;
  invited_by: UUID | null;
  invited_at: Timestamp | null;
  joined_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CompanyInsert = Omit<
  CompanyRow,
  "id" | "created_at" | "updated_at"
> & {
  id?: UUID;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type ProfileInsert = Omit<
  ProfileRow,
  "created_at" | "updated_at"
> & {
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type CompanyMembershipInsert = Omit<
  CompanyMembershipRow,
  "id" | "created_at" | "updated_at"
> & {
  id?: UUID;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type CompanyUpdate = Partial<
  Omit<CompanyRow, "id" | "created_at" | "updated_at">
>;

export type ProfileUpdate = Partial<
  Omit<ProfileRow, "id" | "created_at" | "updated_at">
>;

export type CompanyMembershipUpdate = Partial<
  Omit<CompanyMembershipRow, "id" | "created_at" | "updated_at">
>;

export type MembershipWithCompany = CompanyMembershipRow & {
  company: CompanyRow;
};

export type MembershipWithProfile = CompanyMembershipRow & {
  profile: ProfileRow;
};

export type UserCompanyContext = {
  profile: ProfileRow;
  membership: CompanyMembershipRow;
  company: CompanyRow;
};
