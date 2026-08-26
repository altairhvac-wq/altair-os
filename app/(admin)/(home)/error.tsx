"use client";

import { RouteErrorView } from "@/shared/components/ui/RouteErrorView";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Dashboard error boundary.
 *
 * ==================== WHY THIS ONE, WHEN (admin)/error.tsx EXISTS ====================
 * The group-level boundary already catches admin page failures with the shell
 * intact, so most segments do not need their own. The dashboard is the
 * exception, for two reasons.
 *
 * It has by far the widest fan-out in the product — `getDashboardData` issues
 * twenty-one parallel reads across invoices, estimates, expenses, customers,
 * leads, jobs, payments, notifications and time entries. It is the page most
 * likely to fail for a reason that has nothing to do with the page, and the
 * page a user lands on first: a failure here reads as "Altair is down" rather
 * than "one screen is unavailable".
 *
 * It is also the surface Phase 4 changes most. Moving counts into SQL
 * aggregates and adding a feature flag are exactly the changes that produce a
 * new failure mode, and the recovery for all of them is the same — retry, and
 * if that fails, go somewhere that does not depend on the aggregate path.
 *
 * The back link points at Work rather than the dashboard, because "back to the
 * dashboard" from the dashboard is a loop. Someone whose morning overview is
 * broken still needs to reach today's jobs.
 */
export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Could not load your dashboard"
      description="Your dashboard pulls together jobs, invoices, estimates and payments, and one of those could not be reached just now. Nothing has been lost. Try again, or go straight to your work."
      backHref="/work"
      backLabel="Go to Work"
      logLabel="Dashboard"
    />
  );
}
