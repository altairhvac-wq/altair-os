/** Shown while the guided setup's numbers load: the page's shape, with nothing to press yet. */
export default function GetStartedLoading() {
  return (
    <section aria-busy="true" aria-label="Loading the guided setup" className="mx-auto w-full min-w-0 max-w-[60rem] px-1 pb-6 sm:px-2">
      <div className="h-3 w-28 animate-pulse rounded bg-altair-border-strong/40 motion-reduce:animate-none" />
      <div className="mt-3 h-7 w-64 max-w-full animate-pulse rounded bg-altair-border-strong/40 motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-altair-border-strong/30 motion-reduce:animate-none" />
      <div className="mt-5 flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="h-16 animate-pulse rounded-2xl bg-altair-paper/70 motion-reduce:animate-none" />
        ))}
      </div>
    </section>
  );
}
