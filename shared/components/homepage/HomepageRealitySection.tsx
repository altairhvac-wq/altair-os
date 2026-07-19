"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileClock,
  LayoutGrid,
  Phone,
  UserRound,
  Wallet,
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
    id: "tools",
    title: "Disconnected tools",
    detail: "Three apps that never quite agree on the same customer.",
    icon: LayoutGrid,
  },
  {
    id: "tech",
    title: "Technicians waiting",
    detail: "A truck idling while someone finds the address again.",
    icon: UserRound,
  },
  {
    id: "estimate",
    title: "Missed estimates",
    detail: "A quote drafted, then buried under the next call.",
    icon: FileClock,
  },
  {
    id: "office",
    title: "Office overload",
    detail: "The desk becomes a switchboard between systems.",
    icon: Phone,
  },
  {
    id: "cash",
    title: "Slow cash flow",
    detail: "Payment is “somewhere in QuickBooks.”",
    icon: Wallet,
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
      className="mc-reality relative px-5 py-28 sm:px-8 sm:py-36"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(222,228,236,0.28),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-[10%] top-0 h-28 bg-[radial-gradient(ellipse_at_top,rgba(210,216,224,0.07),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[90rem]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9a44d]">
            The reality of running a shop
          </p>
          <h2
            id="mc-reality-heading"
            className="mt-6 text-[2rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.65rem] sm:leading-[1.15]"
          >
            Too many tools. Too much chaos. Too many things slip.
          </h2>
        </div>

        <ul
          className={[
            "mt-20 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-5",
            visible ? "mc-reality-visible" : "opacity-0",
          ].join(" ")}
        >
          {VIGNETTES.map((item, index) => {
            const Icon = item.icon;
            return (
              <li
                key={item.id}
                className="mc-reality-card mc-glass-card rounded-2xl px-5 py-6"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <Icon
                  className="h-5 w-5 text-[#c9a44d]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-5 text-[0.95rem] font-semibold leading-snug text-[#fff9ea] sm:text-base">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-[0.9rem] leading-relaxed text-[#9a9080]">
                  {item.detail}
                </p>
              </li>
            );
          })}
        </ul>

        <div
          className={[
            "relative mt-16 sm:hidden",
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
                  "mc-glass-card rounded-2xl p-7 transition-opacity duration-500",
                  active ? "relative opacity-100" : "absolute inset-0 opacity-0",
                ].join(" ")}
                aria-hidden={!active}
              >
                <Icon
                  className="h-5 w-5 text-[#c9a44d]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-5 text-lg font-semibold text-[#fff9ea]">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#9a9080]">
                  {item.detail}
                </p>
              </div>
            );
          })}
          <div
            className="mt-5 flex justify-center gap-1.5"
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
