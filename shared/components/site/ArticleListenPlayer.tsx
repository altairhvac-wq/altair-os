"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import {
  listenLength,
  sectionAt,
  type ArticleAudio,
} from "@/shared/lib/site/article-audio";

/**
 * "Listen to this article": the recorded reading of an Insights article.
 *
 * The file is not requested until the visitor presses play (`preload="none"`),
 * so an article nobody listens to costs a reader nothing. The length shown
 * before that comes from the audio list, not from the file.
 *
 * Once playing, the card can scroll away: a slim bar then stays at the bottom
 * of the screen with the same controls, so the article can be read along or
 * the phone put down. The lock screen gets the title and play / pause / back
 * through the Media Session API where the browser has it.
 *
 * The place reached is remembered per article in this browser only, so a
 * visitor who comes back picks up where they stopped. That place is never
 * sent anywhere. The first press of play is counted as one "article listened
 * to" event with the article's slug, through the same first-party analytics
 * as video plays (and not at all for a visitor who has opted out).
 */

const RATES = [1, 1.25, 1.5, 2] as const;
const BACK_SECONDS = 15;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/60 focus-visible:ring-offset-2";

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function readSavedPlace(key: string): number {
  try {
    const saved = Number(window.localStorage.getItem(key));
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  } catch {
    return 0;
  }
}

function savePlace(key: string, seconds: number | null): void {
  try {
    if (seconds === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(Math.floor(seconds)));
  } catch {
    // Private windows and blocked storage: the player works without it.
  }
}

export function ArticleListenPlayer({
  title,
  audio,
}: {
  readonly title: string;
  readonly audio: ArticleAudio;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(audio.durationSeconds);
  const [rateIndex, setRateIndex] = useState(0);
  const [cardVisible, setCardVisible] = useState(true);
  const [barClosed, setBarClosed] = useState(false);
  const [failed, setFailed] = useState(false);

  const storageKey = `altair:listen:${audio.slug}`;
  const section = sectionAt(audio.sections, current);
  const rate = RATES[rateIndex];
  const percent = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  // The bar appears only while the card itself is off screen.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setCardVisible(entry.isIntersecting),
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const seekTo = (seconds: number) => {
    const element = audioRef.current;
    if (!element) return;
    const target = Math.max(0, Math.min(seconds, duration));
    element.currentTime = target;
    setCurrent(target);
  };

  const toggle = () => {
    const element = audioRef.current;
    if (!element) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    if (!started) {
      // Pick up where this browser stopped, unless that was the very end.
      const saved = readSavedPlace(storageKey);
      if (saved > 5 && saved < duration - 10) {
        element.currentTime = saved;
        setCurrent(saved);
      }
      setStarted(true);
      // Counted once per page view, by article, and only when tracking is allowed.
      trackEngagement("article_listen", audio.slug);
    }
    setBarClosed(false);
    setFailed(false);
    element.playbackRate = rate;
    element.play().catch(() => setFailed(true));
  };

  const nextRate = () => {
    const next = (rateIndex + 1) % RATES.length;
    setRateIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = RATES[next];
  };

  const closeBar = () => {
    audioRef.current?.pause();
    setBarClosed(true);
  };

  // Lock screen and headset buttons, where the browser offers them.
  useEffect(() => {
    if (!started || !("mediaSession" in navigator)) return;
    const element = audioRef.current;
    if (!element) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: "Altair Operating System",
      album: "Insights",
      artwork: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });
    const actions: [MediaSessionAction, () => void][] = [
      ["play", () => void element.play().catch(() => undefined)],
      ["pause", () => element.pause()],
      [
        "seekbackward",
        () => {
          element.currentTime = Math.max(0, element.currentTime - BACK_SECONDS);
        },
      ],
      [
        "seekforward",
        () => {
          element.currentTime = Math.min(
            element.duration || Infinity,
            element.currentTime + BACK_SECONDS,
          );
        },
      ],
    ];
    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // An action this browser does not know: the page controls still work.
      }
    }
    return () => {
      for (const [action] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Same as above.
        }
      }
    };
  }, [started, title]);

  const playLabel = playing ? "Pause" : started ? "Play" : "Listen to this article";
  const PlayIcon = playing ? Pause : Play;

  return (
    <>
      <section
        ref={cardRef}
        id="listen"
        aria-label="Listen to this article"
        className="mt-8 scroll-mt-28 rounded-2xl border border-stone-200 bg-white px-5 py-5 shadow-sm sm:px-6"
      >
        <audio
          ref={audioRef}
          src={audio.src}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={(event) => {
            setPlaying(false);
            savePlace(storageKey, event.currentTarget.currentTime);
          }}
          onEnded={() => {
            setPlaying(false);
            savePlace(storageKey, null);
          }}
          onLoadedMetadata={(event) => {
            const real = event.currentTarget.duration;
            if (Number.isFinite(real) && real > 0) setDuration(real);
          }}
          onTimeUpdate={(event) => {
            const now = event.currentTarget.currentTime;
            setCurrent(now);
            if (Math.floor(now) % 5 === 0) savePlace(storageKey, now);
          }}
          onError={() => {
            setPlaying(false);
            setFailed(true);
          }}
        />

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            aria-label={playLabel}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0d0f0c] text-[#e9d9b0] transition-colors hover:bg-[#23261f] ${focusRing}`}
          >
            <PlayIcon
              aria-hidden="true"
              className={`h-6 w-6 ${playing ? "" : "translate-x-0.5"}`}
              fill="currentColor"
              strokeWidth={0}
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold leading-snug text-[#0A0A0A]">
              {started && section ? section.title : "Listen to this article"}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-stone-500">
              {listenLength(duration)} · read in our founder&apos;s voice, made
              with AI
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="w-9 text-xs tabular-nums text-stone-500">
            {clock(current)}
          </span>
          <input
            type="range"
            min={0}
            max={Math.round(duration)}
            step={1}
            value={Math.round(current)}
            onChange={(event) => seekTo(Number(event.currentTarget.value))}
            aria-label="Place in the recording"
            aria-valuetext={`${clock(current)} of ${clock(duration)}`}
            className={`h-6 min-w-0 flex-1 cursor-pointer accent-[#a4823a] ${focusRing}`}
          />
          <span className="w-9 text-right text-xs tabular-nums text-stone-500">
            {clock(duration)}
          </span>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => seekTo(current - BACK_SECONDS)}
              aria-label={`Back ${BACK_SECONDS} seconds`}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-700 transition-colors hover:border-[#c2a05a] ${focusRing}`}
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              {BACK_SECONDS}s
            </button>
            <button
              type="button"
              onClick={nextRate}
              aria-label={`Speed ${rate} times. Press to change.`}
              className={`inline-flex h-9 min-w-[3.25rem] items-center justify-center rounded-lg border border-stone-200 px-3 text-xs font-semibold tabular-nums text-stone-700 transition-colors hover:border-[#c2a05a] ${focusRing}`}
            >
              {rate}x
            </button>
          </div>
        </div>

        {failed ? (
          <p role="alert" className="mt-3 text-sm text-[#9a3412]">
            The recording could not be played. The full article is below.
          </p>
        ) : null}
      </section>

      {started && !cardVisible && !barClosed ? (
        <div
          role="region"
          aria-label="Article audio"
          className="fixed inset-x-0 bottom-0 z-40 bg-[#0d0f0c] pb-[env(safe-area-inset-bottom)] text-[#f3ebdd] shadow-[0_-12px_40px_-20px_rgba(0,0,0,0.6)]"
        >
          <div aria-hidden="true" className="h-[3px] bg-white/10">
            <div
              className="h-full bg-[#c2a05a]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mx-auto flex max-w-[720px] items-center gap-3 px-4 py-2.5 sm:px-8">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c2a05a] text-[#0d0f0c] transition-colors hover:bg-[#d8bb7a] ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
            >
              <PlayIcon
                aria-hidden="true"
                className={`h-5 w-5 ${playing ? "" : "translate-x-0.5"}`}
                fill="currentColor"
                strokeWidth={0}
              />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#fff9ea]">
                {section ? section.title : title}
              </p>
              <p className="truncate text-xs tabular-nums text-[#c9bfae]">
                {clock(current)} / {clock(duration)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => seekTo(current - BACK_SECONDS)}
              aria-label={`Back ${BACK_SECONDS} seconds`}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#f3ebdd] transition-colors hover:bg-white/10 ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextRate}
              aria-label={`Speed ${rate} times. Press to change.`}
              className={`flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-semibold tabular-nums text-[#f3ebdd] transition-colors hover:bg-white/10 ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
            >
              {rate}x
            </button>
            <button
              type="button"
              onClick={closeBar}
              aria-label="Stop and close"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#c9bfae] transition-colors hover:bg-white/10 ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
