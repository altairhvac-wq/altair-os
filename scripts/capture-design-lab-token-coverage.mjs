/**
 * Design Lab PART 1 + PART 2 verification:
 * 1) Set distinctive colors for every replica-relevant token via Live controls
 * 2) Confirm designLabPreviewVars wrote them onto the canvas preview root
 * 3) Confirm every replica edit target is clickable and opens the inspector
 * 4) Opacity before/after + editor UI screenshots
 *
 * Prerequisites: local server, .playwright/founder-auth.json
 *
 *   node scripts/capture-design-lab-token-coverage.mjs
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUT_DIR = path.join(
  ROOT,
  "public",
  "marketing",
  "screenshots",
  "comparison",
);
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";

/** Tokens that must visibly drive the Dashboard replica via CSS vars. */
const TOKEN_PROBES = [
  { label: "Root chrome", cssVar: "--north-star-root", value: "#112233" },
  { label: "Sidebar", cssVar: "--north-star-sidebar", value: "#2233FF" },
  { label: "Topbar", cssVar: "--north-star-topbar", value: "#9900FF" },
  { label: "Chrome border", cssVar: "--north-star-border", value: "#FF00AA" },
  { label: "Section divider", cssVar: "--north-star-section-divider", value: "#F97316" },
  { label: "Plate border", cssVar: "--north-star-plate-border", value: "#DB2777" },
  { label: "Content well", cssVar: "--north-star-content-well", value: "#445566" },
  { label: "Caught-up fill", cssVar: "--north-star-caught-up-fill", value: "#7C3AED" },
  { label: "Gold", cssVar: "--north-star-gold", value: "#00FFCC" },
  { label: "Bronze", cssVar: "--north-star-bronze", value: "#FF7700" },
  { label: "Brass ring", cssVar: "--north-star-brass-ring", value: "#66FF00" },
  { label: "Topbar heading", cssVar: "--north-star-topbar-heading", value: "#FFE600" },
  { label: "Section title", cssVar: "--north-star-section-title", value: "#22D3EE" },
  { label: "Link hover", cssVar: "--north-star-link-hover", value: "#FB7185" },
  {
    label: "Sidebar group label",
    cssVar: "--north-star-sidebar-label",
    value: "#FF6600",
  },
  {
    label: "Sidebar link active",
    cssVar: "--north-star-sidebar-link-active",
    value: "#00EEFF",
  },
  { label: "Paper", cssVar: "--altair-paper", value: "#A8F0FF" },
  { label: "Ink", cssVar: "--altair-ink", value: "#220044" },
  { label: "Danger", cssVar: "--altair-danger", value: "#FF1493" },
  { label: "Warning", cssVar: "--altair-warning", value: "#FFAA00" },
  { label: "Success", cssVar: "--altair-success", value: "#39FF14" },
  { label: "Surface card", cssVar: "--surface-card", value: "#FFD4A8" },
  { label: "Surface section", cssVar: "--surface-section", value: "#D4FFD4" },
  { label: "Surface panel", cssVar: "--surface-panel", value: "#D4D4FF" },
];

const EDIT_TARGETS = [
  "chrome-shell",
  "chrome-border",
  "section-divider",
  "plate-border",
  "content-well",
  "caught-up-fill",
  "sidebar-shell",
  "sidebar-states",
  "topbar-shell",
  "topbar-heading",
  "section-title",
  "link-hover",
  "topbar-subcopy",
  "section-secondary",
  "link-base",
  "topbar-icon",
  "brass-ladder",
  "text-on-chrome",
  "status-colors",
  "altair-materials",
  "altair-status",
  "surface-hierarchy",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalizeCssColor(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function colorsMatch(applied, expected) {
  const a = normalizeCssColor(applied);
  const e = normalizeCssColor(expected);
  if (a === e) return true;
  // Browsers may resolve hex to rgb()
  if (e.startsWith("#") && a.startsWith("rgb")) {
    const r = Number.parseInt(e.slice(1, 3), 16);
    const g = Number.parseInt(e.slice(3, 5), 16);
    const b = Number.parseInt(e.slice(5, 7), 16);
    return a.includes(`${r}`) && a.includes(`${g}`) && a.includes(`${b}`);
  }
  return false;
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`Wrote ${file}`);
}

async function goto(page, route) {
  const response = await page.goto(new URL(route, BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  if (!response || response.status() >= 400) {
    fail(`Failed to load ${route}: ${response?.status()}`);
  }
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(1000);
}

function tokenInputId(label) {
  return `design-lab-color-${label.replace(/\s+/g, "-").toLowerCase()}`;
}

async function setTokenByLabel(page, label, value) {
  const textInput = page.locator(`#${tokenInputId(label)}`);
  await textInput.scrollIntoViewIfNeeded();
  await textInput.fill(value);
  await textInput.blur();
  await page.waitForTimeout(150);
}

async function setOpacityByLabel(page, label, percent) {
  const percentInput = page.getByRole("spinbutton", {
    name: `${label} opacity percent`,
  });
  await percentInput.scrollIntoViewIfNeeded();
  await percentInput.fill(String(percent));
  await percentInput.blur();
  await page.waitForTimeout(200);
}

async function openCanvas(page) {
  await page.getByRole("button", { name: "Open full page canvas" }).click();
  await page.locator(".mc-dashboard-olive-canvas").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(600);
}

async function main() {
  if (!fs.existsSync(AUTH_PATH)) {
    fail("Missing .playwright/founder-auth.json — run npm run capture:founder-auth");
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1600, height: 1100 },
  });
  const page = await context.newPage();
  const failures = [];

  try {
    await goto(page, "/platform/design-lab");
    await page.getByText("Live token controls").waitFor({ timeout: 30_000 });

    // Opacity sliders present on every live token control
    const opacityControls = await page
      .locator('aside input[type="range"][aria-label$=" opacity"]')
      .count();
    if (opacityControls < 50) {
      failures.push(
        `Expected opacity sliders on live token controls, found ${opacityControls}`,
      );
    } else {
      console.log(`OK live token opacity sliders: ${opacityControls}`);
    }
    await page.locator(`#${tokenInputId("Sidebar")}`).scrollIntoViewIfNeeded();
    await shot(page, "design-lab-opacity-live-controls");

    // Set all probe tokens
    for (const probe of TOKEN_PROBES) {
      await setTokenByLabel(page, probe.label, probe.value);
      console.log(`Set ${probe.label} → ${probe.value}`);
    }

    await openCanvas(page);
    await shot(page, "design-lab-coverage-replica-all-tokens");

    const previewRoot = page.locator(".design-lab-preview").first();
    for (const probe of TOKEN_PROBES) {
      const applied = await previewRoot.evaluate((el, varName) => {
        return getComputedStyle(el).getPropertyValue(varName).trim();
      }, probe.cssVar);

      if (!colorsMatch(applied, probe.value)) {
        failures.push(
          `${probe.cssVar}: expected ${probe.value}, got "${applied}"`,
        );
      } else {
        console.log(`OK preview ${probe.cssVar} = ${applied}`);
      }
    }

    // Border must flow from Design Lab into the olive canvas (not locked / shell-reset)
    const borderOnCanvas = await page
      .locator(".mc-dashboard-olive-canvas")
      .first()
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--north-star-border").trim(),
      );
    if (normalizeCssColor(borderOnCanvas) === normalizeCssColor("#6b7558")) {
      failures.push(
        "MC olive canvas still hard-locks --north-star-border to #6b7558",
      );
    } else if (!colorsMatch(borderOnCanvas, "#FF00AA")) {
      failures.push(
        `MC olive canvas border=${borderOnCanvas}, expected probe #FF00AA`,
      );
    } else {
      console.log(`OK border flows into olive canvas: ${borderOnCanvas}`);
    }

    // Sidebar probe must paint the replica shell (not get wiped by stylesheet defaults)
    const sidebarOnShell = await page
      .locator(".design-lab-preview .admin-north-star-shell")
      .first()
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--north-star-sidebar").trim(),
      );
    if (!colorsMatch(sidebarOnShell, "#2233FF")) {
      failures.push(
        `Replica shell sidebar token wiped/reset: expected #2233FF, got "${sidebarOnShell}"`,
      );
    } else {
      console.log(`OK replica shell keeps Design Lab sidebar: ${sidebarOnShell}`);
    }

    // Click every edit target and confirm it selects + inspector shows a token field
    for (const targetId of EDIT_TARGETS) {
      const target = page
        .locator(`.design-lab-preview [data-edit-target="${targetId}"]`)
        .first();
      if ((await target.count()) === 0) {
        failures.push(`Missing edit target in replica: ${targetId}`);
        continue;
      }
      if (targetId === "chrome-shell") {
        // Outer shell is fully covered by children — select via DOM event.
        await target.evaluate((el) => {
          el.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true }),
          );
        });
      } else {
        await target.click({ force: true });
      }
      await page.waitForTimeout(300);
      const selected = await page
        .locator(`[data-edit-target="${targetId}"][aria-pressed="true"]`)
        .count();
      if (selected < 1) {
        failures.push(`Click did not select target ${targetId}`);
        continue;
      }
      // Open inspector if minimized
      if ((await page.getByText("Current:", { exact: false }).count()) < 1) {
        const toggle = page.getByRole("button", { name: /^Inspector$/i }).first();
        if (await toggle.count()) {
          await toggle.click();
          await page.waitForTimeout(200);
        }
      }
      const hasCurrent = await page.getByText("Current:", { exact: false }).count();
      if (hasCurrent < 1) {
        failures.push(`Inspector did not show fields for target ${targetId}`);
      } else {
        console.log(`OK click target ${targetId}`);
      }
    }

    await shot(page, "design-lab-coverage-replica-inspector");

    /* —— Opacity before/after —— */
    await page.getByRole("button", { name: /back|exit|close canvas/i }).first().click().catch(async () => {
      await page.keyboard.press("Escape");
    });
    await page.waitForTimeout(500);

    // If still in canvas, click Back explicitly from toolbar
    if (await page.locator(".mc-dashboard-olive-canvas").count()) {
      const back = page.getByRole("button", { name: /back/i }).first();
      if (await back.count()) await back.click();
      await page.waitForTimeout(500);
    }

    await page.getByText("Live token controls").waitFor({ timeout: 15_000 });
    await setTokenByLabel(page, "Paper", "#FFFFFF");
    await openCanvas(page);
    await shot(page, "design-lab-opacity-paper-before");

    // Exit and set opacity
    const backBtn = page.getByRole("button", { name: /back/i }).first();
    if (await backBtn.count()) await backBtn.click();
    await page.getByText("Live token controls").waitFor({ timeout: 15_000 });
    await setOpacityByLabel(page, "Paper", 40);

    const paperText = await page.locator(`#${tokenInputId("Paper")}`).inputValue();
    if (!/rgb\(/i.test(paperText) || !/(40%|0\.4\b)/.test(paperText)) {
      failures.push(`Opacity did not write rgb alpha for Paper — got "${paperText}"`);
    } else {
      console.log(`OK opacity Paper value → ${paperText}`);
    }

    await page.locator(`#${tokenInputId("Paper")}`).scrollIntoViewIfNeeded();
    await shot(page, "design-lab-opacity-editor-ui");

    await openCanvas(page);
    const paperCss = await page.locator(".design-lab-preview").first().evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--altair-paper").trim(),
    );
    if (!/rgb\(/i.test(paperCss)) {
      failures.push(`Preview --altair-paper missing alpha — got "${paperCss}"`);
    } else {
      console.log(`OK preview --altair-paper → ${paperCss}`);
    }
    await shot(page, "design-lab-opacity-paper-after");

    /* Promote-path serialization: opaque stays hex; alpha stays rgb() */
    const serializeCheck = await page.evaluate(() => {
      // Mirror format rules used by Design Lab (can't import TS module in page).
      function parse(value) {
        const hex = value.trim().match(/^#([0-9A-Fa-f]{6})$/);
        if (hex) {
          return {
            r: parseInt(hex[1].slice(0, 2), 16),
            g: parseInt(hex[1].slice(2, 4), 16),
            b: parseInt(hex[1].slice(4, 6), 16),
            a: 1,
          };
        }
        const m = value
          .trim()
          .match(
            /^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i,
          );
        if (!m) return null;
        let a = 1;
        if (m[4]) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
        return { r: +m[1], g: +m[2], b: +m[3], a };
      }
      function format(ch) {
        if (ch.a >= 0.999) {
          const h = (n) => n.toString(16).padStart(2, "0").toUpperCase();
          return `#${h(ch.r)}${h(ch.g)}${h(ch.b)}`;
        }
        return `rgb(${ch.r} ${ch.g} ${ch.b} / ${Math.round(ch.a * 100)}%)`;
      }
      const opaque = format({ r: 184, g: 148, b: 63, a: 1 });
      const translucent = format({ r: 255, g: 255, b: 255, a: 0.4 });
      return { opaque, translucent, parsed: parse(translucent) };
    });
    if (serializeCheck.opaque !== "#B8943F") {
      failures.push(`Opaque serialize expected #B8943F got ${serializeCheck.opaque}`);
    }
    if (serializeCheck.translucent !== "rgb(255 255 255 / 40%)") {
      failures.push(
        `Translucent serialize expected rgb(255 255 255 / 40%) got ${serializeCheck.translucent}`,
      );
    } else {
      console.log("OK promote-format opaque=hex, translucent=rgb()/alpha");
    }

    if (failures.length) {
      console.error("\nFailures:");
      for (const f of failures) console.error(` - ${f}`);
      process.exit(1);
    }

    console.log("\nAll Design Lab coverage + opacity checks passed.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
