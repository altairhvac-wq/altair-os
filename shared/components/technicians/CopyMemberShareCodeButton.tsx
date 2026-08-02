"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyMemberShareCodeButtonProps = {
  code: string;
  className?: string;
};

export function CopyMemberShareCodeButton({
  code,
  className = "",
}: CopyMemberShareCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Share code copied" : `Copy share code ${code}`}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border border-altair-border bg-[var(--surface-tile)] px-2 py-1 text-xs font-semibold text-altair-ink-on-paper transition hover:bg-[rgb(241_245_249_/_0.7)] ${className}`}
    >
      <span className="font-mono tracking-wide">{code}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-altair-success" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-altair-ink-on-paper-muted" aria-hidden="true" />
      )}
    </button>
  );
}
