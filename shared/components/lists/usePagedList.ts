"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type PagedListSnapshot<TItem> = {
  rows: TItem[];
  nextCursor: string | null;
  totalCount: number;
  hasMore: boolean;
};

type LoadMore<TItem> = (cursor: string) => Promise<{
  error?: string;
  page?: PagedListSnapshot<TItem>;
}>;

/**
 * Client state for a server-paged list.
 *
 * ============================== THE DIVISION OF STATE ==============================
 * Search, filters and sort live in the URL. They describe what the page IS, they
 * should survive a refresh, and a link to them should mean the same thing to
 * whoever opens it. Changing any of them is a new server render from row one.
 *
 * The cursor does not live in the URL. It is a position inside one scroll of one
 * list, it accumulates rather than replaces, and a link carrying it would say
 * nothing useful to a recipient.
 *
 * ============================== WHY ACCUMULATED ROWS RESET ==============================
 * When the server sends a new first page — because the search or the queue
 * changed — the rows accumulated from previous "load more" calls are stale and
 * must be dropped, or the list shows results from the previous filter beneath
 * results from the current one. The identity of the incoming snapshot is what
 * signals that, which is why it is tracked rather than the rows compared.
 */
export function usePagedList<TItem>(
  snapshot: PagedListSnapshot<TItem>,
  loadMore: LoadMore<TItem>,
) {
  const [rows, setRows] = useState<TItem[]>(snapshot.rows);
  const [cursor, setCursor] = useState<string | null>(snapshot.nextCursor);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, startLoadMore] = useTransition();

  // A fresh server render replaces everything accumulated so far.
  //
  // Tracked in state rather than a ref: this is React's documented
  // adjust-state-during-render pattern, and reading a ref during render is both
  // disallowed by lint here and genuinely unsafe under concurrent rendering.
  const [seenSnapshot, setSeenSnapshot] = useState(snapshot);
  if (seenSnapshot !== snapshot) {
    setSeenSnapshot(snapshot);
    setRows(snapshot.rows);
    setCursor(snapshot.nextCursor);
    setError(null);
  }

  const handleLoadMore = useCallback(() => {
    if (!cursor || isLoadingMore) return;

    startLoadMore(async () => {
      const result = await loadMore(cursor);
      if (result.error || !result.page) {
        setError(result.error ?? "Could not load more results.");
        return;
      }
      setError(null);
      setRows((previous) => [...previous, ...result.page!.rows]);
      setCursor(result.page.nextCursor);
    });
  }, [cursor, isLoadingMore, loadMore]);

  return {
    rows,
    totalCount: snapshot.totalCount,
    loadedCount: rows.length,
    hasMore: cursor !== null,
    isLoadingMore,
    error,
    loadMore: handleLoadMore,
  };
}

/**
 * Reads and writes one URL search parameter, debounced for typing.
 *
 * Debouncing is not cosmetic here. Every keystroke that reaches the server is a
 * query against the whole tenant; at 5,000 customers that is a real cost paid
 * per character. 300 ms is long enough to collapse a word into one request and
 * short enough that the list still feels live.
 *
 * The local value is authoritative while typing so the input never fights the
 * user, and it re-syncs when the URL changes from elsewhere (a back button, a
 * cleared filter).
 */
export function useUrlParamState(
  name: string,
  initial: string,
  options?: { debounceMs?: number; resetParams?: readonly string[] },
): [string, (next: string) => void, boolean] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Same pattern: re-sync the input when the URL changes from elsewhere (a back
  // button, a cleared filter) without reading a ref during render.
  const urlValue = searchParams.get(name) ?? "";
  const [seenUrlValue, setSeenUrlValue] = useState(urlValue);
  if (seenUrlValue !== urlValue) {
    setSeenUrlValue(urlValue);
    setValue(urlValue);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const commit = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set(name, next);
      else params.delete(name);

      // Changing a filter invalidates anything scoped to the previous one.
      for (const reset of options?.resetParams ?? []) params.delete(reset);

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [name, options?.resetParams, pathname, router, searchParams],
  );

  const update = useCallback(
    (next: string) => {
      setValue(next);
      if (timer.current) clearTimeout(timer.current);
      const delay = options?.debounceMs ?? 0;
      if (delay === 0) {
        commit(next);
        return;
      }
      timer.current = setTimeout(() => commit(next), delay);
    },
    [commit, options?.debounceMs],
  );

  return [value, update, isPending];
}
