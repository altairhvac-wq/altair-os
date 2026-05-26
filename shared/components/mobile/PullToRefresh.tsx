"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const TOP_EPSILON = 8;
const PULL_THRESHOLD = 72;
const MAX_PULL_OFFSET = 48;
const REFRESH_MIN_MS = 400;
const HORIZONTAL_BIAS = 6;

type GestureState = {
  active: boolean;
  pulling: boolean;
  startY: number;
  startX: number;
  maxPull: number;
};

const initialGesture: GestureState = {
  active: false,
  pulling: false,
  startY: 0,
  startX: 0,
  maxPull: 0,
};

function getPageScrollTop(): number {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

function canPullFromTouchTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest("[data-no-pull-refresh]")) {
    return false;
  }

  let element: Element | null = target;

  while (element) {
    const { overflowY } = window.getComputedStyle(element);
    const scrollsVertically =
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      element.scrollHeight > element.clientHeight + 1;

    if (scrollsVertically && element.scrollTop > TOP_EPSILON) {
      return false;
    }

    element = element.parentElement;
  }

  return true;
}

function isBodyScrollLocked(): boolean {
  return document.body.style.overflow === "hidden";
}

type PullToRefreshProps = {
  children: ReactNode;
  enabled?: boolean;
};

export function PullToRefresh({ children, enabled = true }: PullToRefreshProps) {
  const router = useRouter();
  const [pullOffset, setPullOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const gestureRef = useRef<GestureState>(initialGesture);
  const isRefreshingRef = useRef(false);

  const resetGesture = useCallback(() => {
    gestureRef.current = initialGesture;
    setPullOffset(0);
  }, []);

  const triggerRefresh = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setPullOffset(MAX_PULL_OFFSET);
    router.refresh();

    window.setTimeout(() => {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      resetGesture();
    }, REFRESH_MIN_MS);
  }, [resetGesture, router]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    if (!enabled) {
      resetGesture();
      return;
    }

    function onTouchStart(event: TouchEvent) {
      if (isRefreshingRef.current || isBodyScrollLocked()) {
        return;
      }

      if (!canPullFromTouchTarget(event.target)) {
        return;
      }

      if (getPageScrollTop() > TOP_EPSILON) {
        return;
      }

      const touch = event.touches[0];
      gestureRef.current = {
        active: true,
        pulling: false,
        startY: touch.clientY,
        startX: touch.clientX,
        maxPull: 0,
      };
    }

    function onTouchMove(event: TouchEvent) {
      const gesture = gestureRef.current;

      if (!gesture.active || isRefreshingRef.current) {
        return;
      }

      if (getPageScrollTop() > TOP_EPSILON) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      const deltaY = touch.clientY - gesture.startY;
      const deltaX = touch.clientX - gesture.startX;

      if (Math.abs(deltaX) > Math.abs(deltaY) + HORIZONTAL_BIAS) {
        resetGesture();
        return;
      }

      if (deltaY <= 0) {
        setPullOffset(0);
        return;
      }

      gesture.pulling = true;
      gesture.maxPull = Math.max(gesture.maxPull, deltaY);
      const offset = Math.min(deltaY * 0.4, MAX_PULL_OFFSET);
      setPullOffset(offset);
    }

    function onTouchEnd() {
      const gesture = gestureRef.current;

      if (!gesture.active) {
        return;
      }

      if (gesture.pulling && gesture.maxPull >= PULL_THRESHOLD) {
        triggerRefresh();
      } else {
        resetGesture();
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, resetGesture, triggerRefresh]);

  const showIndicator = enabled && (pullOffset > 0 || isRefreshing);
  const indicatorOffset = isRefreshing ? MAX_PULL_OFFSET : pullOffset;
  const indicatorOpacity = isRefreshing
    ? 1
    : Math.min(pullOffset / MAX_PULL_OFFSET, 1);

  return (
    <div className="relative min-w-0 max-w-full">
      <div
        aria-hidden={!showIndicator}
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{
          opacity: showIndicator ? indicatorOpacity : 0,
          transform: `translateY(${indicatorOffset - MAX_PULL_OFFSET}px)`,
          transition:
            isRefreshing || pullOffset > 0
              ? undefined
              : "opacity 180ms ease-out, transform 180ms ease-out",
        }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-slate-200/80">
          <Loader2
            className={`h-5 w-5 text-cyan-600 ${isRefreshing ? "animate-spin" : ""}`}
            style={
              !isRefreshing && pullOffset > 0
                ? {
                    transform: `rotate(${Math.min((pullOffset / MAX_PULL_OFFSET) * 320, 320)}deg)`,
                  }
                : undefined
            }
          />
        </div>
      </div>
      {children}
    </div>
  );
}
