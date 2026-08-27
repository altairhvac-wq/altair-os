/**
 * Stands in for `next/headers` when a verifier imports application modules
 * outside Next.
 *
 * These modules import the cookie-scoped Supabase client at the top level for
 * their request-time functions, even when the function under test takes an
 * injected client. Resolving that import is all the verifier needs.
 *
 * Every export THROWS rather than returning something empty. A verifier is
 * supposed to inject its own client; if one ever reaches the cookie path
 * instead, that means it is exercising a code path that cannot work in the
 * context being tested — a cron with no session, for instance, which is exactly
 * the defect 4F was written to catch. Failing loudly there is the point.
 */
function unavailable(name) {
  return () => {
    throw new Error(
      `next/headers ${name}() was called from a verifier. Nothing here has a ` +
        `request context — inject a Supabase client explicitly instead of ` +
        `letting the code resolve the cookie-scoped one.`,
    );
  };
}

export const cookies = unavailable("cookies");
export const headers = unavailable("headers");
export const draftMode = unavailable("draftMode");
