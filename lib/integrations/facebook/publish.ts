import "server-only";

import { getAppBaseUrl } from "@/lib/email/env";
import { getFacebookOAuthConfig } from "./env";
import { graphBaseUrl, readFacebookJson } from "./graph";

export type FacebookPublishResult = {
  providerPostId: string;
  permalinkUrl?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchGraphPermalink(input: {
  objectId: string;
  accessToken: string;
}): Promise<string | undefined> {
  const config = getFacebookOAuthConfig();
  const url = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(input.objectId)}`,
  );
  url.searchParams.set("fields", "permalink_url");
  url.searchParams.set("access_token", input.accessToken);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await readFacebookJson<{ permalink_url?: string }>(
      response,
      "Graph permalink",
    );
    const permalink = data.permalink_url?.trim();
    return permalink || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolves a founder screenshot reference to a publicly fetchable https URL.
 * Meta's servers must be able to download the image (localhost will fail).
 */
export function resolveFounderScreenshotPublicUrl(
  reference: string,
): { url?: string; error?: string } {
  const trimmed = reference.trim();
  if (!trimmed) {
    return { error: "A founder screenshot reference is required." };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { error: "Screenshot URL must be http or https." };
      }
      return { url: trimmed };
    } catch {
      return { error: "Screenshot URL is not valid." };
    }
  }

  if (!trimmed.startsWith("/")) {
    return {
      error:
        "Screenshot reference must be a public URL or an absolute site path.",
    };
  }

  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    return {
      error:
        "App URL is not configured. Set NEXT_PUBLIC_APP_URL so Meta can fetch the screenshot.",
    };
  }

  return { url: `${baseUrl}${trimmed}` };
}

/** POST /{page-id}/feed — text (and optional link) Page post. */
export async function publishFacebookPageFeedPost(input: {
  pageId: string;
  accessToken: string;
  message: string;
  link?: string;
}): Promise<FacebookPublishResult> {
  const pageId = input.pageId.trim();
  const accessToken = input.accessToken.trim();
  const message = input.message.trim();

  if (!pageId) {
    throw new Error("Facebook Page id is required.");
  }
  if (!accessToken) {
    throw new Error("Facebook Page access token is required.");
  }
  if (!message) {
    throw new Error("Post text is required.");
  }

  const config = getFacebookOAuthConfig();
  const url = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(pageId)}/feed`,
  );

  const body = new URLSearchParams();
  body.set("message", message);
  body.set("access_token", accessToken);

  const link = input.link?.trim();
  if (link) {
    body.set("link", link);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await readFacebookJson<{ id?: string }>(
    response,
    "Facebook Page feed publish",
  );

  const providerPostId = data.id?.trim();
  if (!providerPostId) {
    throw new Error("Facebook did not return a post id.");
  }

  const permalinkUrl = await fetchGraphPermalink({
    objectId: providerPostId,
    accessToken,
  });

  return { providerPostId, permalinkUrl };
}

/** POST /{page-id}/photos — image Page post with caption. */
export async function publishFacebookPagePhotoPost(input: {
  pageId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<FacebookPublishResult> {
  const pageId = input.pageId.trim();
  const accessToken = input.accessToken.trim();
  const imageUrl = input.imageUrl.trim();
  const caption = input.caption.trim();

  if (!pageId) {
    throw new Error("Facebook Page id is required.");
  }
  if (!accessToken) {
    throw new Error("Facebook Page access token is required.");
  }
  if (!imageUrl) {
    throw new Error("Image URL is required for a Facebook photo post.");
  }

  const config = getFacebookOAuthConfig();
  const url = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(pageId)}/photos`,
  );

  const body = new URLSearchParams();
  body.set("url", imageUrl);
  body.set("access_token", accessToken);
  if (caption) {
    body.set("caption", caption);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await readFacebookJson<{ id?: string; post_id?: string }>(
    response,
    "Facebook Page photo publish",
  );

  const providerPostId =
    data.post_id?.trim() || data.id?.trim() || undefined;

  if (!providerPostId) {
    throw new Error("Facebook did not return a photo post id.");
  }

  const permalinkUrl = await fetchGraphPermalink({
    objectId: providerPostId,
    accessToken,
  });

  return { providerPostId, permalinkUrl };
}

async function waitForInstagramContainerReady(input: {
  creationId: string;
  accessToken: string;
}): Promise<void> {
  const config = getFacebookOAuthConfig();
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const url = new URL(
      `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(input.creationId)}`,
    );
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", input.accessToken);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data = await readFacebookJson<{
      status_code?: string;
      status?: string;
    }>(response, "Instagram media container status");

    const statusCode = data.status_code?.trim().toUpperCase();

    if (statusCode === "FINISHED") {
      return;
    }

    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new Error(
        data.status?.trim() ||
          `Instagram media container failed (${statusCode}).`,
      );
    }

    await sleep(1500);
  }

  throw new Error(
    "Instagram media container was not ready in time. Try again in a moment.",
  );
}

/**
 * Instagram Content Publishing API (two-step):
 * 1) POST /{ig-user-id}/media
 * 2) POST /{ig-user-id}/media_publish
 */
export async function publishInstagramImagePost(input: {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<FacebookPublishResult> {
  const igUserId = input.igUserId.trim();
  const accessToken = input.accessToken.trim();
  const imageUrl = input.imageUrl.trim();
  const caption = input.caption.trim();

  if (!igUserId) {
    throw new Error("Instagram Business account id is required.");
  }
  if (!accessToken) {
    throw new Error("Page access token is required for Instagram publish.");
  }
  if (!imageUrl) {
    throw new Error("Image URL is required for Instagram posts.");
  }

  const config = getFacebookOAuthConfig();

  const createUrl = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(igUserId)}/media`,
  );
  const createBody = new URLSearchParams();
  createBody.set("image_url", imageUrl);
  createBody.set("access_token", accessToken);
  if (caption) {
    createBody.set("caption", caption);
  }

  const createResponse = await fetch(createUrl.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: createBody,
    cache: "no-store",
  });

  const createData = await readFacebookJson<{ id?: string }>(
    createResponse,
    "Instagram media container create",
  );

  const creationId = createData.id?.trim();
  if (!creationId) {
    throw new Error("Instagram did not return a media container id.");
  }

  await waitForInstagramContainerReady({
    creationId,
    accessToken,
  });

  const publishUrl = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(igUserId)}/media_publish`,
  );
  const publishBody = new URLSearchParams();
  publishBody.set("creation_id", creationId);
  publishBody.set("access_token", accessToken);

  const publishResponse = await fetch(publishUrl.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: publishBody,
    cache: "no-store",
  });

  const publishData = await readFacebookJson<{ id?: string }>(
    publishResponse,
    "Instagram media publish",
  );

  const providerPostId = publishData.id?.trim();
  if (!providerPostId) {
    throw new Error("Instagram did not return a published media id.");
  }

  const permalinkUrl = await fetchGraphPermalink({
    objectId: providerPostId,
    accessToken,
  });

  return { providerPostId, permalinkUrl };
}
