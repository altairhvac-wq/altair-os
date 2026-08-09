"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * Local state that mirrors a prop (e.g. server-provided initial data that
 * changes after a Next.js revalidation) while still allowing the caller to
 * mutate it locally via the returned setter — for optimistic UI updates
 * that shouldn't be clobbered by every render.
 *
 * Deliberately NOT `useEffect(() => setState(propValue), [propValue])`.
 * That pattern is flagged by react-hooks/set-state-in-effect: it forces an
 * extra commit+effect round trip (render → commit → run effect → re-render)
 * on every prop change. This hook instead uses React's documented
 * "adjusting state during render" pattern — comparing against the previous
 * prop value and calling setState synchronously in the render body when it
 * changes, which React folds into the same render pass instead of a
 * separate effect commit.
 * See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 *
 * Equality is reference-based (Object.is), matching a useEffect dependency
 * array's default behavior — safe here because these props come from server
 * component re-renders, which only produce a new array/object reference
 * when the underlying data actually changed (route revalidation), not on
 * every client-side re-render.
 */
export function useSyncedState<T>(
  propValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [prevPropValue, setPrevPropValue] = useState(propValue);
  const [value, setValue] = useState(propValue);

  if (propValue !== prevPropValue) {
    setPrevPropValue(propValue);
    setValue(propValue);
  }

  return [value, setValue];
}
