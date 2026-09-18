"use client";

import { useEffect, useState } from "react";
import { RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from "three";

const cache = new Map<string, Texture>();

export function useLoftMap(src: string, repeatX = 1, repeatY = 1): Texture | null {
  const key = `${src}:${repeatX}:${repeatY}`;
  const [map, setMap] = useState<Texture | null>(() => cache.get(key) ?? null);

  useEffect(() => {
    const hit = cache.get(key);
    if (hit) {
      setMap(hit);
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const loader = new TextureLoader();
    const tex = loader.load(
      src,
      (loaded) => {
        loaded.colorSpace = SRGBColorSpace;
        loaded.wrapS = RepeatWrapping;
        loaded.wrapT = RepeatWrapping;
        loaded.repeat.set(repeatX, repeatY);
        loaded.anisotropy = 8;
        loaded.needsUpdate = true;
        cache.set(key, loaded);
        setMap(loaded);
      },
      undefined,
      () => {
        setMap(null);
      },
    );
    return () => {
      if (!cache.has(key)) {
        tex.dispose();
      }
    };
  }, [key, src, repeatX, repeatY]);

  return map;
}
