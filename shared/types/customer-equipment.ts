export type CustomerEquipment = {
  id: string;
  customerId: string;
  jobId?: string;
  name: string;
  equipmentType?: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  installDate?: string;
  warrantyExpiresAt?: string;
  location?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerEquipmentFormData = {
  name: string;
  equipmentType: string;
  brand: string;
  modelNumber: string;
  serialNumber: string;
  installDate: string;
  warrantyExpiresAt: string;
  location: string;
  notes: string;
  isActive: boolean;
};

export const EMPTY_CUSTOMER_EQUIPMENT_FORM: CustomerEquipmentFormData = {
  name: "",
  equipmentType: "",
  brand: "",
  modelNumber: "",
  serialNumber: "",
  installDate: "",
  warrantyExpiresAt: "",
  location: "",
  notes: "",
  isActive: true,
};

export function mapCustomerEquipmentToFormData(
  equipment: CustomerEquipment,
): CustomerEquipmentFormData {
  return {
    name: equipment.name,
    equipmentType: equipment.equipmentType ?? "",
    brand: equipment.brand ?? "",
    modelNumber: equipment.modelNumber ?? "",
    serialNumber: equipment.serialNumber ?? "",
    installDate: equipment.installDate ?? "",
    warrantyExpiresAt: equipment.warrantyExpiresAt ?? "",
    location: equipment.location ?? "",
    notes: equipment.notes ?? "",
    isActive: equipment.isActive,
  };
}

export function formatEquipmentDate(date: string | undefined): string {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

export type WarrantyStatus = "none" | "active" | "expiring" | "expired";

export function getWarrantyStatus(
  warrantyExpiresAt: string | undefined,
): WarrantyStatus {
  if (!warrantyExpiresAt) {
    return "none";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${warrantyExpiresAt}T00:00:00.000Z`);
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilExpiry < 0) {
    return "expired";
  }

  if (daysUntilExpiry <= 90) {
    return "expiring";
  }

  return "active";
}

export function formatWarrantyStatus(status: WarrantyStatus): string {
  switch (status) {
    case "active":
      return "Under warranty";
    case "expiring":
      return "Warranty expiring soon";
    case "expired":
      return "Warranty expired";
    default:
      return "No warranty on file";
  }
}

export function getWarrantyStatusStyles(status: WarrantyStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/15";
    case "expiring":
      return "bg-amber-50 text-amber-700 ring-amber-600/15";
    case "expired":
      return "bg-rose-50 text-rose-700 ring-rose-600/15";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/15";
  }
}

export function validateCustomerEquipmentFormData(
  data: CustomerEquipmentFormData,
): string | null {
  if (!data.name.trim()) {
    return "Equipment name is required.";
  }

  if (data.installDate && data.warrantyExpiresAt) {
    if (data.warrantyExpiresAt < data.installDate) {
      return "Warranty expiration must be on or after the install date.";
    }
  }

  return null;
}
