import {
  Handshake,
  Network,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

type NetworkFeatureCardProps = {
  title: string;
  description: string;
  icon: typeof UserPlus;
  ctaLabel: string;
};

function NetworkFeatureCard({
  title,
  description,
  icon: Icon,
  ctaLabel,
}: NetworkFeatureCardProps) {
  return (
    <article className="admin-card flex min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Coming soon"
        className="mt-4 inline-flex w-full items-center justify-center admin-btn-secondary cursor-not-allowed opacity-60 sm:w-auto"
      >
        {ctaLabel}
      </button>
    </article>
  );
}

export function NetworkBetaPageView() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="admin-page-header flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="admin-heading-eyebrow">Early access preview</p>
          <h1 className="admin-heading-page">Partner Network</h1>
          <p className="admin-text-helper mt-1 max-w-2xl">
            Coordinate trusted partners, overflow work, and coverage.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Coming soon
        </div>
      </header>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <NetworkFeatureCard
          title="Need Coverage"
          description="When your crew is stretched thin, request backup from trusted partner companies—without posting jobs to a public marketplace."
          icon={UserPlus}
          ctaLabel="Request coverage — coming soon"
        />
        <NetworkFeatureCard
          title="Open Capacity"
          description="Offer extra labor or open schedule slots to partners you trust, so overflow work stays inside your private network."
          icon={Users}
          ctaLabel="Offer capacity — coming soon"
        />
      </div>

      <section className="admin-card min-w-0 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Handshake className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900">Trusted Partners</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Keep preferred HVAC, electrical, plumbing, and general trade partners
              organized in one place for referrals and subcontractor coordination.
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center">
              <p className="text-sm font-medium text-slate-700">
                Partner management is coming soon.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                No partner records are created in this preview.
              </p>
            </div>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Coming soon"
              className="mt-4 inline-flex items-center justify-center admin-btn-secondary cursor-not-allowed opacity-60"
            >
              Add partner — coming soon
            </button>
          </div>
        </div>
      </section>

      <section className="admin-card min-w-0 border-sky-100 bg-gradient-to-br from-white to-sky-50/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Network className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              Built for trusted trade partnerships
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Altair&apos;s partner network is intentionally in early access. You can
              explore the vision here while we finish coverage requests, capacity
              offers, and partner workflows—without cross-company job transfers or
              marketplace listings in this release.
            </p>
            <ul className="mt-3 grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full bg-sky-500" />
                Private partner network (not public bidding)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full bg-sky-500" />
                Overflow and subcontractor coordination
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full bg-sky-500" />
                Labor shortage and referral coverage
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full bg-sky-500" />
                No live requests to other companies yet
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
