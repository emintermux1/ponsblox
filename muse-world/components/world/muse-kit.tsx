"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  InstancedMesh,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type Group,
} from "three";
import { LitScreen, type ScreenKind } from "@/components/world/lit-screen";
import { LaptopDevice, PhoneDevice } from "@/components/world/screens";
import { usePerf } from "@/components/world/perf-context";
import type { MuseActivity, MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

const FUR = "#f3eee4";
const FUR_LIGHT = "#fbf7ef";
const FACE = "#fbf6ee";
const EAR_IN = "#f0d4c8";
const NAVY = "#0c1a33";
const HOOD = "#141414";
const GREEN = "#3f7a4a";
const SILVER = "#c8cdd3";
const CREAM_CUP = "#d8d2c8";

let furMap: CanvasTexture | null = null;

function makeFurMap(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("fur canvas");
  }
  ctx.fillStyle = FUR;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3200; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 3 + Math.random() * 11;
    const angle = -0.45 + Math.random() * 0.9;
    ctx.strokeStyle = Math.random() > 0.45 ? "#ebe3d4" : "#faf6ef";
    ctx.lineWidth = 0.55 + Math.random() * 1.15;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(angle) * len, y + Math.cos(angle) * len);
    ctx.stroke();
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.repeat.set(2.2, 2.2);
  tex.needsUpdate = true;
  return tex;
}

function getFurMap(): CanvasTexture | null {
  if (typeof document === "undefined") {
    return null;
  }
  if (!furMap) {
    furMap = makeFurMap();
  }
  return furMap;
}

export function FurMaterial({ color = FUR }: { color?: string }) {
  const map = getFurMap();
  return (
    <meshStandardMaterial
      color={color}
      map={map ?? undefined}
      roughness={0.94}
      metalness={0.02}
      bumpMap={map ?? undefined}
      bumpScale={0.04}
    />
  );
}

export function FaceMaterial() {
  return <meshStandardMaterial color={FACE} roughness={0.42} metalness={0.02} />;
}

export function Headphones() {
  return (
    <group>
      <mesh position={[0, 0.1, -0.02]} rotation={[0.08, 0, 0]} scale={[1, 0.78, 1]}>
        <torusGeometry args={[0.23, 0.016, 8, 22]} />
        <meshStandardMaterial color="#cfc8bc" roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[-0.23, 0.01, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.075, 0.082, 0.06, 14]} />
        <meshStandardMaterial color={CREAM_CUP} roughness={0.5} />
      </mesh>
      <mesh position={[0.23, 0.01, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.075, 0.082, 0.06, 14]} />
        <meshStandardMaterial color={CREAM_CUP} roughness={0.5} />
      </mesh>
    </group>
  );
}

function GrokPills({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[-0.028, 0, 0]} scale={[0.38, 1, 0.38]}>
        <capsuleGeometry args={[0.012, 0.028, 4, 8]} />
        <meshStandardMaterial color="#f4f4f4" roughness={0.28} />
      </mesh>
      <mesh position={[0.028, 0, 0]} scale={[0.38, 1, 0.38]}>
        <capsuleGeometry args={[0.012, 0.028, 4, 8]} />
        <meshStandardMaterial color="#f4f4f4" roughness={0.28} />
      </mesh>
    </group>
  );
}

export function Cap() {
  return (
    <group position={[0, 0.2, -0.02]}>
      <mesh>
        <sphereGeometry args={[0.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={NAVY} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.02, 0.16]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.22, 0.018, 0.12]} />
        <meshStandardMaterial color={NAVY} roughness={0.42} />
      </mesh>
      <GrokPills position={[0, 0.1, 0.17]} />
    </group>
  );
}

export function Sunglasses() {
  return (
    <group position={[0, 0.05, 0.24]}>
      <mesh>
        <boxGeometry args={[0.22, 0.012, 0.012]} />
        <meshStandardMaterial color="#111111" roughness={0.3} />
      </mesh>
      <mesh position={[-0.055, 0, 0.012]} scale={[1, 0.62, 0.35]}>
        <sphereGeometry args={[0.046, 12, 10]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.62} roughness={0.18} />
      </mesh>
      <mesh position={[0.055, 0, 0.012]} scale={[1, 0.62, 0.35]}>
        <sphereGeometry args={[0.046, 12, 10]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.62} roughness={0.18} />
      </mesh>
    </group>
  );
}

export function Hoodie() {
  const { shadows } = usePerf();
  return (
    <group>
      <mesh position={[0, 0.3, 0.02]} scale={[1.02, 0.72, 0.98]} castShadow={shadows}>
        <sphereGeometry args={[0.36, 22, 18]} />
        <meshStandardMaterial color={HOOD} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.58, -0.14]} scale={[0.7, 0.42, 0.48]}>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color="#121212" roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.26, 0.3]} scale={[1.1, 0.5, 0.3]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.68} />
      </mesh>
    </group>
  );
}

export function Scarf() {
  return (
    <group>
      <mesh position={[0, 0.58, 0.02]} rotation={[0.5, 0.16, 0.06]}>
        <torusGeometry args={[0.2, 0.048, 10, 20]} />
        <meshStandardMaterial color={GREEN} roughness={0.82} />
      </mesh>
      <mesh position={[0.12, 0.42, 0.16]} scale={[1.4, 0.7, 0.5]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color={GREEN} roughness={0.8} />
      </mesh>
      <mesh position={[0.16, 0.32, 0.18]} scale={[1.1, 0.85, 0.45]}>
        <sphereGeometry args={[0.046, 10, 8]} />
        <meshStandardMaterial color="#4a8a54" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Halo() {
  return (
    <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2.15, 0, 0]}>
      <torusGeometry args={[0.18, 0.013, 8, 24]} />
      <meshStandardMaterial
        color="#f0d48a"
        emissive="#e8c56a"
        emissiveIntensity={0.85}
        roughness={0.28}
        metalness={0.4}
      />
    </mesh>
  );
}

export function FloppyEars() {
  return (
    <group>
      <mesh position={[-0.24, 0.08, -0.04]} rotation={[0.72, 0.12, 0.92]} scale={[0.58, 1.72, 0.4]} castShadow>
        <sphereGeometry args={[0.18, 14, 12]} />
        <FurMaterial color={FUR_LIGHT} />
      </mesh>
      <mesh position={[-0.23, 0.02, 0.01]} rotation={[0.72, 0.12, 0.92]} scale={[0.38, 1.15, 0.22]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color={EAR_IN} roughness={0.78} />
      </mesh>
      <mesh position={[0.24, 0.08, -0.04]} rotation={[0.72, -0.12, -0.92]} scale={[0.58, 1.72, 0.4]} castShadow>
        <sphereGeometry args={[0.18, 14, 12]} />
        <FurMaterial color={FUR_LIGHT} />
      </mesh>
      <mesh position={[0.23, 0.02, 0.01]} rotation={[0.72, -0.12, -0.92]} scale={[0.38, 1.15, 0.22]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color={EAR_IN} roughness={0.78} />
      </mesh>
    </group>
  );
}

export function FurSparkles({ seed }: { seed: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    if (!mesh.current) {
      return;
    }
    for (let i = 0; i < 18; i += 1) {
      const a = seed + i * 0.73;
      dummy.position.set(
        Math.cos(a) * (0.4 + (i % 4) * 0.05),
        0.2 + (i % 6) * 0.15,
        Math.sin(a) * (0.32 + (i % 3) * 0.045),
      );
      const size = 0.7 + (i % 5) * 0.18;
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [dummy, seed]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 18]}>
      <sphereGeometry args={[0.016, 6, 6]} />
      <meshBasicMaterial color="#fff8ee" transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  );
}

export function SilverLaptop({ kind }: { kind: ScreenKind }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.4, 0.012, 0.26]} />
        <meshStandardMaterial color={SILVER} metalness={0.72} roughness={0.24} />
      </mesh>
      <GrokPills position={[0, 0.01, 0.04]} scale={0.7} />
      <group position={[0, 0.13, -0.11]} rotation={[-1.05, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.4, 0.26, 0.01]} />
          <meshStandardMaterial color="#b8bec6" metalness={0.64} roughness={0.28} />
        </mesh>
        <group position={[0, 0, 0.008]}>
          <LitScreen kind={kind} width={0.36} height={0.22} />
        </group>
      </group>
    </group>
  );
}

export function LitPhone() {
  return <PhoneDevice />;
}

export function Card() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.17, 0.12, 0.01]} />
        <meshStandardMaterial color="#c9b48a" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={[0.14, 0.08]} />
        <meshStandardMaterial color="#f4ead4" roughness={0.85} />
      </mesh>
    </group>
  );
}

export function Mug() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.035, 0.03, 0.06, 12]} />
        <meshStandardMaterial color="#f2e6d0" roughness={0.62} />
      </mesh>
      <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.018, 0.005, 6, 10]} />
        <meshStandardMaterial color="#e6d3b0" roughness={0.55} />
      </mesh>
    </group>
  );
}

export function Flipper({
  side,
}: {
  side: "left" | "right";
}) {
  const x = side === "left" ? -1 : 1;
  return (
    <mesh rotation={[0.25, 0, x * 0.45]} scale={[1.28, 0.5, 0.82]} position={[x * 0.02, -0.02, 0.02]}>
      <sphereGeometry args={[0.09, 12, 10]} />
      <FurMaterial />
    </mesh>
  );
}

export function HeadDress({ id }: { id: MuseId }) {
  switch (id) {
    case "scroller":
      return <Headphones />;
    case "trader":
      return (
        <>
          <Cap />
          <Sunglasses />
        </>
      );
    case "chill":
      return null;
    case "builder":
      return <Halo />;
    default:
      return assertNever(id);
  }
}

export function BodyDress({ id }: { id: MuseId }) {
  switch (id) {
    case "trader":
      return <Hoodie />;
    case "chill":
      return <Scarf />;
    case "scroller":
    case "builder":
      return null;
    default:
      return assertNever(id);
  }
}

function peekPhone(activity: MuseActivity): boolean {
  switch (activity) {
    case "SCROLLING":
    case "WATCHING":
      return true;
    case "IDLE":
    case "WALKING":
    case "THINKING":
    case "RESEARCHING":
    case "TALKING":
    case "TRADING":
    case "CHILLING":
    case "SMOKING":
    case "REACTING":
      return false;
    default:
      return assertNever(activity);
  }
}

function deskLaptop(activity: MuseActivity): boolean {
  switch (activity) {
    case "TRADING":
    case "RESEARCHING":
    case "WATCHING":
    case "THINKING":
      return true;
    case "IDLE":
    case "WALKING":
    case "SCROLLING":
    case "TALKING":
    case "CHILLING":
    case "SMOKING":
    case "REACTING":
      return false;
    default:
      return assertNever(activity);
  }
}

/** Stories/Reels-like SIM social in-hand — feed y-offset lives on the CanvasTexture. */
function ThumbScrollPhone({ scale = 1 }: { scale?: number }) {
  const phone = useRef<Group>(null);
  const thumb = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const stroke = (t % 1.12) / 1.12;
    if (phone.current) {
      phone.current.position.y = Math.sin(stroke * Math.PI) * 0.01;
      phone.current.rotation.x = 0.07 * Math.sin(t * 5.4);
    }
    if (thumb.current) {
      thumb.current.position.y = 0.032 - stroke * 0.064;
      thumb.current.position.x = 0.016 + Math.sin(t * 2.1) * 0.004;
    }
  });

  return (
    <group>
      <group ref={phone}>
        <PhoneDevice scale={scale} />
      </group>
      <group ref={thumb} position={[0.018, 0.02, 0.014]}>
        <mesh>
          <sphereGeometry args={[0.013, 8, 8]} />
          <meshStandardMaterial color={FUR} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function TypingGrokLaptop({ scale = 0.52 }: { scale?: number }) {
  const deck = useRef<Group>(null);

  useFrame((state) => {
    if (!deck.current) {
      return;
    }
    const t = state.clock.elapsedTime;
    deck.current.position.y = Math.abs(Math.sin(t * 8.2)) * 0.004;
    deck.current.rotation.x = 0.42 + Math.sin(t * 6.4) * 0.012;
  });

  return (
    <group ref={deck} scale={scale}>
      <LaptopDevice kind="grok" open={1.08} />
    </group>
  );
}

export function HeldProps({ id, activity }: { id: MuseId; activity: MuseActivity }) {
  switch (id) {
    case "scroller":
      return (
        <group position={[0.16, 0.34, 0.2]} rotation={[0.35, 0.2, 0.15]} scale={1.05}>
          <ThumbScrollPhone />
        </group>
      );
    case "trader":
      return deskLaptop(activity) ? (
        <group position={[0.02, 0.14, 0.28]}>
          <TypingGrokLaptop scale={0.52} />
        </group>
      ) : null;
    case "chill":
      return peekPhone(activity) ? (
        <group position={[0.16, 0.32, 0.18]} rotation={[0.3, 0.15, 0.1]} scale={0.95}>
          <ThumbScrollPhone />
        </group>
      ) : (
        <group position={[0.16, 0.3, 0.16]}>
          <Mug />
        </group>
      );
    case "builder":
      return (
        <group>
          <group position={[-0.16, 0.28, 0.2]} rotation={[0.2, 0.4, 0.1]}>
            <Card />
          </group>
          {deskLaptop(activity) ? (
            <group position={[0.04, 0.12, 0.24]} rotation={[0, 0.12, 0]}>
              <TypingGrokLaptop scale={0.5} />
            </group>
          ) : null}
        </group>
      );
    default:
      return assertNever(id);
  }
}
