"use client";

import { useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { dirFocus } from "@/shared/components/directory/directory-styles";

/**
 * The directory's phone navigation (owner, 2026-11-23: the phone page read as
 * one endless, unorganized list). Below `sm` only.
 *
 * FilterSheet: a "Filters" button that opens the full search form in a sheet
 * from the bottom. The form itself is rendered on the server and passed in,
 * so it is the same plain GET form as on a computer; this only opens and
 * closes it (a native <dialog>, so focus and Escape behave).
 *
 * ShowMoreList: shows the first few results on a phone and a "Show more"
 * button for the rest of the page; larger screens always show all of them.
 */
export function FilterSheet({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-[#77591B] ${dirFocus}`}
      >
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
        <span className="max-w-[7.5rem] truncate">{label}</span>
      </button>
      <dialog
        ref={dialog}
        aria-label="Filters"
        onClick={(event) => {
          // A tap on the dimmed area outside the sheet closes it.
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-white p-0 text-stone-900 backdrop:bg-black/45"
      >
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Filters</p>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close filters"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 ${dirFocus}`}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3">{children}</div>
        </div>
      </dialog>
    </>
  );
}

export function ShowMoreList({
  children,
  restCount,
  className,
}: {
  readonly children: ReactNode;
  readonly restCount: number;
  readonly className: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ul data-open={open ? "true" : "false"} className={`group/list ${className}`}>
        {children}
      </ul>
      {restCount > 0 && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-800 sm:hidden ${dirFocus}`}
        >
          Show {restCount} more
        </button>
      ) : null}
    </>
  );
}
