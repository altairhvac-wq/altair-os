type CockpitSectionBandProps = {
  label: string;
  title: string;
  detail?: string;
  variant?: "dark" | "light";
};

export function CockpitSectionBand({
  label,
  title,
  detail,
  variant = "dark",
}: CockpitSectionBandProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl px-4 py-3 sm:px-5 ${
        isDark
          ? "bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 ring-1 ring-slate-700/50"
          : "bg-gradient-to-r from-slate-100 via-white to-sky-50/60 ring-1 ring-slate-200/60"
      }`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${
          isDark ? "bg-gradient-to-b from-cyan-400 to-sky-500" : "bg-gradient-to-b from-cyan-500 to-sky-400"
        }`}
      />
      <div className="flex flex-wrap items-end justify-between gap-3 pl-2">
        <div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
              isDark ? "text-cyan-400/70" : "text-slate-400"
            }`}
          >
            {label}
          </p>
          <p className={`mt-0.5 text-sm font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
            {title}
          </p>
        </div>
        {detail ? (
          <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>{detail}</p>
        ) : null}
      </div>
    </div>
  );
}
