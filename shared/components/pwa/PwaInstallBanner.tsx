"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Smartphone, X } from "lucide-react";
import { useMobileViewport } from "@/shared/components/mobile/use-mobile-viewport";
import {
  isStandaloneDisplayMode,
  PWA_INSTALL_BANNER_DISMISSED_KEY,
} from "./pwa-utils";

export function PwaInstallBanner() {
  const isMobile = useMobileViewport();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const shouldShow =
      !isStandaloneDisplayMode() &&
      !window.localStorage.getItem(PWA_INSTALL_BANNER_DISMISSED_KEY);
    const timeout = window.setTimeout(() => setVisible(shouldShow), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function handleDismiss() {
    window.localStorage.setItem(PWA_INSTALL_BANNER_DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!isMobile || !visible || (pathname !== "/" && pathname !== "/technician")) {
    return null;
  }

  return (
    <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#D4AF37]/25 bg-[#FDF9F0] px-3 py-2 shadow-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#9A7209]">
          <Smartphone className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[#0A0A0A]">Install Altair for quicker access</p>
          <Link
            href="/install"
            className="mt-0.5 inline-flex text-xs font-semibold text-[#8A6324] hover:text-[#6F4E16]"
          >
            View instructions
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
