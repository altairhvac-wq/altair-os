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
};

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

export function getCustomerInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
