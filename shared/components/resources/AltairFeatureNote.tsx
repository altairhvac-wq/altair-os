import Link from "next/link";
import {
  ALTAIR_FEATURE_LINKS,
  type AltairFeatureKey,
} from "@/shared/lib/resources/feature-links";

/**
 * "In Altair OS": one short paragraph naming where the product helps with
 * the task on this page. Copy lives in `feature-links.ts` and describes
 * Production modules only; it never claims an outcome.
 */
export function AltairFeatureNote({
  featureKey,
  compact = false,
}: {
  readonly featureKey: AltairFeatureKey;
  readonly compact?: boolean;
}) {
  const feature = ALTAIR_FEATURE_LINKS[featureKey];

  return (
    <aside
      aria-label={`In Altair OS: ${feature.label}`}
      className={[
        "rounded-xl border border-[#C2A05A]/30 bg-[#FBF7EF]",
        compact ? "mt-4 px-4 py-3" : "mt-8 px-5 py-4",
      ].join(" ")}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
        In Altair OS
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
        {feature.note}{" "}
        <Link
          href={feature.href}
          className="rounded-sm font-medium text-[#77591B] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
        >
          See {feature.label}
        </Link>
      </p>
    </aside>
  );
}
