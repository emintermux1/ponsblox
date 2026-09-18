"use client";

import { useEffect, useMemo, useState } from "react";

import {
  asHttpsLogo,
  extractTokenRef,
  logoCandidates,
  resolveTokenLogo,
  tokenLetter,
} from "@/lib/token-logo";

const BOX = {
  xs: "h-4 w-4 text-[7px]",
  sm: "h-6 w-6 text-[8px]",
  md: "h-8 w-8 text-[10px]",
  lg: "h-10 w-10 text-[12px]",
} as const;

export function TokenIcon({
  src,
  mint,
  symbol,
  size = "md",
}: {
  src?: string | null;
  mint?: string | null;
  symbol?: string | null;
  size?: keyof typeof BOX;
}) {
  const ref = extractTokenRef(src, mint);
  const fallbacks = useMemo(() => logoCandidates(src, mint), [src, mint]);
  const [resolved, setResolved] = useState<string | null>(() => asHttpsLogo(src));
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setIndex(0);
    setLoaded(false);
    setResolved(asHttpsLogo(src));
    void resolveTokenLogo(src, mint).then((url) => {
      if (!alive) return;
      const next = asHttpsLogo(url);
      if (!next) return;
      setResolved(next);
      setIndex(0);
      setLoaded(false);
    });
    return () => {
      alive = false;
    };
  }, [src, mint]);

  const urls = useMemo(() => {
    const list: string[] = [];
    const push = (url?: string | null) => {
      const next = asHttpsLogo(url);
      if (next && !list.includes(next)) list.push(next);
    };
    push(resolved);
    for (const url of fallbacks) push(url);
    return list;
  }, [fallbacks, resolved]);

  const current = urls[index] ?? null;
  const letter = tokenLetter(symbol, ref?.address ?? mint);

  return (
    <span
      className={`mf-pfp relative inline-flex ${BOX[size]} shrink-0 overflow-hidden rounded-full bg-card`}
    >
      {current && loaded ? null : (
        <span className="absolute inset-0 grid place-items-center font-semibold uppercase tracking-wide text-ice">
          {letter}
        </span>
      )}
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current}
          src={current}
          alt=""
          referrerPolicy="no-referrer"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setIndex((prev) => prev + 1);
          }}
        />
      ) : null}
    </span>
  );
}
