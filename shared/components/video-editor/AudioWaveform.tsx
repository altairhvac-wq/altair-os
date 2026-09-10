"use client";

/**
 * A waveform drawn from real decoded peaks.
 *
 * The peaks are normalised maxima extracted from the narration WAVs at build
 * time (`scripts/build-editor-demo-project.mjs`), which is what lets this
 * rescale with the timeline: a rendered waveform IMAGE would blur or tile when
 * the zoom changes, while an array of numbers redraws exactly at any width.
 *
 * Rendered as one SVG `<path>` rather than N `<rect>`s — a 240-bucket clip
 * becomes one DOM node instead of 240, which matters when eight tracks of
 * clips are on screen and the user is dragging.
 */

const VERTICAL_PADDING = 0.12;

export function AudioWaveform({
  peaks,
  width,
  height,
  color,
}: {
  readonly peaks: readonly number[];
  readonly width: number;
  readonly height: number;
  readonly color: string;
}) {
  if (peaks.length === 0 || width < 2 || height < 4) return null;

  const mid = height / 2;
  const usable = mid * (1 - VERTICAL_PADDING);

  // One filled path, mirrored around the midline: forward along the top edge,
  // back along the bottom. `d` is built once per render.
  let top = "";
  let bottom = "";
  for (let i = 0; i < peaks.length; i += 1) {
    const x = (i / (peaks.length - 1 || 1)) * width;
    const amplitude = Math.max(0.02, peaks[i]) * usable;
    top += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${(mid - amplitude).toFixed(1)}`;
  }
  for (let i = peaks.length - 1; i >= 0; i -= 1) {
    const x = (i / (peaks.length - 1 || 1)) * width;
    const amplitude = Math.max(0.02, peaks[i]) * usable;
    bottom += `L${x.toFixed(1)},${(mid + amplitude).toFixed(1)}`;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    >
      <path d={`${top}${bottom}Z`} fill={color} opacity={0.72} />
    </svg>
  );
}
