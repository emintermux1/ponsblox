"use client";

import { useEffect, useState } from "react";
import { Billboard } from "@react-three/drei";
import { DoubleSide, NoColorSpace, SRGBColorSpace, Texture, TextureLoader } from "three";
import {
  MUSE_PLUSH_ALPHA,
  musePlushBillboard,
  musePlushTint,
} from "@/lib/world/muse-face";
import type { MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

const CARD_W = 1.22;
const CARD_H = 1.22;
const textureCache = new Map<string, Texture>();

function usePlushMap(src: string, kind: "color" | "alpha"): Texture | null {
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
        loaded.colorSpace = kind === "color" ? SRGBColorSpace : NoColorSpace;
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
  }, [kind, src]);

  return map;
}

function PlushGear({ id }: { id: MuseId }) {
  switch (id) {
    case "scroller":
      return (
        <group position={[0, 0.14, 0.04]}>
          <mesh rotation={[0.2, 0, 0]}>
            <torusGeometry args={[0.22, 0.014, 8, 22]} />
            <meshStandardMaterial color="#cfc8bc" roughness={0.42} metalness={0.22} />
          </mesh>
          <mesh position={[-0.22, -0.02, 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.068, 0.074, 0.048, 12]} />
            <meshStandardMaterial color="#d8d2c8" roughness={0.5} />
          </mesh>
          <mesh position={[0.22, -0.02, 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.068, 0.074, 0.048, 12]} />
            <meshStandardMaterial color="#d8d2c8" roughness={0.5} />
          </mesh>
        </group>
      );
    case "trader":
      return (
        <group position={[0, 0.3, 0.03]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#0c1a33" roughness={0.48} />
          </mesh>
          <mesh position={[0, 0.012, 0.15]} rotation={[-0.22, 0, 0]}>
            <boxGeometry args={[0.2, 0.016, 0.1]} />
            <meshStandardMaterial color="#0c1a33" roughness={0.42} />
          </mesh>
        </group>
      );
    case "chill":
      return (
        <group position={[0, -0.08, 0.04]}>
          <mesh rotation={[0.55, 0.12, 0.04]}>
            <torusGeometry args={[0.2, 0.04, 10, 20]} />
            <meshStandardMaterial color="#3f7a4a" roughness={0.82} />
          </mesh>
          <mesh position={[0.12, -0.16, 0.08]} scale={[1.3, 0.65, 0.45]}>
            <sphereGeometry args={[0.048, 10, 8]} />
            <meshStandardMaterial color="#3f7a4a" roughness={0.8} />
          </mesh>
        </group>
      );
    case "builder":
      return (
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2.1, 0, 0]}>
          <torusGeometry args={[0.17, 0.012, 8, 24]} />
          <meshStandardMaterial
            color="#f0d48a"
            emissive="#e8c56a"
            emissiveIntensity={0.85}
            roughness={0.28}
            metalness={0.4}
          />
        </mesh>
      );
    default:
      return assertNever(id);
  }
}

export function MusePlushCard({ id }: { id: MuseId }) {
  const src = musePlushBillboard(id);
  const map = usePlushMap(src, "color");
  const alphaMap = usePlushMap(MUSE_PLUSH_ALPHA, "alpha");
  const tint = musePlushTint(id);

  if (!map || !alphaMap) {
    return null;
  }

  return (
    <Billboard follow position={[0, 0.66, 0]}>
      <mesh>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshBasicMaterial
          map={map}
          alphaMap={alphaMap}
          color={tint}
          transparent
          alphaTest={0.12}
          depthWrite
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      <PlushGear id={id} />
    </Billboard>
  );
}
