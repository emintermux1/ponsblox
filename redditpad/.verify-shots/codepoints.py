from pathlib import Path

files = [
    Path(r"C:\Users\emin\ponsblox\redditpad\src\pages\Launch.tsx"),
    Path(r"C:\Users\emin\ponsblox\redditpad\src\pages\Home.tsx"),
    Path(r"C:\Users\emin\ponsblox\redditpad\src\components\Nav.tsx"),
    Path(r"C:\Users\emin\ponsblox\redditpad\src\components\Connect.tsx"),
]
needles = [
    "Wallet is not on Robinhood Chain (4663).",
    "Pair the front page of the internet.",
    "Search communities, tickers or Reddit posts",
    "Connect Wallet",
    "Launch a Pair",
]
for path in files:
    text = path.read_text(encoding="utf-8")
    for needle in needles:
        i = text.find(needle)
        if i < 0:
            # try without assuming exact
            continue
        chunk = text[i : i + len(needle)]
        codes = [f"U+{ord(ch):04X}" if ch == " " or ord(ch) > 127 else ch for ch in chunk]
        spaces = [hex(ord(ch)) for ch in chunk if ch.isspace()]
        print(f"{path.name}: found {needle!r}")
        print("  spaces:", spaces)
        print("  repr:", ascii(chunk))
