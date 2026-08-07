"use client";

/**
 * @deprecated Thin delegation kept so existing imports keep working.
 * The canonical Payroll page view is PayrollPageView (panel 17) — a single
 * code path that replaced this component's legacy/north-star fork. New code
 * should import PayrollPageView directly.
 */

import {
  PayrollPageView,
  type PayrollPageViewProps,
} from "./PayrollPageView";

export type AdminTimeTrackingViewProps = PayrollPageViewProps;

export function AdminTimeTrackingView(props: AdminTimeTrackingViewProps) {
  return <PayrollPageView {...props} />;
}
