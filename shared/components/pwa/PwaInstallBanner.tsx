"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { useMobileViewport } from "@/shared/components/mobile/use-mobile-viewport";
import {
  isStandaloneDisplayMode,
  PWA_INSTALL_BANNER_DISMISSED_KEY,
} from "./pwa-utils";

export function PwaInstallBanner() {
  const isMobile = useMobileViewport();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplayMode()) {
      setVisible(false);
      return;
    }

    const dismissed = window.localStorage.getItem(
      PWA_INSTALL_BANNER_DISMISSED_KEY,
    );
    setVisible(!dismissed);
  }, []);

  function handleDismiss() {
    window.localStorage.setItem(PWA_INSTALL_BANNER_DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!isMobile || !visible) {
    return null;
  }

  return (
    <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#FDF9F0] via-[#FFFCF8] to-[#FAF7F2] px-4 py-3 shadow-[0_2px_8px_rgba(10,10,10,0.05)] ring-1 ring-[#D4AF37]/15">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF4E8] text-[#9A7209]">
          <Smartphone className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0A0A0A]">
            Add Altair to your phone
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
            Opens like an app from your home screen.
          </p>
          <Link
            href="/install"
            className="mt-2 inline-flex min-h-[36px] items-center rounded-lg bg-[#0A0A0A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#141414]"
          >
            How to install
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="rounded-lg p-1 text-stone-500 transition hover:bg-white/80 hover:text-stone-700"
        aria-label="Dismiss install banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
