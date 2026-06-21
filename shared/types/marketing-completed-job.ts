export type MarketingCompletedJobPickerItem = {
  id: string;
  jobType: string;
  city: string | null;
  state: string | null;
  completedAt: string | null;
  status: "completed";
};
