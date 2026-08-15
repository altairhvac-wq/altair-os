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
const asset = (over = {}) => ({ uploadState: "pending", createdAt: NOW, ...over });

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
  m.decideMediaUpload(asset({ createdAt: "2026-08-15T11:30:00.000Z" }), NOW) === "IN_PROGRESS",
);
check(
  "a STALE reservation re-uploads — safe, because storage is keyed",
  m.decideMediaUpload(asset({ createdAt: "2026-08-15T09:00:00.000Z" }), NOW) === "UPLOAD",
);
check(
  "an unreadable timestamp re-uploads rather than wedging",
  m.decideMediaUpload(asset({ createdAt: "nope" }), NOW) === "UPLOAD",
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

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} media checks passed.`,
);
if (failures > 0) process.exit(1);
