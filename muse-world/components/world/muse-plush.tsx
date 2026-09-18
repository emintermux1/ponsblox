"use client";

import { useEffect, useMemo, useState } from "react";
import { Billboard } from "@react-three/drei";
import {
  CanvasTexture,
  DoubleSide,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three";
import type { MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

export const MUSE_PLUSH_JPG = "/muse/muse-plush.jpg";
export const MUSE_PLUSH_HALO_JPG = "/muse/muse-plush-halo.jpg";

export function musePlushPhoto(id: MuseId): string {
  switch (id) {
    case "builder":
      return MUSE_PLUSH_HALO_JPG;
    case "scroller":
    case "trader":
    case "chill":
      return MUSE_PLUSH_JPG;
    default:
      return assertNever(id);
  }
}

export function musePlushTint(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "#fff1dc";
    case "trader":
      return "#d5d0ee";
    case "chill":
      return "#dcecd8";
    case "builder":
      return "#fff3cc";
    default:
      return assertNever(id);
  }
}

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

function makeSoftAlpha(): CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("plush alpha canvas");
  }
  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.3,
    size * 0.5,
    size * 0.48,
    size * 0.5,
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.72, "#ffffff");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function PlushGear({ id }: { id: MuseId }) {
  switch (id) {
    case "scroller":
      return (
        <group position={[0, 0.16, 0.03]}>
          <mesh rotation={[0.22, 0, 0]}>
            <torusGeometry args={[0.23, 0.015, 8, 22]} />
            <meshStandardMaterial color="#cfc8bc" roughness={0.42} metalness={0.22} />
          </mesh>
        </group>
      );
    case "trader":
      return (
        <group position={[0, 0.28, 0.02]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#0c1a33" roughness={0.48} />
          </mesh>
        </group>
      );
    case "chill":
      return (
        <group position={[0, -0.04, 0.03]}>
          <mesh rotation={[0.55, 0.12, 0.04]}>
            <torusGeometry args={[0.2, 0.042, 10, 20]} />
            <meshStandardMaterial color="#3f7a4a" roughness={0.82} />
          </mesh>
        </group>
      );
    case "builder":
      return (
        <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2.1, 0, 0]}>
          <torusGeometry args={[0.17, 0.012, 8, 24]} />
          <meshStandardMaterial color="#f0d48a" emissive="#e8c56a" emissiveIntensity={0.85} roughness={0.28} metalness={0.4} />
        </mesh>
      );
    default:
      return assertNever(id);
  }
}

export function MusePlushCard({ id }: { id: MuseId }) {
  const src = musePlushPhoto(id);
  const map = usePlushMap(src);
  const tint = musePlushTint(id);
  const alphaMap = useMemo(() => {
    if (typeof document === "undefined") {
      return null;
    }
    return makeSoftAlpha();
  }, []);
  if (!map) {
    return null;
  }
  return (
    <Billboard follow position={[0, 0.68, 0]}>
      <mesh>
        <planeGeometry args={[1.16, 1.16]} />
        <meshBasicMaterial
          map={map}
          color={tint}
          alphaMap={alphaMap ?? undefined}
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
