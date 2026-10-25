import {
  RESOURCE_TEMPLATES,
  TEMPLATE_CONTENT_TYPES,
  findResourceTemplate,
} from "@/shared/lib/resources/templates";

/**
 * Download one Resource Center template.
 *
 * Public and unauthenticated by design: the body is a constant from
 * `shared/lib/resources/templates.ts`, rendered to text. The only input is
 * the `id` segment, and it is used solely as a lookup key into that fixed
 * list — it never reaches a filename, a header or a filesystem path. Unknown
 * ids 404. The filename in Content-Disposition comes from the constant.
 *
 * Prerendered at build time for every known id (no request data is read),
 * and any other id is not served (`dynamicParams = false`).
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return RESOURCE_TEMPLATES.map((template) => ({ id: template.id }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const template = findResourceTemplate(id);
  if (!template) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // A UTF-8 byte-order mark makes Excel open the CSV as UTF-8, so any
  // non-ASCII text survives. Markdown does not need one.
  const body = template.format === "csv" ? `﻿${template.render()}` : template.render();

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": TEMPLATE_CONTENT_TYPES[template.format],
      "Content-Disposition": `attachment; filename="${template.filename}"`,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
