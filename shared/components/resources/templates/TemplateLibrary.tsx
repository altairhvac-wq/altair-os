"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Expand, FileSpreadsheet, FileText, Printer, X } from "lucide-react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import { AltairFeatureNote } from "@/shared/components/resources/AltairFeatureNote";
import { Segmented, ToolButton, focusRing } from "@/shared/components/resources/tools/ToolControls";
import { TEMPLATE_SHEETS, type SheetVariant } from "@/shared/components/resources/templates/TemplateSheets";
import { templateDownloadPath } from "@/shared/lib/resources/catalog";
import { RESOURCE_TEMPLATES, templateFileName, templateFilePath, type ResourceTemplate } from "@/shared/lib/resources/templates";

/**
 * The template cards on /resources/templates: a live preview of each sheet
 * (blank or the filled-in HVAC example), Print / Save as PDF, and the
 * editable Excel or Word file. No form, no email, nothing uploaded.
 *
 * Printing renders the chosen sheet alone into a print-only container, so
 * the PDF is just the template, at full letter size.
 */

const VARIANTS = [
  { value: "blank", label: "Blank" },
  { value: "example", label: "Filled-in example" },
] as const;

type Printing = { readonly id: string; readonly variant: SheetVariant } | null;

export function TemplateLibrary() {
  const [printing, setPrinting] = useState<Printing>(null);
  const [open, setOpen] = useState<{ readonly id: string; readonly variant: SheetVariant } | null>(null);

  // Print once the chosen sheet is in the DOM, then clear it.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done);
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  const print = (id: string, variant: SheetVariant) => {
    trackEngagement("cta_click", `tool-templates-${id}-print-${variant}`, { repeat: true });
    setPrinting({ id, variant });
  };

  const PrintSheet = printing ? TEMPLATE_SHEETS[printing.id] : null;

  return (
    <>
      <div className={printing ? "print:hidden" : ""}>
        <ul className="space-y-6">
          {RESOURCE_TEMPLATES.map((template) => (
            <li key={template.id} id={template.id} className="scroll-mt-28">
              <TemplateCard template={template} onPrint={print} onOpen={(variant) => setOpen({ id: template.id, variant })} />
            </li>
          ))}
        </ul>
      </div>
      {PrintSheet && printing ? (
        <div className="hidden print:block">
          <PrintSheet variant={printing.variant} />
        </div>
      ) : null}
      {open ? (
        <PreviewDialog
          template={RESOURCE_TEMPLATES.find((t) => t.id === open.id)!}
          variant={open.variant}
          onVariant={(variant) => setOpen({ id: open.id, variant })}
          onClose={() => setOpen(null)}
          onPrint={print}
        />
      ) : null}
    </>
  );
}

function filesFor(template: ResourceTemplate) {
  return {
    blank: { name: templateFileName(template, "blank") },
    example: { name: templateFileName(template, "example") },
  };
}

function TemplateCard({
  template,
  onPrint,
  onOpen,
}: {
  readonly template: ResourceTemplate;
  readonly onPrint: (id: string, variant: SheetVariant) => void;
  readonly onOpen: (variant: SheetVariant) => void;
}) {
  const [variant, setVariant] = useState<SheetVariant>("example");
  const files = filesFor(template);
  const Sheet = TEMPLATE_SHEETS[template.id];
  const kind = template.editable === "xlsx" ? "Excel" : "Word";
  const Icon = template.editable === "xlsx" ? FileSpreadsheet : FileText;

  return (
    <article className="grid overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 p-5 sm:p-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
          <Icon aria-hidden="true" className="h-4 w-4" />
          PDF to print · {kind} to edit · HVAC example
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#0A0A0A] sm:text-2xl">{template.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-700">{template.description}</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          <span className="font-semibold text-stone-800">How to use it: </span>
          {template.howToUse}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(["blank", "example"] as const).map((v) => {
            const file = files[v];
            return (
              <div key={v} className="rounded-xl bg-stone-50 p-3.5 ring-1 ring-inset ring-stone-200">
                <p className="text-[13px] font-semibold text-stone-900">{v === "blank" ? "Blank template" : "Filled-in HVAC example"}</p>
                <p className="text-xs text-stone-500">{v === "blank" ? "Ready for your own numbers." : "Sample business and prices, to show a finished one."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ToolButton size="sm" variant={v === "blank" ? "primary" : "secondary"} icon={Printer} onClick={() => onPrint(template.id, v)}>
                    Print / PDF
                  </ToolButton>
                  {/* A plain anchor: a file download from a Route Handler, not a page. */}
                  <a
                    href={templateFilePath(file.name)}
                    download={file.name}
                    data-track={`tool-templates-${template.id}-${template.editable}-${v}`}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-[13px] font-semibold text-stone-800 hover:border-[#C2A05A] ${focusRing}`}
                  >
                    <Download aria-hidden="true" className="h-3.5 w-3.5" />
                    {kind} .{template.editable}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Opens in {template.editable === "xlsx" ? "Excel, Google Sheets or Numbers" : "Word, Google Docs or Pages"}. Prefer plain text?{" "}
          <a href={templateDownloadPath(template.id)} download={template.filename} className={`rounded font-medium text-[#77591B] hover:underline ${focusRing}`}>
            .{template.format} version
          </a>
          .
        </p>
        <AltairFeatureNote featureKey={template.featureKey} compact />
      </div>

      <div className="flex min-w-0 flex-col border-t border-stone-200 bg-stone-100/70 p-4 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between gap-2">
          <Segmented label={`${template.title} preview`} value={variant} options={VARIANTS} onChange={setVariant} />
          <button
            type="button"
            onClick={() => onOpen(variant)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-stone-700 hover:bg-white ${focusRing}`}
          >
            <Expand aria-hidden="true" className="h-3.5 w-3.5" /> Full page
          </button>
        </div>
        <button
          type="button"
          onClick={() => onOpen(variant)}
          aria-label={`Open the full ${variant === "example" ? "example" : "blank"} ${template.title}`}
          className={`relative mx-auto mt-3 block h-[400px] w-[310px] overflow-hidden sm:h-[440px] sm:w-[343px] rounded-md bg-white text-left shadow-[0_12px_30px_-12px_rgba(28,25,23,0.35)] ring-1 ring-stone-200 ${focusRing}`}
        >
          <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 block origin-top-left scale-[0.38] sm:scale-[0.42]">
            <Sheet variant={variant} />
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
        </button>
      </div>
    </article>
  );
}

function PreviewDialog({
  template,
  variant,
  onVariant,
  onClose,
  onPrint,
}: {
  readonly template: ResourceTemplate;
  readonly variant: SheetVariant;
  readonly onVariant: (variant: SheetVariant) => void;
  readonly onClose: () => void;
  readonly onPrint: (id: string, variant: SheetVariant) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const Sheet = TEMPLATE_SHEETS[template.id];
  const file = filesFor(template)[variant];

  // Opened once mounted. No close in a cleanup: closing fires onClose, and
  // removing the element from the page ends the modal state on its own.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={`${template.title} preview`}
      className="m-auto h-[92dvh] w-[min(900px,96vw)] max-w-none overflow-hidden rounded-2xl bg-stone-100 p-0 shadow-2xl backdrop:bg-black/60 print:hidden"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-stone-900">{template.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented label="Version" value={variant} options={VARIANTS} onChange={onVariant} />
            <ToolButton
              size="sm"
              variant="primary"
              icon={Printer}
              onClick={() => {
                ref.current?.close();
                onPrint(template.id, variant);
              }}
            >
              Print / PDF
            </ToolButton>
            <a
              href={templateFilePath(file.name)}
              download={file.name}
              data-track={`tool-templates-${template.id}-${template.editable}-${variant}`}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-[13px] font-semibold text-stone-800 hover:border-[#C2A05A] ${focusRing}`}
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" /> .{template.editable}
            </a>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close the preview"
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 ${focusRing}`}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
          <div className="mx-auto w-fit shadow-[0_12px_30px_-12px_rgba(28,25,23,0.35)] ring-1 ring-stone-200">
            <Sheet variant={variant} />
          </div>
        </div>
      </div>
    </dialog>
  );
}
