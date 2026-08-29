"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  FileText,
  MapPinned,
  Receipt,
  UserPlus,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type WorkflowNode = {
  name: string;
  detail: string;
  icon: LucideIcon;
};

const WORKFLOW_NODES: WorkflowNode[] = [
  { name: "Lead", detail: "Capture every opportunity", icon: UserPlus },
  { name: "Customer", detail: "One living record", icon: Users },
  { name: "Job", detail: "Scoped and ready", icon: ClipboardList },
  { name: "Dispatch", detail: "Who goes where", icon: MapPinned },
  { name: "Technician", detail: "Work in the field", icon: Wrench },
  { name: "Estimate", detail: "Approve without chase", icon: FileText },
  { name: "Invoice", detail: "Bill what was done", icon: Receipt },
  { name: "Payment", detail: "Cash closes the loop", icon: Wallet },
  { name: "Reporting", detail: "See the whole business", icon: BarChart3 },
];

export function HomepageOperatingSystemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reveal = window.setTimeout(() => setActive(true), 0);
      return () => window.clearTimeout(reveal);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    const fallback = window.setTimeout(() => setActive(true), 900);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      aria-labelledby="mc-os-heading"
      className="mc-os relative scroll-mt-28 px-5 py-12 sm:px-8 sm:py-14 lg:py-16"
    >
      <div
        className="pointer-events-none absolute inset-x-[8%] top-0 h-28 bg-[radial-gradient(ellipse_at_top,rgba(210,216,224,0.05),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[90rem]">
        <div id="why-altair" className="mx-auto max-w-3xl scroll-mt-28 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c2a05a]">
            One operating system. One continuous workflow.
          </p>
          <h2
            id="mc-os-heading"
            className="mt-3 text-[1.85rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.35rem] sm:leading-[1.15]"
          >
            From first call to payment — without leaving the system.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#c9bfae] sm:text-lg">
            Altair connects the work that already exists in your company — so the
            same customer, job, and dollars move forward together instead of
            being retyped into another tool.
          </p>
        </div>

        <div
          className={[
            "mc-os-spine relative mt-8 hidden lg:block",
            active ? "mc-os-spine-active" : "",
          ].join(" ")}
          role="list"
          aria-label="Workflow from lead to reporting"
        >
          <div
            className="absolute left-[2%] right-[2%] top-[1.85rem] h-[2px] bg-[rgba(222,228,236,0.1)]"
            aria-hidden="true"
          />
          <div
            className="mc-os-spine-rail absolute left-[2%] right-[2%] top-[1.85rem] h-[2px] origin-left bg-[linear-gradient(to_right,rgba(164,130,58,0.25),rgba(194,160,90,0.95)_55%,rgba(194,160,90,1))]"
            aria-hidden="true"
          />
          <ol className="relative grid grid-cols-9 gap-1">
            {WORKFLOW_NODES.map((node, index) => {
              const Icon = node.icon;
              const isOutcome = index === WORKFLOW_NODES.length - 1;
              return (
                <li
                  key={node.name}
                  className="mc-os-node flex flex-col items-center text-center"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <span className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-[#c2a05a]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={[
                      "relative flex items-center justify-center rounded-full border bg-[rgba(14,16,20,0.96)]",
                      isOutcome
                        ? "h-16 w-16 border-[rgba(194,160,90,0.65)] shadow-[0_0_36px_-6px_rgba(194,160,90,0.55)]"
                        : "h-14 w-14 border-[rgba(194,160,90,0.4)] shadow-[0_0_28px_-10px_rgba(194,160,90,0.4)]",
                    ].join(" ")}
                  >
                    <Icon
                      className={isOutcome ? "h-6 w-6 text-[#c2a05a]" : "h-5 w-5 text-[#c2a05a]"}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-3 text-sm font-semibold tracking-wide text-[#fff9ea]">
                    {node.name}
                  </span>
                  <span className="mt-1 max-w-[7.5rem] text-[11px] leading-snug text-[#8e826f]">
                    {node.detail}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <ol
          className={[
            "mc-os-spine-mobile relative mx-auto mt-8 grid max-w-lg grid-cols-2 gap-x-3 gap-y-3 lg:hidden",
            active ? "mc-os-spine-active" : "",
          ].join(" ")}
          aria-label="Workflow from lead to reporting"
        >
          {WORKFLOW_NODES.map((node, index) => {
            const Icon = node.icon;
            const isOutcome = index === WORKFLOW_NODES.length - 1;
            return (
              <li
                key={node.name}
                className={[
                  "mc-os-node relative flex items-start gap-3 rounded-xl border px-3 py-3",
                  isOutcome
                    ? "border-[rgba(194,160,90,0.45)] bg-[rgba(164,130,58,0.08)]"
                    : "border-[rgba(222,228,236,0.1)] bg-[rgba(14,16,20,0.55)]",
                ].join(" ")}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span
                  className={[
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-[rgba(14,16,20,0.96)]",
                    isOutcome
                      ? "border-[rgba(194,160,90,0.65)]"
                      : "border-[rgba(194,160,90,0.35)]",
                  ].join(" ")}
                >
                  <Icon
                    className="h-4 w-4 text-[#c2a05a]"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0 pt-0.5">
                  <span className="block text-[13px] font-semibold text-[#fff9ea]">
                    {String(index + 1).padStart(2, "0")} · {node.name}
                  </span>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#8e826f]">
                    {node.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

      </div>
    </section>
  );
}
