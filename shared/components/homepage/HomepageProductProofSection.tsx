import {
  BarChart3,
  CalendarClock,
  FileCheck,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { HomepageProductFrame } from "@/shared/components/homepage/HomepageProductFrame";
import { HOMEPAGE_SCREENSHOTS } from "@/shared/components/homepage/homepage-tokens";

type ProductProof = {
  title: string;
  description: string;
  src: string;
  alt: string;
  icon: LucideIcon;
  featured?: boolean;
};

const PRODUCT_PROOF: ProductProof[] = [
  {
    title: "Dispatch stays connected to the job",
    description:
      "Assign work, adjust the day, and keep the office and field aligned without rebuilding the customer story in another system.",
    src: HOMEPAGE_SCREENSHOTS.dispatch,
    alt: "Altair dispatch workspace showing scheduled jobs and technician assignments",
    icon: CalendarClock,
    featured: true,
  },
  {
    title: "One complete customer record",
    description:
      "Contacts, service history, equipment, estimates, and invoices stay together from the first call forward.",
    src: HOMEPAGE_SCREENSHOTS.customers,
    alt: "Altair customer management workspace with customer and service records",
    icon: Users,
  },
  {
    title: "Estimates move work forward",
    description:
      "Build, send, and approve estimates in the same workflow that becomes the scheduled job.",
    src: HOMEPAGE_SCREENSHOTS.estimate,
    alt: "Altair estimates workspace showing estimate status and customer approvals",
    icon: FileCheck,
  },
  {
    title: "Invoices close the loop",
    description:
      "Completed work becomes an invoice with the job context intact, creating a clear path to payment.",
    src: HOMEPAGE_SCREENSHOTS.invoices,
    alt: "Altair invoices workspace showing customer invoices and payment status",
    icon: Receipt,
  },
  {
    title: "Reporting reflects the operation",
    description:
      "See revenue, activity, and team performance from the same records your team works in every day.",
    src: HOMEPAGE_SCREENSHOTS.reports,
    alt: "Altair reporting workspace showing operational and financial performance",
    icon: BarChart3,
  },
];

export function HomepageProductProofSection() {
  return (
    <section
      id="product-proof"
      aria-labelledby="mc-product-proof-heading"
      className="relative scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16 lg:py-20"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(230,227,220,0.2),transparent)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[90rem]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c2a05a]">
            One system, visible at every stage
          </p>
          <h2
            id="mc-product-proof-heading"
            className="mt-3 text-[1.85rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.35rem] sm:leading-[1.15]"
          >
            The work stays connected because the product stays connected.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#c9bfae] sm:text-lg">
            Altair gives each team the workspace they need while preserving one
            continuous record from opportunity to revenue.
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:mt-12 lg:grid-cols-2 lg:gap-5">
          {PRODUCT_PROOF.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className={[
                  "mc-glass-card rounded-2xl p-4 sm:p-5",
                  item.featured ? "lg:col-span-2" : "",
                ].join(" ")}
              >
                <div
                  className={
                    item.featured
                      ? "grid items-center gap-5 lg:grid-cols-[1.4fr_0.6fr] lg:gap-8"
                      : ""
                  }
                >
                  <HomepageProductFrame
                    src={item.src}
                    alt={item.alt}
                    sizes={
                      item.featured
                        ? "(max-width: 1024px) 92vw, 850px"
                        : "(max-width: 1024px) 92vw, 660px"
                    }
                  />
                  <div className="px-1 pb-1 pt-5 sm:px-2">
                    <Icon
                      className="h-5 w-5 text-[#c2a05a]"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-[#fff9ea]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#9a9080] sm:text-[0.95rem]">
                      {item.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
