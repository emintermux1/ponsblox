"use client";

import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { PACKET_TRAVEL_MS, packetAccent } from "@/lib/world/layout";
import type { PacketEndpoint, PacketKind, SpatialPacket } from "@/types/world";
import { assertNever } from "@/types/world";

function PacketBody({ kind, color }: { kind: PacketKind; color: string }) {
  switch (kind) {
    case "NOTE":
      return (
        <mesh>
          <octahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
        </mesh>
      );
    case "PIN":
      return (
        <mesh>
          <boxGeometry args={[0.16, 0.1, 0.012]} />
          <meshStandardMaterial color="#e6d7bc" emissive="#8a7348" emissiveIntensity={0.45} />
        </mesh>
      );
    default:
      return assertNever(kind);
  }
}

export function TravelPacket({
  packet,
  positions,
}: {
  packet: SpatialPacket | null;
  positions: Record<PacketEndpoint, [number, number, number]>;
}) {
  const group = useRef<Group>(null);
  const wallPin = packet?.kind === "PIN" && packet.to === "wall";

  useFrame(() => {
    if (!group.current) {
      return;
    }
    if (!packet || wallPin) {
      group.current.visible = false;
      return;
    }
    const from = positions[packet.from];
    const to = positions[packet.to];
    if (!from || !to) {
      group.current.visible = false;
      return;
    }
    const u = Math.min(1, (Date.now() - packet.t) / PACKET_TRAVEL_MS);
    group.current.visible = u < 1;
    group.current.position.set(
      from[0] + (to[0] - from[0]) * u,
      1.25 + Math.sin(u * Math.PI) * 0.55,
      from[2] + (to[2] - from[2]) * u,
    );
  });

  if (wallPin) {
    return null;
  }

  return (
    <group ref={group} visible={Boolean(packet)}>
      <PacketBody
        kind={packet?.kind ?? "NOTE"}
        color={packet ? packetAccent(packet.from) : "#e8d2a0"}
      />
      {packet ? (
        <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <span className="whitespace-nowrap font-serif text-[10px] tracking-[0.16em] text-[#efe6d4]/75">
            ${packet.label}
          </span>
        </Html>
      ) : null}
    </group>
  );
}
