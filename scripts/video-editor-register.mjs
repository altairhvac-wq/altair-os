/**
 * Registers the `@/*` alias resolver for Node's native TypeScript loader.
 *
 * Used as `node --import ./scripts/video-editor-register.mjs <script>`; kept
 * separate from the hook module because `register()` must run in the main
 * thread before the entry graph is resolved, while the hook itself runs in the
 * loader thread.
 */
import { register } from "node:module";

register("./video-editor-alias-hooks.mjs", import.meta.url);
