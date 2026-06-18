/**
 * North Star grouped left sidebar shell (M1).
 * Roll back to legacy horizontal nav by unsetting NEXT_PUBLIC_NORTH_STAR_SHELL
 * or setting it to anything other than "true".
 */
export const NORTH_STAR_SHELL_ENABLED =
  process.env.NEXT_PUBLIC_NORTH_STAR_SHELL === "true";

export function isNorthStarShellEnabled(): boolean {
  return NORTH_STAR_SHELL_ENABLED;
}
