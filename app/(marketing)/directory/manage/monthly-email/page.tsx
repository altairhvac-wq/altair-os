import type { Metadata } from "next";
import Link from "next/link";
import { stopStatsEmailAction } from "@/app/actions/directory";
import { verifyStatsStopLink } from "@/lib/directory/links";
import { getListingRecord } from "@/lib/directory/listings";
import { dirCard, dirEyebrow, dirLink, dirPrimaryButton } from "@/shared/components/directory/directory-styles";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { DIRECTORY_MANAGE_PATH, DIRECTORY_PATH } from "@/shared/types/directory";

/**
 * Where the stop link in the monthly numbers email lands.
 *
 * Opening it changes nothing (mail scanners open links); the button does.
 * The link carries a signature for this one purpose, so it cannot edit or
 * remove the listing.
 */

export const metadata: Metadata = {
  title: "Monthly numbers email",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

export default async function MonthlyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const id = first(params.id);
  const token = first(params.s);
  const notice = first(params.notice);
  const valid = verifyStatsStopLink(id, token);
  const record = valid ? await getListingRecord(id) : null;

  return (
    <ResourceChrome>
      <ResourceMain>
        <p className={dirEyebrow}>Contractor directory</p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">Monthly numbers email</h1>
        <div className={`mt-7 px-5 py-6 sm:px-7 ${dirCard}`}>
          {!valid || !record || !token ? (
            <p role="status" className="text-sm leading-relaxed text-stone-700">
              That link is not complete or no longer works. You can turn the email off from your listing&apos;s manage page
              instead:{" "}
              <Link href={DIRECTORY_MANAGE_PATH} className={dirLink}>
                get your manage link
              </Link>
              .
            </p>
          ) : notice === "stopped" || record.statsEmailOptOut ? (
            <p role="status" className="text-sm leading-relaxed text-stone-700">
              Done. We will not email <span className="font-semibold">{record.fields.businessName}</span>&apos;s monthly
              numbers again. The listing itself is not affected, and the numbers stay on its manage page.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-stone-700">
                Stop the monthly email with the numbers for <span className="font-semibold">{record.fields.businessName}</span>?
                Your listing stays as it is.
              </p>
              {notice === "busy" ? (
                <p role="alert" className="mt-3 text-sm font-medium text-[#9a3412]">
                  That did not go through just now. Please try again in a minute.
                </p>
              ) : null}
              <form action={stopStatsEmailAction} className="mt-5">
                <input type="hidden" name="id" value={record.id} />
                <input type="hidden" name="s" value={token} />
                <button type="submit" className={dirPrimaryButton}>
                  Stop the monthly email
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-8 text-xs text-stone-500">
          <Link href={DIRECTORY_PATH} className={dirLink}>
            Back to the directory
          </Link>
        </p>
      </ResourceMain>
    </ResourceChrome>
  );
}
