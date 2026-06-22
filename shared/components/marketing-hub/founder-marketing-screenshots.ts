export type FounderMarketingScreenshotOption = {
  id: string;
  label: string;
  path: string;
};

/** Curated Altair OS product screenshots from public/marketing/screenshots/ (social-ready assets in social/). */
export const FOUNDER_MARKETING_SCREENSHOT_OPTIONS: FounderMarketingScreenshotOption[] =
  [
    {
      id: "dispatch",
      label: "Dispatch command center",
      path: "/marketing/screenshots/marketing-dispatch.png",
    },
    {
      id: "customers",
      label: "Customer 360",
      path: "/marketing/screenshots/marketing-customers.png",
    },
    {
      id: "leads",
      label: "Leads workspace",
      path: "/marketing/screenshots/social/leads-workspace.png",
    },
    {
      id: "expenses",
      label: "Technician mobile / expenses",
      path: "/marketing/screenshots/marketing-expenses.png",
    },
    {
      id: "estimate",
      label: "Estimates & approvals",
      path: "/marketing/screenshots/marketing-estimate.png",
    },
    {
      id: "pricebook",
      label: "Invoicing & pricebook",
      path: "/marketing/screenshots/marketing-pricebook.png",
    },
    {
      id: "reports",
      label: "Reports workspace",
      path: "/marketing/screenshots/social/reports-workspace.png",
    },
  ];

export function isFounderMarketingScreenshotPath(value: string): boolean {
  return FOUNDER_MARKETING_SCREENSHOT_OPTIONS.some(
    (option) => option.path === value,
  );
}

export function isPreviewableScreenshotReference(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("/")) {
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed);
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
