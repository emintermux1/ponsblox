"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { MuseId, SpatialPacket } from "@/types/world";

export function TravelPacket({
  packet,
  positions,
}: {
  packet: SpatialPacket | null;
  positions: Record<MuseId, [number, number, number]>;
}) {
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    if (!mesh.current || !packet) {
      if (mesh.current) mesh.current.visible = false;
      return;
    }
    const from = positions[packet.from];
    const to = positions[packet.to];
    const u = Math.min(1, (Date.now() - packet.t) / 2200);
    mesh.current.visible = u < 1;
    mesh.current.position.set(
      from[0] + (to[0] - from[0]) * u,
      1.25 + Math.sin(u * Math.PI) * 0.55,
      from[2] + (to[2] - from[2]) * u,
    );
  });

  return (
    <mesh ref={mesh} visible={Boolean(packet)}>
      <octahedronGeometry args={[0.07, 0]} />
      <meshStandardMaterial color="#e8d2a0" emissive="#b8944a" emissiveIntensity={0.8} />
    </mesh>
  );
}
