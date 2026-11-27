"use client";

import { useEffect } from "react";

export function PwaServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    // An embedded calculator inside another website has no use for the app's offline shell.
    if (window.self !== window.top) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Install instructions still work if registration fails.
    });
  }, []);

  return null;
}
