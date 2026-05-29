import type {
  CompanyRole,
  CompanyStatus,
  CustomerActivityType,
  CustomerStatus,
  DispatchAssignmentStatus,
  EstimateActivityType,
  EstimateStatus,
  ExpenseActivityType,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseStatus,
  InvoiceActivityType,
  InvoiceStatus,
  JobActivityType,
  JobPriority,
  JobStatus,
  Json,
  MembershipActivityType,
  MembershipStatus,
  PaymentMethod,
  ReceiptStatus,
  TimeActivityType,
  TimeEntryType,
  NotificationEntityType,
  NotificationType,
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
  user_id: UUID | null;
  role: CompanyRole;
  status: MembershipStatus;
  invite_email: string | null;
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

export type MembershipActivityRow = {
  id: UUID;
  company_id: UUID;
  membership_id: UUID;
  actor_id: UUID | null;
  event_type: MembershipActivityType;
  metadata: Json;
  created_at: Timestamp;
};

export type MembershipActivityInsert = {
  id?: UUID;
  company_id: UUID;
  membership_id: UUID;
  actor_id?: UUID | null;
  event_type: MembershipActivityType;
  metadata?: Json;
  created_at?: Timestamp;
};

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

export type CustomerActivityRow = {
  id: UUID;
  company_id: UUID;
  customer_id: UUID;
  actor_id: UUID | null;
  event_type: CustomerActivityType;
  metadata: Json;
  created_at: Timestamp;
};

export type CustomerActivityInsert = {
  id?: UUID;
  company_id: UUID;
  customer_id: UUID;
  actor_id?: UUID | null;
  event_type: CustomerActivityType;
  metadata?: Json;
  created_at?: Timestamp;
};

export type CustomerEquipmentRow = {
  id: UUID;
  company_id: UUID;
  customer_id: UUID;
  job_id: UUID | null;
  name: string;
  equipment_type: string | null;
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  install_date: string | null;
  warranty_expires_at: string | null;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CustomerEquipmentInsert = {
  id?: UUID;
  company_id: UUID;
  customer_id: UUID;
  job_id?: UUID | null;
  name: string;
  equipment_type?: string | null;
  brand?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  install_date?: string | null;
  warranty_expires_at?: string | null;
  location?: string | null;
  notes?: string | null;
  is_active?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type CustomerEquipmentUpdate = Partial<
  Omit<
    CustomerEquipmentRow,
    "id" | "company_id" | "customer_id" | "created_at" | "updated_at"
  >
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
  arrived_at: Timestamp | null;
  work_started_at: Timestamp | null;
  completed_at: Timestamp | null;
  completion_notes: string | null;
  follow_up_notes: string | null;
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
  arrived_at?: Timestamp | null;
  work_started_at?: Timestamp | null;
  completed_at?: Timestamp | null;
  completion_notes?: string | null;
  follow_up_notes?: string | null;
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

export type JobAttachmentRow = {
  id: UUID;
  company_id: UUID;
  customer_id: UUID | null;
  job_id: UUID;
  uploaded_by: UUID | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  attachment_type: string;
  caption: string | null;
  created_at: Timestamp;
};

export type JobAttachmentInsert = {
  id?: UUID;
  company_id: UUID;
  customer_id?: UUID | null;
  job_id: UUID;
  uploaded_by?: UUID | null;
  file_name: string;
  file_path: string;
  file_type?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  attachment_type?: string;
  caption?: string | null;
  created_at?: Timestamp;
};

export type JobMaterialRow = {
  id: UUID;
  company_id: UUID;
  customer_id: UUID | null;
  job_id: UUID;
  service_item_id: UUID | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_cost: number | null;
  unit_price: number;
  taxable: boolean;
  added_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type JobMaterialInsert = {
  id?: UUID;
  company_id: UUID;
  customer_id?: UUID | null;
  job_id: UUID;
  service_item_id?: UUID | null;
  name: string;
  description?: string | null;
  quantity?: number;
  unit_cost?: number | null;
  unit_price?: number;
  taxable?: boolean;
  added_by?: UUID | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type ExpenseRow = {
  id: UUID;
  company_id: UUID;
  customer_id: UUID | null;
  job_id: UUID | null;
  technician_id: UUID;
  expense_number: string;
  amount: number | null;
  purchase_date: string | null;
  merchant: string;
  category: ExpenseCategory;
  payment_method: ExpensePaymentMethod;
  is_reimbursable: boolean;
  receipt_status: ReceiptStatus;
  receipt_file_name: string | null;
  receipt_storage_path: string | null;
  status: ExpenseStatus;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ExpenseInsert = {
  id?: UUID;
  company_id: UUID;
  customer_id?: UUID | null;
  job_id?: UUID | null;
  technician_id: UUID;
  expense_number: string;
  amount?: number | null;
  purchase_date?: string | null;
  merchant?: string;
  category?: ExpenseCategory;
  payment_method?: ExpensePaymentMethod;
  is_reimbursable?: boolean;
  receipt_status?: ReceiptStatus;
  receipt_file_name?: string | null;
  receipt_storage_path?: string | null;
  status?: ExpenseStatus;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type ExpenseUpdate = Partial<
  Omit<
    ExpenseRow,
    "id" | "company_id" | "technician_id" | "expense_number" | "created_at" | "updated_at"
  >
>;

export type ExpenseActivityRow = {
  id: UUID;
  company_id: UUID;
  expense_id: UUID;
  actor_id: UUID | null;
  event_type: ExpenseActivityType;
  metadata: Json;
  created_at: Timestamp;
};

export type ExpenseActivityInsert = {
  id?: UUID;
  company_id: UUID;
  expense_id: UUID;
  actor_id?: UUID | null;
  event_type: ExpenseActivityType;
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
  category: string | null;
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
  category?: string | null;
  is_active?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type ServiceItemUpdate = Partial<
  Omit<ServiceItemRow, "id" | "company_id" | "created_at" | "updated_at">
>;

export type InvoiceRow = {
  id: UUID;
  company_id: UUID;
  customer_id: UUID;
  job_id: UUID | null;
  estimate_id: UUID | null;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  issue_date: string;
  due_date: string;
  paid_at: Timestamp | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type InvoiceLineItemRow = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID;
  service_item_id: UUID | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  taxable: boolean;
  line_total: number;
  sort_order: number;
  created_at: Timestamp;
};

export type InvoiceInsert = {
  id?: UUID;
  company_id: UUID;
  customer_id: UUID;
  job_id?: UUID | null;
  estimate_id?: UUID | null;
  invoice_number: string;
  status?: InvoiceStatus;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total?: number;
  amount_paid?: number;
  balance_due?: number;
  issue_date?: string;
  due_date: string;
  paid_at?: Timestamp | null;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type InvoiceLineItemInsert = {
  id?: UUID;
  company_id: UUID;
  invoice_id: UUID;
  service_item_id?: UUID | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  taxable?: boolean;
  line_total: number;
  sort_order?: number;
  created_at?: Timestamp;
};

export type InvoiceUpdate = Partial<
  Omit<InvoiceRow, "id" | "company_id" | "created_at" | "updated_at">
>;

export type InvoiceActivityRow = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID;
  actor_id: UUID | null;
  event_type: InvoiceActivityType;
  metadata: Json;
  created_at: Timestamp;
};

export type InvoiceActivityInsert = {
  id?: UUID;
  company_id: UUID;
  invoice_id: UUID;
  actor_id?: UUID | null;
  event_type: InvoiceActivityType;
  metadata?: Json;
  created_at?: Timestamp;
};

export type InvoicePaymentRow = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  recorded_by: UUID | null;
  created_at: Timestamp;
};

export type InvoicePaymentInsert = {
  id?: UUID;
  company_id: UUID;
  invoice_id: UUID;
  amount: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  reference?: string | null;
  notes?: string | null;
  recorded_by?: UUID | null;
  created_at?: Timestamp;
};

export type BillingSignatureEntityType = "estimate" | "invoice";

export type BillingSignatureRow = {
  id: UUID;
  company_id: UUID;
  entity_type: BillingSignatureEntityType;
  entity_id: UUID;
  signer_name: string;
  signer_role: string;
  signature_data: string;
  signed_at: Timestamp;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type BillingSignatureInsert = {
  id?: UUID;
  company_id: UUID;
  entity_type: BillingSignatureEntityType;
  entity_id: UUID;
  signer_name: string;
  signer_role?: string;
  signature_data: string;
  signed_at?: Timestamp;
  created_by?: UUID | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type BillingSignatureUpdate = Partial<
  Omit<BillingSignatureInsert, "company_id" | "entity_type" | "entity_id">
>;

export type EstimateApprovalTokenRow = {
  id: UUID;
  company_id: UUID;
  estimate_id: UUID;
  token_hash: string;
  customer_email: string;
  expires_at: Timestamp;
  used_at: Timestamp | null;
  revoked_at: Timestamp | null;
  created_by: UUID | null;
  created_at: Timestamp;
};

export type EstimateApprovalTokenInsert = {
  id?: UUID;
  company_id: UUID;
  estimate_id: UUID;
  token_hash: string;
  customer_email: string;
  expires_at: Timestamp;
  used_at?: Timestamp | null;
  revoked_at?: Timestamp | null;
  created_by?: UUID | null;
  created_at?: Timestamp;
};

export type EstimateApprovalTokenUpdate = Partial<
  Omit<
    EstimateApprovalTokenInsert,
    "company_id" | "estimate_id" | "token_hash"
  >
>;

export type InvoicePaymentTokenRow = {
  id: UUID;
  company_id: UUID;
  invoice_id: UUID;
  token_hash: string;
  customer_email: string;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  created_by: UUID | null;
  created_at: Timestamp;
};

export type InvoicePaymentTokenInsert = {
  id?: UUID;
  company_id: UUID;
  invoice_id: UUID;
  token_hash: string;
  customer_email: string;
  expires_at: Timestamp;
  revoked_at?: Timestamp | null;
  created_by?: UUID | null;
  created_at?: Timestamp;
};

export type InvoicePaymentTokenUpdate = Partial<
  Omit<
    InvoicePaymentTokenInsert,
    "company_id" | "invoice_id" | "token_hash"
  >
>;

export type TimeEntryRow = {
  id: UUID;
  company_id: UUID;
  technician_id: UUID;
  job_id: UUID | null;
  entry_type: TimeEntryType;
  started_at: Timestamp;
  ended_at: Timestamp | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type TimeEntryInsert = {
  id?: UUID;
  company_id: UUID;
  technician_id: UUID;
  job_id?: UUID | null;
  entry_type: TimeEntryType;
  started_at?: Timestamp;
  ended_at?: Timestamp | null;
  duration_minutes?: number | null;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type TimeEntryUpdate = Partial<
  Omit<TimeEntryRow, "id" | "company_id" | "technician_id" | "created_at">
>;

export type TimeActivityRow = {
  id: UUID;
  company_id: UUID;
  time_entry_id: UUID;
  technician_id: UUID;
  job_id: UUID | null;
  actor_id: UUID | null;
  event_type: TimeActivityType;
  metadata: Json;
  created_at: Timestamp;
};

export type TimeActivityInsert = {
  id?: UUID;
  company_id: UUID;
  time_entry_id: UUID;
  technician_id: UUID;
  job_id?: UUID | null;
  actor_id?: UUID | null;
  event_type: TimeActivityType;
  metadata?: Json;
  created_at?: Timestamp;
};

export type NotificationRow = {
  id: UUID;
  company_id: UUID;
  user_id: UUID | null;
  role_target: CompanyRole | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: NotificationEntityType | null;
  entity_id: UUID | null;
  read_at: Timestamp | null;
  metadata: Json;
  created_at: Timestamp;
};

export type NotificationInsert = {
  id?: UUID;
  company_id: UUID;
  user_id?: UUID | null;
  role_target?: CompanyRole | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: NotificationEntityType | null;
  entity_id?: UUID | null;
  read_at?: Timestamp | null;
  metadata?: Json;
  created_at?: Timestamp;
};

export type NotificationUpdate = Partial<
  Pick<NotificationRow, "read_at">
>;

export type AlphaTrackerType =
  | "bug"
  | "feature"
  | "polish"
  | "unfinished";

export type AlphaTrackerSeverity = "critical" | "high" | "medium" | "low";

export type AlphaTrackerStatus =
  | "open"
  | "in_progress"
  | "fixed"
  | "deferred";

export type AlphaTrackerDevice = "desktop" | "mobile" | "both";

export type AlphaTrackerItemRow = {
  id: UUID;
  company_id: UUID;
  title: string;
  description: string | null;
  type: AlphaTrackerType;
  severity: AlphaTrackerSeverity;
  status: AlphaTrackerStatus;
  page_or_area: string | null;
  device: AlphaTrackerDevice;
  notes: string | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AlphaTrackerItemInsert = {
  id?: UUID;
  company_id: UUID;
  title: string;
  description?: string | null;
  type?: AlphaTrackerType;
  severity?: AlphaTrackerSeverity;
  status?: AlphaTrackerStatus;
  page_or_area?: string | null;
  device?: AlphaTrackerDevice;
  notes?: string | null;
  created_by?: UUID | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type AlphaTrackerItemUpdate = Partial<
  Omit<
    AlphaTrackerItemRow,
    "id" | "company_id" | "created_by" | "created_at" | "updated_at"
  >
>;

export type TimeClockShiftStatus = "open" | "closed";

export type TimeClockEntryRow = {
  id: UUID;
  company_id: UUID;
  user_id: UUID;
  clock_in_at: Timestamp;
  clock_out_at: Timestamp | null;
  status: TimeClockShiftStatus;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type TimeClockEntryInsert = {
  id?: UUID;
  company_id: UUID;
  user_id: UUID;
  clock_in_at?: Timestamp;
  clock_out_at?: Timestamp | null;
  status?: TimeClockShiftStatus;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type TimeClockEntryUpdate = Partial<
  Omit<TimeClockEntryRow, "id" | "company_id" | "user_id" | "created_at">
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
