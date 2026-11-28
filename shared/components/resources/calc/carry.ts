"use client";

import { useEffect, useState } from "react";

/**
 * "Carry my numbers": the labor numbers one free tool hands to the next.
 *
 * ============ NOTHING LEAVES THE BROWSER ============
 * The Labor Cost Workspace and the quick labor rate calculator write their
 * latest result here (this browser's localStorage, one key). The other
 * calculators read it and offer a "Use my labor rate" button; nothing is
 * filled in until the visitor presses it. There is no request, no cookie and
 * no analytics payload with a number in it. Every read is validated, so a
 * hand-edited or stale value cannot put text or a negative rate in a field.
 */

export const CARRY_STORAGE_KEY = "altair-tool:my-numbers:v1";
const CHANGE_EVENT = "altair-carry-change";

export type CarrySource = "labor-workspace" | "labor-rate";

export const CARRY_SOURCE_NAMES: Record<CarrySource, string> = {
  "labor-workspace": "Labor Cost Workspace",
  "labor-rate": "quick labor rate calculator",
};

export type CarriedNumbers = {
  readonly source: CarrySource;
  /** When it was written, ms since 1970. */
  readonly savedAt: number;
  /** The rate to quote, rounded up to the dollar. */
  readonly billedRate: number;
  /** Cost of one billed hour (the break-even rate). */
  readonly costPerBilledHour: number;
  /** Wage plus burden for one paid hour. */
  readonly loadedLaborCost: number;
  /** Average technician wage. */
  readonly averageWage: number;
  /** Whole-company overhead per month (the workspace only). */
  readonly monthlyOverhead: number | null;
  /** Field technicians on the payroll (the workspace only). */
  readonly techCount: number | null;
};

export type CarryKey = "billedRate" | "costPerBilledHour" | "loadedLaborCost" | "averageWage" | "monthlyOverhead" | "techCount";

const cents = (value: number) => Math.round(value * 100) / 100;

function positive(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max ? value : null;
}

/** Only known fields, only sane positive numbers; anything else is no carry at all. */
export function parseCarried(raw: unknown): CarriedNumbers | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const source = r.source === "labor-workspace" || r.source === "labor-rate" ? r.source : null;
  const savedAt = positive(r.savedAt, 8.64e15);
  const billedRate = positive(r.billedRate, 10000);
  const costPerBilledHour = positive(r.costPerBilledHour, 10000);
  const loadedLaborCost = positive(r.loadedLaborCost, 10000);
  const averageWage = positive(r.averageWage, 10000);
  if (!source || !savedAt || !billedRate || !costPerBilledHour || !loadedLaborCost || !averageWage) return null;
  const techCount = positive(r.techCount, 500);
  return {
    source,
    savedAt,
    billedRate,
    costPerBilledHour,
    loadedLaborCost,
    averageWage,
    monthlyOverhead: positive(r.monthlyOverhead, 100_000_000),
    techCount: techCount === null ? null : Math.round(techCount),
  };
}

export function readCarried(): CarriedNumbers | null {
  try {
    const raw = window.localStorage.getItem(CARRY_STORAGE_KEY);
    return raw ? parseCarried(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/** Writes the latest labor numbers. Returns false when storage is blocked. */
export function writeCarried(input: Omit<CarriedNumbers, "savedAt">): boolean {
  const value: CarriedNumbers = {
    ...input,
    savedAt: Date.now(),
    billedRate: cents(input.billedRate),
    costPerBilledHour: cents(input.costPerBilledHour),
    loadedLaborCost: cents(input.loadedLaborCost),
    averageWage: cents(input.averageWage),
    monthlyOverhead: input.monthlyOverhead === null ? null : cents(input.monthlyOverhead),
  };
  if (!parseCarried(value)) return false;
  try {
    // Inside another website's frame (an embedded calculator) nothing is kept:
    // that page could have opened the calculator with numbers of its choosing.
    if (window.self !== window.top) return false;
    const before = window.localStorage.getItem(CARRY_STORAGE_KEY);
    const next = JSON.stringify(value);
    // Skip the write (and the event) when only the time changed.
    if (before) {
      const old = parseCarried(JSON.parse(before) as unknown);
      if (old && JSON.stringify({ ...old, savedAt: 0 }) === JSON.stringify({ ...value, savedAt: 0 })) return true;
    }
    window.localStorage.setItem(CARRY_STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function forgetCarried(): void {
  try {
    window.localStorage.removeItem(CARRY_STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // nothing stored, or storage blocked
  }
}

/** The carried numbers, read after mount and kept current across tabs. */
export function useCarried(): CarriedNumbers | null {
  const [carried, setCarried] = useState<CarriedNumbers | null>(null);
  useEffect(() => {
    const sync = () => setCarried(readCarried());
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CARRY_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);
  return carried;
}

/** A carried value as the text a field holds: cents, no trailing zeros. */
export function carryText(value: number): string {
  const rounded = cents(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, "");
}
