"use client";

import { useEffect, useRef, type ChangeEvent } from "react";
import { fieldCheckboxClass } from "@/shared/design-system/components/field-styles";

type BulkSelectCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
  className?: string;
  /** @deprecated Both variants use the canonical field checkbox language. */
  variant?: "default" | "northStar";
};

const variantClassName: Record<
  NonNullable<BulkSelectCheckboxProps["variant"]>,
  string
> = {
  default: fieldCheckboxClass,
  northStar: fieldCheckboxClass,
};

export function BulkSelectCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  onChange,
  className,
  variant = "default",
}: BulkSelectCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    /* The label is the touch target, not the 16px box inside it. It already
       claimed 40px of height on mobile but only the input's 16px of width, so
       the effective target was 16x40 — under 2.5.8's 24px on one axis. 44x44
       on mobile, unchanged from `sm` up where a pointer is doing the work. */
    <label
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center sm:min-h-0 sm:min-w-0"
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.checked)
        }
        aria-label={ariaLabel}
        className={className ?? variantClassName[variant]}
      />
    </label>
  );
}
