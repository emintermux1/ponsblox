"use client";

import { useEffect, useState } from "react";
import { RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from "three";
import { Cap, FloppyEars, Halo, Headphones, Scarf } from "@/components/world/muse-kit";
import { usePerf } from "@/components/world/perf-context";
import { MUSE_FUR_JPG } from "@/lib/world/muse-face";
import type { MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

const FUR = "#f3eee4";
const INK = "#1a1a1a";
const BLUSH = "#f0b4ae";
const HOOD = "#141414";

const textureCache = new Map<string, Texture>();

function useFurMap(): Texture | null {
  const [map, setMap] = useState<Texture | null>(() => textureCache.get(MUSE_FUR_JPG) ?? null);

  useEffect(() => {
    const hit = textureCache.get(MUSE_FUR_JPG);
    if (hit) {
      setMap(hit);
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const loader = new TextureLoader();
    const tex = loader.load(
      MUSE_FUR_JPG,
      (loaded) => {
        loaded.colorSpace = SRGBColorSpace;
        loaded.wrapS = RepeatWrapping;
        loaded.wrapT = RepeatWrapping;
        loaded.repeat.set(2.2, 2.2);
        loaded.anisotropy = 8;
        loaded.needsUpdate = true;
        textureCache.set(MUSE_FUR_JPG, loaded);
        setMap(loaded);
      },
      undefined,
      () => {
        setMap(null);
      },
    );
    return () => {
      if (!textureCache.has(MUSE_FUR_JPG)) {
        tex.dispose();
      }
    };
  }, []);

  return map;
}

function FurSkin() {
  const map = useFurMap();
  return (
    <meshStandardMaterial
      color={FUR}
      map={map ?? undefined}
      roughness={0.92}
      metalness={0.02}
    />
  );
}

function OfficialFace() {
  return (
    <group position={[0, 0.78, 0.214]}>
      <mesh position={[-0.052, 0.018, 0]} scale={[0.5, 1, 0.36]}>
        <sphereGeometry args={[0.02, 12, 10]} />
        <meshStandardMaterial color={INK} roughness={0.28} />
      </mesh>
      <mesh position={[0.052, 0.018, 0]} scale={[0.5, 1, 0.36]}>
        <sphereGeometry args={[0.02, 12, 10]} />
        <meshStandardMaterial color={INK} roughness={0.28} />
      </mesh>
      <mesh position={[-0.1, -0.028, -0.012]} scale={[1.35, 0.68, 0.28]}>
        <sphereGeometry args={[0.028, 10, 8]} />
        <meshStandardMaterial color={BLUSH} transparent opacity={0.42} roughness={0.9} />
      </mesh>
      <mesh position={[0.1, -0.028, -0.012]} scale={[1.35, 0.68, 0.28]}>
        <sphereGeometry args={[0.028, 10, 8]} />
        <meshStandardMaterial color={BLUSH} transparent opacity={0.42} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.058, 0.004]} rotation={[1.2, 0, Math.PI]} scale={[1, 0.72, 1]}>
        <torusGeometry args={[0.026, 0.0036, 8, 16, Math.PI]} />
        <meshStandardMaterial color={INK} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Vest() {
  const { shadows } = usePerf();
  return (
    <mesh castShadow={shadows} position={[0, 0.32, 0.02]} scale={[1.14, 0.62, 1.08]}>
      <sphereGeometry args={[0.26, 20, 16]} />
      <meshStandardMaterial color={HOOD} roughness={0.74} />
    </mesh>
  );
}

function Kit({ id }: { id: MuseId }) {
  switch (id) {
    case "scroller":
      return (
        <group position={[0, 0.8, 0]}>
          <Headphones />
        </group>
      );
    case "trader":
      return (
        <group>
          <Vest />
          <group position={[0, 0.8, 0]}>
            <Cap />
          </group>
        </group>
      );
    case "chill":
      return <Scarf />;
    case "builder":
      return (
        <group position={[0, 0.8, 0]}>
          <Halo />
        </group>
      );
    default:
      return assertNever(id);
  }
}

export function OfficialMuse({ id }: { id: MuseId }) {
  const { shadows } = usePerf();
  return (
    <group userData={{ figure: "official-muse", costume: id }}>
      <mesh castShadow={shadows} position={[0, 0.36, 0]} scale={[1.08, 1.2, 0.94]}>
        <sphereGeometry args={[0.26, 28, 22]} />
        <FurSkin />
      </mesh>
      <mesh castShadow={shadows} position={[0, 0.76, 0.02]} scale={[1.02, 0.98, 0.96]}>
        <sphereGeometry args={[0.24, 28, 22]} />
        <FurSkin />
      </mesh>
      <group position={[0, 0.74, 0]}>
        <FloppyEars />
      </group>
      <mesh castShadow={shadows} position={[-0.26, 0.4, 0.1]} rotation={[0.28, 0, 0.55]} scale={[0.42, 1.08, 0.42]}>
        <sphereGeometry args={[0.1, 14, 12]} />
        <FurSkin />
      </mesh>
      <mesh castShadow={shadows} position={[0.26, 0.4, 0.1]} rotation={[0.28, 0, -0.55]} scale={[0.42, 1.08, 0.42]}>
        <sphereGeometry args={[0.1, 14, 12]} />
        <FurSkin />
      </mesh>
      <OfficialFace />
      <Kit id={id} />
    </group>
  );
}
