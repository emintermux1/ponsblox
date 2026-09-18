"use client";

import { useEffect, useLayoutEffect } from "react";
import { ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { FrustumGuard } from "@/components/world/frustum-guard";
import { GrokPresence } from "@/components/world/grok-orb";
import { MuseBody } from "@/components/world/muse-body";
import { MuseMindField } from "@/components/world/mind";
import { UsedBits } from "@/components/world/devices";
import { Penthouse } from "@/components/world/penthouse";
import { TravelPacket } from "@/components/world/packet";
import { usePerf } from "@/components/world/perf-context";
import { CameraRig } from "@/components/world/rig";
import { useTape } from "@/components/world/tape-context";
import { ThoughtChip } from "@/components/world/thoughts";
import { deskGrokLive } from "@/lib/sim/tick";
import { presetForMuse } from "@/lib/world/camera";
import { grokLookAt } from "@/lib/world/grok-watch";
import { GROK_ORB_POS, wallSlotWorld } from "@/lib/world/layout";
import { MIND_LIFT } from "@/lib/world/mind-graph";
import type { TapeView } from "@/lib/world/tape";
import type { MuseId, PacketEndpoint, ScreenId, WorldSnapshot } from "@/types/world";
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
      <color attach="background" args={["#15202c"]} />
      <fog
        attach="fog"
        args={["#243646", extraLights ? 28 : 16, extraLights ? 70 : Math.min(50, cameraFar - 6)]}
      />
      <ambientLight intensity={extraLights ? 0.32 : 0.4} color="#d2c0a6" />
      <hemisphereLight args={["#7f96aa", "#3a2c20", extraLights ? 0.58 : 0.64]} />
      <directionalLight
        position={[7, 9.5, -5]}
        intensity={extraLights ? 0.72 : 0.58}
        color="#c5d2de"
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
      <directionalLight
        position={[-4, 6.2, 7]}
        intensity={extraLights ? 0.85 : 0.55}
        color="#f3d7b0"
      />
      {extraLights ? (
        <>
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
        </>
      ) : (
        <>
          <pointLight position={[0, 3.2, 2]} intensity={0.55} color="#e4c49a" distance={12} decay={2} />
          <pointLight position={[7.1, 2.4, 2.5]} intensity={0.7} color="#f0d4ae" distance={8} decay={2} />
          <pointLight position={[-2.4, 2.6, 2.2]} intensity={0.38} color="#e8cba6" distance={9} decay={2} />
        </>
      )}
    </>
  );
}

function CanvasPointer() {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    el.style.pointerEvents = "auto";
    el.style.userSelect = "none";
    const blockMenu = (event: Event) => {
      event.preventDefault();
    };
    el.addEventListener("contextmenu", blockMenu);
    return () => {
      el.removeEventListener("contextmenu", blockMenu);
    };
  }, [gl]);

  return null;
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

function worldRevision(world: WorldSnapshot, tape: TapeView): string {
  return [
    world.camera,
    world.selected ?? "",
    world.inspecting ?? "",
    world.grokWake.phase,
    world.grokWake.honesty ?? "",
    world.mindOpen ? "1" : "0",
    world.packet?.t ?? 0,
    tape.source,
    tape.ticker ?? "",
    tape.name ?? "",
    tape.changePct ?? "",
    world.grokWake.summary ?? "",
    ...(world.wallPins ?? []).map((pin) => `${pin.slot}:${pin.label}:${pin.at}`),
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
  onInspect,
  onWakeGrok,
}: {
  world: WorldSnapshot;
  introDone: boolean;
  onIntroDone: () => void;
  onSelect: (id: MuseId) => void;
  onInspect: (id: ScreenId) => void;
  onWakeGrok: () => void;
}) {
  const tape = useTape();
  const selected = world.selected;
  const musePos =
    selected && (world.camera === "MIND" || world.camera === presetForMuse(selected))
      ? world.muses[selected].position
      : null;
  const { contactShadows } = usePerf();
  const positions: Record<PacketEndpoint, [number, number, number]> = {
    scroller: world.muses.scroller.position,
    trader: world.muses.trader.position,
    chill: world.muses.chill.position,
    builder: world.muses.builder.position,
    wall: wallSlotWorld(world.packet?.slot ?? 0),
    grok: GROK_ORB_POS,
  };

  return (
    <>
      <Lighting />
      <CanvasPointer />
      <DemandInvalidator revision={worldRevision(world, tape)} />
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
        inspecting={world.inspecting}
        onInspect={onInspect}
        deskLive={
          world.muses.trader.activity === "TRADING" ||
          world.muses.trader.activity === "WATCHING" ||
          world.muses.builder.activity === "THINKING"
        }
        world={world}
      />
      <UsedBits />
      <GrokPresence
        world={world}
        waking={world.grokWake.phase === "waking" || deskGrokLive(world.events)}
        honesty={world.grokWake.honesty}
        lookAt={grokLookAt(world)}
        onWake={onWakeGrok}
      />
      {MUSE_IDS.map((id) => (
        <FrustumGuard key={id} center={world.muses[id].position} radius={id === "chill" ? 2.1 : 1.6}>
          <MuseBody
            muse={world.muses[id]}
            selected={selected === id}
            hugging={world.grokWake.museId === id && world.grokWake.phase !== "idle"}
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
