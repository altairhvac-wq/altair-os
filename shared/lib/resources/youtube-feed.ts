/**
 * YouTube channel RSS, parsed without an XML library.
 *
 * ============ WHY NO XML PARSER ============
 * The public feed at `youtube.com/feeds/videos.xml?channel_id=...` is a
 * small, regular Atom document: one `<entry>` per video with `<yt:videoId>`,
 * `<title>` and `<published>`. A full XML dependency for three fields is
 * not worth its surface, and a DOM parser is not available on the server.
 * The parser below is deliberately narrow: it extracts those fields, decodes
 * the five XML entities plus numeric references, and ignores everything
 * else. A malformed feed yields fewer items, never an exception.
 *
 * Nothing extracted here is ever rendered as HTML. Titles are text nodes in
 * React; the video id is validated against YouTube's id alphabet before it
 * is put into a URL, so a hostile feed cannot smuggle a path or a scheme.
 *
 * Pure (no imports): loaded directly by the verifier with a sample feed.
 */

export type YouTubeChannelKey = "hvac-exploration" | "operating-system";

export type YouTubeChannel = {
  key: YouTubeChannelKey;
  /** Label shown on every item from this channel. */
  label: string;
  channelId: string;
  /** Public channel page, for the "see all" link. */
  url: string;
};

export const YOUTUBE_CHANNELS: readonly YouTubeChannel[] = [
  {
    key: "hvac-exploration",
    label: "Altair HVAC Exploration",
    channelId: "UCdSTEVXGmwaFg2lm8wHmBtg",
    url: "https://www.youtube.com/channel/UCdSTEVXGmwaFg2lm8wHmBtg",
  },
  {
    key: "operating-system",
    label: "Altair Operating System",
    channelId: "UCXdZpFi6MNVU1w4kSs1Tcww",
    url: "https://www.youtube.com/channel/UCXdZpFi6MNVU1w4kSs1Tcww",
  },
];

export function youtubeFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}

export type YouTubeVideo = {
  videoId: string;
  title: string;
  /** ISO 8601 as published by the feed; empty when absent or unparseable. */
  publishedAt: string;
  url: string;
  channelKey: YouTubeChannelKey;
  channelLabel: string;
};

/** YouTube video ids are 11 characters from this alphabet. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

export function decodeXmlText(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole, body: string) => {
      if (body[0] === "#") {
        const code =
          body[1] === "x" || body[1] === "X"
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
        if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
        try {
          return String.fromCodePoint(code);
        } catch {
          return "";
        }
      }
      return NAMED_ENTITIES[body] ?? whole;
    })
    .trim();
}

function firstTag(block: string, tag: string): string | null {
  // Tag names here are fixed literals from this file, never input.
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(block);
  return match ? match[1] : null;
}

/**
 * Parse one channel's feed. Entries missing a valid id or a title are
 * dropped; order is the feed's own (newest first). Bounded so a huge or
 * hostile response cannot balloon the page.
 */
export function parseYouTubeFeed(
  xml: string,
  channel: YouTubeChannel,
  maxItems = 50,
): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  for (const entry of entries) {
    if (videos.length >= maxItems) break;
    const rawId = firstTag(entry, "yt:videoId");
    const rawTitle = firstTag(entry, "title");
    if (rawId === null || rawTitle === null) continue;

    const videoId = decodeXmlText(rawId);
    const title = decodeXmlText(rawTitle);
    if (!VIDEO_ID.test(videoId) || title.length === 0) continue;

    const rawPublished = firstTag(entry, "published");
    const publishedAt = rawPublished ? decodeXmlText(rawPublished) : "";

    videos.push({
      videoId,
      title: title.slice(0, 300),
      publishedAt: Number.isNaN(Date.parse(publishedAt)) ? "" : publishedAt,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      channelKey: channel.key,
      channelLabel: channel.label,
    });
  }

  return videos;
}
