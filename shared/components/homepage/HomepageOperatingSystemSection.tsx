"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HOMEPAGE_SCREENSHOTS } from "@/shared/components/homepage/homepage-tokens";

const WORKFLOW_NODES = [
  "Lead",
  "Customer",
  "Job",
  "Dispatch",
  "Technician",
  "Estimate",
  "Invoice",
  "Payment",
] as const;

type Frame = {
  label: string;
  src: string;
  alt: string;
};

const LINKED_FRAMES: Frame[] = [
  {
    label: "Leads",
    src: HOMEPAGE_SCREENSHOTS.leads,
    alt: "Altair OS leads workspace",
  },
  {
    label: "Dispatch",
    src: HOMEPAGE_SCREENSHOTS.dispatch,
    alt: "Altair OS dispatch command board",
  },
  {
    label: "Estimate",
    src: HOMEPAGE_SCREENSHOTS.estimate,
    alt: "Altair OS estimate document",
  },
  {
    label: "Invoice",
    src: HOMEPAGE_SCREENSHOTS.invoices,
    alt: "Altair OS invoices workspace",
  },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1118]";

export function HomepageOperatingSystemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    const fallback = window.setTimeout(() => setActive(true), 4000);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="one-operating-system"
      aria-labelledby="mc-os-heading"
      className="mc-os relative border-t border-[#223044]/80 px-5 py-20 sm:px-8 sm:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
      >
        <Image
          src={HOMEPAGE_SCREENSHOTS.dashboard}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[#070b10]/80" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9a44d]">
            One operating system
          </p>
          <h2
            id="mc-os-heading"
            className="mt-4 text-3xl font-semibold tracking-tight text-[#fff9ea] sm:text-4xl"
          >
            One operating system. One continuous workflow.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#c9bfae] sm:text-lg">
            Altair connects the work that already exists in your company — so the
            same customer, job, and dollars never get retyped into a new tool.
          </p>
        </div>

        {/* Desktop spine */}
        <div
          className={[
            "mc-os-spine relative mt-14 hidden lg:block",
            active ? "mc-os-spine-active" : "",
          ].join(" ")}
          role="list"
          aria-label="Workflow from lead to payment"
        >
          <div
            className="absolute left-[6%] right-[6%] top-[1.15rem] h-px bg-[#223044]"
            aria-hidden="true"
          />
          <div
            className="mc-os-spine-rail absolute left-[6%] right-[6%] top-[1.15rem] h-px origin-left bg-[linear-gradient(to_right,#b88a2e,#c9a44d)]"
            aria-hidden="true"
          />
          <div
            className="mc-os-work-token absolute top-[0.7rem] h-2.5 w-2.5 rounded-full bg-[#fff9ea] shadow-[0_0_0_3px_rgba(184,138,46,0.35)]"
            aria-hidden="true"
          />
          <ol className="relative grid grid-cols-8 gap-2">
            {WORKFLOW_NODES.map((node, index) => (
              <li
                key={node}
                className="mc-os-node flex flex-col items-center text-center"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#223044] bg-[#0e141d] text-[11px] font-semibold text-[#c9a44d] ring-1 ring-white/[0.03]">
                  {index + 1}
                </span>
                <span className="mt-3 text-xs font-semibold tracking-wide text-[#f3ebdd]">
                  {node}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Mobile / tablet vertical rail */}
        <ol
          className={[
            "mc-os-spine-mobile relative mx-auto mt-12 max-w-sm lg:hidden",
            active ? "mc-os-spine-active" : "",
          ].join(" ")}
          aria-label="Workflow from lead to payment"
        >
          <div
            className="absolute bottom-3 left-[1.05rem] top-3 w-px bg-[#223044]"
            aria-hidden="true"
          />
          <div
            className="mc-os-spine-rail-vertical absolute left-[1.05rem] top-3 w-px origin-top bg-[linear-gradient(to_bottom,#b88a2e,#c9a44d)]"
            aria-hidden="true"
          />
          <div
            className="mc-os-work-token-vertical absolute left-[0.7rem] h-2.5 w-2.5 rounded-full bg-[#fff9ea] shadow-[0_0_0_3px_rgba(184,138,46,0.35)]"
            aria-hidden="true"
          />
          {WORKFLOW_NODES.map((node, index) => (
            <li
              key={node}
              className="mc-os-node relative flex items-center gap-4 py-2.5"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#223044] bg-[#0e141d] text-[11px] font-semibold text-[#c9a44d]">
                {index + 1}
              </span>
              <span className="text-sm font-semibold text-[#f3ebdd]">{node}</span>
            </li>
          ))}
        </ol>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LINKED_FRAMES.map((frame) => (
            <li
              key={frame.label}
              className="overflow-hidden rounded-xl border border-[#223044] bg-[#0e141d] ring-1 ring-white/[0.03]"
            >
              <div className="border-b border-[#223044]/80 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e826f]">
                  {frame.label}
                </p>
              </div>
              <div className="relative aspect-[16/10] bg-[#070b10]">
                <Image
                  src={frame.src}
                  alt={frame.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-top"
                  loading="lazy"
                />
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center">
          <Link
            href="/signup"
            className={`text-sm font-semibold text-[#c9a44d] underline-offset-4 transition-colors hover:text-[#e6d092] hover:underline ${focusRing} rounded-sm`}
          >
            Request Closed Beta Access
          </Link>
        </p>
      </div>
    </section>
  );
}
