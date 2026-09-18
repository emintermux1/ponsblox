"use client";

import { useEffect, useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace, type MeshStandardMaterial } from "three";
import { loftPickHandlers } from "@/components/world/loft-cursor";
import { usePerf } from "@/components/world/perf-context";
import { useTape, useTickets } from "@/components/world/tape-context";
import {
  formatChange,
  formatCompactUsd,
  formatPrice,
  pairTitle,
  rowLabel,
  tapeHeadline,
  tapeStamp,
  type TapeView,
} from "@/lib/world/tape";
import {
  ticketVerb,
  type SimTicket,
  type TicketFlash,
} from "@/lib/world/tickets";
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
      return { w: 390, h: 844 };
    case "feed":
    case "tape":
    case "notes":
    case "tv":
      return { w: 960, h: 540 };
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
      return "#7dcea0";
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

function ohlcvLabel(tape: TapeView): string {
  return tape.source === "sim" ? "SIM · no OHLCV" : "LIVE · no OHLCV";
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
    ctx.fillText(ohlcvLabel(tape), x, y + h * 0.52);
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

function drawRows(
  ctx: CanvasRenderingContext2D,
  tape: TapeView,
  x: number,
  y: number,
  w: number,
  rowH: number,
  limit: number,
) {
  if (tape.rows.length === 0) {
    ctx.fillStyle = "#6a7380";
    ctx.font = "13px ui-sans-serif, system-ui";
    ctx.fillText(tape.source === "sim" ? "SIM · quiet tape" : "LIVE · waiting on a public row", x, y + 22);
    return;
  }
  tape.rows.slice(0, limit).forEach((row, index) => {
    const top = y + index * rowH;
    ctx.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.12)";
    roundRect(ctx, x, top, w, rowH - 6, 8);
    ctx.fill();
    ctx.fillStyle = "#efe6d4";
    ctx.font = "600 15px ui-sans-serif, system-ui";
    ctx.fillText(rowLabel(row), x + 12, top + 22);
    const price = formatPrice(row.priceUsd);
    const meta = [price, tapeStamp(row.source)].filter(Boolean).join("  ·  ");
    ctx.fillStyle = row.changePct != null && row.changePct < 0 ? "#c9ae7a" : "#7dcea0";
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.fillText(meta, x + 12, top + 40);
  });
}

function changeColor(tape: TapeView): string {
  return tape.changePct != null && tape.changePct < 0 ? "#c9ae7a" : "#7dcea0";
}

function paintHero(
  ctx: CanvasRenderingContext2D,
  tape: TapeView,
  x: number,
  y: number,
  titlePx: number,
) {
  ctx.fillStyle = "#efe6d4";
  ctx.font = `800 ${titlePx}px ui-sans-serif, system-ui`;
  const title =
    tape.source === "sim" ? tapeHeadline(tape) : (tape.ticker ?? tape.name ?? tapeStamp(tape.source));
  ctx.fillText(title, x, y);
  const change = formatChange(tape.changePct);
  ctx.fillStyle = changeColor(tape);
  ctx.font = `700 ${Math.round(titlePx * 0.42)}px ui-sans-serif, system-ui`;
  ctx.fillText(change ?? (tape.source === "sim" ? "fail-open SIM" : "watching"), x, y + titlePx * 0.55);
  const price = formatPrice(tape.priceUsd);
  ctx.fillStyle = "#8d8370";
  ctx.font = "600 16px ui-sans-serif, system-ui";
  ctx.fillText(
    [tapeStamp(tape.source), price, "no fills"].filter(Boolean).join("  ·  "),
    x,
    y + titlePx * 0.82,
  );
}

function paintPhone(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1c1814");
  g.addColorStop(1, "#0e0c0a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0a0908";
  roundRect(ctx, w / 2 - 58, 10, 116, 28, 14);
  ctx.fill();
  paintHero(ctx, tape, 22, 118, 52);
  ctx.fillStyle = "#161310";
  roundRect(ctx, 16, 220, w - 32, 168, 18);
  ctx.fill();
  drawCandles(ctx, tape, 28, 236, w - 56, 88);
  drawSpark(ctx, tape, 28, 236, w - 56, 88);
  drawRows(ctx, tape, 16, 408, w - 32, 58, 6);
  ctx.fillStyle = "#8d8370";
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.fillText("public tape  ·  no fills", 22, h - 28);
}

function paintFeed(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  ctx.fillStyle = "#14110e";
  ctx.fillRect(0, 0, w, h);
  paintHero(ctx, tape, 28, 78, 54);
  ctx.fillStyle = "#1b1814";
  roundRect(ctx, 24, 150, 520, 360, 14);
  ctx.fill();
  drawSpark(ctx, tape, 40, 168, 488, 140);
  drawCandles(ctx, tape, 40, 320, 488, 170);
  drawRows(ctx, tape, 560, 150, 376, 58, 6);
}

function paintTape(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  ctx.fillStyle = "#0b1118";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#121922";
  ctx.fillRect(0, 0, w, 92);
  ctx.fillStyle = "#efe6d4";
  ctx.font = "700 22px ui-sans-serif, system-ui";
  ctx.fillText(pairTitle(tape), 24, 36);
  const price = formatPrice(tape.priceUsd);
  const change = formatChange(tape.changePct);
  ctx.fillStyle = "#f4ead4";
  ctx.font = "700 34px ui-sans-serif, system-ui";
  ctx.fillText(price ? `$${price}` : tape.source === "sim" ? "SIM" : "—", 24, 76);
  ctx.fillStyle = tape.changePct != null && tape.changePct < 0 ? "#ef8b8b" : "#7ee3a4";
  ctx.font = "700 22px ui-sans-serif, system-ui";
  ctx.fillText(change ?? "—", 280, 76);
  ctx.fillStyle = "#8d8370";
  ctx.font = "12px ui-sans-serif, system-ui";
  const dex = tape.dexId ? tape.dexId : "pair";
  ctx.fillText(`${tapeStamp(tape.source)}  ·  ${dex}  ·  no fills`, 24, 108);
  ctx.fillStyle = "#10161d";
  ctx.fillRect(16, 120, w - 32, h - 176);
  drawCandles(ctx, tape, 28, 132, w - 56, h - 204);
  const vol = formatCompactUsd(tape.volumeUsd);
  const liq = formatCompactUsd(tape.liquidityUsd);
  ctx.fillStyle = "#6a7380";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(
    [vol ? `VOL ${vol}` : null, liq ? `LIQ ${liq}` : null, "public OHLCV", "no fills"]
      .filter(Boolean)
      .join("   ·   "),
    24,
    h - 24,
  );
}

function paintButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string,
  color: string,
  lit: boolean,
) {
  ctx.fillStyle = lit ? color : "#1a222c";
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = lit ? 3 : 1.5;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();
  ctx.fillStyle = lit ? "#0b1118" : color;
  ctx.font = "700 28px ui-sans-serif, system-ui";
  ctx.fillText(label, x + 28, y + 42);
  ctx.font = "600 13px ui-sans-serif, system-ui";
  ctx.fillText(sub, x + 28, y + 68);
}

function paintNotes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tape: TapeView,
  tickets: readonly SimTicket[],
  flash: TicketFlash | null,
) {
  ctx.fillStyle = "#0b1118";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#efe6d4";
  ctx.font = "700 22px ui-sans-serif, system-ui";
  ctx.fillText("TICKET", 24, 36);
  ctx.fillStyle = "#c9ae7a";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText("SIM  ·  UI only  ·  fills []  ·  no withdraw", 24, 58);
  const price = formatPrice(tape.priceUsd);
  const quoted = tape.source !== "sim" && price ? `$${price}` : "SIM · no quote";
  ctx.fillStyle = "#f4ead4";
  ctx.font = "700 20px ui-sans-serif, system-ui";
  ctx.fillText(`${pairTitle(tape)}   ${quoted}`, 24, 88);
  ctx.fillStyle = "#6a7380";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(
    tape.source === "sim" ? "local ticket unless a public quote returns" : `${tapeStamp(tape.source)} quote`,
    24,
    110,
  );
  paintButton(ctx, 24, 128, 440, 88, "BUY", "YES", "#7ee3a4", flash?.side === "BUY");
  paintButton(ctx, 496, 128, 440, 88, "SELL", "NO", "#ef8b8b", flash?.side === "SELL");
  ctx.fillStyle = "#8d8370";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText("open SIM tickets", 24, 244);
  if (tickets.length === 0) {
    ctx.fillStyle = "#5a6470";
    ctx.fillText("none — click BUY or SELL for a local SIM ticket", 24, 272);
    return;
  }
  tickets.slice(0, 4).forEach((ticket, index) => {
    const y = 258 + index * 58;
    ctx.fillStyle = index % 2 === 0 ? "#121922" : "#0f161d";
    roundRect(ctx, 24, y, w - 48, 50, 10);
    ctx.fill();
    ctx.fillStyle = ticket.side === "BUY" ? "#7ee3a4" : "#ef8b8b";
    ctx.font = "700 16px ui-sans-serif, system-ui";
    ctx.fillText(`${ticket.side} / ${ticketVerb(ticket.side)}`, 40, y + 22);
    ctx.fillStyle = "#d8c6a6";
    ctx.font = "12px ui-sans-serif, system-ui";
    const quote = ticket.quoteUsd != null ? `$${formatPrice(ticket.quoteUsd)}` : "no quote";
    ctx.fillText(
      `${ticket.ticker ?? "pair"}  ${quote}  ·  ${ticket.label}  ·  fills []`,
      40,
      y + 40,
    );
  });
}

function paintTv(ctx: CanvasRenderingContext2D, w: number, h: number, tape: TapeView) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1a2430");
  g.addColorStop(1, "#0e1216");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  paintHero(ctx, tape, 28, 78, 64);
  ctx.fillStyle = "#121820";
  ctx.fillRect(24, 150, 680, h - 198);
  drawCandles(ctx, tape, 40, 166, 648, h - 238);
  drawSpark(ctx, tape, 40, 166, 648, h - 238);
  drawRows(ctx, tape, 720, 150, 216, 56, 6);
}

function paintLcd(
  kind: LcdKind,
  tape: TapeView,
  tickets: readonly SimTicket[] = [],
  flash: TicketFlash | null = null,
): HTMLCanvasElement | null {
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
      paintNotes(ctx, w, h, tape, tickets, flash);
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

function useLiveMap(
  kind: LcdKind,
  tape: TapeView,
  tickets: readonly SimTicket[],
  flash: TicketFlash | null,
): CanvasTexture | null {
  const map = useMemo(() => {
    const canvas = paintLcd(kind, tape, tickets, flash);
    return canvas ? asMap(canvas) : null;
  }, [kind, tape, tickets, flash]);

  useEffect(() => {
    return () => {
      map?.dispose();
    };
  }, [map]);

  return map;
}

function LcdGlass({ width, height }: { width: number; height: number }) {
  return (
    <mesh position={[0, 0, 0.0012]}>
      <planeGeometry args={[width, height]} />
      <meshPhysicalMaterial
        color="#d8e4f0"
        transparent
        opacity={0.08}
        roughness={0.08}
        metalness={0.12}
        transmission={0.18}
        thickness={0.01}
      />
    </mesh>
  );
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
  const { tickets, flash } = useTickets();
  const map = useLiveMap(kind, tape, tickets, flash);
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
          roughness={0.16}
          metalness={0.03}
          toneMapped={false}
        />
      </mesh>
      <LcdGlass width={width} height={height} />
      {extraLights ? (
        <pointLight
          position={[0, 0, 0.18]}
          intensity={kind === "tv" ? wash * 1.45 : wash}
          color={glowFor(kind)}
          distance={Math.max(width, height) * (kind === "tv" ? 3.6 : 3.1)}
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
        <meshStandardMaterial color="#050506" roughness={0.2} metalness={0.55} />
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
          <meshStandardMaterial color="#050506" roughness={0.2} metalness={0.4} />
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
  const { submit } = useTickets();
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
          <meshStandardMaterial color="#050506" roughness={0.18} metalness={0.35} />
        </mesh>
        <group position={[0, 0.01, 0.017]}>
          <LiveLcd kind={kind} width={0.88} height={0.5} intensity={active ? 1.32 : 1.12} wash={0.82} />
        </group>
        {kind === "notes" ? (
          <>
            <mesh
              position={[-0.22, -0.08, 0.022]}
              {...loftPickHandlers(() => submit("BUY"))}
            >
              <planeGeometry args={[0.4, 0.12]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <mesh
              position={[0.22, -0.08, 0.022]}
              {...loftPickHandlers(() => submit("SELL"))}
            >
              <planeGeometry args={[0.4, 0.12]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          </>
        ) : null}
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
        <meshStandardMaterial color="#050608" roughness={0.16} metalness={0.3} />
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
