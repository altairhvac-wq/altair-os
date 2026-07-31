import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "./button-styles";

export type { ButtonSize, ButtonVariant } from "./button-styles";

/**
 * Canonical Altair Button primitive.
 *
 * Owns visual action hierarchy, semantic color, size, radius, focus,
 * hover/active/disabled/loading presentation, icon placement, and the
 * button-vs-navigation branch. Never owns authorization, permissions,
 * domain wording, workflow transitions, data fetching, or layout.
 *
 * See docs/product/ALTAIR_DESIGN_FOUNDATION.md ("Buttons" section) for the
 * four approved action types this component expresses, and
 * shared/design-system/components/README.md for the full contract and
 * className extension policy.
 */
type ButtonBaseProps = {
  /** Action hierarchy — see the Foundation's "Buttons" section. Defaults to "primary". */
  variant?: ButtonVariant;
  /** Defaults to "md" (matches existing production admin button footprint). */
  size?: ButtonSize;
  /** When true, shows a decorative spinner, sets aria-busy, and blocks activation. */
  loading?: boolean;
  /** Rendered before the label. Hidden from assistive tech; the label alone carries meaning. Suppressed while loading. */
  leadingIcon?: ReactNode;
  /** Rendered after the label. Hidden from assistive tech. Suppressed while loading. */
  trailingIcon?: ReactNode;
  /**
   * Additive layout classes only (width, alignment, margin, responsive
   * visibility). Do not use this to override background, foreground,
   * border, radius, focus treatment, or padding — those are the variant's
   * job. Tailwind's cascade does not guarantee caller classes win, so
   * relying on className to override core styling is unsupported.
   */
  className?: string;
  children: ReactNode;
};

type OwnKey = keyof ButtonBaseProps;

/** Renders a native `<button>`. Use for in-page actions, form submission, and mutations. */
export type ButtonAsButtonProps = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<"button">, OwnKey | "type"> & {
    href?: never;
    type?: "button" | "submit" | "reset";
  };

/** Renders a Next.js `<Link>`. Use for navigation only — never for in-page actions. */
export type ButtonAsLinkProps = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, OwnKey | "href"> & {
    href: string;
    /**
     * Links have no native `disabled` attribute. When true, renders an
     * inert, non-navigating element instead of a live `<a href>`.
     */
    disabled?: boolean;
    /** Native buttons accept `type`; navigation never does. */
    type?: never;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

function isLinkProps(props: ButtonProps): props is ButtonAsLinkProps {
  return "href" in props && typeof props.href === "string";
}

/**
 * Two sizes, matched to the two production button footprints in use today:
 * `md` mirrors `.admin-btn-primary`/`.admin-btn-secondary` (EmptyState's
 * current footprint); `sm` mirrors `masterListPagePrimaryActionClass`
 * (compact list-page headers). See app/globals.css and shared/design-system/shell/tokens.ts.
 */
/**
 * Each variant's focus ring reuses that variant's own foreground token as
 * the ring color and its own background token as the ring-offset color.
 * Because every variant's foreground already clears 4.5:1 against its own
 * background (see README contrast matrix), the ring inherits that same
 * proof instead of needing a separate contrast justification.
 */
function ButtonContent({
  loading,
  leadingIcon,
  trailingIcon,
  children,
}: Pick<ButtonBaseProps, "loading" | "leadingIcon" | "trailingIcon" | "children">) {
  return (
    <>
      {loading ? (
        <Loader2
          className="h-4 w-4 shrink-0 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : leadingIcon ? (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      {children}
      {!loading && trailingIcon ? (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </>
  );
}

export function Button(props: ButtonProps) {
  if (isLinkProps(props)) {
    const {
      variant = "primary",
      size = "md",
      loading = false,
      leadingIcon,
      trailingIcon,
      className = "",
      children,
      href,
      disabled = false,
      ...linkRest
    } = props;

    const composedClassName = buttonClassName(variant, size, className);
    const inactive = disabled || loading;

    // A disabled or loading navigation action must never render a live
    // `href` — an `<a>` can be activated by more than onClick (middle
    // click, ctrl/cmd+click, keyboard), so aria-disabled alone on a real
    // anchor would not actually prevent navigation. Render an inert
    // element instead of an anchor.
    if (inactive) {
      return (
        <span
          aria-disabled="true"
          aria-busy={loading || undefined}
          className={composedClassName}
        >
          <ButtonContent loading={loading} leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
            {children}
          </ButtonContent>
        </span>
      );
    }

    return (
      <Link href={href} aria-busy={loading || undefined} className={composedClassName} {...linkRest}>
        <ButtonContent loading={loading} leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
          {children}
        </ButtonContent>
      </Link>
    );
  }

  const {
    variant = "primary",
    size = "md",
    loading = false,
    leadingIcon,
    trailingIcon,
    className = "",
    children,
    type,
    disabled = false,
    ...buttonRest
  } = props;

  const composedClassName = buttonClassName(variant, size, className);

  return (
    <button
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={composedClassName}
      {...buttonRest}
    >
      <ButtonContent loading={loading} leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
        {children}
      </ButtonContent>
    </button>
  );
}
