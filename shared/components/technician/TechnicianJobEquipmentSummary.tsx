"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Wrench } from "lucide-react";
import { listCustomerEquipmentAction } from "@/app/actions/customer-equipment";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import {
  technicianFieldJobDetailsClass,
  technicianFieldJobDetailsSummaryClass,
} from "./technician-field-styles";

type TechnicianJobEquipmentSummaryProps = {
  customerId: string;
};

const detailsClass = technicianFieldJobDetailsClass;
const summaryClass = `${technicianFieldJobDetailsSummaryClass} justify-between`;

export function TechnicianJobEquipmentSummary({
  customerId,
}: TechnicianJobEquipmentSummaryProps) {
  const [open, setOpen] = useState(false);
  const [equipment, setEquipment] = useState<CustomerEquipment[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    setEquipment(null);
    setError(null);
    setIsLoading(false);
    setLoadAttempt(0);
    setOpen(false);
  }, [customerId]);

  useEffect(() => {
    if (!open) {
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
          setError(
            formatActionError(
              result.error,
              "Could not load equipment for this job. Try again.",
            ),
          );
          setEquipment([]);
        } else {
          setEquipment(result.equipment ?? []);
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setError("Could not load equipment for this job.");
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
  }, [customerId, open, loadAttempt]);

  if (!customerId?.trim()) {
    return null;
  }

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 border-t border-slate-100/80 px-2.5 py-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading equipment…
        </div>
      );
    }

    if (error) {
      return (
        <div className="px-2.5 py-2 text-xs text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setEquipment(null);
              setLoadAttempt((current) => current + 1);
            }}
            className="mt-2 min-h-9 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-800 ring-1 ring-red-200 transition-colors hover:bg-red-100/60"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!equipment || equipment.length === 0) {
      return (
        <p className="px-2.5 py-2 text-xs text-slate-500">
          No equipment recorded for this customer yet.
        </p>
      );
    }

    const activeEquipment = equipment.filter((item) => item.isActive);

    if (activeEquipment.length === 0) {
      return (
        <p className="px-2.5 py-2 text-xs text-slate-500">
          No active equipment on file for this customer.
        </p>
      );
    }

    return (
      <ul className="space-y-1.5 px-2.5 py-2">
        {activeEquipment.slice(0, 4).map((item) => (
          <li
            key={item.id}
            className="rounded-lg bg-slate-50/80 px-2.5 py-1.5"
          >
            <p className="text-sm font-medium text-slate-900">{item.name}</p>
            {(item.brand || item.modelNumber || item.location) && (
              <p className="mt-0.5 text-xs text-slate-500">
                {[item.brand, item.modelNumber, item.location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </li>
        ))}
        {activeEquipment.length > 4 ? (
          <p className="text-xs text-slate-500">
            +{activeEquipment.length - 4} more on file
          </p>
        ) : null}
      </ul>
    );
  }

  return (
    <details
      className={detailsClass}
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className={summaryClass}>
        <span className="inline-flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5 text-slate-400" />
          Equipment
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </summary>
      {open ? renderContent() : null}
    </details>
  );
}
