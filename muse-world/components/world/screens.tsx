"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CanvasTexture,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three";
import { PLATE, type PlateKind } from "@/lib/world/plates";
import { assertNever } from "@/types/world";

function paintPhone(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#14110e";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#2a241c");
  g.addColorStop(1, "#12100c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const cards = [
    { y: 70, title: "loft diary", body: "someone waved from the sofa" },
    { y: 210, title: "window", body: "blue hour is doing the work" },
    { y: 350, title: "mid", body: "the feed is chewing itself" },
  ];
  cards.forEach((card) => {
    ctx.fillStyle = "#efe6d4";
    roundRect(ctx, 28, card.y, w - 56, 118, 18);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#f3eee4";
    ctx.arc(58, card.y + 32, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1712";
    ctx.beginPath();
    ctx.ellipse(53, card.y + 30, 2.2, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(63, card.y + 30, 2.2, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c4a3e";
    ctx.font = "600 18px Georgia, serif";
    ctx.fillText(card.title, 86, card.y + 38);
    ctx.fillStyle = "#7a6a58";
    ctx.font = "14px Georgia, serif";
    ctx.fillText(card.body, 40, card.y + 78);
  });
  ctx.fillStyle = "#d8c6a6";
  ctx.font = "12px system-ui";
  ctx.fillText("SIM feed · not a live post", 36, h - 28);
}

function paintTape(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#0e1216";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#d7b56a";
  ctx.font = "700 22px system-ui";
  ctx.fillText("SIM TAPE", 28, 42);
  ctx.fillStyle = "#8d8370";
  ctx.font = "14px system-ui";
  ctx.fillText("no fills · watching only", 28, 66);
  let x = 24;
  for (let i = 0; i < 18; i += 1) {
    const up = i % 3 !== 1;
    const bh = 20 + ((i * 17) % 70);
    ctx.fillStyle = up ? "#c9ae7a" : "#6a645c";
    ctx.fillRect(x, 150 - (up ? bh : 10), 12, bh);
    ctx.fillRect(x + 5, 120 - bh, 2, bh + 40);
    x += 28;
  }
  ctx.beginPath();
  ctx.fillStyle = "#f7f7f5";
  ctx.arc(w - 70, 70, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#14110e";
  ctx.beginPath();
  ctx.roundRect(w - 84, 56, 8, 22, 4);
  ctx.roundRect(w - 64, 56, 8, 22, 4);
  ctx.fill();
}

function paintNotes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#ead9c0";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f4ead4";
  ctx.fillRect(24, 24, w - 48, h - 48);
  ctx.fillStyle = "#3a3226";
  ctx.font = "italic 28px Georgia, serif";
  ctx.fillText("desk notes", 48, 80);
  const stickies = [
    { x: 48, y: 110, c: "#f0d4ae", t: "card it" },
    { x: 220, y: 128, c: "#e6d7bc", t: "thread this" },
    { x: 80, y: 210, c: "#d8c6a6", t: "same structure" },
  ];
  stickies.forEach((note) => {
    ctx.fillStyle = note.c;
    ctx.fillRect(note.x, note.y, 150, 70);
    ctx.fillStyle = "#4a3426";
    ctx.font = "18px Georgia, serif";
    ctx.fillText(note.t, note.x + 16, note.y + 42);
  });
}

function paintGrok(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.36;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
  glow.addColorStop(0, "#ffffff");
  glow.addColorStop(1, "#d8d6d2");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#14110e";
  ctx.beginPath();
  ctx.roundRect(cx - 28, cy - 22, 14, 44, 7);
  ctx.roundRect(cx + 14, cy - 22, 14, 44, 7);
  ctx.fill();
}

function paintTv(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#8ea6b8");
  g.addColorStop(1, "#3a2c20");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f3eee4";
  ctx.beginPath();
  ctx.ellipse(w * 0.38, h * 0.58, 90, 110, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f7f5";
  ctx.beginPath();
  ctx.arc(w * 0.62, h * 0.58, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#14110e";
  ctx.beginPath();
  ctx.roundRect(w * 0.62 - 18, h * 0.58 - 16, 10, 28, 5);
  ctx.roundRect(w * 0.62 + 8, h * 0.58 - 16, 10, 28, 5);
  ctx.fill();
}

function paintLaptop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#1b1914";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#efe6d4";
  roundRect(ctx, 40, 36, w - 80, 70, 12);
  ctx.fill();
  ctx.fillStyle = "#5c4a3e";
  ctx.font = "italic 22px Georgia, serif";
  ctx.fillText("window watch", 64, 80);
  ctx.fillStyle = "#2a241c";
  roundRect(ctx, 40, 124, (w - 100) / 2, 140, 12);
  ctx.fill();
  ctx.fillStyle = "#efe6d4";
  ctx.font = "16px Georgia, serif";
  ctx.fillText("headphones on", 58, 170);
  ctx.fillText("checking replies", 58, 198);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintPlate(kind: PlateKind, ctx: CanvasRenderingContext2D, w: number, h: number) {
  switch (kind) {
    case "phone":
      paintPhone(ctx, w, h);
      return;
    case "tape":
      paintTape(ctx, w, h);
      return;
    case "notes":
      paintNotes(ctx, w, h);
      return;
    case "grok":
      paintGrok(ctx, w, h);
      return;
    case "tv":
      paintTv(ctx, w, h);
      return;
    case "laptop":
      paintLaptop(ctx, w, h);
      return;
    default:
      return assertNever(kind);
  }
}

function plateSize(kind: PlateKind): { w: number; h: number } {
  switch (kind) {
    case "phone":
      return { w: 360, h: 640 };
    case "grok":
      return { w: 512, h: 512 };
    case "tape":
    case "notes":
    case "tv":
    case "laptop":
      return { w: 640, h: 360 };
    default:
      return assertNever(kind);
  }
}

export function makePlateCanvas(kind: PlateKind): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const { w, h } = plateSize(kind);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }
  if (typeof ctx.roundRect !== "function") {
    ctx.roundRect = function (x: number, y: number, rw: number, rh: number, r: number | number[]) {
      const radius = typeof r === "number" ? r : r[0] ?? 0;
      roundRect(this, x, y, rw, rh, radius);
    };
  }
  paintPlate(kind, ctx, w, h);
  return canvas;
}

function asMap(canvas: HTMLCanvasElement): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

const loaderCache = new Map<PlateKind, Texture>();

export function usePlateMap(kind: PlateKind): Texture | null {
  const fallback = useMemo(() => {
    const canvas = makePlateCanvas(kind);
    return canvas ? asMap(canvas) : null;
  }, [kind]);
  const [map, setMap] = useState<Texture | null>(fallback);

  useEffect(() => {
    setMap(fallback);
    const cached = loaderCache.get(kind);
    if (cached) {
      setMap(cached);
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const loader = new TextureLoader();
    const tex = loader.load(
      PLATE[kind],
      (loaded) => {
        loaded.colorSpace = SRGBColorSpace;
        loaded.anisotropy = 8;
        loaded.needsUpdate = true;
        loaderCache.set(kind, loaded);
        setMap(loaded);
      },
      undefined,
      () => {
        if (fallback) {
          setMap(fallback);
        }
      },
    );
    return () => {
      if (!loaderCache.has(kind)) {
        tex.dispose();
      }
    };
  }, [fallback, kind]);

  return map;
}

export function ScreenPane({
  kind,
  width,
  height,
  intensity = 0.85,
}: {
  kind: PlateKind;
  width: number;
  height: number;
  intensity?: number;
}) {
  const map = usePlateMap(kind);
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color="#f4ead8"
        map={map ?? undefined}
        emissive="#f2e4c4"
        emissiveMap={map ?? undefined}
        emissiveIntensity={intensity}
        roughness={0.28}
        metalness={0.06}
        toneMapped={false}
      />
    </mesh>
  );
}

export function LitPhone({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh>
        <boxGeometry args={[0.11, 0.2, 0.014]} />
        <meshStandardMaterial color="#1a1712" roughness={0.28} metalness={0.45} />
      </mesh>
      <group position={[0, 0, 0.008]}>
        <ScreenPane kind="phone" width={0.092} height={0.172} intensity={1.05} />
      </group>
    </group>
  );
}

export function LitLaptop({
  plate,
  open = 1.15,
}: {
  plate: PlateKind;
  open?: number;
}) {
  return (
    <group>
      <mesh position={[0, 0.012, 0.02]}>
        <boxGeometry args={[0.42, 0.016, 0.28]} />
        <meshStandardMaterial color="#c8c5be" roughness={0.32} metalness={0.55} />
      </mesh>
      <group position={[0, 0.12, -0.1]} rotation={[-open, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.42, 0.26, 0.012]} />
          <meshStandardMaterial color="#b8b5ae" roughness={0.3} metalness={0.5} />
        </mesh>
        <group position={[0, 0, 0.008]}>
          <ScreenPane kind={plate} width={0.39} height={0.23} intensity={1.1} />
        </group>
      </group>
    </group>
  );
}
