import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveCompanyBusinessNumbers } from "@/lib/database/queries/business-numbers";
import { PlanningView } from "@/shared/components/settings/business-numbers/PlanningView";

/**
 * Settings > Numbers > Plan with your numbers: a truck, a hire and a pay
 * plan, each started from the company's saved numbers (migration 218).
 *
 * The settings layout has already checked the caller is an owner or admin,
 * and the numbers are read under row level security. The page reads and
 * never writes. In a database without migration 218 it does not exist, the
 * same as the page it hangs from.
 */
export const metadata: Metadata = {
  title: "Plan with your numbers",
};

export default async function BusinessNumbersPlanningPage() {
  const load = await getActiveCompanyBusinessNumbers();

  if (!load) {
    return null;
  }

  if (!load.available) {
    notFound();
  }

  return <PlanningView numbers={load.record.numbers} loadError={load.error} />;
}
