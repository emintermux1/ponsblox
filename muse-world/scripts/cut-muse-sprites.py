#!/usr/bin/env python3
"""Cut official Muse / Grok stills into loft billboard sprites."""

from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image

ASSETS = Path("/home/ubuntu/.cursor/projects/workspace/assets")
DEST = Path(__file__).resolve().parents[1] / "public" / "muse"
CAST = Path(__file__).resolve().parents[1] / "public" / "cast"

OWNER = {
    "hug-circle.jpg": "57df7623-9a49-4272-b578-a50f951c6958.jpg",
    "hug-ledge.jpg": "bb0195c2-e806-4255-86db-fc0b18a07d02.jpg",
    "hug.jpg": "47ae9a18-0ca5-4a8e-86d3-53e71ea40371.jpg",
    "grok-orb.jpg": "bf17587e-30d6-459c-92fc-4d3bc6bd9d7a.jpg",
    "wave.jpg": "f3118f9d-7ca1-4580-a839-0711101266dc.jpg",
    "cap.jpg": "fe96f90c-a5cb-45f6-8d95-5a78406dd09c.jpg",
    "halo.jpg": "614cabb2-daeb-4b8b-af79-0726df3d0205.jpg",
    "sable.jpg": "69ffd94e-b9b0-4e28-89a9-aa28de57fd29.jpg",
}


def copy_owner() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    CAST.mkdir(parents=True, exist_ok=True)
    for dest_name, src_name in OWNER.items():
        src = ASSETS / src_name
        if not src.is_file():
            raise FileNotFoundError(src)
        shutil.copy2(src, DEST / dest_name)
    shutil.copy2(DEST / "hug.jpg", DEST / "hug-smile.jpg")
    shutil.copy2(DEST / "cap.jpg", DEST / "laptop.jpg")
    shutil.copy2(DEST / "hug-ledge.jpg", DEST / "banner.jpg")
    shutil.copy2(DEST / "grok-orb.jpg", DEST / "grok.jpg")
    shutil.copy2(DEST / "wave.jpg", CAST / "pip.jpg")
    shutil.copy2(DEST / "wave.jpg", CAST / "wave.jpg")
    shutil.copy2(DEST / "cap.jpg", CAST / "tape.jpg")
    shutil.copy2(DEST / "sable.jpg", CAST / "sable.jpg")
    shutil.copy2(DEST / "halo.jpg", CAST / "halo.jpg")
    shutil.copy2(DEST / "grok-orb.jpg", CAST / "grok.jpg")
    shutil.copy2(DEST / "hug.jpg", CAST / "hug.jpg")


def neighbors(x: int, y: int, w: int, h: int):
    if x > 0:
        yield x - 1, y
    if x + 1 < w:
        yield x + 1, y
    if y > 0:
        yield x, y - 1
    if y + 1 < h:
        yield x, y + 1


def flood_match(im: Image.Image, match, erode: int = 1) -> Image.Image:
    px = im.convert("RGBA")
    w, h = px.size
    pix = px.load()
    q: deque[tuple[int, int]] = deque()
    seen = set()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    killed: set[tuple[int, int]] = set()
    while q:
        x, y = q.popleft()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        r, g, b, a = pix[x, y]
        if a == 0 or match(r, g, b):
            killed.add((x, y))
            pix[x, y] = (0, 0, 0, 0)
            q.extend(neighbors(x, y, w, h))
    for _ in range(erode):
        extra = set()
        for x, y in killed:
            extra.update(neighbors(x, y, w, h))
        extra -= killed
        for x, y in extra:
            r, g, b, a = pix[x, y]
            if a and match(r, g, b):
                pix[x, y] = (0, 0, 0, 0)
                killed.add((x, y))
    return px


def dark(r: int, g: int, b: int) -> bool:
    return r < 42 and g < 42 and b < 42


def pastel(r: int, g: int, b: int) -> bool:
    mx, mn = max(r, g, b), min(r, g, b)
    if mn > 208 and mx > 228:
        return True
    if r > 220 and g > 190 and b > 170 and mx - mn < 70:
        return True
    return False


def sky(r: int, g: int, b: int) -> bool:
    return b > 150 and b >= r - 8 and b >= g - 4 and r + g + b > 420


def cream_keep(r: int, g: int, b: int) -> bool:
    mx, mn = max(r, g, b), min(r, g, b)
    if mn > 196 and mx - mn < 26:
        return False
    if r > 168 and g > 148 and b > 118 and r >= b - 6:
        return True
    if r > 210 and g > 150 and b > 120 and r - b > 20:
        return True
    if mx < 70 and mx - mn < 18:
        return True
    if r > 200 and g > 170 and b < 90:
        return True
    return False


def punch_white_orb(im: Image.Image) -> Image.Image:
    px = im.convert("RGBA")
    w, h = px.size
    pix = px.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a == 0:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            if mn > 188 and mx - mn < 28:
                pix[x, y] = (0, 0, 0, 0)
    return px


def keep_cream(im: Image.Image) -> Image.Image:
    px = im.convert("RGBA")
    w, h = px.size
    pix = px.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a == 0:
                continue
            if not cream_keep(r, g, b):
                pix[x, y] = (0, 0, 0, 0)
    return px


def crop_right(im: Image.Image, start: float) -> Image.Image:
    w, h = im.size
    return im.crop((int(w * start), 0, w, h))


def save(im: Image.Image, name: str) -> None:
    dest = DEST / name
    im.save(dest, "PNG")
    print(f"wrote {dest} {im.size} {dest.stat().st_size}")


def main() -> None:
    copy_owner()
    wave = flood_match(Image.open(DEST / "wave.jpg"), pastel, erode=2)
    save(wave, "wave.png")
    cap = flood_match(Image.open(DEST / "cap.jpg"), pastel, erode=2)
    save(cap, "cap.png")
    halo = flood_match(Image.open(DEST / "halo.jpg"), sky, erode=2)
    save(halo, "halo.png")
    sable = flood_match(Image.open(DEST / "sable.jpg"), pastel, erode=1)
    save(sable, "sable.png")
    grok = flood_match(Image.open(DEST / "grok-orb.jpg"), dark, erode=1)
    save(grok, "grok-orb.png")
    hug = flood_match(Image.open(DEST / "hug.jpg"), dark, erode=1)
    save(hug, "hug.png")
    hug_circle = flood_match(Image.open(DEST / "hug-circle.jpg"), dark, erode=1)
    save(hug_circle, "hug-circle.png")
    hug_ledge = flood_match(Image.open(DEST / "hug-ledge.jpg"), sky, erode=2)
    save(hug_ledge, "hug-ledge.png")
    muse_only = keep_cream(punch_white_orb(crop_right(hug_ledge, 0.54)))
    save(muse_only, "hug-muse.png")
    Image.open(DEST / "hug.jpg").convert("RGB").save(DEST / "hug-muse.jpg", "JPEG", quality=90)
    print("ground-truth stills + cutouts ready")


if __name__ == "__main__":
    main()
