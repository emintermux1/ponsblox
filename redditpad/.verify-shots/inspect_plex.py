from pathlib import Path

from fontTools.ttLib import TTFont


def inspect(path: Path) -> None:
    font = TTFont(path)
    cmap = font.getBestCmap() or {}
    upem = font["head"].unitsPerEm
    gid = cmap.get(0x20)
    name = font.getGlyphName(gid) if gid is not None else None
    width = font["hmtx"][name][0] if name else None
    ratio = None if not width else round(width / upem, 4)
    print(
        f"{path.name}: cmap_has_space={0x20 in cmap} glyph={name} "
        f"width={width} upem={upem} em_ratio={ratio}"
    )


for p in [
    Path(r"C:\Users\emin\ponsblox\redditpad\.verify-shots\plex400.ttf"),
    Path(r"C:\Users\emin\ponsblox\redditpad\.verify-shots\plex-latin.woff2"),
]:
    inspect(p)
