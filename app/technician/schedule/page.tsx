import { TechnicianScheduleContent } from "../schedule-content";

type TechnicianSchedulePageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function TechnicianSchedulePage({
  searchParams,
}: TechnicianSchedulePageProps) {
  const { jobId } = await searchParams;

  return <TechnicianScheduleContent initialJobId={jobId ?? null} />;
}
