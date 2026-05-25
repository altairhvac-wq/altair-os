import { Bell, Search } from "lucide-react";

type HeaderProps = {
  title: string;
  description?: string;
};

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        {description ? (
          <p className="text-sm text-slate-500">{description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">Demo Company</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
            DC
          </div>
        </div>
      </div>
    </header>
  );
}
