import { formatActionError } from "@/shared/lib/operational-errors";

export type BulkLifecycleResultItem = {
  id: string;
  label: string;
  success: boolean;
  error?: string;
};

export type BulkLifecycleActionResult = {
  error?: string;
  results: BulkLifecycleResultItem[];
  successCount: number;
  failureCount: number;
};

export function normalizeEntityIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export async function runBulkLifecycleAction<T>(input: {
  ids: string[];
  permissionError?: string;
  emptySelectionError: string;
  loadEntity: (id: string) => Promise<T | null>;
  getLabel: (entity: T) => string;
  getBlockReason?: (entity: T) => string | null | Promise<string | null>;
  runAction: (id: string) => Promise<{ error?: string }>;
}): Promise<BulkLifecycleActionResult> {
  if (input.permissionError) {
    return {
      error: input.permissionError,
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const uniqueIds = normalizeEntityIds(input.ids);

  if (uniqueIds.length === 0) {
    return {
      error: input.emptySelectionError,
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const results: BulkLifecycleResultItem[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const id of uniqueIds) {
    const entity = await input.loadEntity(id);

    if (!entity) {
      results.push({
        id,
        label: id,
        success: false,
        error: "Record not found.",
      });
      failureCount += 1;
      continue;
    }

    const blockReason = input.getBlockReason
      ? await input.getBlockReason(entity)
      : null;
    if (blockReason) {
      results.push({
        id,
        label: input.getLabel(entity),
        success: false,
        error: blockReason,
      });
      failureCount += 1;
      continue;
    }

    const actionResult = await input.runAction(id);

    if (actionResult.error) {
      results.push({
        id,
        label: input.getLabel(entity),
        success: false,
        error: formatActionError(actionResult.error, "This record could not be updated."),
      });
      failureCount += 1;
      continue;
    }

    results.push({
      id,
      label: input.getLabel(entity),
      success: true,
    });
    successCount += 1;
  }

  return { results, successCount, failureCount };
}

export function getBulkLifecycleFailedIds(
  result: BulkLifecycleActionResult,
): Set<string> {
  return new Set(
    result.results.filter((item) => !item.success).map((item) => item.id),
  );
}

export function pruneBulkSelectionToFailedIds(
  previous: ReadonlySet<string>,
  failedIds: ReadonlySet<string>,
): Set<string> {
  if (failedIds.size === 0) {
    return new Set();
  }

  const next = new Set<string>();
  for (const id of previous) {
    if (failedIds.has(id)) {
      next.add(id);
    }
  }
  return next;
}

export function formatBulkLifecycleFailureDetails(
  result: BulkLifecycleActionResult,
): string[] {
  return result.results
    .filter((item) => !item.success)
    .map((item) => `${item.label}: ${item.error ?? "Could not be updated."}`);
}
