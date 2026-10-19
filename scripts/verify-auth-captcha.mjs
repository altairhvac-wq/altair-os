/**
 * Turnstile / Supabase CAPTCHA wiring verification.
 *
 * ===================== WHY =====================
 * Supabase CAPTCHA protection, once switched on, refuses EVERY signup,
 * password sign-in and password-reset request that does not carry a
 * Turnstile token. A single call site that forgets to forward the token is
 * therefore not a weaker control: it is a flow nobody can complete. These
 * checks make "every enforced call forwards the token" a property CI holds,
 * so enabling protection in the dashboard can never lock a flow out.
 *
 * Runs through the alias loader (typescript: true in verify-all) so the CSP
 * and token helpers checked here are the shipped modules, not copies.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const { buildContentSecurityPolicy } = await import("@/lib/security/response-headers");
const captcha = await import("@/shared/lib/auth/captcha");

let checks = 0;
let failures = 0;
function check(name, condition, detail = "") {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------- call sites
console.log("\nEvery CAPTCHA-enforced Supabase auth call forwards a token");

const ENFORCED =
  /\.auth\.(signUp|signInWithPassword|resetPasswordForEmail|signInWithOtp|signInAnonymously|resend)\(/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = ["app", "lib", "shared"].flatMap((d) => walk(d));
let callSites = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(ENFORCED)) {
    callSites += 1;
    // The call's own argument list: from the match to its closing ");".
    const start = match.index;
    const end = text.indexOf(");", start);
    const call = text.slice(start, end === -1 ? start + 800 : end);
    check(
      `${file.replace(/\\/g, "/")} ${match[1]}() forwards captchaToken`,
      /captchaToken/.test(call),
      "Supabase refuses this request once CAPTCHA protection is enabled.",
    );
  }
}
check("found the expected auth call sites", callSites >= 5, `found ${callSites}`);

// ---------------------------------------------------------------- forms
console.log("\nThe public auth forms render the widget");
for (const form of [
  "shared/components/auth/SignUpForm.tsx",
  "shared/components/auth/LoginForm.tsx",
  "shared/components/auth/ForgotPasswordForm.tsx",
]) {
  const text = readFileSync(form, "utf8");
  check(`${form} renders <TurnstileField`, text.includes("<TurnstileField"));
  check(
    `${form} resets the widget after each submission`,
    /resetSignal=\{state\}/.test(text),
  );
}

// ---------------------------------------------------------------- CSP
console.log("\nThe CSP lets the widget load");
const csp = buildContentSecurityPolicy({
  supabaseUrl: "https://example.supabase.co",
  isDevelopment: false,
});
const directive = (name) =>
  csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";
check(
  "script-src allows challenges.cloudflare.com",
  directive("script-src").includes(captcha.TURNSTILE_ORIGIN),
);
check(
  "frame-src allows challenges.cloudflare.com",
  directive("frame-src").includes(captcha.TURNSTILE_ORIGIN),
);
check(
  "frame-ancestors is still 'none'",
  directive("frame-ancestors") === "frame-ancestors 'none'",
);

// ---------------------------------------------------------------- token helper
console.log("\nToken reading and error recognition");
const fd = (value) => {
  const f = new FormData();
  if (value !== undefined) f.set(captcha.CAPTCHA_FORM_FIELD, value);
  return f;
};
check("reads a token", captcha.readCaptchaToken(fd("  abc.def  ")) === "abc.def");
check("absent -> undefined", captcha.readCaptchaToken(fd()) === undefined);
check("empty -> undefined", captcha.readCaptchaToken(fd("   ")) === undefined);
check(
  "oversized -> undefined",
  captcha.readCaptchaToken(fd("x".repeat(5000))) === undefined,
);
check("captcha_failed code recognised", captcha.isCaptchaError({ code: "captcha_failed" }));
check(
  "Supabase captcha message recognised",
  captcha.isCaptchaError({
    message: "captcha protection: request disallowed (no captcha response)",
  }),
);
check(
  "unrelated error not treated as captcha",
  !captcha.isCaptchaError({ code: "invalid_credentials", message: "Invalid login credentials" }),
);

// ---------------------------------------------------------------- auth link host
// PKCE verifier cookies are host-only, so the emailed link must come back to
// the host the visitor signed up on (lib/auth/request-origin.ts).
console.log("\nAuth links return to the host the visitor used");
const origin = await import("@/lib/auth/request-origin");
const ENV = "https://app.altair-op.com";
check("www visitor keeps www", origin.shouldPreferRequestOrigin(ENV, "https://www.altair-op.com") === true);
check("apex visitor keeps apex", origin.shouldPreferRequestOrigin(ENV, "https://altair-op.com") === true);
check("app visitor uses app", origin.shouldPreferRequestOrigin(ENV, ENV) === false);
check("unrelated host is never used", origin.shouldPreferRequestOrigin(ENV, "https://evil.example.com") === false);
check("look-alike host is never used", origin.shouldPreferRequestOrigin(ENV, "https://altair-op.com.evil.io") === false);
check("http downgrade is never used", origin.shouldPreferRequestOrigin(ENV, "http://www.altair-op.com") === false);
check("Vercel preview keeps its own host", origin.shouldPreferRequestOrigin(ENV, "https://altair-os-git-x.vercel.app") === true);

console.log(`\n${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
