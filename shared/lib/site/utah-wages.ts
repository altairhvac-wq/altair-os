/**
 * What Utah HVAC technicians are paid, by area.
 *
 * ============ SOURCE ============
 * U.S. Bureau of Labor Statistics, Occupational Employment and Wage
 * Statistics (OEWS), May 2025 estimates, occupation 49-9021 "Heating, Air
 * Conditioning, and Refrigeration Mechanics and Installers", all industries.
 * Read on 2026-11-25 from the BLS public data API (series OEU + area +
 * 000000 + 499021 + data type: 01 employment, 03 mean, 06/07/08/09/10 the
 * 10th/25th/50th/75th/90th hourly percentiles). The U.S. median of $29.33
 * matches the figure the national labor-rate page quotes from the
 * Occupational Outlook Handbook, which uses the same survey.
 *
 * Area names and codes are BLS's own (OEWS query system, state = Utah).
 * Employment is rounded by BLS. Update every row together when BLS publishes
 * the next May estimates (usually in the spring), and change DATA_PERIOD.
 *
 * Pure (no imports).
 */

export const UTAH_WAGE_DATA_PERIOD = "May 2025";
export const UTAH_WAGE_DATA_READ = "November 25, 2026";

export type WageArea = {
  /** BLS area code. */
  readonly code: string;
  /** BLS area name, as published. */
  readonly name: string;
  /** Short label for tight spaces. */
  readonly short: string;
  readonly kind: "nation" | "state" | "metro" | "nonmetro";
  readonly employment: number;
  readonly mean: number;
  readonly p10: number;
  readonly p25: number;
  readonly median: number;
  readonly p75: number;
  readonly p90: number;
};

export const US_HVAC_WAGES: WageArea = {
  code: "0000000",
  name: "United States",
  short: "U.S.",
  kind: "nation",
  employment: 409670,
  mean: 31.14,
  p10: 19.25,
  p25: 23.25,
  median: 29.33,
  p75: 37.05,
  p90: 45.78,
};

export const UTAH_HVAC_WAGES: WageArea = {
  code: "4900000",
  name: "Utah",
  short: "Utah",
  kind: "state",
  employment: 5580,
  mean: 28.85,
  p10: 18.06,
  p25: 22.75,
  median: 28.24,
  p75: 34.6,
  p90: 38.7,
};

/** Utah's metro and nonmetro areas, largest employment first. */
export const UTAH_AREA_WAGES: readonly WageArea[] = [
  {
    code: "0041620",
    name: "Salt Lake City-Murray, UT",
    short: "Salt Lake City",
    kind: "metro",
    employment: 2540,
    mean: 30.13,
    p10: 18.45,
    p25: 22.87,
    median: 29.23,
    p75: 36.24,
    p90: 40.0,
  },
  {
    code: "0036260",
    name: "Ogden, UT",
    short: "Ogden",
    kind: "metro",
    employment: 1090,
    mean: 30.26,
    p10: 21.83,
    p25: 23.48,
    median: 28.44,
    p75: 36.22,
    p90: 39.96,
  },
  {
    code: "0039340",
    name: "Provo-Orem-Lehi, UT",
    short: "Provo-Orem",
    kind: "metro",
    employment: 1050,
    mean: 26.86,
    p10: 18.56,
    p25: 22.03,
    median: 23.53,
    p75: 29.61,
    p90: 36.59,
  },
  {
    code: "0041100",
    name: "St. George, UT",
    short: "St. George",
    kind: "metro",
    employment: 420,
    mean: 25.48,
    p10: 14.42,
    p25: 17.32,
    median: 22.98,
    p75: 31.03,
    p90: 36.81,
  },
  {
    code: "0030860",
    name: "Logan, UT-ID",
    short: "Logan",
    kind: "metro",
    employment: 230,
    mean: 27.19,
    p10: 18.41,
    p25: 22.22,
    median: 26.65,
    p75: 30.87,
    p90: 36.12,
  },
  {
    code: "4900011",
    name: "High Desert Utah nonmetropolitan area",
    short: "High Desert (rural)",
    kind: "nonmetro",
    employment: 180,
    mean: 23.68,
    p10: 14.86,
    p25: 17.55,
    median: 22.21,
    p75: 28.61,
    p90: 34.87,
  },
  {
    code: "4900010",
    name: "Wasatch Front Fringe Utah nonmetropolitan area",
    short: "Wasatch Front Fringe (rural)",
    kind: "nonmetro",
    employment: 100,
    mean: 29.93,
    p10: 17.71,
    p25: 21.45,
    median: 30.51,
    p75: 37.16,
    p90: 37.5,
  },
];

/**
 * Utah unemployment insurance, from the Department of Workforce Services
 * "Tax Rates" page (jobs.utah.gov, read 2026-11-25) and its Summer 2026
 * Employer Advisor.
 */
export const UTAH_UI = {
  wageBase2026: 50700,
  wageBase2027: 52700,
  minRatePct: 0.1,
  maxRatePct: 7.1,
} as const;
