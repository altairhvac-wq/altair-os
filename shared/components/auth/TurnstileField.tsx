"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAPTCHA_FORM_FIELD,
  TURNSTILE_ORIGIN,
  TURNSTILE_SITE_KEY,
} from "@/shared/lib/auth/captcha";

/**
 * Cloudflare Turnstile widget for the public auth forms.
 *
 * Writes the token into a hidden `captchaToken` field the Server Action reads
 * and forwards to Supabase (see shared/lib/auth/captcha.ts).
 *
 * Friction: `appearance: "interaction-only"` keeps the widget invisible for
 * the large majority of visitors (Turnstile decides silently in the
 * background); only a visitor Cloudflare is unsure about sees a checkbox.
 * `size: "flexible"` lets that checkbox fill a phone-width form.
 *
 * Tokens are single use and expire after five minutes. `refresh-expired`
 * fetches a new one on its own; `resetSignal` lets the form ask for a fresh
 * one after every submission, because Supabase has spent the old one whether
 * or not the submission succeeded.
 *
 * Renders nothing when no site key is configured.
 */

type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "flexible" | "compact";
  appearance?: "always" | "execute" | "interaction-only";
  "refresh-expired"?: "auto" | "manual" | "never";
  retry?: "auto" | "never";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  "error-callback"?: (code?: string) => boolean | void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "true";
      script.onload = () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error("turnstile_unavailable"));
      };
      script.onerror = () => reject(new Error("turnstile_script_failed"));
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      // Allow a later mount (or the retry button) to try loading again.
      scriptPromise = null;
      throw error;
    });
  }

  return scriptPromise;
}

type Status = "loading" | "waiting" | "solved" | "error";

export function TurnstileField({
  action,
  theme = "light",
  resetSignal,
  onTokenChange,
}: {
  /** Shown in Cloudflare analytics: "signup", "login", "password_reset". */
  action: string;
  theme?: "light" | "dark";
  /** Any value that changes after each submission (the action state works). */
  resetSignal?: unknown;
  onTokenChange?: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const firstSignalRef = useRef(true);
  const onTokenChangeRef = useRef(onTokenChange);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  const updateToken = useCallback((next: string | null) => {
    setToken(next);
    onTokenChangeRef.current?.(next);
  }, []);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY as string,
          action,
          theme,
          size: "flexible",
          appearance: "interaction-only",
          "refresh-expired": "auto",
          retry: "auto",
          callback: (value) => {
            updateToken(value);
            setStatus("solved");
          },
          "expired-callback": () => {
            updateToken(null);
            setStatus("waiting");
          },
          "timeout-callback": () => {
            updateToken(null);
            setStatus("waiting");
          },
          "error-callback": () => {
            updateToken(null);
            setStatus("error");
            // Let Turnstile keep retrying on its own as well.
            return false;
          },
        });
        setStatus((current) => (current === "loading" ? "waiting" : current));
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // The widget may already be gone with its container.
        }
      }
    };
  }, [action, theme, updateToken, attempt]);

  // A fresh token after every submission: Supabase has consumed the last one.
  useEffect(() => {
    if (firstSignalRef.current) {
      firstSignalRef.current = false;
      return;
    }
    const id = widgetIdRef.current;
    if (!id || !window.turnstile) return;
    updateToken(null);
    setStatus("waiting");
    window.turnstile.reset(id);
  }, [resetSignal, updateToken]);

  if (!TURNSTILE_SITE_KEY) return null;

  const mutedClass =
    theme === "dark" ? "text-xs text-slate-400" : "text-xs text-stone-500";

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={CAPTCHA_FORM_FIELD} value={token ?? ""} />
      <div ref={containerRef} data-testid="turnstile-container" />
      {status === "error" ? (
        <p className="text-xs text-red-600" role="alert">
          The security check couldn&apos;t finish. Check your connection or
          pause content blockers for this site, then{" "}
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            try again
          </button>
          .
        </p>
      ) : status === "loading" || status === "waiting" ? (
        <p className={mutedClass} aria-live="polite">
          Running a quick security check…
        </p>
      ) : null}
    </div>
  );
}
