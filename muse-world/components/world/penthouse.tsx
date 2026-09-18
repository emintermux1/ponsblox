"use client";

import { useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { ColorRepresentation, Mesh } from "three";
import {
  IDEA_WALL_CARDS,
  IDEA_WALL_ORIGIN,
  PACKET_TRAVEL_MS,
  wallSlotLocal,
  worldToWallLocal,
} from "@/lib/world/layout";
import type { SpatialPacket, WallPin } from "@/types/world";

function Panel({
  args,
  position,
  rotation,
  color,
  metalness = 0.18,
  roughness = 0.62,
}: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: ColorRepresentation;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function WindowWall() {
  return (
    <group position={[0, 2.35, -4.55]}>
      <mesh>
        <boxGeometry args={[18.4, 4.4, 0.08]} />
        <meshPhysicalMaterial
          color="#8aa0b4"
          transmission={0.72}
          thickness={0.4}
          roughness={0.08}
          metalness={0.05}
          transparent
          opacity={0.42}
        />
      </mesh>
      {[-6, -2, 2, 6].map((x) => (
        <mesh key={x} position={[x, 0, 0.02]}>
          <boxGeometry args={[0.06, 4.4, 0.1]} />
          <meshStandardMaterial color="#2a241c" metalness={0.55} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
}

function Couch() {
  return (
    <group position={[-4.15, 0, 1.35]}>
      <Panel args={[3.4, 0.38, 1.35]} position={[0, 0.32, 0]} color="#3c332b" roughness={0.86} />
      <Panel args={[3.4, 0.72, 0.28]} position={[0, 0.78, -0.52]} color="#2f2923" roughness={0.84} />
      <Panel args={[0.28, 0.55, 1.2]} position={[-1.56, 0.68, 0.04]} color="#2f2923" roughness={0.84} />
      <Panel args={[0.28, 0.55, 1.2]} position={[1.56, 0.68, 0.04]} color="#2f2923" roughness={0.84} />
    </group>
  );
}

function Hookah() {
  return (
    <group position={[-2.55, 0, 2.15]}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.2, 16]} />
        <meshStandardMaterial color="#1c1914" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.55, 10]} />
        <meshStandardMaterial color="#8a8478" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Desk() {
  return (
    <group position={[3.4, 0, -0.85]}>
      <Panel args={[3.2, 0.07, 1.15]} position={[0, 0.74, 0]} color="#c4b7a2" metalness={0.15} roughness={0.35} />
      <Panel args={[0.08, 0.7, 1.1]} position={[-1.5, 0.36, 0]} color="#2b261f" metalness={0.45} roughness={0.4} />
      <Panel args={[0.08, 0.7, 1.1]} position={[1.5, 0.36, 0]} color="#2b261f" metalness={0.45} roughness={0.4} />
      {[-0.85, 0, 0.85].map((x, i) => (
        <group key={x} position={[x, 1.18, -0.22]} rotation={[-0.12, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.78, 0.5, 0.04]} />
            <meshStandardMaterial color="#11110f" metalness={0.6} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[0.7, 0.42]} />
            <meshStandardMaterial
              color={i === 1 ? "#d8c7a4" : i === 0 ? "#1c2430" : "#142018"}
              emissive={i === 1 ? "#8a7348" : "#1a2a22"}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FlyingWallCard({
  pin,
  from,
  to,
}: {
  pin: SpatialPacket;
  from: [number, number, number];
  to: [number, number, number];
}) {
  const mesh = useRef<Mesh>(null);
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
    <mesh ref={mesh}>
      <boxGeometry args={[0.62, 0.38, 0.02]} />
      <meshStandardMaterial color="#f3e6c8" emissive="#8a7348" emissiveIntensity={0.5} roughness={0.72} />
    </mesh>
  );
}

function IdeaWall({
  packet,
  pins,
  builderPos,
}: {
  packet: SpatialPacket | null;
  pins: WallPin[];
  builderPos: [number, number, number];
}) {
  const traveling = packet?.kind === "PIN" && packet.to === "wall" ? packet : null;
  const travelId = traveling ? `${traveling.t}:${traveling.label}:${traveling.slot ?? 0}` : null;
  const [landedId, setLandedId] = useState<string | null>(null);
  const fromLocal = useMemo(() => worldToWallLocal(builderPos), [builderPos]);
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
      <Panel args={[3.6, 2.3, 0.06]} position={[0, 0, 0]} color="#1a1713" roughness={0.7} />
      {IDEA_WALL_CARDS.map((card) => (
        <mesh key={card.key} position={[card.x, card.y, 0.05]}>
          <boxGeometry args={[0.62, 0.38, 0.02]} />
          <meshStandardMaterial color="#e6d7bc" roughness={0.8} />
        </mesh>
      ))}
      {pins
        .filter((pin) => pin.slot !== flyingSlot)
        .map((pin) => {
          const [x, y, z] = wallSlotLocal(pin.slot);
          return (
            <group key={pin.id} position={[x, y, z]}>
              <mesh>
                <boxGeometry args={[0.58, 0.34, 0.018]} />
                <meshStandardMaterial
                  color="#f3e6c8"
                  emissive="#8a7348"
                  emissiveIntensity={0.28}
                  roughness={0.7}
                />
              </mesh>
              <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
                <span className="whitespace-nowrap font-serif text-[9px] tracking-[0.18em] text-[#3a3226]/80">
                  ${pin.label}
                </span>
              </Html>
            </group>
          );
        })}
      {traveling ? (
        <FlyingWallCard
          pin={traveling}
          from={fromLocal}
          to={wallSlotLocal(traveling.slot ?? 0)}
        />
      ) : null}
    </group>
  );
}

function City() {
  const towers = useMemo(() => {
    const items: { x: number; z: number; h: number; w: number }[] = [];
    for (let i = 0; i < 36; i += 1) {
      items.push({
        x: ((i * 47) % 28) - 14,
        z: -10 - ((i * 13) % 18),
        h: 2.4 + ((i * 17) % 9),
        w: 0.7 + ((i * 3) % 5) * 0.15,
      });
    }
    return items;
  }, []);
  return (
    <group>
      {towers.map((tower, i) => (
        <mesh key={i} position={[tower.x, tower.h / 2 - 0.4, tower.z]}>
          <boxGeometry args={[tower.w, tower.h, tower.w]} />
          <meshStandardMaterial color="#151820" roughness={0.55} metalness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

export function Penthouse({
  packet = null,
  wallPins = [],
  builderPos = [6.4, 0.62, 2.8],
}: {
  packet?: SpatialPacket | null;
  wallPins?: WallPin[];
  builderPos?: [number, number, number];
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.4]} receiveShadow>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#6d675e" roughness={0.92} metalness={0.04} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.4, 0.01, 1.8]} receiveShadow>
        <planeGeometry args={[7.2, 5.4]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.78} />
      </mesh>
      <Panel args={[20, 0.2, 12]} position={[0, 4.7, 0.4]} color="#1c1915" roughness={0.85} />
      <Panel args={[0.22, 4.7, 12]} position={[-9.9, 2.35, 0.4]} color="#2a241c" />
      <Panel args={[0.22, 4.7, 12]} position={[9.9, 2.35, 0.4]} color="#2a241c" />
      <Panel args={[20, 4.7, 0.22]} position={[0, 2.35, 6.3]} color="#241f19" />
      <WindowWall />
      <Couch />
      <Hookah />
      <Panel args={[1.35, 0.12, 0.78]} position={[-2.7, 0.28, 2.2]} color="#1f1b16" metalness={0.4} />
      <Desk />
      <IdeaWall packet={packet} pins={wallPins} builderPos={builderPos} />
      <mesh position={[-6.6, 0.28, 3.8]}>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 20]} />
        <meshStandardMaterial color="#d8c3a0" roughness={0.35} />
      </mesh>
      <City />
    </group>
  );
}
