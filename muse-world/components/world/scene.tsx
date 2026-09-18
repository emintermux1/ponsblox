"use client";

import { useLayoutEffect } from "react";
import { ContactShadows } from "@react-three/drei";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { MuseBody } from "@/components/world/muse-body";
import { MuseMindField } from "@/components/world/mind";
import { Penthouse } from "@/components/world/penthouse";
import { TravelPacket } from "@/components/world/packet";
import { CameraRig } from "@/components/world/rig";
import { ThoughtChip } from "@/components/world/thoughts";
import { wallSlotWorld } from "@/lib/world/layout";
import { MIND_LIFT } from "@/lib/world/mind-graph";
import type { MuseId, PacketEndpoint, WorldSnapshot } from "@/types/world";
import { MUSE_IDS } from "@/types/world";

function AreaLights() {
  useLayoutEffect(() => {
    RectAreaLightUniformsLib.init();
  }, []);
  return null;
}

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
      <AreaLights />
      <color attach="background" args={["#15202c"]} />
      <fog attach="fog" args={["#243646", 28, 70]} />
      <ambientLight intensity={0.28} color="#d2c0a6" />
      <hemisphereLight args={["#7f96aa", "#3a2c20", 0.55]} />
      <directionalLight
        position={[7, 9.5, -5]}
        intensity={0.72}
        color="#c5d2de"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={32}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-8}
        shadow-bias={-0.00025}
      />
      <directionalLight position={[-4, 6.2, 7]} intensity={0.85} color="#f3d7b0" />
      <rectAreaLight
        width={16}
        height={3.2}
        intensity={8}
        color="#8eabbf"
        position={[0, 2.15, -4.42]}
        rotation={[0, Math.PI, 0]}
      />
      <rectAreaLight
        width={6.2}
        height={0.16}
        intensity={10}
        color="#f0d4ae"
        position={[-3.2, 4.52, 0.2]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <rectAreaLight
        width={5}
        height={0.16}
        intensity={7}
        color="#e8cba6"
        position={[3.3, 4.52, -0.7]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <pointLight position={[-3.2, 4.2, 0.4]} intensity={1.35} color="#f2d4a8" distance={11} decay={2} />
      <pointLight position={[3.3, 4.2, -0.5]} intensity={0.95} color="#ebc9a0" distance={9} decay={2} />
      <pointLight position={[-6.55, 1.72, 3.55]} intensity={0.85} color="#e4c49a" distance={8} decay={2} />
      <pointLight position={[3.4, 1.7, -0.5]} intensity={0.45} color="#d7c4a6" distance={6} decay={2} />
      <pointLight position={[0, 3.4, -3.4]} intensity={0.4} color="#9bb3c4" distance={10} decay={2} />
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
            origin={[
              world.muses[id].position[0],
              world.muses[id].position[1] + MIND_LIFT,
              world.muses[id].position[2],
            ]}
            visible={world.mindOpen && selected === id}
          />
          <ThoughtChip muse={world.muses[id]} hush={world.mindOpen || selected !== id} />
        </group>
      ))}
      <TravelPacket packet={world.packet} positions={positions} />
      <ContactShadows position={[0, 0.012, 0.4]} opacity={0.38} scale={22} blur={2.7} far={6} />
    </>
  );
}
