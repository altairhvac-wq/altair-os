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
import { buttonClassName } from "@/shared/design-system/components/button-styles";

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
            className={buttonClassName(
              action.variant === "success"
                ? "primary"
                : action.variant === "primary"
                  ? "secondary"
                  : "quiet",
              "md",
              `min-h-14 touch-manipulation ${isComplete ? "col-span-2" : ""}`,
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
