"use client";

import { useState, useTransition } from "react";
import { MapPin, Search } from "lucide-react";
import {
  searchNearbyNetworkCompaniesAction,
  type NearbyNetworkCompany,
} from "@/app/actions/network-location";
import { formatActionError } from "@/shared/lib/operational-errors";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";

type NetworkNearbySearchProps = {
  onSelectProfile?: (profileId: string) => void;
  surface?: NetworkSurface;
};

const RADIUS_OPTIONS = [10, 25, 50, 100];

export function NetworkNearbySearch({
  onSelectProfile,
  surface = "legacy",
}: NetworkNearbySearchProps) {
  const isNorthStar = surface === "north-star";
  const [query, setQuery] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [results, setResults] = useState<NearbyNetworkCompany[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const shellClass = isNorthStar
    ? st.cardShell
    : "rounded-xl border border-slate-200 bg-white p-4";
  const titleClass = isNorthStar
    ? "text-sm font-bold text-[#17130E]"
    : "text-sm font-bold text-slate-900";
  const inputClass = isNorthStar
    ? "w-full rounded-lg border border-[rgba(119,89,27,0.2)] bg-white px-3 py-2 text-sm text-[#17130E] placeholder:text-[#8A7F6C] focus:outline-none focus:ring-2 focus:ring-[#77591B]/30"
    : adminFormInputClass;
  const selectClass = inputClass;
  const buttonClass = isNorthStar
    ? st.panelActionAccent
    : "inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60";
  const resultRowClass = isNorthStar
    ? "flex items-center justify-between gap-3 rounded-lg border border-[rgba(119,89,27,0.12)] bg-white px-3 py-2"
    : "flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2";
  const mutedClass = isNorthStar ? st.cardMuted : "text-xs text-slate-500";

  function handleSearch() {
    setError(null);
    startTransition(async () => {
      const result = await searchNearbyNetworkCompaniesAction(query, radiusMiles);
      if (result.error) {
        setError(formatActionError(result.error, "We couldn't run that search."));
        setResults(null);
        return;
      }
      setResults(result.results);
    });
  }

  return (
    <section className={shellClass} aria-label="Find companies near a location">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-current opacity-70" />
        <h3 className={titleClass}>Find companies near an area</h3>
      </div>
      <p className={`mt-1 ${mutedClass}`}>
        Search by city, state, or ZIP. Only companies that opted in to map
        visibility with a saved location appear.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSearch();
            }
          }}
          placeholder="e.g. Provo, UT or 84604"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <select
          value={radiusMiles}
          onChange={(event) => setRadiusMiles(Number(event.target.value))}
          className={`${selectClass} w-auto`}
        >
          {RADIUS_OPTIONS.map((radius) => (
            <option key={radius} value={radius}>
              Within {radius} mi
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isPending || !query.trim()}
          className={buttonClass}
        >
          <Search className="h-3.5 w-3.5" />
          {isPending ? "Searching…" : "Search"}
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-rose-700">{error}</p> : null}

      {results !== null ? (
        results.length === 0 ? (
          <p className={`mt-3 ${mutedClass}`}>
            No map-visible companies within {radiusMiles} miles of that area.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {results.map(({ profile, distanceMiles }) => (
              <div key={profile.id} className={resultRowClass}>
                <div className="min-w-0">
                  <p
                    className={
                      isNorthStar
                        ? "truncate text-sm font-semibold text-[#17130E]"
                        : "truncate text-sm font-semibold text-slate-900"
                    }
                  >
                    {profile.displayName}
                  </p>
                  <p className={mutedClass}>
                    {profile.tradeType} ·{" "}
                    {[profile.city, profile.state].filter(Boolean).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={mutedClass}>
                    {distanceMiles < 1
                      ? "< 1 mi"
                      : `${Math.round(distanceMiles)} mi`}
                  </span>
                  {onSelectProfile ? (
                    <button
                      type="button"
                      onClick={() => onSelectProfile(profile.id)}
                      className={
                        isNorthStar
                          ? "text-xs font-semibold text-[#77591B] hover:text-[#77591B]"
                          : "text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                      }
                    >
                      View
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
