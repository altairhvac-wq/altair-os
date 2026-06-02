export type CompanyDemoDataSettings = {
  version: number;
  seededAt: string;
  seededBy: string;
};

export type DemoDataStatus = {
  hasDemoData: boolean;
  canSetupDemoData: boolean;
  seededAt: string | null;
  realCustomerCount: number;
  realJobCount: number;
  realEstimateCount: number;
  realInvoiceCount: number;
};

export type SeedDemoDataResult = {
  error?: string;
  seededAt?: string;
};

export type ClearDemoDataResult = {
  error?: string;
};
