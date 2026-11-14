-- 213: count "article listened to" on the public site.
--
-- Insights articles can carry a recorded reading (shared/lib/site/article-audio.ts).
-- The first time a visitor presses play on one, the browser sends an
-- `article_listen` event whose label is the article's slug, through the same
-- first-party collector as the other engagement events (migration 209). This
-- migration only lets that event name into `web_analytics_events`.
--
-- Nothing else changes: the label format check, the engagement index and
-- `platform_web_analytics_engagement` already cover every event that is not a
-- pageview or a signup step, so the new event appears in "What visitors did"
-- on Platform analytics with no further change.
--
-- Until this is applied, an `article_listen` insert fails the check and is
-- dropped (the collector logs it and still answers 204). Listening itself is
-- unaffected.
--
-- Additive only. Applying this migration changes no existing row.

alter table public.web_analytics_events
  drop constraint if exists web_analytics_events_event_name_check;

alter table public.web_analytics_events
  add constraint web_analytics_events_event_name_check
  check (event_name in (
    'pageview',
    'signup_started',
    'signup_completed',
    'cta_click',
    'video_play',
    'calculator_used',
    'template_download',
    'results_email_requested',
    'boss_share',
    'article_listen'
  ));
