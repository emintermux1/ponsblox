import struct
from pathlib import Path


def u16(b: bytes, o: int) -> int:
    return struct.unpack_from(">H", b, o)[0]


def u32(b: bytes, o: int) -> int:
    return struct.unpack_from(">I", b, o)[0]


def i16(b: bytes, o: int) -> int:
    return struct.unpack_from(">h", b, o)[0]


def tables(data: bytes) -> dict[str, tuple[int, int]]:
    n = u16(data, 4)
    out: dict[str, tuple[int, int]] = {}
    for i in range(n):
        o = 12 + i * 16
        tag = data[o : o + 4].decode("ascii", "replace")
        out[tag] = (u32(data, o + 8), u32(data, o + 12))
    return out


def cmap_gid(data: bytes, cmap_off: int, code: int) -> int | None:
    n = u16(data, cmap_off + 2)
    for i in range(n):
        plat = u16(data, cmap_off + 4 + i * 8)
        enc = u16(data, cmap_off + 6 + i * 8)
        sub = cmap_off + u32(data, cmap_off + 8 + i * 8)
        fmt = u16(data, sub)
        if plat == 3 and enc == 1 and fmt == 4:
            seg = u16(data, sub + 6) // 2
            end_o = sub + 14
            start_o = end_o + 2 + seg * 2
            delta_o = start_o + seg * 2
            range_o = delta_o + seg * 2
            for s in range(seg):
                end = u16(data, end_o + s * 2)
                start = u16(data, start_o + s * 2)
                if start <= code <= end:
                    delta = i16(data, delta_o + s * 2)
                    ro = u16(data, range_o + s * 2)
                    if ro == 0:
                        return (code + delta) & 0xFFFF
                    gid = u16(data, range_o + s * 2 + ro + (code - start) * 2)
                    if gid:
                        return (gid + delta) & 0xFFFF
                    return 0
        if fmt == 12:
            ng = u32(data, sub + 12)
            for g in range(ng):
                go = sub + 16 + g * 12
                start = u32(data, go)
                end = u32(data, go + 4)
                glyph = u32(data, go + 8)
                if start <= code <= end:
                    return glyph + (code - start)
    return None


def space_width(path: Path) -> None:
    data = path.read_bytes()
    if data[:4] == b"wOF2":
        print(f"{path.name}: woff2 (need decode). size={len(data)}")
        return
    t = tables(data)
    cmap_off = t["cmap"][0]
    head_off = t["head"][0]
    hhea_off = t["hhea"][0]
    hmtx_off = t["hmtx"][0]
    upem = u16(data, head_off + 18)
    n_metrics = u16(data, hhea_off + 34)
    gid = cmap_gid(data, cmap_off, 0x20)
    if gid is None:
        print(f"{path.name}: NO cmap for U+0020 upem={upem}")
        return
    if gid < n_metrics:
        adv = u16(data, hmtx_off + gid * 4)
    else:
        last = n_metrics - 1
        adv = u16(data, hmtx_off + last * 4)
    print(f"{path.name}: gid={gid} advance={adv} upem={upem} em={round(adv / upem, 4)}")


space_width(Path(r"C:\Users\emin\ponsblox\redditpad\.verify-shots\plex400.ttf"))
space_width(Path(r"C:\Users\emin\ponsblox\redditpad\.verify-shots\plex-latin.woff2"))
