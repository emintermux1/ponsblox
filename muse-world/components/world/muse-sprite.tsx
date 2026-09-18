"use client";

import { Billboard, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import type { MuseId } from "@/types/world";
import { assertNever } from "@/types/world";
import { HUG_MUSE_SPRITE, museSprite } from "@/lib/world/species";

function spriteSize(id: MuseId, seated: boolean, hugging: boolean): [number, number] {
  if (hugging) {
    return [1.05, 1.12];
  }
  switch (id) {
    case "scroller":
      return seated ? [0.92, 0.92] : [1.02, 1.02];
    case "trader":
      return [0.98, 1.18];
    case "chill":
      return [1.42, 0.92];
    case "builder":
      return [0.98, 1.22];
    default:
      return assertNever(id);
  }
}

export function MuseSprite({
  id,
  seated,
  hugging,
}: {
  id: MuseId;
  seated: boolean;
  hugging: boolean;
}) {
  const url = hugging ? HUG_MUSE_SPRITE : museSprite(id);
  const texture = useTexture(url);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  const [width, height] = spriteSize(id, seated, hugging);

  return (
    <Billboard position={[0, height * 0.48, 0.02]} follow>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.12} depthWrite={false} />
      </mesh>
    </Billboard>
  );
}
