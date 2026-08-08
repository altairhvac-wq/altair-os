"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import {
  updateMemberAvatarAction,
  updateOwnAvatarAction,
} from "@/app/actions/profile-avatar";

/**
 * A person's avatar (photo, or initials fallback) that doubles as the
 * photo-upload control when the viewer may change it. Used in both shell
 * headers (self-serve: tap your own avatar to change it) and on Team
 * member profiles (owner/admin sets a member's photo).
 *
 * Images are downscaled client-side to a 512px square JPEG before upload,
 * so a 12 MB phone photo becomes a ~40 KB avatar — no server-side image
 * processing needed and uploads stay fast in the field.
 */

export type AvatarUploadTarget =
  | { kind: "self" }
  | { kind: "member"; membershipId: string };

type AvatarUploadControlProps = {
  name: string;
  avatarUrl: string | null | undefined;
  target: AvatarUploadTarget;
  canEdit: boolean;
  /** Chip classes — sizing/ring/colors come from the call site so the
   * control inherits each shell's established avatar styling. */
  className: string;
  imgClassName?: string;
  title?: string;
};

function getAvatarInitials(name: string): string {
  const cleaned = name.replace(/^\s*\[[^\]]*\]\s*/, "").trim();
  const initials = cleaned
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

const AVATAR_OUTPUT_SIZE = 512;

/** Center-crop to square and downscale via canvas; falls back to the raw
 * file if decoding fails (server still validates type and size). */
async function toSquareJpeg(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const out = Math.min(AVATAR_OUTPUT_SIZE, side);

    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.86),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export function AvatarUploadControl({
  name,
  avatarUrl,
  target,
  canEdit,
  className,
  imgClassName = "h-full w-full rounded-full object-cover",
  title,
}: AvatarUploadControlProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const face = avatarUrl ? (
    <img src={avatarUrl} alt="" className={imgClassName} />
  ) : (
    getAvatarInitials(name)
  );

  if (!canEdit) {
    return (
      <div className={className} title={title ?? name} aria-hidden="true">
        {face}
      </div>
    );
  }

  const handleFile = (file: File) => {
    setError(null);
    startTransition(async () => {
      const blob = await toSquareJpeg(file);
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" }),
      );

      const result =
        target.kind === "self"
          ? await updateOwnAvatarAction(formData)
          : await updateMemberAvatarAction(target.membershipId, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        title={title ?? "Change photo"}
        aria-label={
          target.kind === "self" ? "Change your photo" : `Change photo for ${name}`
        }
        className={`${className} cursor-pointer transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60`}
      >
        {face}
      </button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/90 text-white ring-1 ring-white/40"
      >
        <Camera className="h-2.5 w-2.5" />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) handleFile(file);
        }}
      />
      {error ? (
        <span
          role="alert"
          className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg bg-rose-600 px-2.5 py-1.5 text-left text-xs font-medium text-white shadow-lg"
        >
          {error}
        </span>
      ) : null}
    </span>
  );
}
