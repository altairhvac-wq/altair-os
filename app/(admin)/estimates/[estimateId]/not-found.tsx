import { FileText } from "lucide-react";
import { Button } from "@/shared/design-system/components";
import { buildSalesHubHref } from "@/shared/lib/sales/sales-hub";

export default function EstimateNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <FileText className="h-7 w-7 text-slate-400" />
      </div>
      <h1 className="mt-5 text-lg font-bold text-slate-900">
        Estimate not found
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        This estimate may have been removed or you may not have access to view
        it.
      </p>
      <Button href={buildSalesHubHref("estimates")} className="mt-6">
        Back to estimates
      </Button>
    </div>
  );
}
