import { redirect } from "next/navigation";

type NetworkPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /network route — redirects to /community, preserving query params. */
export default async function NetworkPage({ searchParams }: NetworkPageProps) {
  const params = await searchParams;
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const flat = Array.isArray(value) ? value[0] : value;
    if (flat != null && flat !== "") {
      search.set(key, flat);
    }
  }

  const query = search.toString();
  redirect(query ? `/community?${query}` : "/community");
}
