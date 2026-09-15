"use client";

import { Component, type ReactNode } from "react";

/**
 * One panel failing must not take the editor with it.
 *
 * Without this, a single bad clip — an inspector field reading a property that
 * is not there, a waveform with no peaks — unmounts the whole React tree and
 * the operator gets the route's error page instead of an editor. Their work is
 * still in localStorage, but they cannot see it, and the obvious next move
 * (reload) is the one that makes it look permanent.
 *
 * Each panel is wrapped separately, so a broken inspector leaves the timeline,
 * the monitor and the transport usable — and the operator can select a
 * different clip and carry on.
 */
export class PanelBoundary extends Component<
  { readonly name: string; readonly children: ReactNode },
  { readonly error: Error | null }
> {
  constructor(props: { name: string; children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Logged rather than swallowed: a panel that failed silently and recovered
    // is a bug nobody will ever report.
    console.error(`[editor] ${this.props.name} panel failed`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        data-testid="ve-panel-error"
        className="flex min-w-0 flex-col items-start gap-2 p-3 text-[11px]"
        style={{ background: "var(--ve-panel)", color: "var(--ve-text-dim)" }}
      >
        <span className="font-medium" style={{ color: "var(--ve-warn, #e0a44a)" }}>
          The {this.props.name} panel stopped
        </span>
        <span style={{ color: "var(--ve-text-faint)" }}>
          {this.state.error.message}
        </span>
        <span style={{ color: "var(--ve-text-faint)" }}>
          The rest of the editor is still running, and your edit is saved.
        </span>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="rounded px-2 py-1"
          style={{
            background: "var(--ve-raised)",
            border: "1px solid var(--ve-line-strong)",
            color: "var(--ve-text)",
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
