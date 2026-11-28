"use client";

import { useState } from "react";

/**
 * A number box for a quantity or a price that lets a person type the number
 * the way they type it.
 *
 * ============ THE BUG THIS REPLACES ============
 * The line editors held a NUMBER in state and showed `value || ""`. Type "0"
 * and the state is 0, the box is told to show "", and the zero vanishes
 * under the cursor. "0.5" survived by luck; "0.05" did not: ".0" is also 0,
 * the box was emptied a second time, and the "5" landed alone. The line said
 * 5 where the person typed 0.05.
 *
 * While the box has focus it shows exactly what was typed; the parent still
 * gets every keystroke and keeps its number. When focus leaves, the box goes
 * back to showing the parent's number.
 */

type DecimalDraftInputProps = {
  readonly id: string;
  /** The parent's number. 0 shows as an empty box, as it always has. */
  readonly value: number;
  /** Every keystroke, as typed. The parent parses it. */
  readonly onValueChange: (text: string) => void;
  readonly min: string;
  readonly step: string;
  readonly className: string;
  readonly required?: boolean;
};

export function DecimalDraftInput({ id, value, onValueChange, min, step, className, required }: DecimalDraftInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={draft ?? (value || "")}
      onChange={(event) => {
        setDraft(event.target.value);
        onValueChange(event.target.value);
      }}
      onBlur={() => setDraft(null)}
      className={className}
      required={required}
    />
  );
}
