"use server";

import { revalidatePath } from "next/cache";
import { assertCompanySettingsAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import {
  createDesignLabTheme,
  deleteDesignLabTheme,
  getDesignLabThemeById,
  listDesignLabThemes,
  promoteDesignLabThemeToLive,
  revertLiveDesignLabTheme,
  setActiveDesignLabTheme,
  updateDesignLabTheme,
} from "@/lib/database/queries/design-lab-themes";
import {
  parseDesignLabThemeTokens,
  serializeDesignLabTokens,
  validateDesignLabTokensForSave,
} from "@/shared/components/platform-admin/design-lab/design-lab-theme-tokens";
import { buildDesignLabLiveStyleVars } from "@/shared/components/platform-admin/design-lab/design-lab-live-vars";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  type DesignLabDimensions,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";
import type { DesignLabShineMap } from "@/shared/components/platform-admin/design-lab/design-lab-shine";
import type { DesignLabTheme } from "@/shared/types/design-lab-theme";

export type DesignLabThemeActionResult = {
  error?: string;
  success?: string;
  theme?: DesignLabTheme;
  themes?: DesignLabTheme[];
};

const DESIGN_LAB_PATH = "/platform/design-lab";
const MAX_THEME_NAME_LENGTH = 80;

function revalidateDesignLabPaths() {
  revalidatePath(DESIGN_LAB_PATH);
}

/** Invalidate admin shell layout so live token injection updates without a hard refresh. */
function revalidateLiveThemePaths() {
  revalidateDesignLabPaths();
  revalidatePath("/", "layout");
}

async function requireDesignLabThemeAccess(): Promise<
  | { error: string }
  | {
      companyId: string;
      userId: string;
    }
> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!canAccessPlatformAdmin(context.user)) {
    return { error: "You do not have permission to manage Design Lab themes." };
  }

  const settingsError = assertCompanySettingsAccess(context);
  if (settingsError) {
    return { error: settingsError };
  }

  return {
    companyId: context.company.id,
    userId: context.user.id,
  };
}

function normalizeThemeName(name: string): string | { error: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Theme name is required." };
  }
  if (trimmed.length > MAX_THEME_NAME_LENGTH) {
    return {
      error: `Theme name must be ${MAX_THEME_NAME_LENGTH} characters or fewer.`,
    };
  }
  return trimmed;
}

function resolveColorsForSave(
  colors: DesignLabColors | Record<string, string>,
  shines: DesignLabShineMap = {},
  dimensions: DesignLabDimensions = LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
):
  | {
      colors: DesignLabColors;
      shines: DesignLabShineMap;
      dimensions: DesignLabDimensions;
    }
  | { error: string } {
  // Accept either editor camelCase colors or CSS-var-keyed maps.
  const looksLikeCssVarMap = Object.keys(colors).some((key) =>
    key.startsWith("--"),
  );

  if (looksLikeCssVarMap) {
    const parsed = parseDesignLabThemeTokens(colors as Record<string, string>);
    if (!parsed) {
      return { error: "Theme tokens are invalid or empty." };
    }
    const mergedShines = { ...parsed.shines, ...shines };
    const mergedDimensions = { ...parsed.dimensions, ...dimensions };
    const validationError = validateDesignLabTokensForSave(
      parsed.colors,
      mergedShines,
      mergedDimensions,
    );
    if (validationError) {
      return { error: validationError };
    }
    return {
      colors: parsed.colors,
      shines: mergedShines,
      dimensions: mergedDimensions,
    };
  }

  const editorColors = colors as DesignLabColors;
  const validationError = validateDesignLabTokensForSave(
    editorColors,
    shines,
    dimensions,
  );
  if (validationError) {
    return { error: validationError };
  }
  return { colors: editorColors, shines, dimensions };
}

export async function listDesignLabThemesAction(): Promise<DesignLabThemeActionResult> {
  const access = await requireDesignLabThemeAccess();
  if ("error" in access) {
    return { error: access.error };
  }

  const themes = await listDesignLabThemes(access.companyId);
  return { themes };
}

export async function saveDesignLabThemeAction(input: {
  name: string;
  colors: DesignLabColors | Record<string, string>;
  shines?: DesignLabShineMap;
  dimensions?: DesignLabDimensions;
}): Promise<DesignLabThemeActionResult> {
  const access = await requireDesignLabThemeAccess();
  if ("error" in access) {
    return { error: access.error };
  }

  const nameResult = normalizeThemeName(input.name);
  if (typeof nameResult !== "string") {
    return { error: nameResult.error };
  }

  const colorsResult = resolveColorsForSave(
    input.colors,
    input.shines,
    input.dimensions,
  );
  if ("error" in colorsResult) {
    return { error: colorsResult.error };
  }

  const { theme, error } = await createDesignLabTheme(
    access.companyId,
    access.userId,
    {
      name: nameResult,
      tokens: serializeDesignLabTokens(
        colorsResult.colors,
        colorsResult.shines,
        colorsResult.dimensions,
      ),
    },
  );

  if (error || !theme) {
    return { error: error ?? "Failed to save theme." };
  }

  revalidateDesignLabPaths();
  return { theme, success: "Theme saved." };
}

export async function updateDesignLabThemeAction(input: {
  themeId: string;
  name?: string;
  colors?: DesignLabColors | Record<string, string>;
  shines?: DesignLabShineMap;
  dimensions?: DesignLabDimensions;
}): Promise<DesignLabThemeActionResult> {
  const access = await requireDesignLabThemeAccess();
  if ("error" in access) {
    return { error: access.error };
  }

  if (!input.themeId.trim()) {
    return { error: "Theme id is required." };
  }

  let name: string | undefined;
  if (input.name !== undefined) {
    const nameResult = normalizeThemeName(input.name);
    if (typeof nameResult !== "string") {
      return { error: nameResult.error };
    }
    name = nameResult;
  }

  let tokens: Record<string, string> | undefined;
  if (input.colors !== undefined) {
    const colorsResult = resolveColorsForSave(
      input.colors,
      input.shines,
      input.dimensions,
    );
    if ("error" in colorsResult) {
      return { error: colorsResult.error };
    }
    tokens = serializeDesignLabTokens(
      colorsResult.colors,
      colorsResult.shines,
      colorsResult.dimensions,
    );
  }

  const { theme, error } = await updateDesignLabTheme(
    access.companyId,
    input.themeId,
    { name, tokens },
  );

  if (error || !theme) {
    return { error: error ?? "Failed to update theme." };
  }

  if (theme.isLive) {
    revalidateLiveThemePaths();
  } else {
    revalidateDesignLabPaths();
  }
  return { theme, success: "Theme updated." };
}

export async function deleteDesignLabThemeAction(
  themeId: string,
): Promise<DesignLabThemeActionResult> {
  const access = await requireDesignLabThemeAccess();
  if ("error" in access) {
    return { error: access.error };
  }

  if (!themeId.trim()) {
    return { error: "Theme id is required." };
  }

  const existing = await getDesignLabThemeById(access.companyId, themeId);
  const { error } = await deleteDesignLabTheme(access.companyId, themeId);
  if (error) {
    return { error };
  }

  if (existing?.isLive) {
    revalidateLiveThemePaths();
  } else {
    revalidateDesignLabPaths();
  }
  return { success: "Theme deleted." };
}

export async function setActiveDesignLabThemeAction(
  themeId: string,
): Promise<DesignLabThemeActionResult> {
  const access = await requireDesignLabThemeAccess();
  if ("error" in access) {
    return { error: access.error };
  }

  if (!themeId.trim()) {
    return { error: "Theme id is required." };
  }

  const { theme, error } = await setActiveDesignLabTheme(
    access.companyId,
    themeId,
  );

  if (error || !theme) {
    return { error: error ?? "Failed to set active theme." };
  }

  revalidateDesignLabPaths();
  return {
    theme,
    success:
      "Active draft updated. This does not change the live product — use Apply to live product to promote.",
  };
}

/**
 * Apply a saved theme to live admin chrome for the active company.
 * Distinct from save (persist draft) and set-active (draft bookmark).
 */
export async function promoteDesignLabThemeToLiveAction(
  themeId: string,
): Promise<DesignLabThemeActionResult> {
  const access = await requireDesignLabThemeAccess();
  if ("error" in access) {
    return { error: access.error };
  }

  if (!themeId.trim()) {
    return { error: "Theme id is required." };
  }

  const existing = await getDesignLabThemeById(access.companyId, themeId);
  if (!existing) {
    return { error: "Saved theme not found." };
  }

  const parsed = parseDesignLabThemeTokens(existing.tokens);
  if (!parsed) {
    return {
      error:
        "Theme tokens are invalid or empty. Load the theme, fix colors, and overwrite before promoting.",
    };
  }

  const validationError = validateDesignLabTokensForSave(
    parsed.colors,
    parsed.shines,
  );
  if (validationError) {
    return { error: validationError };
  }

  // Fail closed: refuse to promote a map that cannot produce safe CSS vars.
  if (!buildDesignLabLiveStyleVars(existing.tokens)) {
    return { error: "Theme tokens could not be resolved for live chrome." };
  }

  const { theme, error } = await promoteDesignLabThemeToLive(
    access.companyId,
    themeId,
  );

  if (error || !theme) {
    return { error: error ?? "Failed to apply theme to live product." };
  }

  revalidateLiveThemePaths();
  return {
    theme,
    success:
      "Theme applied to the live product for this company. Open Dashboard or any admin page to see it.",
  };
}

/**
 * Remove the company's live theme override and restore default product tokens.
 */
export async function revertLiveDesignLabThemeAction(): Promise<DesignLabThemeActionResult> {
  const access = await requireDesignLabThemeAccess();
  if ("error" in access) {
    return { error: access.error };
  }

  const { theme, error } = await revertLiveDesignLabTheme(access.companyId);

  if (error) {
    return { error };
  }

  revalidateLiveThemePaths();
  return {
    theme: theme ?? undefined,
    success:
      theme
        ? "Live theme removed. This company is back on the default Altair product tokens."
        : "No live theme was applied.",
  };
}
