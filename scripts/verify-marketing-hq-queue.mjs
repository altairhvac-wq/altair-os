/**
 * Proof that only genuinely publishable social posts can be approved.
 *
 * ==================== THE DEFECT THIS LOCKS SHUT ====================
 * The HQ approval queue filtered on `status === 'draft'` and nothing else, so
 * every artifact the AI team produced arrived wearing the same green Approve
 * button — including the weekly strategy report, which rendered at once as an
 * approvable card in the queue and as a report in the Strategy tab. Approving
 * it set a status column that nothing downstream reads.
 *
 * The rule is now in `shared/types/marketing-hq-queue.ts`, which is pure, and
 * it mirrors two server guards in `app/actions/marketing-ai-hq.ts`. The last
 * section of this file reads those actions and asserts the guards are still
 * there, because a mirror that nobody checks is just a second opinion.
 *
 * Run: node scripts/verify-marketing-hq-queue.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function loadTs(path, extraSources = {}) {
  const dir = mkdtempSync(join(tmpdir(), "hq-queue-"));
  for (const [name, source] of Object.entries(extraSources)) {
    writeFileSync(join(dir, name), source);
  }
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  // TypeScript emits extensionless relative specifiers; Node's ESM loader
  // wants the real filename. Only relative ones are rewritten, so a bare
  // package specifier is left alone.
  const resolved = outputText.replace(
    /(from\s+")(\.\/[^"]+?)(")/g,
    (_all, a, spec, b) => `${a}${spec.endsWith(".js") ? spec : `${spec}.js`}${b}`,
  );
  const file = join(dir, "m.mjs");
  writeFileSync(file, resolved);
  return import(pathToFileURL(file).href);
}

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail ?? "");
  }
}

// The module imports one runtime symbol from marketing-ai-hq. Transpiled
// alone it would resolve "./marketing-ai-hq" against the temp directory, so a
// minimal stand-in is written next to it. Only the label formatter is used.
const KIND_LABELS = {
  social_post: "Social post",
  email_draft: "Email draft",
  seo_page: "SEO page",
  blog_article: "Blog article",
  video_brief: "Video brief",
  intel_digest: "Intel digest",
  reply_draft: "Reply draft",
  ad_proposal: "Ad proposal",
  strategy_report: "Strategy report",
};
const queue = await loadTs("shared/types/marketing-hq-queue.ts", {
  "marketing-ai-hq.js": `export function formatMarketingItemKind(kind) { return ${JSON.stringify(KIND_LABELS)}[kind] ?? kind; }\n`,
});

const ALL_KINDS = Object.keys(KIND_LABELS);
const NON_SOCIAL_KINDS = ALL_KINDS.filter((kind) => kind !== "social_post");

const item = (over = {}) => ({
  id: "i1",
  kind: "social_post",
  status: "draft",
  role: "copywriter",
  title: "A hook",
  bodyText: "Body copy that would publish.",
  content: {},
  channelHint: "facebook",
  runId: null,
  reviewNote: null,
  reviewedAt: null,
  convertedPostId: null,
  createdAt: "2026-08-18T08:00:00.000Z",
  updatedAt: "2026-08-18T08:00:00.000Z",
  ...over,
});

// ---------------------------------------------------------------------------
console.log("\nThe allow-list, asserted literally");
// ---------------------------------------------------------------------------

// Widening this set without also relaxing the server guards would put the
// removed button straight back, so it is asserted rather than merely used.
check(
  "only social_post may be approved",
  JSON.stringify([...queue.APPROVABLE_MARKETING_ITEM_KINDS]) ===
    JSON.stringify(["social_post"]),
  [...queue.APPROVABLE_MARKETING_ITEM_KINDS],
);

check(
  "a kind nobody has defined yet is not approvable",
  // Fails closed: the default for a future MarketingItemKind is
  // informational, so adding one cannot silently grant it a button.
  queue.isApprovableMarketingItem(item({ kind: "podcast_script" })) === false,
);

// ---------------------------------------------------------------------------
console.log("\nNon-social artifacts cannot enter the actionable queue");
// ---------------------------------------------------------------------------

for (const kind of NON_SOCIAL_KINDS) {
  const draft = item({ id: kind, kind });
  check(
    `${kind} is not approvable`,
    queue.isApprovableMarketingItem(draft) === false,
  );
  const part = queue.partitionMarketingQueue([draft]);
  check(
    `${kind} lands in the informational list, not the actionable one`,
    part.actionable.length === 0 &&
      part.informational.length === 1 &&
      part.informational[0].id === kind,
    { actionable: part.actionable.length, informational: part.informational.length },
  );
  check(
    `${kind} is given a reason a person can read`,
    queue.marketingItemInformationalReason(draft).length > 20,
    queue.marketingItemInformationalReason(draft),
  );
}

// The specific regression: a strategy report rendered as an approvable card in
// the queue AND as a report in the Strategy tab, at the same time.
const strategy = item({ id: "report", kind: "strategy_report", title: "Week 33" });
const withStrategy = queue.partitionMarketingQueue([item(), strategy]);
check(
  "a strategy report is never actionable, even beside real social posts",
  withStrategy.actionable.every((entry) => entry.kind === "social_post") &&
    withStrategy.informational.some((entry) => entry.id === "report"),
);
check(
  "a strategy report still appears — informational is not a synonym for hidden",
  withStrategy.informational.length === 1,
);
check(
  "a strategy report's reason points at where it IS read",
  queue.marketingItemInformationalReason(strategy).includes("Strategy tab"),
  queue.marketingItemInformationalReason(strategy),
);

// ---------------------------------------------------------------------------
console.log("\n'Genuinely publishable' mirrors the server's own text guard");
// ---------------------------------------------------------------------------

check(
  "a social post with body copy is approvable",
  queue.isApprovableMarketingItem(item()) === true,
);
check(
  "a social post with nothing to say is NOT approvable",
  queue.isApprovableMarketingItem(item({ bodyText: "   ", content: {} })) === false,
);
check(
  "an empty social post is informational, and says why",
  queue
    .marketingItemInformationalReason(item({ bodyText: "" }))
    .includes("no text"),
  queue.marketingItemInformationalReason(item({ bodyText: "" })),
);
check(
  "packaged postText is preferred over bodyText, as the server prefers it",
  queue.marketingItemPublishableText(
    item({ bodyText: "raw", content: { postText: "packaged" } }),
  ) === "packaged",
);
check(
  "a blank packaged postText falls back to bodyText, as the server falls back",
  queue.marketingItemPublishableText(
    item({ bodyText: "raw", content: { postText: "   " } }),
  ) === "raw",
);
check(
  "a social post carried only by packaged fields is still approvable",
  queue.isApprovableMarketingItem(
    item({ bodyText: "", content: { postText: "packaged" } }),
  ) === true,
);
check(
  "a missing content object does not throw",
  queue.marketingItemPublishableText({ ...item(), content: undefined }) ===
    "Body copy that would publish.",
);

// ---------------------------------------------------------------------------
console.log("\nThe partition drops nothing and reorders nothing");
// ---------------------------------------------------------------------------

const mixed = [
  item({ id: "a", kind: "social_post", status: "draft" }),
  item({ id: "b", kind: "strategy_report", status: "draft" }),
  item({ id: "c", kind: "social_post", status: "approved" }),
  item({ id: "d", kind: "seo_page", status: "rejected" }),
  item({ id: "e", kind: "social_post", status: "draft", bodyText: "" }),
  item({ id: "f", kind: "social_post", status: "converted" }),
  item({ id: "g", kind: "social_post", status: "draft" }),
];
const part = queue.partitionMarketingQueue(mixed);
check(
  "every item lands in exactly one list",
  part.actionable.length + part.informational.length + part.reviewed.length ===
    mixed.length,
  {
    actionable: part.actionable.length,
    informational: part.informational.length,
    reviewed: part.reviewed.length,
  },
);
check(
  "actionable is exactly the drafts that can go somewhere",
  part.actionable.map((e) => e.id).join(",") === "a,g",
  part.actionable.map((e) => e.id),
);
check(
  "informational is exactly the drafts that cannot",
  part.informational.map((e) => e.id).join(",") === "b,e",
  part.informational.map((e) => e.id),
);
check(
  "every non-draft status is reviewed, whatever its kind",
  part.reviewed.map((e) => e.id).join(",") === "c,d,f",
  part.reviewed.map((e) => e.id),
);
check(
  "caller order is preserved inside each list",
  part.actionable[0].id === "a" && part.actionable[1].id === "g",
);
check("an empty queue partitions cleanly", (() => {
  const empty = queue.partitionMarketingQueue([]);
  return (
    empty.actionable.length === 0 &&
    empty.informational.length === 0 &&
    empty.reviewed.length === 0
  );
})());

// ---------------------------------------------------------------------------
console.log("\nThe view renders buttons on the actionable list only");
// ---------------------------------------------------------------------------

const view = readFileSync(
  "shared/components/marketing-hq/MarketingAiHqPageView.tsx",
  "utf8",
);

/**
 * Source with comments removed.
 *
 * The removal checks below ask "is this symbol still in the file", and this
 * file's comments NAME the things that were removed in order to explain why.
 * Asserting against the prose would fail on a correct file, which is a test
 * that punishes the documentation.
 */
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
const viewCode = codeOnly(view);

check(
  "the queue is partitioned rather than filtered by status",
  view.includes("partitionMarketingQueue") &&
    !/items\.filter\(\(item\) => item\.status === "draft"\)/.test(view),
);
check(
  "QueueItemCard — the component that owns Approve — is fed only actionable items",
  view.split("<QueueItemCard").length === 2 &&
    view.indexOf("actionableItems.map") < view.indexOf("<QueueItemCard"),
);
check(
  "the informational list renders no Approve and no Reject",
  (() => {
    const start = view.indexOf("informationalItems.map");
    const end = view.indexOf("reviewedItems.length > 0");
    if (start === -1 || end === -1 || end < start) return false;
    const block = view.slice(start, end);
    return !block.includes("onApprove") && !block.includes("onReject");
  })(),
);
check(
  "the queue badge counts decisions waiting, not drafts existing",
  view.includes('entry.id === "queue" ? actionable.length : null'),
);
check(
  "the dead onConvert wiring on the card is gone",
  !/onConvert=\{\(\) => onConvert\(item\)\}/.test(view),
);

// ---------------------------------------------------------------------------
console.log("\nConnectedChannels is gone, not re-fed from a second source");
// ---------------------------------------------------------------------------

check("the component is removed", !viewCode.includes("function ConnectedChannels"));
check(
  "its never-populated prop type is removed",
  !viewCode.includes("MarketingChannelSummary"),
);
check(
  "its two styling tables are removed with it",
  !viewCode.includes("channelChipClass") && !viewCode.includes("CHANNEL_STATE_LABEL"),
);
check(
  "the channel-state helpers it alone imported are no longer imported",
  !viewCode.includes("MARKETING_CHANNEL_DESCRIPTORS") &&
    !viewCode.includes("canAcceptContent") &&
    !viewCode.includes("publishesImmediately"),
);
check(
  "no replacement data path was invented for it",
  !viewCode.includes("deriveMarketingChannelState"),
);
check(
  "the page no longer builds a channels field",
  !readFileSync("app/(admin)/marketing/hq/page.tsx", "utf8").includes("channels:"),
);

// ---------------------------------------------------------------------------
console.log("\nThe mirrored server guards still exist");
// ---------------------------------------------------------------------------

// If someone relaxes the server, this module's allow-list stops being a mirror
// and starts being an opinion. Better to fail here than to silently diverge.
const actions = readFileSync("app/actions/marketing-ai-hq.ts", "utf8");
check(
  "convertMarketingItemToPostAction still refuses non-social kinds",
  /Only social posts can be sent to the Marketing Hub/.test(actions) &&
    actions.split('item.kind !== "social_post"').length >= 2,
);
check(
  "publishMarketingItemToFacebookAction still refuses non-social kinds",
  /Only social posts can be published/.test(actions),
);
check(
  "the convert action still refuses an item with no text",
  /This item has no post text/.test(actions),
);

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
