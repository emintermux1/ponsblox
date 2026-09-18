"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace, type MeshStandardMaterial } from "three";
import { loftPickHandlers } from "@/components/world/loft-cursor";
import { usePerf } from "@/components/world/perf-context";
import { useTape } from "@/components/world/tape-context";
import { formatChange, tapeHeadline, tapeStamp, type TapeView } from "@/lib/world/tape";
import type { PlateKind } from "@/lib/world/plates";
import type { ScreenId } from "@/types/world";
import { assertNever } from "@/types/world";

export type LcdKind = "phone" | "feed" | "tape" | "notes" | "tv";

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

function ensureRoundRect(ctx: CanvasRenderingContext2D) {
  if (typeof ctx.roundRect === "function") {
    return;
  }
  ctx.roundRect = function (x: number, y: number, rw: number, rh: number, r: number | number[]) {
    const radius = typeof r === "number" ? r : r[0] ?? 0;
    roundRect(this, x, y, rw, rh, radius);
  };
}

function lcdSize(kind: LcdKind): { w: number; h: number } {
  switch (kind) {
    case "phone":
      return { w: 360, h: 640 };
    case "feed":
    case "tape":
    case "notes":
    case "tv":
      return { w: 640, h: 360 };
    default:
      return assertNever(kind);
  }
}

function glowFor(kind: LcdKind): string {
  switch (kind) {
    case "phone":
    case "feed":
      return "#e8d4b0";
    case "tape":
      return "#7ec8b0";
    case "notes":
      return "#f0d8b4";
    case "tv":
      return "#9bb6c8";
    default:
      return assertNever(kind);
  }
}

export function lcdFromPlate(kind: PlateKind): LcdKind {
  switch (kind) {
    case "phone":
      return "phone";
    case "tape":
      return "tape";
    case "notes":
      return "notes";
    case "tv":
      return "tv";
    case "laptop":
      return "feed";
    case "grok":
      return "tape";
    default:
      return assertNever(kind);
  }
}

function drawCandles(
  ctx: CanvasRenderingContext2D,
  tape: TapeView,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (tape.candles.length === 0) {
    ctx.fillStyle = "#6a7380";
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.fillText(tape.source === "sim" ? "SIM · no OHLCV" : "LIVE · no OHLCV", x, y + h * 0.52);
    return;
  }
  const highs = tape.candles.map((candle) => candle.h);
  const lows = tape.candles.map((candle) => candle.l);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || 1;
  const gap = w / tape.candles.length;
  const body = Math.max(2, gap * 0.46);
  tape.candles.forEach((candle, index) => {
    const cx = x + index * gap + gap * 0.5;
    const highY = y + ((max - candle.h) / span) * h;
    const lowY = y + ((max - candle.l) / span) * h;
    const openY = y + ((max - candle.o) / span) * h;
    const closeY = y + ((max - candle.c) / span) * h;
    const up = candle.c >= candle.o;
    ctx.strokeStyle = up ? "#7dcea0" : "#c9ae7a";
    ctx.beginPath();
    ctx.moveTo(cx, highY);
    ctx.lineTo(cx, lowY);
    ctx.stroke();
    const top = Math.min(openY, closeY);
    const height = Math.max(2, Math.abs(closeY - openY));
    ctx.fillStyle = up ? "#7dcea0" : "#c9ae7a";
    ctx.fillRect(cx - body / 2, top, body, height);
  });
}

function drawSpark(
  ctx: CanvasRenderingContext2D,
  tape: TapeView,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (tape.candles.length < 2) {
    return;
  }
  const closes = tape.candles.map((candle) => candle.c);
  const max = Math.max(...closes);
  const min = Math.min(...closes);
  const span = max - min || 1;
  ctx.strokeStyle = "#d7c089";
  ctx.lineWidth = 2;
  ctx.beginPath();
  closes.forEach((close, index) => {
    const px = x + (index / (closes.length - 1)) * w;
    const py = y + h - ((close - min) / span) * h;
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  ctx.stroke();
}

function paintPhone(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1c1814");
  g.addColorStop(1, "#0e0c0a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#2a241c";
  ctx.fillRect(0, 0, w, 52);
  ctx.fillStyle = "#cfc6b4";
  ctx.font = "600 13px ui-sans-serif, system-ui";
  ctx.fillText(tapeStamp(tape.source), 22, 34);
  ctx.fillStyle = "#efe6d4";
  ctx.font = "700 28px ui-sans-serif, system-ui";
  ctx.fillText(tapeHeadline(tape), 22, 108);
  ctx.fillStyle = tape.changePct != null && tape.changePct < 0 ? "#c9ae7a" : "#7dcea0";
  ctx.font = "600 16px ui-sans-serif, system-ui";
  ctx.fillText(formatChange(tape.changePct) ?? (tape.source === "sim" ? "fail-open" : "watching"), 22, 136);
  ctx.fillStyle = "#161310";
  roundRect(ctx, 18, 160, w - 36, 150, 16);
  ctx.fill();
  drawCandles(ctx, tape, 32, 178, w - 64, 118);
  const cards = [
    { title: "loft diary", body: "someone waved from the sofa" },
    { title: "window", body: "blue hour is doing the work" },
  ];
  cards.forEach((card, index) => {
    const y = 330 + index * 118;
    ctx.fillStyle = "#efe6d4";
    roundRect(ctx, 22, y, w - 44, 104, 16);
    ctx.fill();
    ctx.fillStyle = "#1a1712";
    ctx.font = "600 16px Georgia, serif";
    ctx.fillText(card.title, 40, y + 38);
    ctx.fillStyle = "#5c4a3e";
    ctx.font = "14px Georgia, serif";
    ctx.fillText(card.body, 40, y + 70);
  });
  ctx.fillStyle = "#8d8370";
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.fillText("no fills", 22, h - 28);
}

function paintFeed(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  ctx.fillStyle = "#14110e";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#efe6d4";
  roundRect(ctx, 24, 22, 220, 44, 12);
  ctx.fill();
  ctx.fillStyle = "#1a1712";
  ctx.font = "700 16px ui-sans-serif, system-ui";
  ctx.fillText(tapeHeadline(tape), 40, 50);
  ctx.fillStyle = "#8d8370";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(tapeStamp(tape.source), 270, 48);
  ctx.fillStyle = "#1b1814";
  roundRect(ctx, 24, 84, 280, 240, 14);
  ctx.fill();
  drawSpark(ctx, tape, 40, 110, 248, 90);
  drawCandles(ctx, tape, 40, 210, 248, 96);
  ctx.fillStyle = "#efe6d4";
  roundRect(ctx, 324, 84, 292, 100, 14);
  ctx.fill();
  ctx.fillStyle = "#1a1712";
  ctx.font = "italic 18px Georgia, serif";
  ctx.fillText("window watch", 344, 128);
  ctx.fillStyle = "#5c4a3e";
  ctx.font = "14px Georgia, serif";
  ctx.fillText(tape.source === "sim" ? "SIM feed · not a live post" : "public tape on the laptop", 344, 158);
  ctx.fillStyle = "#2a241c";
  roundRect(ctx, 324, 200, 292, 124, 14);
  ctx.fill();
  ctx.fillStyle = "#d8c6a6";
  ctx.font = "14px Georgia, serif";
  ctx.fillText("no fills", 344, 248);
  ctx.fillText(tape.ticker ? `${tape.ticker} on the phone too` : "quiet room", 344, 278);
}

function paintTape(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  ctx.fillStyle = "#0c1014";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#d7b56a";
  ctx.font = "700 22px ui-sans-serif, system-ui";
  ctx.fillText(tapeHeadline(tape), 28, 42);
  ctx.fillStyle = "#8d8370";
  ctx.font = "13px ui-sans-serif, system-ui";
  ctx.fillText(`${tapeStamp(tape.source)}  ·  no fills`, 28, 66);
  ctx.fillStyle = "#151a20";
  ctx.fillRect(20, 88, w - 40, h - 116);
  drawCandles(ctx, tape, 36, 104, w - 72, h - 150);
  ctx.fillStyle = "#6a7380";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(tape.ticker ? `${tape.ticker} public book` : "watching only", 28, h - 16);
}

function paintNotes(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  ctx.fillStyle = "#ead9c0";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f4ead4";
  ctx.fillRect(20, 18, w - 40, h - 36);
  ctx.fillStyle = "#3a3226";
  ctx.font = "italic 26px Georgia, serif";
  ctx.fillText("desk notes", 44, 64);
  ctx.fillStyle = "#8d8370";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(tapeStamp(tape.source), 44, 88);
  const stickies = [
    { x: 44, y: 112, c: "#f0d4ae", t: tape.source === "sim" ? "SIM · quiet" : tapeHeadline(tape) },
    { x: 230, y: 128, c: "#e6d7bc", t: "thread this" },
    { x: 80, y: 214, c: "#d8c6a6", t: "same structure" },
  ];
  stickies.forEach((note) => {
    ctx.fillStyle = note.c;
    ctx.fillRect(note.x, note.y, 168, 72);
    ctx.fillStyle = "#4a3426";
    ctx.font = "16px Georgia, serif";
    ctx.fillText(note.t, note.x + 14, note.y + 42);
  });
}

function paintTv(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1a2430");
  g.addColorStop(1, "#0e1216");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, w, 48);
  ctx.fillStyle = "#d7b56a";
  ctx.font = "700 18px ui-sans-serif, system-ui";
  ctx.fillText(tapeHeadline(tape), 28, 32);
  ctx.fillStyle = "#8ea6b8";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(tapeStamp(tape.source), w - 180, 32);
  ctx.fillStyle = "#121820";
  ctx.fillRect(24, 64, w - 48, h - 112);
  drawCandles(ctx, tape, 40, 80, w - 80, h - 150);
  drawSpark(ctx, tape, 40, 80, w - 80, h - 150);
  ctx.fillStyle = "#8d8370";
  ctx.font = "13px ui-sans-serif, system-ui";
  ctx.fillText("public tape  ·  no fills", 28, h - 22);
}

function paintLcd(kind: LcdKind, tape: TapeView): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const { w, h } = lcdSize(kind);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }
  ensureRoundRect(ctx);
  switch (kind) {
    case "phone":
      paintPhone(ctx, w, h, tape);
      return canvas;
    case "feed":
      paintFeed(ctx, w, h, tape);
      return canvas;
    case "tape":
      paintTape(ctx, w, h, tape);
      return canvas;
    case "notes":
      paintNotes(ctx, w, h, tape);
      return canvas;
    case "tv":
      paintTv(ctx, w, h, tape);
      return canvas;
    default:
      return assertNever(kind);
  }
}

function asMap(canvas: HTMLCanvasElement): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function useLiveMap(kind: LcdKind, tape: TapeView): CanvasTexture | null {
  const map = useMemo(() => {
    const canvas = paintLcd(kind, tape);
    return canvas ? asMap(canvas) : null;
  }, [kind, tape]);

  useEffect(() => {
    return () => {
      map?.dispose();
    };
  }, [map]);

  return map;
}

export function LiveLcd({
  kind,
  width,
  height,
  intensity = 1.15,
}: {
  kind: LcdKind;
  width: number;
  height: number;
  intensity?: number;
}) {
  const tape = useTape();
  const map = useLiveMap(kind, tape);
  const material = useRef<MeshStandardMaterial>(null);
  const { extraLights } = usePerf();

  useFrame((state) => {
    if (!material.current) {
      return;
    }
    material.current.emissiveIntensity = intensity * (0.96 + Math.sin(state.clock.elapsedTime * 1.7) * 0.04);
  });

  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          ref={material}
          map={map ?? undefined}
          color="#f4ead8"
          emissive="#f2e4c4"
          emissiveMap={map ?? undefined}
          emissiveIntensity={intensity}
          roughness={0.18}
          metalness={0.04}
          toneMapped={false}
        />
      </mesh>
      {extraLights ? (
        <pointLight
          position={[0, 0, 0.14]}
          intensity={kind === "tv" ? 0.85 : 0.55}
          color={glowFor(kind)}
          distance={Math.max(width, height) * (kind === "tv" ? 3.2 : 2.6)}
          decay={2}
        />
      ) : null}
    </group>
  );
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
  return <LiveLcd kind={lcdFromPlate(kind)} width={width} height={height} intensity={intensity} />;
}

export function PhoneDevice({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh>
        <boxGeometry args={[0.078, 0.162, 0.009]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.28} metalness={0.62} />
      </mesh>
      <mesh position={[0.041, 0.02, 0]}>
        <boxGeometry args={[0.003, 0.028, 0.004]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[-0.041, 0.018, 0]}>
        <boxGeometry args={[0.003, 0.036, 0.004]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.4} metalness={0.5} />
      </mesh>
      <group position={[0, 0, 0.0052]}>
        <LiveLcd kind="phone" width={0.07} height={0.148} intensity={1.45} />
      </group>
      <mesh position={[0, 0.068, 0.006]}>
        <boxGeometry args={[0.022, 0.007, 0.002]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.22} metalness={0.7} />
      </mesh>
    </group>
  );
}

export function LaptopDevice({
  kind,
  open = 1.12,
}: {
  kind: "feed" | "tape" | "notes";
  open?: number;
}) {
  return (
    <group>
      <mesh position={[0, 0.008, 0.01]}>
        <boxGeometry args={[0.42, 0.012, 0.28]} />
        <meshStandardMaterial color="#c8c5be" roughness={0.3} metalness={0.58} />
      </mesh>
      <mesh position={[0, 0.015, 0.03]}>
        <boxGeometry args={[0.38, 0.003, 0.16]} />
        <meshStandardMaterial color="#1b1b1d" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.015, 0.11]}>
        <boxGeometry args={[0.1, 0.002, 0.06]} />
        <meshStandardMaterial color="#b8b5ae" roughness={0.35} metalness={0.45} />
      </mesh>
      <group position={[0, 0.13, -0.12]} rotation={[-open, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.42, 0.27, 0.01]} />
          <meshStandardMaterial color="#b0ada6" roughness={0.28} metalness={0.52} />
        </mesh>
        <mesh position={[0, 0.128, 0.002]}>
          <boxGeometry args={[0.03, 0.006, 0.004]} />
          <meshStandardMaterial color="#1a1a1c" roughness={0.3} metalness={0.6} />
        </mesh>
        <group position={[0, 0, 0.006]}>
          <LiveLcd kind={kind} width={0.388} height={0.236} intensity={1.2} />
        </group>
      </group>
    </group>
  );
}

export function MonitorDevice({
  kind,
  position,
  active = false,
  onInspect,
}: {
  kind: ScreenId;
  position?: [number, number, number];
  active?: boolean;
  onInspect?: (id: ScreenId) => void;
}) {
  return (
    <group
      position={position}
      {...(onInspect ? loftPickHandlers(() => onInspect(kind)) : {})}
    >
      <mesh position={[0, -0.4, 0.02]}>
        <boxGeometry args={[0.28, 0.02, 0.16]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[0.04, 0.34, 0.03]} />
        <meshStandardMaterial color="#161618" roughness={0.38} metalness={0.5} />
      </mesh>
      <group rotation={[-0.1, 0, 0]}>
        <mesh position={[0, 0, 0.04]} visible={false}>
          <planeGeometry args={[1.08, 0.72]} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.94, 0.58, 0.028]} />
          <meshStandardMaterial color="#121214" roughness={0.32} metalness={0.48} />
        </mesh>
        <mesh position={[0, -0.26, 0.01]}>
          <boxGeometry args={[0.94, 0.04, 0.03]} />
          <meshStandardMaterial color="#0c0c0e" roughness={0.4} metalness={0.4} />
        </mesh>
        <group position={[0, 0.01, 0.016]}>
          <LiveLcd kind={kind} width={0.86} height={0.5} intensity={active ? 1.28 : 1.08} />
        </group>
      </group>
    </group>
  );
}

export function TvDevice() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[2.18, 1.24, 0.05]} />
        <meshStandardMaterial color="#101012" roughness={0.34} metalness={0.42} />
      </mesh>
      <mesh position={[0, -0.58, 0.01]}>
        <boxGeometry args={[2.18, 0.06, 0.055]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.42} metalness={0.35} />
      </mesh>
      <group position={[0, 0.02, 0.028]}>
        <LiveLcd kind="tv" width={2.04} height={1.1} intensity={1.05} />
      </group>
    </group>
  );
}

export function LitPhone({ scale = 1 }: { scale?: number }) {
  return <PhoneDevice scale={scale} />;
}

function laptopKindFromPlate(plate: PlateKind): "feed" | "tape" | "notes" {
  const lcd = lcdFromPlate(plate);
  switch (lcd) {
    case "feed":
    case "phone":
      return "feed";
    case "notes":
      return "notes";
    case "tape":
    case "tv":
      return "tape";
    default:
      return assertNever(lcd);
  }
}

export function LitLaptop({
  plate,
  open = 1.12,
}: {
  plate: PlateKind;
  open?: number;
}) {
  return <LaptopDevice kind={laptopKindFromPlate(plate)} open={open} />;
}
