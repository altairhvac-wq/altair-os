import { ToolPageShell } from "@/shared/components/resources/tools/ToolGuide";

/**
 * Shared frame for the calculators: the public nav and footer (both hidden
 * when a calculator is printed) around a full-width stage. Each calculator
 * page renders `CalculatorFrame`, which supplies the hero, the tool and the
 * guide; the index page sets its own content column.
 */
export default function ResourceCalculatorsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ToolPageShell>{children}</ToolPageShell>;
}
