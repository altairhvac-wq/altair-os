import {
  Camera,
  CheckCircle2,
  MapPin,
  Phone,
  StickyNote,
} from "lucide-react";
import type {
  TechnicianJob,
  TechnicianQuickAction,
} from "@/shared/types/technician";

type TechnicianQuickActionsProps = {
  job: TechnicianJob;
  onAction: (action: TechnicianQuickAction, job: TechnicianJob) => void;
};

const actions: {
  id: TechnicianQuickAction;
  label: string;
  icon: typeof MapPin;
  variant: "primary" | "secondary" | "success";
}[] = [
  { id: "navigate", label: "Navigate", icon: MapPin, variant: "primary" },
  { id: "call", label: "Call Customer", icon: Phone, variant: "secondary" },
  { id: "note", label: "Add Note", icon: StickyNote, variant: "secondary" },
  { id: "photo", label: "Upload Photo", icon: Camera, variant: "secondary" },
  {
    id: "complete",
    label: "Complete Job",
    icon: CheckCircle2,
    variant: "success",
  },
];

const variantStyles = {
  primary:
    "bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
};

export function TechnicianQuickActions({
  job,
  onAction,
}: TechnicianQuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        const isComplete = action.id === "complete";

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action.id, job)}
            className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm transition-colors ${variantStyles[action.variant]} ${isComplete ? "col-span-2" : ""}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
