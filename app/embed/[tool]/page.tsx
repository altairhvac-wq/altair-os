import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbedFrame } from "@/shared/components/resources/embed/EmbedFrame";
import { EMBED_TOOLS, findEmbedTool } from "@/shared/lib/resources/embeds";
import { PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";

/**
 * /embed/<tool>: one calculator in its compact form, for another website's
 * <iframe>. Built once per tool; an unknown id is a 404. Not indexed: the
 * full tool is the page search engines should show, and it is the canonical.
 */

type PageProps = { params: Promise<{ tool: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return EMBED_TOOLS.map((tool) => ({ tool: tool.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tool: id } = await params;
  const tool = findEmbedTool(id);
  if (!tool) return {};
  return {
    title: { absolute: tool.title },
    description: tool.text,
    robots: { index: false, follow: true },
    alternates: { canonical: `${PUBLIC_SITE_ORIGIN}${tool.fullPath}` },
  };
}

export default async function EmbedPage({ params }: PageProps) {
  const { tool: id } = await params;
  const tool = findEmbedTool(id);
  if (!tool) notFound();
  return (
    <main>
      <h1 className="sr-only">{tool.title}</h1>
      <EmbedFrame id={tool.id} title={tool.title} fullUrl={`${PUBLIC_SITE_ORIGIN}${tool.fullPath}`} />
    </main>
  );
}
