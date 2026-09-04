-- Publishing destinations for marketing posts.
--
-- ============ ALONE IN ITS FILE, SAME RULE AS 179 ============
-- `alter type ... add value` cannot share a transaction with a statement that
-- uses the label (see 146's header, and 179). Nothing here uses them.
--
-- ============ WHAT THIS IS FOR ============
-- 087 created `marketing_channel` with facebook / instagram / google_business
-- / website / general. A post destined for YouTube, TikTok, LinkedIn or Reddit
-- had to be filed as 'general', which made `channel_target` useless as the
-- routing key for a publish and made the duplicate guard in 143 —
-- `unique (company_id, marketing_post_id, provider)` — the only thing standing
-- between two 'general' posts and a double publish.
--
-- ============ WHAT IS DELIBERATELY ABSENT ============
-- `higgsfield` is not here and must never be. It is an asset SOURCE: it
-- produces creative and can never receive a post. A channel value for it would
-- make "publish to Higgsfield" representable, and the whole point of migration
-- 181's `integration_kind` is that it is not.
--
-- `altair_site` is not here either — the existing `website` value already
-- names that destination and has since 087. Adding a second label for the same
-- surface would split every historical row's meaning.

alter type public.marketing_channel add value if not exists 'youtube';
alter type public.marketing_channel add value if not exists 'tiktok';
alter type public.marketing_channel add value if not exists 'linkedin';
alter type public.marketing_channel add value if not exists 'reddit';
