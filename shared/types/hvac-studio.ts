/**
 * The HVAC education series — its blueprint, its locked in-frame style
 * contract, and the episode file the slide system renders from.
 *
 * ==================== THIS IS A PLAN, NOT A MEASUREMENT ====================
 * Every number below is a TARGET that was decided here. None of it is a count
 * of anything that exists.
 *
 * That distinction is the whole reason this module has a header. The design
 * this was built from showed "20/95 photos", "5/8 unit types" and "1/6
 * categories" as if they had been measured, and they had not been: the asset
 * library is a librarian-indexed tree on the production laptop
 * (`ALTAIR_ASSET_LIBRARY_ROOT`), it is not reachable from this application,
 * and this repository holds no table that counts it. A progress bar the web
 * app cannot compute is a progress bar that lies the first time capture falls
 * behind. So the Studio surface states targets as targets and says plainly
 * that it is not measuring capture — the same reason Marketing has no
 * Performance tab (see `MarketingWorkspace.tsx`).
 *
 * ==================== THE STYLE LOCK IS VIDEO, NOT UI ====================
 * `HVAC_STYLE_LOCK` is a legend that appears INSIDE the 1920x1080 frame, so a
 * viewer can read refrigerant state by colour across every episode. It is not
 * an Altair palette and must never become one: `app/globals.css` is the only
 * place product colour is authored. These hex values are therefore exported as
 * DATA and painted through inline styles at the one call site that shows them.
 * Writing them as Tailwind utilities would put three saturated non-brand hues
 * into the generated stylesheet, where the next component to want a red would
 * find them.
 *
 * ==================== WHY IT LIVES IN THE WEB APP AT ALL ====================
 * Rendering happens on the laptop (`AltairDemoTool/production/slide-system`).
 * What does not have a home there is the decision — which episode is next,
 * what it is called, what the frame contract is. Keeping that here means the
 * plan is in version control and visible to whoever opens Marketing, and the
 * laptop stays the thing that renders rather than the thing that remembers.
 */

/** The series name written into every episode file's `series` field. */
export const HVAC_SERIES_NAME = "How HVAC Actually Works";

/**
 * Episode files are `episode-hvac-NN.json`, giving stem `hvac-NN`.
 *
 * The prefix is not decoration. `episode-paths.mjs` derives the slide, audio
 * and visual-plan paths from the stem, so an unprefixed `episode-04.json`
 * would land in the same namespace as the existing contracting series and the
 * two would silently share `slides-04/`. A separate prefix is what keeps two
 * series in one directory from overwriting each other.
 */
export const HVAC_EPISODE_STEM_PREFIX = "hvac";

/** The master frame. Matches every rendered episode in the slide system. */
export const HVAC_FRAME = {
  widthPx: 1920,
  heightPx: 1080,
  fps: 30,
} as const;

export type HvacRefrigerantState = {
  /** The label drawn on the pill in-frame. */
  readonly label: string;
  /** Where in the circuit this state exists. */
  readonly where: string;
  /** In-frame hex. Painted via inline style — see the header. */
  readonly hex: string;
};

/**
 * The three refrigerant states, and the rule for the pill that carries them.
 *
 * Locked means locked: an episode that recolours a state breaks the one thing
 * a series like this is for, which is that the viewer stops re-learning the
 * legend at episode four.
 */
export const HVAC_STYLE_LOCK: readonly HvacRefrigerantState[] = [
  {
    label: "Hot vapor",
    where: "Compressor discharge to condenser inlet",
    hex: "#FF3B3B",
  },
  {
    label: "High-pressure liquid",
    where: "Condenser outlet through the liquid line to the metering device",
    hex: "#FF8C00",
  },
  {
    label: "Cool vapor",
    where: "Evaporator outlet back down the suction line",
    hex: "#00D9FF",
  },
] as const;

/**
 * How a state pill is drawn. Stated once, here, because it is the part that
 * gets re-invented per episode: a filled pill in a saturated hue reads as a
 * warning badge over footage, so the fill stays near-black and the state
 * colour is carried by the border and the text.
 */
export const HVAC_STYLE_LOCK_PILL_RULE =
  "Pill fill is black at 80% opacity; the state colour is carried by the 2px border and the label text.";

export type HvacCategory = {
  readonly id: string;
  /** Directory-style label, so it sorts the way capture is sequenced. */
  readonly label: string;
  /** What belongs in it. */
  readonly scope: string;
  /** How many stills the plan calls for. A target, never a count. */
  readonly targetStills: number;
};

/**
 * Capture categories, in the order they are planned to be shot.
 *
 * Order is the plan. Residential first because eight of the twelve episodes
 * below can be cut from it alone; chillers last because none of them can.
 */
export const HVAC_CATEGORIES: readonly HvacCategory[] = [
  {
    id: "01-residential",
    label: "01 Residential",
    scope: "Split systems, heat pumps, mini-splits, package units, furnace+AC",
    targetStills: 20,
  },
  {
    id: "02-electrical",
    label: "02 Electrical",
    scope: "Contactors, capacitors, boards, disconnects, wiring at the unit",
    targetStills: 15,
  },
  {
    id: "03-tools",
    label: "03 Tools",
    scope: "Gauges, meters, recovery, vacuum, brazing, hand tools in use",
    targetStills: 15,
  },
  {
    id: "04-controls",
    label: "04 Controls",
    scope: "Thermostats, zoning, sensors, safeties, sequence of operation",
    targetStills: 15,
  },
  {
    id: "05-boilers",
    label: "05 Boilers",
    scope: "Hydronic loops, pumps, expansion, near-boiler piping",
    targetStills: 15,
  },
  {
    id: "06-chillers",
    label: "06 Chillers",
    scope: "Commercial packaged and split chillers, towers, air handlers",
    targetStills: 15,
  },
] as const;

/** Sum of the capture targets. Derived, never typed as a literal. */
export const HVAC_TOTAL_TARGET_STILLS = HVAC_CATEGORIES.reduce(
  (total, category) => total + category.targetStills,
  0,
);

export type HvacEpisode = {
  /** 1-based position in the series. Also the file stem's numeric half. */
  readonly number: number;
  readonly title: string;
  /** One line on what the episode has to leave the viewer able to do. */
  readonly teaches: string;
  /** Capture categories this episode cannot be cut without. */
  readonly needsCategories: readonly string[];
};

/**
 * The twelve-episode blueprint.
 *
 * `needsCategories` is the load-bearing field. It is what makes the capture
 * order above an argument rather than a preference — an episode whose
 * categories are unshot cannot be cut, and this is where you read that off.
 */
export const HVAC_EPISODES: readonly HvacEpisode[] = [
  {
    number: 1,
    title: "How the HVAC cycle works",
    teaches:
      "Trace refrigerant around the full loop and name its state at each leg.",
    needsCategories: ["01-residential"],
  },
  {
    number: 2,
    title: "Heat pump vs. air conditioner",
    teaches:
      "Explain what the reversing valve changes, and what it does not.",
    needsCategories: ["01-residential"],
  },
  {
    number: 3,
    title: "Mini-split vs. central",
    teaches:
      "Choose between them on load, duct condition and zoning — not on price.",
    needsCategories: ["01-residential"],
  },
  {
    number: 4,
    title: "The package unit",
    teaches:
      "Identify every section of a package unit from outside the cabinet.",
    needsCategories: ["01-residential"],
  },
  {
    number: 5,
    title: "Compressor deep dive",
    teaches:
      "Tell scroll from reciprocating, and say what each failure mode sounds like.",
    needsCategories: ["01-residential", "03-tools"],
  },
  {
    number: 6,
    title: "TXV vs. piston",
    teaches:
      "Explain why a metering device is chosen, and how each one fails.",
    needsCategories: ["01-residential", "03-tools"],
  },
  {
    number: 7,
    title: "The evaporator coil",
    teaches: "Read a frosted coil back to its cause instead of its symptom.",
    needsCategories: ["01-residential"],
  },
  {
    number: 8,
    title: "The condenser coil",
    teaches:
      "Connect head pressure to airflow, fin condition and ambient temperature.",
    needsCategories: ["01-residential"],
  },
  {
    number: 9,
    title: "Electrical troubleshooting",
    teaches:
      "Work a no-cool call from the disconnect inward, safely and in order.",
    needsCategories: ["02-electrical", "03-tools"],
  },
  {
    number: 10,
    title: "Superheat and subcooling",
    teaches: "Take both readings and say what each one is actually telling you.",
    needsCategories: ["03-tools", "01-residential"],
  },
  {
    number: 11,
    title: "Airflow — the 20-degree split",
    teaches:
      "Use the split as a diagnostic, including when it is the wrong tool.",
    needsCategories: ["03-tools", "04-controls"],
  },
  {
    number: 12,
    title: "Furnace + AC combo",
    teaches:
      "Explain how one air handler serves two systems across the seasons.",
    needsCategories: ["01-residential", "04-controls"],
  },
] as const;

/** `4` -> `hvac-04`. Two digits, so the stems sort. */
export function hvacEpisodeStem(episodeNumber: number): string {
  return `${HVAC_EPISODE_STEM_PREFIX}-${String(episodeNumber).padStart(2, "0")}`;
}

/** `4` -> `episode-hvac-04.json`, the value `EPISODE_FILE` takes. */
export function hvacEpisodeFileName(episodeNumber: number): string {
  return `episode-${hvacEpisodeStem(episodeNumber)}.json`;
}

/** `4` -> `visual-plan-hvac-04.mjs`, derived by `episode-paths.mjs`. */
export function hvacVisualPlanFileName(episodeNumber: number): string {
  return `visual-plan-${hvacEpisodeStem(episodeNumber)}.mjs`;
}

export type HvacEpisodeScaffold = {
  readonly series: string;
  readonly episode: number;
  readonly title: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly fps: number;
  readonly beats: readonly never[];
};

/**
 * The episode file, in the exact shape `render-episode.mjs` reads.
 *
 * ==================== WHY `beats` IS EMPTY ====================
 * Beats are narration, and narration comes from the written script through
 * `script-to-episode.mjs` — which exists precisely so that turning a script
 * into beats is a tool run and not a typing job. Emitting invented voiceover
 * here to make the file look finished would put words in the episode that no
 * one wrote, and they would render.
 *
 * An empty `beats` array is also a failing state on purpose: `render-episode`
 * stops on a beat with no narration, so a scaffold that was never filled in
 * cannot quietly produce a silent video.
 */
export function buildHvacEpisodeScaffold(
  episode: HvacEpisode,
): HvacEpisodeScaffold {
  return {
    series: HVAC_SERIES_NAME,
    episode: episode.number,
    title: episode.title,
    widthPx: HVAC_FRAME.widthPx,
    heightPx: HVAC_FRAME.heightPx,
    fps: HVAC_FRAME.fps,
    beats: [],
  };
}

/**
 * The laptop-side run for one episode, as text.
 *
 * `ALTAIR_ASSET_LIBRARY_ROOT` is named and not defaulted: `build-slides.mjs`
 * stamps every manifest entry as sourced from it, so a run that leaves it
 * unset produces a provenance record that names an environment variable
 * nobody set.
 */
export function buildHvacRunCommand(episode: HvacEpisode): string {
  const file = hvacEpisodeFileName(episode.number);
  return [
    `EPISODE_FILE=${file}`,
    "ALTAIR_ASSET_LIBRARY_ROOT=<your library root>",
    "NARRATION_PROVIDER=piper",
    "node production/slide-system/build-slides.mjs",
    "node production/slide-system/render-episode.mjs",
  ].join("\n");
}
