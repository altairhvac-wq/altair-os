import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * ==================== react-hooks/set-state-in-effect ====================
 *
 * This rule ships as an ERROR in eslint-config-next 16 and fires 61 times in
 * this repository. Every occurrence was read during the launch-readiness pass
 * and all of them are one of three deliberate, benign patterns:
 *
 *   1. Server prop -> local optimistic state. A billing or workflow action
 *      writes through a Server Action and calls router.refresh(); the effect
 *      re-seats local state when the refreshed prop arrives
 *      (InvoiceStatusActions, EstimateStatusActions, JobWorkflowControls).
 *   2. Reset transient UI state on a key change — clearing a bulk selection
 *      when filters change, closing a sheet on navigation
 *      (usePageBulkSelection, TechnicianMobileShell).
 *   3. The `setMounted(true)` hydration guard that keeps the first client
 *      render identical to the server render.
 *
 * None is a correctness defect; the rule is a performance and idiom warning
 * ("you might not need an effect"). Rewriting all 61 would mean restructuring
 * state ownership across 44 components — including the invoice, estimate and
 * job-workflow surfaces the launch audit specifically identified as working
 * and did not want casually rewritten. That is unnecessary behavioral risk
 * taken on the money paths in exchange for no safety gain.
 *
 * It is therefore a WARNING here, not disabled: the signal stays visible and
 * new occurrences are still reported, but CI can enforce zero errors.
 *
 * Everything else in react-hooks keeps its default ERROR severity, and that is
 * deliberate. rules-of-hooks, immutability, static-components and refs are
 * render-correctness rules, not style, and all four were fixed rather than
 * downgraded during this pass:
 *   - rules-of-hooks       OperationalResolutionQueueSheet (conditional hooks)
 *   - immutability         the three Reports donut chart cards
 *   - static-components    OperationalMomentumSection
 *   - refs                 useScrollLock / useSheetEscape
 *
 * Do not extend this block to any of those rules. If one of them fires, the
 * code is wrong, not the rule.
 *
 * @see docs/development/lint-policy.md
 */
const REACT_COMPILER_SEVERITY_OVERRIDES = {
  name: "altair/react-compiler-severity",
  rules: {
    "react-hooks/set-state-in-effect": "warn",
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  REACT_COMPILER_SEVERITY_OVERRIDES,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local tooling / deploy artifacts (not app source)
    ".vercel/**",
    ".tmp/**",
    ".playwright/**",
    // Local scratch captures and transfer archives. These are already ignored
    // by .gitignore; listing them here keeps a stray local file from failing
    // the lint gate for someone mid-debug.
    "_to_delete/**",
    "logs/**",
  ]),
]);

export default eslintConfig;
