"use client";

import { Check } from "lucide-react";
import { NumberInput, SampleTag } from "@/shared/components/resources/tools/ToolControls";
import { NoResult, ResultHero } from "@/shared/components/resources/calc/CalculatorTool";
import { CompactCalculator, CompactStat } from "@/shared/components/resources/calc/CompactCalculator";
import { num } from "@/shared/components/resources/calc/useCalculatorTool";
import { INVOICE_BUILDER_PATH } from "@/shared/lib/resources/tool-hub";
import { useArticleTool } from "@/shared/components/site/article/useArticleTool";

/**
 * The days-to-invoice check built into /insights/job-completion-to-invoice-gap.
 *
 * It is the article's own exercise: five recent jobs, the days from "done" to
 * "invoice sent" for each, and whether your records answer the four
 * questions (what was done, the parts, the time, anything added). It shows
 * the MEDIAN, which the article says to track, beside the average, so one
 * slow job's pull on the average is visible. It opens with made-up sample
 * days, labelled as such.
 */

type Job = { readonly days: string; readonly documented: boolean };
type Values = readonly Job[];

const SAMPLE: Values = [
  { days: "0", documented: true },
  { days: "1", documented: true },
  { days: "2", documented: false },
  { days: "3", documented: true },
  { days: "14", documented: false },
];
const BLANK: Values = SAMPLE.map(() => ({ days: "", documented: false }));

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const daysText = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} day${rounded === 1 ? "" : "s"}`;
};

export function InvoiceLagTool() {
  const tool = useArticleTool<Values>("invoice-lag", SAMPLE);
  const jobs = tool.values;
  const isSample = jobs.every((job, index) => job.days === SAMPLE[index].days && job.documented === SAMPLE[index].documented);
  const update = (index: number, next: Partial<Job>) => {
    tool.markInteracted();
    tool.setValues((current) => current.map((job, i) => (i === index ? { ...job, ...next } : job)));
  };

  const entered = jobs.filter((job) => job.days.trim() !== "" && num(job.days) >= 0);
  const days = entered.map((job) => num(job.days));
  const mid = median(days);
  const average = days.length > 0 ? days.reduce((sum, value) => sum + value, 0) / days.length : null;
  const slowest = days.length > 0 ? Math.max(...days) : null;
  const documented = jobs.filter((job) => job.documented).length;

  return (
    <CompactCalculator
      name="Days-to-Invoice Check"
      text={
        <>
          Five jobs finished last month: the days from done to invoice sent, and whether your records alone answer what was done, the
          parts, the time and anything added. {isSample ? <SampleTag>made-up sample</SampleTag> : null}
        </>
      }
      tool={tool}
      onReset={() => {
        tool.markInteracted();
        tool.setValues(isSample ? BLANK : SAMPLE);
        tool.toast.show(isSample ? "Cleared. Enter five of your own jobs." : "Sample loaded.");
      }}
      inputs={
        <div className="sm:col-span-2">
          <table className="w-full text-sm">
            <caption className="sr-only">Five recent jobs</caption>
            <thead className="text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th scope="col" className="pb-2 text-left font-semibold">Job</th>
                <th scope="col" className="pb-2 text-left font-semibold">Days to invoice</th>
                <th scope="col" className="pb-2 text-left font-semibold">Records answer all four</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {jobs.map((job, index) => (
                <tr key={index}>
                  <th scope="row" className="py-2 pr-3 text-left font-medium text-stone-700">
                    {index + 1}
                  </th>
                  <td className="py-2 pr-3">
                    <div className="max-w-[9rem]">
                      <NumberInput
                        compact
                        value={job.days}
                        onChange={(value) => update(index, { days: value.replace(/-/g, "") })}
                        suffix="days"
                        ariaLabel={`Job ${index + 1}: days from done to invoice sent`}
                        placeholder="0"
                      />
                    </div>
                  </td>
                  <td className="py-2">
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={job.documented}
                        onChange={(event) => update(index, { documented: event.target.checked })}
                        aria-label={`Job ${index + 1}: records answer all four questions`}
                      />
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 items-center justify-center rounded-md border peer-focus-visible:ring-2 peer-focus-visible:ring-[#c2a05a]/55 ${
                          job.documented ? "border-[#A4823A] bg-[#A4823A] text-[#080907]" : "border-stone-300 bg-white"
                        }`}
                      >
                        {job.documented ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="text-[13px] text-stone-600">{job.documented ? "Yes" : "No"}</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      results={
        mid !== null && average !== null && slowest !== null ? (
          <>
            <ResultHero
              label="Median days to invoice"
              value={daysText(mid).replace(/ days?$/, "")}
              unit={mid === 1 ? "day" : "days"}
              note={<>What normally happens, across {entered.length} job{entered.length === 1 ? "" : "s"}.</>}
            />
            <dl className="space-y-2 rounded-xl border border-stone-200 bg-white p-3.5">
              <CompactStat label="Average" value={daysText(average)} note={average - mid >= 1 ? "pulled up by the slowest job" : "close to the median"} />
              <CompactStat label="Slowest job" value={daysText(slowest)} />
              <CompactStat
                label="Fully documented"
                value={`${documented} of ${jobs.length}`}
                tone={documented === jobs.length ? "positive" : documented === 0 ? "negative" : "warning"}
                note={documented === jobs.length ? "the gap is not in the records" : "where the gap forms"}
              />
            </dl>
          </>
        ) : (
          <NoResult title="No jobs yet" text="Enter the days to invoice for at least one finished job." />
        )
      }
      fullHref={INVOICE_BUILDER_PATH}
      fullLabel="Open the free Invoice Builder"
      fullTrack="next-tool-invoice-builder-lag"
      footnote="Measure it for a month before changing anything, so you improve against your own number."
    />
  );
}
