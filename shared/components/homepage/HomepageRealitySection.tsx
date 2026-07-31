"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clock,
  Moon,
  Phone,
  type LucideIcon,
} from "lucide-react";

type Vignette = {
  id: string;
  title: string;
  detail: string;
  icon: LucideIcon;
};

const VIGNETTES: Vignette[] = [
  {
    id: "customer",
    title: "Customer waiting",
    detail: "You promised you'd call back.",
    icon: Phone,
  },
  {
    id: "dinner",
    title: "Dinner interrupted",
    detail: 'Another "quick question" after hours.',
    icon: Moon,
  },
  {
    id: "technician",
    title: "Technician delayed",
    detail: "The day is already behind schedule.",
    icon: Clock,
  },
];

export function HomepageRealitySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reveal = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(reveal);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px 10% 0px" },
    );

    observer.observe(node);
    const fallback = window.setTimeout(() => setVisible(true), 900);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % VIGNETTES.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [visible]);

  return (
    <section
      ref={sectionRef}
      id="product"
      aria-labelledby="mc-reality-heading"
      className="mc-reality relative scroll-mt-28 px-5 py-12 sm:px-8 sm:py-14"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(222,228,236,0.28),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-[10%] top-0 h-20 bg-[radial-gradient(ellipse_at_top,rgba(210,216,224,0.07),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[90rem]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9a44d]">
            The reality of running a business
          </p>
          <h2
            id="mc-reality-heading"
            className="mt-3 text-[1.85rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.35rem] sm:leading-[1.15]"
          >
            When did the business start following you home?
          </h2>
          <div className="mx-auto mt-5 max-w-2xl space-y-4 text-base leading-relaxed text-[#c9bfae] sm:mt-6 sm:text-lg sm:leading-[1.7]">
            <p>
              You did not start your company because you loved paperwork.
              <br />
              Or chasing invoices.
              <br />
              Or answering calls during dinner.
            </p>
            <p>You started it to build something worth being proud of.</p>
            <p>
              Somewhere along the way, the business started owning your
              attention.
            </p>
            <p className="text-[#f3ebdd]">
              Altair gives you one place to run the work—and gives that attention
              back.
            </p>
          </div>
        </div>

        <ul
          className={[
            "mx-auto mt-8 hidden max-w-5xl gap-3 sm:grid sm:grid-cols-3 lg:mt-10",
            visible ? "mc-reality-visible" : "opacity-0",
          ].join(" ")}
        >
          {VIGNETTES.map((item, index) => {
            const Icon = item.icon;
            return (
              <li
                key={item.id}
                className="mc-reality-card mc-glass-card rounded-2xl px-4 py-5"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <Icon
                  className="h-5 w-5 text-[#c9a44d]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-[0.95rem] font-semibold leading-snug text-[#fff9ea] sm:text-base">
                  {item.title}
                </h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-[#9a9080]">
                  {item.detail}
                </p>
              </li>
            );
          })}
        </ul>

        <div
          className={[
            "relative mt-8 sm:hidden",
            visible ? "mc-reality-visible" : "opacity-0",
          ].join(" ")}
          aria-live="polite"
        >
          {VIGNETTES.map((item, index) => {
            const Icon = item.icon;
            const active = index === activeIndex;
            return (
              <div
                key={item.id}
                className={[
                  "mc-glass-card rounded-2xl p-5 transition-opacity duration-500",
                  active ? "relative opacity-100" : "absolute inset-0 opacity-0",
                ].join(" ")}
                aria-hidden={!active}
              >
                <Icon
                  className="h-5 w-5 text-[#c9a44d]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-lg font-semibold text-[#fff9ea]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9a9080]">
                  {item.detail}
                </p>
              </div>
            );
          })}
          <div
            className="mt-4 flex justify-center gap-1.5"
            aria-hidden="true"
          >
            {VIGNETTES.map((item, index) => (
              <span
                key={item.id}
                className={[
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  index === activeIndex ? "bg-[#c9a44d]" : "bg-[#2a303a]",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(to_right,transparent,rgba(222,228,236,0.18),transparent)]"
        aria-hidden="true"
      />
    </section>
  );
}
