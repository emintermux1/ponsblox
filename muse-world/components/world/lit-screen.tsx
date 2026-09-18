"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type MeshStandardMaterial,
} from "three";
import { assertNever } from "@/types/world";

export type ScreenKind = "feed" | "chart" | "notes" | "phone" | "tv";

function screenSrc(kind: ScreenKind): string {
  switch (kind) {
    case "feed":
      return "/screens/feed.jpg";
    case "chart":
      return "/screens/chart.jpg";
    case "notes":
      return "/screens/notes.jpg";
    case "phone":
      return "/screens/phone.jpg";
    case "tv":
      return "/screens/tv.jpg";
    default:
      return assertNever(kind);
  }
}

function fallbackColor(kind: ScreenKind): string {
  switch (kind) {
    case "feed":
    case "phone":
      return "#f4ead4";
    case "chart":
      return "#3d7a72";
    case "notes":
      return "#f7f0dd";
    case "tv":
      return "#f3ddb8";
    default:
      return assertNever(kind);
  }
}

function glowColor(kind: ScreenKind): string {
  switch (kind) {
    case "feed":
    case "phone":
      return "#f0e2c4";
    case "chart":
      return "#7dcea0";
    case "notes":
      return "#f6edd4";
    case "tv":
      return "#f0d4ae";
    default:
      return assertNever(kind);
  }
}

function paintFallback(kind: ScreenKind): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  const tall = kind === "phone";
  canvas.width = tall ? 384 : 640;
  canvas.height = tall ? 680 : 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }
  switch (kind) {
    case "feed":
    case "phone": {
      ctx.fillStyle = "#f6efe2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#efe4cf";
      ctx.fillRect(0, 0, canvas.width, 48);
      for (let i = 0; i < 4; i += 1) {
        const y = 70 + i * (tall ? 140 : 72);
        ctx.fillStyle = "#fffdf8";
        ctx.fillRect(24, y, canvas.width - 48, tall ? 120 : 58);
        ctx.beginPath();
        ctx.fillStyle = "#e6d3b0";
        ctx.arc(52, y + 28, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d8c4a0";
        ctx.fillRect(78, y + 18, canvas.width * 0.42, 8);
        ctx.fillRect(78, y + 34, canvas.width * 0.28, 6);
      }
      break;
    }
    case "chart": {
      ctx.fillStyle = "#1e3a42";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(232,210,150,0.18)";
      for (let x = 40; x < canvas.width; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, canvas.height - 20);
        ctx.stroke();
      }
      ctx.strokeStyle = "#d7c089";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(36, canvas.height * 0.62);
      for (let x = 36; x < canvas.width - 24; x += 18) {
        const y = canvas.height * 0.55 + Math.sin(x * 0.04) * 42;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#7dcea0";
      for (let i = 0; i < 14; i += 1) {
        const x = 48 + i * 40;
        const up = i % 3 !== 1;
        const h = 18 + ((i * 17) % 36);
        ctx.fillStyle = up ? "#7dcea0" : "#e8b07a";
        ctx.fillRect(x, canvas.height * 0.58 - (up ? h : 0), 10, h);
      }
      ctx.fillStyle = "#f4ead4";
      ctx.font = "22px sans-serif";
      ctx.fillText("SIM", 28, 36);
      break;
    }
    case "notes": {
      ctx.fillStyle = "#f7f0dd";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f3cfc0";
      ctx.fillRect(40, 36, 120, 110);
      ctx.fillStyle = "#d7ead4";
      ctx.fillRect(420, 160, 130, 110);
      ctx.fillStyle = "#e6d3a8";
      ctx.beginPath();
      ctx.arc(320, 180, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c9ae7a";
      ctx.beginPath();
      ctx.arc(320, 128, 22, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case "tv": {
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, "#f7e7c8");
      sky.addColorStop(1, "#f3c9a0");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f4ead4";
      ctx.beginPath();
      ctx.ellipse(320, 210, 90, 110, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1b1914";
      ctx.beginPath();
      ctx.ellipse(300, 190, 6, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(340, 190, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0c0b4";
      ctx.beginPath();
      ctx.ellipse(286, 208, 10, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(354, 208, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
      return assertNever(kind);
  }
  return canvas;
}

function asMap(canvas: HTMLCanvasElement): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function useScreenMap(kind: ScreenKind): Texture | null {
  const fallback = useMemo(() => {
    const canvas = paintFallback(kind);
    return canvas ? asMap(canvas) : null;
  }, [kind]);
  const [loaded, setLoaded] = useState<Texture | null>(null);

  useEffect(() => {
    const loader = new TextureLoader();
    let disposed = false;
    const tex = loader.load(
      screenSrc(kind),
      (next) => {
        if (disposed) {
          next.dispose();
          return;
        }
        next.colorSpace = SRGBColorSpace;
        next.anisotropy = 8;
        next.needsUpdate = true;
        setLoaded(next);
      },
      undefined,
      () => {
        if (!disposed) {
          setLoaded(null);
        }
      },
    );
    return () => {
      disposed = true;
      tex.dispose();
    };
  }, [kind]);

  useEffect(() => {
    return () => {
      fallback?.dispose();
    };
  }, [fallback]);

  return loaded ?? fallback;
}

export function LitScreen({
  kind,
  width,
  height,
  intensity = 1.4,
}: {
  kind: ScreenKind;
  width: number;
  height: number;
  intensity?: number;
}) {
  const map = useScreenMap(kind);
  const material = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!material.current) {
      return;
    }
    const pulse = 0.94 + Math.sin(state.clock.elapsedTime * 2.15) * 0.06;
    material.current.emissiveIntensity = intensity * pulse;
  });

  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          ref={material}
          map={map ?? undefined}
          color={map ? "#ffffff" : fallbackColor(kind)}
          emissive={map ? "#ffffff" : fallbackColor(kind)}
          emissiveMap={map ?? undefined}
          emissiveIntensity={intensity}
          roughness={0.22}
          metalness={0.04}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[0, 0, 0.12]}
        intensity={0.55}
        color={glowColor(kind)}
        distance={Math.max(width, height) * 2.4}
        decay={2}
      />
    </group>
  );
}
