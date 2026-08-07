import {
  LIVE_CHROME_DESIGN_LAB_DEFAULTS,
  type DesignLabColors,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

export type DesignLabPreset = {
  id: string;
  name: string;
  purpose: string;
  mood: string;
  colors: DesignLabColors;
};

function withLiveChrome(
  overrides: Partial<DesignLabColors>,
): DesignLabColors {
  return { ...LIVE_CHROME_DESIGN_LAB_DEFAULTS, ...overrides };
}

export const DESIGN_LAB_PRESETS: DesignLabPreset[] = [
  {
    id: "live-chrome",
    name: "Live chrome (today)",
    purpose: "Exact defaults from today's globals.css / shell chrome.",
    mood: "Olive-graphite, brass ladder, MC paper cards.",
    colors: LIVE_CHROME_DESIGN_LAB_DEFAULTS,
  },
  {
    id: "deeper-olive",
    name: "Deeper olive",
    purpose: "Slightly darker chrome planes — preview exploration only.",
    mood: "Heavier shell, same brass and paper.",
    colors: withLiveChrome({
      northStarRoot: "#464f3c",
      northStarSidebar: "#3d4636",
      northStarTopbar: "#505a44",
      northStarPanel: "#5a6450",
      northStarHeaderStrip: "#3d4636",
      northStarContentWell: "#353e2e",
    }),
  },
  {
    id: "brighter-brass",
    name: "Brighter brass",
    purpose: "Push the brass ladder warmer while keeping olive chrome.",
    mood: "More gold command energy.",
    colors: withLiveChrome({
      northStarBronze: "#9a6f28",
      northStarBrass: "#c99732",
      northStarGold: "#d4b05a",
      northStarChampagne: "#edd9a0",
      northStarBrassRail: "#d4b05a",
      northStarSidebarLabel: "#d4b05a",
      altairBrass: "#c99732",
      altairBrassInteractive: "#d4b05a",
    }),
  },
];

/** @deprecated Alias — older call sites referenced north-star-default. */
export const NORTH_STAR_DEFAULT_PRESET_ID = "live-chrome";
