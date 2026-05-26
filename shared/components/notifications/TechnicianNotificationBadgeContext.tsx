"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TechnicianNotificationBadgeContextValue = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
};

const TechnicianNotificationBadgeContext =
  createContext<TechnicianNotificationBadgeContextValue | null>(null);

type TechnicianNotificationBadgeProviderProps = {
  initialUnreadCount: number;
  children: ReactNode;
};

export function TechnicianNotificationBadgeProvider({
  initialUnreadCount,
  children,
}: TechnicianNotificationBadgeProviderProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
      decrementUnread: () => setUnreadCount((current) => Math.max(0, current - 1)),
      clearUnread: () => setUnreadCount(0),
    }),
    [unreadCount],
  );

  return (
    <TechnicianNotificationBadgeContext.Provider value={value}>
      {children}
    </TechnicianNotificationBadgeContext.Provider>
  );
}

export function useTechnicianNotificationBadge() {
  const context = useContext(TechnicianNotificationBadgeContext);

  if (!context) {
    throw new Error(
      "useTechnicianNotificationBadge must be used within TechnicianNotificationBadgeProvider",
    );
  }

  return context;
}
