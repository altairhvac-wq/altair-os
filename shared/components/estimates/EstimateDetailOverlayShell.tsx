"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FocusedDocumentOverlay } from "@/shared/components/layout/FocusedDocumentOverlay";

type EstimateDetailOverlayShellProps = {
  title: string;
  subtitle?: string;
  headerAside?: ReactNode;
  headerTrailing?: ReactNode;
  children: ReactNode;
  closeDisabled?: boolean;
};

export function EstimateDetailOverlayShell({
  title,
  subtitle,
  headerAside,
  headerTrailing,
  children,
  closeDisabled = false,
}: EstimateDetailOverlayShellProps) {
  const router = useRouter();

  return (
    <FocusedDocumentOverlay
      isOpen
      onClose={() => router.back()}
      title={title}
      subtitle={subtitle}
      headerAside={headerAside}
      headerTrailing={headerTrailing}
      closeDisabled={closeDisabled}
      closeVariant="back"
      ariaLabel="Estimate details"
    >
      {children}
    </FocusedDocumentOverlay>
  );
}
