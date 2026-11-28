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
  const body = action.slice(action.indexOf("export async function updateBusinessNumbersAction"));
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
  const load = queries.slice(queries.indexOf("export async function getCompanyBusinessNumbers"), queries.indexOf("export const isBusinessNumbersAvailable"));
  const probe = queries.slice(queries.indexOf("export const isBusinessNumbersAvailable"), queries.indexOf("export const getActiveCompanyBusinessNumbers"));
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
check("boxes go read-only, not disabled, during a save (keyboard focus is kept)", /readOnly=\{busy\}/.test(view) && !/<input[^>]*\bdisabled=\{(isPending|busy|disabled)\}/.test(view.replace(/\n/g, " ")));
check("a refused number is focused and tied to its message", /showField\(result\.field\)/.test(view) && /aria-describedby=\{describedBy\}/.test(view) && /errorId=\{badField === field \? feedbackId : null\}/.test(view));
check("the phone save bar carries the message for a save that did not go through", /admin-sticky-footer sm:hidden[\s\S]{0,200}feedback\?\.tone === "error"[\s\S]{0,120}role="alert"/.test(view));
check("a rate that cannot be stored is never offered", /const suggested = usableSuggestedRate\(derived\);/.test(view));
check("the screen works the readings out with the shared math, not its own", /deriveBusinessNumbers\(numbers\)/.test(view) && !/\* 12\) \/ 52|\/ \(1 - /.test(view));
check("the math files import nothing but each other and the calculators", [FILES.derive, FILES.readings, FILES.format, FILES.types].every((path) => [...read(path).matchAll(/from "([^"]+)"/g)].every((m) => m[1].startsWith("."))));

console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed === 0 ? 0 : 1);
