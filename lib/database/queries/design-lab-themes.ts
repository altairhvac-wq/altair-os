import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  DesignLabThemeInsert,
  DesignLabThemeRow,
  DesignLabThemeTokens,
  DesignLabThemeUpdate,
} from "@/lib/database/types/core-tables";
import type { DesignLabTheme } from "@/shared/types/design-lab-theme";

function isTokenMap(value: unknown): value is DesignLabThemeTokens {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}

function mapDesignLabThemeRow(row: DesignLabThemeRow): DesignLabTheme {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    tokens: isTokenMap(row.tokens) ? row.tokens : {},
    isActive: row.is_active,
    isLive: Boolean(row.is_live),
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDesignLabThemes(
  companyId: string,
): Promise<DesignLabTheme[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("design_lab_themes")
    .select("*")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listDesignLabThemes] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as DesignLabThemeRow[]).map(mapDesignLabThemeRow);
}

export async function getDesignLabThemeById(
  companyId: string,
  themeId: string,
): Promise<DesignLabTheme | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("design_lab_themes")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", themeId)
    .maybeSingle();

  if (error) {
    console.error("[getDesignLabThemeById] query failed:", {
      companyId,
      themeId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return mapDesignLabThemeRow(data as DesignLabThemeRow);
}

export async function createDesignLabTheme(
  companyId: string,
  createdBy: string,
  input: {
    name: string;
    tokens: DesignLabThemeTokens;
    isActive?: boolean;
    isLive?: boolean;
  },
): Promise<{ theme: DesignLabTheme | null; error: string | null }> {
  const supabase = await createClient();

  const insert: DesignLabThemeInsert = {
    company_id: companyId,
    created_by: createdBy,
    name: input.name.trim(),
    tokens: input.tokens,
    is_active: input.isActive ?? false,
    is_live: input.isLive ?? false,
  };

  const { data: row, error } = await supabase
    .from("design_lab_themes")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    console.error("[createDesignLabTheme] insert failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { theme: null, error: mapDatabaseError(error) };
  }

  return {
    theme: mapDesignLabThemeRow(row as DesignLabThemeRow),
    error: null,
  };
}

export async function updateDesignLabTheme(
  companyId: string,
  themeId: string,
  input: {
    name?: string;
    tokens?: DesignLabThemeTokens;
  },
): Promise<{ theme: DesignLabTheme | null; error: string | null }> {
  const supabase = await createClient();

  const update: DesignLabThemeUpdate = {};
  if (input.name !== undefined) {
    update.name = input.name.trim();
  }
  if (input.tokens !== undefined) {
    update.tokens = input.tokens;
  }

  if (Object.keys(update).length === 0) {
    return { theme: null, error: "Nothing to update." };
  }

  const { data: row, error } = await supabase
    .from("design_lab_themes")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", themeId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateDesignLabTheme] update failed:", {
      companyId,
      themeId,
      code: error.code,
      message: error.message,
    });
    return { theme: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { theme: null, error: "Saved theme not found." };
  }

  return {
    theme: mapDesignLabThemeRow(row as DesignLabThemeRow),
    error: null,
  };
}

export async function deleteDesignLabTheme(
  companyId: string,
  themeId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("design_lab_themes")
    .delete()
    .eq("company_id", companyId)
    .eq("id", themeId);

  if (error) {
    console.error("[deleteDesignLabTheme] delete failed:", {
      companyId,
      themeId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

/**
 * Marks one theme as the company's active draft bookmark. Does not apply
 * chrome live — use promoteDesignLabThemeToLive for product injection.
 */
export async function setActiveDesignLabTheme(
  companyId: string,
  themeId: string,
): Promise<{ theme: DesignLabTheme | null; error: string | null }> {
  const supabase = await createClient();

  const existing = await getDesignLabThemeById(companyId, themeId);
  if (!existing) {
    return { theme: null, error: "Saved theme not found." };
  }

  if (existing.isActive) {
    return { theme: existing, error: null };
  }

  const { error: clearError } = await supabase
    .from("design_lab_themes")
    .update({ is_active: false })
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (clearError) {
    console.error("[setActiveDesignLabTheme] clear active failed:", {
      companyId,
      themeId,
      code: clearError.code,
      message: clearError.message,
    });
    return { theme: null, error: mapDatabaseError(clearError) };
  }

  const { data: row, error } = await supabase
    .from("design_lab_themes")
    .update({ is_active: true })
    .eq("company_id", companyId)
    .eq("id", themeId)
    .select("*")
    .single();

  if (error) {
    console.error("[setActiveDesignLabTheme] set active failed:", {
      companyId,
      themeId,
      code: error.code,
      message: error.message,
    });
    return { theme: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { theme: null, error: "Saved theme not found." };
  }

  return {
    theme: mapDesignLabThemeRow(row as DesignLabThemeRow),
    error: null,
  };
}

/**
 * Returns the company theme currently promoted to live chrome, if any.
 * Cached per request for admin layout injection.
 */
export const getLiveDesignLabTheme = cache(
  async (companyId: string): Promise<DesignLabTheme | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("design_lab_themes")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_live", true)
      .maybeSingle();

    if (error) {
      console.error("[getLiveDesignLabTheme] query failed:", {
        companyId,
        code: error.code,
        message: error.message,
      });
      return null;
    }

    if (!data) {
      return null;
    }

    return mapDesignLabThemeRow(data as DesignLabThemeRow);
  },
);

/**
 * Promotes a saved theme to live product chrome for the company.
 * Sets is_live (and aligns is_active) after clearing any previous live row.
 */
export async function promoteDesignLabThemeToLive(
  companyId: string,
  themeId: string,
): Promise<{ theme: DesignLabTheme | null; error: string | null }> {
  const supabase = await createClient();

  const existing = await getDesignLabThemeById(companyId, themeId);
  if (!existing) {
    return { theme: null, error: "Saved theme not found." };
  }

  if (existing.isLive) {
    return { theme: existing, error: null };
  }

  const { error: clearLiveError } = await supabase
    .from("design_lab_themes")
    .update({ is_live: false })
    .eq("company_id", companyId)
    .eq("is_live", true);

  if (clearLiveError) {
    console.error("[promoteDesignLabThemeToLive] clear live failed:", {
      companyId,
      themeId,
      code: clearLiveError.code,
      message: clearLiveError.message,
    });
    return { theme: null, error: mapDatabaseError(clearLiveError) };
  }

  if (!existing.isActive) {
    const { error: clearActiveError } = await supabase
      .from("design_lab_themes")
      .update({ is_active: false })
      .eq("company_id", companyId)
      .eq("is_active", true);

    if (clearActiveError) {
      console.error("[promoteDesignLabThemeToLive] clear active failed:", {
        companyId,
        themeId,
        code: clearActiveError.code,
        message: clearActiveError.message,
      });
      return { theme: null, error: mapDatabaseError(clearActiveError) };
    }
  }

  const { data: row, error } = await supabase
    .from("design_lab_themes")
    .update({ is_live: true, is_active: true })
    .eq("company_id", companyId)
    .eq("id", themeId)
    .select("*")
    .single();

  if (error) {
    console.error("[promoteDesignLabThemeToLive] promote failed:", {
      companyId,
      themeId,
      code: error.code,
      message: error.message,
    });
    return { theme: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { theme: null, error: "Saved theme not found." };
  }

  return {
    theme: mapDesignLabThemeRow(row as DesignLabThemeRow),
    error: null,
  };
}

/**
 * Clears the company's live theme override so product chrome returns to
 * default globals.css tokens. Leaves saved drafts (and is_active) intact.
 */
export async function revertLiveDesignLabTheme(
  companyId: string,
): Promise<{ theme: DesignLabTheme | null; error: string | null }> {
  const supabase = await createClient();

  const live = await getLiveDesignLabTheme(companyId);
  if (!live) {
    return { theme: null, error: null };
  }

  const { data: row, error } = await supabase
    .from("design_lab_themes")
    .update({ is_live: false })
    .eq("company_id", companyId)
    .eq("id", live.id)
    .select("*")
    .single();

  if (error) {
    console.error("[revertLiveDesignLabTheme] revert failed:", {
      companyId,
      themeId: live.id,
      code: error.code,
      message: error.message,
    });
    return { theme: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { theme: null, error: "Live theme not found." };
  }

  return {
    theme: mapDesignLabThemeRow(row as DesignLabThemeRow),
    error: null,
  };
}
