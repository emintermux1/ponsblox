"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, SRGBColorSpace } from "three";
import { loftPickHandlers } from "@/components/world/loft-cursor";
import { useTape } from "@/components/world/tape-context";
import { screenTapeHeader, screenTapeRows } from "@/lib/world/screen-tape";
import { type TapeView } from "@/lib/world/tape";
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
      return { w: 512, h: 900 };
    case "feed":
    case "tape":
    case "notes":
    case "tv":
      return { w: 1024, h: 576 };
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

function drawSparkCloses(
  ctx: CanvasRenderingContext2D,
  closes: number[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (closes.length < 2) {
    return;
  }
  const max = Math.max(...closes);
  const min = Math.min(...closes);
  const span = max - min || 1;
  ctx.strokeStyle = "#f0d4ae";
  ctx.lineWidth = 3;
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

function paintRowTape(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tape: TapeView,
  portrait: boolean,
) {
  ctx.fillStyle = "#24506c";
  ctx.fillRect(0, 0, w, h);
  const headH = portrait ? 72 : 64;
  ctx.fillStyle = "#f6ecd8";
  ctx.fillRect(0, 0, w, headH);
  ctx.fillStyle = "#1a1712";
  ctx.font = `800 ${portrait ? 34 : 32}px ui-sans-serif, system-ui`;
  ctx.fillText(screenTapeHeader(tape), 22, portrait ? 48 : 44);
  ctx.font = `600 ${portrait ? 16 : 15}px ui-sans-serif, system-ui`;
  ctx.fillStyle = "#5c4a3e";
  ctx.fillText(tape.source === "sim" ? "quiet · no fills" : "live · no fills", w * 0.42, portrait ? 46 : 42);

  const rows = screenTapeRows(tape);
  const top = headH + 16;
  if (rows.length === 0) {
    for (let i = 0; i < 3; i += 1) {
      const y = top + i * (portrait ? 88 : 72);
      ctx.fillStyle = "rgba(246,236,216,0.14)";
      ctx.fillRect(16, y, w - 32, portrait ? 76 : 62);
      ctx.fillStyle = "#d7c6a6";
      ctx.font = `700 ${portrait ? 40 : 36}px ui-sans-serif, system-ui`;
      ctx.fillText("—", 36, y + (portrait ? 50 : 42));
      ctx.font = `600 ${portrait ? 18 : 16}px ui-sans-serif, system-ui`;
      ctx.fillText("sim", w * 0.68, y + (portrait ? 48 : 40));
    }
    return;
  }

  const rowH = Math.min(portrait ? 96 : 80, (h - top - 20) / Math.max(rows.length, 3));
  rows.forEach((row, index) => {
    const y = top + index * rowH;
    ctx.fillStyle = index % 2 === 0 ? "rgba(246,236,216,0.16)" : "rgba(246,236,216,0.08)";
    ctx.fillRect(14, y, w - 28, rowH - 8);
    ctx.fillStyle = "#fff8ea";
    ctx.font = `800 ${Math.floor(rowH * 0.46)}px ui-sans-serif, system-ui`;
    ctx.fillText(row.ticker, 28, y + rowH * 0.58);
    ctx.fillStyle = row.change?.startsWith("-") ? "#f0c08a" : "#9be7b8";
    ctx.font = `800 ${Math.floor(rowH * 0.38)}px ui-sans-serif, system-ui`;
    ctx.fillText(row.change ?? "—", w * 0.4, y + rowH * 0.58);
    ctx.fillStyle = "#f0d4ae";
    ctx.font = `700 ${Math.floor(rowH * 0.26)}px ui-sans-serif, system-ui`;
    ctx.fillText(row.source, w * 0.68, y + rowH * 0.56);
    if (row.spark.length >= 2) {
      drawSparkCloses(ctx, row.spark, w * 0.8, y + 10, w * 0.16, rowH - 24);
    }
  });
}

function paintPhone(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  paintRowTape(ctx, w, h, tape, true);
}

function paintFeed(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  paintRowTape(ctx, w, h, tape, false);
}

function paintTape(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  paintRowTape(ctx, w, h, tape, false);
}

function paintNotes(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  paintRowTape(ctx, w, h, tape, false);
}

function paintTv(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  paintRowTape(ctx, w, h, tape, false);
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
  wash = 0.55,
}: {
  kind: LcdKind;
  width: number;
  height: number;
  intensity?: number;
  wash?: number;
}) {
  const tape = useTape();
  const map = useLiveMap(kind, tape);

  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={map ?? undefined}
          color={map ? "#ffffff" : "#24506c"}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[0, 0, 0.12]}
        intensity={0.55 + intensity * 0.2 + wash * 0.15}
        color={glowFor(kind)}
        distance={Math.max(width, height) * 2.8}
        decay={2}
      />
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

function PhoneKeys() {
  return (
    <>
      <mesh position={[0.041, 0.028, 0]}>
        <boxGeometry args={[0.0026, 0.018, 0.0036]} />
        <meshStandardMaterial color="#2c2c30" roughness={0.38} metalness={0.55} />
      </mesh>
      <mesh position={[-0.041, 0.034, 0]}>
        <boxGeometry args={[0.0026, 0.014, 0.0036]} />
        <meshStandardMaterial color="#2c2c30" roughness={0.38} metalness={0.55} />
      </mesh>
      <mesh position={[-0.041, 0.012, 0]}>
        <boxGeometry args={[0.0026, 0.02, 0.0036]} />
        <meshStandardMaterial color="#2c2c30" roughness={0.38} metalness={0.55} />
      </mesh>
    </>
  );
}

export function PhoneDevice({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <RoundedBox args={[0.08, 0.166, 0.01]} radius={0.01} smoothness={4}>
        <meshStandardMaterial color="#1a1a1d" roughness={0.26} metalness={0.68} />
      </RoundedBox>
      <RoundedBox args={[0.074, 0.158, 0.0024]} radius={0.008} smoothness={4} position={[0, 0, 0.0046]}>
        <meshStandardMaterial color="#24506c" roughness={0.2} metalness={0.55} />
      </RoundedBox>
      <group position={[0, -0.004, 0.006]}>
        <LiveLcd kind="phone" width={0.068} height={0.142} intensity={1.5} wash={0.42} />
      </group>
      <mesh position={[0, 0.068, 0.0068]}>
        <boxGeometry args={[0.026, 0.0075, 0.0022]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.18} metalness={0.72} />
      </mesh>
      <mesh position={[0.007, 0.068, 0.0076]}>
        <cylinderGeometry args={[0.0016, 0.0016, 0.0016, 10]} />
        <meshStandardMaterial color="#1c2430" roughness={0.22} metalness={0.7} />
      </mesh>
      <PhoneKeys />
    </group>
  );
}

function LaptopKeys() {
  const keys = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 13; col += 1) {
      keys.push(
        <mesh key={`${row}-${col}`} position={[-0.15 + col * 0.025, 0.016, -0.05 + row * 0.022]}>
          <boxGeometry args={[0.021, 0.0036, 0.018]} />
          <meshStandardMaterial color="#2a2a2d" roughness={0.52} metalness={0.18} />
        </mesh>,
      );
    }
  }
  return <group>{keys}</group>;
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
      <RoundedBox args={[0.43, 0.012, 0.29]} radius={0.006} smoothness={3} position={[0, 0.007, 0.012]}>
        <meshStandardMaterial color="#c9c6bf" roughness={0.28} metalness={0.62} />
      </RoundedBox>
      <mesh position={[0, 0.013, 0.012]}>
        <boxGeometry args={[0.4, 0.002, 0.2]} />
        <meshStandardMaterial color="#1b1b1e" roughness={0.58} metalness={0.16} />
      </mesh>
      <LaptopKeys />
      <RoundedBox args={[0.11, 0.0024, 0.068]} radius={0.006} smoothness={3} position={[0, 0.014, 0.112]}>
        <meshStandardMaterial color="#b4b1aa" roughness={0.34} metalness={0.48} />
      </RoundedBox>
      <mesh position={[0, 0.012, -0.128]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.42, 10]} />
        <meshStandardMaterial color="#9e9b94" roughness={0.3} metalness={0.7} />
      </mesh>
      <group position={[0, 0.136, -0.128]} rotation={[-open, 0, 0]}>
        <RoundedBox args={[0.43, 0.278, 0.01]} radius={0.006} smoothness={3}>
          <meshStandardMaterial color="#b2afa8" roughness={0.26} metalness={0.58} />
        </RoundedBox>
        <mesh position={[0, 0.128, 0.003]}>
          <boxGeometry args={[0.028, 0.006, 0.004]} />
          <meshStandardMaterial color="#161618" roughness={0.28} metalness={0.62} />
        </mesh>
        <mesh position={[0, 0.128, 0.005]}>
          <cylinderGeometry args={[0.0018, 0.0018, 0.002, 10]} />
          <meshStandardMaterial color="#2a3340" roughness={0.22} metalness={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.0052]}>
          <boxGeometry args={[0.398, 0.246, 0.001]} />
          <meshStandardMaterial color="#24506c" roughness={0.2} metalness={0.4} />
        </mesh>
        <group position={[0, 0, 0.0062]}>
          <LiveLcd kind={kind} width={0.388} height={0.236} intensity={1.22} wash={0.7} />
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
      <mesh position={[0, -0.42, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.016, 24]} />
        <meshStandardMaterial color="#1a1a1d" roughness={0.36} metalness={0.52} />
      </mesh>
      <mesh position={[0, -0.24, 0.01]}>
        <cylinderGeometry args={[0.018, 0.026, 0.36, 12]} />
        <meshStandardMaterial color="#161618" roughness={0.34} metalness={0.58} />
      </mesh>
      <mesh position={[0.04, -0.3, 0.03]} rotation={[0.9, 0.2, 0.4]}>
        <torusGeometry args={[0.08, 0.005, 6, 14, Math.PI]} />
        <meshStandardMaterial color="#2a241c" roughness={0.7} />
      </mesh>
      <group rotation={[-0.08, 0, 0]}>
        <RoundedBox args={[0.96, 0.58, 0.03]} radius={0.012} smoothness={3}>
          <meshStandardMaterial color="#121214" roughness={0.3} metalness={0.5} />
        </RoundedBox>
        <mesh position={[0, -0.268, 0.012]}>
          <boxGeometry args={[0.96, 0.038, 0.028]} />
          <meshStandardMaterial color="#0c0c0e" roughness={0.38} metalness={0.42} />
        </mesh>
        <mesh position={[0, 0.268, 0.014]}>
          <boxGeometry args={[0.03, 0.008, 0.006]} />
          <meshStandardMaterial color="#1a1a1c" roughness={0.28} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.01, 0.015]}>
          <boxGeometry args={[0.9, 0.51, 0.002]} />
          <meshStandardMaterial color="#24506c" roughness={0.18} metalness={0.35} />
        </mesh>
        <group position={[0, 0.01, 0.017]}>
          <LiveLcd kind={kind} width={0.88} height={0.5} intensity={active ? 1.32 : 1.12} wash={0.82} />
        </group>
      </group>
    </group>
  );
}

export function TvDevice() {
  return (
    <group>
      <RoundedBox args={[2.2, 1.26, 0.046]} radius={0.012} smoothness={3}>
        <meshStandardMaterial color="#101012" roughness={0.32} metalness={0.46} />
      </RoundedBox>
      <mesh position={[0, -0.6, 0.012]}>
        <boxGeometry args={[2.2, 0.055, 0.05]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.4} metalness={0.38} />
      </mesh>
      <mesh position={[0, 0.02, 0.024]}>
        <boxGeometry args={[2.08, 1.12, 0.004]} />
        <meshStandardMaterial color="#24506c" roughness={0.16} metalness={0.3} />
      </mesh>
      <group position={[0, 0.02, 0.028]}>
        <LiveLcd kind="tv" width={2.06} height={1.1} intensity={1.08} wash={1.05} />
      </group>
      <mesh position={[-0.7, -0.2, -0.03]}>
        <boxGeometry args={[0.06, 0.06, 0.04]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[0.7, -0.2, -0.03]}>
        <boxGeometry args={[0.06, 0.06, 0.04]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.45} metalness={0.4} />
      </mesh>
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
