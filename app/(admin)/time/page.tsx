import { redirect } from "next/navigation";

type TimePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /time route — redirects to /payroll, preserving query params. */
export default async function TimePage({ searchParams }: TimePageProps) {
  const params = await searchParams;
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const flat = Array.isArray(value) ? value[0] : value;
    if (flat != null && flat !== "") {
      search.set(key, flat);
    }
  }

  const query = search.toString();
  redirect(query ? `/payroll?${query}` : "/payroll");
}
