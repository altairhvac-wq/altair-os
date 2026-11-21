"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Controls for the two in-page tools (Labor Cost Workspace, Invoice Builder).
 *
 * Same stone/brass palette as the rest of the public site; sized as an
 * application rather than a form on an article: 44px touch targets, dense
 * labels, units inside the field.
 */

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/60 focus-visible:ring-offset-2";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#A4823A] text-[#080907] hover:bg-[#C2A05A] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]",
  secondary:
    "border border-stone-300 bg-white text-stone-800 hover:border-[#C2A05A] hover:bg-stone-50",
  ghost: "text-stone-700 hover:bg-stone-100",
  dark: "border border-white/15 bg-white/[0.06] text-[#f3ebdd] hover:border-white/30 hover:bg-white/[0.12] focus-visible:ring-offset-[#0d0f0c]",
  danger: "text-stone-500 hover:bg-red-50 hover:text-red-700",
};

export function ToolButton({
  children,
  onClick,
  icon: Icon,
  variant = "secondary",
  size = "md",
  type = "button",
  className = "",
  ariaLabel,
  disabled,
  title,
}: {
  readonly children?: React.ReactNode;
  readonly onClick?: () => void;
  readonly icon?: LucideIcon;
  readonly variant?: ButtonVariant;
  readonly size?: "sm" | "md";
  readonly type?: "button" | "submit";
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
  readonly title?: string;
}) {
  const sizing =
    size === "sm"
      ? "min-h-9 gap-1.5 rounded-lg px-3 text-[13px]"
      : "min-h-11 gap-2 rounded-lg px-4 text-sm";
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${BUTTON_VARIANTS[variant]} ${focusRing} ${className}`}
    >
      {Icon ? <Icon aria-hidden="true" className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} /> : null}
      {children}
    </button>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  badge,
}: {
  readonly htmlFor: string;
  readonly children: React.ReactNode;
  readonly badge?: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-2 text-[13px] font-medium text-stone-800">
      <span>{children}</span>
      {badge}
    </label>
  );
}

/** A small "sample - use your own" tag for placeholder inputs. */
export function SampleTag({ children = "sample · use your own" }: { readonly children?: React.ReactNode }) {
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#77591B] ring-1 ring-inset ring-[#C2A05A]/40">
      {children}
    </span>
  );
}

export function SourceTag({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600 ring-1 ring-inset ring-stone-200">
      {children}
    </span>
  );
}

const inputShell =
  "flex items-center rounded-lg border border-stone-300 bg-white transition-colors focus-within:border-[#A4823A] focus-within:ring-2 focus-within:ring-[#C2A05A]/30";
const inputBase =
  "min-h-11 w-full min-w-0 bg-transparent px-3 py-2 text-[15px] text-stone-900 outline-none placeholder:text-stone-400";

/** A number typed as text, so clearing a field to retype it never snaps to 0. */
export function NumberInput({
  id,
  value,
  onChange,
  prefix,
  suffix,
  ariaLabel,
  describedBy,
  compact,
  placeholder,
  invalid,
}: {
  readonly id?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly ariaLabel?: string;
  readonly describedBy?: string;
  readonly compact?: boolean;
  readonly placeholder?: string;
  readonly invalid?: boolean;
}) {
  return (
    <div className={`${inputShell} ${invalid ? "border-red-400" : ""}`}>
      {prefix ? (
        <span className="pl-3 text-sm text-stone-500" aria-hidden="true">
          {prefix}
        </span>
      ) : null}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9.\-]/g, ""))}
        className={`${inputBase} ${compact ? "min-h-10 px-2.5 text-sm tabular-nums" : "tabular-nums"}`}
      />
      {suffix ? (
        <span className="whitespace-nowrap pr-3 text-xs text-stone-500" aria-hidden="true">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  compact,
  maxLength = 120,
  autoComplete = "off",
  type = "text",
}: {
  readonly id?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly ariaLabel?: string;
  readonly compact?: boolean;
  readonly maxLength?: number;
  readonly autoComplete?: string;
  readonly type?: "text" | "email" | "tel" | "date";
}) {
  return (
    <div className={inputShell}>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputBase} ${compact ? "min-h-10 px-2.5 text-sm" : ""}`}
      />
    </div>
  );
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 2,
  maxLength = 600,
}: {
  readonly id?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly rows?: number;
  readonly maxLength?: number;
}) {
  return (
    <div className={inputShell}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputBase} resize-y leading-relaxed`}
      />
    </div>
  );
}

/** A labelled field: label, control, optional hint underneath. */
export function Field({
  label,
  hint,
  badge,
  children,
  className = "",
}: {
  readonly label: React.ReactNode;
  readonly hint?: React.ReactNode;
  readonly badge?: React.ReactNode;
  readonly children: (ids: { id: string; hintId?: string }) => React.ReactNode;
  readonly className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} badge={badge}>
        {label}
      </FieldLabel>
      <div className="mt-1.5">{children({ id, hintId })}</div>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs leading-relaxed text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Two or three mutually exclusive options. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  tone = "light",
}: {
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
  readonly label: string;
  readonly tone?: "light" | "dark";
}) {
  const shell =
    tone === "dark" ? "bg-white/[0.06] ring-white/10" : "bg-stone-100 ring-stone-200";
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-lg p-1 ring-1 ring-inset ${shell}`}>
      {options.map((option) => {
        const active = option.value === value;
        const look =
          tone === "dark"
            ? active
              ? "bg-[#f3ebdd] text-[#0d0f0c]"
              : "text-[#c9bfae] hover:text-white"
            : active
              ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200"
              : "text-stone-600 hover:text-stone-900";
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`min-h-9 rounded-md px-3 text-[13px] font-semibold transition-colors ${look} ${focusRing}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: string;
  readonly description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#A4823A]" : "bg-stone-300"
        } ${focusRing}`}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer text-[13px] leading-snug text-stone-800">
        <span className="font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-stone-500">{description}</span> : null}
      </label>
    </div>
  );
}

/** A transient status line ("Link copied"), announced politely. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return { message, show };
}

export function Toast({ message }: { readonly message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8 print:hidden">
      {message ? (
        <p className="pointer-events-auto rounded-full bg-[#0d0f0c] px-4 py-2 text-sm font-medium text-[#f3ebdd] shadow-lg ring-1 ring-white/10">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** Copy text; falls back to a hidden textarea where the async API is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function readStorage(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // nothing stored, or storage blocked
  }
}

let idCounter = 0;
/** Short unique ids for rows added in the browser. */
export function rowId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}`;
}
