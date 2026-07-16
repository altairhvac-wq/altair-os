import Link from "next/link";
import type { ReactNode } from "react";

export type EmptyStateTone = "neutral" | "success" | "warning" | "danger" | "info";

export type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  tone?: EmptyStateTone;
  icon?: ReactNode;
  className?: string;
};

const accentStyles: Record<EmptyStateTone, string> = {
  neutral: "border-altair-border",
  success: "border-altair-success/35",
  warning: "border-altair-warning/35",
  danger: "border-altair-danger/35",
  info: "border-altair-information/35",
};

const titleStyles: Record<EmptyStateTone, string> = {
  neutral: "text-altair-ink",
  success: "text-altair-success",
  warning: "text-altair-warning",
  danger: "text-altair-danger",
  info: "text-altair-information",
};

type EmptyStateActionButtonProps = {
  action: EmptyStateAction;
  variant: "primary" | "secondary";
};

function EmptyStateActionButton({ action, variant }: EmptyStateActionButtonProps) {
  const className =
    variant === "primary"
      ? "inline-flex w-full items-center justify-center gap-1.5 admin-btn-primary sm:w-auto sm:min-w-[9rem]"
      : "inline-flex w-full items-center justify-center gap-1.5 admin-btn-secondary sm:w-auto sm:min-w-[9rem]";

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={className}
    >
      {action.label}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  tone = "neutral",
  icon,
  className = "",
}: EmptyStateProps) {
  const hasActions = Boolean(action || secondaryAction);

  return (
    <div
      className={`rounded-2xl border border-dashed bg-altair-paper-subtle px-5 py-10 text-center shadow-[var(--shadow-card)] sm:px-8 sm:py-12 ${accentStyles[tone]} ${className}`}
    >
      <div className="mx-auto max-w-md">
        {icon ? (
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-altair-border bg-altair-stone text-altair-ink-muted shadow-sm"
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}
        <h3 className={`text-lg font-bold tracking-tight sm:text-xl ${titleStyles[tone]}`}>
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-altair-ink-secondary">{description}</p>
        ) : null}

        {hasActions ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
            {secondaryAction ? (
              <EmptyStateActionButton action={secondaryAction} variant="secondary" />
            ) : null}
            {action ? <EmptyStateActionButton action={action} variant="primary" /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
