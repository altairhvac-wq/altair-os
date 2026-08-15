/**
 * Tests for the media transport bridge's security-critical core.
 *
 * Pure module, so tenant isolation, local-path rejection and idempotency are
 * all testable without storage, a database, or a network. This script makes
 * NO network call and uploads nothing.
 *
 * Run: node scripts/verify-marketing-media.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function loadTs(path) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const dir = mkdtempSync(join(tmpdir(), "media-"));
  const file = join(dir, "m.mjs");
  writeFileSync(file, outputText);
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

const m = await loadTs("shared/types/marketing-media.ts");

const COMPANY = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const JOB = "job-abc123";

console.log("\nObject key — tenant isolation is structural");

const key = m.buildMediaObjectKey({ companyId: COMPANY, sourceJobId: JOB });
check("key is company-prefixed", key.startsWith(`${COMPANY}/`), key);
check("key is deterministic", key === m.buildMediaObjectKey({ companyId: COMPANY, sourceJobId: JOB }));
check("key carries the job id", key.includes(JOB));
check("key ends .mp4", key.endsWith(".mp4"));
check(
  "a different company yields a different prefix",
  m.buildMediaObjectKey({ companyId: OTHER, sourceJobId: JOB }).startsWith(`${OTHER}/`),
);
check("owner is recoverable from the key", m.companyIdFromMediaObjectKey(key) === COMPANY);
check("key belongs to its own company", m.mediaKeyBelongsToCompany(key, COMPANY));
check(
  "CROSS-TENANT — another company's key is refused",
  !m.mediaKeyBelongsToCompany(key, OTHER),
);

console.log("\nLocal paths and URLs are refused");

const hostile = [
  "/home/user/renders/out.mp4",
  "C:\\Users\\User\\out.mp4",
  "C:/Users/User/out.mp4",
  "~/renders/out.mp4",
  "../../etc/passwd",
  "https://evil.example/out.mp4",
  "file:///tmp/out.mp4",
  "s3://bucket/key",
  "some\\windows\\path",
];
for (const value of hostile) {
  check(`rejected: ${value}`, m.looksLikeLocalPath(value));
}
check("an ordinary job id is NOT flagged", !m.looksLikeLocalPath("job-abc123"));
check("a uuid is NOT flagged", !m.looksLikeLocalPath(COMPANY));

for (const value of hostile) {
  let threw = false;
  try {
    m.buildMediaObjectKey({ companyId: COMPANY, sourceJobId: value });
  } catch {
    threw = true;
  }
  check(`key derivation refuses hostile job id: ${value.slice(0, 24)}`, threw);
}

let leaked = false;
try {
  m.buildMediaObjectKey({ companyId: COMPANY, sourceJobId: "/etc/passwd" });
} catch (error) {
  // The rejection message must not echo the offending value — that value is
  // exactly what we are keeping out of logs.
  leaked = String(error.message).includes("/etc/passwd");
}
check("the rejection message does NOT echo the offending path", !leaked);

console.log("\nUpload idempotency");

const NOW = "2026-08-15T12:00:00.000Z";
const asset = (over = {}) => ({ uploadState: "pending", updatedAt: NOW, ...over });

check("no record uploads", m.decideMediaUpload(null, NOW) === "UPLOAD");
check(
  "already stored does NOT re-upload",
  m.decideMediaUpload(asset({ uploadState: "stored" }), NOW) === "ALREADY_STORED",
);
check(
  "a failed upload may be retried",
  m.decideMediaUpload(asset({ uploadState: "failed" }), NOW) === "UPLOAD",
);
check(
  "a fresh reservation is IN_PROGRESS",
  m.decideMediaUpload(asset({ updatedAt: "2026-08-15T11:30:00.000Z" }), NOW) === "IN_PROGRESS",
);
check(
  "a STALE reservation re-uploads — safe, because storage is keyed",
  m.decideMediaUpload(asset({ updatedAt: "2026-08-15T09:00:00.000Z" }), NOW) === "UPLOAD",
);
check(
  "an unreadable timestamp re-uploads rather than wedging",
  m.decideMediaUpload(asset({ updatedAt: "nope" }), NOW) === "UPLOAD",
);
// The decision and the update predicate must draw the line in the same place,
// or a reservation can read stale here and refuse to be re-taken there.
check(
  "the staleness boundary matches the grace exactly",
  Date.parse(NOW) - Date.parse(m.mediaStaleBefore(NOW)) === m.MEDIA_PENDING_GRACE_MS,
);
check(
  "a reservation re-taken a moment ago reads as IN_PROGRESS again",
  m.decideMediaUpload(asset({ updatedAt: NOW }), NOW) === "IN_PROGRESS",
);

console.log("\nMetadata validation");

check("mp4 of a sane size is accepted",
  m.validateMediaMetadata({ contentType: "video/mp4", byteSize: 1024 }) === null);
check("a non-mp4 is refused",
  m.validateMediaMetadata({ contentType: "video/quicktime", byteSize: 1024 }) !== null);
check("zero bytes is refused",
  m.validateMediaMetadata({ contentType: "video/mp4", byteSize: 0 }) !== null);
check("over the ceiling is refused",
  m.validateMediaMetadata({ contentType: "video/mp4", byteSize: m.MEDIA_MAX_BYTES + 1 }) !== null);

console.log("\nCapability lifetimes");

check("read grants are short-lived (<= 15 min)", m.MEDIA_READ_URL_TTL_SECONDS <= 900);
check("upload grants are bounded (<= 1 hour)", m.MEDIA_UPLOAD_URL_TTL_SECONDS <= 3600);
check("the bucket name is the private one", m.MARKETING_MEDIA_BUCKET === "marketing-media");

console.log("\nNo durable capability is modelled");
{
  // Structural: the persisted asset type must carry identity, never a URL.
  const src = readFileSync("shared/types/marketing-media.ts", "utf8");
  const assetType = src.slice(
    src.indexOf("export type MarketingMediaAsset"),
    src.indexOf("/* ------------------------------------------------------- local-path guard */"),
  );
  check("the persisted asset type has no url field", !/\burl\b\s*:/.test(assetType), assetType.match(/\burl\b\s*:.*/)?.[0]);
  check("the persisted asset type has no path field", !/\bpath\b\s*:/i.test(assetType));
  check("the persisted asset type has no token field", !/\btoken\b\s*:/i.test(assetType));
  check("it does carry a stable object key", /objectKey\s*:/.test(assetType));
}

console.log("\nMigration 144 agrees with the module");
{
  const sql = readFileSync("supabase/migrations/144_marketing_media_assets.sql", "utf8").toLowerCase();
  check("bucket is created PRIVATE", /'marketing-media',\s*\n?\s*false/.test(sql) || /false,\s*\n?\s*2147483648/.test(sql));
  check("no public read policy is created for the bucket",
    !/create\s+policy[^;]*marketing-media[^;]*to\s+public/.test(sql));
  check("IDEMPOTENCY — unique (company_id, source_job_id)",
    /unique\s*\(\s*company_id\s*,\s*source_job_id\s*\)/.test(sql));
  check("object_key shape is constrained in the database too",
    /object_key\s*!~\s*'\^\[a-za-z\]\[a-za-z0-9\+\.-\]\*:\/\/'/.test(sql));
  check("mp4 only", /allowed_mime_types[\s\S]*?video\/mp4/.test(sql));
  check("RLS enabled", /alter table public\.marketing_media_assets enable row level security/.test(sql));
  check("grants select to authenticated so the read policy is not inert",
    /grant select on table public\.marketing_media_assets to authenticated/.test(sql));
  check("revokes writes from authenticated",
    /revoke insert, update, delete on table public\.marketing_media_assets from authenticated/.test(sql));
  check("revokes all from anon",
    /revoke all on table public\.marketing_media_assets from anon/.test(sql));
  check("no column stores a url",
    !/\b(signed_url|public_url|url)\s+text/.test(sql));
  check("no column stores a filesystem path",
    !/\b(master_path|local_path|file_path)\b/.test(sql));
}

console.log("\nContent type comparison");

check("parameters are dropped", m.normalizeContentType('video/mp4; codecs="avc1"') === "video/mp4");
check("case is normalized", m.normalizeContentType("VIDEO/MP4") === "video/mp4");
check("whitespace is trimmed", m.normalizeContentType("  video/mp4  ") === "video/mp4");
check("a different type still differs", m.normalizeContentType("video/quicktime") !== "video/mp4");

console.log("\nRead gate — who may be handed a signed URL");
{
  const stored = {
    companyId: COMPANY,
    sourceJobId: JOB,
    objectKey: key,
    uploadState: "stored",
  };

  check("a stored asset for the right company is granted",
    m.decideMediaRead(stored, COMPANY) === "GRANT");
  check("no record is NOT_FOUND",
    m.decideMediaRead(null, COMPANY) === "NOT_FOUND");
  check("CROSS-TENANT — another company's asset is refused",
    m.decideMediaRead(stored, OTHER) === "WRONG_COMPANY");
  check("a pending upload is NOT granted",
    m.decideMediaRead({ ...stored, uploadState: "pending" }, COMPANY) === "NOT_STORED");
  check("a failed upload is NOT granted",
    m.decideMediaRead({ ...stored, uploadState: "failed" }, COMPANY) === "NOT_STORED");

  // The column is not trusted. A row rewritten to address another company's
  // object must be refused rather than signed.
  check("TAMPERED KEY — a key pointing at another company is refused",
    m.decideMediaRead(
      { ...stored, objectKey: `${OTHER}/video/${JOB}.mp4` },
      COMPANY,
    ) === "KEY_MISMATCH");
  check("TAMPERED KEY — a key for a different job is refused",
    m.decideMediaRead(
      { ...stored, objectKey: `${COMPANY}/video/other-job.mp4` },
      COMPANY,
    ) === "KEY_MISMATCH");
  check("TAMPERED KEY — a traversal key is refused",
    m.decideMediaRead(
      { ...stored, objectKey: `${COMPANY}/video/../../etc/passwd` },
      COMPANY,
    ) === "KEY_MISMATCH");
  check("an empty requester is refused",
    m.decideMediaRead(stored, "   ") === "WRONG_COMPANY");

  // Tenant probing must learn nothing. Both refusals must read identically.
  check("NOT_FOUND and WRONG_COMPANY are indistinguishable to the caller",
    m.describeMediaReadDecision("NOT_FOUND") ===
      m.describeMediaReadDecision("WRONG_COMPANY"));
}

console.log("\nCompletion is verified against storage, not against the claim");
{
  const src = readFileSync("app/api/agent/media/route.ts", "utf8");
  const complete = src.slice(src.indexOf('if (body.action === "complete")'));

  check("existence-only checking is gone", !/mediaObjectExists/.test(src));
  check("storage facts are read back", /describeStoredObject\(/.test(complete));

  const factsAt = complete.indexOf("describeStoredObject(");
  const storeAt = complete.indexOf("markMediaStored(");
  check("facts are read BEFORE the record is written",
    factsAt !== -1 && storeAt !== -1 && factsAt < storeAt);

  const between = complete.slice(factsAt, storeAt);
  check("a size mismatch is refused",
    /facts\.byteSize\s*!==\s*byteSize/.test(between));
  check("a content-type mismatch is refused",
    /storedType\s*!==\s*normalizeContentType\(/.test(between));
  check("unreportable metadata is refused rather than assumed",
    /facts\.byteSize === null \|\| facts\.contentType === null/.test(between));
  check("a mismatch marks the reservation failed so it can be retried",
    (between.match(/markMediaFailed\(/g) ?? []).length >= 3);

  // The persisted numbers must be storage's, not the caller's. This is the
  // whole point of the finding: equal today, and still correct the day they
  // diverge.
  const call = complete.slice(storeAt, complete.indexOf("});", storeAt));
  check("the STORAGE size is persisted, not the reported one",
    /byteSize:\s*facts\.byteSize/.test(call));
  check("the STORAGE content type is persisted, not the reported one",
    /contentType:\s*storedType/.test(call));
  check("the checksum is documented as client-reported, not verified",
    /CLIENT-REPORTED/.test(complete));
}

console.log("\nThe digest is named for what it is, not for what it is not");
{
  // The finding was not that an unverified digest is stored — that is a
  // deliberate trade — but that nothing in the contract SAID so. These assert
  // the disclosure is in the names, where a reader cannot miss it, rather than
  // only in a comment.
  const route = readFileSync("app/api/agent/media/route.ts", "utf8");
  const types = readFileSync("shared/types/marketing-media.ts", "utf8");
  const queries = readFileSync("lib/database/queries/marketing-media-assets.ts", "utf8");
  const sql = readFileSync("supabase/migrations/144_marketing_media_assets.sql", "utf8");

  check("the request field is clientReportedSha256",
    /body\.clientReportedSha256/.test(route));
  check("the persisted field is clientReportedSha256",
    /clientReportedSha256:\s*\n?\s*typeof body\.clientReportedSha256/.test(route));
  check("the response names it too, so the contract discloses it",
    /clientReportedSha256: stored\.asset\.clientReportedSha256/.test(route));

  // A silent drop would be worse than the ambiguity being fixed: a caller
  // would believe it had sent something that was recorded.
  check("the OLD neutral name is REFUSED, not ignored",
    /body\.checksumSha256 !== undefined/.test(route) &&
      /checksumSha256 is not accepted/.test(route));
  check("no code path reads a value out of the old field",
    !/typeof body\.checksumSha256 === "string"/.test(route));

  check("the asset type carries no field called checksum",
    !/\bchecksumSha256\b/.test(types) && /clientReportedSha256/.test(types));
  check("the query layer maps the renamed column only",
    /client_reported_sha256/.test(queries) && !/\bchecksum_sha256\b/.test(queries));

  check("the column is named client_reported_sha256",
    /client_reported_sha256 text/.test(sql));
  check("an already-applied database is renamed rather than left behind",
    /rename column checksum_sha256 to client_reported_sha256/.test(sql));
  check("the column carries an UNVERIFIED comment",
    /comment on column public\.marketing_media_assets\.client_reported_sha256[\s\S]{0,80}UNVERIFIED/.test(sql));

  // The contrast is the point: two of the three are verified against storage,
  // one is not, and only the unverified one is named for its provenance.
  check("size and type keep their plain names, because they ARE verified",
    /byte_size bigint/.test(sql) && /content_type text/.test(sql));
}

console.log("\nReservation is atomic — the database arbitrates");
{
  const src = readFileSync("lib/database/queries/marketing-media-assets.ts", "utf8");
  const fn = src.slice(
    src.indexOf("export async function reserveMediaUpload"),
    src.indexOf("export async function markMediaStored"),
  );

  check("no upsert — an insert that silently overwrites hides the race",
    !/\.upsert\(/.test(fn));
  check("the unique violation is the arbiter", /UNIQUE_VIOLATION/.test(fn));
  check("23505 is what that constant means", /const UNIQUE_VIOLATION = "23505"/.test(src));

  const insertAt = fn.indexOf(".insert(");
  const readAt = fn.indexOf("getMediaAssetByJob(");
  check("READ-THEN-WRITE REGRESSION GUARD — the insert comes first",
    insertAt !== -1 && (readAt === -1 || insertAt < readAt),
    `insert@${insertAt} read@${readAt}`);

  // NON-EXCLUSIVE PREDICATE GUARD. `in ("failed","pending")` re-matches the
  // row the winner just wrote, so both callers would win. Each branch must
  // instead be falsified by the winner's own write.
  check("the re-claim predicate is not the non-exclusive one",
    !/\.in\("upload_state", \["failed", "pending"\]\)/.test(fn));
  check("a failed row is re-claimed only from `failed`",
    /\.eq\("upload_state", "failed"\)/.test(fn));
  check("a stale row is re-claimed only while it is still stale",
    /\.eq\("upload_state", "pending"\)[\s\S]{0,80}\.lte\("updated_at", mediaStaleBefore\(/.test(fn));
  check("a lost re-claim reports IN_PROGRESS rather than granting",
    /return \{ decision: "IN_PROGRESS", asset: existing \}/.test(fn));
}

console.log("\nRead grants are minted at request time and never written down");
{
  const action = readFileSync("app/actions/marketing-media.ts", "utf8");
  // Imports name every one of these, so ordering is only meaningful inside
  // the function body.
  const body = action.slice(
    action.indexOf("export async function requestMarketingMediaPreviewAction"),
  );

  const decideAt = body.indexOf("decideMediaRead(");
  const mintAt = body.indexOf("createMediaReadGrant(");
  check("the gate runs BEFORE the URL is minted",
    decideAt !== -1 && mintAt !== -1 && decideAt < mintAt);
  check("anything but GRANT returns the refusal",
    /decision !== "GRANT"/.test(body));

  const authAt = body.indexOf("canAccessAdminNavItem(");
  const lookupAt = body.indexOf("getMediaAssetBy");
  check("authorization is checked before any lookup",
    authAt !== -1 && lookupAt !== -1 && authAt < lookupAt,
    `auth@${authAt} lookup@${lookupAt}`);

  // Nothing in this path may persist. A signed URL in a column is a permanent
  // capability wearing a temporary one's clothes.
  check("the action writes no row", !/\.insert\(|\.update\(|markMediaStored|markMediaFailed/.test(action));
  check("the action logs nothing", !/console\.(log|error|warn)/.test(action));

  const storage = readFileSync("lib/media/marketing-media-storage.ts", "utf8");
  check("the minting module never persists a url",
    !/\.insert\(|\.update\(|\.upsert\(/.test(storage));
  check("the signed url is never logged",
    !/console\.[a-z]+\([^)]*signedUrl/.test(storage));
}

console.log("\nComposition roots — every module has a production call site");
{
  // The lesson from the scheduler-installer finding: a module that compiles,
  // passes its own tests and is never called is not a feature. These assert
  // the wiring, not the behaviour.
  const { readdirSync, statSync } = await import("node:fs");
  const sources = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(full)) sources.push(full);
    }
  })("app");
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(full)) sources.push(full);
    }
  })("shared/components");

  const callers = (needle, exclude) =>
    sources.filter(
      (file) =>
        !file.endsWith(exclude) &&
        (needle instanceof RegExp
          ? needle.test(readFileSync(file, "utf8"))
          : readFileSync(file, "utf8").includes(needle)),
    );

  // Matched on the CALL and on the JSX ELEMENT, not on the bare name — the
  // name also occurs in type aliases and in a comment, and a guard that a
  // comment can satisfy guards nothing.
  const previewCallers = callers(
    "requestMarketingMediaPreviewAction(",
    "actions/marketing-media.ts",
  ).filter((file) => readFileSync(file, "utf8").includes('"use client"'));
  check("the read-grant action is actually invoked by a client component",
    previewCallers.length > 0, previewCallers.join(", "));

  const listCallers = callers("listStoredMediaAssets(", "queries/marketing-media-assets.ts");
  check("stored media is actually read by a page",
    listCallers.some((file) => /page\.tsx$/.test(file)), listCallers.join(", "));

  // The element, not the type. `Promise<MarketingMediaPreviewResult>` is a
  // substring of the naive needle, and satisfying this guard from a return
  // type would make it meaningless.
  const rendered = callers(/<MarketingMediaPreview[\s/>]/, "MarketingMediaPreview.tsx");
  check("the preview control is actually rendered",
    rendered.length > 0, rendered.join(", "));
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} media checks passed.`,
);
if (failures > 0) process.exit(1);
