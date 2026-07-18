/**
 * Lightweight metrics hooks for the Operations Execution Framework.
 *
 * Default implementation is a no-op. Later adapters (Prometheus, OpenTelemetry,
 * Datadog, etc.) can replace hooks via setOperationMetricsHooks — without
 * changing call sites that use runOperation().
 */

export type OperationMetricsStartEvent = {
  operation: string;
  requestId: string;
  companyId?: string;
  userId?: string;
  route?: string;
};

export type OperationMetricsFinishEvent = OperationMetricsStartEvent & {
  durationMs: number;
  success: boolean;
  retryable: boolean;
};

export type OperationMetricsHooks = {
  onOperationStarted: (event: OperationMetricsStartEvent) => void;
  onOperationFinished: (event: OperationMetricsFinishEvent) => void;
  onOperationFailed: (event: OperationMetricsFinishEvent) => void;
};

const noopHooks: OperationMetricsHooks = {
  onOperationStarted() {},
  onOperationFinished() {},
  onOperationFailed() {},
};

let hooks: OperationMetricsHooks = noopHooks;

/** Returns the active metrics hooks (default: no-op). */
export function getOperationMetricsHooks(): OperationMetricsHooks {
  return hooks;
}

/**
 * Replaces metrics hooks. Pass partial hooks to override individually;
 * omitted handlers keep the previous implementation (or no-op).
 */
export function setOperationMetricsHooks(
  next: Partial<OperationMetricsHooks>,
): void {
  hooks = {
    onOperationStarted: next.onOperationStarted ?? hooks.onOperationStarted,
    onOperationFinished: next.onOperationFinished ?? hooks.onOperationFinished,
    onOperationFailed: next.onOperationFailed ?? hooks.onOperationFailed,
  };
}

/** Restores the default no-op hooks (useful in tests). */
export function resetOperationMetricsHooks(): void {
  hooks = { ...noopHooks };
}

export function onOperationStarted(event: OperationMetricsStartEvent): void {
  hooks.onOperationStarted(event);
}

export function onOperationFinished(event: OperationMetricsFinishEvent): void {
  hooks.onOperationFinished(event);
}

export function onOperationFailed(event: OperationMetricsFinishEvent): void {
  hooks.onOperationFailed(event);
}
