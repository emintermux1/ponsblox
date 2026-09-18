"use client";

import { LitLaptop, ScreenPane } from "@/components/world/screens";
import { usePerf } from "@/components/world/perf-context";

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

function Cable({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0.4, 0.15]}>
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

export function DeskScreens() {
  return (
    <group position={[3.4, 0, -0.85]}>
      <group position={[-0.58, 1.2, -0.28]} rotation={[-0.1, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.92, 0.56, 0.03]} />
          <meshStandardMaterial color="#161513" metalness={0.55} roughness={0.32} />
        </mesh>
        <group position={[0, 0, 0.018]}>
          <ScreenPane kind="tape" width={0.86} height={0.5} intensity={1.15} />
        </group>
      </group>
      <group position={[0.62, 1.2, -0.28]} rotation={[-0.1, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.92, 0.56, 0.03]} />
          <meshStandardMaterial color="#161513" metalness={0.55} roughness={0.32} />
        </mesh>
        <group position={[0, 0, 0.018]}>
          <ScreenPane kind="grok" width={0.86} height={0.5} intensity={1.05} />
        </group>
      </group>
      <group position={[0.12, 0.79, 0.18]} rotation={[0, -0.18, 0]}>
        <LitLaptop plate="laptop" />
      </group>
      <Mug position={[1.22, 0.82, 0.28]} color="#d7c6aa" />
      <Cable position={[0.7, 0.79, 0.32]} />
      <StickyStack position={[1.18, 0.8, 0.02]} />
    </group>
  );
}

export function LoungeKit() {
  return (
    <group>
      <group position={[-3.55, 0.42, 1.55]} rotation={[0, 0.45, 0]}>
        <LitLaptop plate="laptop" />
      </group>
      <Mug position={[-2.95, 0.34, 2.05]} />
      <group position={[-2.35, 0.34, 2.28]} rotation={[-0.4, 0.2, 0]}>
        <mesh>
          <boxGeometry args={[0.09, 0.16, 0.012]} />
          <meshStandardMaterial color="#1a1712" roughness={0.3} metalness={0.4} />
        </mesh>
        <group position={[0, 0, 0.008]}>
          <ScreenPane kind="phone" width={0.074} height={0.14} intensity={1} />
        </group>
      </group>
    </group>
  );
}

export function BuilderBench() {
  return (
    <group position={[6.15, 0.02, 3.35]} rotation={[0, -1.2, 0]}>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.7, 0.04, 0.38]} />
        <meshStandardMaterial color="#4a3426" roughness={0.62} />
      </mesh>
      <group position={[0, 0.39, 0.02]}>
        <LitLaptop plate="notes" />
      </group>
      <StickyStack position={[0.22, 0.39, 0.12]} />
      <Mug position={[-0.24, 0.42, 0.08]} color="#c9b48a" />
    </group>
  );
}

export function LoungeTv() {
  const { shadows } = usePerf();
  return (
    <group position={[-9.62, 2.15, 1.1]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow={shadows}>
        <boxGeometry args={[2.15, 1.22, 0.06]} />
        <meshStandardMaterial color="#161513" roughness={0.35} metalness={0.4} />
      </mesh>
      <group position={[0, 0, 0.036]}>
        <ScreenPane kind="tv" width={2.02} height={1.1} intensity={0.95} />
      </group>
    </group>
  );
}

export function UsedBits() {
  return (
    <>
      <DeskScreens />
      <LoungeKit />
      <BuilderBench />
      <LoungeTv />
    </>
  );
}
