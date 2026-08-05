"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deleteDesignLabThemeAction,
  listDesignLabThemesAction,
  promoteDesignLabThemeToLiveAction,
  revertLiveDesignLabThemeAction,
  saveDesignLabThemeAction,
  setActiveDesignLabThemeAction,
  updateDesignLabThemeAction,
} from "@/app/actions/design-lab-themes";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  type DesignLabDimensions,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";
import type { DesignLabShineMap } from "@/shared/components/platform-admin/design-lab/design-lab-shine";
import type { DesignLabTheme } from "@/shared/types/design-lab-theme";
import { AltairConfirmDialog } from "@/shared/design-system/dialog";

type DesignLabSavedThemesPanelProps = {
  themes: DesignLabTheme[];
  colors: DesignLabColors;
  shines?: DesignLabShineMap;
  dimensions?: DesignLabDimensions;
  loadedThemeId: string | null;
  onThemesChange: (themes: DesignLabTheme[]) => void;
  onLoadTheme: (theme: DesignLabTheme) => void;
};

type ConfirmState =
  | {
      kind: "promote";
      theme: DesignLabTheme;
    }
  | {
      kind: "revert";
      themeName: string;
    }
  | null;

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function upsertTheme(
  themes: DesignLabTheme[],
  theme: DesignLabTheme,
): DesignLabTheme[] {
  const without = themes.filter((entry) => entry.id !== theme.id);
  return [theme, ...without].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function DesignLabSavedThemesPanel({
  themes,
  colors,
  shines = {},
  dimensions = LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  loadedThemeId,
  onThemesChange,
  onLoadTheme,
}: DesignLabSavedThemesPanelProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [isPending, startTransition] = useTransition();

  const liveTheme = useMemo(
    () => themes.find((theme) => theme.isLive) ?? null,
    [themes],
  );

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  function runAction(
    actionKey: string,
    action: () => Promise<void>,
  ) {
    clearFeedback();
    setPendingAction(actionKey);
    startTransition(async () => {
      try {
        await action();
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function refreshThemeList(fallback?: DesignLabTheme[]) {
    const listResult = await listDesignLabThemesAction();
    if (listResult.themes) {
      onThemesChange(listResult.themes);
      return;
    }
    if (fallback) {
      onThemesChange(fallback);
    }
  }

  function handleSave() {
    runAction("save", async () => {
      const result = await saveDesignLabThemeAction({
        name,
        colors,
        shines,
        dimensions,
      });
      if (result.error || !result.theme) {
        setError(result.error ?? "Failed to save theme.");
        return;
      }
      onThemesChange(upsertTheme(themes, result.theme));
      setName("");
      setMessage(result.success ?? "Theme saved.");
    });
  }

  function handleUpdate(theme: DesignLabTheme) {
    runAction(`update:${theme.id}`, async () => {
      const result = await updateDesignLabThemeAction({
        themeId: theme.id,
        colors,
        shines,
        dimensions,
      });
      if (result.error || !result.theme) {
        setError(result.error ?? "Failed to update theme.");
        return;
      }
      onThemesChange(upsertTheme(themes, result.theme));
      setMessage(
        result.theme.isLive
          ? `${result.success ?? "Theme updated."} Live product chrome will use the new tokens on the next navigation.`
          : (result.success ?? "Theme updated."),
      );
    });
  }

  function handleSetActive(theme: DesignLabTheme) {
    runAction(`active:${theme.id}`, async () => {
      const result = await setActiveDesignLabThemeAction(theme.id);
      if (result.error || !result.theme) {
        setError(result.error ?? "Failed to set active theme.");
        return;
      }
      await refreshThemeList(
        themes.map((entry) => ({
          ...entry,
          isActive: entry.id === result.theme!.id,
        })),
      );
      setMessage(result.success ?? "Active draft updated.");
    });
  }

  function handleDelete(theme: DesignLabTheme) {
    if (
      !window.confirm(
        theme.isLive
          ? `Delete live theme “${theme.name}”? This removes the live product override and cannot be undone.`
          : `Delete saved theme “${theme.name}”? This cannot be undone.`,
      )
    ) {
      return;
    }

    runAction(`delete:${theme.id}`, async () => {
      const result = await deleteDesignLabThemeAction(theme.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onThemesChange(themes.filter((entry) => entry.id !== theme.id));
      setMessage(result.success ?? "Theme deleted.");
    });
  }

  function handleConfirmPromote() {
    if (!confirm || confirm.kind !== "promote") {
      return;
    }
    const theme = confirm.theme;
    setConfirm(null);
    runAction(`promote:${theme.id}`, async () => {
      const result = await promoteDesignLabThemeToLiveAction(theme.id);
      if (result.error || !result.theme) {
        setError(result.error ?? "Failed to apply theme to live product.");
        return;
      }
      await refreshThemeList(
        themes.map((entry) => ({
          ...entry,
          isLive: entry.id === result.theme!.id,
          isActive: entry.id === result.theme!.id,
        })),
      );
      setMessage(result.success ?? "Theme applied to live product.");
    });
  }

  function handleConfirmRevert() {
    if (!confirm || confirm.kind !== "revert") {
      return;
    }
    setConfirm(null);
    runAction("revert", async () => {
      const result = await revertLiveDesignLabThemeAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      await refreshThemeList(
        themes.map((entry) => ({
          ...entry,
          isLive: false,
        })),
      );
      setMessage(result.success ?? "Live theme removed.");
    });
  }

  const confirmPending =
    isPending &&
    (pendingAction?.startsWith("promote:") || pendingAction === "revert");

  return (
    <section
      aria-label="Saved themes"
      className="space-y-2.5 rounded-none border border-[rgba(138,99,36,0.16)] bg-[#FBF7EF] px-3.5 py-3 sm:px-4"
    >
      <div>
        <h2 className="text-sm font-bold text-[#17130E]">Saved themes</h2>
        <p className="mt-0.5 text-xs leading-snug text-[#6B6255]">
          Save and load drafts for this company.{" "}
          <span className="font-semibold text-[#17130E]">
            Apply to live product
          </span>{" "}
          changes what real users see in the admin app — not just this preview.
        </p>
      </div>

      {liveTheme ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-none border border-[rgba(154,52,18,0.28)] bg-[#FEF2F2] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#9A3412]">
              Live on product: {liveTheme.name}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#9A3412]/90">
              This company&apos;s admin shell is using promoted Design Lab
              tokens. Revert restores the default Altair chrome for everyone in
              this company.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setConfirm({ kind: "revert", themeName: liveTheme.name })
            }
            disabled={isPending}
            className="shrink-0 rounded-lg border border-[rgba(154,52,18,0.35)] bg-white px-3 py-2 text-xs font-semibold text-[#9A3412] transition-colors hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "revert" ? "Reverting…" : "Revert to default"}
          </button>
        </div>
      ) : (
        <div
          role="status"
          className="rounded-none border border-dashed border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-3 py-2 text-[11px] leading-snug text-[#6B6255]"
        >
          No live theme applied. This company is on the standard Altair product
          tokens. Set an active draft, then use{" "}
          <span className="font-semibold text-[#17130E]">
            Apply to live product
          </span>{" "}
          when you are ready.
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="design-lab-theme-name"
            className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A6324]"
          >
            Name
          </label>
          <input
            id="design-lab-theme-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (!isPending && name.trim()) {
                  handleSave();
                }
              }
            }}
            maxLength={80}
            placeholder="e.g. Deeper olive draft"
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-[rgba(138,99,36,0.18)] bg-white px-2.5 py-1.5 text-sm text-[#17130E] outline-none focus:border-[#B8943F] focus:ring-2 focus:ring-[#B8943F]/20"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className="rounded-lg border border-[#B8943F] bg-[#FFF3D6] px-3 py-2 text-xs font-semibold text-[#17130E] transition-colors hover:bg-[#FFE9B5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "save" ? "Saving…" : "Save current"}
        </button>
      </div>

      {message ? (
        <p className="text-xs text-[#3F6212]" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-[#9A3412]" role="alert">
          {error}
        </p>
      ) : null}

      {themes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[rgba(138,99,36,0.2)] bg-[#FFF9EA] px-3 py-2.5 text-xs text-[#6B6255]">
          No saved themes yet. Name the current palette and save it — it will
          survive a refresh.
        </p>
      ) : (
        <ul className="space-y-2">
          {themes.map((theme) => {
            const isLoaded = loadedThemeId === theme.id;
            const updateKey = `update:${theme.id}`;
            const activeKey = `active:${theme.id}`;
            const promoteKey = `promote:${theme.id}`;
            const deleteKey = `delete:${theme.id}`;

            return (
              <li
                key={theme.id}
                className={[
                  "rounded-xl border px-3 py-2.5",
                  theme.isLive
                    ? "border-[rgba(154,52,18,0.28)] bg-[#FFF7F5]"
                    : isLoaded
                      ? "border-[#B8943F] bg-[#FFF3D6]"
                      : "border-[rgba(138,99,36,0.14)] bg-white",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#17130E]">
                        {theme.name}
                      </span>
                      {theme.isLive ? (
                        <span className="rounded-sm border border-[rgba(154,52,18,0.28)] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9A3412]">
                          Live on product
                        </span>
                      ) : null}
                      {theme.isActive ? (
                        <span className="rounded-sm border border-[rgba(138,99,36,0.25)] bg-[#FFF9EA] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6324]">
                          Active draft
                        </span>
                      ) : null}
                      {isLoaded ? (
                        <span className="rounded-sm border border-[rgba(63,98,18,0.25)] bg-[#F3F8E8] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3F6212]">
                          In editor
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#6B6255]">
                      Updated {formatUpdatedAt(theme.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onLoadTheme(theme)}
                    disabled={isPending}
                    className="rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-2 py-1 text-[11px] font-semibold text-[#17130E] transition-colors hover:bg-[#F3EBDD] disabled:opacity-50"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate(theme)}
                    disabled={isPending}
                    className="rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-2 py-1 text-[11px] font-semibold text-[#17130E] transition-colors hover:bg-[#F3EBDD] disabled:opacity-50"
                  >
                    {pendingAction === updateKey
                      ? "Updating…"
                      : "Overwrite with current"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetActive(theme)}
                    disabled={isPending || theme.isActive}
                    className="rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-2 py-1 text-[11px] font-semibold text-[#17130E] transition-colors hover:bg-[#F3EBDD] disabled:opacity-50"
                  >
                    {pendingAction === activeKey
                      ? "Setting…"
                      : theme.isActive
                        ? "Active draft"
                        : "Set active"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "promote", theme })}
                    disabled={isPending || theme.isLive}
                    className="rounded-lg border border-[#B8943F] bg-[#FFF3D6] px-2 py-1 text-[11px] font-semibold text-[#17130E] transition-colors hover:bg-[#FFE9B5] disabled:opacity-50"
                  >
                    {pendingAction === promoteKey
                      ? "Applying…"
                      : theme.isLive
                        ? "Applied live"
                        : "Apply to live product"}
                  </button>
                  {theme.isLive ? (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({ kind: "revert", themeName: theme.name })
                      }
                      disabled={isPending}
                      className="rounded-lg border border-[rgba(154,52,18,0.28)] bg-[#FEF2F2] px-2 py-1 text-[11px] font-semibold text-[#9A3412] transition-colors hover:bg-[#FEE2E2] disabled:opacity-50"
                    >
                      {pendingAction === "revert"
                        ? "Reverting…"
                        : "Revert to default"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(theme)}
                    disabled={isPending}
                    className="rounded-lg border border-[rgba(154,52,18,0.25)] bg-[#FEF2F2] px-2 py-1 text-[11px] font-semibold text-[#9A3412] transition-colors hover:bg-[#FEE2E2] disabled:opacity-50"
                  >
                    {pendingAction === deleteKey ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AltairConfirmDialog
        open={confirm?.kind === "promote"}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title="Apply theme to live product?"
        description={
          confirm?.kind === "promote" ? (
            <>
              <span className="font-semibold text-altair-ink">
                “{confirm.theme.name}”
              </span>{" "}
              will change the real admin app chrome for every user in this
              company — Dashboard, Customers, Settings, and the rest — not just
              the Design Lab preview. You can revert to default Altair tokens
              anytime from this panel.
            </>
          ) : null
        }
        confirmLabel="Apply to live product"
        cancelLabel="Cancel"
        pending={confirmPending && pendingAction?.startsWith("promote:")}
        onConfirm={handleConfirmPromote}
      />

      <AltairConfirmDialog
        open={confirm?.kind === "revert"}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title="Revert to default product tokens?"
        description={
          confirm?.kind === "revert" ? (
            <>
              Remove the live override
              {confirm.themeName ? (
                <>
                  {" "}
                  for{" "}
                  <span className="font-semibold text-altair-ink">
                    “{confirm.themeName}”
                  </span>
                </>
              ) : null}
              . This company returns to the standard Altair chrome. Saved drafts
              stay in Design Lab.
            </>
          ) : null
        }
        confirmLabel="Revert to default"
        cancelLabel="Cancel"
        destructive
        pending={confirmPending && pendingAction === "revert"}
        onConfirm={handleConfirmRevert}
      />
    </section>
  );
}
