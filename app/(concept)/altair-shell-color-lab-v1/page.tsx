import { redirect } from "next/navigation";

/**
 * Retired shell experiment. Original page archived at
 * docs/design-archive/concept-altair-shell-color-lab-v1-page.tsx.bak — route neutralized per
 * ALTAIR_ARCHITECTURE.md §5. Delete this directory (and the matching
 * shared/components/altair-shell-color-lab-v1/ dir) in the next on-machine cleanup pass.
 */
export default function RetiredExperimentPage() {
  redirect("/");
}
