import { TEMPLATE_FILES, findTemplateFile } from "@/shared/lib/resources/template-files";

/**
 * Download one editable template file (.xlsx or .docx), blank or as the
 * filled-in HVAC example.
 *
 * Public and unauthenticated by design: the bytes are built from the fixed
 * content in shared/lib/resources/templates.ts. The only input is the `file`
 * segment, used solely as a lookup key into TEMPLATE_FILES; it never reaches
 * a filesystem path or a header. Every file is prerendered at build time and
 * any other name is not served (`dynamicParams = false`).
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return TEMPLATE_FILES.map((file) => ({ file: file.name }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file: name } = await params;
  const file = findTemplateFile(name);
  if (!file) {
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const bytes = file.build();
  return new Response(bytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
