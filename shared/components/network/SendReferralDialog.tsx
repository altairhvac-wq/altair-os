"use client";

import { useEffect, useState } from "react";
import {
  AltairDialog,
  AltairDialogClose,
  AltairDialogContent,
  AltairDialogDescription,
  AltairDialogHeader,
  AltairDialogTitle,
} from "@/shared/design-system/dialog";
import type { NetworkProfile, NetworkReferral } from "@/shared/types/network-referral";
import { SendReferralForm } from "./SendReferralForm";
import type { NetworkSurface } from "./north-star-m11/network-north-star-styles";

type SendReferralDialogProps = {
  open: boolean;
  targetProfile: NetworkProfile | null;
  onSuccess: (referral: NetworkReferral) => void;
  onCancel: () => void;
  surface?: NetworkSurface;
};

/**
 * Focused Send Referral surface. Reuses `SendReferralForm` and mounts it in
 * the canonical Altair dialog (centered on desktop, near-full-sheet on mobile)
 * instead of the narrow Community profile detail rail.
 */
export function SendReferralDialog({
  open,
  targetProfile,
  onSuccess,
  onCancel,
  surface = "legacy",
}: SendReferralDialogProps) {
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsPending(false);
    }
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !isPending) {
      onCancel();
    }
  }

  return (
    <AltairDialog
      open={open}
      onOpenChange={handleOpenChange}
      closeDisabled={isPending}
    >
      <AltairDialogContent
        size="lg"
        className="h-[min(100dvh,100%)] max-h-[100dvh] sm:h-auto sm:max-h-[85dvh]"
      >
        <AltairDialogHeader>
          <div className="min-w-0">
            <AltairDialogTitle>Send a Referral</AltairDialogTitle>
            <AltairDialogDescription className="mt-1">
              Create a lead in their pipeline with referral context.
            </AltairDialogDescription>
          </div>
          <AltairDialogClose disabled={isPending} />
        </AltairDialogHeader>

        {targetProfile ? (
          <SendReferralForm
            key={targetProfile.id}
            targetProfile={targetProfile}
            onSuccess={onSuccess}
            onCancel={onCancel}
            surface={surface}
            presentation="dialog"
            onPendingChange={setIsPending}
          />
        ) : null}
      </AltairDialogContent>
    </AltairDialog>
  );
}
