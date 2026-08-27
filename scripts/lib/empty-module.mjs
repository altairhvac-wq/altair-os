/**
 * Stands in for `server-only` when a verifier imports application modules
 * outside Next.
 *
 * `server-only` exists to make a build fail if a server module is pulled into a
 * client bundle. It has no runtime behaviour to preserve, and these verifiers
 * are neither a build nor a client. Stubbing it lets a test compare against the
 * predicate that actually ships instead of a copy of it.
 */
export {};
