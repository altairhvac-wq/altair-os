import { sendResultsEmail, type ResultsEmailList } from "@/lib/resources/results-email";
import {
  buildSubscriberLinks,
  requestListSubscription,
  resolveResourceLinkOrigin,
} from "@/lib/resources/subscribers";
import {
  enforcePublicRateLimit,
  rateLimitMessage,
  resolveRequestAddress,
} from "@/lib/security/public-rate-limit";
import {
  CALCULATOR_FIELD_KEYS,
  pickCalculatorValues,
  summarizeCalculator,
  type CalculatorSlug,
} from "@/shared/lib/resources/calculator-summaries";
import { normalizeListEmail } from "@/shared/lib/resources/email-list";

export const runtime = "nodejs";

/**
 * "Email me these results" for the free calculators.
 *
 * Public at the middleware layer (exact path only): the visitor has no
 * account. This handler is therefore the whole boundary, and it sends mail to
 * an address a stranger typed, so each refusal below exists for a reason:
 *
 *   - cross-site posts are refused: only our own calculator pages send this;
 *   - the body is small JSON with a known calculator and number-shaped fields
 *     (pickCalculatorValues); anything else is refused before any work;
 *   - the RESULT is never read from the request. It is recomputed here from
 *     the inputs, so the email can only state what the calculator computes;
 *   - a filled-in hidden field means a script: it is answered "ok" and
 *     nothing is sent, so the script learns nothing;
 *   - per sender address and per inbox limits (public.resource_email) stop
 *     the form being used to flood someone else's inbox. Unlike most public
 *     limits this one is treated as closed when the limiter cannot run: a
 *     missed "email me my result" is a smaller loss than our sending domain
 *     being used for unlimited mail during an outage;
 *   - the address is stored only when `subscribe === true`, and then as
 *     pending until the link in the email is pressed (lib/resources/subscribers.ts).
 *
 * The response never says whether an address is already on the list.
 */

const MAX_BODY = 2048;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** A browser always sends Origin on a POST fetch; it must name this host. */
function isSameOrigin(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return false;
  let originHost: string;
  try {
    originHost = new URL(originHeader).host.toLowerCase();
  } catch {
    return false;
  }
  const hostHeader = (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  return Boolean(hostHeader) && originHost === hostHeader;
}

function isCalculatorSlug(value: unknown): value is CalculatorSlug {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CALCULATOR_FIELD_KEYS, value);
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isSameOrigin(request)) return json(403, { error: "This form only works from the calculator page." });

    const text = await request.text();
    if (!text || text.length > MAX_BODY) return json(400, { error: "That request could not be read." });

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      body = parsed as Record<string, unknown>;
    } catch {
      return json(400, { error: "That request could not be read." });
    }

    const slug = body.slug;
    if (!isCalculatorSlug(slug)) return json(400, { error: "That calculator was not recognised." });

    const rawValues = body.values;
    const values =
      rawValues && typeof rawValues === "object" && !Array.isArray(rawValues)
        ? pickCalculatorValues(slug, rawValues as Record<string, unknown>)
        : null;
    if (!values) return json(400, { error: "Fill in every field with a number first." });

    const email = normalizeListEmail(body.email);
    if (!email) return json(400, { error: "Enter a valid email address." });

    // The hidden field. Answered as a success on purpose.
    if (typeof body.website === "string" && body.website.trim() !== "") return json(200, { ok: true, list: "none" });

    const summary = summarizeCalculator(slug, values);
    if (!summary) return json(400, { error: "These numbers do not give a result yet. Check the fields and try again." });

    const limit = await enforcePublicRateLimit("public.resource_email", {
      ip: await resolveRequestAddress(),
      email,
    });
    if (!limit.allowed) return json(429, { error: rateLimitMessage(limit) });
    if (limit.degraded) return json(503, { error: "Email is temporarily unavailable. Please try again in a moment." });

    let list: ResultsEmailList = { kind: "none" };
    let listStatus: "none" | "requested" | "unavailable" = "none";
    if (body.subscribe === true) {
      const outcome = await requestListSubscription(email, slug);
      if (outcome.status === "unavailable") {
        listStatus = "unavailable";
      } else {
        listStatus = "requested";
        const links = buildSubscriberLinks(outcome.id);
        list =
          outcome.status === "already_confirmed"
            ? { kind: "already", unsubscribeUrl: links.unsubscribeUrl }
            : { kind: "confirm", confirmUrl: links.confirmUrl };
      }
    }

    const sent = await sendResultsEmail(email, {
      slug,
      summary,
      values,
      origin: resolveResourceLinkOrigin(),
      list,
    });
    if (!sent.ok) {
      return json(sent.reason === "not_configured" ? 503 : 502, {
        error: "We could not send the email just now. Please try again in a moment.",
      });
    }

    return json(200, { ok: true, list: listStatus });
  } catch {
    return json(500, { error: "Something went wrong. Please try again in a moment." });
  }
}
