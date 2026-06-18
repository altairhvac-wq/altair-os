"use client";

import { useEffect, useRef, type ChangeEvent } from "react";

type BulkSelectCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
  className?: string;
  variant?: "default" | "northStar";
};

const variantClassName: Record<
  NonNullable<BulkSelectCheckboxProps["variant"]>,
  string
> = {
  default:
    "h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40",
  northStar:
    "h-4 w-4 rounded border-[rgba(138,99,36,0.35)] text-[#8A6324] focus:ring-[rgba(201,164,77,0.35)] disabled:cursor-not-allowed disabled:opacity-40",
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
    <label
      className="flex min-h-10 shrink-0 items-center sm:min-h-0"
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
