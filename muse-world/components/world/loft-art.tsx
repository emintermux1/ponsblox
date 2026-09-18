"use client";

import { useEffect, useMemo, useState } from "react";
import { Billboard } from "@react-three/drei";
import { SRGBColorSpace, Texture, TextureLoader } from "three";
import { usePerf } from "@/components/world/perf-context";
import { type MuseArtId, museArtSrc } from "@/lib/world/art";
import { assertNever } from "@/types/world";

const cache = new Map<MuseArtId, Texture>();

function useArtMap(id: MuseArtId): Texture | null {
  const [map, setMap] = useState<Texture | null>(() => cache.get(id) ?? null);

  useEffect(() => {
    const cached = cache.get(id);
    if (cached) {
      setMap(cached);
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const loader = new TextureLoader();
    let disposed = false;
    const tex = loader.load(
      museArtSrc(id),
      (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = SRGBColorSpace;
        loaded.anisotropy = 8;
        loaded.needsUpdate = true;
        cache.set(id, loaded);
        setMap(loaded);
      },
      undefined,
      () => {
        if (!disposed) {
          setMap(null);
        }
      },
    );
    return () => {
      disposed = true;
      if (!cache.has(id)) {
        tex.dispose();
      }
    };
  }, [id]);

  return map;
}

function ArtFill({
  id,
  width,
  height,
  emissive = 0.22,
}: {
  id: MuseArtId;
  width: number;
  height: number;
  emissive?: number;
}) {
  const map = useArtMap(id);
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={map ? "#ffffff" : "#efe6d4"}
        map={map ?? undefined}
        emissive={map ? "#f2e4c4" : "#d8c6a6"}
        emissiveMap={map ?? undefined}
        emissiveIntensity={emissive}
        roughness={0.42}
        metalness={0.04}
        toneMapped={false}
      />
    </mesh>
  );
}

function Frame({
  width,
  height,
  depth = 0.04,
}: {
  width: number;
  height: number;
  depth?: number;
}) {
  const { shadows } = usePerf();
  const rail = 0.045;
  return (
    <group>
      <mesh position={[0, 0, -depth / 2]} castShadow={shadows}>
        <boxGeometry args={[width + rail * 2, height + rail * 2, depth]} />
        <meshStandardMaterial color="#2a241c" roughness={0.48} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <boxGeometry args={[width + 0.012, height + 0.012, 0.008]} />
        <meshStandardMaterial color="#c8c5be" roughness={0.32} metalness={0.55} />
      </mesh>
    </group>
  );
}

function FramedDecal({
  id,
  position,
  rotation,
  width,
  height,
}: {
  id: MuseArtId;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Frame width={width} height={height} />
      <group position={[0, 0, 0.012]}>
        <ArtFill id={id} width={width} height={height} />
      </group>
    </group>
  );
}

function CircleSprite({
  id,
  position,
  rotation,
  size,
}: {
  id: MuseArtId;
  position: [number, number, number];
  rotation?: [number, number, number];
  size: number;
}) {
  const map = useArtMap(id);
  const { shadows } = usePerf();
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow={shadows} position={[0, 0, -0.012]}>
        <circleGeometry args={[size * 0.52, 40]} />
        <meshStandardMaterial color="#1a1712" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh>
        <circleGeometry args={[size * 0.5, 40]} />
        <meshStandardMaterial
          color={map ? "#ffffff" : "#f3eee4"}
          map={map ?? undefined}
          roughness={0.36}
          metalness={0.06}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function CityBillboard() {
  const { shadows } = usePerf();
  return (
    <group position={[0.2, 3.55, -7.72]}>
      <mesh position={[0, -1.7, -0.08]} castShadow={shadows}>
        <boxGeometry args={[0.16, 3.2, 0.16]} />
        <meshStandardMaterial color="#6a6762" metalness={0.72} roughness={0.34} />
      </mesh>
      <mesh position={[-3.4, -1.7, -0.08]} castShadow={shadows}>
        <boxGeometry args={[0.16, 3.2, 0.16]} />
        <meshStandardMaterial color="#6a6762" metalness={0.72} roughness={0.34} />
      </mesh>
      <mesh position={[3.4, -1.7, -0.08]} castShadow={shadows}>
        <boxGeometry args={[0.16, 3.2, 0.16]} />
        <meshStandardMaterial color="#6a6762" metalness={0.72} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0, -0.05]} castShadow={shadows}>
        <boxGeometry args={[7.35, 3.15, 0.08]} />
        <meshStandardMaterial color="#161513" roughness={0.4} metalness={0.28} />
      </mesh>
      <group position={[0, 0, 0.02]}>
        <ArtFill id="banner" width={7.05} height={2.92} emissive={0.38} />
      </group>
    </group>
  );
}

function WallTelevision() {
  const { shadows } = usePerf();
  return (
    <group position={[-9.78, 2.28, 1.15]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow={shadows}>
        <boxGeometry args={[2.28, 1.28, 0.07]} />
        <meshStandardMaterial color="#161513" roughness={0.32} metalness={0.42} />
      </mesh>
      <group position={[0, 0, 0.04]}>
        <ArtFill id="banner" width={2.12} height={1.14} emissive={0.72} />
      </group>
    </group>
  );
}

function DeskPlate({
  position,
  art,
}: {
  position: [number, number, number];
  art: MuseArtId;
}) {
  return (
    <group position={position} rotation={[-0.1, 0, 0]}>
      <group position={[0, 0, 0.03]}>
        <ArtFill id={art} width={0.86} height={0.5} emissive={0.85} />
      </group>
    </group>
  );
}

function denseArt(lod: "dense" | "sparse"): boolean {
  switch (lod) {
    case "dense":
      return true;
    case "sparse":
      return false;
    default:
      return assertNever(lod);
  }
}

export function LoftArt() {
  const { cityLod } = usePerf();
  const extras = useMemo(() => denseArt(cityLod), [cityLod]);

  return (
    <group>
      <CityBillboard />
      <WallTelevision />
      <DeskPlate position={[2.82, 1.2, -1.13]} art="hug" />
      <DeskPlate position={[4.02, 1.2, -1.13]} art="grok" />
      <FramedDecal
        id="hug"
        position={[-9.78, 2.42, -2.15]}
        rotation={[0, Math.PI / 2, 0]}
        width={1.42}
        height={1.42}
      />
      <FramedDecal
        id="halo"
        position={[9.78, 2.35, 2.35]}
        rotation={[0, -Math.PI / 2, 0]}
        width={1.05}
        height={1.4}
      />
      <FramedDecal
        id="laptop"
        position={[9.78, 2.05, -1.55]}
        rotation={[0, -Math.PI / 2, 0]}
        width={1.18}
        height={1.18}
      />
      <CircleSprite id="grok" position={[2.05, 2.08, -4.42]} size={0.72} />
      <CircleSprite
        id="hug"
        position={[-6.85, 2.55, 6.18]}
        rotation={[0, Math.PI, 0]}
        size={0.86}
      />
      {extras ? (
        <>
          <Billboard position={[-5.15, 1.55, 3.85]} follow>
            <ArtFill id="hug" width={0.78} height={0.78} emissive={0.18} />
          </Billboard>
          <group position={[-7.15, 0.92, 4.55]} rotation={[0, 0.85, 0]}>
            <mesh position={[0, 0.02, 0.02]} rotation={[0.18, 0, 0]}>
              <boxGeometry args={[0.82, 1.02, 0.03]} />
              <meshStandardMaterial color="#4a3426" roughness={0.62} />
            </mesh>
            <group position={[0, 0.04, 0.04]} rotation={[0.18, 0, 0]}>
              <ArtFill id="halo" width={0.7} height={0.9} />
            </group>
          </group>
        </>
      ) : null}
    </group>
  );
}
