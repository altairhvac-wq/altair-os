function NavIconSkeleton() {
  return <div className="admin-skeleton mx-auto h-5 w-5 rounded-md" />;
}

function NavLabelSkeleton() {
  return <div className="admin-skeleton mx-auto h-2.5 w-10 rounded" />;
}

type AdminNavSkeletonProps = {
  variant: "mobile" | "desktop" | "desktop-sidebar";
};

export function AdminNavSkeleton({ variant }: AdminNavSkeletonProps) {
  if (variant === "desktop-sidebar") {
    return (
      <aside
        aria-label="Loading navigation"
        aria-busy="true"
        className="admin-north-star-sidebar hidden shrink-0 flex-col md:flex"
      >
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-7">
            {Array.from({ length: 3 }).map((_, groupIndex) => (
              <li key={groupIndex}>
                <div className="admin-skeleton mb-2.5 ml-2.5 h-2.5 w-16 rounded" />
                <ul className="flex flex-col gap-1">
                  {Array.from({ length: 3 }).map((_, itemIndex) => (
                    <li key={itemIndex}>
                      <div className="admin-skeleton h-10 w-full rounded-xl" />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    );
  }

  if (variant === "desktop") {
    return (
      <nav
        aria-label="Loading navigation"
        aria-busy="true"
        className="admin-premium-nav relative z-30 hidden w-full max-w-full shrink-0 md:block"
      >
        <div className="flex min-w-0 items-center gap-2 px-4 sm:px-6">
          <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-1.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index}>
                <div className="admin-skeleton h-8 w-24 rounded-lg" />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Loading navigation"
      aria-busy="true"
      className="admin-mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 md:hidden"
    >
      <div className="border-t border-slate-200/90 bg-white/95 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1.5">
        <ul className="mobile-nav-rail-scroll flex w-full items-stretch gap-0.5 overflow-x-auto px-1.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="shrink-0">
              <div className="flex min-h-11 min-w-[4.75rem] flex-col items-center justify-center gap-1 px-2 py-1.5">
                <NavIconSkeleton />
                <NavLabelSkeleton />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
