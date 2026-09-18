"use client";

import { useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { usePerf } from "@/components/world/perf-context";
import { damp } from "@/lib/world/camera";
import { GROK_ORB_HOME } from "@/lib/world/layout";
import type { MuseActivity, MuseId, MuseState } from "@/types/world";
import { assertNever } from "@/types/world";

const CREAM = "#f6f1e8";
const CREAM_WARM = "#fbf6ee";
const CREAM_SHADE = "#e7ddd0";
const INK = "#1a1d33";
const BLUSH = "#f0b4ae";
const HOODIE = "#1a1d24";
const NAVY = "#14161c";
const SCARF = "#3f7a4a";
const PAPER = "#ead9c0";
const LEATHER = "#5c4a3e";
const WOOD = "#4a3426";
const LAPTOP = "#3a3d42";
const SCREEN = "#10151c";
const GROK_WHITE = "#f7f8fb";

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

function holdsLaptop(id: MuseId): boolean {
  switch (id) {
    case "scroller":
    case "trader":
      return true;
    case "chill":
    case "builder":
      return false;
    default:
      return assertNever(id);
  }
}

function isSeated(activity: MuseActivity): boolean {
  switch (activity) {
    case "CHILLING":
    case "SMOKING":
    case "WATCHING":
    case "TRADING":
    case "SCROLLING":
    case "RESEARCHING":
    case "IDLE":
      return true;
    case "WALKING":
    case "THINKING":
    case "TALKING":
    case "REACTING":
      return false;
    default:
      return assertNever(activity);
  }
}

function Soft({
  position,
  radius,
  color = CREAM,
  scale,
  roughness = 0.46,
}: {
  position: [number, number, number];
  radius: number;
  color?: string;
  scale?: [number, number, number];
  roughness?: number;
}) {
  const { shadows } = usePerf();
  return (
    <mesh castShadow={shadows} position={position} scale={scale} frustumCulled>
      <sphereGeometry args={[radius, 22, 18]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.04} />
    </mesh>
  );
}

function MuseMark({
  position,
  scale = 1,
  color = INK,
}: {
  position?: [number, number, number];
  scale?: number;
  color?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[-0.02, 0, 0]}>
        <torusGeometry args={[0.02, 0.008, 8, 18]} />
        <meshStandardMaterial color={color} roughness={0.32} metalness={0.08} />
      </mesh>
      <mesh position={[0.02, 0, 0]}>
        <torusGeometry args={[0.02, 0.008, 8, 18]} />
        <meshStandardMaterial color={color} roughness={0.32} metalness={0.08} />
      </mesh>
    </group>
  );
}

function Face({ shades }: { shades: boolean }) {
  return (
    <group>
      {shades ? <Shades /> : (
        <>
          <MuseMark position={[-0.09, 0.028, 0.2]} scale={1.55} />
          <MuseMark position={[0.09, 0.028, 0.2]} scale={1.55} />
        </>
      )}
      <mesh position={[-0.14, -0.03, 0.18]} scale={[1.35, 0.8, 0.4]}>
        <sphereGeometry args={[0.036, 10, 8]} />
        <meshStandardMaterial color={BLUSH} roughness={0.7} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.14, -0.03, 0.18]} scale={[1.35, 0.8, 0.4]}>
        <sphereGeometry args={[0.036, 10, 8]} />
        <meshStandardMaterial color={BLUSH} roughness={0.7} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, -0.07, 0.2]} rotation={[0.4, 0, 0]} scale={[1.15, 0.6, 0.5]}>
        <torusGeometry args={[0.032, 0.006, 8, 14, Math.PI]} />
        <meshStandardMaterial color={INK} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Flipper({
  position,
  rotation,
  color = CREAM,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}) {
  const { shadows } = usePerf();
  return (
    <mesh
      castShadow={shadows}
      position={position}
      rotation={rotation}
      scale={[0.62, 1.05, 0.72]}
      frustumCulled
    >
      <sphereGeometry args={[0.078, 14, 12]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function Headphones() {
  return (
    <group>
      <mesh position={[0, 0.04, -0.02]} rotation={[0.1, 0, 0]} scale={[1, 0.82, 1]}>
        <torusGeometry args={[0.28, 0.028, 8, 24]} />
        <meshStandardMaterial color={NAVY} roughness={0.38} metalness={0.22} />
      </mesh>
      <mesh position={[-0.27, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.11, 0.08, 16]} />
        <meshStandardMaterial color={NAVY} roughness={0.42} />
      </mesh>
      <mesh position={[0.27, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.11, 0.08, 16]} />
        <meshStandardMaterial color={NAVY} roughness={0.42} />
      </mesh>
      <mesh position={[-0.235, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.078, 0.078, 0.04, 14]} />
        <meshStandardMaterial color={CREAM_SHADE} roughness={0.7} />
      </mesh>
      <mesh position={[0.235, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.078, 0.078, 0.04, 14]} />
        <meshStandardMaterial color={CREAM_SHADE} roughness={0.7} />
      </mesh>
      <group position={[-0.29, 0, 0.03]} rotation={[0, Math.PI / 2, 0]}>
        <MuseMark scale={1.4} color="#e8e4dc" />
      </group>
      <group position={[0.29, 0, 0.03]} rotation={[0, -Math.PI / 2, 0]}>
        <MuseMark scale={1.4} color="#e8e4dc" />
      </group>
    </group>
  );
}

function Cap() {
  return (
    <group position={[0, 0.22, -0.02]}>
      <mesh>
        <sphereGeometry args={[0.24, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color={NAVY} roughness={0.48} />
      </mesh>
      <mesh position={[0, -0.02, 0.16]} rotation={[-0.22, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.022, 20]} />
        <meshStandardMaterial color={NAVY} roughness={0.42} />
      </mesh>
      <group position={[0, 0.1, 0.14]} rotation={[-0.55, 0, 0]}>
        <MuseMark scale={1.05} color="#e8e4dc" />
      </group>
    </group>
  );
}

function Shades() {
  return (
    <group position={[0, 0.03, 0.2]}>
      <mesh position={[-0.08, 0, 0.01]} scale={[1.15, 0.78, 0.28]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color="#0c0d10" metalness={0.55} roughness={0.12} />
      </mesh>
      <mesh position={[0.08, 0, 0.01]} scale={[1.15, 0.78, 0.28]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color="#0c0d10" metalness={0.55} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.012, 0.01]}>
        <boxGeometry args={[0.04, 0.01, 0.012]} />
        <meshStandardMaterial color="#111214" roughness={0.35} />
      </mesh>
      <mesh position={[-0.13, 0.01, -0.04]} rotation={[0, 0.4, 0.08]}>
        <boxGeometry args={[0.07, 0.01, 0.01]} />
        <meshStandardMaterial color="#111214" roughness={0.35} />
      </mesh>
      <mesh position={[0.13, 0.01, -0.04]} rotation={[0, -0.4, -0.08]}>
        <boxGeometry args={[0.07, 0.01, 0.01]} />
        <meshStandardMaterial color="#111214" roughness={0.35} />
      </mesh>
    </group>
  );
}

function Hoodie() {
  const { shadows } = usePerf();
  return (
    <group>
      <mesh castShadow={shadows} position={[0, 0.36, 0.02]} scale={[1.16, 0.78, 1.12]}>
        <sphereGeometry args={[0.3, 22, 18]} />
        <meshStandardMaterial color={HOODIE} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.58, -0.02]} rotation={[0.55, 0, 0]} scale={[1.02, 0.55, 0.8]}>
        <torusGeometry args={[0.18, 0.045, 10, 20]} />
        <meshStandardMaterial color={HOODIE} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.34, 0.26]}>
        <boxGeometry args={[0.2, 0.12, 0.05]} />
        <meshStandardMaterial color="#151820" roughness={0.76} />
      </mesh>
    </group>
  );
}

function Scarf() {
  return (
    <group>
      <mesh position={[0, 0.62, 0.04]} rotation={[0.35, 0.1, 0.05]}>
        <torusGeometry args={[0.22, 0.07, 10, 22]} />
        <meshStandardMaterial color={SCARF} roughness={0.78} />
      </mesh>
      <Soft position={[0.16, 0.42, 0.2]} radius={0.068} color={SCARF} scale={[1.7, 0.75, 0.55]} roughness={0.8} />
      <Soft position={[0.2, 0.26, 0.22]} radius={0.058} color="#356643" scale={[1.4, 0.9, 0.5]} roughness={0.8} />
    </group>
  );
}

function Laptop() {
  return (
    <group rotation={[-0.38, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.46, 0.016, 0.3]} />
        <meshStandardMaterial color={LAPTOP} metalness={0.45} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.16, -0.13]} rotation={[1.08, 0, 0]}>
        <boxGeometry args={[0.46, 0.28, 0.012]} />
        <meshStandardMaterial color={LAPTOP} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.168, -0.12]} rotation={[1.08, 0, 0]}>
        <planeGeometry args={[0.4, 0.23]} />
        <meshStandardMaterial
          color={SCREEN}
          emissive="#7f9aaf"
          emissiveIntensity={0.7}
          roughness={0.18}
        />
      </mesh>
      <group position={[0, 0.012, 0.148]} rotation={[Math.PI / 2, 0, 0]}>
        <MuseMark scale={1.8} color="#e8e4dc" />
      </group>
    </group>
  );
}

function Notes() {
  return (
    <group>
      <mesh rotation={[-0.5, 0.18, 0.06]}>
        <boxGeometry args={[0.3, 0.018, 0.22]} />
        <meshStandardMaterial color={PAPER} roughness={0.86} />
      </mesh>
      <mesh position={[0.02, 0.016, 0.012]} rotation={[-0.46, 0.26, 0.1]}>
        <boxGeometry args={[0.28, 0.016, 0.2]} />
        <meshStandardMaterial color="#f3ead8" roughness={0.84} />
      </mesh>
      <mesh position={[-0.012, 0.032, 0.02]} rotation={[-0.4, 0.1, 0.04]}>
        <boxGeometry args={[0.26, 0.014, 0.18]} />
        <meshStandardMaterial color="#f7f0e2" roughness={0.82} />
      </mesh>
      <mesh position={[0.12, 0.04, 0.03]} rotation={[0.2, 0.3, 0.5]}>
        <cylinderGeometry args={[0.008, 0.008, 0.22, 8]} />
        <meshStandardMaterial color="#c4a46a" roughness={0.55} />
      </mesh>
    </group>
  );
}

function Armchair() {
  const { shadows } = usePerf();
  return (
    <group position={[0, 0, -0.08]}>
      <mesh castShadow={shadows} position={[0, 0.16, 0.02]}>
        <boxGeometry args={[0.88, 0.12, 0.74]} />
        <meshStandardMaterial color={LEATHER} roughness={0.64} />
      </mesh>
      <mesh castShadow={shadows} position={[0, 0.58, -0.32]}>
        <boxGeometry args={[0.88, 0.78, 0.16]} />
        <meshStandardMaterial color={LEATHER} roughness={0.6} />
      </mesh>
      <mesh castShadow={shadows} position={[-0.42, 0.32, 0.04]}>
        <boxGeometry args={[0.12, 0.26, 0.62]} />
        <meshStandardMaterial color="#6a5648" roughness={0.66} />
      </mesh>
      <mesh castShadow={shadows} position={[0.42, 0.32, 0.04]}>
        <boxGeometry args={[0.12, 0.26, 0.62]} />
        <meshStandardMaterial color="#6a5648" roughness={0.66} />
      </mesh>
      {([-0.34, 0.34] as const).map((x) =>
        ([-0.24, 0.24] as const).map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.06, z]}>
            <boxGeometry args={[0.07, 0.12, 0.07]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
  );
}

function HeadGear({ id }: { id: MuseId }) {
  switch (id) {
    case "scroller":
      return <Headphones />;
    case "trader":
      return <Cap />;
    case "chill":
    case "builder":
      return null;
    default:
      return assertNever(id);
  }
}

function Nameplate({ name, role }: { name: string; role: string }) {
  return (
    <Billboard position={[0, 1.2, 0]} follow>
      <Text
        fontSize={0.05}
        letterSpacing={0.06}
        color="#efe6d4"
        fillOpacity={0.78}
        anchorX="center"
        anchorY="bottom"
      >
        {name}
      </Text>
      <Text
        position={[0, -0.012, 0]}
        fontSize={0.03}
        letterSpacing={0.14}
        color="#c9b48a"
        fillOpacity={0.62}
        anchorX="center"
        anchorY="top"
      >
        {role}
      </Text>
    </Billboard>
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
  };

  switch (activity) {
    case "IDLE":
      break;
    case "SCROLLING": {
      const flick = Math.sin(t * 8.4 + phase);
      motion.head = [0.28 + flick * 0.04, 0.16, 0.04];
      motion.sway = [0.08 + 0.03 * shift, 0.06 * look, flick * 0.03];
      motion.offset[1] += Math.abs(flick) * 0.004;
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
    case "SMOKING":
    case "CHILLING":
      motion.sway = [0.16 + 0.03 * shift, 0.1 * look, 0.06 * shift];
      motion.head = [0.12, 0.14 * look, 0.05];
      motion.leftArm = [0.22, 0.08, 0.32];
      motion.rightArm = [0.18, -0.06, -0.26];
      break;
    case "WATCHING":
      motion.sway = [0.12, 0.04 * look, 0.03 * shift];
      motion.head = [0.16, 0.08 * look, 0.02];
      break;
    case "TRADING": {
      const tap = Math.sin(t * 7.2 + phase);
      motion.sway = [0.14, 0.03, tap * 0.025];
      motion.head = [0.2, 0.05, 0];
      break;
    }
    case "RESEARCHING": {
      const jot = Math.sin(t * 3.4 + phase);
      motion.head = [0.24 + jot * 0.04, -0.14, 0.04];
      motion.leftArm = [-0.7, 0.32, 0.26];
      motion.rightArm = [-0.18, -0.1, -0.28];
      motion.sway = [0.08, -0.06, 0.04 * shift];
      break;
    }
    case "THINKING":
      motion.head = [0.12, 0.08, 0.2 + 0.04 * shift];
      motion.leftArm = [-0.85, 0.38, 0.48];
      motion.rightArm = [0.12, -0.08, -0.2];
      break;
    case "TALKING":
      motion.head = [0.08 + Math.sin(t * 5.6 + phase) * 0.1, 0.1 * look, 0];
      motion.leftArm = [0.18, 0.12, 0.4];
      motion.rightArm = [-0.28, -0.16, -0.36];
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

function holdLaptopArms(motion: Motion, walking: boolean) {
  if (walking) {
    return;
  }
  motion.leftArm = [-0.62, 0.16, 0.26];
  motion.rightArm = [-0.62, -0.16, -0.26];
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

export function GrokOrb({
  home = GROK_ORB_HOME,
  live,
}: {
  home?: [number, number, number];
  live: boolean;
}) {
  const root = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const { pauseExtras } = usePerf();

  useFrame((state) => {
    if (!root.current) return;
    const t = pauseExtras ? 0 : state.clock.elapsedTime;
    const bob = Math.sin(t * 1.15) * 0.055;
    const drift = Math.sin(t * 0.42) * 0.08;
    root.current.position.set(home[0] + drift, home[1] + bob, home[2]);
    if (core.current) {
      const pulse = live ? 1.08 + Math.sin(t * 3.2) * 0.05 : 1;
      core.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={root} position={home}>
      <mesh ref={core}>
        <sphereGeometry args={[0.2, 28, 22]} />
        <meshStandardMaterial
          color={GROK_WHITE}
          emissive={GROK_WHITE}
          emissiveIntensity={live ? 0.7 : 0.38}
          roughness={0.16}
          metalness={0.08}
        />
      </mesh>
      <mesh scale={1.28}>
        <sphereGeometry args={[0.2, 18, 14]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={live ? 0.2 : 0.1} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[0.21, 0.008, 8, 28]} />
        <meshStandardMaterial color="#d8dde4" roughness={0.3} metalness={0.2} />
      </mesh>
      <Billboard position={[0, 0.28, 0]} follow>
        <Text
          fontSize={0.042}
          letterSpacing={0.08}
          color="#f7f8fb"
          fillOpacity={0.8}
          anchorX="center"
          anchorY="bottom"
        >
          Grok
        </Text>
        <Text
          position={[0, -0.01, 0]}
          fontSize={0.026}
          letterSpacing={0.16}
          color="#c9b48a"
          fillOpacity={0.55}
          anchorX="center"
          anchorY="top"
        >
          ORB
        </Text>
      </Billboard>
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
  const sway = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftFoot = useRef<Group>(null);
  const rightFoot = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const phase = phaseFor(muse.id);
  const { pauseExtras, shadows } = usePerf();
  const seated = isSeated(muse.activity);
  const laptop = holdsLaptop(muse.id);
  const chair = muse.id === "chill" && seated;
  const shadeFace = muse.id === "trader";
  const flipper = muse.id === "trader" ? CREAM_SHADE : CREAM;

  useFrame((state, delta) => {
    if (!root.current) return;
    const motion = motionFor(
      muse.activity,
      pauseExtras ? 0 : state.clock.elapsedTime,
      phase,
    );
    if (laptop) {
      holdLaptopArms(motion, muse.activity === "WALKING" || muse.activity === "REACTING");
    }
    if (seated) {
      motion.offset[1] -= 0.08;
    }
    root.current.position.set(
      muse.position[0] + motion.offset[0],
      muse.position[1] + motion.offset[1],
      muse.position[2] + motion.offset[2],
    );
    root.current.rotation.y = muse.facing + motion.facing;
    dampRot(sway.current, motion.sway, 5.5, delta);
    dampScale(torso.current, motion.torso, 4.2, delta);
    dampRot(head.current, motion.head, 6.2, delta);
    dampRot(leftArm.current, motion.leftArm, 6.8, delta);
    dampRot(rightArm.current, motion.rightArm, 6.8, delta);
    dampPos(leftFoot.current, motion.leftFoot, 8, delta);
    dampPos(rightFoot.current, motion.rightFoot, 8, delta);
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
      {chair ? (
        <group position={[0, -0.62, 0]}>
          <Armchair />
        </group>
      ) : null}
      <group ref={sway}>
        <group ref={torso}>
          <mesh castShadow={shadows} position={[0, 0.5, 0]} scale={[1.02, 1.28, 0.94]}>
            <sphereGeometry args={[0.34, 28, 22]} />
            <meshStandardMaterial color={CREAM} roughness={0.42} metalness={0.03} />
          </mesh>
          {muse.id === "trader" ? <Hoodie /> : null}
          {muse.id === "chill" ? <Scarf /> : null}
          <group ref={head} position={[0, 0.72, 0.04]}>
            <Face shades={shadeFace} />
            <HeadGear id={muse.id} />
          </group>
          <group ref={leftArm} position={[-0.3, 0.5, 0.06]}>
            <Flipper position={[-0.05, -0.12, 0.06]} rotation={[0.2, 0, 0.4]} color={flipper} />
          </group>
          <group ref={rightArm} position={[0.3, 0.5, 0.06]}>
            <Flipper position={[0.05, -0.12, 0.06]} rotation={[0.2, 0, -0.4]} color={flipper} />
          </group>
          {laptop ? (
            <group position={[0, 0.5, 0.46]}>
              <Laptop />
            </group>
          ) : null}
          {muse.id === "builder" ? (
            <group position={[0.02, 0.4, 0.34]} rotation={[0.1, 0.15, 0.04]}>
              <Notes />
            </group>
          ) : null}
        </group>
        {seated ? null : (
          <>
            <group position={[-0.1, 0.1, 0.04]}>
              <group ref={leftFoot}>
                <Flipper position={[0, 0, 0.02]} rotation={[0.4, 0, 0]} color={CREAM_SHADE} />
              </group>
            </group>
            <group position={[0.1, 0.1, 0.04]}>
              <group ref={rightFoot}>
                <Flipper position={[0, 0, 0.02]} rotation={[0.4, 0, 0]} color={CREAM_SHADE} />
              </group>
            </group>
          </>
        )}
      </group>
      <Nameplate name={muse.name} role={muse.role} />
      {selected ? (
        <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.5, 32]} />
          <meshBasicMaterial color="#e6d3a8" transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}
