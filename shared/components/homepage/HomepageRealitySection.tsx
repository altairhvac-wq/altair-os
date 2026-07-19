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
    title: "Technician waiting",
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
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    const fallback = window.setTimeout(() => setVisible(true), 4000);
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
      className="mc-reality relative border-t border-[#223044]/80 px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8e826f]">
            The reality of running a shop
          </p>
          <h2
            id="mc-reality-heading"
            className="mt-4 text-3xl font-semibold tracking-tight text-[#fff9ea] sm:text-4xl"
          >
            Your shop doesn’t fail in one place. It frays everywhere.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#c9bfae] sm:text-lg">
            The phone rings while a tech waits for an address. An estimate sits
            unsent. The office is reconciling three apps that don’t talk.
            Payment is “somewhere in QuickBooks.” None of that means you’re bad
            at this — it means the tools were never designed as one operating
            picture.
          </p>
        </div>

        {/* Desktop / tablet: horizontal pressure strip */}
        <ul
          className={[
            "mt-14 hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-5",
            visible ? "mc-reality-visible" : "opacity-0",
          ].join(" ")}
        >
          {VIGNETTES.map((item, index) => {
            const Icon = item.icon;
            return (
              <li
                key={item.id}
                className="mc-reality-card rounded-xl border border-[#223044] bg-[#101a28]/55 p-5"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <Icon
                  className="h-5 w-5 text-[#c9a44d]/90"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-sm font-semibold text-[#f3ebdd]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8e826f]">
                  {item.detail}
                </p>
              </li>
            );
          })}
        </ul>

        {/* Mobile: one vignette at a time */}
        <div
          className={[
            "relative mt-12 sm:hidden",
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
                  "rounded-xl border border-[#223044] bg-[#101a28]/55 p-6 transition-opacity duration-500",
                  active ? "relative opacity-100" : "absolute inset-0 opacity-0",
                ].join(" ")}
                aria-hidden={!active}
              >
                <Icon
                  className="h-5 w-5 text-[#c9a44d]/90"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-base font-semibold text-[#f3ebdd]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8e826f]">
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
                  index === activeIndex ? "bg-[#c9a44d]" : "bg-[#223044]",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
