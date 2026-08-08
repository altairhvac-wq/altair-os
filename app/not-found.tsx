import Link from "next/link";

/**
 * Branded 404. Without this file Next.js renders its unstyled default page,
 * which reads as broken — especially right before launch.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-altair-paper px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-altair-brass">
        Altair OS
      </p>
      <h1 className="mt-4 text-5xl font-bold tracking-tight text-altair-ink">
        404
      </h1>
      <p className="mt-3 max-w-md text-sm text-altair-ink-secondary">
        This page doesn&apos;t exist or may have moved. Check the address, or
        head back to your dashboard.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-full bg-altair-ink px-6 py-2.5 text-sm font-semibold text-altair-paper transition-opacity hover:opacity-85"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
