/**
 * Canonical Altair button presentation.
 *
 * Keep these classes separate from Button's rendering logic so production
 * compatibility adapters can adopt the same visual language without changing
 * their native button/link behavior in the same migration.
 */
export type ButtonVariant = "primary" | "secondary" | "destructive" | "quiet";
export type ButtonSize = "sm" | "md";

export const buttonBaseClass =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border font-semibold outline-none transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

export const buttonSizeClass: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 py-1.5 text-sm md:h-9 md:min-h-9",
  md: "max-md:min-h-11 px-4 py-2.5 text-sm",
};

export const buttonVariantClass: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-altair-graphite text-altair-paper hover:border-altair-brass-interactive active:border-altair-brass focus-visible:ring-altair-paper focus-visible:ring-offset-altair-graphite",
  secondary:
    "border-altair-border-strong bg-altair-paper-subtle text-altair-ink hover:bg-altair-stone active:bg-altair-stone focus-visible:ring-altair-ink focus-visible:ring-offset-altair-paper-subtle",
  destructive:
    "border-altair-danger/30 bg-altair-danger-surface text-altair-danger-foreground hover:border-altair-danger active:border-altair-danger focus-visible:ring-altair-danger-foreground focus-visible:ring-offset-altair-danger-surface",
  quiet:
    "border-transparent bg-transparent text-altair-ink-secondary hover:bg-altair-paper-subtle hover:text-altair-ink active:bg-altair-stone focus-visible:ring-altair-ink focus-visible:ring-offset-altair-paper-subtle",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
): string {
  return [
    buttonBaseClass,
    buttonSizeClass[size],
    buttonVariantClass[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
