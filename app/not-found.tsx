import "./status-page.css";
import Link from "next/link";

/**
 * Branded 404. Without this file Next.js renders its unstyled default page,
 * which reads as broken — especially right before launch.
 */
export default function NotFound() {
  return (
    <main className="status-page">
      <p className="status-page__eyebrow">
        Altair Operating System
      </p>
      <h1 className="status-page__title">
        404
      </h1>
      <p className="status-page__text">
        This page doesn&apos;t exist or may have moved. Check the address, or
        start from one of these.
      </p>
      <div className="status-page__actions">
        <Link
          href="/"
          className="status-page__button status-page__button--primary"
        >
          Home
        </Link>
        <Link
          href="/pricing"
          className="status-page__button status-page__button--outline"
        >
          Pricing
        </Link>
        <Link
          href="/resources"
          className="status-page__button status-page__button--outline"
        >
          Resources
        </Link>
      </div>
    </main>
  );
}
