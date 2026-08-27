/**
 * One "instance" for the AI cross-instance verification.
 *
 * Runs as a SEPARATE OS PROCESS, signs the fixture user in for a real JWT, and
 * drives the REAL checkAiRateLimit / recordAiUsage with that authenticated
 * client. Separate processes are the whole point: the limiter this replaced was
 * an in-memory Map, which two processes cannot share, so any test running both
 * halves in one process would pass for the wrong reason.
 *
 * Results are written to stdout as one JSON line so the parent can read them.
 */
import { createClient } from "@supabase/supabase-js";

const [, , url, anonKey, email, password, companyId, feature, command, countRaw] = process.argv;

process.env.NEXT_PUBLIC_SUPABASE_URL = url;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.WORKER_SERVICE_ROLE_KEY ?? "";

const { checkAiRateLimit, recordAiUsage } = await import("@/lib/ai/guardrails");

const client = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: signInError } = await client.auth.signInWithPassword({ email, password });
if (signInError) {
  console.log(JSON.stringify({ error: `sign-in: ${signInError.message}` }));
  process.exit(1);
}

const count = Number.parseInt(countRaw ?? "1", 10);
const results = [];

if (command === "check") {
  for (let i = 0; i < count; i += 1) {
    const result = await checkAiRateLimit({ companyId, feature, userId: "ignored" }, client);
    results.push(result);
  }
} else if (command === "record") {
  await recordAiUsage(
    {
      companyId,
      feature,
      model: "stub-model",
      promptTokens: count,
      completionTokens: 0,
    },
    client,
  );
  results.push({ recorded: count });
}

console.log(JSON.stringify({ results }));
