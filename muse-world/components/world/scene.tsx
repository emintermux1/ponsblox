"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { FrustumGuard } from "@/components/world/frustum-guard";
import { MuseBody } from "@/components/world/muse-body";
import { MuseMindField } from "@/components/world/mind";
import { Penthouse } from "@/components/world/penthouse";
import { TravelPacket } from "@/components/world/packet";
import { usePerf } from "@/components/world/perf-context";
import { CameraRig } from "@/components/world/rig";
import { ThoughtChip } from "@/components/world/thoughts";
import type { MuseId, WorldSnapshot } from "@/types/world";
import { MUSE_IDS } from "@/types/world";

function Lighting() {
  const { extraLights, shadows, shadowMapSize } = usePerf();
  return (
    <>
      <ambientLight intensity={extraLights ? 0.1 : 0.2} color="#d5c7ae" />
      <hemisphereLight args={["#9aa8b8", "#1a1612", extraLights ? 0.42 : 0.62]} />
      <directionalLight
        position={[6, 8, 4]}
        intensity={extraLights ? 1.15 : 1.05}
        color="#f0e2c4"
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
      />
      {extraLights ? (
        <>
          <pointLight position={[-4, 2.4, 1.2]} intensity={0.35} color="#d8c49a" />
          <pointLight position={[3.4, 1.6, -0.6]} intensity={0.4} color="#8aa0b0" />
        </>
      ) : (
        <pointLight position={[0.4, 3.2, 8.4]} intensity={0.22} color="#c4b392" />
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
  const { contactShadows, cameraFar } = usePerf();
  const camera = useThree((state) => state.camera);
  const positions = {
    scroller: world.muses.scroller.position,
    trader: world.muses.trader.position,
    chill: world.muses.chill.position,
    builder: world.muses.builder.position,
  };

  useEffect(() => {
    camera.far = cameraFar;
    camera.updateProjectionMatrix();
  }, [camera, cameraFar]);

  return (
    <>
      <color attach="background" args={["#0b0c10"]} />
      <fog attach="fog" args={["#0b0c10", 14, Math.min(38, cameraFar - 6)]} />
      <Lighting />
      <DemandInvalidator revision={worldRevision(world)} />
      <CameraRig
        preset={world.camera}
        selected={world.selected}
        musePos={musePos}
        introDone={introDone}
        onIntroDone={onIntroDone}
      />
      <Penthouse />
      {MUSE_IDS.map((id) => (
        <FrustumGuard key={id} center={world.muses[id].position} radius={1.6}>
          <MuseBody
            muse={world.muses[id]}
            selected={selected === id}
            onSelect={() => onSelect(id)}
          />
          <MuseMindField
            mind={world.muses[id].mind}
            visible={world.mindOpen && selected === id}
          />
          <ThoughtChip muse={world.muses[id]} selected={selected === id} />
        </FrustumGuard>
      ))}
      <TravelPacket packet={world.packet} positions={positions} />
      {contactShadows ? (
        <ContactShadows position={[0, 0.01, 0.4]} opacity={0.32} scale={22} blur={2.4} far={6} />
      ) : null}
    </>
  );
}
