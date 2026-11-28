"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2, Upload } from "lucide-react";
import { saveListingMediaAction } from "@/app/actions/directory";
import { dirBrassButton, dirFocus, dirPanel, dirSecondaryButton } from "@/shared/components/directory/directory-styles";
import { DIRECTORY_DETAIL_LIMITS } from "@/shared/types/directory";

/**
 * The lister's logo and photos, on the manage page (migration 214).
 *
 * An image is resized and re-encoded in the browser before it is sent: it
 * arrives small, and camera details hidden in the file (such as where the
 * photo was taken) are left behind. It goes to a private store; it shows on
 * the listing only after the lister presses Save and a person approves it.
 */

export type MediaItem = { key: string; url: string };

type Props = {
  readonly link: { readonly id: string; readonly token: string };
  readonly logo: MediaItem | null;
  readonly photos: readonly MediaItem[];
  /** True when the images shown are a proposal still waiting for review. */
  readonly waiting: boolean;
  readonly live: boolean;
};

async function shrink(file: File, kind: "logo" | "photo"): Promise<Blob> {
  const maxSide = kind === "logo" ? 600 : 1600;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // A logo keeps its transparency (PNG); a photo becomes a compact JPEG.
  const type = kind === "logo" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  if (!blob) throw new Error("encode");
  return blob;
}

export function ListingMediaManager({ link, logo: initialLogo, photos: initialPhotos, waiting, live }: Props) {
  const [logo, setLogo] = useState<MediaItem | null>(initialLogo);
  const [photos, setPhotos] = useState<MediaItem[]>([...initialPhotos]);
  const [busy, setBusy] = useState<null | "logo" | "photo">(null);
  const [message, setMessage] = useState<{ tone: "error" | "done"; text: string } | null>(
    waiting ? { tone: "done", text: "These images are waiting for a person to approve them." } : null,
  );
  const [dirty, setDirty] = useState(false);
  const [saving, startSaving] = useTransition();
  const logoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const max = DIRECTORY_DETAIL_LIMITS.photos.max;

  const upload = async (file: File, kind: "logo" | "photo"): Promise<MediaItem | null> => {
    if (!/^image\/(png|jpeg|webp|heic|heif)$/i.test(file.type)) {
      setMessage({ tone: "error", text: "Use a PNG, JPEG or WebP image." });
      return null;
    }
    let body: Blob;
    try {
      body = await shrink(file, kind);
    } catch {
      setMessage({ tone: "error", text: "That image could not be read. Try a PNG or JPEG." });
      return null;
    }
    const form = new FormData();
    form.set("id", link.id);
    form.set("t", link.token);
    form.set("kind", kind);
    form.set("file", body, kind === "logo" ? "logo.png" : "photo.jpg");
    try {
      const response = await fetch("/api/directory/media", { method: "POST", body: form });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; key?: string; url?: string; message?: string } | null;
      if (!response.ok || !result?.ok || !result.key || !result.url) {
        setMessage({ tone: "error", text: result?.message ?? "The image could not be uploaded. Please try again." });
        return null;
      }
      return { key: result.key, url: result.url };
    } catch {
      setMessage({ tone: "error", text: "The image could not be uploaded. Check your connection and try again." });
      return null;
    }
  };

  const onLogo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy("logo");
    setMessage(null);
    const item = await upload(file, "logo");
    if (item) {
      setLogo(item);
      setDirty(true);
    }
    setBusy(null);
  };

  const onPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy("photo");
    setMessage(null);
    const room = max - photos.length;
    const added: MediaItem[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const item = await upload(file, "photo");
      if (item) added.push(item);
    }
    if (files.length > room) setMessage({ tone: "error", text: `A listing can show up to ${max} photos.` });
    if (added.length > 0) {
      setPhotos((current) => [...current, ...added].slice(0, max));
      setDirty(true);
    }
    setBusy(null);
  };

  const move = (index: number, by: -1 | 1) => {
    setPhotos((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const save = () =>
    startSaving(async () => {
      const result = await saveListingMediaAction({ id: link.id, t: link.token, logo: logo?.key ?? null, photos: photos.map((photo) => photo.key) });
      setMessage({ tone: result.status === "error" ? "error" : "done", text: result.message ?? "" });
      if (result.status !== "error") setDirty(false);
    });

  return (
    <section aria-labelledby="manage-media-heading" className={`px-5 py-6 sm:px-7 ${dirPanel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="manage-media-heading" className="flex items-center gap-2 text-base font-semibold text-[#0A0A0A]">
          <ImagePlus aria-hidden="true" className="h-4 w-4 text-[#A4823A]" /> Logo and photos
        </h2>
        <p className="text-xs text-stone-500">PNG, JPEG or WebP. Up to {max} photos.</p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-stone-600">
        Photos of your own work do the most. {live ? "New images show once a person has approved them." : "They are checked along with your listing."}
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <div>
          <p className="text-[13px] font-medium text-stone-800">Logo</p>
          <div className="mt-2 flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.url} alt="Your logo" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-xs text-stone-400">No logo yet</span>
            )}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button type="button" onClick={() => logoInput.current?.click()} disabled={busy !== null} className={`${dirSecondaryButton} min-h-9 px-3 text-[13px]`}>
              {busy === "logo" ? "Uploading…" : logo ? "Replace" : "Upload"}
            </button>
            {logo ? (
              <button
                type="button"
                onClick={() => {
                  setLogo(null);
                  setDirty(true);
                }}
                aria-label="Remove the logo"
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700 ${dirFocus}`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} onChange={(event) => void onLogo(event.target.files)} />
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-medium text-stone-800">Photos</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <li key={photo.key} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                {index === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[#0d0f0c]/80 px-2 py-0.5 text-[10px] font-semibold text-[#f3ebdd]">Cover</span>
                ) : null}
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
                  <span className="flex gap-1">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move photo ${index + 1} earlier`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-stone-700 shadow-sm disabled:opacity-40">
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === photos.length - 1} aria-label={`Move photo ${index + 1} later`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-stone-700 shadow-sm disabled:opacity-40">
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotos((current) => current.filter((item) => item.key !== photo.key));
                      setDirty(true);
                    }}
                    aria-label={`Remove photo ${index + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-stone-600 shadow-sm hover:text-red-700"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
            {photos.length < max ? (
              <li>
                <button
                  type="button"
                  onClick={() => photoInput.current?.click()}
                  disabled={busy !== null}
                  className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 bg-stone-50 text-[13px] font-medium text-stone-600 hover:border-[#C2A05A] hover:text-stone-900 disabled:opacity-60 ${dirFocus}`}
                >
                  <Upload aria-hidden="true" className="h-5 w-5" />
                  {busy === "photo" ? "Uploading…" : "Add photos"}
                </button>
              </li>
            ) : null}
          </ul>
          <input
            ref={photoInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => void onPhotos(event.target.files)}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className={`text-sm ${message?.tone === "error" ? "font-medium text-[#9a3412]" : "text-stone-600"}`}>
          {message?.text ?? (dirty ? "You have changes that are not saved yet." : "")}
        </p>
        <button type="button" onClick={save} disabled={!dirty || saving || busy !== null} className={`${dirBrassButton} shrink-0`}>
          {saving ? "Saving…" : "Save images"}
        </button>
      </div>
    </section>
  );
}
