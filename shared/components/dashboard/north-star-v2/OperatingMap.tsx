import type { OperatingLink, OperatingNode } from "./sample-data";

const nodeToneStyles = {
  cyan: {
    ring: "ring-cyan-400/30",
    glow: "shadow-[0_0_24px_rgba(34,211,238,0.25)]",
    dot: "bg-cyan-400",
    label: "text-cyan-700",
  },
  sky: {
    ring: "ring-sky-400/30",
    glow: "shadow-[0_0_24px_rgba(56,189,248,0.22)]",
    dot: "bg-sky-400",
    label: "text-sky-700",
  },
  amber: {
    ring: "ring-amber-400/35",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.18)]",
    dot: "bg-amber-400",
    label: "text-amber-800",
  },
  emerald: {
    ring: "ring-emerald-400/30",
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.2)]",
    dot: "bg-emerald-400",
    label: "text-emerald-700",
  },
  slate: {
    ring: "ring-slate-300/40",
    glow: "shadow-[0_0_16px_rgba(148,163,184,0.15)]",
    dot: "bg-slate-400",
    label: "text-slate-600",
  },
} as const;

type OperatingMapProps = {
  nodes: OperatingNode[];
  links: OperatingLink[];
};

function getNodeCenter(node: OperatingNode) {
  return { x: node.x, y: node.y };
}

export function OperatingMap({ nodes, links }: OperatingMapProps) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return (
    <div
      aria-label="Live operating map"
      className="relative min-h-[220px] flex-1 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_-20px_rgba(15,23,42,0.55)] sm:min-h-[260px] lg:min-h-[280px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(34,211,238,0.12),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-slate-900" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Live ops map
        </span>
      </div>

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.15)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.35)" />
            <stop offset="100%" stopColor="rgba(251,191,36,0.2)" />
          </linearGradient>
        </defs>
        {links.map((link) => {
          const from = nodeById.get(link.from);
          const to = nodeById.get(link.to);
          if (!from || !to) return null;
          const a = getNodeCenter(from);
          const b = getNodeCenter(to);
          return (
            <line
              key={`${link.from}-${link.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="url(#link-gradient)"
              strokeWidth="0.35"
              strokeDasharray="1.2 0.8"
              opacity="0.85"
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const tone = nodeToneStyles[node.tone];
        return (
          <div
            key={node.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div
              className={`flex min-w-[5.5rem] flex-col items-center gap-1 rounded-2xl bg-slate-950/70 px-3 py-2.5 ring-1 backdrop-blur-sm ${tone.ring} ${tone.glow}`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.label}`}>
                {node.label}
              </span>
              <span className="text-xl font-semibold tabular-nums tracking-tight text-white">
                {node.value}
              </span>
              <span className="text-[10px] text-slate-400">{node.sublabel}</span>
              <span className={`mt-0.5 h-1 w-1 rounded-full ${tone.dot}`} aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
