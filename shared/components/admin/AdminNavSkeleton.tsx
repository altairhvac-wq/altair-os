function NavIconSkeleton() {
  return <div className="admin-skeleton mx-auto h-5 w-5 rounded-md" />;
}

function NavLabelSkeleton() {
  return <div className="admin-skeleton mx-auto h-2.5 w-10 rounded" />;
}

type AdminNavSkeletonProps = {
  variant: "mobile" | "desktop";
};

export function AdminNavSkeleton({ variant }: AdminNavSkeletonProps) {
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
      className="relative z-30 w-full max-w-full shrink-0 border-b border-slate-200/90 bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.03)] md:hidden"
    >
      <div className="flex flex-col gap-0.5 px-1 py-1.5">
        <ul className="flex w-full items-stretch gap-0.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="flex min-w-0 flex-1">
              <div className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1">
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
