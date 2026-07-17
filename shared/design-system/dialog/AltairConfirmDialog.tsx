"use client";

import type { ReactNode } from "react";
import { Button } from "@/shared/design-system/components/Button";
import {
  AltairDialog,
  AltairDialogClose,
  AltairDialogContent,
  AltairDialogDescription,
  AltairDialogFooter,
  AltairDialogHeader,
  AltairDialogIcon,
  AltairDialogTitle,
} from "./AltairDialog";

/**
 * Minimal canonical confirmation pattern — see
 * shared/design-system/dialog/README.md ("Destructive confirmation
 * composition"). Removes the repeated title/description/Cancel/action
 * markup that `CustomerLifecycleControl`-shaped components previously
 * hand-rolled via `window.confirm`, without owning the decision itself:
 * the caller still decides what "confirm" means, whether it is
 * destructive, and what happens on success or failure. This component
 * never calls a delete/archive function on its own — `onConfirm` is
 * supplied by the domain component every time.
 */
export type AltairConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Concise consequence copy. Plain string or, for a record name, a short fragment like `description`. */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Uses the Danger role on the confirm action and a danger-tinted icon chip. Never conveyed by color alone — pair with clear title/description copy. */
  destructive?: boolean;
  /** Async submission in flight. Disables both actions, disables backdrop/Escape dismissal, and shows a spinner on the confirm action. */
  pending?: boolean;
  onConfirm: () => void;
  /** Optional leading icon (e.g. `<Archive className="h-4 w-4" />`). */
  icon?: ReactNode;
};

export function AltairConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  onConfirm,
  icon,
}: AltairConfirmDialogProps) {
  return (
    <AltairDialog open={open} onOpenChange={onOpenChange} closeDisabled={pending}>
      <AltairDialogContent size="sm">
        <AltairDialogHeader>
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <AltairDialogIcon
                className={
                  destructive
                    ? "bg-altair-danger-surface text-altair-danger-foreground"
                    : "bg-altair-paper-subtle text-altair-ink-on-paper-secondary"
                }
              >
                {icon}
              </AltairDialogIcon>
            ) : null}
            <div className="min-w-0">
              <AltairDialogTitle>{title}</AltairDialogTitle>
              {description ? (
                <AltairDialogDescription className="mt-1">
                  {description}
                </AltairDialogDescription>
              ) : null}
            </div>
          </div>
          <AltairDialogClose disabled={pending} />
        </AltairDialogHeader>

        <AltairDialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "primary"}
            onClick={onConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </AltairDialogFooter>
      </AltairDialogContent>
    </AltairDialog>
  );
}
