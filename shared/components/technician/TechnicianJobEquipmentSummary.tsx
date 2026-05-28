"use client";

import { useEffect, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { listCustomerEquipmentAction } from "@/app/actions/customer-equipment";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";

type TechnicianJobEquipmentSummaryProps = {
  customerId: string;
  expanded: boolean;
};

export function TechnicianJobEquipmentSummary({
  customerId,
  expanded,
}: TechnicianJobEquipmentSummaryProps) {
  const [equipment, setEquipment] = useState<CustomerEquipment[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEquipment(null);
    setError(null);
    setIsLoading(false);
  }, [customerId]);

  useEffect(() => {
    if (!expanded || equipment !== null) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listCustomerEquipmentAction(customerId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.error) {
          setError(result.error);
          setEquipment([]);
        } else {
          setEquipment(result.equipment ?? []);
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setError("Failed to load equipment.");
        setEquipment([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, expanded, equipment]);

  if (!expanded) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading equipment...
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
        {error}
      </p>
    );
  }

  if (!equipment || equipment.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
        No equipment on file for this customer.
      </div>
    );
  }

  const activeEquipment = equipment.filter((item) => item.isActive);

  if (activeEquipment.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
        No active equipment on file.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Wrench className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Customer equipment
        </p>
      </div>
      <ul className="space-y-2">
        {activeEquipment.slice(0, 4).map((item) => (
          <li
            key={item.id}
            className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200/80"
          >
            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
            {(item.brand || item.modelNumber || item.location) && (
              <p className="mt-0.5 text-xs text-slate-500">
                {[item.brand, item.modelNumber, item.location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
      {activeEquipment.length > 4 ? (
        <p className="mt-2 text-xs text-slate-500">
          +{activeEquipment.length - 4} more on file
        </p>
      ) : null}
    </div>
  );
}
