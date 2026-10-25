import {
  ResourceChrome,
  ResourceMain,
} from "@/shared/components/resources/ResourcePageShell";

/**
 * Shared frame for the Resource Center calculators: public nav, footer and
 * the wide content column. Each calculator page renders `CalculatorFrame`
 * inside it, which supplies the header, how-to, formula, assumptions,
 * disclaimer and the Altair note.
 */
export default function ResourceCalculatorsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ResourceChrome>
      <ResourceMain width="wide">{children}</ResourceMain>
    </ResourceChrome>
  );
}
