/**
 * Local-only validation helper.
 *
 * The founder's company has a promoted Design Lab theme that injects 110 inline
 * CSS custom properties onto the shell, overriding the canonical foundation.
 * To SEE the source-of-truth design while working on it, this toggles a
 * temporary bypass in app/(admin)/layout.tsx.
 *
 * It never touches the database. `off` restores the file exactly.
 *
 *   node ui-audit/prestige-bypass.mjs on
 *   node ui-audit/prestige-bypass.mjs off
 */
import fs from "fs";

const FILE = "app/(admin)/layout.tsx";

// This repo checks out CRLF (core.autocrlf=true). Build the search/replace
// strings with the file's OWN line ending or nothing will ever match.
const rawSrc = fs.readFileSync(FILE, "utf8");
const EOL = rawSrc.includes("\r\n") ? "\r\n" : "\n";
const join = (lines) => lines.join(EOL);

const REAL = join([
  "  const liveThemeStyle = liveTheme",
  "    ? buildDesignLabLiveStyleVars(liveTheme.tokens)",
  "    : null;",
]);
const BYPASSED = join([
  "  /* PRESTIGE BYPASS ACTIVE — local validation only, never committed. */",
  "  void liveTheme;",
  "  void buildDesignLabLiveStyleVars;",
  "  const liveThemeStyle = null;",
]);

const mode = process.argv[2];
let src = rawSrc;

if (mode === "on") {
  if (src.includes("PRESTIGE BYPASS ACTIVE")) {
    console.log("already on");
  } else if (!src.includes(REAL)) {
    console.error("could not find the live-theme expression — aborting");
    process.exit(1);
  } else {
    fs.writeFileSync(FILE, src.replace(REAL, BYPASSED));
    console.log("bypass ON — shell renders the canonical Prestige foundation");
  }
} else if (mode === "off") {
  if (!src.includes("PRESTIGE BYPASS ACTIVE")) {
    console.log("already off");
  } else {
    fs.writeFileSync(FILE, src.replace(BYPASSED, REAL));
    console.log("bypass OFF — live Design Lab theme restored");
  }
} else {
  console.log(
    src.includes("PRESTIGE BYPASS ACTIVE") ? "status: ON" : "status: OFF",
  );
}
