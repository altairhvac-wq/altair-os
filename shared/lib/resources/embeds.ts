/**
 * The calculators another website can put on its own page.
 *
 * ============ WHAT AN EMBED IS ============
 * A small page under /embed/<id> that holds one calculator in its compact
 * form and nothing else: no site menu, no footer, no sign-in. Another site
 * shows it in an <iframe> and puts a plain link back to the full tool under
 * it. The link is the point: it is how a supplier, a trade school or an
 * affiliate sends their readers here.
 *
 * ============ THE ONLY FRAMEABLE PAGES ============
 * Every other response on this site forbids being framed (frame-ancestors
 * 'none', X-Frame-Options DENY; lib/security/response-headers.ts) so nobody
 * can wrap the invoice payment page in a fake site. The pages listed here
 * are the one exception, declared in next.config.ts. Keep them free of anything
 * worth clickjacking: no forms that post, no account, no payment.
 *
 * Pure (no imports): the verifier and the route both read it.
 */

export const EMBED_ROUTE_PREFIX = "/embed";

export type EmbedToolId = "labor-rate" | "break-even" | "job-profitability";

export type EmbedTool = {
  readonly id: EmbedToolId;
  /** The calculator's name, used as the iframe title and the link text. */
  readonly title: string;
  /** One line for the "put it on your site" page. */
  readonly text: string;
  /** The full tool on this site, which the link under the embed points at. */
  readonly fullPath: string;
  /** A height that shows the whole calculator at the snippet's 640 px width (measured, plus a margin). Narrower than that, the frame scrolls inside. */
  readonly height: number;
};

export const EMBED_TOOLS: readonly EmbedTool[] = [
  {
    id: "labor-rate",
    title: "HVAC labor rate calculator",
    text: "One technician's billable hourly rate from six numbers: wage, payroll costs, billed and unbilled hours, overhead and profit.",
    fullPath: "/resources/calculators/labor-rate",
    height: 1020,
  },
  {
    id: "break-even",
    title: "HVAC break-even calculator",
    text: "How many jobs a month cover a shop's fixed costs, from the monthly costs, the average job and what each job uses up.",
    fullPath: "/resources/calculators/break-even",
    height: 930,
  },
  {
    id: "job-profitability",
    title: "HVAC job profitability calculator",
    text: "Whether one job made money once labor, materials and a share of overhead are counted.",
    fullPath: "/resources/calculators/job-profitability",
    height: 1080,
  },
];

export function embedPath(id: EmbedToolId): string {
  return `${EMBED_ROUTE_PREFIX}/${id}`;
}

/** True for exactly the embed pages listed above: not /embed, not an unknown id, not another letter case. */
export function isEmbedPath(pathname: string): boolean {
  return EMBED_TOOLS.some((tool) => embedPath(tool.id) === pathname);
}

export function findEmbedTool(id: string): EmbedTool | null {
  return EMBED_TOOLS.find((tool) => tool.id === id) ?? null;
}

/**
 * The HTML another site pastes: the calculator in a frame, and a plain link
 * to the full tool under it. `origin` is the public site address.
 */
export function embedSnippet(tool: EmbedTool, origin: string): string {
  return [
    `<iframe src="${origin}${embedPath(tool.id)}" title="${tool.title}" width="100%" height="${tool.height}" style="border:0;max-width:640px" loading="lazy"></iframe>`,
    `<p><a href="${origin}${tool.fullPath}">${tool.title}</a> by Altair Operating System</p>`,
  ].join("\n");
}
