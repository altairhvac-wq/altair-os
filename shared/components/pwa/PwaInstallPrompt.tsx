"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import {
  type BeforeInstallPromptEvent,
  isIosSafari,
  isStandaloneDisplayMode,
} from "./pwa-utils";

type PwaInstallPromptProps = {
  className?: string;
  onInstallResult?: (outcome: "accepted" | "dismissed" | "unavailable") => void;
};

const ctaFocusClass =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20";

export function PwaInstallPrompt({
  className = "",
  onInstallResult,
}: PwaInstallPromptProps) {
  const [hydrated, setHydrated] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setStandalone(isStandaloneDisplayMode());
    setIosSafari(isIosSafari());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) {
      onInstallResult?.("unavailable");
      return;
    }

    setInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      onInstallResult?.(outcome);
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } catch {
      onInstallResult?.("unavailable");
    } finally {
      setInstalling(false);
    }
  }

  if (!hydrated) {
    return null;
  }

  if (standalone) {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3.5 text-sm text-emerald-900 ${className}`}
      >
        <Smartphone className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
        <p className="font-medium">Altair is installed on this device.</p>
      </div>
    );
  }

  if (deferredPrompt) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#0A0A0A] px-5 py-3 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(10,10,10,0.22),0_4px_18px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]/30 transition-colors hover:bg-[#141414] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto ${ctaFocusClass}`}
        >
          <Download className="h-4 w-4" aria-hidden />
          {installing ? "Installing…" : "Install Altair"}
        </button>
      </div>
    );
  }

  if (iosSafari) {
    return (
      <div
        className={`rounded-2xl border border-stone-200/80 bg-white/90 px-4 py-4 text-sm text-stone-700 ${className}`}
      >
        <p className="font-semibold text-[#0A0A0A]">Install from Safari</p>
        <ol className="mt-3 space-y-2.5">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF4E8] text-xs font-semibold text-[#9A7209]">
              1
            </span>
            <span>
              Tap <Share className="mx-0.5 inline h-4 w-4 align-text-bottom text-[#9A7209]" aria-hidden />{" "}
              Share at the bottom of Safari
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF4E8] text-xs font-semibold text-[#9A7209]">
              2
            </span>
            <span>Scroll and tap Add to Home Screen</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF4E8] text-xs font-semibold text-[#9A7209]">
              3
            </span>
            <span>Tap Add in the top right</span>
          </li>
        </ol>
      </div>
    );
  }

  return null;
}
