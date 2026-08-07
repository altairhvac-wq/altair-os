"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useConnectivityStatus } from "@/shared/hooks/useConnectivityStatus";

/**
 * Compact connectivity status for the technician shell.
 * Shows while offline, and briefly after reconnect.
 *
 * Connectivity is inherently client-only knowledge (navigator.onLine), so
 * this renders nothing until after mount — the server cannot know the
 * device's connection state, and rendering the offline banner during SSR
 * caused a hydration mismatch against the online client.
 */
export function TechnicianConnectivityBanner() {
  const { isOffline, justReconnected } = useConnectivityStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!isOffline && !justReconnected) {
    return null;
  }

  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950"
      >
        <WifiOff
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="font-semibold">No connection</p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-900/90">
            Saves and uploads will fail until you reconnect. Anything you typed
            stays on this screen so you can retry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-3 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-950"
    >
      <Wifi
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-semibold">Back online</p>
        <p className="mt-0.5 text-xs leading-relaxed text-emerald-900/90">
          Connection restored. Retry any action that failed.
        </p>
      </div>
    </div>
  );
}
