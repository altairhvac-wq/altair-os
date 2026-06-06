import { DEMO_DATA_NAME_PREFIX } from "@/shared/lib/demo-data-settings";

/** Strip the demo seed prefix from a display string. Raw DB values are unchanged. */
export function stripDemoNamePrefix(value: string): string {
  const trimmed = value.trimStart();
  if (trimmed.startsWith(DEMO_DATA_NAME_PREFIX)) {
    return trimmed.slice(DEMO_DATA_NAME_PREFIX.length);
  }
  return value;
}

/** Format a name for UI display; optionally hide the demo prefix for founder marketing screenshots. */
export function formatDemoDisplayName(
  value: string | null | undefined,
  hideDemoPrefix: boolean,
): string {
  if (!value) {
    return value ?? "";
  }

  if (!hideDemoPrefix) {
    return value;
  }

  return stripDemoNamePrefix(value);
}
