import type { Metadata } from "next";
import { listPublishedSitePages } from "@/lib/database/queries/marketing-site-pages";
import { listChannelVideos } from "@/lib/resources/youtube-library";
import {
  LibrarySearch,
  type LibraryItem,
} from "@/shared/components/resources/LibrarySearch";
import {
  ResourcePageShell,
  resourceLinkClass,
} from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { RESOURCES_LIBRARY_PATH } from "@/shared/lib/resources/catalog";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import { YOUTUBE_CHANNELS } from "@/shared/lib/resources/youtube-feed";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { SITE_PAGE_PATH_PREFIX } from "@/shared/types/site-page";

const TITLE = "Videos and articles";
const DESCRIPTION =
  "Guides and videos on running an HVAC business, and lessons on how the equipment works, from Altair Insights and the two Altair YouTube channels. Search them in one place.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: RESOURCES_LIBRARY_PATH,
    title: TITLE,
    description: DESCRIPTION,
  }),
};

export default async function ResourceLibraryPage() {
  const [pages, channels] = await Promise.all([listPublishedSitePages(), listChannelVideos()]);

  const articles: LibraryItem[] = pages.map((page) => ({
    id: `article:${page.id}`,
    kind: "article",
    audience: "business",
    title: page.title,
    summary: page.metaDescription ?? "",
    source: "Insights",
    href: `${SITE_PAGE_PATH_PREFIX}/${page.slug}`,
    external: false,
    date: page.publishedAt ?? "",
  }));

  const videos: LibraryItem[] = channels.flatMap((channel) =>
    channel.videos.map((video) => ({
      id: `video:${video.videoId}`,
      kind: "video" as const,
      // The software channel is about running the shop; the school channel teaches the equipment.
      audience: video.channelKey === "operating-system" ? ("business" as const) : ("equipment" as const),
      title: video.title,
      summary: "",
      source: video.channelLabel,
      href: video.url,
      external: true,
      date: video.publishedAt,
    })),
  );

  // Newest first across both sources; undated items last.
  const items = [...articles, ...videos].sort((a, b) => {
    const ta = Date.parse(a.date) || 0;
    const tb = Date.parse(b.date) || 0;
    return tb - ta;
  });

  const unavailable = YOUTUBE_CHANNELS.filter((channel) =>
    channels.some((result) => result.channelKey === channel.key && !result.ok),
  );

  return (
    <ResourcePageShell
      eyebrow="Library"
      title={TITLE}
      crumbs={[{ label: "Videos and articles" }]}
      intro={
        <p>
          Two shelves: guides and videos on running the business, and lessons on how the equipment works. Search either one.
          Videos open on YouTube.
        </p>
      }
    >
      <JsonLdScript
        data={buildResourceCollectionStructuredData({
          name: TITLE,
          description: DESCRIPTION,
          path: RESOURCES_LIBRARY_PATH,
          parts: articles.map((article) => ({ name: article.title, path: article.href })),
        })}
      />

      {unavailable.length > 0 ? (
        <p className="mt-8 rounded-xl border border-stone-300/70 bg-stone-100/70 px-5 py-3 text-sm text-stone-700">
          Videos from {unavailable.map((channel) => channel.label).join(" and ")} could not be
          loaded right now. You can browse{" "}
          {unavailable.map((channel, index) => (
            <span key={channel.key}>
              {index > 0 ? " or " : null}
              <a
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                className={resourceLinkClass}
              >
                {channel.label} on YouTube
              </a>
            </span>
          ))}
          .
        </p>
      ) : null}

      <LibrarySearch items={items} />

      <p className="mt-10 text-sm text-stone-600">
        Channels:{" "}
        {YOUTUBE_CHANNELS.map((channel, index) => (
          <span key={channel.key}>
            {index > 0 ? " · " : null}
            <a href={channel.url} target="_blank" rel="noopener noreferrer" className={resourceLinkClass}>
              {channel.label}
            </a>
          </span>
        ))}
      </p>
    </ResourcePageShell>
  );
}
