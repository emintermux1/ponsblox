"use client";

import { useEffect, useState } from "react";
import { Billboard } from "@react-three/drei";
import { DoubleSide, SRGBColorSpace, Texture, TextureLoader } from "three";
import { musePlushBillboard, musePlushTint } from "@/lib/world/muse-face";
import type { MuseId } from "@/types/world";

const CARD_W = 1.28;
const CARD_H = 1.28;
const textureCache = new Map<string, Texture>();

function usePlushMap(src: string): Texture | null {
  const [map, setMap] = useState<Texture | null>(() => textureCache.get(src) ?? null);

  useEffect(() => {
    const hit = textureCache.get(src);
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
        loaded.anisotropy = 8;
        loaded.needsUpdate = true;
        textureCache.set(src, loaded);
        setMap(loaded);
      },
      undefined,
      () => {
        setMap(null);
      },
    );
    return () => {
      if (!textureCache.has(src)) {
        tex.dispose();
      }
    };
  }, [src]);

  return map;
}

export function MusePlushCard({ id }: { id: MuseId }) {
  const src = musePlushBillboard(id);
  const map = usePlushMap(src);
  const tint = musePlushTint(id);

  return (
    <Billboard follow position={[0, 0.62, 0]}>
      <mesh userData={{ species: "muse-plush", costume: id }}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        {map ? (
          <meshBasicMaterial
            map={map}
            color={tint}
            transparent
            alphaTest={0.08}
            depthWrite
            toneMapped={false}
            side={DoubleSide}
          />
        ) : (
          <meshBasicMaterial color="#f3eee4" toneMapped={false} side={DoubleSide} />
        )}
      </mesh>
    </Billboard>
  );
}
