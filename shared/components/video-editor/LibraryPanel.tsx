"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check, Smartphone } from "lucide-react";

/**
 * The HVAC photo library, browsable and searchable inside the editor.
 *
 * ==================== WHY THIS PANEL CAN NOW EXIST ====================
 * It used to say the library was unreachable, and that was true: the library is
 * a tree on the production laptop and the editor is a browser. What changed is
 * that the library now publishes a catalog — one JSON of 229 assets with a
 * thumbnail for each, written into this app's own public directory. Nothing
 * here reads a disk; it reads a file the app serves, which is the only thing a
 * browser was ever going to be able to do.
 *
 * ==================== SEARCH IS STRUCTURED, NOT CLEVER ====================
 * No embeddings and no model call. Every asset carries keywords, tags, subject,
 * description and equipment terms, and a query scores against those with an
 * exact-term bonus and a prefix fallback. That answers "scroll compressor",
 * "condensate float switch" and "technician rooftop" correctly today, and it
 * fails in ways a person can read and fix by editing a tag. A vector store
 * would be a second retrieval opinion to keep in sync with the one the Director
 * already uses.
 *
 * ==================== FORMAT AWARENESS ====================
 * A landscape photograph and its portrait derivative are ONE asset with two
 * variants. A 16:9 project gets the original; a 9:16 project gets the vertical.
 * The panel shows which assets have a portrait variant so that choice is
 * visible rather than surprising.
 */

export type CatalogVariant = {
  readonly assetId: string;
  readonly aspectRatio: string;
  readonly orientation: string;
  readonly thumbnailUrl: string;
  readonly derivationMethod: string;
  readonly qcStatus: string;
};

export type CatalogAsset = {
  readonly assetId: string;
  readonly category: string;
  readonly categoryKey: string;
  readonly subcategory: string;
  readonly subject: string;
  readonly description: string;
  readonly shotType: string;
  readonly orientation: string;
  readonly equipmentType: readonly string[];
  readonly component: readonly string[];
  readonly tags: readonly string[];
  readonly keywords: readonly string[];
  readonly qcStatus: string;
  readonly thumbnailUrl: string;
  readonly variants: readonly CatalogVariant[];
};

export type Catalog = {
  readonly totalAssets: number;
  readonly categories: readonly string[];
  readonly shotTypes: readonly string[];
  readonly equipment: readonly string[];
  readonly assets: readonly CatalogAsset[];
};

/** Loaded once per session and shared — the catalog is static and ~1MB. */
let cached: Catalog | null = null;

export function useAssetCatalog(enabled: boolean) {
  const [catalog, setCatalog] = useState<Catalog | null>(cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || catalog !== null) return;
    let alive = true;
    fetch("/studio/hvac-catalog.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${String(r.status)}`))))
      .then((data: Catalog) => {
        cached = data;
        if (alive) setCatalog(data);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "could not load");
      });
    return () => {
      alive = false;
    };
  }, [enabled, catalog]);

  return { catalog, error };
}

/**
 * Score one asset against a query.
 *
 * Exact term matches count for far more than prefixes, so "scroll" does not
 * rank every screw compressor through "scr". Matches in curated tags outrank
 * matches in prose, because a tag was written to describe the picture while a
 * description was written to read well.
 */
function score(asset: CatalogAsset, terms: readonly string[]): number {
  if (terms.length === 0) return 1;
  const tagSet = new Set(
    asset.tags.flatMap((t) => t.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean),
  );
  const equipSet = new Set(
    [...asset.equipmentType, ...asset.component]
      .flatMap((t) => t.toLowerCase().split(/[^a-z0-9]+/))
      .filter(Boolean),
  );
  const words = new Set(asset.keywords.map((k) => k.toLowerCase()));
  const prose = `${asset.subject} ${asset.description} ${asset.shotType}`.toLowerCase();

  let total = 0;
  for (const term of terms) {
    if (equipSet.has(term)) total += 14;
    else if (tagSet.has(term)) total += 10;
    else if (words.has(term)) total += 6;
    else if (prose.includes(term)) total += 3;
    else if ([...words].some((w) => w.startsWith(term)) && term.length >= 4) total += 1;
    else return 0; // every term must land somewhere, or this is not a match
  }
  return total;
}

type Props = {
  readonly projectAspect: "16:9" | "9:16";
  readonly currentAssetId: string | null;
  readonly canApply: boolean;
  readonly onApply: (assetId: string) => void;
  /** Add as a NEW clip at the playhead, rather than replacing a shot. */
  readonly onAdd?: (assetId: string) => void;
};

export function LibraryPanel({ projectAspect, currentAssetId, canApply, onApply, onAdd }: Props) {
  const { catalog, error } = useAssetCatalog(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [shot, setShot] = useState("");

  const results = useMemo(() => {
    if (!catalog) return [];
    const terms = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    return catalog.assets
      .filter((a) => (category === "" || a.category === category))
      .filter((a) => (shot === "" || a.shotType === shot))
      .map((a) => ({ a, s: score(a, terms) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s || x.a.assetId.localeCompare(y.a.assetId))
      .slice(0, 160);
  }, [catalog, query, category, shot]);

  if (error !== null) {
    return (
      <Note title="Catalog not available">
        {`Could not load /studio/hvac-catalog.json (${error}). Rebuild it with
         node _manifest/build-catalog.mjs in the HVAC library.`}
      </Note>
    );
  }
  if (!catalog) return <Note title="Loading the HVAC library…">{""}</Note>;

  const portrait = projectAspect === "9:16";

  return (
    <div className="space-y-2">
      <div
        className="flex h-7 items-center gap-1.5 rounded px-2"
        style={{ background: "var(--ve-raised)", border: "1px solid var(--ve-line-strong)" }}
      >
        <Search className="size-3.5" style={{ color: "var(--ve-text-faint)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="scroll compressor, float switch…"
          data-testid="ve-library-search"
          className="h-6 w-full bg-transparent text-[11px] outline-none"
          style={{ color: "var(--ve-text)" }}
        />
      </div>

      <div className="flex gap-1.5">
        <Select value={category} onChange={setCategory} label="All categories" options={catalog.categories} />
        <Select value={shot} onChange={setShot} label="Any shot" options={catalog.shotTypes} />
      </div>

      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px]" style={{ color: "var(--ve-text-faint)" }}>
          {results.length} of {catalog.totalAssets}
        </span>
        <span className="text-[10px]" style={{ color: "var(--ve-text-faint)" }}>
          {canApply ? "click to replace · + to add" : "select a clip to replace · + to add"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {results.map(({ a }) => {
          const v = a.variants.find((x) => x.aspectRatio === "9:16");
          const thumb = portrait && v ? v.thumbnailUrl : a.thumbnailUrl;
          const isCurrent = a.assetId === currentAssetId;
          return (
            // A div rather than a button, because the "+" control lives inside
            // it and a button inside a button is invalid. Click and keyboard
            // behaviour are wired explicitly instead.
            <div
              key={a.assetId}
              role="button"
              tabIndex={0}
              aria-disabled={!canApply}
              data-testid="ve-library-asset"
              data-asset-id={a.assetId}
              title={`${a.subject}\n\n${a.description}`}
              onClick={() => onApply(a.assetId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onApply(a.assetId);
                }
              }}
              className="group cursor-pointer overflow-hidden rounded-[3px] text-left"
              style={{
                background: "var(--ve-raised)",
                border: `1px solid ${isCurrent ? "var(--ve-accent)" : "var(--ve-line)"}`,
                opacity: canApply ? 1 : 0.75,
              }}
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local
                    thumbnail of known size; next/image would add a loader round
                    trip for an image already sized for this grid. */}
                <img
                  src={thumb}
                  alt=""
                  loading="lazy"
                  className={portrait ? "h-[104px] w-full object-cover" : "aspect-video w-full object-cover"}
                />
                {isCurrent ? (
                  <span
                    className="absolute right-1 top-1 rounded-full p-0.5"
                    style={{ background: "var(--ve-accent)" }}
                  >
                    <Check className="size-2.5" style={{ color: "var(--ve-on-accent)" }} />
                  </span>
                ) : null}
                {v && !portrait ? (
                  <span
                    className="absolute bottom-1 right-1 rounded px-1 py-px"
                    title="a 9:16 version of this asset exists"
                    style={{ background: "rgba(0,0,0,0.62)" }}
                  >
                    <Smartphone className="size-2.5" style={{ color: "var(--ve-text-dim)" }} />
                  </span>
                ) : null}
                {onAdd ? (
                  <button
                    type="button"
                    data-testid="ve-library-add"
                    data-asset-id={a.assetId}
                    title="Add as a new clip at the playhead (OVERLAY)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdd(a.assetId);
                    }}
                    className="absolute left-1 top-1 flex size-5 items-center justify-center rounded"
                    style={{ background: "rgba(0,0,0,0.62)", color: "var(--ve-text)" }}
                  >
                    +
                  </button>
                ) : null}
              </div>
              <div className="px-1.5 py-1">
                <div className="truncate text-[10px]" style={{ color: "var(--ve-text-dim)" }}>
                  {a.subject}
                </div>
                <div className="text-[9px]" style={{ color: "var(--ve-text-faint)" }}>
                  {a.shotType}
                  {a.qcStatus !== "KEEP" ? ` · ${a.qcStatus.toLowerCase()}` : ""}
                </div>
              </div>
            </div>
          );
        })}
        {results.length === 0 ? (
          <p className="col-span-2 p-2 text-[10px]" style={{ color: "var(--ve-text-faint)" }}>
            Nothing matches. Every word has to land on a tag, a keyword or the
            description — try fewer words.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly label: string;
  readonly options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 min-w-0 flex-1 rounded px-1 text-[10px] outline-none"
      style={{
        background: "var(--ve-raised)",
        border: "1px solid var(--ve-line)",
        color: "var(--ve-text-dim)",
      }}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Note({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div
      className="rounded p-2.5"
      style={{ background: "var(--ve-raised)", border: "1px solid var(--ve-line)" }}
    >
      <div className="text-[11px] font-medium" style={{ color: "var(--ve-text-dim)" }}>
        {title}
      </div>
      {children ? (
        <p className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--ve-text-faint)" }}>
          {children}
        </p>
      ) : null}
    </div>
  );
}
