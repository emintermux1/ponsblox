"use client";

export function DexScreenerFrame({
  src,
  mark,
  headline,
  stamp,
}: {
  src: string;
  mark: "SIM" | "REAL";
  headline: string;
  stamp: string;
}) {
  return (
    <>
      <span className="loft-dex-screen-bar">
        DEXSCREENER · {headline} · {mark} · {stamp} · no fills
      </span>
      <iframe
        title="DexScreener"
        src={src}
        className="loft-dex-frame"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </>
  );
}
