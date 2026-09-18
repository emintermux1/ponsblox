"use client";

import { useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { usePerf } from "@/components/world/perf-context";
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
  const { hidden } = usePerf();
  const wallPin = packet?.kind === "PIN" && packet.to === "wall";

  useFrame(() => {
    if (hidden) {
      return;
    }
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
        <Billboard position={[0, 0.16, 0]}>
          <Text
            fontSize={0.078}
            letterSpacing={0.14}
            color="#efe6d4"
            fillOpacity={0.85}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.005}
            outlineColor="#120e0b"
            outlineOpacity={0.65}
          >
            {`$${packet.label}`}
          </Text>
        </Billboard>
      ) : null}
    </group>
  );
}
