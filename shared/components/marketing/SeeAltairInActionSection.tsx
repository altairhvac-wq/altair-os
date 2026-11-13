import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  FileCheck,
  Receipt,
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
  /** 4:3 crop of the same screen, shown at phone widths. */
  imageSrcMobile?: string;
  icon: LucideIcon;
};

/**
 * The product tour on /pricing.
 *
 * ============ WHERE THE PICTURES COME FROM ============
 * Each screenshot is the real product, signed in to the sample company on the
 * scratch database ("Wasatch Valley Mechanical"), captured on 2026-11-12. The
 * sample data uses realistic Utah street addresses and email domains, so the
 * capture replaces them in the page with obviously made-up ones ("100 Sample
 * St", "@example.com") before the shot. Nothing here is a real customer.
 *
 * The five pictures this replaced were captured from a working company in
 * June and August 2026 and showed test rows, people's names, a personal email
 * address, internal menu items and the dev-build badge.
 *
 * Copy rule: every sentence below describes something the screenshot beside
 * it shows. No routing, no GPS, no accounting sync.
 */
export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: "dispatch",
    headline: "Dispatch board",
    description:
      "Today's jobs on a timeline, one row per technician, with the job addresses on a map and an unassigned queue beside it. Assign or reassign a job and it stays linked to the customer and the job record.",
    badge: "The day on one board",
    imageAlt: "Altair Operating System dispatch board: a map of today's jobs above a timeline with one row per technician",
    imageLabel: "Dispatch board",
    imageSrc: "/marketing/screenshots/tour/dispatch-board.png",
    imageSrcMobile: "/marketing/screenshots/tour/dispatch-board-phone.png",
    icon: CalendarClock,
  },
  {
    id: "customer-360",
    headline: "The customer record",
    description:
      "Open a customer and see contact details, every job, estimates, invoices, payments, and the equipment on site together. Your team gets the full picture before they pick up the phone or roll a truck.",
    badge: "Single customer view",
    imageAlt: "Altair Operating System customer record with job history, totals and equipment",
    imageLabel: "Customer record",
    imageSrc: "/marketing/screenshots/tour/customer-record.png",
    imageSrcMobile: "/marketing/screenshots/tour/customer-record-phone.png",
    icon: Users,
  },
  {
    id: "estimates",
    headline: "Estimates & approvals",
    description:
      "Build the estimate from your price book and send the customer a link. They approve and sign on their phone, and the approved estimate becomes the job and then the invoice without retyping.",
    badge: "Customer approvals built in",
    imageAlt: "An approved estimate in Altair Operating System with line items and the total",
    imageLabel: "Estimates & approvals",
    imageSrc: "/marketing/screenshots/tour/estimate-approved.png",
    imageSrcMobile: "/marketing/screenshots/tour/estimate-approved-phone.png",
    icon: FileCheck,
  },
  {
    id: "invoicing",
    headline: "Invoicing & payments",
    description:
      "Turn the finished job into an invoice and email it. Record cash and check payments, or connect Stripe and let customers pay by card from a link. Each invoice shows what is paid and what is still owed.",
    badge: "From finished job to paid",
    imageAlt: "A paid invoice in Altair Operating System showing the invoice total and the amount paid",
    imageLabel: "Invoicing & payments",
    imageSrc: "/marketing/screenshots/tour/invoice-paid.png",
    imageSrcMobile: "/marketing/screenshots/tour/invoice-paid-phone.png",
    icon: Receipt,
  },
  {
    id: "reporting",
    headline: "Reports",
    description:
      "Collected, outstanding and overdue money, average ticket, estimate close rate and jobs completed for the last 7, 30 or 90 days or the year to date, from the same records your team works in.",
    badge: "The numbers at a glance",
    imageAlt: "Altair Operating System reports page with collected, outstanding and overdue totals and key metrics",
    imageLabel: "Reports",
    imageSrc: "/marketing/screenshots/tour/reports.png",
    imageSrcMobile: "/marketing/screenshots/tour/reports-phone.png",
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
        // Picture first on phones for every row; alternate sides from lg up.
        isEven ? "lg:flex-row-reverse" : "lg:flex-row",
        compact ? "lg:gap-6" : "lg:items-center lg:gap-10",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1 lg:flex-[1.5]">
        <ProductScreenshotPlaceholder
          alt={item.imageAlt}
          label={item.imageLabel}
          src={item.imageSrc}
          mobileSrc={item.imageSrcMobile}
        />
      </div>

      <div className={["min-w-0 flex-1", compact ? "lg:max-w-none" : "lg:max-w-md xl:max-w-lg"].join(" ")}>
        {item.badge ? (
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200",
              isDark
                ? "border-[#C2A05A]/28 bg-[#C2A05A]/8 text-[#C2A05A]/90 motion-safe:transition-colors motion-safe:duration-200 group-hover/row:border-[#C2A05A]/40 group-hover/row:bg-[#C2A05A]/12"
                : "border-[#C2A05A]/30 bg-[#FFFCF8] text-[#77591B] motion-safe:transition-colors motion-safe:duration-200 group-hover/row:border-[#C2A05A]/45 group-hover/row:bg-[#FAF7F0]",
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
            isDark ? "text-[#C2A05A]/90" : "text-[#77591B]",
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
          See Altair Operating System in Action
        </h2>
        <p
          className={[
            "mt-2 max-w-2xl leading-relaxed",
            compact ? "text-sm" : "text-sm sm:text-[15px]",
            isDark ? "text-neutral-400" : "text-stone-600",
          ].join(" ")}
        >
          Real screens from a sample HVAC company: the dispatch board, the
          customer record, an approved estimate, a paid invoice and the reports.
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
