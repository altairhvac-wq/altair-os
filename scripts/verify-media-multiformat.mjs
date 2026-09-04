/**
 * Multi-format media: proof that migration 183 widened the media table without
 * loosening it.
 *
 * ================= WHY THIS IS NOT A REGEX SPOT-CHECK =================
 * 183 REPLACES two constraints that migration 144 wrote — the content-type
 * rule and the object-key shape rule. Replacing a CHECK replaces all of it, so
 * the interesting failure is not "did the new clause get added" but "did an
 * old clause quietly not come back". A verifier that asserts the presence of
 * the new `/image/` segment and stops would pass a migration that had dropped
 * the traversal guard on its way past.
 *
 * So this does two things that a substring search cannot:
 *
 *   1. It extracts 144's guard clauses and 183's replacement and compares them
 *      CLAUSE BY CLAUSE, so a guard that failed to survive is named.
 *   2. It TRANSLATES the SQL boolean expressions into JavaScript predicates and
 *      evaluates real rows through them — hostile object keys, a JPEG filed
 *      under a video path, an oversized image. What is asserted is the
 *      behaviour of the SQL that is actually in the file, not the behaviour of
 *      a copy re-typed into this script, which is the copy that goes stale.
 *
 * The translator refuses to guess: anything it could not translate leaves SQL
 * tokens behind, and the residue check FAILS rather than evaluating a
 * half-translated expression to a confident, meaningless `true`.
 *
 * Purely static. It reads SQL and TypeScript from disk, opens no socket,
 * touches no database, and holds no credential.
 *
 * Run: node scripts/verify-media-multiformat.mjs
 */
import { readFileSync } from "node:fs";

const M144 = "supabase/migrations/144_marketing_media_assets.sql";
const M183 = "supabase/migrations/183_marketing_media_multiformat.sql";
const SHARED_TYPES = "shared/types/marketing-media.ts";
const STORAGE_MODULE = "lib/storage/marketing-media.ts";

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

/** Line comments stripped, so migration prose can never satisfy a check. */
function readSql(path) {
  return readFileSync(path, "utf8").replace(/--[^\n]*/g, "");
}

const raw183 = readFileSync(M183, "utf8");
const sql144 = readSql(M144);
const sql183 = readSql(M183);

/* ------------------------------------------------------ SQL -> JS predicate */

const SQL_STRING = "'((?:[^']|'')*)'";
const unquote = (literal) => literal.replace(/''/g, "'");
const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * LIKE, with its real escape semantics rather than the ones people assume.
 *
 * Backslash is the default escape character, so `\%` is a pattern for a
 * LITERAL percent sign — not "starts with a backslash". 144 relies on that
 * without saying so, and translating it any other way here would make this
 * script disagree with Postgres about the constraint it is checking.
 */
function sqlLikeToRegExp(pattern) {
  let out = "^";
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === "\\") {
      i += 1;
      out += escapeForRegExp(pattern[i] ?? "\\");
      continue;
    }
    if (c === "%") {
      out += "[\\s\\S]*";
      continue;
    }
    if (c === "_") {
      out += "[\\s\\S]";
      continue;
    }
    out += escapeForRegExp(c);
  }
  return new RegExp(`${out}$`);
}

/** The body of `[add] constraint <name> check ( ... )`, parens balanced. */
function extractCheck(sql, name) {
  const at = sql.indexOf(`constraint ${name}`);
  if (at === -1) return null;
  const opener = /check\s*\(/g;
  opener.lastIndex = at;
  const found = opener.exec(sql);
  if (!found) return null;

  const open = found.index + found[0].length - 1;
  let depth = 0;
  for (let i = open; i < sql.length; i += 1) {
    if (sql[i] === "(") depth += 1;
    else if (sql[i] === ")") {
      depth -= 1;
      if (depth === 0) return sql.slice(open + 1, i);
    }
  }
  return null;
}

/**
 * Translate one SQL boolean expression into a JavaScript predicate over a row.
 *
 * Column references go through `COL`, which throws on a name the caller did not
 * supply — a constraint that starts referencing a column this script does not
 * model becomes a loud failure rather than a silent `undefined` comparison.
 */
function compileCheck(expression) {
  let js = expression;

  js = js.replace(
    new RegExp(`(\\w+)\\s*!~\\s*${SQL_STRING}`, "g"),
    (_, col, lit) =>
      `(!new RegExp(${JSON.stringify(unquote(lit))}).test(COL(${JSON.stringify(col)})))`,
  );
  js = js.replace(
    new RegExp(`(\\w+)\\s*~\\s*${SQL_STRING}`, "g"),
    (_, col, lit) =>
      `(new RegExp(${JSON.stringify(unquote(lit))}).test(COL(${JSON.stringify(col)})))`,
  );
  js = js.replace(
    new RegExp(`(\\w+)\\s+not\\s+like\\s+${SQL_STRING}`, "g"),
    (_, col, lit) =>
      `(!LIKE(${JSON.stringify(unquote(lit))}).test(COL(${JSON.stringify(col)})))`,
  );
  js = js.replace(
    new RegExp(`(\\w+)\\s+like\\s+${SQL_STRING}`, "g"),
    (_, col, lit) =>
      `(LIKE(${JSON.stringify(unquote(lit))}).test(COL(${JSON.stringify(col)})))`,
  );
  js = js.replace(
    /(\w+)\s+in\s*\(([^)]*)\)/g,
    (_, col, list) =>
      `([${list
        .split(",")
        .map((item) => JSON.stringify(unquote(item.trim().slice(1, -1))))
        .join(", ")}].includes(COL(${JSON.stringify(col)})))`,
  );
  js = js.replace(
    /(\w+)\s+is\s+not\s+null/g,
    (_, col) => `(COL(${JSON.stringify(col)}) !== null)`,
  );
  js = js.replace(
    /(\w+)\s+is\s+null/g,
    (_, col) => `(COL(${JSON.stringify(col)}) === null)`,
  );
  js = js.replace(
    new RegExp(`(\\w+)\\s*<>\\s*${SQL_STRING}`, "g"),
    (_, col, lit) =>
      `(COL(${JSON.stringify(col)}) !== ${JSON.stringify(unquote(lit))})`,
  );
  js = js.replace(
    new RegExp(`(\\w+)\\s*=\\s*${SQL_STRING}`, "g"),
    (_, col, lit) =>
      `(COL(${JSON.stringify(col)}) === ${JSON.stringify(unquote(lit))})`,
  );
  js = js.replace(
    /(\w+)\s*(<=|>=|<>|=|<|>)\s*(\d+)/g,
    (_, col, op, num) =>
      `(COL(${JSON.stringify(col)}) ${op === "=" ? "===" : op === "<>" ? "!==" : op} ${num})`,
  );
  js = js.replace(/\band\b/g, "&&").replace(/\bor\b/g, "||");

  const residue = /'|\b(like|and|or|not|is|in)\b/.test(js);
  const evaluate = new Function("COL", "LIKE", `return (${js});`);

  return {
    residue,
    js,
    run(row) {
      return evaluate(
        (name) => {
          if (!(name in row)) throw new Error(`untracked column: ${name}`);
          return row[name];
        },
        sqlLikeToRegExp,
      );
    },
  };
}

const normalize = (value) => value.replace(/\s+/g, " ").trim();

/* -------------------------------------------------------------- extraction */

console.log("\nMigration 183 is present and replaces rather than duplicates");

const shape144 = extractCheck(sql144, "marketing_media_assets_key_shape_check");
const shape183 = extractCheck(sql183, "marketing_media_assets_key_shape_check");
const agreement = extractCheck(sql183, "marketing_media_assets_kind_agreement_check");
const kindCheck = extractCheck(sql183, "marketing_media_assets_media_kind_check");
const typeCheck = extractCheck(sql183, "marketing_media_assets_type_check");
const imageSize = extractCheck(sql183, "marketing_media_assets_image_size_check");
const videoSize = extractCheck(sql144, "marketing_media_assets_size_check");

check("144's key-shape CHECK is readable", Boolean(shape144));
check("183 carries a replacement key-shape CHECK", Boolean(shape183));
check("183 carries a kind/content-type agreement CHECK", Boolean(agreement));
check("183 constrains media_kind itself", Boolean(kindCheck));
check("183 carries a replacement content-type CHECK", Boolean(typeCheck));
check("183 carries an image-only size CHECK", Boolean(imageSize));
check("144's 2 GB size CHECK is readable", Boolean(videoSize));

// Replacing a constraint requires dropping it first; `add constraint` has no
// `if not exists`, so an unguarded add makes the migration non-re-runnable.
for (const name of [
  "marketing_media_assets_media_kind_check",
  "marketing_media_assets_type_check",
  "marketing_media_assets_kind_agreement_check",
  "marketing_media_assets_key_shape_check",
  "marketing_media_assets_image_size_check",
]) {
  check(
    `${name} is dropped before it is added (re-runnable)`,
    sql183.includes(`drop constraint if exists ${name}`) &&
      sql183.includes(`add constraint ${name}`),
  );
}

// The two constraints 144 owns that 183 must not disturb. Dropping either
// would remove the 2 GB ceiling or the idempotency key that makes a repeat
// upload replace an object instead of creating a second row.
check(
  "183 does not drop the 2 GB ceiling that still bounds video",
  !/drop\s+constraint\s+if\s+exists\s+marketing_media_assets_size_check/.test(sql183),
);
check(
  "183 does not drop the (company_id, source_job_id) idempotency key",
  !/drop\s+constraint\s+if\s+exists\s+marketing_media_assets_unique/.test(sql183),
);
check(
  "183 introduces no new database function",
  !/create\s+(or\s+replace\s+)?function/.test(sql183),
);
check(
  "183 contains no destructive statement",
  !/\b(drop\s+table|drop\s+column|drop\s+type|truncate|delete\s+from)\b/.test(sql183),
);

/* ------------------------------------------- the guards survive the rewrite */

console.log("\n144's traversal and absolute-path guards survive into 183");

const clauses144 = (shape144 ?? "")
  .split(/\band\b/)
  .map(normalize)
  .filter(Boolean);
const guards144 = clauses144.filter((clause) => !clause.includes("'%/video/%'"));
const shape183Normalized = normalize(shape183 ?? "");

check(
  "144 had guards to carry forward (five, plus the segment rule)",
  guards144.length === 5,
  guards144,
);
for (const guard of guards144) {
  check(`carried forward verbatim: ${guard}`, shape183Normalized.includes(guard));
}

/* ------------------------------------------------------------ object keys */

console.log("\nObject keys — video still valid, image now valid, hostile still refused");

const COMPANY = "11111111-1111-1111-1111-111111111111";
const JOB = "job-abc123";

const shape = compileCheck(shape183 ?? "false");
check("the key-shape CHECK translated with nothing left untranslated", !shape.residue, shape.js);

const keyAllowed = (objectKey) => shape.run({ object_key: objectKey });

check("a video key is still accepted", keyAllowed(`${COMPANY}/video/${JOB}.mp4`));
check("an image key is now accepted", keyAllowed(`${COMPANY}/image/${JOB}`));
check(
  "an image key with an extension is accepted too",
  keyAllowed(`${COMPANY}/image/${JOB}.jpg`),
);

// The whole point of keeping the guards: every one of these was refused before
// the widening and must still be.
const hostile = [
  ["a url scheme", "https://evil.example/video/out.mp4"],
  ["an s3 scheme", "s3://bucket/image/out.jpg"],
  ["a windows drive letter", "C:/Users/User/video/out.mp4"],
  ["a backslash drive letter", "C:\\Users\\User\\video\\out.mp4"],
  ["an absolute posix path", "/etc/video/passwd"],
  ["traversal out of the company prefix", `${COMPANY}/video/../../etc/passwd`],
  ["traversal in an image key", `${COMPANY}/image/../../etc/passwd`],
  ["a key with no company prefix", "/video/out.mp4"],
  ["a key with no kind segment", `${COMPANY}/renders/out.mp4`],
  ["the pre-144 render key format", `company/${COMPANY}/marketing/renders/r1/sha.mp4`],
];
for (const [label, objectKey] of hostile) {
  check(`still refused — ${label}`, !keyAllowed(objectKey), objectKey);
}

/* ------------------------------------------------------------- agreement */

console.log("\nmedia_kind, content_type and the key's own segment must agree");

const agree = compileCheck(agreement ?? "false");
check("the agreement CHECK translated with nothing left untranslated", !agree.residue, agree.js);

const row = (over) => ({
  media_kind: "video",
  content_type: "video/mp4",
  object_key: `${COMPANY}/video/${JOB}.mp4`,
  byte_size: 1024,
  ...over,
});
const agrees = (over) => agree.run(row(over));

check("a video: kind video, video/mp4, /video/ key", agrees({}));
check(
  "an image: kind image, image/jpeg, /image/ key",
  agrees({
    media_kind: "image",
    content_type: "image/jpeg",
    object_key: `${COMPANY}/image/${JOB}`,
  }),
);
for (const contentType of ["image/png", "image/webp"]) {
  check(
    `an image: ${contentType} is a first-class image type`,
    agrees({
      media_kind: "image",
      content_type: contentType,
      object_key: `${COMPANY}/image/${JOB}`,
    }),
  );
}

// THE NAMED FAILURE. A jpeg filed under a video path is what the publish path
// would pick up, believe to be a video, and hand to a resumable YouTube upload.
check(
  "REFUSED — a jpeg filed under a /video/ path",
  !agrees({
    media_kind: "image",
    content_type: "image/jpeg",
    object_key: `${COMPANY}/video/${JOB}.mp4`,
  }),
);
check(
  "REFUSED — kind video with an image content type",
  !agrees({ content_type: "image/jpeg" }),
);
check(
  "REFUSED — kind image with a video content type",
  !agrees({
    media_kind: "image",
    content_type: "video/mp4",
    object_key: `${COMPANY}/image/${JOB}`,
  }),
);
check(
  "REFUSED — a video whose key was written under /image/",
  !agrees({ object_key: `${COMPANY}/image/${JOB}` }),
);

// A key that contains BOTH segments. `like '%/video/%'` on its own is satisfied
// by a key that also contains `/image/`, so a pair of bare LIKEs lets a row pick
// whichever branch it declares and admits the exact row the constraint above
// names as impossible — a jpeg filed under a /video/ path. Nothing
// `buildMediaObjectKey` derives can contain both segments (sourceJobId is
// alphanumerics, dashes and underscores), which is the whole reason these two
// rows have to be asserted here: this CHECK is the ONLY guard standing over the
// writers that skip the derivation — service-role scripts, manual fixes, a
// future image writer — and a guard that only holds for callers who were already
// correct is not defence in depth.
check(
  "REFUSED — a jpeg under a /video/ path that smuggles an /image/ segment",
  !agrees({
    media_kind: "image",
    content_type: "image/jpeg",
    object_key: `${COMPANY}/video/thumbs/image/${JOB}.jpg`,
  }),
);
check(
  "REFUSED — an mp4 under an /image/ path that smuggles a /video/ segment",
  !agrees({
    media_kind: "video",
    content_type: "video/mp4",
    object_key: `${COMPANY}/image/nested/video/${JOB}.mp4`,
  }),
);
// The same two keys with the kind declared the other way round. Each branch has
// to EXCLUDE the foreign segment, not merely find its own somewhere in the key.
check(
  "REFUSED — kind video on a key whose path also says /image/",
  !agrees({ object_key: `${COMPANY}/video/thumbs/image/${JOB}.mp4` }),
);
check(
  "REFUSED — kind image on a key whose path also says /video/",
  !agrees({
    media_kind: "image",
    content_type: "image/jpeg",
    object_key: `${COMPANY}/image/nested/video/${JOB}.jpg`,
  }),
);

console.log("\nThe kind and content-type vocabularies are closed");

const kind = compileCheck(kindCheck ?? "false");
const type = compileCheck(typeCheck ?? "false");
check("the media_kind CHECK translated cleanly", !kind.residue, kind.js);
check("the content_type CHECK translated cleanly", !type.residue, type.js);

for (const value of ["video", "image"]) {
  check(`media_kind accepts ${value}`, kind.run({ media_kind: value }));
}
for (const value of ["thumbnail", "audio", "", "VIDEO"]) {
  check(`media_kind refuses ${value || "(empty)"}`, !kind.run({ media_kind: value }));
}
for (const value of ["video/mp4", "image/jpeg", "image/png", "image/webp"]) {
  check(`content_type accepts ${value}`, type.run({ content_type: value }));
}
for (const value of ["video/quicktime", "image/gif", "image/svg+xml", "text/html"]) {
  // svg is the one worth naming: it is a script container that storage would
  // serve back under a signed URL, and no provider in the matrix needs one.
  check(`content_type refuses ${value}`, !type.run({ content_type: value }));
}

/* ---------------------------------------------------------- image ceiling */

console.log("\nThe image ceiling is in SQL, below every application ceiling");

const size = compileCheck(imageSize ?? "false");
check("the image size CHECK translated cleanly", !size.residue, size.js);

const imageCeiling = Number(/byte_size\s*<=\s*(\d+)/.exec(imageSize ?? "")?.[1] ?? NaN);
const videoCeiling = Number(/byte_size\s*<=\s*(\d+)/.exec(videoSize ?? "")?.[1] ?? NaN);

check("an image ceiling is expressed as a literal in SQL", Number.isFinite(imageCeiling));
check("144's video ceiling is still readable", Number.isFinite(videoCeiling));
check(
  "the image ceiling is STRICTLY lower than the video ceiling",
  imageCeiling < videoCeiling,
  `${imageCeiling} vs ${videoCeiling}`,
);
check(
  "and far lower — at least ten times tighter, not a rounding difference",
  imageCeiling * 10 < videoCeiling,
  `${imageCeiling} vs ${videoCeiling}`,
);

const sized = (over) => size.run(row(over));
check(
  "an image at the ceiling is accepted",
  sized({ media_kind: "image", byte_size: imageCeiling }),
);
check(
  "an image one byte over is refused",
  !sized({ media_kind: "image", byte_size: imageCeiling + 1 }),
);
check("a zero-byte image is refused", !sized({ media_kind: "image", byte_size: 0 }));
check(
  "an image with an unknown size is accepted — a reservation exists before its bytes",
  sized({ media_kind: "image", byte_size: null }),
);
check(
  "a full-size video is untouched by the image ceiling",
  sized({ media_kind: "video", byte_size: videoCeiling }),
);

/**
 * The reason the ceiling had to be SQL: read both application constants and
 * show that neither of them would have refused an oversized image. They also
 * disagree with each other, which is the fact the migration header states.
 */
function constantValue(source, name) {
  const found = new RegExp(`export const ${name} = ([^;]+);`).exec(source);
  if (!found) return null;
  const expression = found[1].replace(/_/g, "").trim();
  if (!/^[\d\s*+]+$/.test(expression)) return null;
  return Number(new Function(`return (${expression});`)());
}

const sharedSource = readFileSync(SHARED_TYPES, "utf8");
const storageSource = readFileSync(STORAGE_MODULE, "utf8");
const sharedCeiling = constantValue(sharedSource, "MEDIA_MAX_BYTES");
const storageCeiling = constantValue(storageSource, "MARKETING_MEDIA_MAX_BYTES");

check("shared/types' ceiling is readable", Number.isFinite(sharedCeiling), sharedCeiling);
check("lib/storage's ceiling is readable", Number.isFinite(storageCeiling), storageCeiling);
check(
  "THE CONFLICT IS REAL — the two application modules disagree on a ceiling",
  sharedCeiling !== storageCeiling,
  `${sharedCeiling} vs ${storageCeiling}`,
);
check(
  "neither application ceiling would have refused an oversized image",
  imageCeiling < sharedCeiling && imageCeiling < storageCeiling,
);
check(
  "the migration header names both modules, so the conflict is documented where it bites",
  raw183.includes(SHARED_TYPES) && raw183.includes(STORAGE_MODULE),
);

/* ------------------------------------------------------- the live bridge */

console.log("\nThe live agent bridge cannot notice this migration");

const kindDefault = /media_kind\s+text\s+not\s+null\s+default\s+'([a-z]+)'/.exec(sql183)?.[1];
const typeDefault = /content_type\s+text\s+not\s+null\s+default\s+'([a-z0-9/]+)'/.exec(sql144)?.[1];

check("media_kind is NOT NULL with a default", Boolean(kindDefault), kindDefault);
check("that default is 'video' — every existing row keeps its meaning", kindDefault === "video");
check("144's content_type default is still 'video/mp4'", typeDefault === "video/mp4");
check(
  "183 does not change the content_type default out from under the bridge",
  !/alter\s+column\s+content_type\s+set\s+default/.test(sql183),
);

// The decisive check: the exact row a defaulted INSERT produces — which is
// what `reserveMediaUpload` and `uploadMarketingMedia` both write today, since
// neither knows this column exists — must satisfy every new constraint.
const defaulted = {
  media_kind: kindDefault,
  content_type: typeDefault,
  object_key: `${COMPANY}/video/${JOB}.mp4`,
  byte_size: 1024,
};
check("a fully defaulted row still satisfies the media_kind CHECK", kind.run(defaulted));
check("a fully defaulted row still satisfies the content_type CHECK", type.run(defaulted));
check("a fully defaulted row still satisfies the agreement CHECK", agree.run(defaulted));
check("a fully defaulted row still satisfies the key-shape CHECK", shape.run(defaulted));
check("a fully defaulted row still satisfies the image ceiling CHECK", size.run(defaulted));

// The key builder is what makes those keys, and the bridge calls it with two
// fields. A media-kind parameter may be added, but only as an optional one
// defaulted to video: a required parameter breaks the call sites at compile
// time, and a positional-first one silently re-points every existing key.
const builder = sharedSource.slice(
  sharedSource.indexOf("export function buildMediaObjectKey("),
  sharedSource.indexOf("/** The company a key belongs to"),
);
check("the key builder is still where the bridge imports it from", builder.length > 0);
check(
  "it still takes companyId and sourceJobId",
  /companyId/.test(builder) && /sourceJobId/.test(builder),
);
check(
  "any media-kind parameter is OPTIONAL — the bridge passes none",
  !/mediaKind/.test(builder) || /mediaKind\?\s*:/.test(builder),
);
check(
  "and defaults to video, so an unchanged caller derives an unchanged key",
  !/mediaKind/.test(builder) || /"video"/.test(builder),
);

/* ------------------------------------------------------------- the bucket */

console.log("\nThe bucket accepts images and stays private");

const bucket = sql183.slice(
  sql183.indexOf("insert into storage.buckets"),
  sql183.indexOf(";", sql183.indexOf("insert into storage.buckets")),
);
check("183 widens the existing bucket rather than creating a second one", bucket.includes("'marketing-media'"));
for (const mime of ["video/mp4", "image/jpeg", "image/png", "image/webp"]) {
  check(`the bucket accepts ${mime}`, bucket.includes(`'${mime}'`));
}
check("the bucket does NOT accept svg", !bucket.includes("image/svg"));
check("the bucket stays PRIVATE", /,\s*false\s*,/.test(bucket));
check(
  "and converges a bucket someone flipped public by hand",
  /public\s*=\s*excluded\.public/.test(bucket),
);
check(
  "the bucket file size limit still covers video",
  bucket.includes(String(videoCeiling)),
);
check(
  "no storage policy is created for authenticated or anon",
  !/create\s+policy[\s\S]*storage\.objects/.test(sql183),
);

/* --------------------------------------------------------- privilege posture */

console.log("\nPrivilege posture is restated unchanged");

check(
  "row level security stays enabled",
  /alter\s+table\s+public\.marketing_media_assets\s+enable\s+row\s+level\s+security/.test(sql183),
);
check(
  "select is granted to authenticated (RLS narrows, it does not grant)",
  /grant\s+select\s+on\s+table\s+public\.marketing_media_assets\s+to\s+authenticated/.test(sql183),
);
check(
  "writes are revoked from authenticated",
  /revoke\s+insert,\s*update,\s*delete\s+on\s+table\s+public\.marketing_media_assets\s+from\s+authenticated/.test(
    sql183,
  ),
);
check(
  "everything is revoked from anon",
  /revoke\s+all\s+on\s+table\s+public\.marketing_media_assets\s+from\s+anon/.test(sql183),
);
check(
  "service_role keeps full access",
  /grant\s+all\s+on\s+table\s+public\.marketing_media_assets\s+to\s+service_role/.test(sql183),
);
check(
  "no policy is redefined here — 144 owns the dispatcher read rule",
  !/create\s+policy/.test(sql183),
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
