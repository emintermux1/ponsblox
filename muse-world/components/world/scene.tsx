"use client";

import { useEffect, useLayoutEffect } from "react";
import { ContactShadows, SoftShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { FrustumGuard } from "@/components/world/frustum-guard";
import { MuseBody } from "@/components/world/muse-body";
import { MuseMindField } from "@/components/world/mind";
import { Penthouse } from "@/components/world/penthouse";
import { TravelPacket } from "@/components/world/packet";
import { usePerf } from "@/components/world/perf-context";
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

function Lighting() {
  const { extraLights, shadows, shadowMapSize, cameraFar } = usePerf();
  return (
    <>
      {extraLights ? <AreaLights /> : null}
      {shadows && extraLights ? <SoftShadows size={18} samples={8} focus={0.75} /> : null}
      <color attach="background" args={["#0d1520"]} />
      <fog attach="fog" args={["#15202c", 16, Math.min(50, cameraFar - 6)]} />
      <hemisphereLight args={["#6d8498", "#1c1612", extraLights ? 0.36 : 0.5]} />
      <directionalLight
        position={[7, 9.5, -5]}
        intensity={extraLights ? 0.62 : 0.85}
        color="#9eb4c8"
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={1}
        shadow-camera-far={32}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-8}
        shadow-bias={-0.00025}
      />
      {extraLights ? (
        <>
          <directionalLight position={[-4, 5.5, 6]} intensity={0.22} color="#e6d0ae" />
          <rectAreaLight
            width={16}
            height={3.2}
            intensity={3.4}
            color="#7f9aaf"
            position={[0, 2.15, -4.42]}
            rotation={[0, Math.PI, 0]}
          />
          <rectAreaLight
            width={6.2}
            height={0.16}
            intensity={5.2}
            color="#f0d4ae"
            position={[-3.2, 4.52, 0.2]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
          <rectAreaLight
            width={5}
            height={0.16}
            intensity={3.6}
            color="#e8cba6"
            position={[3.3, 4.52, -0.7]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
          <pointLight position={[-6.55, 1.72, 3.55]} intensity={0.38} color="#e4c49a" distance={7} decay={2} />
          <pointLight position={[3.4, 1.55, -0.5]} intensity={0.22} color="#d7c4a6" distance={6} decay={2} />
        </>
      ) : (
        <pointLight position={[0.6, 3.6, 10.2]} intensity={0.26} color="#cfc3a6" />
      )}
    </>
  );
}

function DemandInvalidator({ revision }: { revision: string }) {
  const invalidate = useThree((state) => state.invalidate);
  const { frameloop } = usePerf();
  useEffect(() => {
    if (frameloop === "demand") {
      invalidate();
    }
  }, [frameloop, invalidate, revision]);
  return null;
}

function worldRevision(world: WorldSnapshot): string {
  return [
    world.camera,
    world.selected ?? "",
    world.mindOpen ? "1" : "0",
    world.packet?.t ?? 0,
    ...MUSE_IDS.map((id) => {
      const muse = world.muses[id];
      return `${muse.position[0].toFixed(2)}:${muse.activity}:${muse.thought ?? ""}`;
    }),
  ].join("|");
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
  const { contactShadows } = usePerf();
  const positions: Record<PacketEndpoint, [number, number, number]> = {
    scroller: world.muses.scroller.position,
    trader: world.muses.trader.position,
    chill: world.muses.chill.position,
    builder: world.muses.builder.position,
    wall: wallSlotWorld(world.packet?.slot ?? 0),
  };

  return (
    <>
      <Lighting />
      <DemandInvalidator revision={worldRevision(world)} />
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
        <FrustumGuard key={id} center={world.muses[id].position} radius={1.6}>
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
        </FrustumGuard>
      ))}
      <TravelPacket packet={world.packet} positions={positions} />
      {contactShadows ? (
        <ContactShadows position={[0, 0.012, 0.4]} opacity={0.38} scale={22} blur={2.7} far={6} />
      ) : null}
    </>
  );
}
