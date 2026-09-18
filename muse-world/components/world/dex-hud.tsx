"use client";

import { useTape } from "@/components/world/tape-context";
import { dexEmbedSrc, dexHonesty } from "@/lib/world/dex-embed";
import { tapeHeadline, tapeStamp } from "@/lib/world/tape";

export function DexScreenerHud() {
  const tape = useTape();
  const src = dexEmbedSrc(tape);
  const mark = dexHonesty(tape.source);
  const headline = tape.ticker ?? tapeHeadline(tape);

  return (
    <aside className="loft-dex" data-dex-embed={src ? "live" : "wait"} data-dex-mark={mark}>
      <header className="loft-dex-bar">
        <span>DEXSCREENER</span>
        <span>{headline}</span>
        <span data-hud-mark={mark}>{mark}</span>
        <span>{tapeStamp(tape.source)} · no fills</span>
      </header>
      {src ? (
        <iframe
          title="DexScreener"
          src={src}
          className="loft-dex-frame"
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <p className="loft-dex-wait">
          {tape.source === "sim" ? "SIM · waiting on a public Dex pair" : "LIVE · waiting on a public Dex pair"}
        </p>
      )}
    </aside>
  );
}
