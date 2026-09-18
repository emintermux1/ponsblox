"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { museMaterials, BOT_EYE } from "@/components/world/muse-materials";
import { usePerf } from "@/components/world/perf-context";
import { damp } from "@/lib/world/camera";
import { museGroundDrop, museSeated } from "@/lib/world/layout";
import type { MuseActivity, MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

function accent(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "#d8b98c";
    case "trader":
      return "#23201c";
    case "chill":
      return "#4a7d55";
    case "builder":
      return "#c9b48a";
    default:
      return assertNever(id);
  }
}

/** Emissive accent for each muse's companion pod. */
function botRing(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "#e8a84e";
    case "trader":
      return "#7fd4e8";
    case "chill":
      return "#8fc79a";
    case "builder":
      return "#e6c579";
    default:
      return assertNever(id);
  }
}

function phaseFor(id: MuseId): number {
  switch (id) {
    case "scroller":
      return 0.35;
    case "trader":
      return 1.8;
    case "chill":
      return 3.2;
    case "builder":
      return 4.7;
    default:
      return assertNever(id);
  }
}

function Puff({
  position,
  radius,
  material,
  scale,
  segments = 16,
}: {
  position: [number, number, number];
  radius: number;
  material: MeshStandardMaterial;
  scale?: [number, number, number];
  segments?: number;
}) {
  const { shadows } = usePerf();
  return (
    <mesh
      castShadow={shadows}
      position={position}
      scale={scale}
      material={material}
      frustumCulled
    >
      <sphereGeometry args={[radius, segments, Math.max(10, segments - 2)]} />
    </mesh>
  );
}

function Headphones() {
  const cup = accent("scroller");
  return (
    <group>
      <mesh position={[0, 0.1, 0]} scale={[1, 0.92, 1]}>
        <torusGeometry args={[0.325, 0.021, 8, 26]} />
        <meshStandardMaterial color="#2c261f" roughness={0.45} metalness={0.25} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.335, -0.01, 0.01]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.095, 0.1, 0.07, 16]} />
            <meshStandardMaterial color={cup} roughness={0.55} />
          </mesh>
          <mesh position={[side * 0.372, -0.01, 0.01]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.062, 0.062, 0.012, 12]} />
            <meshStandardMaterial color="#2c261f" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Cap() {
  const felt = accent("trader");
  return (
    <group>
      <mesh position={[0, 0.16, -0.01]} scale={[1.06, 0.62, 1.06]}>
        <sphereGeometry args={[0.27, 18, 14]} />
        <meshStandardMaterial color={felt} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.1, 0.22]} scale={[1.08, 1, 1.25]}>
        <cylinderGeometry args={[0.23, 0.24, 0.024, 18]} />
        <meshStandardMaterial color={felt} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.33, -0.01]}>
        <sphereGeometry args={[0.032, 10, 10]} />
        <meshStandardMaterial color="#b08a4f" roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  );
}

function Pencil() {
  return (
    <group position={[0.28, 0.1, 0.04]} rotation={[0.12, 0, -1.28]}>
      <mesh>
        <cylinderGeometry args={[0.016, 0.016, 0.15, 8]} />
        <meshStandardMaterial color="#e8b25c" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <coneGeometry args={[0.016, 0.035, 8]} />
        <meshStandardMaterial color="#4a3426" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Scarf() {
  const color = accent("chill");
  return (
    <group>
      <mesh position={[0, 0.84, 0.02]} rotation={[1.45, 0, 0.05]}>
        <torusGeometry args={[0.235, 0.055, 10, 22]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh position={[0.13, 0.68, 0.25]} rotation={[0.16, 0, -0.12]}>
        <boxGeometry args={[0.12, 0.24, 0.045]} />
        <meshStandardMaterial color={color} roughness={0.84} />
      </mesh>
      <mesh position={[0.02, 0.6, 0.27]} rotation={[0.2, 0, 0.14]}>
        <boxGeometry args={[0.11, 0.3, 0.045]} />
        <meshStandardMaterial color={color} roughness={0.84} />
      </mesh>
    </group>
  );
}

function Phone() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.1, 0.17, 0.018]} />
        <meshStandardMaterial color="#11110f" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.082, 0.14]} />
        <meshStandardMaterial
          color="#1a2430"
          emissive="#3a4d66"
          emissiveIntensity={0.55}
        />
      </mesh>
    </group>
  );
}

function Card() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.17, 0.12, 0.01]} />
        <meshStandardMaterial color={accent("builder")} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={[0.14, 0.08]} />
        <meshStandardMaterial color="#f4ead4" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Pipe() {
  return (
    <group>
      <mesh rotation={[0.15, 0, Math.PI / 2]} position={[0.05, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
        <meshStandardMaterial color="#d8cfc2" roughness={0.6} />
      </mesh>
      <mesh position={[0.11, 0.01, 0]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshStandardMaterial color="#c45a28" emissive="#a04018" emissiveIntensity={0.45} />
      </mesh>
    </group>
  );
}

type Motion = {
  offset: [number, number, number];
  facing: number;
  sway: [number, number, number];
  torso: [number, number, number];
  head: [number, number, number];
  leftArm: [number, number, number];
  rightArm: [number, number, number];
  leftFoot: [number, number, number];
  rightFoot: [number, number, number];
  prop: [number, number, number];
};

function motionFor(activity: MuseActivity, t: number, phase: number): Motion {
  const breathe = Math.sin(t * 1.65 + phase);
  const shift = Math.sin(t * 0.74 + phase * 0.8);
  const look = Math.sin(t * 0.41 + phase * 1.25);
  const motion: Motion = {
    offset: [shift * 0.03, 0.018 * breathe, look * 0.014],
    facing: look * 0.16,
    sway: [0.035 * shift, 0.055 * look, 0.05 * shift],
    torso: [1 + breathe * 0.02, 1 + breathe * 0.034, 1 + breathe * 0.02],
    head: [0.05 * breathe, 0.12 * look, 0.035 * shift],
    leftArm: [0.12 * breathe, 0.04 * look, 0.2 + 0.07 * shift],
    rightArm: [0.12 * breathe, -0.04 * look, -0.2 - 0.07 * shift],
    leftFoot: [0, 0, 0],
    rightFoot: [0, 0, 0],
    prop: [0, 0, 0],
  };

  switch (activity) {
    case "IDLE":
      break;
    case "SCROLLING": {
      const flick = Math.sin(t * 8.4 + phase);
      motion.head = [0.34 + flick * 0.05, 0.22, 0.06];
      motion.rightArm = [-0.95, -0.28, -0.18];
      motion.leftArm = [0.18, 0.2, 0.42];
      motion.prop = [flick * 0.42, 0.12, 0.1];
      motion.sway = [0.1 + 0.03 * shift, 0.08 * look, flick * 0.045];
      motion.offset[1] += Math.abs(flick) * 0.006;
      break;
    }
    case "WALKING": {
      const step = t * 4.6 + phase;
      const lift = Math.abs(Math.sin(step));
      motion.offset[1] += lift * 0.04;
      motion.sway = [0.08, Math.sin(step) * 0.14, Math.sin(step) * 0.11];
      motion.leftArm = [Math.sin(step) * 0.58, 0, 0.22];
      motion.rightArm = [Math.sin(step + Math.PI) * 0.58, 0, -0.22];
      motion.leftFoot = [0, Math.max(0, Math.sin(step)) * 0.05, Math.sin(step) * 0.1];
      motion.rightFoot = [
        0,
        Math.max(0, Math.sin(step + Math.PI)) * 0.05,
        Math.sin(step + Math.PI) * 0.1,
      ];
      motion.head = [0.06, Math.sin(step) * 0.08, Math.sin(step) * 0.05];
      break;
    }
    case "SMOKING": {
      const drag = (Math.sin(t * 1.15 + phase) + 1) / 2;
      motion.torso = [1 + drag * 0.045, 1 + drag * 0.08, 1 + drag * 0.045];
      motion.head = [0.1 + drag * 0.04, 0.18, 0.05];
      motion.rightArm = [-0.82, 0.12, -0.42];
      motion.prop = [0.15, 0.35, 0.1];
      motion.sway = [0.12 + 0.02 * shift, 0.08 * look, 0.04 * shift];
      break;
    }
    case "CHILLING":
      motion.sway = [0.16 + 0.03 * shift, 0.1 * look, 0.06 * shift];
      motion.head = [0.16, 0.14 * look, 0.05];
      motion.leftArm = [0.25, 0.1, 0.35];
      motion.rightArm = [0.2, -0.08, -0.28];
      break;
    case "WATCHING":
      motion.sway = [0.14, 0.04 * look, 0.03 * shift];
      motion.head = [0.18, 0.08 * look, 0.02];
      motion.leftArm = [-0.35, 0.1, 0.25];
      motion.rightArm = [-0.28, -0.08, -0.22];
      break;
    case "TRADING": {
      const tap = Math.sin(t * 7.2 + phase);
      motion.sway = [0.16, 0.03, tap * 0.03];
      motion.head = [0.22, 0.06, 0];
      motion.rightArm = [-0.7 + tap * 0.12, -0.15, -0.12];
      motion.leftArm = [-0.45, 0.12, 0.2];
      break;
    }
    case "RESEARCHING": {
      const jot = Math.sin(t * 3.4 + phase);
      motion.head = [0.28 + jot * 0.04, -0.16, 0.04];
      motion.leftArm = [-0.75, 0.35, 0.28];
      motion.rightArm = [-0.2, -0.12, -0.32];
      motion.prop = [jot * 0.2, 0.08, 0.12];
      motion.sway = [0.08, -0.06, 0.04 * shift];
      break;
    }
    case "THINKING":
      motion.head = [0.12, 0.08, 0.2 + 0.04 * shift];
      motion.leftArm = [-0.95, 0.42, 0.55];
      motion.rightArm = [0.15, -0.1, -0.22];
      break;
    case "TALKING":
      motion.head = [0.08 + Math.sin(t * 5.6 + phase) * 0.1, 0.1 * look, 0];
      motion.leftArm = [0.2, 0.15, 0.45];
      motion.rightArm = [-0.35, -0.2, -0.4];
      break;
    case "REACTING": {
      const hop = Math.abs(Math.sin(t * 7.8 + phase));
      motion.offset[1] += hop * 0.07;
      motion.torso = [1 + hop * 0.04, 1 + hop * 0.06, 1 + hop * 0.04];
      motion.head = [-0.08, 0.16 * look, 0];
      motion.leftArm = [-1.1, 0.2, 0.55];
      motion.rightArm = [-1.05, -0.2, -0.55];
      break;
    }
    default:
      return assertNever(activity);
  }
  return motion;
}

function dampRot(group: Group | null, rot: [number, number, number], lambda: number, dt: number) {
  if (!group) return;
  group.rotation.x = damp(group.rotation.x, rot[0], lambda, dt);
  group.rotation.y = damp(group.rotation.y, rot[1], lambda, dt);
  group.rotation.z = damp(group.rotation.z, rot[2], lambda, dt);
}

function dampPos(group: Group | null, pos: [number, number, number], lambda: number, dt: number) {
  if (!group) return;
  group.position.x = damp(group.position.x, pos[0], lambda, dt);
  group.position.y = damp(group.position.y, pos[1], lambda, dt);
  group.position.z = damp(group.position.z, pos[2], lambda, dt);
}

function dampScale(group: Group | null, scale: [number, number, number], lambda: number, dt: number) {
  if (!group) return;
  group.scale.x = damp(group.scale.x, scale[0], lambda, dt);
  group.scale.y = damp(group.scale.y, scale[1], lambda, dt);
  group.scale.z = damp(group.scale.z, scale[2], lambda, dt);
}

function SmokePuffs({ active }: { active: boolean }) {
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);
  const c = useRef<Mesh>(null);

  useFrame((state) => {
    const puffs = [a.current, b.current, c.current];
    puffs.forEach((mesh, i) => {
      if (!mesh) return;
      if (!active) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const cycle = (state.clock.elapsedTime * 0.38 + i * 0.33) % 1;
      mesh.position.set(
        0.14 + Math.sin(state.clock.elapsedTime + i) * 0.04,
        1.14 + cycle * 0.5,
        0.24,
      );
      const size = 0.03 + cycle * 0.07;
      mesh.scale.set(size, size, size);
      const material = mesh.material;
      if ("opacity" in material) {
        material.opacity = (1 - cycle) * 0.38;
      }
    });
  });

  return (
    <group>
      <mesh ref={a} visible={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#efe6d6" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={b} visible={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#efe6d6" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={c} visible={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#efe6d6" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function HeadGear({ id }: { id: MuseId }) {
  switch (id) {
    case "scroller":
      return <Headphones />;
    case "trader":
      return <Cap />;
    case "builder":
      return <Pencil />;
    case "chill":
      return null;
    default:
      return assertNever(id);
  }
}

function LeftHandProp({ id }: { id: MuseId }) {
  switch (id) {
    case "builder":
      return <Card />;
    case "scroller":
    case "trader":
    case "chill":
      return null;
    default:
      return assertNever(id);
  }
}

function RightHandProp({ id }: { id: MuseId }) {
  switch (id) {
    case "scroller":
      return <Phone />;
    case "chill":
      return <Pipe />;
    case "trader":
    case "builder":
      return null;
    default:
      return assertNever(id);
  }
}

/**
 * The muse's companion — a glossy ceramic Grok pod that hovers at its side.
 * White clear-coat shell, black glass face, vertical pill eyes, emissive ring.
 */
function GrokCompanion({ id, selected }: { id: MuseId; selected: boolean }) {
  const { pauseExtras, glass, shadows } = usePerf();
  const mats = museMaterials(glass);
  const group = useRef<Group>(null);
  const ringMat = useRef<MeshStandardMaterial>(null);
  const phase = phaseFor(id);
  const ring = botRing(id);

  useFrame((state) => {
    const t = pauseExtras ? 0 : state.clock.elapsedTime;
    if (group.current) {
      group.current.position.y = 0.6 + Math.sin(t * 1.7 + phase) * 0.045;
      group.current.rotation.y = Math.sin(t * 0.55 + phase) * 0.38;
      group.current.rotation.z = Math.sin(t * 0.8 + phase * 1.3) * 0.05;
    }
    if (ringMat.current) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + phase);
      ringMat.current.emissiveIntensity = (selected ? 1.5 : 0.85) + pulse * 0.5;
    }
  });

  return (
    <group ref={group} position={[0.68, 0.6, 0.2]}>
      <mesh castShadow={shadows} scale={[0.9, 1.2, 0.9]} material={mats.botShell}>
        <sphereGeometry args={[0.16, 24, 20]} />
      </mesh>
      <mesh position={[0, 0.05, 0.096]} scale={[0.92, 0.84, 0.5]} material={mats.botFace}>
        <sphereGeometry args={[0.115, 18, 14]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.045, 0.052, 0.15]}
          rotation={[0, 0, side * -0.12]}
        >
          <capsuleGeometry args={[0.016, 0.05, 4, 10]} />
          <meshStandardMaterial
            color="#0b0c10"
            emissive={BOT_EYE}
            emissiveIntensity={2.3}
            roughness={0.3}
          />
        </mesh>
      ))}
      <mesh position={[0, -0.065, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.152, 0.011, 8, 28]} />
        <meshStandardMaterial
          ref={ringMat}
          color="#1c1a16"
          emissive={ring}
          emissiveIntensity={1}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.215, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.06, 6]} />
        <meshStandardMaterial color="#c8c5be" roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.252, 0]}>
        <sphereGeometry args={[0.017, 10, 10]} />
        <meshStandardMaterial
          color="#1c1a16"
          emissive={ring}
          emissiveIntensity={1.25}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}

export function MuseBody({
  muse,
  selected,
  onSelect,
}: {
  muse: MuseState;
  selected: boolean;
  onSelect: () => void;
}) {
  const root = useRef<Group>(null);
  const ground = useRef<Group>(null);
  const sway = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftFoot = useRef<Group>(null);
  const rightFoot = useRef<Group>(null);
  const leftProp = useRef<Group>(null);
  const rightProp = useRef<Group>(null);
  const leftEye = useRef<Mesh>(null);
  const rightEye = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const phase = phaseFor(muse.id);
  const { pauseExtras, glass, shadows } = usePerf();
  const mats = museMaterials(glass);

  useFrame((state, delta) => {
    if (!root.current) return;
    const t = pauseExtras ? 0 : state.clock.elapsedTime;
    const motion = motionFor(muse.activity, t, phase);
    const seated = museSeated(muse.position);
    root.current.position.set(
      muse.position[0] + motion.offset[0],
      muse.position[1] + motion.offset[1],
      muse.position[2] + motion.offset[2],
    );
    root.current.rotation.y = muse.facing + motion.facing;
    dampPos(ground.current, [0, museGroundDrop(muse.position), 0], 4.5, delta);
    dampRot(sway.current, motion.sway, 5.5, delta);
    dampScale(torso.current, motion.torso, 4.2, delta);
    dampRot(head.current, motion.head, 6.2, delta);
    dampRot(leftArm.current, motion.leftArm, 6.8, delta);
    dampRot(rightArm.current, motion.rightArm, 6.8, delta);
    const tuck: [number, number, number] = seated ? [0, 0.05, 0.2] : [0, 0, 0];
    dampPos(
      leftFoot.current,
      [motion.leftFoot[0] + tuck[0], motion.leftFoot[1] + tuck[1], motion.leftFoot[2] + tuck[2]],
      8,
      delta,
    );
    dampPos(
      rightFoot.current,
      [motion.rightFoot[0] + tuck[0], motion.rightFoot[1] + tuck[1], motion.rightFoot[2] + tuck[2]],
      8,
      delta,
    );
    dampRot(leftProp.current, motion.prop, 7.5, delta);
    dampRot(rightProp.current, motion.prop, 7.5, delta);
    const blinkCycle = (t * 0.31 + phase) % 1;
    const blink = blinkCycle < 0.055 ? Math.sin((blinkCycle / 0.055) * Math.PI) : 0;
    const lidY = 1 - blink * 0.85;
    if (leftEye.current) leftEye.current.scale.set(1, lidY, 1);
    if (rightEye.current) rightEye.current.scale.set(1, lidY, 1);
    if (ring.current) {
      const pulse = pauseExtras ? 1 : 1 + Math.sin(state.clock.elapsedTime * 2.1) * 0.06;
      ring.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group
      ref={root}
      position={muse.position}
      rotation={[0, muse.facing, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <group ref={ground} position={[0, museGroundDrop(muse.position), 0]}>
        <group ref={sway}>
          <group ref={torso}>
            <Puff position={[0, 0.5, 0]} radius={0.36} scale={[1.02, 1.12, 0.94]} material={mats.fur} segments={24} />
            <Puff position={[0, 0.4, -0.33]} radius={0.11} material={mats.furLight} segments={12} />
            {muse.id === "chill" ? <Scarf /> : null}
            <group ref={head} position={[0, 1.02, 0.02]}>
              <Puff position={[0, 0, 0]} radius={0.31} scale={[1.06, 0.97, 0.98]} material={mats.fur} segments={26} />
              {muse.id !== "trader" ? (
                <>
                  <Puff position={[0.1, 0.28, -0.04]} radius={0.07} material={mats.furShade} segments={10} />
                  <Puff position={[-0.11, 0.27, 0.05]} radius={0.06} material={mats.fur} segments={10} />
                  <Puff position={[0, 0.31, 0.08]} radius={0.05} material={mats.furShade} segments={10} />
                </>
              ) : null}
              {[-1, 1].map((side) => (
                <group key={side}>
                  <Puff position={[side * 0.27, 0.14, -0.02]} radius={0.09} material={mats.fur} segments={12} />
                  <mesh
                    castShadow={shadows}
                    position={[side * 0.34, -0.05, -0.02]}
                    rotation={[0, 0, side * -0.24]}
                    scale={[1, 1, 0.55]}
                    material={mats.furShade}
                  >
                    <capsuleGeometry args={[0.085, 0.2, 6, 12]} />
                  </mesh>
                </group>
              ))}
              <Puff position={[0, -0.045, 0.14]} radius={0.26} scale={[0.82, 0.68, 0.72]} material={mats.facePlate} segments={22} />
              {[-1, 1].map((side) => (
                <mesh
                  key={side}
                  ref={side < 0 ? leftEye : rightEye}
                  position={[side * 0.105, 0.032, 0.288]}
                  material={mats.bead}
                >
                  <sphereGeometry args={[0.048, 14, 12]} />
                  <mesh position={[0.014, 0.017, 0.038]}>
                    <sphereGeometry args={[0.013, 8, 8]} />
                    <meshStandardMaterial
                      color="#fffdf6"
                      emissive="#fffdf6"
                      emissiveIntensity={0.5}
                      roughness={0.2}
                    />
                  </mesh>
                </mesh>
              ))}
              {[-1, 1].map((side) => (
                <Puff
                  key={side}
                  position={[side * 0.175, -0.075, 0.235]}
                  radius={0.062}
                  scale={[1, 0.72, 0.42]}
                  material={mats.blush}
                  segments={12}
                />
              ))}
              <Puff position={[0, -0.035, 0.316]} radius={0.05} scale={[0.8, 0.55, 0.5]} material={mats.nose} segments={12} />
              <HeadGear id={muse.id} />
            </group>
            <group ref={leftArm} position={[-0.34, 0.64, 0.03]}>
              <mesh
                castShadow={shadows}
                position={[0.01, -0.09, 0.01]}
                rotation={[0, 0, 0.15]}
                material={mats.fur}
              >
                <capsuleGeometry args={[0.075, 0.13, 6, 12]} />
              </mesh>
              <Puff position={[0.03, -0.2, 0.045]} radius={0.09} material={mats.furLight} segments={12} />
              <group ref={leftProp} position={[0.05, -0.27, 0.09]}>
                <LeftHandProp id={muse.id} />
              </group>
            </group>
            <group ref={rightArm} position={[0.34, 0.64, 0.03]}>
              <mesh
                castShadow={shadows}
                position={[-0.01, -0.09, 0.01]}
                rotation={[0, 0, -0.15]}
                material={mats.fur}
              >
                <capsuleGeometry args={[0.075, 0.13, 6, 12]} />
              </mesh>
              <Puff position={[-0.03, -0.2, 0.045]} radius={0.09} material={mats.furLight} segments={12} />
              <group ref={rightProp} position={[-0.05, -0.27, 0.09]}>
                <RightHandProp id={muse.id} />
              </group>
            </group>
          </group>
          <group position={[-0.15, 0.07, 0.06]}>
            <group ref={leftFoot}>
              <Puff position={[0, 0, 0]} radius={0.105} material={mats.furShade} scale={[1.05, 0.62, 1.35]} segments={12} />
            </group>
          </group>
          <group position={[0.15, 0.07, 0.06]}>
            <group ref={rightFoot}>
              <Puff position={[0, 0, 0]} radius={0.105} material={mats.furShade} scale={[1.05, 0.62, 1.35]} segments={12} />
            </group>
          </group>
        </group>
        <GrokCompanion id={muse.id} selected={selected} />
        <SmokePuffs active={!pauseExtras && muse.activity === "SMOKING"} />
        {selected ? (
          <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.42, 0.5, 32]} />
            <meshBasicMaterial color="#e6d3a8" transparent opacity={0.5} />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}
