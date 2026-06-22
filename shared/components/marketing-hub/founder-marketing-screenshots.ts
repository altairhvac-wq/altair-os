export type FounderMarketingScreenshotOption = {
  id: string;
  label: string;
  path: string;
};

/** Curated Altair OS product screenshots from public/marketing/screenshots/ (social-ready assets in social/). */
export const FOUNDER_MARKETING_SCREENSHOT_OPTIONS: FounderMarketingScreenshotOption[] =
  [
    {
      id: "reports",
      label: "Reports workspace",
      path: "/marketing/screenshots/social/reports-full-page.png",
    },
    {
      id: "leads",
      label: "Leads workspace",
      path: "/marketing/screenshots/social/leads-full-page.png",
    },
    {
      id: "marketing",
      label: "Marketing Hub workspace",
      path: "/marketing/screenshots/social/marketing-full-page.png",
    },
    {
      id: "customers",
      label: "Customers workspace",
      path: "/marketing/screenshots/social/customers-full-page.png",
    },
    {
      id: "jobs",
      label: "Jobs workspace",
      path: "/marketing/screenshots/social/jobs-full-page.png",
    },
    {
      id: "estimates",
      label: "Estimates workspace",
      path: "/marketing/screenshots/social/estimates-full-page.png",
    },
    {
      id: "invoices",
      label: "Invoices workspace",
      path: "/marketing/screenshots/social/invoices-full-page.png",
    },
    {
      id: "dispatch",
      label: "Dispatch workspace",
      path: "/marketing/screenshots/social/dispatch-full-page.png",
    },
    {
      id: "expenses",
      label: "Expenses workspace",
      path: "/marketing/screenshots/social/expenses-full-page.png",
    },
    {
      id: "pricebook",
      label: "Price Book workspace",
      path: "/marketing/screenshots/social/pricebook-full-page.png",
    },
    {
      id: "network",
      label: "Network workspace",
      path: "/marketing/screenshots/social/network-full-page.png",
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
