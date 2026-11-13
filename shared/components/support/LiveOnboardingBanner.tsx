import Link from "next/link";
import { ArrowUpRight, LifeBuoy, Video } from "lucide-react";
import type { LiveOnboardingInfo } from "@/shared/types/live-onboarding";

type LiveOnboardingBannerProps = {
  info: LiveOnboardingInfo;
  /** `paper` for the desktop dashboard, `dark` for the phone home. */
  tone?: "paper" | "dark";
};

function buildScheduleLine(info: LiveOnboardingInfo): string {
  const what = "A free one-on-one call: setup, importing your customers, your first jobs.";

  return info.schedule ? `${what} Open times: ${info.schedule}.` : what;
}

function buildMailtoHref(supportEmail: string): string {
  return `mailto:${supportEmail}?subject=${encodeURIComponent(
    "Setup call",
  )}`;
}

/**
 * The setup-call invitation the public site promises is "in your workspace
 * after you sign up". Shown on the dashboard during a company's first weeks;
 * the Help page carries the same information permanently.
 *
 * Without a configured booking link the banner does not render a dead button:
 * it offers to book by email instead.
 */
export function LiveOnboardingBanner({
  info,
  tone = "paper",
}: LiveOnboardingBannerProps) {
  const scheduleLine = buildScheduleLine(info);

  if (tone === "dark") {
    return (
      <section
        aria-label="Setup call"
        className="mt-5 rounded-2xl bg-white/[0.07] px-3.5 py-3.5 ring-1 ring-inset ring-white/10"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c2a05a]/20 text-[#e3c98d]">
            <Video className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Book your setup call</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#a29f96]">
              {scheduleLine}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {info.joinUrl ? (
            <a
              href={info.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-[#c2a05a] px-3 text-sm font-bold text-[#1c1913] active:bg-[#d4b46c]"
            >
              Pick a time
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          ) : (
            <a
              href={buildMailtoHref(info.supportEmail)}
              className="flex min-h-11 touch-manipulation items-center justify-center rounded-xl bg-[#c2a05a] px-3 text-sm font-bold text-[#1c1913] active:bg-[#d4b46c]"
            >
              Email to book
            </a>
          )}
          <Link
            href="/help"
            className="flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-white/[0.08] px-3 text-sm font-semibold text-[#e9e8e4] ring-1 ring-inset ring-white/10 active:bg-white/[0.14]"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden />
            Help
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Setup call"
      className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-altair-border/40 bg-altair-paper px-4 py-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-altair-brass/15 text-[var(--brand-metal-text)]">
        <Video className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-altair-ink-on-paper">
          Book your setup call
        </p>
        <p className="text-sm text-altair-ink-on-paper-secondary">
          {scheduleLine}{" "}
          {info.joinUrl ? null : (
            <>
              Email{" "}
              <a
                href={buildMailtoHref(info.supportEmail)}
                className="font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline"
              >
                {info.supportEmail}
              </a>{" "}
              to set up a time.
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {info.joinUrl ? (
          <a
            href={info.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-altair-brass px-3 py-2 text-xs font-bold text-[#1C1913] transition-colors hover:bg-altair-brass-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            Pick a time
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-altair-border/50 bg-altair-paper px-3 py-2 text-xs font-bold text-altair-ink-on-paper transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
          Help &amp; support
        </Link>
      </div>
    </section>
  );
}
