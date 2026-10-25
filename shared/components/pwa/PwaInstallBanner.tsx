"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Smartphone, X } from "lucide-react";
import { useMobileViewport } from "@/shared/components/mobile/use-mobile-viewport";
import {
  isStandaloneDisplayMode,
  PWA_INSTALL_BANNER_DISMISSED_KEY,
} from "./pwa-utils";

/**
 * Install nudge shown on the admin and technician home screens until
 * dismissed or installed.
 *
 * Phone audit 2026-10-24: the "View instructions" link was a 16px-tall text
 * target and the dismiss X was 24px. The whole banner is now the link (a
 * 56px row) and the dismiss button is a separate 44px target. On the
 * technician home it is rendered by the home screen itself, inside the
 * graphite wallpaper, with that screen's glass treatment instead of sitting as
 * a cream strip above it.
 */
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

  const dark = pathname === "/technician";

  return (
    <div
      className={
        dark
          ? "mt-4 flex items-stretch gap-1"
          : "mb-2.5 flex items-stretch gap-1 rounded-xl border border-[#C2A05A]/25 bg-[#FDF9F0] pl-1 pr-1 shadow-sm"
      }
    >
      <Link
        href="/install"
        className={`flex min-h-14 min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
          dark
            ? "bg-white/[0.07] ring-1 ring-inset ring-white/10 active:bg-white/[0.12]"
            : "active:bg-white/80"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            dark ? "bg-[#c2a05a]/20 text-[#e3c986]" : "bg-white text-[#77591B]"
          }`}
        >
          <Smartphone className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[13px] font-semibold ${
              dark ? "text-white" : "text-[#0A0A0A]"
            }`}
          >
            Install Altair on this phone
          </span>
          <span
            className={`block truncate text-xs ${
              dark ? "text-[#9b9fa6]" : "text-[#77591B]"
            }`}
          >
            Opens like an app · see how
          </span>
        </span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 ${dark ? "text-white/40" : "text-[#77591B]/60"}`}
          aria-hidden
        />
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className={`inline-flex h-14 w-11 shrink-0 touch-manipulation items-center justify-center self-center rounded-xl transition-colors ${
          dark
            ? "text-white/60 hover:bg-white/10 hover:text-white"
            : "text-stone-500 hover:bg-white/80 hover:text-stone-700"
        }`}
        aria-label="Dismiss install banner"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
