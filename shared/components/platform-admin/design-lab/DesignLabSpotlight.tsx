"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DesignLabColorKey } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

type DesignLabSpotlightContextValue = {
  spotlightKey: DesignLabColorKey | null;
  setSpotlightKey: (key: DesignLabColorKey | null) => void;
};

const DesignLabSpotlightContext =
  createContext<DesignLabSpotlightContextValue | null>(null);

export function DesignLabSpotlightProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [spotlightKey, setSpotlightKey] = useState<DesignLabColorKey | null>(
    null,
  );

  const value = useMemo(
    () => ({ spotlightKey, setSpotlightKey }),
    [spotlightKey],
  );

  return (
    <DesignLabSpotlightContext.Provider value={value}>
      {children}
    </DesignLabSpotlightContext.Provider>
  );
}

export function useDesignLabSpotlight(): DesignLabSpotlightContextValue {
  const ctx = useContext(DesignLabSpotlightContext);
  if (!ctx) {
    return {
      spotlightKey: null,
      setSpotlightKey: () => {},
    };
  }
  return ctx;
}

const SPOTLIGHT_CLASS =
  "design-lab-token-spotlight outline outline-2 outline-offset-2 outline-[rgba(201,164,77,0.95)] shadow-[0_0_0_4px_rgba(201,164,77,0.28),0_0_24px_rgba(201,164,77,0.45)] z-[5] relative animate-[design-lab-spotlight-pulse_1.1s_ease-out_1]";

/**
 * Marks a preview node as the visual anchor for a token. When that token is
 * focused in the inspector, the node pulses, glows, and scrolls into view.
 */
export function DesignLabTokenAnchor({
  tokenKey,
  children = null,
  className = "",
  style,
  title,
  as: Component = "div",
}: {
  tokenKey: DesignLabColorKey;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  as?: "div" | "span" | "p" | "button";
}) {
  const { spotlightKey } = useDesignLabSpotlight();
  const ref = useRef<HTMLElement | null>(null);
  const isSpotlighted = spotlightKey === tokenKey;

  useEffect(() => {
    if (!isSpotlighted || !ref.current) {
      return;
    }
    ref.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [isSpotlighted]);

  return (
    <Component
      ref={ref as never}
      data-design-lab-token={tokenKey}
      title={title}
      className={[className, isSpotlighted ? SPOTLIGHT_CLASS : ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {children}
    </Component>
  );
}

/** Hook for color controls — spotlight while the control is focused/edited. */
export function useDesignLabTokenSpotlightHandlers(
  tokenKey: DesignLabColorKey | undefined,
) {
  const { setSpotlightKey } = useDesignLabSpotlight();

  const onFocus = useCallback(() => {
    if (tokenKey) {
      setSpotlightKey(tokenKey);
    }
  }, [setSpotlightKey, tokenKey]);

  const onBlur = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      if (!tokenKey) {
        return;
      }
      const next = event.relatedTarget;
      if (
        next instanceof HTMLElement &&
        next.closest(`[data-design-lab-color-control="${tokenKey}"]`)
      ) {
        return;
      }
      setSpotlightKey(null);
    },
    [setSpotlightKey, tokenKey],
  );

  const onEdit = useCallback(() => {
    if (tokenKey) {
      setSpotlightKey(tokenKey);
    }
  }, [setSpotlightKey, tokenKey]);

  return { onFocus, onBlur, onEdit };
}
