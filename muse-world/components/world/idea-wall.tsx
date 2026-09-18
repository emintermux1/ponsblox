"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { Group } from "three";
import {
  IDEA_WALL_ORIGIN,
  PACKET_TRAVEL_MS,
  WALL_SLOT_COUNT,
  wallSlotLocal,
  worldToWallLocal,
} from "@/lib/world/layout";
import {
  wallCardText,
  wallCopyFromWorld,
  wallNoteForSlot,
  wallRotateMs,
  wrapWallInk,
} from "@/lib/world/wall-copy";
import type { SpatialPacket, WallPin, WorldSnapshot } from "@/types/world";

const WOOD = "#7a5840";
const ALUMINUM = "#c8c5be";
const PAPER = "#f8f1e2";
const INK = "#0c0805";
const CARD_W = 512;
const CARD_H = 320;
const INK_PAD = 56;

function inkFont(size: number): string {
  return `700 italic ${size}px Georgia, "Times New Roman", serif`;
}

export function paintIdeaCard(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.strokeStyle = "rgba(12, 8, 5, 0.12)";
  ctx.lineWidth = 2;
  for (let y = 86; y < CARD_H - 28; y += 38) {
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(CARD_W - 36, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#4a2c1c";
  ctx.beginPath();
  ctx.arc(CARD_W / 2, 28, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#140c08";
  ctx.beginPath();
  ctx.arc(CARD_W / 2, 28, 3.4, 0, Math.PI * 2);
  ctx.fill();
  const probe = text.length > 28 ? 32 : 36;
  ctx.font = inkFont(probe);
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  spaced.letterSpacing = "1px";
  const maxWidth = CARD_W - INK_PAD * 2;
  const lines = wrapWallInk(text, (line) => ctx.measureText(line).width, maxWidth);
  const size = lines.length >= 3 || text.length > 32 ? 30 : lines.length === 2 ? 34 : 38;
  ctx.font = inkFont(size);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const mid = CARD_H / 2 + 12;
  const lead = size + 14;
  lines.forEach((line, index) => {
    const ink = line.replace(/\s+/g, " ").trim();
    if (!ink) {
      return;
    }
    ctx.fillText(ink, CARD_W / 2, mid + (index - (lines.length - 1) / 2) * lead, maxWidth);
  });
}

function paperMap(text: string): CanvasTexture | null {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    paintIdeaCard(ctx, text);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function PaperNote({
  line,
  position,
}: {
  line: string;
  position: [number, number, number];
}) {
  const map = useMemo(() => paperMap(line), [line]);
  useLayoutEffect(() => {
    return () => {
      map?.dispose();
    };
  }, [map]);
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.62, 0.38, 0.018]} />
        <meshStandardMaterial color={PAPER} roughness={0.84} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.58, 0.34]} />
        <meshStandardMaterial
          map={map ?? undefined}
          color={map ? "#ffffff" : INK}
          roughness={0.86}
          metalness={0}
        />
      </mesh>
      <mesh position={[0, 0.16, 0.02]}>
        <sphereGeometry args={[0.016, 10, 8]} />
        <meshStandardMaterial color="#4a2c1c" roughness={0.48} metalness={0.18} />
      </mesh>
    </group>
  );
}

function FlyingPaper({
  pin,
  from,
  to,
}: {
  pin: SpatialPacket;
  from: [number, number, number];
  to: [number, number, number];
}) {
  const mesh = useRef<Group>(null);
  const line = wallCardText(pin.label) ?? wallNoteForSlot(pin.slot ?? 0);
  useFrame(() => {
    if (!mesh.current) {
      return;
    }
    const u = Math.min(1, (Date.now() - pin.t) / PACKET_TRAVEL_MS);
    mesh.current.visible = u < 1;
    mesh.current.position.set(
      from[0] + (to[0] - from[0]) * u,
      from[1] + (to[1] - from[1]) * u + Math.sin(u * Math.PI) * 0.32,
      from[2] + (to[2] - from[2]) * u,
    );
  });
  return (
    <group ref={mesh}>
      <PaperNote line={line} position={[0, 0, 0]} />
    </group>
  );
}

function nextWallWait(now: number): number {
  let wait = WALL_SLOT_COUNT > 0 ? wallRotateMs(0) : 8_000;
  for (let slot = 0; slot < WALL_SLOT_COUNT; slot += 1) {
    const period = wallRotateMs(slot);
    wait = Math.min(wait, period - (now % period));
  }
  return Math.max(250, wait);
}

export function IdeaWall({
  packet,
  pins,
  builderPos,
  world,
}: {
  packet: SpatialPacket | null;
  pins: WallPin[];
  builderPos: [number, number, number];
  world: WorldSnapshot;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const [now, setNow] = useState(() => Date.now());
  const traveling = packet?.kind === "PIN" && packet.to === "wall" ? packet : null;
  const travelId = traveling ? `${traveling.t}:${traveling.label}:${traveling.slot ?? 0}` : null;
  const [landedId, setLandedId] = useState<string | null>(null);
  const fromLocal = useMemo(() => worldToWallLocal(builderPos), [builderPos]);
  const lines = useMemo(
    () => wallCopyFromWorld({ ...world, wallPins: pins }, now, WALL_SLOT_COUNT),
    [now, pins, world],
  );

  useEffect(() => {
    let timer = 0;
    const arm = () => {
      const stamp = Date.now();
      timer = window.setTimeout(() => {
        setNow(Date.now());
        invalidate();
        arm();
      }, nextWallWait(stamp));
    };
    arm();
    return () => window.clearTimeout(timer);
  }, [invalidate]);

  useFrame(() => {
    if (!traveling || !travelId) {
      return;
    }
    if (Date.now() - traveling.t >= PACKET_TRAVEL_MS && landedId !== travelId) {
      setLandedId(travelId);
    }
  });
  const flyingSlot = travelId && landedId !== travelId ? (traveling?.slot ?? 0) : null;

  return (
    <group position={IDEA_WALL_ORIGIN} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[3.85, 2.55, 0.07]} />
        <meshStandardMaterial color={WOOD} roughness={0.68} />
      </mesh>
      <mesh position={[0, 1.28, 0.02]}>
        <boxGeometry args={[3.9, 0.03, 0.08]} />
        <meshStandardMaterial color={ALUMINUM} metalness={0.86} roughness={0.3} />
      </mesh>
      <mesh position={[0, -1.28, 0.02]}>
        <boxGeometry args={[3.9, 0.03, 0.08]} />
        <meshStandardMaterial color={ALUMINUM} metalness={0.86} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.32, 0.08]}>
        <boxGeometry args={[3.4, 0.018, 0.04]} />
        <meshStandardMaterial color="#ead7b4" roughness={0.55} />
      </mesh>
      {lines.map((line, slot) => {
        if (slot === flyingSlot) {
          return null;
        }
        const [x, y, z] = wallSlotLocal(slot);
        return <PaperNote key={`slot-${slot}-${line}`} line={line} position={[x, y, z]} />;
      })}
      {traveling ? (
        <FlyingPaper pin={traveling} from={fromLocal} to={wallSlotLocal(traveling.slot ?? 0)} />
      ) : null}
      <mesh position={[0, -1.55, 0.18]}>
        <boxGeometry args={[1.8, 0.08, 0.42]} />
        <meshStandardMaterial color={WOOD} roughness={0.62} />
      </mesh>
    </group>
  );
}
