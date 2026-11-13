import type { Metadata } from "next";
import Link from "next/link";
import { submitListingAction } from "@/app/actions/directory";
import { ListingForm } from "@/shared/components/directory/ListingForm";
import { dirEyebrow, dirLink } from "@/shared/components/directory/directory-styles";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { DIRECTORY_LIST_PATH, DIRECTORY_MANAGE_PATH, DIRECTORY_PATH } from "@/shared/types/directory";

const TITLE = "List your business free";
const DESCRIPTION =
  "Add your HVAC, plumbing, electrical or other trade business to the contractor directory. Free, no account, about two minutes. A person checks each listing before it shows.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: DIRECTORY_LIST_PATH, title: TITLE, description: DESCRIPTION }),
};

const STEPS: readonly string[] = [
  "Fill in the form below.",
  "Press the link we email you, so we know the address is yours.",
  "A person checks the listing. It goes live once it is approved, usually within one business day.",
];

/** The one form a contractor fills in to be in the directory. No account is created. */
export default function DirectoryListPage() {
  return (
    <ResourceChrome>
      <ResourceMain>
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-stone-500">
          <Link href={DIRECTORY_PATH} className="inline-flex min-h-8 items-center rounded-sm hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40">
            Directory
          </Link>
        </nav>
        <header>
          <p className={dirEyebrow}>Contractor directory</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">
            List your business free.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
            Other contractors search here for subs and partners. No account, no password, no cost.
          </p>
        </header>

        <ol className="mt-7 grid gap-3 text-sm text-stone-700 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] font-mono text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8">
          <ListingForm action={submitListingAction} mode="create" submitLabel="Send my listing" />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-stone-500">
          Already listed?{" "}
          <Link href={DIRECTORY_MANAGE_PATH} className={dirLink}>
            Edit or remove your listing
          </Link>
          . How we handle your details is in the{" "}
          <Link href="/privacy" className={dirLink}>
            privacy policy
          </Link>
          .
        </p>
      </ResourceMain>
    </ResourceChrome>
  );
}
