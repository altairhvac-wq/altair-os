"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AltairConfirmDialog } from "./AltairConfirmDialog";

/**
 * Promise bridge between `window.confirm`-shaped call sites and
 * `AltairConfirmDialog`.
 *
 * The primitive is declarative (`open` + `onConfirm`) while the call sites it
 * replaces are synchronous and inline:
 *
 *     if (!window.confirm("Delete 3 customers?")) return;
 *     await deleteCustomers();
 *
 * Rewriting each of those into open/pending/pendingAction state is where a
 * migration like this usually stalls, so this hook keeps the original shape:
 *
 *     if (!(await confirm({ title: "Delete 3 customers?", destructive: true }))) return;
 *     await deleteCustomers();
 *
 * The returned element must be rendered somewhere in the component's tree.
 *
 * Resolution semantics deliberately match `window.confirm`: the promise
 * settles as soon as the user chooses, and the dialog closes. Callers already
 * own their own in-flight state — they were written against a blocking API —
 * so keeping that contract makes each migration a local edit rather than a
 * rewrite of the surrounding component.
 */
export type ConfirmRequest = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Danger role on the confirm action. Copy must carry the meaning too — never colour alone. */
  destructive?: boolean;
  icon?: ReactNode;
};

export function useConfirm(): {
  confirm: (request: ConfirmRequest) => Promise<boolean>;
  confirmDialog: ReactNode;
} {
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  /* The resolver lives only in a ref — never mirrored from state during
   * render, which would be a render-phase ref write. */
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  /* An unmount mid-decision must not leave the caller awaiting forever. */
  useEffect(
    () => () => {
      const resolve = resolverRef.current;
      resolverRef.current = null;
      resolve?.(false);
    },
    [],
  );

  const confirm = useCallback((request: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      // A second request while one is open cancels the first rather than
      // silently dropping its promise.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setPending(request);
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setPending(null);
    resolve?.(ok);
  }, []);

  const confirmDialog = pending ? (
    <AltairConfirmDialog
      open
      onOpenChange={(next) => {
        if (!next) settle(false);
      }}
      title={pending.title}
      description={pending.description}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      destructive={pending.destructive}
      icon={pending.icon}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
