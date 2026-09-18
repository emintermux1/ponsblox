"use client";

import { useMemo } from "react";
import { DeskKit, LoungeKit } from "@/components/world/devices";
import { LoftArt } from "@/components/world/loft-art";
import { useLoftMap } from "@/components/world/loft-maps";
import { usePerf } from "@/components/world/perf-context";
import { ScreenPane } from "@/components/world/screens";
import { ART } from "@/lib/world/art";

export function LoftSurfaces() {
  const { shadows } = usePerf();
  const floor = useLoftMap(ART.walnutFloor, 4, 3);
  const wall = useLoftMap(ART.walnutWall, 2, 1);
  const city = useLoftMap(ART.cityDusk);
  const floorColor = useMemo(() => (floor ? "#c4a07a" : "#8a5a38"), [floor]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.4]} receiveShadow={shadows}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial
          color={floorColor}
          map={floor ?? undefined}
          roughness={0.4}
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
      <mesh position={[0, 2.35, -7.28]}>
        <planeGeometry args={[28, 9.2]} />
        <meshBasicMaterial color="#8ea6b8" map={city ?? undefined} toneMapped={false} />
      </mesh>
      <group position={[-9.62, 2.15, 1.1]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[2.18, 1.24, 0.06]} />
          <meshStandardMaterial color="#161513" roughness={0.35} metalness={0.4} />
        </mesh>
        <group position={[0, 0, 0.036]}>
          <ScreenPane kind="tv" width={2.04} height={1.12} intensity={1.05} />
        </group>
      </group>
      <DeskKit />
      <LoungeKit />
      <LoftArt />
    </group>
  );
}
