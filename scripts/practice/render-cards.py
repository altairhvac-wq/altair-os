"""
Render the non-photographic frames of a practice episode.

Two kinds of card, both 1920x1080, both written as PNG into the render
worker's slides directory and as JPG into the editor's preview directory:

TEXT CARD
    A beat the plan marked `on_screen_text`. The caption is the shot. Large,
    quiet typography on the same near-black the editor uses, with a thin accent
    rule — it has to sit between photographs without feeling like a different
    film.

PLACEHOLDER CARD
    A beat curation could not answer. It states the role, what was searched
    for, and the tags that would satisfy it, because a placeholder that only
    says "missing" tells an editor nothing they did not already know. This is
    the frame that appears in the render as well as the editor, so a gap is
    visible in the cut rather than being a silent black hole.

Run: python scripts/practice/render-cards.py <cards.json> <png-out> <jpg-out>
"""
import io
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
BG = (16, 17, 20)
INK = (236, 238, 242)
DIM = (150, 156, 166)
ACCENT = (232, 168, 56)
WARN = (228, 140, 70)


def font(size, bold=False):
    names = (
        ["segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"]
        if bold
        else ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"]
    )
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    return ImageFont.load_default()


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def text_card(caption, kicker=None):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # A soft radial lift behind the type so the card has depth rather than
    # reading as a flat slide.
    glow = Image.new("L", (W // 6, H // 6), 0)
    ImageDraw.Draw(glow).ellipse([W // 24, H // 24, W // 6 - W // 24, H // 6 - H // 24], fill=48)
    img.paste(
        Image.new("RGB", (W, H), (44, 47, 54)),
        (0, 0),
        glow.resize((W, H), Image.LANCZOS),
    )

    size = 96
    fnt = font(size, bold=True)
    lines = wrap(d, caption, fnt, int(W * 0.74))
    while len(lines) > 3 and size > 52:
        size -= 8
        fnt = font(size, bold=True)
        lines = wrap(d, caption, fnt, int(W * 0.74))

    lh = int(size * 1.26)
    total = lh * len(lines)
    y = (H - total) // 2 + (18 if kicker else 0)

    if kicker:
        kf = font(30, bold=True)
        kw = d.textlength(kicker.upper(), font=kf)
        d.text(((W - kw) / 2, y - 96), kicker.upper(), fill=ACCENT, font=kf)

    for line in lines:
        lw = d.textlength(line, font=fnt)
        d.text(((W - lw) / 2, y), line, fill=INK, font=fnt)
        y += lh

    d.rectangle([W // 2 - 64, y + 34, W // 2 + 64, y + 37], fill=ACCENT)
    return img


def placeholder_card(role, query, tags, status):
    img = Image.new("RGB", (W, H), (20, 20, 23))
    d = ImageDraw.Draw(img)

    # Hazard corners rather than a full border: it reads as "unfinished" at a
    # glance in a timeline without shouting over the text.
    for x0, y0, x1, y1 in (
        (90, 90, 260, 94), (90, 90, 94, 260),
        (W - 260, 90, W - 90, 94), (W - 94, 90, W - 90, 260),
        (90, H - 94, 260, H - 90), (90, H - 260, 94, H - 90),
        (W - 260, H - 94, W - 90, H - 90), (W - 94, H - 260, W - 90, H - 90),
    ):
        d.rectangle([x0, y0, x1, y1], fill=WARN)

    x = 200
    y = 300
    d.text((x, y), "IMAGE NEEDED", fill=WARN, font=font(46, bold=True))
    y += 86

    rf = font(72, bold=True)
    for line in wrap(d, role, rf, W - 2 * x)[:2]:
        d.text((x, y), line, fill=INK, font=rf)
        y += 88

    y += 26
    d.text((x, y), "SEARCHED FOR", fill=(120, 126, 136), font=font(24, bold=True))
    y += 40
    qf = font(34)
    for line in wrap(d, query, qf, W - 2 * x)[:3]:
        d.text((x, y), line, fill=DIM, font=qf)
        y += 46

    if tags:
        y += 26
        d.text((x, y), "WOULD SATISFY", fill=(120, 126, 136), font=font(24, bold=True))
        y += 40
        tf = font(30)
        tx = x
        for t in tags[:6]:
            tw = d.textlength(t, font=tf)
            d.rounded_rectangle([tx - 14, y - 8, tx + tw + 14, y + 42], 10,
                                fill=(34, 35, 40), outline=(62, 64, 72))
            d.text((tx, y), t, fill=DIM, font=tf)
            tx += tw + 44

    sf = font(26, bold=True)
    sw = d.textlength(status.upper(), font=sf)
    d.rounded_rectangle([W - 200 - sw - 28, 196, W - 200 + 14, 244], 12,
                        fill=(46, 33, 20), outline=WARN)
    d.text((W - 200 - sw - 7, 204), status.upper(), fill=WARN, font=sf)
    return img


def main():
    spec_path, png_dir, jpg_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    cards = json.load(io.open(spec_path, encoding="utf-8"))
    os.makedirs(png_dir, exist_ok=True)
    os.makedirs(jpg_dir, exist_ok=True)

    made = 0
    for c in cards:
        if c["type"] == "text":
            img = text_card(c["caption"], c.get("kicker"))
        else:
            img = placeholder_card(c["role"], c["query"], c.get("tags", []), c.get("status", "unresolved"))
        img.save(os.path.join(png_dir, f"{c['id']}.png"))
        # Full size, not a thumbnail. The editor preview and the scene bake read
        # this same JPG, so a downscale here would put soft type in the finished
        # film on exactly the cards someone chose to move.
        img.save(os.path.join(jpg_dir, f"{c['id']}.jpg"), quality=88)
        made += 1

    print(f"{made} cards rendered -> {png_dir} (png) + {jpg_dir} (jpg)")


if __name__ == "__main__":
    main()
