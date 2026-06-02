/** Operational UI counts and summaries use active lifecycle records only. */
export function isOperationalActiveLifecycleState(state: string): boolean {
  return state === "active";
}

export function countOperationalActive<T>(
  items: readonly T[],
  getLifecycleState: (item: T) => string,
): number {
  return items.filter((item) =>
    isOperationalActiveLifecycleState(getLifecycleState(item)),
  ).length;
}

export function filterOperationalActive<T>(
  items: readonly T[],
  getLifecycleState: (item: T) => string,
): T[] {
  return items.filter((item) =>
    isOperationalActiveLifecycleState(getLifecycleState(item)),
  );
}
