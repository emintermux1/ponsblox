"use client";

import { useLayoutEffect, useRef } from "react";
import { DexScreenerFrame } from "@/components/world/dex-frame";
import { bindDexPane } from "@/components/world/dex-pin";
import { useTape } from "@/components/world/tape-context";
import { dexEmbedSrc, dexHonesty } from "@/lib/world/dex-embed";
import { tapeHeadline, tapeStamp } from "@/lib/world/tape";

export function DexOverlay() {
  const tape = useTape();
  const src = dexEmbedSrc(tape);
  const mark = dexHonesty(tape.source);
  const pane = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    bindDexPane(pane.current);
    return () => bindDexPane(null);
  }, [src]);

  if (!src) {
    return null;
  }

  return (
    <div
      ref={pane}
      className="loft-dex-screen"
      data-dex-embed="live"
      data-dex-mark={mark}
      hidden
    >
      <DexScreenerFrame
        src={src}
        mark={mark}
        headline={tape.ticker ?? tapeHeadline(tape)}
        stamp={tapeStamp(tape.source)}
      />
    </div>
  );
}
