"use client";

import {
  CalculatorLayout,
  NumberField,
  ResultsPanel,
  useCalculatorFields,
  type FieldSpec,
} from "@/shared/components/resources/CalculatorFields";
import {
  summarizeCalculator,
  type CalculatorSlug,
} from "@/shared/lib/resources/calculator-summaries";

/**
 * A calculator whose result comes from `summarizeCalculator`.
 *
 * The three newer calculators (maintenance agreement, technician pay, callback
 * cost) are a list of fields and a result; this is the one component behind
 * all of them. The same summary function writes the "email me my results"
 * message, so what the page shows and what the email says are the same lines
 * computed by the same code.
 */
export function SummaryCalculator<K extends string>({
  slug,
  fields,
  defaults,
  invalidMessage,
}: {
  readonly slug: CalculatorSlug;
  readonly fields: readonly FieldSpec<K>[];
  readonly defaults: Record<K, string>;
  readonly invalidMessage: string;
}) {
  const { values, setField, reset, restored, shareUrl } = useCalculatorFields<K>(defaults, slug);
  const summary = summarizeCalculator(slug, values);

  return (
    <CalculatorLayout
      onReset={reset}
      shareUrl={shareUrl}
      restored={restored}
      emailResults={{ slug, values }}
      fields={fields.map((spec) => (
        <NumberField key={spec.key} spec={spec} value={values[spec.key]} onChange={setField} />
      ))}
      results={
        <ResultsPanel
          headlineLabel={summary?.headlineLabel ?? "Result"}
          headlineValue={summary ? summary.headlineValue : null}
          headlineNote={summary?.headlineNote}
          invalidMessage={invalidMessage}
          lines={summary?.lines ?? []}
        />
      }
    />
  );
}
