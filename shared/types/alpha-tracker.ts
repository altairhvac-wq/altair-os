export type AlphaTrackerType = "bug" | "feature" | "polish" | "unfinished";

export type AlphaTrackerSeverity = "critical" | "high" | "medium" | "low";

export type AlphaTrackerStatus = "open" | "in_progress" | "fixed" | "deferred";

export type AlphaTrackerDevice = "desktop" | "mobile" | "both";

export type AlphaTrackerItem = {
  id: string;
  title: string;
  description?: string;
  type: AlphaTrackerType;
  severity: AlphaTrackerSeverity;
  status: AlphaTrackerStatus;
  pageOrArea?: string;
  device: AlphaTrackerDevice;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type AlphaTrackerItemFormData = {
  title: string;
  description: string;
  type: AlphaTrackerType;
  severity: AlphaTrackerSeverity;
  pageOrArea: string;
  device: AlphaTrackerDevice;
  notes: string;
};

export type AlphaTrackerItemEditFormData = AlphaTrackerItemFormData & {
  status: AlphaTrackerStatus;
};

export const ALPHA_TRACKER_TYPE_OPTIONS: {
  value: AlphaTrackerType;
  label: string;
}[] = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "polish", label: "Polish" },
  { value: "unfinished", label: "Unfinished" },
];

export const ALPHA_TRACKER_SEVERITY_OPTIONS: {
  value: AlphaTrackerSeverity;
  label: string;
}[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const ALPHA_TRACKER_STATUS_OPTIONS: {
  value: AlphaTrackerStatus;
  label: string;
}[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "fixed", label: "Fixed" },
  { value: "deferred", label: "Deferred" },
];

export const ALPHA_TRACKER_DEVICE_OPTIONS: {
  value: AlphaTrackerDevice;
  label: string;
}[] = [
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
  { value: "both", label: "Both" },
];

export const ALPHA_TRACKER_TYPE_FILTER_OPTIONS: {
  value: AlphaTrackerType | "all";
  label: string;
}[] = [{ value: "all", label: "All types" }, ...ALPHA_TRACKER_TYPE_OPTIONS];

export const ALPHA_TRACKER_SEVERITY_FILTER_OPTIONS: {
  value: AlphaTrackerSeverity | "all";
  label: string;
}[] = [
  { value: "all", label: "All severities" },
  ...ALPHA_TRACKER_SEVERITY_OPTIONS,
];

export const ALPHA_TRACKER_STATUS_FILTER_OPTIONS: {
  value: AlphaTrackerStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  ...ALPHA_TRACKER_STATUS_OPTIONS,
];
