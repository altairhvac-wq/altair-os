"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { searchCustomerOptionsAction } from "@/app/actions/list-pages";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import {
  CUSTOMER_OPTION_LIMIT,
  CUSTOMER_SEARCH_MIN_LENGTH,
} from "@/shared/lib/customers/customer-options";
import type { Customer } from "@/shared/types/customer";

type CustomerPickerProps = {
  /**
   * The starting options. On the hub pages this is the newest
   * CUSTOMER_OPTION_LIMIT customers, not the book — which is why the search
   * below exists.
   */
  customers: Customer[];
  value: string;
  /**
   * The record behind `value`, when the caller holds it. It is always offered
   * as an option, whatever `customers` contains. Needed by a form that takes
   * this picker off the screen and brings it back (the estimate wizard): the
   * customers found by search live in this component and go with it.
   */
  selectedCustomer?: Customer | null;
  /** The record comes with the id so a caller never looks it up in a list that may not hold it. */
  onChange: (customerId: string, customer: Customer | null) => void;
  id?: string;
  name?: string;
  required?: boolean;
};

type SearchResponse = {
  term: string;
  customers: Customer[];
  truncated: boolean;
  error: string | null;
};

const SEARCH_DELAY_MS = 250;

function describeCustomer(customer: Customer): string {
  const place = [customer.address, customer.city].filter(Boolean).join(", ");
  return [customer.company, place].filter(Boolean).join(" · ");
}

/**
 * The customer field of the job, estimate and invoice forms.
 *
 * ============================== WHY THIS IS NOT JUST A SELECT ==============================
 * The forms used to render a native select straight over the list they were
 * given. Once that list became the newest twenty-five, two things went wrong
 * for any company with more customers than that:
 *
 *   - an older customer could not be chosen at all, and nothing said so;
 *   - a form opened for an older customer had a value with no matching option,
 *     so the browser showed a different customer and the record was saved for
 *     that one.
 *
 * The second is handled where the list is built (withSelectedOption). This
 * handles the first: when the list is long enough to have been cut short, a
 * search under the select looks through every customer in the company, and
 * whoever is picked becomes an option and stays one.
 *
 * The select stays the field. It is what the form reads, what a phone renders
 * natively, and all a small company ever sees.
 */
export function CustomerPicker({
  customers,
  value,
  selectedCustomer = null,
  onChange,
  id = "customerId",
  name = "customerId",
  required = false,
}: CustomerPickerProps) {
  const [picked, setPicked] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [response, setResponse] = useState<SearchResponse>({
    term: "",
    customers: [],
    truncated: false,
    error: null,
  });

  const options = useMemo(() => {
    const seen = new Set<string>();
    const merged: Customer[] = [];
    const known = selectedCustomer ? [selectedCustomer, ...picked] : picked;
    for (const customer of [...known, ...customers]) {
      if (seen.has(customer.id)) continue;
      seen.add(customer.id);
      merged.push(customer);
    }
    return merged;
  }, [picked, customers, selectedCustomer]);

  // A list this long may be a slice. A shorter one is the whole book, and a
  // search box over it would only be clutter.
  const canSearch = customers.length >= CUSTOMER_OPTION_LIMIT;

  const term = search.trim();
  const termIsSearchable = term.length >= CUSTOMER_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!termIsSearchable) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchCustomerOptionsAction(term)
        .then((result) => {
          if (cancelled) return;
          setResponse({
            term,
            customers: result.result?.customers ?? [],
            truncated: result.result?.truncated ?? false,
            error: result.error ?? null,
          });
        })
        .catch(() => {
          if (cancelled) return;
          setResponse({
            term,
            customers: [],
            truncated: false,
            error: "The search did not go through. Try again.",
          });
        });
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, termIsSearchable]);

  // The answer on screen must be the answer to the term on screen. A response
  // for a term the person has already typed past is ignored, not shown.
  const hasAnswer = termIsSearchable && response.term === term;
  const isSearching = termIsSearchable && !hasAnswer;
  const matches = hasAnswer ? response.customers : [];

  function pick(customer: Customer) {
    setPicked((current) =>
      current.some((entry) => entry.id === customer.id)
        ? current
        : [customer, ...current],
    );
    setSearch("");
    onChange(customer.id, customer);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    // Enter in a field inside a form submits the form. Here it would save a
    // job while the person was still looking for the customer.
    event.preventDefault();
    if (matches.length === 1) {
      pick(matches[0]);
    }
  }

  return (
    <>
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={(event) => {
          const nextId = event.target.value;
          onChange(
            nextId,
            options.find((customer) => customer.id === nextId) ?? null,
          );
        }}
        className={adminFormInputClass}
      >
        {/*
          Selectable on purpose. If the value ever matches no option, the
          browser falls back to the first option it is allowed to select; with
          this one disabled that was the first CUSTOMER. Empty plus `required`
          stops the save instead.
        */}
        <option value="">Select…</option>
        {options.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </select>

      {canSearch ? (
        <div className="mt-1.5">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-altair-ink-on-paper-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search all customers"
              placeholder="Not in the list? Search all customers"
              autoComplete="off"
              className={`${adminFormInputClass} pl-9`}
            />
          </div>

          {termIsSearchable ? (
            <div
              className="mt-1.5 rounded-lg border border-altair-border bg-altair-paper-elevated"
              aria-live="polite"
            >
              {isSearching ? (
                <p className="px-3 py-2.5 text-sm text-altair-ink-on-paper-secondary">
                  Searching…
                </p>
              ) : response.error ? (
                <p className="px-3 py-2.5 text-sm text-altair-danger-foreground">
                  {response.error}
                </p>
              ) : matches.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-altair-ink-on-paper-secondary">
                  No customer matches “{term}”.
                </p>
              ) : (
                <>
                  <ul
                    aria-label="Matching customers"
                    className="max-h-56 overflow-y-auto overscroll-contain p-1"
                  >
                    {matches.map((customer) => {
                      const detail = describeCustomer(customer);
                      return (
                        <li key={customer.id}>
                          <button
                            type="button"
                            onClick={() => pick(customer)}
                            className="flex min-h-11 w-full min-w-0 flex-col justify-center rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-altair-paper-subtle focus-visible:bg-altair-paper-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper"
                          >
                            <span className="block w-full truncate text-sm font-medium text-altair-ink-on-paper">
                              {customer.name}
                            </span>
                            {detail ? (
                              <span className="block w-full truncate text-xs text-altair-ink-on-paper-secondary">
                                {detail}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {response.truncated ? (
                    <p className="border-t border-altair-border px-3 py-2 text-xs text-altair-ink-on-paper-secondary">
                      Showing the first {matches.length} matches. Type more of
                      the name to narrow it down.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
