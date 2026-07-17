"use client";

import { useEffect, useState } from "react";

export type ConnectivityStatus = "online" | "offline";

type ConnectivityState = {
  status: ConnectivityStatus;
  /** True briefly after returning from offline so UI can confirm reconnect. */
  justReconnected: boolean;
  isOnline: boolean;
  isOffline: boolean;
};

function readOnlineStatus(): ConnectivityStatus {
  if (typeof navigator === "undefined") {
    return "online";
  }

  return navigator.onLine ? "online" : "offline";
}

/**
 * Browser connectivity for technician field UX.
 * Not a sync engine — only reflects navigator online/offline signals.
 */
export function useConnectivityStatus(): ConnectivityState {
  const [status, setStatus] = useState<ConnectivityStatus>(readOnlineStatus);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let previous = readOnlineStatus();

    function clearReconnectTimer() {
      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    }

    function handleOnline() {
      if (previous === "offline") {
        setJustReconnected(true);
        clearReconnectTimer();
        reconnectTimer = setTimeout(() => {
          setJustReconnected(false);
        }, 4000);
      }
      previous = "online";
      setStatus("online");
    }

    function handleOffline() {
      clearReconnectTimer();
      setJustReconnected(false);
      previous = "offline";
      setStatus("offline");
    }

    previous = readOnlineStatus();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearReconnectTimer();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    status,
    justReconnected,
    isOnline: status === "online",
    isOffline: status === "offline",
  };
}
