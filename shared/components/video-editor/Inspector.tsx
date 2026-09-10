"use client";

import {
  formatTimecode,
  isAudioTrackKind,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";

/**
 * Context-sensitive properties for whatever is selected.
 *
 * ==================== EVERY CONTROL IS WIRED ====================
 * A property panel full of inputs that change nothing is the single most
 * dishonest thing an editor can ship, so this renders only fields that write
 * back through the reducer. Where the production renderer cannot express a
 * property — per-clip scale and rotation, per-clip audio gain — the field is
 * still editable, because the editor is the source of truth and the compiler
 * reports the drop; but the panel says so, on the panel, rather than letting
 * an operator believe a transform will survive the render.
 */

type Props = {
  readonly project: EditorProject;
  readonly selected: readonly EditorClip[];
  readonly onPatch: (
    clipId: string,
    patch: Partial<EditorClip>,
    label: string,
    coalesceKey?: string,
  ) => void;
};

export function Inspector({ project, selected, onPatch }: Props) {
  const clip = selected[0] ?? null;
  const track = clip
    ? (project.tracks.find((t) => t.clips.some((c) => c.id === clip.id)) ?? null)
    : null;

  return (
    <aside
      aria-label="Inspector"
      className="flex w-[300px] shrink-0 flex-col overflow-y-auto"
      style={{
        background: "var(--ve-panel)",
        borderLeft: "1px solid var(--ve-line-strong)",
      }}
    >
      {!clip || !track ? (
        <ProjectProperties project={project} />
      ) : (
        <ClipProperties
          clip={clip}
          track={track}
          count={selected.length}
          onPatch={onPatch}
        />
      )}
    </aside>
  );
}

function ProjectProperties({ project }: { readonly project: EditorProject }) {
  const clipCount = project.tracks.reduce((n, t) => n + t.clips.length, 0);
  return (
    <>
      <PanelTitle>Project</PanelTitle>
      <div className="px-3 pb-3">
        <Row label="Title" value={project.title} />
        <Row label="Frame" value={`${project.width} × ${project.height}`} />
        <Row label="Frame rate" value={`${project.fps} fps`} />
        <Row label="Tracks" value={String(project.tracks.length)} />
        <Row label="Clips" value={String(clipCount)} />
      </div>
      <p
        className="px-3 pb-3 text-[10px] leading-relaxed"
        style={{ color: "var(--ve-text-faint)" }}
      >
        Select a clip to edit it. Space plays, Ctrl+B splits at the playhead,
        Ctrl+Z undoes.
      </p>
    </>
  );
}

function ClipProperties({
  clip,
  track,
  count,
  onPatch,
}: {
  readonly clip: EditorClip;
  readonly track: EditorTrack;
  readonly count: number;
  readonly onPatch: Props["onPatch"];
}) {
  const audio = isAudioTrackKind(track.kind);
  const isText = track.kind === "text" || clip.kind === "text";
  const isCaption = track.kind === "caption";

  return (
    <>
      <PanelTitle>
        {count > 1 ? `${count} clips selected` : clip.label}
      </PanelTitle>

      <Section title="Timing">
        <Row label="Track" value={track.name} />
        <Row label="Start" value={formatTimecode(clip.startMs)} />
        <Row label="Duration" value={formatTimecode(clip.durationMs)} />
        <NumberField
          label="Start (ms)"
          value={clip.startMs}
          step={100}
          onChange={(v) =>
            onPatch(clip.id, { startMs: v }, "Set start", `start:${clip.id}`)
          }
        />
        <NumberField
          label="Duration (ms)"
          value={clip.durationMs}
          step={100}
          onChange={(v) =>
            onPatch(
              clip.id,
              { durationMs: v },
              "Set duration",
              `dur:${clip.id}`,
            )
          }
        />
      </Section>

      {isCaption || isText ? (
        <Section title={isCaption ? "Caption" : "Text"}>
          <TextArea
            label="Content"
            value={clip.text?.text ?? ""}
            onChange={(v) =>
              onPatch(
                clip.id,
                { text: { ...clip.text, text: v } },
                "Edit text",
                `text:${clip.id}`,
              )
            }
          />
          {isText ? (
            <>
              <NumberField
                label="Font size"
                value={clip.text?.fontSize ?? 96}
                step={4}
                onChange={(v) =>
                  onPatch(
                    clip.id,
                    { text: { ...clip.text, fontSize: v } },
                    "Font size",
                    `fs:${clip.id}`,
                  )
                }
              />
              <SelectField
                label="Align"
                value={clip.text?.align ?? "center"}
                options={["left", "center", "right"]}
                onChange={(v) =>
                  onPatch(
                    clip.id,
                    {
                      text: {
                        ...clip.text,
                        align: v as "left" | "center" | "right",
                      },
                    },
                    "Align",
                  )
                }
              />
            </>
          ) : null}
        </Section>
      ) : null}

      {audio ? (
        <Section title="Audio">
          <RangeField
            label="Volume"
            value={clip.audio?.volume ?? 1}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) =>
              onPatch(
                clip.id,
                { audio: { ...clip.audio, volume: v } },
                "Volume",
                `vol:${clip.id}`,
              )
            }
          />
          <NumberField
            label="Fade in (ms)"
            value={clip.audio?.fadeInMs ?? 0}
            step={50}
            onChange={(v) =>
              onPatch(
                clip.id,
                { audio: { ...clip.audio, fadeInMs: v } },
                "Fade in",
                `fi:${clip.id}`,
              )
            }
          />
          <NumberField
            label="Fade out (ms)"
            value={clip.audio?.fadeOutMs ?? 0}
            step={50}
            onChange={(v) =>
              onPatch(
                clip.id,
                { audio: { ...clip.audio, fadeOutMs: v } },
                "Fade out",
                `fo:${clip.id}`,
              )
            }
          />
          <Note>
            The renderer applies one global narration gain, not per-clip volume.
            Volume and fades here are editor-side and are reported as dropped on
            export.
          </Note>
        </Section>
      ) : (
        <Section title="Transform">
          <RangeField
            label="Scale"
            value={clip.transform?.scale ?? 1}
            min={0.2}
            max={3}
            step={0.01}
            onChange={(v) =>
              onPatch(
                clip.id,
                { transform: { ...clip.transform, scale: v } },
                "Scale",
                `scale:${clip.id}`,
              )
            }
          />
          <RangeField
            label="Opacity"
            value={clip.transform?.opacity ?? 1}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) =>
              onPatch(
                clip.id,
                { transform: { ...clip.transform, opacity: v } },
                "Opacity",
                `op:${clip.id}`,
              )
            }
          />
          <NumberField
            label="Position X"
            value={clip.transform?.x ?? 0}
            step={10}
            onChange={(v) =>
              onPatch(
                clip.id,
                { transform: { ...clip.transform, x: v } },
                "Position X",
                `x:${clip.id}`,
              )
            }
          />
          <NumberField
            label="Position Y"
            value={clip.transform?.y ?? 0}
            step={10}
            onChange={(v) =>
              onPatch(
                clip.id,
                { transform: { ...clip.transform, y: v } },
                "Position Y",
                `y:${clip.id}`,
              )
            }
          />
          <NumberField
            label="Rotation"
            value={clip.transform?.rotation ?? 0}
            step={1}
            onChange={(v) =>
              onPatch(
                clip.id,
                { transform: { ...clip.transform, rotation: v } },
                "Rotation",
                `rot:${clip.id}`,
              )
            }
          />
          <SelectField
            label="Fit"
            value={clip.transform?.fit ?? "cover"}
            options={["cover", "contain"]}
            onChange={(v) =>
              onPatch(
                clip.id,
                {
                  transform: {
                    ...clip.transform,
                    fit: v as "cover" | "contain",
                  },
                },
                "Fit",
              )
            }
          />
          <Note>
            `fit` compiles to the renderer&apos;s sourceTreatment. Scale,
            position and opacity have no equivalent and are reported as dropped
            on export.
          </Note>
        </Section>
      )}

      <Section title="Transition">
        <NumberField
          label="Dissolve in (ms)"
          value={clip.transitionInMs ?? 0}
          step={20}
          onChange={(v) =>
            onPatch(
              clip.id,
              { transitionInMs: v },
              "Dissolve",
              `tr:${clip.id}`,
            )
          }
        />
        <Note>
          The renderer uses one global crossfade length for every cut. A
          per-clip value here is advisory.
        </Note>
      </Section>
    </>
  );
}

/* ── primitives ─────────────────────────────────────────────────────────── */

function PanelTitle({ children }: { readonly children: React.ReactNode }) {
  return (
    <div
      // `shrink-0` is load-bearing: inside a flex column whose content
      // overflows, a child with no basis gets compressed — which squeezed this
      // title to half its glyph height and ran the divider through the text.
      className="sticky top-0 z-10 shrink-0 truncate px-3 py-2 text-[11px] font-semibold"
      style={{
        background: "var(--ve-panel)",
        borderBottom: "1px solid var(--ve-line)",
        color: "var(--ve-text)",
      }}
    >
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="shrink-0" style={{ borderBottom: "1px solid var(--ve-line)" }}>
      <div
        className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--ve-text-faint)" }}
      >
        {title}
      </div>
      <div className="px-3 pb-2.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-baseline justify-between py-[3px]">
      <span className="text-[11px]" style={{ color: "var(--ve-text-faint)" }}>
        {label}
      </span>
      <span
        className="max-w-[60%] truncate text-[11px] tabular-nums"
        style={{ color: "var(--ve-text-dim)" }}
      >
        {value}
      </span>
    </div>
  );
}

function Note({ children }: { readonly children: React.ReactNode }) {
  return (
    <p
      className="mt-1.5 text-[10px] leading-relaxed"
      style={{ color: "var(--ve-text-faint)" }}
    >
      {children}
    </p>
  );
}

const fieldStyle: React.CSSProperties = {
  background: "var(--ve-raised)",
  border: "1px solid var(--ve-line-strong)",
  color: "var(--ve-text)",
};

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
}) {
  return (
    <label className="mt-1.5 flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "var(--ve-text-dim)" }}>
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={Math.round(value)}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="h-6 w-[92px] rounded px-1.5 text-right text-[11px] tabular-nums"
        style={fieldStyle}
      />
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
}) {
  return (
    <div className="mt-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px]" style={{ color: "var(--ve-text-dim)" }}>
          {label}
        </span>
        <span
          className="text-[10px] tabular-nums"
          style={{ color: "var(--ve-text-faint)" }}
        >
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full"
        style={{ accentColor: "var(--ve-accent)" }}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="mt-1.5 flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "var(--ve-text-dim)" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-6 w-[92px] rounded px-1 text-[11px]"
        style={fieldStyle}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="mt-1.5 block">
      <span className="text-[11px]" style={{ color: "var(--ve-text-dim)" }}>
        {label}
      </span>
      <textarea
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-y rounded p-1.5 text-[11px] leading-relaxed"
        style={fieldStyle}
      />
    </label>
  );
}
