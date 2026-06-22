"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import {
  type BeforeInstallPromptEvent,
  getInstallPlatformCategory,
  isStandaloneDisplayMode,
} from "./pwa-utils";

type PwaInstallPromptProps = {
  className?: string;
  onInstallResult?: (outcome: "accepted" | "dismissed" | "unavailable") => void;
  /** When "button-only", renders only the native install button — no fallback UI. */
  variant?: "default" | "button-only";
  onPromptAvailabilityChange?: (available: boolean) => void;
};

const ctaFocusClass =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20";

function PlatformInstallInstructions({ className = "" }: { className?: string }) {
  const platform = getInstallPlatformCategory();

  if (platform === "ios") {
    return (
      <div
        className={`rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-4 text-sm text-amber-950 ${className}`}
      >
        <p className="font-semibold text-[#0A0A0A]">Install on iPhone</p>
        <p className="mt-1.5 leading-relaxed text-amber-900/90">
          Open in Safari, tap Share at the bottom (or ⋯ first), scroll down, then
          tap Add to Home Screen.
        </p>
      </div>
    );
  }

  if (platform === "android") {
    return (
      <div
        className={`rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-4 text-sm text-amber-950 ${className}`}
      >
        <p className="font-semibold text-[#0A0A0A]">Install on Android</p>
        <p className="mt-1.5 leading-relaxed text-amber-900/90">
          Tap Install if shown, or open the three-dot menu (⋯) and choose
          Install app or Add to Home screen.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-4 text-sm text-amber-950 ${className}`}
    >
      <p className="font-semibold text-[#0A0A0A]">Install on your phone</p>
      <p className="mt-1.5 leading-relaxed text-amber-900/90">
        Open this page on your phone to add Altair to your home screen.
      </p>
    </div>
  );
}

export function PwaInstallPrompt({
  className = "",
  onInstallResult,
  variant = "default",
  onPromptAvailabilityChange,
}: PwaInstallPromptProps) {
  const [hydrated, setHydrated] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setStandalone(isStandaloneDisplayMode());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      onPromptAvailabilityChange?.(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [onPromptAvailabilityChange]);

  useEffect(() => {
    if (hydrated && !deferredPrompt) {
      onPromptAvailabilityChange?.(false);
    }
  }, [hydrated, deferredPrompt, onPromptAvailabilityChange]);

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
        onPromptAvailabilityChange?.(false);
      }
    } catch {
      onInstallResult?.("unavailable");
    } finally {
      setInstalling(false);
    }
  }

  if (!hydrated) {
    if (variant === "button-only") {
      return null;
    }

    return (
      <div
        className={`rounded-2xl border border-stone-200/80 bg-white/90 px-4 py-4 text-sm text-stone-600 ${className}`}
        aria-hidden
      >
        Checking install options…
      </div>
    );
  }

  if (standalone) {
    if (variant === "button-only") {
      return null;
    }

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
          className={`inline-flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#0A0A0A] px-6 py-4 text-base font-semibold text-white shadow-[0_1px_2px_rgba(10,10,10,0.22),0_4px_18px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]/30 transition-colors hover:bg-[#141414] disabled:cursor-not-allowed disabled:opacity-70 ${ctaFocusClass}`}
        >
          <Download className="h-5 w-5" aria-hidden />
          {installing ? "Installing…" : "Install Altair"}
        </button>
      </div>
    );
  }

  if (variant === "button-only") {
    return null;
  }

  return <PlatformInstallInstructions className={className} />;
}
