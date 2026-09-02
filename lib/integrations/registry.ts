import "server-only";

/**
 * Provider → adapter resolution.
 *
 * ==================== WHY THE LOADERS ARE LAZY ====================
 * Each entry is a function that imports its adapter, not the adapter itself.
 * A static `import { youtubeAdapter } from "./youtube/adapter"` at the top of
 * this file would mean that ANY module reaching for the registry — the
 * Integrations page rendering nine status cards, a Server Action deciding
 * whether a connect link should be shown, a verifier — pulls every
 * provider's transport layer, every provider's `env.ts`, and therefore every
 * provider's `process.env` read into its module graph. Nine providers'
 * worth of that is a slow cold start for the common case, which is a page
 * that publishes nothing.
 *
 * Laziness also keeps the failure local: a provider whose adapter module
 * throws at import time (a missing env read at module scope is the classic)
 * breaks that provider's resolution, not every page that mentions
 * integrations.
 *
 * ====================== WHY THERE IS NO DEFAULT ======================
 * `resolveIntegrationAdapter` returns a discriminated result and NEVER falls
 * back to another adapter. There is no "generic OAuth2 adapter", no
 * `?? facebookAdapter`, no throwing a shape the caller might paper over. An
 * unregistered provider is refused with a reason, because the alternative —
 * quietly routing a LinkedIn publish through whichever adapter happened to
 * be the default — posts real content to the wrong real account. Failing
 * closed here costs an operator an error message; failing open costs them a
 * post on somebody else's brand.
 */
import { capabilityFor } from "@/shared/types/integration-capability";
import {
  isIntegrationProvider,
  type IntegrationProvider,
} from "@/shared/types/integration-provider";
import type { IntegrationAdapter } from "./port";

export type IntegrationAdapterLoader = () => Promise<IntegrationAdapter>;

/**
 * The registration table. One line per provider, added when that provider's
 * adapter module exists:
 *
 *   youtube: () => import("./youtube/adapter").then((m) => m.youtubeAdapter),
 *
 * Deliberately a plain `Partial` record rather than a mutable registry with
 * a `register()` call. A registry populated by import side effects resolves
 * differently depending on what a request happened to import first, which is
 * the kind of order dependence that shows up only under load. This table is
 * the same on every request and is greppable: "which providers can actually
 * be reached?" is answered by reading it.
 */
const ADAPTER_LOADERS: Readonly<
  Partial<Record<IntegrationProvider, IntegrationAdapterLoader>>
> = {
  // The first and, for now, only wired adapter. Every other provider
  // resolves to ADAPTER_NOT_REGISTERED, which is the honest answer: the
  // capability matrix describing a provider is not the same as this
  // deployment being able to reach it.
  youtube: () => import("./youtube/adapter").then((m) => m.youtubeAdapter),
  // The first-party surface. It reaches an internal database write rather
  // than a provider API — the dispatcher routes on the adapter's kind, and
  // this one exposes `publishFirstParty` instead of `publish`.
  altair_site: () =>
    import("./altair-site/adapter").then((m) => m.altairSiteAdapter),
};

export const ADAPTER_RESOLUTION_FAILURES = [
  /** The string is not a provider this codebase knows at all. */
  "UNKNOWN_PROVIDER",
  /** A known provider with no adapter wired up yet. */
  "NOT_REGISTERED",
  /** The adapter module exists but could not be imported. */
  "LOAD_FAILED",
  /** The loaded adapter names a different provider than the one requested. */
  "PROVIDER_MISMATCH",
  /** The loaded adapter's kind disagrees with the capability matrix. */
  "KIND_MISMATCH",
] as const;
export type AdapterResolutionFailure =
  (typeof ADAPTER_RESOLUTION_FAILURES)[number];

/**
 * What the identity check alone can report. Drawn FROM the resolution union
 * rather than spelled again, so the check cannot answer with a reason
 * `resolveIntegrationAdapter` has no case for.
 */
export type AdapterIdentityFailure = Extract<
  AdapterResolutionFailure,
  "UNKNOWN_PROVIDER" | "PROVIDER_MISMATCH" | "KIND_MISMATCH"
>;

export type AdapterResolution =
  | { readonly ok: true; readonly adapter: IntegrationAdapter }
  | {
      readonly ok: false;
      readonly reason: AdapterResolutionFailure;
      readonly detail: string;
    };

/** Which providers can actually be reached on this deployment. */
export function registeredAdapterProviders(): IntegrationProvider[] {
  return Object.keys(ADAPTER_LOADERS).filter(isIntegrationProvider);
}

export function isIntegrationAdapterRegistered(value: string): boolean {
  return (
    isIntegrationProvider(value) && ADAPTER_LOADERS[value] !== undefined
  );
}

/**
 * Does this adapter actually belong to the provider it was loaded for?
 *
 * Pure, exported, and checked on every resolution rather than trusted,
 * because both ways of getting this wrong are silent. A copy-pasted adapter
 * that still says `provider: "facebook"` would publish a LinkedIn post to a
 * Facebook Page with a token that happens to work. A `kind` that disagrees
 * with the capability matrix — an adapter declaring `kind: "publisher"` for
 * Higgsfield — would hand the publish gate a `publish` method for a provider
 * the matrix says can never receive a post, which is the exact confusion
 * `integration-provider.ts` warns about under KIND IS NOT A CAPABILITY.
 *
 * Takes a `string` for the same reason `resolveIntegrationAdapter` does, and
 * narrows before it indexes anything. `capabilityFor` is a total record
 * lookup over the provider union and nothing more: handed a name from outside
 * it — a `marketing_connected_accounts.provider` written before the union
 * knew that value, a route segment, a JS caller with no types at all — it
 * returns `undefined`, and reading `.kind` off that throws a TypeError out of
 * a module whose whole contract is that a bad provider comes back as a
 * REASON. Thrown, it would land in a caller's `catch` and be settled as a
 * provider failure: a delivery marked failed against an integration that was
 * never contacted, and an operator sent to look at an API for a call that
 * never left the process.
 *
 * The guard is not redundant with the comparison below it, however much it
 * looks it. `adapter.provider !== provider` narrows `provider` to
 * `IntegrationProvider` for the compiler — an equality check against a
 * literal union does that — so the matrix lookup afterwards type checks with
 * the guard deleted, and then throws the moment an adapter agrees with an
 * unknown provider name. Only the runtime check refuses that pair.
 *
 * Returns null when the pairing is sound.
 */
export function validateAdapterIdentity(
  provider: string,
  adapter: IntegrationAdapter,
): AdapterIdentityFailure | null {
  if (!isIntegrationProvider(provider)) return "UNKNOWN_PROVIDER";
  if (adapter.provider !== provider) return "PROVIDER_MISMATCH";
  if (adapter.kind !== capabilityFor(provider).kind) return "KIND_MISMATCH";
  return null;
}

/**
 * The operator-facing sentence for an identity failure.
 *
 * A `switch` with no `default` and a declared `string` return, so a fourth
 * identity failure is a compile error here rather than a resolution that
 * refuses a publish without saying why.
 */
function describeIdentityFailure(
  provider: IntegrationProvider,
  adapter: IntegrationAdapter,
  failure: AdapterIdentityFailure,
): string {
  switch (failure) {
    case "UNKNOWN_PROVIDER":
      // Unreachable from `resolveIntegrationAdapter`, which has already
      // narrowed. Written out rather than folded into another branch: the
      // alternative is a fallback that would print the KIND_MISMATCH
      // sentence for a case it does not describe.
      return `${provider} is not an integration provider this system knows.`;
    case "PROVIDER_MISMATCH":
      return `The adapter registered for ${provider} reports itself as ${adapter.provider}.`;
    case "KIND_MISMATCH":
      return `The adapter registered for ${provider} reports kind ${adapter.kind}, but the capability matrix says ${capabilityFor(provider).kind}.`;
  }
}

/**
 * Resolve a provider to its adapter, or say why not.
 *
 * Takes a `string` rather than an `IntegrationProvider` on purpose: the
 * values that reach this function come from a database column, a route
 * segment, or a form field, and forcing every caller to cast before asking
 * is how an unvalidated string ends up asserted into the union upstream.
 * The narrowing happens here, once.
 */
export async function resolveIntegrationAdapter(
  provider: string,
): Promise<AdapterResolution> {
  if (!isIntegrationProvider(provider)) {
    return {
      ok: false,
      reason: "UNKNOWN_PROVIDER",
      detail: `${provider} is not an integration provider this system knows.`,
    };
  }

  const loader = ADAPTER_LOADERS[provider];
  if (!loader) {
    return {
      ok: false,
      reason: "NOT_REGISTERED",
      detail: `${capabilityFor(provider).label} has no adapter wired up on this deployment yet.`,
    };
  }

  let adapter: IntegrationAdapter;
  try {
    adapter = await loader();
  } catch {
    // The thrown value is deliberately not forwarded. An import failure's
    // message is a module path and a stack, which is noise to an operator
    // and the wrong thing to render in a browser; the server-side stack is
    // where that belongs, and the caller gets a fact it can act on.
    return {
      ok: false,
      reason: "LOAD_FAILED",
      detail: `The ${capabilityFor(provider).label} adapter could not be loaded.`,
    };
  }

  const mismatch = validateAdapterIdentity(provider, adapter);
  if (mismatch) {
    return {
      ok: false,
      reason: mismatch,
      detail: describeIdentityFailure(provider, adapter, mismatch),
    };
  }

  return { ok: true, adapter };
}
