import fs from "node:fs";
import path from "node:path";

export type RepoMigrationCatalog =
  | {
      ok: true;
      count: number;
      files: string[];
      latest: string;
    }
  | {
      ok: false;
      reason: string;
    };

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

export function getRepoMigrationCatalog(): RepoMigrationCatalog {
  try {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      return {
        ok: false,
        reason: "No SQL migration files were found in supabase/migrations.",
      };
    }

    return {
      ok: true,
      count: files.length,
      files,
      latest: files[files.length - 1]!,
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : "Could not read supabase/migrations.",
    };
  }
}

/** Recent migrations whose artifacts must exist on the connected database. */
export const REQUIRED_DATABASE_MARKERS = [
  {
    migration: "100_company_payment_accounts_foundation.sql",
    label: "company payment accounts",
  },
  {
    migration: "101_stripe_checkout_payment_recording.sql",
    label: "Stripe checkout payment recording RPC",
  },
  {
    migration: "102_sms_opt_outs_foundation.sql",
    label: "SMS opt-out persistence",
  },
] as const;
