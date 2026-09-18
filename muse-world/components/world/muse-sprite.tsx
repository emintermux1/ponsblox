"use client";

import { useLayoutEffect } from "react";
import { Billboard, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import { HUG_MUSE_SPRITE, museCostume, museSprite } from "@/lib/world/species";
import type { MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

function planeSize(id: MuseId, hugging: boolean): [number, number] {
  if (hugging) {
    return [1.28, 1.2];
  }
  switch (id) {
    case "scroller":
      return [1.08, 1.16];
    case "trader":
      return [1.16, 1.22];
    case "chill":
      return [1.58, 1.12];
    case "builder":
      return [1.04, 1.32];
    default:
      return assertNever(id);
  }
}

export function MuseSprite({ id, hugging }: { id: MuseId; hugging: boolean }) {
  const textures = useTexture({
    wave: museSprite("scroller"),
    cap: museSprite("trader"),
    scarf: museSprite("chill"),
    halo: museSprite("builder"),
    hug: HUG_MUSE_SPRITE,
  });
  const costume = museCostume(id);
  const map = hugging ? textures.hug : textures[costume];
  const [width, height] = planeSize(id, hugging);

  useLayoutEffect(() => {
    for (const tex of Object.values(textures)) {
      tex.colorSpace = SRGBColorSpace;
      tex.needsUpdate = true;
    }
  }, [textures]);

  return (
    <Billboard follow position={[0, height * 0.52, 0]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={map} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}
