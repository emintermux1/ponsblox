#!/usr/bin/env python3
"""Cut official Muse / Grok stills into transparent loft sprites."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "muse"


def load(name: str) -> Image.Image:
    return Image.open(ROOT / name).convert("RGBA")


def save(image: Image.Image, name: str) -> None:
    box = image.getbbox()
    cropped = image.crop(box) if box else image
    cropped.save(ROOT / name, "PNG")


def corners(image: Image.Image) -> list[tuple[int, int]]:
    width, height = image.size
    inset = 8
    return [
        (inset, inset),
        (width - inset - 1, inset),
        (inset, height - inset - 1),
        (width - inset - 1, height - inset - 1),
        (width // 2, inset),
        (inset, height // 2),
        (width - inset - 1, height // 2),
    ]


def flood_alpha(image: Image.Image, starts: list[tuple[int, int]], max_dist: float) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    seen = [[False] * height for _ in range(width)]
    stack = list(starts)
    samples = [pixels[sx, sy][:3] for sx, sy in starts]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= width or y >= height or seen[x][y]:
            continue
        seen[x][y] = True
        red, green, blue, alpha = pixels[x, y]
        if alpha == 0:
            continue
        if min((red - sr) ** 2 + (green - sg) ** 2 + (blue - sb) ** 2 for sr, sg, sb in samples) > max_dist:
            continue
        pixels[x, y] = (red, green, blue, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return image


def drop_near_black(image: Image.Image, limit: int = 38) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha and red < limit and green < limit and blue < limit:
                pixels[x, y] = (red, green, blue, 0)
    return image


def drop_near_white(image: Image.Image, limit: int = 238) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha and red > limit and green > limit and blue > limit:
                pixels[x, y] = (red, green, blue, 0)
    return image


def keep_cream_and_accents(image: Image.Image) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if not alpha:
                continue
            cream = red > 170 and green > 140 and blue > 100 and red >= green - 12 and green >= blue - 20
            blush = red > 180 and green > 90 and blue > 90 and red - blue > 30
            spark = red > 190 and green > 150 and blue < 140 and red - blue > 40
            dark_line = red < 90 and green < 80 and blue < 80
            if cream or blush or spark:
                continue
            if dark_line:
                cream_near = 0
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        nr, ng, nb, na = pixels[nx, ny]
                        if na and nr > 170 and ng > 140 and nb > 100:
                            cream_near += 1
                if cream_near >= 2:
                    continue
            pixels[x, y] = (red, green, blue, 0)
    return image


def keep_white_orb(image: Image.Image) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    cx, cy = width / 2, height / 2
    radius = min(width, height) * 0.28
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if not alpha:
                continue
            if red > 210 and green > 210 and blue > 210:
                continue
            if red < 55 and green < 55 and blue < 55 and (x - cx) ** 2 + (y - cy) ** 2 < radius * radius:
                continue
            pixels[x, y] = (red, green, blue, 0)
    return image


def main() -> None:
    wave = load("wave.jpg")
    save(flood_alpha(wave, corners(wave), 4200), "wave.png")

    cap = drop_near_white(load("cap.jpg"), 246)
    save(flood_alpha(cap, corners(cap), 900), "cap.png")

    halo = load("halo.jpg")
    save(flood_alpha(halo, corners(halo), 5200), "halo.png")

    sable = load("sable.jpg")
    save(flood_alpha(sable, corners(sable), 2800), "sable.png")

    hug = keep_cream_and_accents(drop_near_black(load("hug-circle.jpg"), 28))
    save(hug, "hug-muse.png")

    save(keep_white_orb(load("grok-orb.jpg")), "grok-orb.png")


if __name__ == "__main__":
    main()
