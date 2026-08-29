import type { Metadata } from "next";
import { TechnicianScheduleContent } from "../schedule-content";

type TechnicianSchedulePageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export const metadata: Metadata = {
  title: "Schedule",
};

export default async function TechnicianSchedulePage({
  searchParams,
}: TechnicianSchedulePageProps) {
  const { jobId } = await searchParams;

  return <TechnicianScheduleContent initialJobId={jobId ?? null} />;
}
