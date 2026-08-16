# Reel publishing — operator guide

How a rendered MP4 becomes a Facebook Page Reel or an Instagram Reel, what
must be true before it can, and the exact steps for a first controlled live
test.

Companion to `marketing-screenshot-capture-guide.md`, which covers the image
publishing path. Nothing here changes that path.

---

## What this is

The media bridge (migration 144) puts a rendered vertical MP4 in a private
Supabase bucket and records a stable reference to it. This milestone connects
that reference to Meta's two Reel publishing APIs.

The shape of it:

```
marketing_posts.video_media_asset_id ──► marketing_media_assets  (migration 145)
        │                                        │
        │  publish click                         │  15-minute signed URL,
        ▼                                        ▼  minted at publish time
  claim delivery row ──► Meta fetches the video ──► publish ──► settle delivery
```

Three properties are worth stating plainly because each one is load-bearing:

- **A Reel is its own marketing post.** Migration 143's duplicate guard is
  `unique (company_id, marketing_post_id, provider)`. A Reel sharing a post
  with a text publish could never claim its own delivery row. Give a Reel its
  own post.
- **No URL is ever stored.** The post names an asset by id. A signed URL is
  minted immediately before the Meta call, handed to Meta, and dropped. It is
  not written to the post, the delivery row, or a log.
- **The same-company rule is a foreign key.** `(video_media_asset_id,
  company_id)` references `marketing_media_assets (id, company_id)`. A post
  cannot name another company's video by any path, including a service-role
  script or a manual SQL fix. Proven by `scripts/proof-reel-tenancy.sql`.

---

## Prerequisites

### Permissions — nothing new is required

The Reel flows use exactly the scopes the existing image publishing already
requests in `lib/integrations/facebook/oauth-url.ts`:

| Scope | Needed for |
|---|---|
| `pages_show_list` | listing the Pages the user manages |
| `pages_read_engagement` | reading Page metadata and the linked IG account |
| `pages_manage_posts` | **Facebook Reel** publish |
| `instagram_basic` | resolving the linked Instagram Professional account |
| `instagram_content_publish` | **Instagram Reel** publish |
| `business_management` | Portfolio-owned Pages (they surface on `/me/assigned_pages`) |

**If Facebook is already connected in Marketing Hub, no reconnect is needed.**

Two things that are *not* scopes and still have to be true:

- The Page access token must belong to a user with the **`CREATE_CONTENT`**
  task on the Page. Page role, not an OAuth scope.
- The Instagram account must be a **Professional (Business or Creator)**
  account **linked to the selected Facebook Page**. A personal Instagram
  account cannot publish through the API at all.

### Configuration

| Variable | Value | Notes |
|---|---|---|
| `FACEBOOK_APP_ID` | already set | |
| `FACEBOOK_APP_SECRET` | already set | |
| `FACEBOOK_GRAPH_API_VERSION` | unset (defaults to `v22.0`) | Optional. One value for every Meta call including the upload host. |
| `INTEGRATIONS_ENCRYPTION_KEY` | already set | Page tokens at rest |
| `SUPABASE_SERVICE_ROLE_KEY` | already set | minting the media read grant |

No new environment variable is introduced by this milestone.

### Migration

Apply `supabase/migrations/145_marketing_reel_publishing.sql`. It adds two
nullable columns and one foreign key; it creates no table, drops nothing,
grants nothing, and is safe to run twice.

### The video itself

Meta's Reel specification, enforced as a local pre-flight where the render
reported its own shape:

| | |
|---|---|
| Container | `.mp4` |
| Aspect ratio | 9:16 |
| Resolution | 1080×1920 recommended, 540×960 minimum |
| Duration | 3–90 seconds |
| Video codec | H.264 (H.265, VP9, AV1 also accepted) |
| Audio codec | AAC-LC, 48 kHz, stereo, 128 kbps+ |

The pre-flight is **not** an authority — the editor's reported dimensions are
not verified against the bytes, unlike content type and size. When the render
reported no shape, the UI says so and lets Meta decide.

---

## The Facebook Reel flow

Four phases. **Nothing is public until phase 4.**

1. `POST /{page-id}/video_reels` with `upload_phase=start`
   → returns `video_id` and `upload_url`
2. `POST https://rupload.facebook.com/video-upload/{version}/{video_id}`
   with headers `Authorization: OAuth {page_token}` and
   `file_url: {signed media URL}` — Meta fetches the bytes itself
3. `GET /{video_id}?fields=status` until `uploading_phase.status` is
   `complete` (bounded: 30 attempts, 5 s apart, 150 s total)
4. `POST /{page-id}/video_reels` with `video_id`, `upload_phase=finish`,
   `video_state=PUBLISHED`, `description`

The `upload_url` returned in phase 1 is used **only if its host is exactly
`rupload.facebook.com` over https**; otherwise the URL is reconstructed. The
phase-2 request carries a live Page token, and following an arbitrary URL out
of a response body with a credential attached is a token-exfiltration shape.

Rate limit: **30 API-published Reels per rolling 24 hours.**

## The Instagram Reel flow

Three phases. **Nothing is public until phase 3.**

1. `POST /{ig-user-id}/media` with `media_type=REELS`, `video_url={signed
   media URL}`, `caption`, `share_to_feed=true` → returns a container id
2. `GET /{container-id}?fields=status_code` until `FINISHED` (same 150 s
   bound). `ERROR` and `EXPIRED` are terminal. `PUBLISHED` is refused rather
   than re-published — that would be the duplicate.
3. `POST /{ig-user-id}/media_publish` with `creation_id`

There is **no byte-upload option** for Instagram. Meta must fetch the URL,
which is the entire reason the media bridge exists.

Rate limit: **100 API-published posts per rolling 24 hours.**

## Why the poll is bounded at 150 seconds

`DELIVERY_IN_FLIGHT_GRACE_MS` is five minutes. A claim held longer than that
reads as abandoned to the next attempt, so a publish that was merely slow
would surface to the operator as `NEEDS_RECONCILIATION` — the "it may or may
not have gone out" state — while it was still perfectly alive. 150 seconds
leaves 150 seconds of headroom for the rest of the flow.

A timeout settles the delivery `failed` and permits a retry. That is safe on
both surfaces precisely because nothing is published until the last phase.

---

## Controlled first live test — Facebook Reel

**Before you start:** this publishes a real, public Reel to the Altair
Facebook Page. There is no draft mode for Facebook Reels. Do this when you are
willing for the result to be visible.

1. Confirm the media bridge holds a vertical render.

   ```sql
   select id, source_job_id, width_px, height_px, duration_ms, upload_state
     from public.marketing_media_assets
    where company_id = '<your company id>'
      and upload_state = 'stored'
    order by stored_at desc;
   ```

   You need one row with `width_px` < `height_px`. If `width_px` and
   `height_px` are null, the render did not report its shape — the publish is
   still allowed, and Meta will arbitrate.

2. Apply migration 145 in the Supabase SQL editor, then confirm:

   ```sql
   select column_name from information_schema.columns
    where table_name = 'marketing_posts' and column_name = 'video_media_asset_id';
   select conname from pg_constraint
    where conname = 'marketing_posts_video_media_asset_fkey';
   ```

   Both must return one row.

3. Deploy, then open **Marketing → Marketing Hub**.

4. Create a **new** founder draft (`Founder milestone` or `Product update`).
   Do not reuse an existing post — a Reel needs its own delivery row.

5. Write the caption in **Post text**. This becomes the Reel description.

6. In **Rendered video**, select the render from step 1. The label shows its
   shape and length, or says "shape not reported".

7. **Save the draft.** The publish reads the last saved version.

8. Reopen the draft. The publish panel now reads **Publish Reel** rather than
   Post now, and the feed/photo buttons are gone — a post with a video can
   only be published as a Reel.

9. Confirm the Page selector shows the right Page.

10. Click **Publish Reel to Facebook**. Leave the tab open. Expect 20–90
    seconds; up to about three minutes is normal.

11. On success the panel shows the permalink and the Meta object id.

12. Verify:

    ```sql
    select provider, delivery_state, provider_media_id, provider_post_id,
           provider_permalink, failure_detail
      from public.marketing_channel_deliveries
     where marketing_post_id = '<the post id>';
    ```

    Expect one row: `provider = facebook`, `delivery_state = posted`,
    `provider_media_id` and `provider_post_id` both the Facebook video id,
    `failure_detail` null. The post's status is now `posted`.

13. Open the Page's Reels tab and confirm the Reel is there and plays.

## Controlled first live test — Instagram Reel

Instagram publishes to the Professional account linked to the selected Page.
Run this on a **second** founder draft — the first one is already `posted` and
cannot be published again by design.

1. Confirm the Page has a linked Instagram Professional account. If the
   Instagram button is disabled, its tooltip says which prerequisite is
   missing.

2. Repeat steps 4–9 above on a new draft, attaching the same render.

3. Click **Publish Reel to Instagram**. Expect 30 seconds to three minutes —
   Meta transcodes before the container reports `FINISHED`.

4. Verify with the same query. Expect `provider = instagram`,
   `delivery_state = posted`, `provider_media_id` = the container id,
   `provider_post_id` = the published media id. **These two differ on
   Instagram**, unlike Facebook where both are the video id.

5. Open the Instagram account's Reels tab and confirm.

---

## When something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| "Reels must be vertical (9:16)" | The attached render is landscape. | Re-render at 1080×1920. The pre-flight caught it before any Meta call. |
| "Attach a rendered video to this post" | `video_media_asset_id` is null. | Select a render and save. |
| "That video has not finished uploading yet" | The asset row is `pending`. | Run `npm run integration:cycle` on the render machine. |
| "did not finish fetching the video in time" | Bounded poll expired. | Nothing was published. Retry — the delivery settled `failed`, so a retry is permitted. |
| "Facebook could not fetch the video" | Meta could not read the signed URL. | Check the deployment can reach Supabase storage and that the object still exists. |
| "already been published… could post twice" | The delivery row says a previous attempt succeeded or its outcome is unknown. | **Check Meta before doing anything.** Do not retry. |
| "This post has a video attached. Use Publish Reel" | A video post reached the feed/photo path. | Expected — `/feed` and `/photos` cannot carry video and would have silently dropped it. |

### A claim that never settled

`delivery_state = 'in_flight'` past the five-minute grace means the process
died mid-publish and only Meta knows the outcome. `provider_media_id` names
the object to look for:

```sql
select provider, provider_media_id, created_at
  from public.marketing_channel_deliveries
 where delivery_state = 'in_flight'
   and created_at < now() - interval '5 minutes';
```

Look that id up at Meta. If it was published, settle the row `posted` by hand
with the real post id. If it was not, settle it `failed`. **Do not retry
before resolving it** — that is how a Reel gets posted twice.

---

## Verification without publishing

```
npm run verify:reel        # 108 checks: decisions, host pinning, structure
npm run verify:delivery    # claim/settle discipline across all four actions
npm run verify:migrations  # migration file properties, including 145
npm run verify:all         # everything above
npm run typecheck
```

`scripts/proof-reel-tenancy.sql` proves the same-company foreign key against a
**throwaway local Postgres** — never a hosted project. It applies 145 twice to
prove convergence, then demonstrates that a cross-company reference is refused
on insert and on update, that a null video is still allowed, that deleting a
referenced video is refused, and that company deletion still cascades cleanly.

---

## Not in scope

- **Auto-publishing.** Every publish is a deliberate human click. There is no
  scheduler path into either action.
- **YouTube and TikTok.** No work has been done.
- **Ads or any paid action.** Nothing here spends money.
- **Reel insights.** Provider ids are persisted, but nothing reads engagement
  back.
