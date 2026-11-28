"use client";

import { useId } from "react";
import { fieldControlClass, fieldLabelClass } from "@/shared/design-system/components/field-styles";
import type { Reading, ReadingTone } from "@/shared/lib/business-numbers/readings";

/**
 * The two building blocks every business-numbers screen is made of: a number
 * box and a line that says what the numbers mean. Settings > Numbers and the
 * guided setup share them, so a number looks and behaves the same in both.
 */

const TONE_CLASS: Record<ReadingTone, string> = {
  good: "border-[rgba(5,150,105,0.22)] bg-[rgba(236,253,245,0.92)] text-[#065F46]",
  warn: "border-[rgba(180,120,20,0.3)] bg-[rgba(255,248,230,0.95)] text-[#6B4A0B]",
  bad: "border-[rgba(185,28,28,0.28)] bg-[rgba(254,242,242,0.92)] text-[#991B1B]",
  note: "border-altair-border bg-altair-paper-subtle text-altair-ink-on-paper-secondary",
};

/** One sentence about the numbers, coloured by what it says, with an optional action beside it. */
export function ReadingLine({ reading, children }: { readonly reading: Reading; readonly children?: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed sm:flex-row sm:items-center sm:justify-between ${TONE_CLASS[reading.tone]}`}>
      <p className="min-w-0">{reading.text}</p>
      {children}
    </div>
  );
}

export type NumberBoxProps = {
  /** The form field name; also how a screen finds the box to focus it. */
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly value: string;
  /** Whole numbers only (a count), which changes the phone keyboard shown. */
  readonly whole?: boolean;
  /** The id of the message that explains what is wrong with this box, when something is. */
  readonly errorId?: string | null;
  /** A save is running. The box goes read-only, not disabled, so keyboard focus is kept. */
  readonly busy?: boolean;
  /** Free text (a phone number, a street) instead of a number. */
  readonly text?: boolean;
  readonly autoComplete?: string;
  readonly maxLength?: number;
  /** A greyed example shown while the box is empty. Never saved. */
  readonly placeholder?: string;
  readonly onChange: (value: string) => void;
};

export function NumberBox({ name, label, hint, prefix, suffix, value, whole = false, errorId = null, busy = false, text = false, autoComplete = "off", maxLength = 40, placeholder, onChange }: NumberBoxProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <div className="relative mt-1">
        {prefix ? (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-altair-ink-on-paper-muted">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          type="text"
          inputMode={text ? undefined : whole ? "numeric" : "decimal"}
          autoComplete={autoComplete}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          readOnly={busy}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldControlClass} ${prefix ? "pl-7" : ""} ${suffix ? "pr-16" : ""}`}
        />
        {suffix ? (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-altair-ink-on-paper-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs leading-snug text-altair-ink-on-paper-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
