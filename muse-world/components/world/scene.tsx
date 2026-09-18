"use client";

import { ContactShadows } from "@react-three/drei";
import { MuseBody } from "@/components/world/muse-body";
import { MuseMindField } from "@/components/world/mind";
import { Penthouse } from "@/components/world/penthouse";
import { TravelPacket } from "@/components/world/packet";
import { CameraRig } from "@/components/world/rig";
import { ThoughtChip } from "@/components/world/thoughts";
import { wallSlotWorld } from "@/lib/world/layout";
import type { MuseId, PacketEndpoint, WorldSnapshot } from "@/types/world";
import { MUSE_IDS } from "@/types/world";

export function LivingScene({
  world,
  introDone,
  onIntroDone,
  onSelect,
}: {
  world: WorldSnapshot;
  introDone: boolean;
  onIntroDone: () => void;
  onSelect: (id: MuseId) => void;
}) {
  const selected = world.selected;
  const musePos = selected ? world.muses[selected].position : null;
  const positions: Record<PacketEndpoint, [number, number, number]> = {
    scroller: world.muses.scroller.position,
    trader: world.muses.trader.position,
    chill: world.muses.chill.position,
    builder: world.muses.builder.position,
    wall: wallSlotWorld(world.packet?.slot ?? 0),
  };

  return (
    <>
      <color attach="background" args={["#0b0c10"]} />
      <fog attach="fog" args={["#0b0c10", 14, 38]} />
      <hemisphereLight args={["#9aa8b8", "#1a1612", 0.42]} />
      <directionalLight
        position={[6, 8, 4]}
        intensity={1.15}
        color="#f0e2c4"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 2.4, 1.2]} intensity={0.35} color="#d8c49a" />
      <pointLight position={[3.4, 1.6, -0.6]} intensity={0.4} color="#8aa0b0" />
      <CameraRig
        preset={world.camera}
        selected={world.selected}
        musePos={musePos}
        introDone={introDone}
        onIntroDone={onIntroDone}
      />
      <Penthouse
        packet={world.packet}
        wallPins={world.wallPins ?? []}
        builderPos={world.muses.builder.position}
      />
      {MUSE_IDS.map((id) => (
        <group key={id}>
          <MuseBody
            muse={world.muses[id]}
            selected={selected === id}
            onSelect={() => onSelect(id)}
          />
          <MuseMindField
            mind={world.muses[id].mind}
            visible={world.mindOpen && selected === id}
          />
          <ThoughtChip muse={world.muses[id]} />
        </group>
      ))}
      <TravelPacket packet={world.packet} positions={positions} />
      <ContactShadows position={[0, 0.01, 0.4]} opacity={0.32} scale={22} blur={2.4} far={6} />
    </>
  );
}
