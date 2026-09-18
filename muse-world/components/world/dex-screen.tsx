"use client";

import { Html } from "@react-three/drei";
import { useTape } from "@/components/world/tape-context";
import { dexEmbedSrc, dexHonesty } from "@/lib/world/dex-embed";
import { tapeHeadline, tapeStamp } from "@/lib/world/tape";

export function DexOnLcd({ width: _width, height: _height }: { width: number; height: number }) {
  const tape = useTape();
  const src = dexEmbedSrc(tape);
  const mark = dexHonesty(tape.source);
  const headline = tape.ticker ?? tapeHeadline(tape);

  if (!src) {
    return null;
  }

  return (
    <Html
      occlude={false}
      center
      sprite
      zIndexRange={[28, 0]}
      style={{ pointerEvents: "auto" }}
    >
      <div className="loft-dex-pane" data-dex-embed="live" data-dex-mark={mark}>
        <span className="loft-dex-screen-bar">
          DEXSCREENER · {headline} · {mark} · {tapeStamp(tape.source)} · no fills
        </span>
        <iframe
          title="DexScreener"
          src={src}
          className="loft-dex-frame"
          allow="fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </Html>
  );
}
