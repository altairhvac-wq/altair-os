import { redirect } from "next/navigation";

/**
 * Legacy `/tech` root used a mock dashboard. Production and local product
 * traffic must use the canonical DB-backed technician experience.
 * Demo mock tooling lives at `/tech/demo` (development only).
 */
export default function TechPage() {
  redirect("/technician");
}
