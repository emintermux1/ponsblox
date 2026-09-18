"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { ART } from "@/lib/world/art";
import { usePerf } from "@/components/world/perf-context";
import { ScreenPane } from "@/components/world/screens";

function useArtTexture(src: string, repeatX = 1, repeatY = 1): Texture | null {
  const [map, setMap] = useState<Texture | null>(null);

  useEffect(() => {
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
        setMap(loaded);
      },
      undefined,
      () => {
        setMap(null);
      },
    );
    return () => {
      tex.dispose();
    };
  }, [repeatX, repeatY, src]);

  return map;
}

export function LoftSurfaces() {
  const { shadows } = usePerf();
  const floor = useArtTexture(ART.walnutFloor, 4, 3);
  const wall = useArtTexture(ART.walnutWall, 2, 1);
  const city = useArtTexture(ART.cityDusk);
  const floorColor = useMemo(() => (floor ? "#c4a07a" : "#6a4a32"), [floor]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.018, 0.4]}
        receiveShadow={shadows}
      >
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial
          color={floorColor}
          map={floor ?? undefined}
          roughness={0.42}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[-9.78, 2.35, 0.4]} receiveShadow={shadows}>
        <boxGeometry args={[0.08, 4.5, 11.6]} />
        <meshStandardMaterial
          color="#6b4a32"
          map={wall ?? undefined}
          roughness={0.62}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[9.78, 2.35, 0.4]} receiveShadow={shadows}>
        <boxGeometry args={[0.08, 4.5, 11.6]} />
        <meshStandardMaterial
          color="#6b4a32"
          map={wall ?? undefined}
          roughness={0.62}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[0, 2.2, -7.35]}>
        <planeGeometry args={[26, 8.4]} />
        <meshBasicMaterial
          color="#8ea6b8"
          map={city ?? undefined}
          toneMapped={false}
        />
      </mesh>
      <group position={[-9.62, 2.15, 1.1]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[2.15, 1.22, 0.06]} />
          <meshStandardMaterial color="#161513" roughness={0.35} metalness={0.4} />
        </mesh>
        <group position={[0, 0, 0.036]}>
          <ScreenPane kind="tv" width={2.02} height={1.1} intensity={0.95} />
        </group>
      </group>
    </group>
  );
}
