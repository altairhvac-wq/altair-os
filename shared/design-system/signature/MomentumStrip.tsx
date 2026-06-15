export type MomentumItem = {
  label: string;
};

export type MomentumStripProps = {
  items: MomentumItem[];
  className?: string;
};

export function MomentumStrip({ items, className = "" }: MomentumStripProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      role="list"
      aria-label="Recent momentum"
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6 ${className}`}
    >
      {items.map((item) => (
        <div
          key={item.label}
          role="listitem"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700"
          >
            ✓
          </span>
          <span className="leading-snug">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
