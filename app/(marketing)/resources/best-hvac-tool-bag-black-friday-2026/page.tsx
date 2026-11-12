import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ResourceCard, ResourcePageShell, resourceLinkClass } from "@/shared/components/resources/ResourcePageShell";
import { ToolBagCompareTable, ToolBagRoundSection } from "@/shared/components/resources/ToolBagGuide";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { RESOURCES_BLACK_FRIDAY_TOOL_BAGS_PATH } from "@/shared/lib/resources/catalog";
import {
  TOOL_BAG_PRICES_AS_OF,
  TOOL_BAG_PRICES_LAST_CHECKED,
  TOOL_BAG_ROUNDS,
} from "@/shared/lib/resources/black-friday-tool-bags.generated";
import {
  TOOL_BAG_BOARD_SIZE,
  TOOL_BAG_OG_IMAGE,
  TOOL_BAG_PAGE_DESCRIPTION,
  TOOL_BAG_PAGE_TITLE,
  TOOL_BAG_TIERS,
  TOOL_BAG_VIDEO_EMBED_URL,
  TOOL_BAG_VIDEO_TITLE,
  TOOL_BAG_VIDEO_WATCH_URL,
  buildToolBagItemListStructuredData,
  buildToolBagVideoStructuredData,
  formatToolBagDate,
  formatToolBagMoney,
  roundAnchor,
  tierTotal,
} from "@/shared/lib/resources/black-friday-tool-bags";
import { buildResourceWebPageStructuredData } from "@/shared/lib/resources/structured-data";
import { YOUTUBE_CHANNELS } from "@/shared/lib/resources/youtube-feed";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

export const metadata: Metadata = {
  title: { absolute: TOOL_BAG_PAGE_TITLE },
  description: TOOL_BAG_PAGE_DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: RESOURCES_BLACK_FRIDAY_TOOL_BAGS_PATH,
    title: TOOL_BAG_PAGE_TITLE,
    description: TOOL_BAG_PAGE_DESCRIPTION,
    image: TOOL_BAG_OG_IMAGE,
  }),
};

const SCHOOL_CHANNEL = YOUTUBE_CHANNELS[0];

function PriceNote() {
  return (
    <p className="mt-6 rounded-xl border border-[#C2A05A]/40 bg-[#FBF7EF] px-4 py-3 text-sm leading-relaxed text-stone-800">
      <strong className="font-semibold">
        Prices as of {TOOL_BAG_PRICES_AS_OF} — check the store before you buy.
      </strong>{" "}
      Last checked{" "}
      <time dateTime={TOOL_BAG_PRICES_LAST_CHECKED}>
        {formatToolBagDate(TOOL_BAG_PRICES_LAST_CHECKED)}
      </time>{" "}
      for the items marked re-checked. Links go straight to each store&apos;s own page.
    </p>
  );
}

export default function BlackFridayToolBagsPage() {
  return (
    <ResourcePageShell
      eyebrow="HVAC tool guide"
      title={TOOL_BAG_PAGE_TITLE}
      width="wide"
      crumbs={[{ label: "Black Friday tool bags" }]}
      intro={
        <p>
          Three complete HVAC tool bags, built round by round: the top-tier bag, the best-deals
          bag, and the one I&apos;d actually buy. Every tool had to beat real options at its
          store price, and most of these are everyday prices, not Black Friday markdowns.
        </p>
      }
    >
      <JsonLdScript
        data={buildResourceWebPageStructuredData({
          name: TOOL_BAG_PAGE_TITLE,
          description: TOOL_BAG_PAGE_DESCRIPTION,
          path: RESOURCES_BLACK_FRIDAY_TOOL_BAGS_PATH,
        })}
      />
      <JsonLdScript data={buildToolBagVideoStructuredData()} />
      <JsonLdScript data={buildToolBagItemListStructuredData()} />

      <PriceNote />

      <section aria-label="Watch the video" className="mt-8">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-stone-900 shadow-sm">
          <iframe
            src={TOOL_BAG_VIDEO_EMBED_URL}
            title={TOOL_BAG_VIDEO_TITLE}
            className="absolute inset-0 size-full"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <p className="mt-3 text-sm text-stone-600">
          <a
            href={TOOL_BAG_VIDEO_WATCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={resourceLinkClass}
          >
            Watch on YouTube
          </a>
        </p>
      </section>

      <section aria-labelledby="the-three-bags" className="mt-12">
        <h2 id="the-three-bags" className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          The three bags
        </h2>
        <div className="mt-5 space-y-5">
          {TOOL_BAG_TIERS.map((tier, index) => (
            <ResourceCard key={tier.key} className="sm:px-5">
              <div className="grid items-center gap-5 md:grid-cols-[3fr_2fr]">
                <Image
                  src={tier.board}
                  alt={tier.boardAlt}
                  width={TOOL_BAG_BOARD_SIZE.width}
                  height={TOOL_BAG_BOARD_SIZE.height}
                  sizes="(min-width: 1024px) 580px, (min-width: 768px) 60vw, 100vw"
                  priority={index === 0}
                  className="h-auto w-full rounded-xl"
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">
                    {tier.label}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-[#0A0A0A]">
                    {tier.bag}
                  </h3>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-[#0A0A0A]">
                    {formatToolBagMoney(tierTotal(tier.key))}
                  </p>
                  <p className="text-xs text-stone-500">
                    Whole build, as of {TOOL_BAG_PRICES_AS_OF}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">{tier.summary}</p>
                </div>
              </div>
            </ResourceCard>
          ))}
        </div>
      </section>

      <section aria-labelledby="side-by-side" className="mt-12">
        <h2 id="side-by-side" className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Side by side
        </h2>
        <ToolBagCompareTable />
      </section>

      <nav aria-label="Jump to a round" className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          The full deal list, round by round
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {TOOL_BAG_ROUNDS.map((round) => (
            <li key={round.slot}>
              <a
                href={`#${roundAnchor(round.slot)}`}
                className="inline-flex min-h-10 items-center rounded-full border border-stone-300 bg-white px-3 text-stone-700 hover:border-[#C2A05A] hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
              >
                {round.slot}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {TOOL_BAG_ROUNDS.map((round, index) => (
        <ToolBagRoundSection key={round.slot} round={round} number={index + 1} />
      ))}

      <section
        aria-labelledby="subscribe"
        className="mt-14 rounded-2xl bg-[#0A0A0A] px-6 py-8 text-center sm:px-10"
      >
        <h2 id="subscribe" className="text-2xl font-semibold tracking-tight text-white">
          Learn what these tools are actually measuring
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-stone-300">
          Free HVAC School videos on {SCHOOL_CHANNEL.label}: how the equipment works, how it
          fails, and how to find the problem.
        </p>
        <a
          href={`${SCHOOL_CHANNEL.url}?sub_confirmation=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#C2A05A] px-6 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#D2B46E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Subscribe on YouTube
        </a>
      </section>

      <p className="mt-8 text-center text-sm text-stone-600">
        Running your own HVAC business? Altair Operating System is field service software for the
        office side of the same work.{" "}
        <Link href="/" className={resourceLinkClass}>
          Take a look at Altair
        </Link>
        .
      </p>
    </ResourcePageShell>
  );
}
