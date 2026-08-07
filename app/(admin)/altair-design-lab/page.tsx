import { notFound } from "next/navigation";

/**
 * Internal component style-guide page — disabled for launch.
 *
 * The previous content had a pre-existing crash (a `<Field>` usage that
 * violates Field.tsx's exactly-one-element-child contract, throwing
 * "Cannot read properties of undefined (reading 'id')"), and the page is
 * not part of the customer product. Rather than ship a URL that crashes,
 * it 404s until the Field usages are fixed — the full style guide is
 * preserved in git history (app/(admin)/altair-design-lab/page.tsx).
 *
 * The real founder theming tool is unaffected: /platform/design-lab.
 */
export default function AltairDesignLabPage() {
  notFound();
}
