import type {
  CompanyRole,
  CompanyStatus,
  CustomerStatus,
  DispatchAssignmentStatus,
  EstimateActivityType,
  EstimateStatus,
  JobActivityType,
  JobPriority,
  JobStatus,
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

export type ProfileInsert = {
  id: UUID;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  default_company_id?: UUID | null;
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

export type CustomerRow = {
  id: UUID;
  company_id: UUID;
  name: string;
  email: string;
  phone: string;
  company_name: string | null;
  status: CustomerStatus;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  tags: string[];
  notes: string | null;
  total_jobs: number;
  total_revenue: number;
  last_service_date: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CustomerInsert = {
  id?: UUID;
  company_id: UUID;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string | null;
  status?: CustomerStatus;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  tags?: string[];
  notes?: string | null;
  total_jobs?: number;
  total_revenue?: number;
  last_service_date?: Timestamp | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type CustomerUpdate = Partial<
  Omit<CustomerRow, "id" | "company_id" | "created_at" | "updated_at">
>;

export type JobRow = {
  id: UUID;
  company_id: UUID;
  customer_id: UUID;
  job_number: string;
  service_address: string;
  city: string;
  state: string;
  postal_code: string;
  job_type: string;
  scheduled_at: Timestamp;
  status: JobStatus;
  priority: JobPriority;
  description: string | null;
  notes: string | null;
  assigned_technician_id: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type JobInsert = {
  id?: UUID;
  company_id: UUID;
  customer_id: UUID;
  job_number: string;
  service_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  job_type?: string;
  scheduled_at: Timestamp;
  status?: JobStatus;
  priority?: JobPriority;
  description?: string | null;
  notes?: string | null;
  assigned_technician_id?: UUID | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type JobUpdate = Partial<
  Omit<JobRow, "id" | "company_id" | "created_at" | "updated_at">
>;

export type DispatchAssignmentRow = {
  id: UUID;
  company_id: UUID;
  job_id: UUID;
  technician_id: UUID;
  assigned_by: UUID | null;
  status: DispatchAssignmentStatus;
  scheduled_start: Timestamp;
  scheduled_end: Timestamp | null;
  assigned_at: Timestamp;
  unassigned_at: Timestamp | null;
  sort_order: number;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type DispatchAssignmentInsert = {
  id?: UUID;
  company_id: UUID;
  job_id: UUID;
  technician_id: UUID;
  assigned_by?: UUID | null;
  status?: DispatchAssignmentStatus;
  scheduled_start: Timestamp;
  scheduled_end?: Timestamp | null;
  assigned_at?: Timestamp;
  unassigned_at?: Timestamp | null;
  sort_order?: number;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type DispatchAssignmentUpdate = Partial<
  Omit<
    DispatchAssignmentRow,
    "id" | "company_id" | "job_id" | "created_at" | "updated_at"
  >
>;

export type JobActivityRow = {
  id: UUID;
  company_id: UUID;
  job_id: UUID;
  actor_id: UUID | null;
  event_type: JobActivityType;
  metadata: Json;
  created_at: Timestamp;
};

export type JobActivityInsert = {
  id?: UUID;
  company_id: UUID;
  job_id: UUID;
  actor_id?: UUID | null;
  event_type: JobActivityType;
  metadata?: Json;
  created_at?: Timestamp;
};

export type EstimateRow = {
  id: UUID;
  company_id: UUID;
  customer_id: UUID;
  job_id: UUID | null;
  estimate_number: string;
  status: EstimateStatus;
  subtotal: number;
  tax_rate: number;
  tax: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type EstimateLineItemRow = {
  id: UUID;
  company_id: UUID;
  estimate_id: UUID;
  service_item_id: UUID | null;
  sort_order: number;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  taxable: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type EstimateInsert = {
  id?: UUID;
  company_id: UUID;
  customer_id: UUID;
  job_id?: UUID | null;
  estimate_number: string;
  status?: EstimateStatus;
  subtotal?: number;
  tax_rate?: number;
  tax?: number;
  total?: number;
  valid_until?: string | null;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type EstimateLineItemInsert = {
  id?: UUID;
  company_id: UUID;
  estimate_id: UUID;
  service_item_id?: UUID | null;
  sort_order?: number;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  taxable?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type EstimateUpdate = Partial<
  Omit<EstimateRow, "id" | "company_id" | "created_at" | "updated_at">
>;

export type EstimateActivityRow = {
  id: UUID;
  company_id: UUID;
  estimate_id: UUID;
  actor_id: UUID | null;
  event_type: EstimateActivityType;
  metadata: Json;
  created_at: Timestamp;
};

export type EstimateActivityInsert = {
  id?: UUID;
  company_id: UUID;
  estimate_id: UUID;
  actor_id?: UUID | null;
  event_type: EstimateActivityType;
  metadata?: Json;
  created_at?: Timestamp;
};

export type ServiceItemRow = {
  id: UUID;
  company_id: UUID;
  name: string;
  description: string | null;
  unit_price: number;
  taxable: boolean;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ServiceItemInsert = {
  id?: UUID;
  company_id: UUID;
  name: string;
  description?: string | null;
  unit_price?: number;
  taxable?: boolean;
  is_active?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type ServiceItemUpdate = Partial<
  Omit<ServiceItemRow, "id" | "company_id" | "created_at" | "updated_at">
>;

export type ActiveCompanyContext = UserCompanyContext & {
  user: {
    id: UUID;
    email: string | undefined;
  };
  role: CompanyRole;
  permissions: Record<
    | "manageCompany"
    | "manageUsers"
    | "dispatchJobs"
    | "manageCustomers"
    | "viewAssignedJobs"
    | "manageBilling",
    boolean
  >;
};
