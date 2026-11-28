/**
 * Business numbers (migration 218): the store, its rules and its wiring.
 *
 * ===================== WHAT THIS HOLDS TOGETHER =====================
 * A company's pricing numbers live in one row and are read by several
 * screens. Three things must never drift apart, and nothing but a check
 * like this would notice if they did:
 *
 *   1. The MATH. What an hour costs, the suggested rate and the break-even
 *      job count are worked out by the public calculators' own functions.
 *      The worked examples below are the numbers printed on the website;
 *      if the product ever disagrees with the calculator, this fails.
 *   2. The LIMITS. Each number has a range in TypeScript (what a form may
 *      send) and a check constraint in SQL (what the database will keep).
 *      They are compared here, number by number.
 *   3. The WALL. These numbers include wages and margins. Only an owner or
 *      admin may read them, nobody's own session may write them, and the
 *      company is never taken from a form.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-business-numbers.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { loadPureModule } from "./lib/load-pure-module.mjs";

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail === undefined ? "" : `\n        ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  }
}

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const near = (a, b, tolerance = 0.005) => a !== null && Math.abs(a - b) <= tolerance;

const FILES = {
  types: "shared/types/business-numbers.ts",
  derive: "shared/lib/business-numbers/derive.ts",
  readings: "shared/lib/business-numbers/readings.ts",
  format: "shared/lib/business-numbers/format.ts",
  migration: "supabase/migrations/218_company_business_numbers.sql",
  queries: "lib/database/queries/business-numbers.ts",
  action: "app/actions/business-numbers.ts",
  access: "lib/database/access-control.ts",
  page: "app/(admin)/settings/business-numbers/page.tsx",
  view: "shared/components/settings/business-numbers/BusinessNumbersView.tsx",
  nav: "shared/components/settings/SettingsNavigation.tsx",
  layout: "app/(admin)/settings/layout.tsx",
  dbTypes: "lib/database/types/database.ts",
  // The guided setup (piece 2).
  setupTypes: "shared/types/business-setup.ts",
  starter: "shared/lib/business-numbers/starter-price-list.ts",
  migration219: "supabase/migrations/219_service_item_pricing.sql",
  setupQueries: "lib/database/queries/business-setup.ts",
  setupActions: "app/actions/business-setup.ts",
  setupPage: "app/(admin)/get-started/page.tsx",
  setupShell: "shared/components/business-setup/GuidedSetup.tsx",
  setupSteps: "shared/components/business-setup/steps.tsx",
  setupFrame: "shared/components/business-setup/StepFrame.tsx",
  setupCard: "shared/components/business-setup/SetupProgressCard.tsx",
};

console.log("\nFiles exist");
for (const [name, path] of Object.entries(FILES)) check(`${name}: ${path}`, existsSync(path));

const types = await loadPureModule(FILES.types, "bn-types");
const { deriveBusinessNumbers } = await loadPureModule(FILES.derive, "bn-derive");
const readings = await loadPureModule(FILES.readings, "bn-readings");
const labor = await loadPureModule("shared/lib/resources/labor-rate.ts", "bn-labor");
const breakEven = await loadPureModule("shared/lib/resources/break-even.ts", "bn-be");

const EMPTY = types.EMPTY_BUSINESS_NUMBERS;
/** The website's own example shop (LABOR_RATE_DEFAULTS), as business numbers. */
const SHOP = {
  ...EMPTY,
  laborRate: 121,
  afterHoursMultiplier: 1.5,
  serviceCallFee: 49,
  partsMarkupPercent: 50,
  averageWage: 30,
  payrollBurdenPercent: 25,
  billedHoursPerWeek: 30,
  unbilledHoursPerWeek: 10,
  technicianCount: 1,
  monthlyOverhead: 6000,
  targetNetMarginPercent: 20,
  averageJobRevenue: 450,
  jobVariableCostPercent: 35,
};

/* ------------------------------------------------------------------ math */
console.log("\nThe math is the public calculators' math");
{
  const d = deriveBusinessNumbers(SHOP);
  const site = labor.calculateLaborRate(labor.LABOR_RATE_DEFAULTS);
  check("one technician: cost per billed hour equals the labor rate calculator's", d.costPerBilledHour === site.costPerBillableHour, [d.costPerBilledHour, site.costPerBillableHour]);
  check("one technician: suggested rate equals the calculator's ($120.19, $121 rounded)", d.suggestedRate === site.billableHourlyRate && d.suggestedRateRounded === 121 && near(d.suggestedRate, 120.19), d.suggestedRate);
  check("an hour costs $96.15: $50.00 of labor and $46.15 of shop costs", near(d.costPerBilledHour, 96.15) && near(d.laborPerBilledHour, 50) && near(d.overheadPerBilledHour, 46.15), [d.costPerBilledHour, d.laborPerBilledHour, d.overheadPerBilledHour]);
  check("labor and shop costs add up to the cost of an hour", near(d.laborPerBilledHour + d.overheadPerBilledHour, d.costPerBilledHour, 1e-9));
  check("loaded labor cost is wage plus payroll costs ($37.50)", near(d.loadedLaborCost, 37.5));
  check("at $121 the shop keeps 20.5% and is on target", near(d.marginAtRatePercent, 20.535, 0.01) && d.rateStanding === "on-target", [d.marginAtRatePercent, d.rateStanding]);
  check("after hours is the rate times the multiplier ($181.50)", near(d.afterHoursRate, 181.5));
  check("a $49 service call is below the $96.15 a visit costs", near(d.serviceCallCostFloor, 96.15) && d.serviceCallStanding === "below-cost");

  const two = deriveBusinessNumbers({ ...SHOP, technicianCount: 2, monthlyOverhead: 12000 });
  check("two technicians sharing $12,000 cost the same per hour as one carrying $6,000", two.costPerBilledHour === d.costPerBilledHour);
  check("two technicians bill twice the hours a month (260)", near(two.billedHoursPerMonth, 260) && near(d.billedHoursPerMonth, 130));
  const crew = deriveBusinessNumbers({ ...SHOP, technicianCount: 3 });
  check("more technicians sharing the same shop costs lower the cost of an hour", crew.costPerBilledHour < d.costPerBilledHour && near(crew.overheadPerBilledHour, 46.1538 / 3, 0.001), crew.overheadPerBilledHour);

  const be = breakEven.calculateBreakEven({ fixedMonthlyCosts: 6000, averageJobRevenue: 450, variableCostRate: 0.35 });
  check("monthly target equals the break-even calculator's (21 jobs)", d.breakEvenJobs === be.breakEvenJobs && d.breakEvenJobs === 21 && d.breakEvenJobsExact === be.breakEvenJobsExact, d.breakEvenJobs);
  check("a job leaves $292.50 toward shop costs", near(d.contributionPerJob, 292.5));

  check("a $100 rate is short of target and keeps 3.8%", deriveBusinessNumbers({ ...SHOP, laborRate: 100 }).rateStanding === "below-target" && near(deriveBusinessNumbers({ ...SHOP, laborRate: 100 }).marginAtRatePercent, 3.846, 0.01));
  check("a $90 rate is below cost", deriveBusinessNumbers({ ...SHOP, laborRate: 90 }).rateStanding === "below-cost");
  check("the suggested rate itself never reads as short of target", deriveBusinessNumbers({ ...SHOP, laborRate: d.suggestedRateRounded }).rateStanding === "on-target" && deriveBusinessNumbers({ ...SHOP, laborRate: Math.round(d.suggestedRate * 100) / 100 }).rateStanding === "on-target");
  check("a $96.15 service call covers cost but is under the rate", deriveBusinessNumbers({ ...SHOP, serviceCallFee: 96.16 }).serviceCallStanding === "below-rate");
  check("a $121 service call is at the rate", deriveBusinessNumbers({ ...SHOP, serviceCallFee: 121 }).serviceCallStanding === "at-rate");
  check("a rate typed as the cost shown on screen ($96.15) is not called a loss", deriveBusinessNumbers({ ...SHOP, laborRate: 96.15 }).rateStanding !== "below-cost");
  check("a rate a cent under cost is a loss", deriveBusinessNumbers({ ...SHOP, laborRate: 96.14 }).rateStanding === "below-cost");
  const impossible = deriveBusinessNumbers({ ...SHOP, targetNetMarginPercent: 100 });
  check("a 100% profit target gives no suggested rate but the cost of an hour stays", impossible.suggestedRate === null && near(impossible.costPerBilledHour, 96.15) && near(impossible.laborPerBilledHour, 50), impossible.costPerBilledHour);
  check("the cost of an hour does not move with the profit target", [0, 20, 60, 99.99].every((margin) => deriveBusinessNumbers({ ...SHOP, targetNetMarginPercent: margin }).costPerBilledHour === d.costPerBilledHour));
  const feeNoRate = deriveBusinessNumbers({ ...SHOP, laborRate: null });
  check("a fee is still checked against the visit's cost when no rate is set", feeNoRate.serviceCallStanding === "below-cost" && near(feeNoRate.serviceCallCostFloor, 96.15) && deriveBusinessNumbers({ ...SHOP, laborRate: null, serviceCallFee: 120 }).serviceCallStanding === null);
}

console.log("\nNothing is guessed from missing numbers");
{
  const blank = deriveBusinessNumbers(EMPTY);
  check("no numbers: every result is null", Object.entries(blank).every(([key, value]) => key === "missingForCost" || value === null), blank);
  check("no numbers: all four cost inputs are named as missing", blank.missingForCost.join() === "averageWage,payrollBurdenPercent,billedHoursPerWeek,monthlyOverhead", blank.missingForCost);
  const rateOnly = deriveBusinessNumbers({ ...EMPTY, laborRate: 121, afterHoursMultiplier: 1.5 });
  check("a typed rate with no costs: no cost, no standing, but after hours works", rateOnly.costPerBilledHour === null && rateOnly.rateStanding === null && near(rateOnly.afterHoursRate, 181.5));
  const noTarget = deriveBusinessNumbers({ ...SHOP, targetNetMarginPercent: null });
  check("no profit target: a cost but no suggested rate", near(noTarget.costPerBilledHour, 96.15) && noTarget.suggestedRate === null && noTarget.suggestedRateRounded === null);
  check("no profit target: a rate above cost is not called short", noTarget.rateStanding === "on-target");
  check("zero payroll costs and zero shop costs are real answers, not missing", deriveBusinessNumbers({ ...SHOP, payrollBurdenPercent: 0, monthlyOverhead: 0 }).missingForCost.length === 0);
  check("a zero wage or zero billed hours is missing, not a free hour", deriveBusinessNumbers({ ...SHOP, averageWage: 0 }).costPerBilledHour === null && deriveBusinessNumbers({ ...SHOP, billedHoursPerWeek: 0 }).costPerBilledHour === null);
  check("blank unbilled hours count as none; blank technician count as one", near(deriveBusinessNumbers({ ...SHOP, unbilledHoursPerWeek: null, technicianCount: null }).costPerBilledHour, (30 * 1.25 * 30 + (6000 * 12) / 52) / 30, 1e-9));
  check("no fee set: no service call standing", deriveBusinessNumbers({ ...SHOP, serviceCallFee: null }).serviceCallStanding === null);
  check("no average job: no monthly target", deriveBusinessNumbers({ ...SHOP, averageJobRevenue: null }).breakEvenJobs === null);
  check("no result is ever NaN or infinite", [SHOP, EMPTY, { ...SHOP, laborRate: 0 }, { ...SHOP, billedHoursPerWeek: 0 }, { ...SHOP, jobVariableCostPercent: 99.99 }].every((n) => Object.values(deriveBusinessNumbers(n)).every((v) => v === null || typeof v !== "number" || Number.isFinite(v))));
}

console.log("\nThe readings say what the numbers mean");
{
  const d = deriveBusinessNumbers(SHOP);
  check("on target", readings.readLaborRate(SHOP, d).tone === "good" && /At \$121 an hour you keep 20\.5%/.test(readings.readLaborRate(SHOP, d).text), readings.readLaborRate(SHOP, d));
  const low = { ...SHOP, laborRate: 90 };
  check("below cost says how much each hour loses", readings.readLaborRate(low, deriveBusinessNumbers(low)).tone === "bad" && /loses \$6\.15/.test(readings.readLaborRate(low, deriveBusinessNumbers(low)).text));
  const mid = { ...SHOP, laborRate: 100 };
  check("short of target names the rate that reaches it", readings.readLaborRate(mid, deriveBusinessNumbers(mid)).tone === "warn" && /you would charge \$121/.test(readings.readLaborRate(mid, deriveBusinessNumbers(mid)).text));
  check("hour cost breaks into labor and shop costs", /\$96\.15\. That is \$50\.00 of labor and \$46\.15 of shop costs/.test(readings.readHourCost(d).text));
  check("blank shop is asked for the four cost numbers by name", /average hourly wage, payroll costs on top, hours billed a week and shop costs each month/.test(readings.readHourCost(deriveBusinessNumbers(EMPTY)).text), readings.readHourCost(deriveBusinessNumbers(EMPTY)).text);
  check("a low service call says what each no-repair visit loses", readings.readServiceCall(SHOP, d).tone === "bad" && /\$49 fee loses \$47\.15/.test(readings.readServiceCall(SHOP, d).text));
  check("monthly target reads in jobs a month and a week", /21 jobs a month cover \$6,000 of shop costs\. That is about 5 a week/.test(readings.readMonthlyTarget(SHOP, d).text), readings.readMonthlyTarget(SHOP, d).text);
  const atCost = { ...SHOP, laborRate: 96.15 };
  check("a rate equal to the cost shown never reads 'loses $0.00'", !/loses \$0\.00/.test(readings.readLaborRate(atCost, deriveBusinessNumbers(atCost)).text) && /you keep 0% of each billed hour/.test(readings.readLaborRate(atCost, deriveBusinessNumbers(atCost)).text), readings.readLaborRate(atCost, deriveBusinessNumbers(atCost)).text);
  const noOverhead = { ...SHOP, monthlyOverhead: 0 };
  check("no shop costs: says there is no target, not '0 jobs cover $0'", /no monthly target/.test(readings.readMonthlyTarget(noOverhead, deriveBusinessNumbers(noOverhead)).text) && !/0 jobs/.test(readings.readMonthlyTarget(noOverhead, deriveBusinessNumbers(noOverhead)).text));
  const big = { ...SHOP, monthlyOverhead: 2000000, averageJobRevenue: 300, jobVariableCostPercent: 0 };
  check("a large job count gets a thousands separator", /6,667 jobs a month/.test(readings.readMonthlyTarget(big, deriveBusinessNumbers(big)).text), readings.readMonthlyTarget(big, deriveBusinessNumbers(big)).text);
  const greedy = { ...SHOP, laborRate: null, targetNetMarginPercent: 99.99 };
  check("a profit target no storable rate reaches is not offered as a rate", readings.usableSuggestedRate(deriveBusinessNumbers(greedy)) === null && /Keeping 99\.99% would take a rate no shop charges/.test(readings.readLaborRate(greedy, deriveBusinessNumbers(greedy)).text) && !/100%/.test(readings.readLaborRate(greedy, deriveBusinessNumbers(greedy)).text), readings.readLaborRate(greedy, deriveBusinessNumbers(greedy)).text);
  check("an ordinary suggested rate is offered", readings.usableSuggestedRate(d) === 121);
  const hundred = { ...SHOP, targetNetMarginPercent: 100 };
  check("a 100% profit says it has no price, and never asks for numbers already given", /A profit of 100% or more has no price/.test(readings.readLaborRate(hundred, deriveBusinessNumbers(hundred)).text) && !/Fill in what an hour costs you/.test(readings.readLaborRate(hundred, deriveBusinessNumbers(hundred)).text) && /\$96\.15/.test(readings.readHourCost(deriveBusinessNumbers(hundred)).text), readings.readLaborRate(hundred, deriveBusinessNumbers(hundred)).text);
  const allUsed = { ...SHOP, jobVariableCostPercent: 100 };
  check("a job that uses up all of its price says so, and does not ask for numbers already given", /uses up all of its price/.test(readings.readMonthlyTarget(allUsed, deriveBusinessNumbers(allUsed)).text) && !/^Add /.test(readings.readMonthlyTarget(allUsed, deriveBusinessNumbers(allUsed)).text));
  const onlyJob = { ...EMPTY, averageJobRevenue: 450 };
  check("the monthly target asks only for what is missing", readings.readMonthlyTarget(onlyJob, deriveBusinessNumbers(onlyJob)).text === "Add your shop costs each month and what a job uses up to see how many jobs cover the month.", readings.readMonthlyTarget(onlyJob, deriveBusinessNumbers(onlyJob)).text);
  const feeOnly = { ...SHOP, laborRate: null, serviceCallFee: 120 };
  check("a fee with no rate still gets a line: it covers the visit", /Your \$120 fee covers what a one-hour visit costs you \(\$96\.15\)/.test(readings.readServiceCall(feeOnly, deriveBusinessNumbers(feeOnly))?.text ?? ""), readings.readServiceCall(feeOnly, deriveBusinessNumbers(feeOnly)));
  const feeLowNoRate = { ...SHOP, laborRate: null };
  check("a low fee with no rate still reads as a loss", readings.readServiceCall(feeLowNoRate, deriveBusinessNumbers(feeLowNoRate))?.tone === "bad");
  const all = [readings.readLaborRate(atCost, deriveBusinessNumbers(atCost)), readings.readMonthlyTarget(noOverhead, deriveBusinessNumbers(noOverhead)), readings.readLaborRate(hundred, deriveBusinessNumbers(hundred)), readings.readLaborRate(SHOP, d), readings.readHourCost(d), readings.readAfterHours(d), readings.readServiceCall(SHOP, d), readings.readMonthlyTarget(SHOP, d), readings.readLaborRate(EMPTY, deriveBusinessNumbers(EMPTY)), readings.readMonthlyTarget(EMPTY, deriveBusinessNumbers(EMPTY))];
  check("no reading contains NaN, undefined, null or a long dash", all.every((r) => r && !/NaN|undefined|null|Infinity|—|–/.test(r.text)), all.map((r) => r?.text));
}

/* ------------------------------------------------------------ validation */
console.log("\nWhat a form sends is checked before anything is saved");
{
  const v = types.validateBusinessNumbersInput;
  check("reads $121, 1,250.50 and 25%", JSON.stringify(v({ laborRate: "$121", monthlyOverhead: "1,250.50", payrollBurdenPercent: "25%" }).data) === JSON.stringify({ laborRate: 121, payrollBurdenPercent: 25, monthlyOverhead: 1250.5 }), v({ laborRate: "$121", monthlyOverhead: "1,250.50", payrollBurdenPercent: "25%" }));
  check("only the keys sent come back", Object.keys(v({ laborRate: "100" }).data).join() === "laborRate");
  check("blank and null clear a number", v({ laborRate: "", serviceCallFee: null }).data.laborRate === null && v({ laborRate: "", serviceCallFee: null }).data.serviceCallFee === null);
  check("a word is refused, with its field", v({ averageWage: "thirty" }).error === "Average hourly wage needs to be a number." && v({ averageWage: "thirty" }).field === "averageWage");
  for (const bad of ["-5", "1e3", "+5", "12abc", "0x10", "1.2.3", " ", "NaN", "Infinity", "٥", "５", "--5", "5-", "$", "%", "."]) {
    const r = v({ laborRate: bad });
    check(`"${bad}" is not saved as a rate`, bad.trim() === "" ? r.data?.laborRate === null : r.error !== undefined, r);
  }
  check("NaN and Infinity as numbers are refused", v({ laborRate: Number.NaN }).error !== undefined && v({ laborRate: Number.POSITIVE_INFINITY }).error !== undefined);
  check("a 100% profit is refused (it has no price)", /under 100%/.test(v({ targetNetMarginPercent: "100" }).error ?? ""));
  check("99.99% profit is allowed", v({ targetNetMarginPercent: "99.99" }).data?.targetNetMarginPercent === 99.99);
  check("an after-hours multiplier under 1 is refused", v({ afterHoursMultiplier: "0.5" }).error !== undefined);
  check("no technicians is refused", v({ technicianCount: "0" }).error !== undefined);
  check("2.4 technicians is refused, not quietly saved as 2", v({ technicianCount: "2.4" }).error === "Technicians needs to be a whole number." && v({ technicianCount: "0.5" }).error !== undefined && v({ technicianCount: "3" }).data.technicianCount === 3);
  check("a number still being typed (\"120.\") reads as 120", types.parseBusinessNumber("120.") === 120 && types.parseBusinessNumber("120.5") === 120.5 && types.parseBusinessNumber(".5") === 0.5);
  check("\"1.250,50\" is refused, never read as $1.25", types.parseBusinessNumber("1.250,50") === "invalid" && types.parseBusinessNumber("1,2") === "invalid" && types.parseBusinessNumber("12,00") === "invalid" && types.parseBusinessNumber("1,250,000.5") === 1250000.5);
  check("a negative gets the range message, not 'needs to be a number'", v({ laborRate: "-5" }).error === "Labor rate cannot be less than $0." && v({ laborRate: "-$5" }).error === "Labor rate cannot be less than $0.");
  check("a value that is neither text nor a number is refused, not a crash", [true, ["5"], {}, () => 1].every((junk) => v({ laborRate: junk }).error === "Labor rate needs to be a number."));
  check("a very long string is refused", v({ laborRate: "1".repeat(41) }).error !== undefined);
  check("money keeps cents, hours keep one decimal", v({ laborRate: "120.196" }).data.laborRate === 120.2 && v({ billedHoursPerWeek: "30.25" }).data.billedHoursPerWeek === 30.3);
  check("the tick must be true or false", v({ serviceCallCredited: "yes" }).error !== undefined && v({ serviceCallCredited: true }).data.serviceCallCredited === true);
  check("unknown keys are dropped, never saved", v({ laborRate: "1", company_id: "x", setup_steps: {} }).data && Object.keys(v({ laborRate: "1", company_id: "x", setup_steps: {} }).data).join() === "laborRate");
  check("nothing sent is an error, not an empty save", v({}).error === "Nothing to save." && v(null).error === "Nothing to save." && v({ company_id: "x" }).error === "Nothing to save.");
  check("setup steps: unknown steps and statuses are dropped", JSON.stringify(types.parseBusinessSetupSteps({ shop: "done", rate: "skipped", other: "done", target: "maybe" })) === JSON.stringify({ shop: "done", rate: "skipped" }));
  check("setup steps: junk reads as nothing done", [null, "x", 3, [], undefined].every((junk) => Object.keys(types.parseBusinessSetupSteps(junk)).length === 0));
  check("next step is the first not yet visited", types.nextBusinessSetupStep({ steps: { shop: "done", rate: "skipped" }, completedAt: null, dismissedAt: null }) === "service-call" && types.nextBusinessSetupStep({ steps: Object.fromEntries(types.BUSINESS_SETUP_STEPS.map((s) => [s, "done"])), completedAt: null, dismissedAt: null }) === null);
}

/* ------------------------------------------------- limits: code vs. SQL */
console.log("\nThe limits in code match the limits in the database");
const sql = read(FILES.migration);
const queries = read(FILES.queries);
{
  const columnOf = Object.fromEntries([...queries.matchAll(/^\s{2}(\w+): "(\w+)",$/gm)].map((m) => [m[1], m[2]]));
  check("every number has a column", types.BUSINESS_NUMBER_KEYS.every((key) => columnOf[key]), columnOf);
  for (const key of types.BUSINESS_NUMBER_KEYS) {
    const field = types.BUSINESS_NUMBER_FIELDS[key];
    const column = columnOf[key];
    if (!column) continue;
    const scale = field.kind === "money" ? 100 : 1;
    check(`${column}: money is kept as whole cents, the rest as typed`, field.kind === "money" ? /_cents$/.test(column) && new RegExp(`${column} integer`).test(sql) : !/_cents$/.test(column));
    const between = sql.match(new RegExp(`${column} is null or ${column} between (\\d+) and (\\d+)\\)`));
    const open = sql.match(new RegExp(`${column} is null or \\(${column} >= (\\d+) and ${column} < (\\d+)\\)\\)`));
    if (field.belowMax) {
      check(`${column}: database keeps ${field.min} up to but not ${field.max}`, Boolean(open) && Number(open[1]) === field.min * scale && Number(open[2]) === field.max * scale, sql.match(new RegExp(`.*${column} is null.*`))?.[0]);
    } else {
      check(`${column}: database range ${field.min * scale} to ${field.max * scale}`, Boolean(between) && Number(between[1]) === field.min * scale && Number(between[2]) === field.max * scale, sql.match(new RegExp(`.*${column} is null.*`))?.[0]);
    }
    check(`${column}: is in the generated database types`, new RegExp(`${column}: number \\| null;`).test(read(FILES.dbTypes)));
  }
  check("money limits fit a 32-bit integer of cents", types.BUSINESS_NUMBER_KEYS.every((key) => types.BUSINESS_NUMBER_FIELDS[key].kind !== "money" || types.BUSINESS_NUMBER_FIELDS[key].max * 100 <= 2147483647));
}

/* ------------------------------------------------------------- migration */
console.log("\nMigration 218: who may read and who may write");
check("one row per company, removed with the company", /company_id uuid not null references public\.companies \(id\) on delete cascade/.test(sql) && /primary key \(company_id\)/.test(sql));
check("row level security is on", /alter table public\.company_business_numbers enable row level security/.test(sql));
check("only owners and admins of the row's company may read", /for select\s+to authenticated\s+using \(\s*public\.has_company_role\(\s*company_id,\s*array\['owner', 'admin'\]::public\.company_role\[\]\s*\)\s*\)/.test(sql));
check("there is exactly one policy, and it is a read", (sql.match(/create policy/g) ?? []).length === 1 && !/for (insert|update|delete|all)\b/.test(sql));
check("nobody's own session may write", /revoke insert, update, delete on table public\.company_business_numbers from authenticated/.test(sql) && !/grant\s+(all|insert|update|delete)[^;]*to\s+authenticated/.test(sql));
check("a signed-in session keeps the read and nothing else (no truncate, no trigger)", /revoke all on table public\.company_business_numbers from authenticated;[\s\S]*grant select on table public\.company_business_numbers to authenticated;/.test(sql) && (sql.match(/grant [^;]* to authenticated/g) ?? []).length === 1);
check("signed-out visitors get nothing", /revoke all on table public\.company_business_numbers from anon/.test(sql) && !/to\s+anon/.test(sql.replace(/--.*$/gm, "")));
check("the service role may write", /grant all on table public\.company_business_numbers to service_role/.test(sql));
check("it adds no database function", !/create (or replace )?function/.test(sql));
check("it can be run twice", /create table if not exists/.test(sql) && /drop trigger if exists/.test(sql) && /drop policy if exists/.test(sql));
check("it changes no existing table or row", !/alter table public\.(?!company_business_numbers)/.test(sql) && !/\b(update|delete from|insert into)\s+public\./.test(sql.replace(/--.*$/gm, "").replace(/before update on/g, "")));

/* ---------------------------------------------------------------- wiring */
console.log("\nThe application side of the wall");
const action = read(FILES.action);
const access = read(FILES.access);
check("access rule: owner and admin only (manageCompany)", /export function canManageBusinessNumbers\([\s\S]{0,80}\): boolean \{\s*return context\.permissions\.manageCompany;/.test(access));
check("the action is a server action", /^"use server";/.test(action));
{
  const body = action.slice(action.indexOf("export async function updateBusinessNumbersAction"), action.indexOf("export async function repricePriceBookAction"));
  const order = ["getActiveCompanyContext()", "assertBusinessNumbersAccess(context)", "expectedCompanyId !== context.company.id", "validateBusinessNumbersInput(input)", "saveCompanyBusinessNumbers("].map((needle) => body.indexOf(needle));
  check("the company the page was opened for is only compared, never used to choose where to save", (body.match(/expectedCompanyId/g) ?? []).length === 3 && !/saveCompanyBusinessNumbers\([^)]*expectedCompanyId/.test(body));
  check("the action resolves the company, checks access, checks the page's company, checks the input, then saves, in that order", order.every((at) => at > -1) && order.every((at, i) => i === 0 || at > order[i - 1]), order);
  check("the action saves to the signed-in company, never one from the form", /saveCompanyBusinessNumbers\(context\.company\.id, context, validation\.data\)/.test(body) && !/input\.company/i.test(body));
  check("the action only ever saves the checked numbers", !/saveCompanyBusinessNumbers\([^)]*\binput\b/.test(body));
}
check("the store is server-only", /^import "server-only";/.test(queries));
{
  const save = queries.slice(queries.indexOf("export async function saveCompanyBusinessNumbers"));
  const order = ["assertBusinessNumbersAccess(context)", "assertMatchingCompanyScope(context, companyId)", "createServiceRoleClient()"].map((needle) => save.indexOf(needle));
  check("the service role is reached only after the access and company checks", order.every((at) => at > -1) && order[0] < order[1] && order[1] < order[2], order);
  check("the service role is used for the write and nowhere else in the store", (queries.match(/createServiceRoleClient\(\)/g) ?? []).length === 1);
  const load = queries.slice(queries.indexOf("export async function getCompanyBusinessNumbers"), queries.indexOf("export async function isBusinessNumbersAvailableFor"));
  const probe = queries.slice(queries.indexOf("export async function isBusinessNumbersAvailableFor"), queries.indexOf("export const getActiveCompanyBusinessNumbers"));
  check("the settings menu's probe asks for the company id only, never a wage or a cost", /\.select\("company_id"\)/.test(probe) && !/select\("\*"\)/.test(probe) && /assertBusinessNumbersAccess\(context\)/.test(probe) && !/createServiceRoleClient/.test(probe));
  check("a number that is undefined is left alone; only null clears it", /if \(value === undefined\) continue;/.test(queries));
  check("reads use the signed-in person's own session (row level security decides)", /await createClient\(\)/.test(load) && !/createServiceRoleClient/.test(load));
  check("reads are scoped to the signed-in company", /\.eq\("company_id", context\.company\.id\)/.test(load));
  check("a missing table reads as 'not switched on', never an error page", /isMissingTable\(error\)[\s\S]{0,120}available: false/.test(load) && /42P01/.test(queries) && /PGRST205/.test(queries));
  check("a missing table on save returns a plain message", (save.match(/BUSINESS_NUMBERS_UNAVAILABLE_MESSAGE/g) ?? []).length >= 2);
  check("money is rounded to whole cents on the way in", /Math\.round\(value \* 100\)/.test(queries));
  check("nothing typed is logged", !/console\.(log|error|warn)\([^)]*(patch|columns|numbers)\b/.test(queries));
}
const page = read(FILES.page);
check("the page does not exist until the migration has run", /if \(!load\.available\) \{\s*notFound\(\);/.test(page));
check("the settings menu leaves the section out until the migration has run", /showBusinessNumbers \|\| item\.href !== BUSINESS_NUMBERS_HREF/.test(read(FILES.nav)) && /const showBusinessNumbers = await isBusinessNumbersAvailable\(\);/.test(read(FILES.layout)) && /showBusinessNumbers=\{showBusinessNumbers\}/.test(read(FILES.layout)));
check("the settings area is owner and admin only", /canAccessCompanySettings\(companyContext\)/.test(read(FILES.layout)));
const view = read(FILES.view);
check("the form sends only what changed", /for \(const key of changedKeys\) input\[key\] = text\[key\];/.test(view));
check("a save that throws keeps what was typed and says so (no error page)", /try \{\s*result = await updateBusinessNumbersAction\(input, companyId\);\s*\} catch \{/.test(view) && /SAVE_FAILED_MESSAGE/.test(view));
const fields = read("shared/components/business-numbers/fields.tsx");
check("boxes go read-only, not disabled, during a save (keyboard focus is kept)", /readOnly=\{busy\}/.test(fields) && !/<input[^>]*\bdisabled=/.test(fields.replace(/\n/g, " ")) && /busy=\{isPending\}/.test(view));
check("a refused number is focused and tied to its message", /showField\(result\.field\)/.test(view) && /aria-describedby=\{describedBy\}/.test(fields) && /aria-invalid=\{errorId \? true : undefined\}/.test(fields) && /errorId=\{badField === field \? feedbackId : null\}/.test(view));
check("the phone save bar carries the message for a save that did not go through", /admin-sticky-footer sm:hidden[\s\S]{0,200}feedback\?\.tone === "error"[\s\S]{0,120}role="alert"/.test(view));
check("a rate that cannot be stored is never offered", /const suggested = usableSuggestedRate\(derived\);/.test(view));
check("the screen works the readings out with the shared math, not its own", /deriveBusinessNumbers\(numbers\)/.test(view) && !/\* 12\) \/ 52|\/ \(1 - /.test(view));
check("the math files import nothing but each other and the calculators", [FILES.derive, FILES.readings, FILES.format, FILES.types].every((path) => [...read(path).matchAll(/from "([^"]+)"/g)].every((m) => m[1].startsWith("."))));

/* ===================================================== the guided setup */
const setupTypes = await loadPureModule(FILES.setupTypes, "bn-setup");
const starter = await loadPureModule(FILES.starter, "bn-starter");
const flat = await loadPureModule("shared/lib/resources/flat-rate-list.ts", "bn-flat");

console.log("\nThe starter price list is priced with the public price list's formula");
{
  const hvac = starter.starterTasksForTrade("hvac");
  const general = starter.starterTasksForTrade("plumbing");
  check("HVAC gets ten repairs; every other trade gets a short list by size of job", hvac.length === 10 && general.length === 4 && starter.starterTasksForTrade(null).length === 4 && starter.starterTasksForTrade("nonsense").length === 4);
  const all = [...hvac, ...general];
  check("every key is unique, lower case, and fits the database's rule for setup keys", new Set(all.map((t) => t.key)).size === all.length && all.every((t) => /^[a-z0-9_]{1,60}$/.test(t.key)), all.map((t) => t.key));
  check("the service call key fits the same rule and is not a starter key", /^[a-z0-9_]{1,60}$/.test(starter.SERVICE_CALL_SETUP_KEY) && !starter.STARTER_TASK_KEYS.has(starter.SERVICE_CALL_SETUP_KEY));
  check("the list of known keys is exactly the starter keys", starter.STARTER_TASK_KEYS.size === all.length && all.every((t) => starter.STARTER_TASK_KEYS.has(t.key)));
  check("every starter job has a name, some hours, and no negative part cost", all.every((t) => t.name.length >= 2 && t.name.length <= 80 && t.bookHours > 0 && t.bookHours <= 1000 && t.partCost >= 0));
  check("the website's eight sample repairs are all on the HVAC list, with the same hours and part costs", flat.FLAT_RATE_SAMPLE_TASKS.every((sample) => hvac.some((t) => t.name === sample.name && t.bookHours === sample.bookHours && t.partCost === sample.partCost)));
  const cap = hvac.find((t) => t.key === "hvac_capacitor");
  const line = starter.priceStarterLine(cap, 121, 100, 1.5);
  const site = flat.priceListLine({ bookHours: cap.bookHours, partCost: cap.partCost, markupPercent: 100 }, 121, 1.5, "dollar");
  check("a line's price equals the public price list's, to the dollar ($127, $173 after hours)", line.standard === site.standard && line.afterHours === site.afterHours && line.standard === 127 && line.afterHours === 173, line);
  check("prices are whole dollars, rounded up", all.every((t) => Number.isInteger(starter.priceStarterLine(t, 97.37, 55, 1.5).standard) && starter.priceStarterLine(t, 97.37, 55, 1.5).standard >= t.bookHours * 97.37 + t.partCost * 1.55 - 1e-9));
  check("after hours raises the labor only, never the part", starter.priceStarterLine({ bookHours: 0, partCost: 100 }, 121, 50, 2).afterHours === 150 && starter.priceStarterLine({ bookHours: 1, partCost: 0 }, 121, 50, 2).afterHours === 242);
}

console.log("\nThe price list a form sends is checked before anything is added");
{
  const KEYS = starter.STARTER_TASK_KEYS;
  const v = (input) => setupTypes.validatePriceListStepInput(input, KEYS, starter.STARTER_MAX_TASKS);
  const ok = v({ markupPercent: "100", tasks: [{ key: "hvac_capacitor", name: " Replace  run capacitor ", bookHours: "0.75", partCost: "18" }, { key: null, name: "Duct leak repair", bookHours: 2, partCost: "" }] });
  check("a good list comes back tidied (names trimmed, blank part cost is none)", ok.data && ok.data.markupPercent === 100 && ok.data.tasks[0].name === "Replace run capacitor" && ok.data.tasks[1].partCost === 0 && ok.data.tasks[1].key === null, ok);
  check("an unknown key is refused (a form cannot name its own setup key)", v({ markupPercent: "100", tasks: [{ key: "service_call", name: "X job", bookHours: 1, partCost: 0 }] }).error !== undefined && v({ markupPercent: "100", tasks: [{ key: "made_up", name: "X job", bookHours: 1, partCost: 0 }] }).error !== undefined);
  check("the same name twice is refused, whatever the capitals", /on the list twice/.test(v({ markupPercent: "0", tasks: [{ key: null, name: "Tune up", bookHours: 1, partCost: 0 }, { key: null, name: "tune UP", bookHours: 1, partCost: 0 }] }).error ?? ""));
  check("the same starter job twice is refused", v({ markupPercent: "0", tasks: [{ key: "hvac_igniter", name: "A", bookHours: 1, partCost: 0 }, { key: "hvac_igniter", name: "B", bookHours: 1, partCost: 0 }] }).error !== undefined);
  check("a problem names its row", v({ markupPercent: "0", tasks: [{ key: null, name: "Good job", bookHours: 1, partCost: 0 }, { key: null, name: "Bad job", bookHours: "lots", partCost: 0 }] }).row === 1);
  check("a job with no hours and no part has no price and is refused", /has no price/.test(v({ markupPercent: "0", tasks: [{ key: null, name: "Nothing", bookHours: 0, partCost: 0 }] }).error ?? ""));
  check("an empty list, a nameless job and a missing markup are refused", v({ markupPercent: "100", tasks: [] }).error !== undefined && v({ markupPercent: "100", tasks: [{ key: null, name: " ", bookHours: 1, partCost: 0 }] }).error !== undefined && v({ markupPercent: "", tasks: [{ key: null, name: "Job", bookHours: 1, partCost: 0 }] }).error !== undefined);
  check("more jobs than the limit are refused", v({ markupPercent: "0", tasks: Array.from({ length: starter.STARTER_MAX_TASKS + 1 }, (_, i) => ({ key: null, name: `Job ${i}`, bookHours: 1, partCost: 0 })) }).error !== undefined);
  check("out-of-range hours, part cost and markup are refused", v({ markupPercent: "0", tasks: [{ key: null, name: "Job", bookHours: 1001, partCost: 0 }] }).error !== undefined && v({ markupPercent: "0", tasks: [{ key: null, name: "Job", bookHours: 1, partCost: 100001 }] }).error !== undefined && v({ markupPercent: "1001", tasks: [{ key: null, name: "Job", bookHours: 1, partCost: 0 }] }).error !== undefined && v({ markupPercent: "-1", tasks: [{ key: null, name: "Job", bookHours: 1, partCost: 0 }] }).error !== undefined);
  check("junk in place of a list is refused, not a crash", [null, undefined, "x", {}, { tasks: "x" }, { markupPercent: 1, tasks: [null] }, { markupPercent: 1, tasks: [7] }].every((junk) => v(junk).error !== undefined));
  const custom = "custom_0123456789ab";
  check("a job the owner added before keeps its own key; a made-up one in that shape is treated as that, nothing else", v({ markupPercent: "0", tasks: [{ key: custom, name: "Duct leak repair", bookHours: 2, partCost: 25 }] }).data?.tasks[0].key === custom && v({ markupPercent: "0", tasks: [{ key: "custom_short", name: "X job", bookHours: 1, partCost: 0 }] }).error !== undefined && v({ markupPercent: "0", tasks: [{ key: "CUSTOM_0123456789AB", name: "X job", bookHours: 1, partCost: 0 }] }).error !== undefined);
  check("jobs to remove are checked like keys, and a list of only removals is allowed", JSON.stringify(v({ markupPercent: "0", tasks: [], removeKeys: ["hvac_igniter", custom, "hvac_igniter"] }).data?.removeKeys) === JSON.stringify(["hvac_igniter", custom]) && v({ markupPercent: "0", tasks: [], removeKeys: ["made_up"] }).error !== undefined && v({ markupPercent: "0", tasks: [], removeKeys: "hvac_igniter" }).error !== undefined && v({ markupPercent: "0", tasks: [], removeKeys: [] }).error !== undefined);
  check("a job cannot be both kept and removed", v({ markupPercent: "0", tasks: [{ key: "hvac_igniter", name: "Igniter", bookHours: 1, partCost: 0 }], removeKeys: ["hvac_igniter"] }).error !== undefined);
  check("a markup problem names the markup box", v({ markupPercent: "lots", tasks: [{ key: null, name: "Job", bookHours: 1, partCost: 0 }] }).field === "markupPercent" && v({ markupPercent: "1001", tasks: [{ key: null, name: "Job", bookHours: 1, partCost: 0 }] }).field === "markupPercent");
  check("the screen and the save round hours and part costs the same way (0.333 hours is 0.33)", setupTypes.roundPriceListNumber(0.333) === 0.33 && v({ markupPercent: "0", tasks: [{ key: null, name: "Job", bookHours: "0.333", partCost: "9.999" }] }).data.tasks[0].bookHours === 0.33 && v({ markupPercent: "0", tasks: [{ key: null, name: "Job", bookHours: "0.333", partCost: "9.999" }] }).data.tasks[0].partCost === 10);
  check("the limits match migration 219's (hours 0-1000, markup 0-1000)", setupTypes.PRICE_LIST_MAX_HOURS === 1000 && setupTypes.PRICE_LIST_MAX_MARKUP === 1000);
  const contact = setupTypes.validateShopContact({ phone: " 801-555-0142 ", city: "", state: null, addressLine1: "x".repeat(201) });
  check("shop details: too long is refused with its field", contact.error !== undefined && contact.field === "addressLine1");
  const tidy = setupTypes.validateShopContact({ phone: " 801-555-0142 ", city: "", state: null });
  check("shop details: only the boxes sent come back; blank clears", JSON.stringify(tidy.data) === JSON.stringify({ phone: "801-555-0142", city: null, state: null }), tidy);
  check("shop details: a value that is not text is refused", setupTypes.validateShopContact({ phone: 8015550142 }).error !== undefined);
}

console.log("\nMigration 219: the price book's pricing columns");
{
  const sql219 = read(FILES.migration219);
  const code219 = sql219.replace(/--.*$/gm, "");
  check("it only adds columns to service_items (no new table, no function, no policy or grant change)", /alter table public\.service_items\s+add column if not exists book_hours/.test(sql219) && !/create table|create (or replace )?function|create policy|\bgrant\b|\brevoke\b/.test(code219));
  check("every existing item stays priced by hand", /price_source text not null default 'manual'/.test(sql219) && !/\bupdate\s+public\.service_items/.test(code219));
  check("a rate-priced item must say how many hours it is", /check \(price_source <> 'rate' or book_hours is not null\)/.test(sql219));
  check("price_source can only be manual or rate", /check \(price_source in \('manual', 'rate'\)\)/.test(sql219));
  check("hours and markup ranges match the code's", /book_hours is null or book_hours between 0 and 1000/.test(sql219) && /parts_markup_percent is null or parts_markup_percent between 0 and 1000/.test(sql219));
  check("one live item per setup key per company; an item in the trash does not block", /create unique index if not exists service_items_company_setup_key_idx\s+on public\.service_items \(company_id, setup_key\)\s+where setup_key is not null and deleted_at is null/.test(sql219));
  check("it can be run twice", (code219.match(/add constraint/g) ?? []).length === (code219.match(/drop constraint if exists/g) ?? []).length && /add column if not exists/.test(sql219) && /create unique index if not exists/.test(sql219));
  const coreTables = read("lib/database/types/core-tables.ts");
  check("the new columns are optional in the row type (a database without 219 returns rows without them)", /book_hours\?: number \| null;[\s\S]{0,200}price_source\?: "manual" \| "rate";[\s\S]{0,80}setup_key\?: string \| null;/.test(coreTables));
  check("existing price book code still reads whole rows, so it works with or without 219", !/select\("[^"*]*(book_hours|setup_key|price_source)/.test(read("lib/database/queries/service-items.ts")));
}

console.log("\nThe guided setup's actions");
{
  const actions = read(FILES.setupActions);
  const setupQueries = read(FILES.setupQueries);
  check("the actions are server actions", /^"use server";/.test(actions));
  const gate = actions.slice(actions.indexOf("async function requireSetupContext"), actions.indexOf("function revalidateSetupPaths"));
  const gateOrder = ["getActiveCompanyContext()", "assertBusinessNumbersAccess(context)", "expectedCompanyId !== context.company.id", "getGuidedSetupAvailability()"].map((needle) => gate.indexOf(needle));
  check("every save goes through one gate: signed-in company, owner or admin, the page's company, setup switched on", gateOrder.every((at) => at > -1) && gateOrder.every((at, i) => i === 0 || at > gateOrder[i - 1]), gateOrder);
  const exported = [...actions.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
  check("seven actions, and each one calls the gate before anything else", exported.length === 7 && exported.every((name) => new RegExp(`export async function ${name}\\([^)]*\\): Promise<SetupActionResult> \\{\\s*const required = await requireSetupContext\\(expectedCompanyId\\);\\s*if \\("error" in required\\) return \\{ error: required\\.error \\};`).test(actions)), exported);
  check("no action takes the company from the form", !/input\??\.company|\.companyId\b/.test(actions.replace(/context\.company\.id/g, "")));
  check("each step passes on only the numbers it owns", /pick\(input, RATE_KEYS\)/.test(actions) && /pick\(input, \["serviceCallFee", "serviceCallCredited"\]\)/.test(actions) && /pick\(input, \["monthlyOverhead", "averageJobRevenue", "jobVariableCostPercent"\]\)/.test(actions));
  check("the price list is priced from the stored rate, never one sent by the form", /const laborRate = record\.numbers\.laborRate;/.test(actions) && !/input\.laborRate/.test(actions));
  check("a skip never undoes a finished step", /status === "skipped" && record\.setup\.steps\[step\] === "done" \? "done" : status/.test(actions));
  check("the setup completes once, the first time every step has been visited", /allVisited && !record\.setup\.completedAt \? new Date\(\)\.toISOString\(\) : undefined/.test(actions));
  check("a step's numbers and its done mark are saved in one write", /saveCompanyBusinessNumbers\(context\.company\.id, context, patch, await stepMark\(context, step, "done"\)\)/.test(actions));
  check("the setup's own queries are server-only and use the signed-in session (no service role)", /^import "server-only";/.test(setupQueries) && !/createServiceRoleClient/.test(setupQueries));
  const writers = ["updateCompanyShopContact", "saveSetupPriceList", "saveServiceCallItem"];
  check("each write checks owner/admin and the company before touching the database", writers.every((name) => new RegExp(`export async function ${name}\\([\\s\\S]{0,400}?const accessError = assertBusinessNumbersAccess\\(context\\) \\?\\? assertMatchingCompanyScope\\(context, companyId\\);\\s*if \\(accessError\\) return`).test(setupQueries)));
  check("the shop step never writes the company's name, trade or time zone", !/\b(name|trade|timezone):/.test(setupQueries.slice(setupQueries.indexOf("export async function updateCompanyShopContact"), setupQueries.indexOf("export async function saveSetupPriceList"))));
  check("every price book write is scoped to the company", (setupQueries.match(/\.from\("service_items"\)/g) ?? []).length === (setupQueries.match(/\.eq\("company_id", (companyId|context\.company\.id)\)|company_id: companyId/g) ?? []).length, [(setupQueries.match(/\.from\("service_items"\)/g) ?? []).length, (setupQueries.match(/\.eq\("company_id", (companyId|context\.company\.id)\)|company_id: companyId/g) ?? []).length]);
  check("the setup never deletes a price book item", !/\.delete\(\)/.test(setupQueries));
  const save = setupQueries.slice(setupQueries.indexOf("export async function saveSetupPriceList"), setupQueries.indexOf("export async function saveServiceCallItem"));
  check("names are matched one at a time, exactly, never as a list filter (a name may hold commas and quotes)", /\.eq\("name", task\.name\)/.test(save) && !/\.in\("name"/.test(setupQueries));
  check("an unticked job is archived, never deleted, and only if the setup made it and the owner has not archived it already", /for \(const key of step\.removeKeys\)/.test(save) && /update\(\{ archived_at: archivedAt, is_active: false \}\)/.test(save) && /NUMBER_ITEM_KEYS\.has\(key\) \|\| row\.archived_at !== null\) continue;/.test(save));
  check("a job being added that matches the owner's own item is refused, not overwritten", /Your price book already has/.test(save) && save.indexOf("customByName.get(task.name)") < save.indexOf('.eq("name", task.name)'));
  check("a job the owner added gets a key of its own from the server", /setup_key: isStarterKey \? task\.key : newCustomKey\(\)/.test(save) && /return `custom_\$\{randomUUID\(\)\.replace\(\/-\/g, ""\)\.slice\(0, 12\)\}`;/.test(setupQueries));
  check("an item in the trash gives up its key before the setup makes that item again", (setupQueries.match(/await releaseTrashedSetupKeys\(/g) ?? []).length === 2 && /update\(\{ setup_key: null \}\)[\s\S]{0,120}\.not\("deleted_at", "is", null\)/.test(setupQueries));
  check("the setup shows a job the owner has re-priced or archived as theirs, and leaves it unless ticked", /handPriced: row\.price_source !== "rate" && !NUMBER_ITEM_KEYS\.has\(row\.setup_key\)/.test(setupQueries) && /active: row\.archived_at === null && row\.is_active !== false/.test(setupQueries) && /checked: existing \? !isOwnersNow\(existing\) : keptBefore \? false : task\.common/.test(read(FILES.setupSteps)));
  const priceBookQueries = read("lib/database/queries/service-items.ts");
  check("a price typed by hand in the price book makes a rate-priced item the owner's (manual)", /currentRow\?\.price_source === "rate" &&\s*Number\(currentRow\.unit_price\) !== update\.unit_price\s*\) \{\s*update\.price_source = "manual";/.test(priceBookQueries));
  check("that check reads the whole row, so it works before migration 219", /\.select\("\*"\)\s*\.eq\("company_id", companyId\)\s*\.eq\("id", serviceItemId\)\s*\.maybeSingle\(\);/.test(priceBookQueries));
  const numbersAction = read(FILES.action);
  check("a fee changed in Settings reaches the price book's Service call item, and never adds one", /saveServiceCallItem\(context\.company\.id, context, record\.numbers\.serviceCallFee, \{ createIfMissing: false, previous \}\)/.test(numbersAction) && /createIfMissing: true, previous: \{ serviceCallFee: stored\.numbers\.serviceCallFee \}/.test(actions) && /if \(!item\.create \|\| item\.price === null\) return \{ error: null \};/.test(setupQueries));
  check("a blank sales tax clears a saved rate instead of pretending to", /typedTax === "" && "defaultTaxRate" in input && hasSavedCompanyBillingDefaults\(context\.company\.settings\) \? "0" : typedTax/.test(actions));
  check("the shop step survives an argument that is not an object", /const input: ShopStepInput = rawInput && typeof rawInput === "object" \? rawInput : \{\};/.test(actions));
  check("setup-made items are marked as priced from the rate, with their hours", /price_source: "rate" as const/.test(setupQueries) && /book_hours: task\.bookHours/.test(setupQueries));
  check("availability needs both migrations: the numbers table and the price book columns", /if \(!\(await isBusinessNumbersAvailableFor\(context\)\)\) return false;/.test(setupQueries) && /\.select\("id, book_hours, parts_markup_percent, price_source, setup_key"\)/.test(setupQueries) && /isMissingDatabaseColumnError\(error\)/.test(setupQueries));
}

console.log("\nThe guided setup's screens and the way in");
{
  const setupPage = read(FILES.setupPage);
  const shell = read(FILES.setupShell);
  const steps = read(FILES.setupSteps);
  const frame = read(FILES.setupFrame);
  const card = read(FILES.setupCard);
  const dashboard = read("app/(admin)/(home)/page.tsx");
  check("the page sends anyone who cannot run the setup to the dashboard", /if \(!canManageBusinessNumbers\(context\) \|\| !\(await getGuidedSetupAvailability\(\)\)\) \{\s*redirect\("\/"\);/.test(setupPage));
  check("the steps on screen are the steps in the store, in the same order", types.BUSINESS_SETUP_STEPS.join() === "shop,rate,service-call,price-list,target" && types.BUSINESS_SETUP_STEPS.every((step) => new RegExp(`view === "${step}"`).test(shell)));
  check("every step can be skipped and left", /Skip for now/.test(frame) && /onSkip/.test(frame) && /I&apos;ll do this later/.test(shell) && /<Link href="\/"/.test(shell));
  check("a save that throws keeps the page (no error screen)", /try \{\s*result = await call\(\);\s*\} catch \{/.test(frame) && /try \{\s*result = await skipSetupStepAction\(step, companyId\);\s*\} catch \{/.test(shell));
  check("the phone bar sits on the tab-bar offset class, not a fixed position of its own", /admin-sticky-footer sm:hidden/.test(frame));
  check("examples are labelled as examples", /example numbers for a one-truck shop/.test(steps));
  check("example numbers nobody touched are never saved as the company's own", /if \(mode === "work" && !\(usingExamples && !edited\)\) for \(const key of RATE_INPUT_KEYS\) input\[key\] = inputs\[key\];/.test(steps) && /averageJobRevenue: numberToFieldText\(numbers\.averageJobRevenue\),/.test(steps) && /placeholder: String\(BREAK_EVEN_DEFAULTS\.averageJobRevenue\)/.test(steps));
  check("the price on screen is rounded the way the save rounds it", /priceStarterLine\(\{ bookHours: roundPriceListNumber\(hours\), partCost: roundPriceListNumber\(part\) \}/.test(steps));
  check("Enter in a job's box does not send the whole list", (steps.match(/onKeyDown=\{keepEnter\}/g) ?? []).length === 3);
  check("a new screen starts at its top with the question focused", /screen\?\.scrollIntoView\(\{ block: "start" \}\)/.test(shell) && /querySelector<HTMLElement>\("h1"\)\?\.focus\(\{ preventScroll: true \}\)/.test(shell) && /<h1 tabIndex=\{-1\}/.test(frame));
  check("calculator numbers stop being offered to the step once the rate is saved", /if \(step === "rate"\) setPrefill\(null\);/.test(shell));
  check("on a phone one message is announced, not two", /aria-live="polite" className="mt-3 min-h-0 max-sm:hidden"/.test(frame));
  check("the steps use the shared math and sentences, not their own", /deriveBusinessNumbers\(/.test(steps) && /priceStarterLine\(/.test(steps) && !/\* 12\) \/ 52|\/ \(1 - /.test(steps));
  check("website calculator numbers stay in the browser until the step's own button is pressed", /useCarried\(\)/.test(shell) && !/Action\(/.test(shell.slice(shell.indexOf("function toRatePrefill"), shell.indexOf("export function GuidedSetup"))) && /setPrefill\(toRatePrefill\(carried\)\)/.test(shell));
  check("no step promises a use the product does not have", !/profit shown on each job|dashboard tracks/i.test(steps) && !/dashboard tracks/i.test(shell));
  check("the labor promise on the rate step is the one the product keeps: a Labor item in the price book", /a Labor item in your price book, so labor at your rate is one pick away on every estimate and invoice/.test(steps) && /saveLaborItems\(/.test(read(FILES.setupActions)));
  check("the dashboard offers the setup only when it can run, is unfinished and was not put off", /if \(!canManageBusinessNumbers\(companyContext\)\) \{\s*return null;/.test(dashboard) && /if \(!available\) \{\s*return null;/.test(dashboard) && /if \(record\.setup\.completedAt \|\| record\.setup\.dismissedAt\) \{\s*return \{ setup: null, target \};/.test(dashboard) && /if \(!\(await getGuidedSetupAvailability\(\)\)\) \{\s*return \{ setup: null, target \};/.test(dashboard) && /\{setupCard\?\.setup \? \(/.test(dashboard));
  check("a company that finished or put off the setup costs the dashboard one read, not three", dashboard.indexOf("getCompanyBusinessNumbers(companyContext)") < dashboard.indexOf("if (!(await getGuidedSetupAvailability()))"));
  check("the card counts finished steps as done, not skipped ones", /done: BUSINESS_SETUP_STEPS\.filter\(\(step\) => record\.setup\.steps\[step\] === "done"\)\.length/.test(dashboard) && /`\$\{done\} of \$\{total\} steps done\./.test(card));
  check("the cards are placed above the dashboard for computer and phone alike", dashboard.indexOf("<SetupProgressCard") > -1 && dashboard.indexOf("<SetupProgressCard") < dashboard.indexOf("<MonthlyTargetCard") && dashboard.indexOf("<MonthlyTargetCard") < dashboard.indexOf("<OperationalDashboardView") && /dismissGuidedSetupAction\(companyId\)/.test(card));
  const redirects = read("lib/auth/redirects.ts");
  const auth = read("app/actions/auth.ts");
  const postAuth = read("lib/auth/post-auth.ts");
  check("a new company opens on the setup only when it was not already heading somewhere, and only where the setup can run", /createdCompany &&\s*!next &&\s*\(await getGuidedSetupAvailabilityFor\(companyContext\)\)/.test(auth) && /startOnSetup \? NEW_COMPANY_START_PATH : next/.test(auth) && /createdCompany &&\s*!requested &&\s*\(await getGuidedSetupAvailabilityFor\(companyContext\)\)/.test(postAuth) && /startOnSetup \? NEW_COMPANY_START_PATH : requested/.test(postAuth));
  check("only a request that just created the company sets that flag", (auth.match(/createdCompany = true;/g) ?? []).length === 2 && (postAuth.match(/createdCompany = true;/g) ?? []).length === 1 && /redirectAfterAuth\(next, Boolean\(bootstrapResult\.companyId\)\)/.test(auth));
  check("the setup path is an allowed destination, owner/admin only, and known to the gatekeeper", /export const NEW_COMPANY_START_PATH = "\/get-started";/.test(redirects) && /"\/get-started",/.test(redirects) && /if \(path === "\/get-started"\) \{\s*return canManageBusinessNumbers\(context\);/.test(read(FILES.access)) && /"\/get-started",/.test(read("lib/supabase/middleware.ts")));
}

/* ============================================= the numbers at work */
console.log("\nLabor in the price book, and re-pricing when the rate changes");
{
  const price = starter.priceRateItem;
  const job = { setupKey: "hvac_capacitor", bookHours: 0.75, partCost: 18, markupPercent: 100 };
  check("a job re-prices with the price list's own formula ($127 at $121, $132 at $128)", price(job, 121, 1.5) === 127 && price(job, 128, 1.5) === 132 && price(job, 121, 1.5) === starter.priceStarterLine(job, 121, 100, 1.5).standard);
  check("the labor item is the rate itself, to the cent (never rounded up to a dollar)", price({ setupKey: starter.LABOR_SETUP_KEY, bookHours: 1, partCost: null, markupPercent: null }, 120.19, 1.5) === 120.19);
  check("the after-hours labor item is the rate times the multiplier ($181.50)", price({ setupKey: starter.AFTER_HOURS_LABOR_SETUP_KEY, bookHours: 1, partCost: null, markupPercent: null }, 121, 1.5) === 181.5);
  check("nothing is priced without a rate, and a job without hours is left alone", price(job, null, 1.5) === null && price(job, 0, 1.5) === null && price({ ...job, bookHours: null }, 121, 1.5) === null);
  check("a blank after-hours multiplier uses the starter's 1.5; a blank part cost or markup is none", price({ setupKey: starter.AFTER_HOURS_LABOR_SETUP_KEY, bookHours: 1, partCost: null, markupPercent: null }, 100, null) === 150 && price({ setupKey: "x", bookHours: 2, partCost: null, markupPercent: null }, 100, null) === 200);
  check("the labor and service call keys fit the database's rule, and no form can name them", [starter.LABOR_SETUP_KEY, starter.AFTER_HOURS_LABOR_SETUP_KEY, starter.SERVICE_CALL_SETUP_KEY].every((key) => /^[a-z0-9_]{1,60}$/.test(key) && starter.NUMBER_ITEM_KEYS.has(key) && !starter.STARTER_TASK_KEYS.has(key) && !setupTypes.CUSTOM_SETUP_KEY_PATTERN.test(key)));

  const setupQueries = read(FILES.setupQueries);
  const setupActions = read(FILES.setupActions);
  const numbersAction = read(FILES.action);
  check("the rate step puts labor in the price book; Settings only keeps existing labor items in step", /saveLaborItems\([\s\S]{0,300}\{ createIfMissing: true, previous: \{ laborRate: stored\.numbers\.laborRate, afterHoursMultiplier: stored\.numbers\.afterHoursMultiplier \} \},\s*\);/.test(setupActions) && /saveLaborItems\(context\.company\.id, context, record\.numbers, \{ createIfMissing: false, previous \}\)/.test(numbersAction));
  check("the after-hours labor item is only made beside a live, active labor item, when the setup runs or the after-hours rate first appears", /if \(afterHours && \(options\.createIfMissing \|\| afterHoursReappeared\)\) \{/.test(setupQueries) && /\.eq\("setup_key", LABOR_SETUP_KEY\)\s*\.is\("deleted_at", null\)\s*\.is\("archived_at", null\)/.test(setupQueries) && /create = Boolean\(laborItem\);/.test(setupQueries));
  const sync = setupQueries.slice(setupQueries.indexOf("async function syncNumberItem"), setupQueries.indexOf("export type PreviousNumbers"));
  check("a labor item the owner has priced by hand is never changed or archived from here", /if \(item\.source === "rate" && existing\.price_source !== "rate"\) return \{ error: null \};/.test(sync) && /if \(item\.source === "rate"\) update = update\.eq\("price_source", "rate"\);/.test(sync));
  check("when a number is cleared its item is archived, not left pickable at the old price", /item\.price === null\s*\? \{ archived_at: new Date\(\)\.toISOString\(\), is_active: false \}/.test(sync));
  check("an item comes back from the archive only when its number comes back; otherwise active or archived is the owner's call", /: \{ unit_price: item\.price, \.\.\.\(item\.reappeared \? \{ archived_at: null, is_active: true \} : \{\}\) \}/.test(sync));
  check("an after-hours multiplier of 1 or none means no after-hours item", /return multiplier !== null && multiplier !== undefined && Number\.isFinite\(multiplier\) && multiplier > 1;/.test(setupQueries) && /price: afterHours \? priceRateItem\(/.test(setupQueries));
  check("labor and the service call start untaxed, and the setup says so", /taxable: false,/.test(sync) && /The Labor item starts as not taxed\. Whether labor is taxed differs by state/.test(read(FILES.setupSteps)) && /It starts as not taxed; tick Taxable on it in your price book if your state taxes service calls/.test(read(FILES.setupSteps)));
  check("Settings reads what the numbers were before saving, so an item can come back with its number", numbersAction.indexOf("const { record: before } = await getCompanyBusinessNumbers(context);") > -1 && numbersAction.indexOf("const { record: before } = await getCompanyBusinessNumbers(context);") < numbersAction.indexOf("await saveCompanyBusinessNumbers(context.company.id, context, validation.data)"));
  const stale = setupQueries.slice(setupQueries.indexOf("export async function listOutOfDateRateItems"), setupQueries.indexOf("export async function repriceRateItems"));
  check("only live, active items are ever listed for re-pricing, and never a hand-priced one", /if \(row\.archived_at !== null \|\| row\.is_active === false\) continue;/.test(stale) && /if \(row\.price_source !== "rate"\) continue;/.test(stale) && /\.is\("deleted_at", null\)/.test(setupQueries));
  check("the items that are a number are checked too, so one that drifted is shown and put right", /row\.setup_key === SERVICE_CALL_SETUP_KEY/.test(stale) && /newPrice = present\(numbers\.serviceCallFee\) \? numbers\.serviceCallFee : null;/.test(stale));
  const reprice = setupQueries.slice(setupQueries.indexOf("export async function repriceRateItems"));
  check("re-pricing works the prices out again on the server and only lands on an item still as it was listed", /const stale = await listOutOfDateRateItems\(context, numbers\);/.test(reprice) && /\.eq\("company_id", companyId\)\s*\.or\(`price_source\.eq\.rate,setup_key\.eq\.\$\{SERVICE_CALL_SETUP_KEY\}`\)\s*\.is\("deleted_at", null\)/.test(reprice) && /assertBusinessNumbersAccess\(context\) \?\? assertMatchingCompanyScope\(context, companyId\)/.test(reprice));
  check("if the list changed since the owner saw it, nothing is changed", /if \(!sameRepriceList\(shown, stale\)\) return \{ updated: 0, changedSince: true, error: null \};/.test(reprice) && reprice.indexOf("sameRepriceList(shown, stale)") < reprice.indexOf(".update({ unit_price: item.newPrice })"));
  const repriceAction = numbersAction.slice(numbersAction.indexOf("export async function repricePriceBookAction"));
  const order = ["getActiveCompanyContext()", "assertBusinessNumbersAccess(context)", "expectedCompanyId !== context.company.id", "getCompanyBusinessNumbers(context)", "repriceRateItems(context.company.id, context, record.numbers, checked)"].map((needle) => repriceAction.indexOf(needle));
  check("the re-price action applies no price from the browser: company, access, page's company, stored numbers, then re-price", order.every((at) => at > -1) && order.every((at, i) => i === 0 || at > order[i - 1]) && /export async function repricePriceBookAction\(expectedCompanyId: string, shown: readonly ShownRepriceItem\[\]\)/.test(numbersAction) && !/unit_price/.test(repriceAction), order);
  check("whatever happens, the re-price action answers with the list as it now stands", /if \(error\) \{\s*return \{ error, updated, outOfDate \};/.test(repriceAction) && /return \{ updated, changedSince, outOfDate \};/.test(repriceAction));
  const repriceCard = read("shared/components/settings/business-numbers/PriceBookRepriceCard.tsx");
  check("the owner sees every item's old and new price (all of them), and nothing changes until they press the button", /items\.map\(\(item\) => \(/.test(repriceCard) && !/\.slice\(0,/.test(repriceCard) && /item\.currentPrice/.test(repriceCard) && /item\.newPrice/.test(repriceCard) && /Nothing changes until you press the button/.test(repriceCard) && !/useEffect/.test(repriceCard));
  check("the card sends what it showed, so the server can refuse a list that has changed", /repricePriceBookAction\(\s*companyId,\s*items\.map\(\(item\) => \(\{ id: item\.id, newPrice: item\.newPrice \}\)\),\s*\)/.test(repriceCard) && /result\.changedSince/.test(repriceCard));
  check("the list is a real table for a screen reader", /<caption className="sr-only">/.test(repriceCard) && /<th scope="row"/.test(repriceCard));
  const numbersView = read(FILES.view);
  check("the list sits under the Save button and is brought on screen when a save makes it appear", numbersView.indexOf("</form>") < numbersView.indexOf("<PriceBookRepriceCard") && /if \(listed > 0 && before === 0\) \{\s*document\.getElementById\(PRICE_BOOK_REPRICE_ID\)\?\.scrollIntoView/.test(numbersView) && /href=\{`#\$\{PRICE_BOOK_REPRICE_ID\}`\}/.test(numbersView));
  check("a re-price with no answer does not claim to know what happened", /\} catch \{[\s\S]{0,200}it is not certain whether the prices were updated\. Reload this page/.test(repriceCard) && !/Nothing was changed/.test(repriceCard));
  for (const editor of ["shared/components/estimates/LineItemsEditor.tsx", "shared/components/invoices/InvoiceLineItemsEditor.tsx"]) {
    const source = read(editor);
    check(`${editor.split("/").pop()}: a quantity can be part of an hour (two decimals, like the database)`, /Math\.round\(parseFloat\(String\(value\)\) \* 100\) \/ 100/.test(source) && /min="0\.01"\s*step="0\.01"\s*value=\{item\.quantity\}/.test(source) && !/parseInt\(String\(value\), 10\)/.test(source));
  }
  for (const file of ["shared/types/estimate.ts", "shared/types/invoice.ts"]) {
    const source = read(file);
    const fn = new Function("roundCurrency", `${source.slice(source.indexOf("export function calculateLineItemTotal")).split("\n}\n")[0].replace("export function calculateLineItemTotal(", "return function calculateLineItemTotal(").replace(/: number/g, "")}\n}`)((v) => Math.round(v * 100) / 100);
    check(`${file.split("/").pop()}: half an hour at $64.35 is $32.18, not a cent short`, fn(0.5, 64.35) === 32.18 && fn(1.5, 128) === 192 && fn(0.25, 0.1) === 0.03, [fn(0.5, 64.35), fn(1.5, 128), fn(0.25, 0.1)]);
    let changed = 0;
    for (let quantity = 1; quantity <= 60; quantity += 1) for (let cents = 1; cents <= 30000; cents += 97) if (fn(quantity, cents / 100) !== Math.round(quantity * (cents / 100) * 100) / 100) changed += 1;
    check(`${file.split("/").pop()}: no whole-quantity line total changes`, changed === 0, changed);
  }
  const draftInput = read("shared/components/ui/DecimalDraftInput.tsx");
  check("the quantity and price boxes show what was typed while focused (0.05 can no longer become 5)", /value=\{draft \?\? \(value \|\| ""\)\}/.test(draftInput) && /onBlur=\{\(\) => setDraft\(null\)\}/.test(draftInput) && ["shared/components/estimates/LineItemsEditor.tsx", "shared/components/invoices/InvoiceLineItemsEditor.tsx"].every((file) => (read(file).match(/<DecimalDraftInput/g) ?? []).length === 2 && !/value=\{item\.(quantity|unitPrice) \|\| ""\}/.test(read(file))));
  check("estimate and invoice lines keep two-decimal quantities in the database", /quantity numeric\(10, 2\) not null check \(quantity > 0\)/.test(read("supabase/migrations/012_estimates_foundation.sql")) && /quantity numeric\(12, 2\) not null default 1 check \(quantity > 0\)/.test(read("supabase/migrations/016_invoices_foundation.sql")));
}

console.log("\nProfit after labor and shop costs, and the month against the target");
{
  const jobProfit = await loadPureModule("shared/lib/business-numbers/job-profit.ts", "bn-jobprofit");
  const derived = deriveBusinessNumbers(SHOP);
  const ready = jobProfit.computeJobProfitAfterLabor({ grossProfit: 433, collected: 451, laborHours: 2.5 }, derived);
  check("2.5 hours cost $125.00 of labor and $115.38 of shop costs; $433 gross leaves $192.62 (42.7%)", ready.status === "ready" && ready.laborCost === 125 && ready.overheadCost === 115.38 && ready.profit === 192.62 && ready.marginPercent === 42.7, ready);
  check("labor and shop costs per hour add up to what a billed hour costs", near(ready.laborPerHour + ready.overheadPerHour, derived.costPerBilledHour, 1e-9));
  check("a job can lose money after labor and shop costs, and says so with a minus", jobProfit.computeJobProfitAfterLabor({ grossProfit: 100, collected: 200, laborHours: 3 }, derived).profit === -188.46);
  check("nothing collected: a profit figure but no margin", jobProfit.computeJobProfitAfterLabor({ grossProfit: 0, collected: 0, laborHours: 1 }, derived).marginPercent === null);
  check("no cost of an hour yet: asks for the numbers instead of guessing", jobProfit.computeJobProfitAfterLabor({ grossProfit: 433, collected: 451, laborHours: 2.5 }, deriveBusinessNumbers(EMPTY)).status === "needs-numbers" && jobProfit.computeJobProfitAfterLabor({ grossProfit: 433, collected: 451, laborHours: 2.5 }, deriveBusinessNumbers({ ...EMPTY, laborRate: 121 })).status === "needs-numbers");
  check("no clocked time: nothing to take off", [0, -1, Number.NaN].every((hours) => jobProfit.computeJobProfitAfterLabor({ grossProfit: 433, collected: 451, laborHours: hours }, derived).status === "no-hours"));
  const progress = jobProfit.computeMonthlyTargetProgress(12, 21);
  check("12 of 21 jobs: 9 to go, 57%", progress.done === 12 && progress.target === 21 && progress.remaining === 9 && progress.percent === 57 && progress.met === false, progress);
  check("past the target the bar stops at 100% and it reads as met", jobProfit.computeMonthlyTargetProgress(30, 21).percent === 100 && jobProfit.computeMonthlyTargetProgress(30, 21).met && jobProfit.computeMonthlyTargetProgress(21, 21).remaining === 0);
  check("no target, no card; junk counts as none done", jobProfit.computeMonthlyTargetProgress(5, null) === null && jobProfit.computeMonthlyTargetProgress(5, 0) === null && jobProfit.computeMonthlyTargetProgress(Number.NaN, 10).done === 0);

  const jobPage = read("app/(admin)/work/[jobId]/page.tsx");
  check("only an owner or admin gets the second line, and only where business numbers exist", /canViewFinancials && canManageBusinessNumbers\(companyContext\)\s*\? getCompanyBusinessNumbers\(companyContext\)\s*: Promise\.resolve\(null\),/.test(jobPage) && /if \(profitability && businessNumbers\) \{\s*const numbers = businessNumbers;\s*if \(numbers\.available && !numbers\.error\) \{/.test(jobPage));
  check("the numbers are read alongside the rest of the job page, not after it", jobPage.indexOf("? getCompanyBusinessNumbers(companyContext)") < jobPage.indexOf("]);", jobPage.indexOf("listJobLaborEntriesForJob(companyContext.company.id, jobId),")) + 3 && (jobPage.match(/await getCompanyBusinessNumbers/g) ?? []).length === 0);
  check("it is added beside the snapshot, never changing gross profit", /jobProfitability = \{\s*\.\.\.profitability,\s*afterLabor: computeJobProfitAfterLabor\(/.test(jobPage) && !/grossProfit:\s*(?!profitability\.grossProfit)[a-z]/i.test(jobPage.slice(jobPage.indexOf("jobProfitability = {"), jobPage.indexOf("const laborSummary"))));
  check("gross profit's own calculation is untouched", !/afterLabor/.test(read("shared/types/job-profitability.ts").slice(read("shared/types/job-profitability.ts").indexOf("export function computeJobProfitability"))) && /afterLabor\?: JobProfitAfterLabor;/.test(read("shared/types/job-profitability.ts")));
  const section = read("shared/components/jobs/JobProfitabilitySection.tsx");
  check("the job screen shows gross profit first and the second line after it", section.indexOf('label="Gross profit"') > -1 && section.indexOf('label="Gross profit"') < section.indexOf("After labor and shop costs") && /Gross profit \(above\)/.test(section) && /Only owners and admins see this/.test(section));
  check("the job block calls itself an estimate and explains why its labor figure is the bigger one", /After labor and shop costs \(an estimate\)/.test(section) && /more than hours times a technician&apos;s own cost rate/.test(section) && /leave them out of your monthly shop costs or they are counted twice/.test(section) && /Nothing has been collected on this job yet/.test(section));
  check("the job screen covers all three cases: ready, no clocked time, numbers missing", /afterLabor\.status === "ready"/.test(section) && /afterLabor\.status === "no-hours"/.test(section) && /Fill in what an hour of work costs you/.test(section));
  const dashboard = read("app/(admin)/(home)/page.tsx");
  check("the dashboard's target uses the performance chart's own count for the current month", /const currentMonth = extras\.performance\?\.months\.at\(-1\) \?\? null;/.test(dashboard) && /computeMonthlyTargetProgress\(currentMonth\.jobsCompleted, setupCard\.target\.breakEvenJobs\)/.test(dashboard));
  check("the target card is for an owner or admin with a target, and adds no database read of its own", /if \(!canManageBusinessNumbers\(companyContext\)\) \{\s*return null;/.test(dashboard) && (dashboard.match(/getCompanyBusinessNumbers\(/g) ?? []).length === 1);
  const targetCard = read("shared/components/business-setup/MonthlyTargetCard.tsx");
  check("the target card counts jobs and says so; it never claims the costs are paid", /at your average job/.test(targetCard) && !/has covered|Every job from here is profit/.test(targetCard) && /toLocaleDateString\("en-US", \{ month: "long", timeZone: "UTC" \}\)/.test(dashboard));
  check("the target step needs all three numbers, so 'your dashboard counts against it' is true", /Without them there is no target to count against/.test(read(FILES.setupActions)) && /Type what a job uses up \(0 if nothing\)/.test(read(FILES.setupActions)) && /It needs all three boxes/.test(read(FILES.setupSteps)));
  check("the target card is a server component with a real progress bar", !/"use client"/.test(targetCard) && /role="progressbar"/.test(targetCard) && /aria-valuemax=\{progress\.target\}/.test(targetCard));
  check("the setup's target step now says where the target goes, and the product does it", /which counts each month&apos;s finished jobs against it/.test(read(FILES.setupSteps)) && /<MonthlyTargetCard/.test(dashboard));
}

/* ------------------------------------------------------------------ planning */
console.log("\nPlanning starts from the saved numbers and uses the public calculators' math");
{
  const planning = await loadPureModule("shared/lib/business-numbers/planning.ts", "bn-planning");
  const newHire = await loadPureModule("shared/lib/resources/new-hire.ts", "bn-new-hire");
  const truckCost = await loadPureModule("shared/lib/resources/truck-cost.ts", "bn-truck");
  const techPay = await loadPureModule("shared/lib/resources/technician-pay.ts", "bn-pay");
  const asText = (object) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, String(value)]));
  const formatMoney = (value) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

  // ---- what each plan starts with
  const hireStart = planning.hirePlanStart(SHOP);
  check("the hiring plan starts from the saved wage, payroll costs, hours and rate", hireStart.values.hourlyWage === "30" && hireStart.values.burdenPercent === "25" && hireStart.values.paidHoursPerWeek === "40" && hireStart.values.billableRate === "121" && hireStart.values.billedHoursPerWeek === "30", hireStart.values);
  check("what has no saved number behind it starts empty, never as an example", hireStart.values.truckPerMonth === "" && hireStart.values.rampWeeks === "" && !hireStart.fromNumbers.includes("truckPerMonth") && hireStart.fromNumbers.length === 5, hireStart);
  const emptyStarts = [planning.hirePlanStart(EMPTY), planning.truckPlanStart(EMPTY), planning.payPlanStart(EMPTY)];
  check("a company with no numbers gets three empty plans", emptyStarts.every((start) => start.fromNumbers.length === 0 && Object.values(start.values).every((value) => value === "")), emptyStarts);
  check("the truck plan starts billed hours a day at a fifth of the week", planning.truckPlanStart(SHOP).values.billedHoursPerDay === "6" && planning.truckPlanStart(SHOP).fromNumbers.join() === "billedHoursPerDay");
  const payStart = planning.payPlanStart(SHOP);
  check("the pay plan starts from the wage, the paid hours, the billed hours and a labor-only week (30 x $121)", payStart.values.hourlyWage === "30" && payStart.values.hoursOnClock === "40" && payStart.values.bookHours === "30" && payStart.values.revenueProduced === "3630" && payStart.values.payPerBookHour === "" && payStart.values.commissionPercent === "", payStart.values);
  check("paid hours need billed hours; unbilled alone is not a week", planning.hirePlanStart({ ...EMPTY, unbilledHoursPerWeek: 10 }).values.paidHoursPerWeek === "");

  // ---- the same answer as the website
  const hire = planning.answerHirePlan(asText(newHire.NEW_HIRE_DEFAULTS));
  const hireSite = newHire.calculateNewHire(newHire.NEW_HIRE_DEFAULTS);
  check("hiring: the website's example gives the website's answer", hire.result !== null && JSON.stringify(hire.result) === JSON.stringify(hireSite), hire.result);
  check("hiring: it pays, and the sentence says the break-even hours and what is left", hire.reading.tone === "good" && /Billing 28 hours a week, this hire pays for itself and leaves about \$7,415 a month\. It breaks even at 13\.9 billed hours a week\./.test(hire.reading.text), hire.reading.text);
  check("hiring: the first weeks' cash is listed when there is a ramp", hire.lines.some((line) => line.label === "Cash to carry the first 8 weeks" && line.value === formatMoney(hireSite.cashToCarry)) && hire.lines.some((line) => line.label === "First week that pays for itself"), hire.lines);
  const slow = planning.answerHirePlan({ ...asText(newHire.NEW_HIRE_DEFAULTS), billedHoursPerWeek: "10", rampWeeks: "" });
  check("hiring: a hire that loses money says how much a month, and what it needs", slow.reading.tone === "bad" && /costs about \$2,023 a month more than it brings in\. It needs 13\.9 billed hours a week/.test(slow.reading.text) && slow.lines.some((line) => line.label === "Short a month, once busy") && !slow.lines.some((line) => /Cash to carry/.test(line.label)), slow);
  const hopeless = planning.answerHirePlan({ ...asText(newHire.NEW_HIRE_DEFAULTS), billableRate: "30" });
  check("hiring: a break-even past the paid hours says the hire cannot pay for itself", hopeless.reading.tone === "bad" && /To pay for itself this hire would have to bill 55\.9 hours a week, and they are paid for 40\. At these numbers it cannot\./.test(hopeless.reading.text), hopeless.reading.text);
  // ---- sentences are true of the figures as they are shown
  const hireWith = (changes) => planning.answerHirePlan({ ...asText(newHire.NEW_HIRE_DEFAULTS), truckPerMonth: "", rampWeeks: "", ...changes });
  const barely = hireWith({ hourlyWage: "30", burdenPercent: "", billableRate: "29.98", billedHoursPerWeek: "40" });
  check("hiring: a break-even a hair past the paid hours never reads '40 ... paid for 40'", barely.reading.tone === "bad" && /would have to bill 40\.03 hours a week, and they are paid for 40\./.test(barely.reading.text), barely.reading.text);
  const exact = hireWith({ burdenPercent: "25", billableRate: "100", billedHoursPerWeek: "14" });
  check("hiring: exactly break-even says so; never 'pays for itself and leaves $0'", exact.reading.tone === "note" && /Billing 14 hours a week, this hire breaks even: it brings in what it costs, and nothing more\./.test(exact.reading.text) && !/\$0/.test(exact.reading.text), exact.reading.text);
  const hair = hireWith({ burdenPercent: "25", billableRate: "100", billedHoursPerWeek: "13.996" });
  check("hiring: a hair short never reads 'billing 14 ... needs 14'", hair.reading.tone === "bad" && /Billing 13\.996 hours a week, this hire costs about \$2 a month more than it brings in\. It needs 14 billed hours a week/.test(hair.reading.text), hair.reading.text);
  check("hiring: a few cents short is break-even, never 'costs about $0'", !/\$0 /.test(hireWith({ burdenPercent: "25", billableRate: "100", billedHoursPerWeek: "13.9999" }).reading.text) && /breaks even/.test(hireWith({ burdenPercent: "25", billableRate: "100", billedHoursPerWeek: "13.9999" }).reading.text), hireWith({ burdenPercent: "25", billableRate: "100", billedHoursPerWeek: "13.9999" }).reading.text);
  const long = hireWith({ hourlyWage: "30", burdenPercent: "25", paidHoursPerWeek: "50", billedHoursPerWeek: "38" });
  check("hiring: more than 40 paid hours carries an overtime caution with the amount ($188 a week)", long.cautions.length === 1 && /price all 50 paid hours at the plain wage\. Hours past 40 a week are usually owed time and a half, which adds about \$188 a week/.test(long.cautions[0]) && long.reading.tone === "good", long);
  check("hiring: 40 paid hours or fewer carries no caution", hire.cautions.length === 0 && hireWith({ paidHoursPerWeek: "40" }).cautions.length === 0);
  const flipped = hireWith({ hourlyWage: "30", burdenPercent: "25", paidHoursPerWeek: "60", billableRate: "60", billedHoursPerWeek: "40" });
  check("hiring: when overtime would turn a paying hire into a losing one, it is not shown in green and the caution says so", flipped.result.pays === true && flipped.reading.tone === "warn" && /With that added, this hire no longer pays for itself\./.test(flipped.cautions[0]), flipped);
  check("a figure past its box's limit is refused with a sentence, never an answer (no 40-digit results)", (() => { const wild = planning.answerHirePlan({ ...hireStart.values, hourlyWage: "9".repeat(30) }); const pct = planning.answerHirePlan({ ...hireStart.values, burdenPercent: "5000" }); const hours = planning.answerTruckPlan({ ...asText(truckCost.TRUCK_COST_DEFAULTS), billedHoursPerDay: "30" }); return wild.result === null && wild.badField === "hourlyWage" && /Hourly wage can be 1,000 at most/.test(wild.reading.text) && pct.badField === "burdenPercent" && hours.badField === "billedHoursPerDay" && /A day has 24 hours/.test(hours.reading.text); })());
  check("truck: more days than a month has is caught even before any cost is typed", planning.answerTruckPlan({ ...planning.truckPlanStart(SHOP).values, workingDaysPerMonth: "45" }).badField === "workingDaysPerMonth");
  check("hiring: missing boxes are asked for by name, not answered with a guess", /Add truck/.test(planning.answerHirePlan(hireStart.values).reading.text) === false && planning.answerHirePlan(hireStart.values).result !== null && /Add hourly wage, paid hours a week, rate you bill and hours billed a week/.test(planning.answerHirePlan(planning.hirePlanStart(EMPTY).values).reading.text), planning.answerHirePlan(planning.hirePlanStart(EMPTY).values).reading.text);
  check("hiring: billing more hours than are paid is caught on its box", planning.answerHirePlan({ ...hireStart.values, billedHoursPerWeek: "50" }).badField === "billedHoursPerWeek" && planning.answerHirePlan({ ...hireStart.values, billedHoursPerWeek: "50" }).result === null);
  check("hiring: half a week of ramp, or more than a year, is refused", planning.answerHirePlan({ ...hireStart.values, rampWeeks: "2.5" }).badField === "rampWeeks" && planning.answerHirePlan({ ...hireStart.values, rampWeeks: "60" }).badField === "rampWeeks");
  check("text that is not a number, or a negative, names its box and gives no answer", ["abc", "-5", "1.250,50", "$"].every((bad) => { const answer = planning.answerHirePlan({ ...hireStart.values, hourlyWage: bad }); return answer.badField === "hourlyWage" && answer.result === null && answer.reading.tone === "bad" && /Hourly wage is not a number/.test(answer.reading.text); }));

  const truck = planning.answerTruckPlan(asText(truckCost.TRUCK_COST_DEFAULTS));
  const truckSite = truckCost.calculateTruckCost(truckCost.TRUCK_COST_DEFAULTS);
  check("truck: the website's example gives the website's answer ($1,480 a month)", truck.result !== null && JSON.stringify(truck.result) === JSON.stringify(truckSite) && truckSite.perMonth === 1480 && /This truck costs \$1,480\.00 a month, which is \$70\.48 every working day\. Every billed hour carries \$11\.75 of it\./.test(truck.reading.text), truck.reading.text);
  check("truck: a day, an hour, a job and a parked day are listed", ["A month", "A year", "A working day", "A billed hour", "A job", "A day it sits parked"].every((label) => truck.lines.some((line) => line.label === label)), truck.lines);
  check("truck: with no hours or jobs those two lines are left out, not shown as $0", (() => { const answer = planning.answerTruckPlan({ ...asText(truckCost.TRUCK_COST_DEFAULTS), billedHoursPerDay: "", jobsPerDay: "" }); return answer.result !== null && !answer.lines.some((line) => line.label === "A billed hour" || line.label === "A job") && !/Every billed hour/.test(answer.reading.text); })());
  check("truck: no costs asks for them; costs with no days asks for the days; 32 days is refused", /Type what the truck costs you/.test(planning.answerTruckPlan(planning.truckPlanStart(SHOP).values).reading.text) && /Add the working days a month/.test(planning.answerTruckPlan({ ...planning.truckPlanStart(SHOP).values, paymentPerMonth: "650" }).reading.text) && planning.answerTruckPlan({ ...planning.truckPlanStart(SHOP).values, paymentPerMonth: "650", workingDaysPerMonth: "32" }).badField === "workingDaysPerMonth");

  const payDefaults = { ...techPay.TECHNICIAN_PAY_DEFAULTS, commissionPercent: techPay.TECHNICIAN_PAY_DEFAULTS.commissionRate * 100 };
  delete payDefaults.commissionRate;
  const pay = planning.answerPayPlan(asText(payDefaults));
  const paySite = techPay.calculateTechnicianPay(techPay.TECHNICIAN_PAY_DEFAULTS);
  check("pay: the website's example gives the website's answer", pay.result !== null && JSON.stringify(pay.result) === JSON.stringify(paySite), [pay.result, paySite]);
  check("pay: the sentence compares the other plans with hourly and names the highest", /For this week, hourly pays \$1,425\.00, with 5 hours at time and a half; flat rate pays \$133\.00 less and commission pays \$525\.00 less\. Hourly pays the most\./.test(pay.reading.text), pay.reading.text);
  check("pay: only the plans that were filled in are listed", (() => { const answer = planning.answerPayPlan(payStart.values); return answer.result !== null && answer.lines.length === 1 && answer.lines[0].label === "Hourly" && /Hourly, this week pays \$1,200\.00\. Add a pay per book hour or a commission/.test(answer.reading.text); })(), planning.answerPayPlan(payStart.values));
  check("pay: plans that pay the same are not ranked", (() => { const answer = planning.answerPayPlan({ ...payStart.values, payPerBookHour: "40" }); return /flat rate pays the same\.$/.test(answer.reading.text) && !/pays the most/.test(answer.reading.text); })(), planning.answerPayPlan({ ...payStart.values, payPerBookHour: "40" }).reading.text);
  const payWith = (changes) => planning.answerPayPlan({ ...payStart.values, ...changes });
  const tieLow = payWith({ payPerBookHour: "40", commissionPercent: "10" });
  check("pay: hourly and flat rate tied at the top share it; a lower plan does not make one of them 'the most'", /flat rate pays the same and commission pays \$837\.00 less\. Hourly and flat rate pay the most, the same amount\./.test(tieLow.reading.text) && tieLow.lines.filter((line) => line.strong).map((line) => line.label).join() === "Hourly,Flat rate", tieLow);
  const tieHigh = payWith({ payPerBookHour: "50", revenueProduced: "3000", commissionPercent: "50" });
  check("pay: flat rate and commission tied above hourly share it too", /Flat rate and commission pay the most, the same amount\./.test(tieHigh.reading.text), tieHigh.reading.text);
  check("pay: a plan a hundredth of a cent ahead is 'the same', not 'the most'", (() => { const answer = payWith({ payPerBookHour: "40.0001" }); return /flat rate pays the same\.$/.test(answer.reading.text) && !answer.lines.some((line) => line.strong); })(), payWith({ payPerBookHour: "40.0001" }).reading.text);
  check("pay: a plan typed halfway is asked for its other half, by name", /Add the book hours turned to see what flat rate pays\./.test(payWith({ bookHours: "", payPerBookHour: "34" }).reading.text) && !/Add a pay per book hour/.test(payWith({ bookHours: "", payPerBookHour: "34" }).reading.text) && /commission pays .* Add the book hours turned/.test(payWith({ bookHours: "", payPerBookHour: "34", commissionPercent: "30" }).reading.text) && /Add the revenue produced to see what commission pays\./.test(payWith({ revenueProduced: "", commissionPercent: "12" }).reading.text), payWith({ bookHours: "", payPerBookHour: "34" }).reading.text);
  check("pay: a sliver of overtime is never '0 hours at time and a half'; one hour is 'hour'", !/time and a half/.test(payWith({ hoursOnClock: "40.04" }).reading.text) && /\$1,201\.80/.test(payWith({ hoursOnClock: "40.04" }).reading.text) && /with 1 hour at time and a half/.test(payWith({ hoursOnClock: "41" }).reading.text), payWith({ hoursOnClock: "40.04" }).reading.text);
  check("pay: a commission typed as a fraction is questioned (0.12 is probably 12)", payWith({ commissionPercent: "0.12" }).cautions.length === 1 && /If you meant 12%, type 12\./.test(payWith({ commissionPercent: "0.12" }).cautions[0]) && payWith({ commissionPercent: "12" }).cautions.length === 0, payWith({ commissionPercent: "0.12" }).cautions);
  check("pay: a commission above 100% and a week past 168 hours are refused on their boxes", planning.answerPayPlan({ ...payStart.values, commissionPercent: "120" }).badField === "commissionPercent" && planning.answerPayPlan({ ...payStart.values, hoursOnClock: "200" }).badField === "hoursOnClock");

  // ---- the page
  const planningPage = read("app/(admin)/settings/business-numbers/planning/page.tsx");
  const planningView = read("shared/components/settings/business-numbers/PlanningView.tsx");
  check("the planning page does not exist where business numbers do not (migration 218)", /if \(!load\.available\) \{\s*notFound\(\);/.test(planningPage));
  check("the planning page reads and never writes: no action, no save", !/app\/actions|"use server"|saveCompanyBusinessNumbers|updateBusinessNumbersAction/.test(planningPage + planningView) && !/localStorage|sessionStorage/.test(planningView));
  check("it says nothing is saved, and carries the overtime caution", /Nothing you type here is saved, and nothing here changes them/.test(planningView) && /most technicians are owed overtime however they are paid, and at least minimum wage for every hour worked/.test(planningView) && /some states also count daily overtime/.test(planningView) && /Check with your payroll provider/.test(planningView));
  check("cautions are shown with the answer, where a screen reader hears them", /answer\.cautions\.map\(\(caution\) => \(\s*<ReadingLine key=\{caution\} reading=\{\{ tone: "warn", text: caution \}\} \/>/.test(planningView));
  check("the truck offer compares amounts, so '1,480' is not offered $1,480 again", /typeof hireTruck === "number" && Math\.abs\(hireTruck - Number\(truckPerMonth\)\) < 0\.005/.test(planningView));
  check("it warns against counting the truck twice", /Count it once/.test(planningView));
  check("'From your numbers' is said only until the owner types over the box", /fromNumbers\.includes\(box\.key\) && !touched\.has\(box\.key\)/.test(planningView));
  check("Settings > Numbers links to it", /href="\/settings\/business-numbers\/planning"/.test(read(FILES.view)));
  check("the planning math is not copied: it calls the three public calculators", /calculateNewHire\(/.test(read("shared/lib/business-numbers/planning.ts")) && /calculateTruckCost\(/.test(read("shared/lib/business-numbers/planning.ts")) && /calculateTechnicianPay\(/.test(read("shared/lib/business-numbers/planning.ts")));
}

console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed === 0 ? 0 : 1);
