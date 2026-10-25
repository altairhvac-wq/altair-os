import "server-only";

import {
  YOUTUBE_CHANNELS,
  parseYouTubeFeed,
  youtubeFeedUrl,
  type YouTubeChannelKey,
  type YouTubeVideo,
} from "@/shared/lib/resources/youtube-feed";

/**
 * Public videos from both Altair YouTube channels, for /resources/library.
 *
 * Read from each channel's public RSS feed: no API key, no OAuth, nothing
 * from the marketing integrations. Cached for an hour by Next's fetch cache.
 * Each channel fails independently and quietly: a timeout, a non-200, or an
 * unparseable body yields an empty list for that channel and a flag the page
 * uses for its empty state. The error is logged by channel key and status
 * only, never with the body.
 */

const FEED_TIMEOUT_MS = 5000;
/** A channel feed is ~15 entries and well under 100 KB; refuse anything huge. */
const MAX_FEED_BYTES = 1_000_000;

export type ChannelFeedResult = {
  channelKey: YouTubeChannelKey;
  ok: boolean;
  videos: YouTubeVideo[];
};

async function fetchChannel(channel: (typeof YOUTUBE_CHANNELS)[number]): Promise<ChannelFeedResult> {
  try {
    const response = await fetch(youtubeFeedUrl(channel.channelId), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      headers: { Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8" },
    });
    if (!response.ok) {
      console.error("[resources/library] feed unavailable:", {
        channel: channel.key,
        status: response.status,
      });
      return { channelKey: channel.key, ok: false, videos: [] };
    }
    const xml = await response.text();
    if (xml.length > MAX_FEED_BYTES) {
      console.error("[resources/library] feed too large:", { channel: channel.key });
      return { channelKey: channel.key, ok: false, videos: [] };
    }
    return { channelKey: channel.key, ok: true, videos: parseYouTubeFeed(xml, channel) };
  } catch (error) {
    console.error("[resources/library] feed fetch failed:", {
      channel: channel.key,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return { channelKey: channel.key, ok: false, videos: [] };
  }
}

export async function listChannelVideos(): Promise<ChannelFeedResult[]> {
  return Promise.all(YOUTUBE_CHANNELS.map(fetchChannel));
}
