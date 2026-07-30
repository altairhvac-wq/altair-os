/**
 * Narrow Meta Pixel (`fbq`) typings for browser use.
 * Does not weaken unrelated Window members.
 */

type FbqCommand = "init" | "track" | "trackCustom" | "consent";

interface FacebookPixel {
  (command: "init", pixelId: string, data?: Record<string, unknown>): void;
  (
    command: "track" | "trackCustom",
    eventName: string,
    parameters?: Record<string, unknown>,
  ): void;
  (command: "consent", value: "grant" | "revoke"): void;
  (command: FbqCommand, ...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
  push: FacebookPixel;
}

interface Window {
  fbq?: FacebookPixel;
  _fbq?: FacebookPixel;
}
