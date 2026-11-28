import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import {
  assertBusinessNumbersAccess,
  assertMatchingCompanyScope,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { isMissingDatabaseColumnError, mapDatabaseError } from "@/lib/database/errors";
import { isBusinessNumbersAvailableFor } from "@/lib/database/queries/business-numbers";
import { selectInChunks } from "@/lib/database/queries/chunked-in";
import type { ActiveCompanyContext, ServiceItemInsert, ServiceItemUpdate } from "@/lib/database/types/core-tables";
import { createClient } from "@/lib/supabase/server";
import {
  SERVICE_CALL_ITEM_NAME,
  SERVICE_CALL_SETUP_KEY,
  STARTER_CATEGORY,
  priceStarterLine,
} from "@/shared/lib/business-numbers/starter-price-list";
import { CUSTOM_SETUP_KEY_PATTERN, type PriceListStep, type ShopContactPatch } from "@/shared/types/business-setup";

/**
 * What the guided setup writes outside the business numbers row: the
 * company's contact details and its price book items.
 *
 * Everything here runs with the signed-in person's own session, so row level
 * security applies as it does everywhere else in the product, and every
 * function checks the caller is an owner or admin of exactly this company
 * first.
 *
 * ============ WHAT THE SETUP MAY TOUCH IN THE PRICE BOOK ============
 * Only items it made itself: the ones carrying a setup key (migration 219).
 * It never changes an item the owner made by hand, and it never deletes
 * anything. Within its own items:
 *   - one the owner has since priced by hand ("manual") or archived is left
 *     exactly as it is unless the owner ticks it again in the setup;
 *   - one the owner unticks is archived, which the price book can undo.
 *
 * ============ BEFORE THE MIGRATIONS HAVE RUN ============
 * The setup needs migration 218 (the numbers) and 219 (the price book's
 * pricing columns). getGuidedSetupAvailability() says whether both are here;
 * until they are, the setup is not offered anywhere and its page sends the
 * person back to the dashboard.
 */

/** 23505: unique violation. Two saves raced to create the same setup item. */
function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

const RACE_MESSAGE = "Some of these jobs were just added from another tab. Reload the page and check your price book.";

/**
 * Whether the guided setup can run for this person in this database: they
 * are an owner or admin, and both migrations are in.
 */
export async function getGuidedSetupAvailabilityFor(context: ActiveCompanyContext): Promise<boolean> {
  if (!(await isBusinessNumbersAvailableFor(context))) return false;

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_items")
    .select("id, book_hours, parts_markup_percent, price_source, setup_key")
    .eq("company_id", context.company.id)
    .limit(1);

  if (error && !isMissingDatabaseColumnError(error)) {
    console.error("[getGuidedSetupAvailability] probe failed:", { companyId: context.company.id, code: error.code });
  }
  return !error;
}

/** The same, for the signed-in company, asked once per request however many layouts, pages and cards ask. */
export const getGuidedSetupAvailability = cache(async function getGuidedSetupAvailability(): Promise<boolean> {
  const context = await getActiveCompanyContext();
  return context ? getGuidedSetupAvailabilityFor(context) : false;
});

/** A price book item the setup made, as it stands now. */
export type SetupPriceBookItem = {
  readonly key: string;
  readonly name: string;
  readonly bookHours: number | null;
  readonly partCost: number | null;
  readonly unitPrice: number;
  /** False when the owner has archived it or switched it off in the price book. */
  readonly active: boolean;
  /** True when the owner has typed their own price for it since. */
  readonly handPriced: boolean;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type SetupRow = {
  id: string;
  name: string;
  unit_cost: number | string | null;
  unit_price: number | string | null;
  book_hours?: number | string | null;
  price_source?: string | null;
  setup_key?: string | null;
  is_active: boolean | null;
  archived_at: string | null;
};

const SETUP_ROW_COLUMNS = "id, name, unit_cost, unit_price, book_hours, price_source, setup_key, is_active, archived_at";

async function readSetupRows(companyId: string): Promise<{ rows: SetupRow[]; error: { code?: string; message?: string } | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_items")
    .select(SETUP_ROW_COLUMNS)
    .eq("company_id", companyId)
    .not("setup_key", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return { rows: (data ?? []) as SetupRow[], error };
}

function toSetupItem(row: SetupRow & { setup_key: string }): SetupPriceBookItem {
  return {
    key: row.setup_key,
    name: row.name,
    bookHours: toNumber(row.book_hours),
    partCost: toNumber(row.unit_cost),
    unitPrice: toNumber(row.unit_price) ?? 0,
    active: row.archived_at === null && row.is_active !== false,
    // The service call item is always typed; "hand priced" is about jobs the rate used to price.
    handPriced: row.price_source !== "rate" && row.setup_key !== SERVICE_CALL_SETUP_KEY,
  };
}

/** Items the setup made for this company that are not in the trash, oldest first. */
export async function listSetupPriceBookItems(context: ActiveCompanyContext): Promise<SetupPriceBookItem[]> {
  if (assertBusinessNumbersAccess(context)) return [];

  const { rows, error } = await readSetupRows(context.company.id);
  if (error) {
    if (!isMissingDatabaseColumnError(error)) {
      console.error("[listSetupPriceBookItems] read failed:", { companyId: context.company.id, code: error.code });
    }
    return [];
  }

  return rows.filter((row): row is SetupRow & { setup_key: string } => typeof row.setup_key === "string").map(toSetupItem);
}

/**
 * Saves the contact boxes that were sent, and only those. It never writes the
 * time zone, name or trade: those have their own place in Settings > Company.
 */
export async function updateCompanyShopContact(
  companyId: string,
  context: ActiveCompanyContext,
  patch: ShopContactPatch,
): Promise<{ error: string | null }> {
  const accessError = assertBusinessNumbersAccess(context) ?? assertMatchingCompanyScope(context, companyId);
  if (accessError) return { error: accessError };

  const columns: { phone?: string | null; address_line1?: string | null; city?: string | null; state?: string | null; postal_code?: string | null } = {};
  if (patch.phone !== undefined) columns.phone = patch.phone;
  if (patch.addressLine1 !== undefined) columns.address_line1 = patch.addressLine1;
  if (patch.city !== undefined) columns.city = patch.city;
  if (patch.state !== undefined) columns.state = patch.state;
  if (patch.postalCode !== undefined) columns.postal_code = patch.postalCode;
  if (Object.keys(columns).length === 0) return { error: null };

  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").update(columns).eq("id", companyId).select("id").maybeSingle();

  if (error || !data) {
    console.error("[updateCompanyShopContact] update failed:", { companyId, code: error?.code });
    return { error: error ? mapDatabaseError(error) : "Your shop's details could not be saved. Try again." };
  }
  return { error: null };
}

/**
 * An item in the trash keeps its setup key. Before the setup makes that item
 * again, the old copy gives the key up, so the two can never collide: the
 * owner can still restore the old one (it comes back as an ordinary item)
 * instead of meeting "a record with these details already exists".
 */
async function releaseTrashedSetupKeys(companyId: string, keys: readonly string[]): Promise<{ code?: string } | null> {
  if (keys.length === 0) return null;
  const supabase = await createClient();
  const results = await selectInChunks<{ id: string }>(keys, (chunk) =>
    supabase.from("service_items").update({ setup_key: null }).eq("company_id", companyId).in("setup_key", chunk).not("deleted_at", "is", null).select("id"),
  );
  return results.error;
}

function newCustomKey(): string {
  return `custom_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/**
 * Turns the price list into price book items, each priced from the labor
 * rate: price = book hours x rate + part cost x (1 + markup), rounded up to a
 * whole dollar.
 *
 *   - A job that is already one of the setup's items (matched by its key, or
 *     for a job being added now, by a setup-made job of exactly that name, so
 *     a retry after a half-finished save lands on the same items) is updated
 *     in place, and comes back from the archive if it was there.
 *   - A job being added whose name belongs to an item the owner made by hand
 *     is refused rather than added a second time.
 *   - Everything else is added, with a key of its own.
 *   - A job in `removeKeys` is archived. Nothing is ever deleted here.
 */
export async function saveSetupPriceList(
  companyId: string,
  context: ActiveCompanyContext,
  step: PriceListStep,
  laborRate: number,
  afterHoursMultiplier: number,
): Promise<{ created: number; updated: number; removed: number; error: string | null }> {
  const none = { created: 0, updated: 0, removed: 0 };
  const accessError = assertBusinessNumbersAccess(context) ?? assertMatchingCompanyScope(context, companyId);
  if (accessError) return { ...none, error: accessError };
  if (!Number.isFinite(laborRate) || laborRate <= 0) {
    return { ...none, error: "Set your labor rate first. The price list is priced from it." };
  }

  const supabase = await createClient();
  const { rows, error: readError } = await readSetupRows(companyId);
  if (readError) {
    console.error("[saveSetupPriceList] read failed:", { companyId, code: readError.code });
    return { ...none, error: mapDatabaseError(readError) };
  }
  const byKey = new Map(rows.filter((row) => typeof row.setup_key === "string").map((row) => [row.setup_key as string, row]));
  const customByName = new Map(rows.filter((row) => typeof row.setup_key === "string" && CUSTOM_SETUP_KEY_PATTERN.test(row.setup_key)).map((row) => [row.name, row]));

  const inserts: ServiceItemInsert[] = [];
  const updates: { id: string; columns: ServiceItemUpdate }[] = [];
  const claimed = new Set<string>();

  for (const task of step.tasks) {
    const line = priceStarterLine(task, laborRate, step.markupPercent, afterHoursMultiplier);
    const pricing = {
      name: task.name,
      unit_cost: task.partCost > 0 ? task.partCost : null,
      unit_price: line.standard,
      book_hours: task.bookHours,
      parts_markup_percent: step.markupPercent,
      price_source: "rate" as const,
    };

    const existing = (task.key !== null ? byKey.get(task.key) : undefined) ?? (task.key === null || CUSTOM_SETUP_KEY_PATTERN.test(task.key) ? customByName.get(task.name) : undefined);
    if (existing && !claimed.has(existing.id)) {
      claimed.add(existing.id);
      updates.push({ id: existing.id, columns: { ...pricing, is_active: true, archived_at: null } });
      continue;
    }

    // A job being added now. One name, one item: if the owner already has an
    // item of exactly this name that the setup did not make, leave it alone
    // and say so. (One exact-match lookup per new job, not a list filter: a
    // name may hold commas, quotes and brackets.)
    const { data: clash, error: clashError } = await supabase.from("service_items").select("id").eq("company_id", companyId).eq("name", task.name).is("deleted_at", null).limit(1);
    if (clashError) {
      console.error("[saveSetupPriceList] name lookup failed:", { companyId, code: clashError.code });
      return { ...none, error: mapDatabaseError(clashError) };
    }
    if ((clash ?? []).length > 0) {
      return { ...none, error: `Your price book already has "${task.name}". Change the name here, or edit that item in your price book.` };
    }

    const isStarterKey = task.key !== null && !CUSTOM_SETUP_KEY_PATTERN.test(task.key);
    inserts.push({ ...pricing, company_id: companyId, description: null, taxable: true, category: STARTER_CATEGORY, is_active: true, setup_key: isStarterKey ? task.key : newCustomKey() });
  }

  let created = 0;
  if (inserts.length > 0) {
    const releaseError = await releaseTrashedSetupKeys(companyId, inserts.map((row) => row.setup_key).filter((key): key is string => typeof key === "string"));
    if (releaseError) {
      console.error("[saveSetupPriceList] releasing trashed keys failed:", { companyId, code: releaseError.code });
      return { ...none, error: mapDatabaseError(releaseError) };
    }
    const { data, error } = await supabase.from("service_items").insert(inserts).select("id");
    if (error) {
      if (isUniqueViolation(error)) return { ...none, error: RACE_MESSAGE };
      console.error("[saveSetupPriceList] insert failed:", { companyId, count: inserts.length, code: error.code });
      return { ...none, error: mapDatabaseError(error) };
    }
    created = data?.length ?? 0;
  }

  let updated = 0;
  for (const { id, columns } of updates) {
    const { error } = await supabase.from("service_items").update(columns).eq("id", id).eq("company_id", companyId);
    if (error) {
      console.error("[saveSetupPriceList] update failed:", { companyId, code: error.code });
      return { created, updated, removed: 0, error: mapDatabaseError(error) };
    }
    updated += 1;
  }

  // Jobs the owner unticked leave the price book the way the price book's own
  // "archive" does: switched off, kept, and one press from coming back.
  let removed = 0;
  const archivedAt = new Date().toISOString();
  for (const key of step.removeKeys) {
    const row = byKey.get(key);
    if (!row || claimed.has(row.id) || key === SERVICE_CALL_SETUP_KEY || row.archived_at !== null) continue;
    const { error } = await supabase.from("service_items").update({ archived_at: archivedAt, is_active: false }).eq("id", row.id).eq("company_id", companyId).is("archived_at", null);
    if (error) {
      console.error("[saveSetupPriceList] archive failed:", { companyId, code: error.code });
      return { created, updated, removed, error: mapDatabaseError(error) };
    }
    removed += 1;
  }

  return { created, updated, removed, error: null };
}

/**
 * Keeps the "Service call" item in the price book at the company's fee, so
 * the fee is one press away on every estimate.
 *
 * @param createIfMissing the guided setup makes the item on its first save.
 *   Settings > Numbers only keeps an existing one in step: it does not put a
 *   new item in a price book the owner never asked it to.
 */
export async function saveServiceCallItem(
  companyId: string,
  context: ActiveCompanyContext,
  fee: number | null,
  options: { readonly createIfMissing: boolean },
): Promise<{ error: string | null }> {
  const accessError = assertBusinessNumbersAccess(context) ?? assertMatchingCompanyScope(context, companyId);
  if (accessError) return { error: accessError };
  if (fee === null || !Number.isFinite(fee) || fee <= 0) return { error: null };

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("service_items")
    .select("id")
    .eq("company_id", companyId)
    .eq("setup_key", SERVICE_CALL_SETUP_KEY)
    .is("deleted_at", null)
    .maybeSingle();

  if (readError) {
    if (isMissingDatabaseColumnError(readError)) return { error: null };
    console.error("[saveServiceCallItem] lookup failed:", { companyId, code: readError.code });
    return { error: mapDatabaseError(readError) };
  }

  if (existing) {
    // The price only. Whether the item is active or archived is the owner's call in the price book.
    const { error } = await supabase.from("service_items").update({ unit_price: fee }).eq("id", existing.id).eq("company_id", companyId);
    if (error) {
      console.error("[saveServiceCallItem] update failed:", { companyId, code: error.code });
      return { error: mapDatabaseError(error) };
    }
    return { error: null };
  }

  if (!options.createIfMissing) return { error: null };

  const releaseError = await releaseTrashedSetupKeys(companyId, [SERVICE_CALL_SETUP_KEY]);
  if (releaseError) {
    console.error("[saveServiceCallItem] releasing a trashed key failed:", { companyId, code: releaseError.code });
    return { error: mapDatabaseError(releaseError) };
  }

  const { error } = await supabase.from("service_items").insert({
    company_id: companyId,
    name: SERVICE_CALL_ITEM_NAME,
    description: null,
    unit_cost: null,
    unit_price: fee,
    taxable: true,
    category: STARTER_CATEGORY,
    is_active: true,
    price_source: "manual",
    setup_key: SERVICE_CALL_SETUP_KEY,
  });
  // Another tab made it a moment ago: the item exists at a fee, which is what was wanted.
  if (error && !isUniqueViolation(error)) {
    console.error("[saveServiceCallItem] insert failed:", { companyId, code: error.code });
    return { error: mapDatabaseError(error) };
  }
  return { error: null };
}
