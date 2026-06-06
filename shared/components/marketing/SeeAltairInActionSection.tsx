import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  FileCheck,
  Receipt,
  Smartphone,
  Users,
} from "lucide-react";
import { ProductScreenshotPlaceholder } from "@/shared/components/marketing/ProductScreenshotPlaceholder";

export type ShowcaseItem = {
  id: string;
  headline: string;
  description: string;
  badge?: string;
  imageAlt: string;
  imageLabel: string;
  imageSrc?: string;
  icon: LucideIcon;
};

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: "dispatch",
    headline: "Dispatch Command Center",
    description:
      "See your day's jobs, crew assignments, and schedule changes in one place. Drag, assign, and adjust without jumping between tools — everything stays linked to the customer and job record.",
    badge: "Connected scheduling",
    imageAlt: "Altair OS dispatch command center showing daily schedule and crew assignments",
    imageLabel: "Dispatch Command Center",
    icon: CalendarClock,
  },
  {
    id: "customer-360",
    headline: "Customer 360",
    description:
      "Open any account and see contact details, service history, equipment, estimates, and invoices together. Your team gets the full picture before they pick up the phone or roll a truck.",
    badge: "Single customer view",
    imageAlt: "Altair OS Customer 360 view with service history and account details",
    imageLabel: "Customer 360",
    icon: Users,
  },
  {
    id: "technician-mobile",
    headline: "Technician Mobile App",
    description:
      "Technicians view assigned jobs, update status, capture notes, and complete work from their phone. Office and field stay in sync so nothing gets lost between the shop and the job site.",
    badge: "Field-ready workflows",
    imageAlt: "Altair OS technician mobile app with job details and status updates",
    imageLabel: "Technician Mobile App",
    icon: Smartphone,
  },
  {
    id: "estimates",
    headline: "Estimates & Approvals",
    description:
      "Build estimates in the platform and send them for customer review without extra steps. Approved work flows directly into scheduling and invoicing so your pipeline stays connected.",
    badge: "Customer approvals built in",
    imageAlt: "Altair OS estimates and customer approval workflow",
    imageLabel: "Estimates & Approvals",
    icon: FileCheck,
  },
  {
    id: "invoicing",
    headline: "Invoicing & Payments",
    description:
      "Turn completed jobs into invoices and collect payment through linked customer workflows. Less re-entry, fewer handoffs, and a clearer path from work done to cash collected.",
    badge: "End-to-end billing",
    imageAlt: "Altair OS invoicing and payment collection interface",
    imageLabel: "Invoicing & Payments",
    icon: Receipt,
  },
  {
    id: "reporting",
    headline: "Reporting & Business Insights",
    description:
      "Track revenue, job activity, and team performance from dashboards designed for service businesses. See what matters without exporting spreadsheets or building reports from scratch.",
    badge: "Operations at a glance",
    imageAlt: "Altair OS reporting dashboards and business insights",
    imageLabel: "Reporting & Business Insights",
    icon: BarChart3,
  },
];

type SeeAltairInActionSectionProps = {
  variant?: "dark" | "light";
  compact?: boolean;
  className?: string;
};

function ShowcaseRow({
  item,
  index,
  variant,
  compact,
}: {
  item: ShowcaseItem;
  index: number;
  variant: "dark" | "light";
  compact?: boolean;
}) {
  const isEven = index % 2 === 1;
  const isDark = variant === "dark";

  return (
    <article
      className={[
        "group/row flex flex-col gap-4 sm:gap-5",
        isEven ? "flex-col-reverse lg:flex-row-reverse" : "lg:flex-row",
        compact ? "lg:gap-6" : "lg:items-center lg:gap-10",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <ProductScreenshotPlaceholder
          alt={item.imageAlt}
          label={item.imageLabel}
          src={item.imageSrc}
        />
      </div>

      <div className={["min-w-0 flex-1", compact ? "lg:max-w-none" : "lg:max-w-md xl:max-w-lg"].join(" ")}>
        {item.badge ? (
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200",
              isDark
                ? "border-[#D4AF37]/28 bg-[#D4AF37]/8 text-[#D4AF37]/90 motion-safe:transition-colors motion-safe:duration-200 group-hover/row:border-[#D4AF37]/40 group-hover/row:bg-[#D4AF37]/12"
                : "border-[#D4AF37]/30 bg-[#FFFCF8] text-[#9A7209] motion-safe:transition-colors motion-safe:duration-200 group-hover/row:border-[#D4AF37]/45 group-hover/row:bg-[#FAF7F0]",
            ].join(" ")}
          >
            <item.icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
            {item.badge}
          </span>
        ) : null}

        <h3
          className={[
            "font-semibold tracking-tight",
            item.badge ? "mt-3" : "",
            compact ? "text-base sm:text-lg" : "text-lg sm:text-xl",
            isDark ? "text-white" : "text-[#0A0A0A]",
          ].join(" ")}
        >
          {item.headline}
        </h3>

        <p
          className={[
            "mt-2 leading-relaxed",
            compact ? "text-sm" : "text-sm sm:text-[15px]",
            isDark ? "text-neutral-400" : "text-stone-600",
          ].join(" ")}
        >
          {item.description}
        </p>
      </div>
    </article>
  );
}

export function SeeAltairInActionSection({
  variant = "dark",
  compact = false,
  className = "",
}: SeeAltairInActionSectionProps) {
  const isDark = variant === "dark";

  return (
    <section
      aria-labelledby="see-altair-in-action-heading"
      className={["auth-hero-enter", className].join(" ")}
    >
      <div className={compact ? "mb-5" : "mb-6 sm:mb-8"}>
        <p
          className={[
            "text-[11px] font-semibold uppercase tracking-[0.16em]",
            isDark ? "text-[#D4AF37]/90" : "text-[#9A7209]",
          ].join(" ")}
        >
          Product tour
        </p>
        <h2
          id="see-altair-in-action-heading"
          className={[
            "mt-2 font-semibold tracking-tight",
            compact ? "text-lg" : "text-xl sm:text-2xl",
            isDark ? "text-white" : "text-[#0A0A0A]",
          ].join(" ")}
        >
          See Altair OS in Action
        </h2>
        <p
          className={[
            "mt-2 max-w-2xl leading-relaxed",
            compact ? "text-sm" : "text-sm sm:text-[15px]",
            isDark ? "text-neutral-400" : "text-stone-600",
          ].join(" ")}
        >
          A connected platform built for speed and simplicity — from the dispatch
          board to the field and back to your books.
        </p>
      </div>

      <div className={compact ? "flex flex-col gap-8" : "flex flex-col gap-10 sm:gap-12 lg:gap-14"}>
        {SHOWCASE_ITEMS.map((item, index) => (
          <ShowcaseRow
            key={item.id}
            item={item}
            index={index}
            variant={variant}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}
