"use client";

import { LaptopDevice, PhoneDevice, TvDevice } from "@/components/world/screens";
import { usePerf } from "@/components/world/perf-context";
import { SEAT } from "@/lib/world/layout";

function Mug({
  position,
  color = "#ead9c0",
}: {
  position: [number, number, number];
  color?: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.045, 0.04, 0.07, 14]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.022, 0.006, 8, 12]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
    </group>
  );
}

function Cable({
  position,
  rotation = [0, 0.4, 0.15],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <torusGeometry args={[0.12, 0.006, 6, 18, Math.PI * 1.2]} />
      <meshStandardMaterial color="#2a241c" roughness={0.7} />
    </mesh>
  );
}

function StickyStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.12, 0.008, 0.12]} />
        <meshStandardMaterial color="#f0d4ae" roughness={0.8} />
      </mesh>
      <mesh position={[0.02, 0.008, -0.01]} rotation={[0, -0.15, 0]}>
        <boxGeometry args={[0.11, 0.008, 0.11]} />
        <meshStandardMaterial color="#e6d7bc" roughness={0.8} />
      </mesh>
    </group>
  );
}

function FaceWash({
  position,
  color,
  intensity,
  distance,
}: {
  position: [number, number, number];
  color: string;
  intensity: number;
  distance: number;
}) {
  const { extraLights } = usePerf();
  if (!extraLights) {
    return null;
  }
  return (
    <pointLight
      position={position}
      color={color}
      intensity={intensity}
      distance={distance}
      decay={2}
    />
  );
}

export function DeskKit() {
  return (
    <group position={[3.4, 0, -0.85]}>
      <group position={[-0.58, 0.785, 0.2]}>
        <LaptopDevice kind="grok" />
      </group>
      <Mug position={[1.22, 0.82, 0.28]} color="#d7c6aa" />
      <Mug position={[-1.18, 0.82, 0.22]} color="#c9b48a" />
      <Cable position={[0.7, 0.79, 0.32]} />
      <Cable position={[-0.82, 0.79, 0.3]} />
      <StickyStack position={[1.18, 0.8, 0.02]} />
      <FaceWash position={[-0.58, 1.18, 0.42]} color="#7ec8b0" intensity={0.55} distance={2.4} />
      <FaceWash position={[0.62, 1.18, 0.42]} color="#f0d8b4" intensity={0.48} distance={2.2} />
    </group>
  );
}

export function DeskScreens() {
  return <DeskKit />;
}

export function LoungeKit() {
  const lookX = Math.sin(SEAT.scroller.facing);
  const lookZ = Math.cos(SEAT.scroller.facing);
  return (
    <group>
      <group
        position={[
          SEAT.scroller.position[0] + lookX * 0.36,
          0.42,
          SEAT.scroller.position[2] + lookZ * 0.3,
        ]}
        rotation={[0, SEAT.scroller.facing + Math.PI, 0]}
      >
        <LaptopDevice kind="feed" />
      </group>
      <group position={[-2.38, 0.36, 2.28]} rotation={[-1.18, 0.42, 0.1]}>
        <PhoneDevice />
      </group>
      <Mug position={[-2.95, 0.36, 2.08]} />
      <Cable position={[-2.52, 0.34, 2.36]} rotation={[1.2, 0.2, 0.5]} />
      <FaceWash
        position={[
          SEAT.scroller.position[0],
          SEAT.scroller.position[1] + 0.72,
          SEAT.scroller.position[2] + 0.18,
        ]}
        color="#e8d4b0"
        intensity={0.42}
        distance={2.1}
      />
    </group>
  );
}

export function BuilderBench() {
  return (
    <group position={[3.4, 0, -0.85]}>
      <StickyStack position={[0.88, 0.8, 0.16]} />
    </group>
  );
}

export function LoungeTv() {
  return (
    <group position={[-9.62, 2.15, 1.1]} rotation={[0, Math.PI / 2, 0]}>
      <TvDevice />
      <FaceWash position={[1.8, -0.2, 0]} color="#9bb6c8" intensity={0.7} distance={6} />
    </group>
  );
}

export function UsedBits() {
  return (
    <>
      <DeskKit />
      <LoungeKit />
      <BuilderBench />
      <LoungeTv />
    </>
  );
}
