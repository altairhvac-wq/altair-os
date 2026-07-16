"use client";

import { cloneElement, useId, type ReactElement } from "react";

/**
 * Canonical Altair field composition.
 *
 * Owns the relationship between a label, an optional description, an
 * optional error, and exactly one native control (`Input`, `Textarea`, or
 * `Select`) — id generation, `aria-describedby`, `aria-invalid`, the
 * required indicator, and the spacing between the pieces. Never owns the
 * control's own visual treatment (that is Input/Textarea/Select's job) and
 * never owns validation rules, database field names, or submission logic.
 *
 * `Field` clones its single child to inject `id`, `required`, and the ARIA
 * wiring, so a caller writes exactly the composition the child already
 * supports natively:
 *
 * ```tsx
 * <Field label="Street address" required error={errors.address}>
 *   <Input name="address" defaultValue={value} />
 * </Field>
 * ```
 *
 * This only works safely because Input/Textarea/Select are controlled by
 * this same design system and are guaranteed to forward `id`, `required`,
 * and `aria-*` straight onto the native element. Do not wrap an arbitrary
 * third-party component as Field's child and expect the same behavior.
 *
 * If the child already supplies its own `id` or `aria-describedby`, Field
 * respects/merges rather than overwrites them.
 *
 * Field's label/description text uses the Paper-anchored `ink-on-paper`
 * token family, not the theme-switching `ink` family — see
 * shared/design-system/foundation/README.md ("Why Ink needed a
 * Paper-anchored companion"). Forms are Paper's domain per the Design
 * Foundation, so Field assumes its ambient backdrop is a Paper-family
 * surface, matching Input/Textarea/Select's own assumption.
 *
 * See shared/design-system/components/README.md for the full contract.
 */

type FieldControlProps = {
  id?: string;
  required?: boolean;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  "aria-describedby"?: string;
};

export type FieldProps = {
  /** Visible label text — Field always renders a real `<label>`, never a placeholder-only field. */
  label: string;
  /** Optional help text rendered between the label and the control (mirrors AuthField's hint). */
  description?: string;
  /**
   * Validation/error message. Presence alone drives `aria-invalid` on the
   * control and the danger-role error text — Field does not decide *when*
   * an error is valid, only how it is presented once a caller has one.
   */
  error?: string;
  /** Shows a restrained required indicator and forwards native `required` to the control. */
  required?: boolean;
  /** Additive layout classes only (width, grid placement) — see Input's className policy. */
  className?: string;
  /** Exactly one native control — `Input`, `Textarea`, or `Select`. */
  children: ReactElement<FieldControlProps>;
};

export function Field({
  label,
  description,
  error,
  required = false,
  className = "",
  children,
}: FieldProps) {
  const generatedId = useId();
  const controlId = children.props.id ?? generatedId;
  const isRequired = required || Boolean(children.props.required);

  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy =
    [children.props["aria-describedby"], descriptionId, errorId]
      .filter(Boolean)
      .join(" ") || undefined;

  const control = cloneElement(children, {
    id: controlId,
    required: isRequired,
    "aria-invalid": error ? true : children.props["aria-invalid"],
    "aria-describedby": describedBy,
  });

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={controlId} className="text-sm font-medium text-altair-ink-on-paper">
        {label}
        {isRequired ? (
          <span aria-hidden="true" className="ml-0.5 text-altair-ink-on-paper-secondary">
            *
          </span>
        ) : null}
      </label>

      {description ? (
        <p id={descriptionId} className="text-sm text-altair-ink-on-paper-secondary">
          {description}
        </p>
      ) : null}

      {control}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-altair-danger-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
