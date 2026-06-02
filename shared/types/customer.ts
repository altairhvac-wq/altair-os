import { formatDateInTimeZone } from "@/shared/lib/datetime";

export type CustomerStatus = "active" | "inactive" | "lead";

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: CustomerStatus;
  address: string;
  city: string;
  state: string;
  zip: string;
  totalJobs: number;
  totalRevenue: number;
  lastServiceDate?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  archivedAt?: string;
};

export type CustomerLifecycleState = "active" | "archived";

export type CustomerFormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: CustomerStatus;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
};

export const CUSTOMER_STATUS_OPTIONS: { value: CustomerStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "lead", label: "Lead" },
  { value: "inactive", label: "Inactive" },
];

export const CUSTOMER_LIFECYCLE_FILTER_OPTIONS: {
  value: CustomerLifecycleState;
  label: string;
}[] = [
  { value: "active", label: "Active customers" },
  { value: "archived", label: "Archived" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeCustomerFormData(
  data: CustomerFormData,
): CustomerFormData {
  return {
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    company: data.company.trim(),
    status: data.status,
    address: data.address.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    zip: data.zip.trim(),
    notes: data.notes.trim(),
  };
}

export function validateCustomerFormData(
  data: CustomerFormData,
  options?: {
    requireContact?: boolean;
    requireAddress?: boolean;
  },
): string | null {
  const normalized = normalizeCustomerFormData(data);
  const requireContact = options?.requireContact ?? true;
  const requireAddress = options?.requireAddress ?? true;

  if (!normalized.name) {
    return "Customer name is required.";
  }

  if (normalized.email && !EMAIL_PATTERN.test(normalized.email)) {
    return "Enter a valid email address.";
  }

  if (requireContact) {
    if (!normalized.email) {
      return "Email is required.";
    }
    if (!normalized.phone) {
      return "Phone is required.";
    }
  }

  if (requireAddress) {
    if (!normalized.address) {
      return "Street address is required.";
    }
    if (!normalized.city) {
      return "City is required.";
    }
    if (!normalized.state) {
      return "State is required.";
    }
    if (!normalized.zip) {
      return "ZIP code is required.";
    }
  }

  return null;
}

export function mapCustomerToFormData(customer: Customer): CustomerFormData {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company ?? "",
    status: customer.status,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    notes: customer.notes ?? "",
  };
}

export function getCustomerInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatCurrency(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function formatDate(
  date: string,
  timeZone?: string,
): string {
  return formatDateInTimeZone(date, timeZone);
}
