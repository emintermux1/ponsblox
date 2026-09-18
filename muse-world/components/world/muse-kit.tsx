"use client";

import { LitScreen, type ScreenKind } from "@/components/world/lit-screen";
import { PulseGlass } from "@/components/world/screens";
import { usePerf } from "@/components/world/perf-context";
import type { MuseActivity, MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

const FUR = "#f3eee4";
const FUR_LIGHT = "#fbf7ef";
const NAVY = "#0c1a33";
const HOOD = "#141414";
const GREEN = "#3f7a4a";
const SILVER = "#c8cdd3";
const CREAM_CUP = "#d8d2c8";

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
      <mesh position={[0, 0.36, 0.01]} scale={[1.12, 1.04, 1.08]} castShadow={shadows}>
        <sphereGeometry args={[0.38, 22, 18]} />
        <meshStandardMaterial color={HOOD} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.7, -0.1]} scale={[0.9, 0.68, 0.58]}>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color="#121212" roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.3, 0.28]} scale={[1.25, 0.62, 0.42]}>
        <sphereGeometry args={[0.12, 12, 10]} />
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
    <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2.15, 0, 0]}>
      <torusGeometry args={[0.16, 0.012, 8, 24]} />
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
      <mesh position={[-0.2, 0.22, -0.02]} rotation={[0.25, 0, 0.55]} scale={[0.55, 1.2, 0.45]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={FUR_LIGHT} roughness={0.9} />
      </mesh>
      <mesh position={[0.2, 0.22, -0.02]} rotation={[0.25, 0, -0.55]} scale={[0.55, 1.2, 0.45]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={FUR_LIGHT} roughness={0.9} />
      </mesh>
    </group>
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
          {kind === "notes" || kind === "tv" ? (
            <LitScreen kind={kind} width={0.36} height={0.22} />
          ) : (
            <PulseGlass kind="laptop" width={0.36} height={0.22} />
          )}
        </group>
      </group>
    </group>
  );
}

export function LitPhone() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.092, 0.164, 0.012]} />
        <meshStandardMaterial color="#d8d4cc" metalness={0.42} roughness={0.32} />
      </mesh>
      <group position={[0, 0, 0.008]}>
        <PulseGlass kind="phone" width={0.078} height={0.142} />
      </group>
    </group>
  );
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
    <mesh rotation={[0.25, 0, x * 0.45]} scale={[1.15, 0.42, 0.72]} position={[x * 0.02, -0.02, 0.02]}>
      <sphereGeometry args={[0.08, 12, 10]} />
      <meshStandardMaterial color={FUR} roughness={0.86} />
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
      return (
        <>
          <FloppyEars />
          <Halo />
        </>
      );
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

function showLaptop(id: MuseId, activity: MuseActivity): boolean {
  switch (id) {
    case "scroller":
      return activity === "SCROLLING" || activity === "WATCHING" || activity === "IDLE";
    case "trader":
      return activity === "TRADING" || activity === "WATCHING" || activity === "THINKING";
    case "builder":
      return activity === "RESEARCHING";
    case "chill":
      return false;
    default:
      return assertNever(id);
  }
}

function laptopKind(id: MuseId): ScreenKind {
  switch (id) {
    case "scroller":
      return "feed";
    case "trader":
      return "chart";
    case "builder":
      return "notes";
    case "chill":
      return "tv";
    default:
      return assertNever(id);
  }
}

export function HeldProps({ id, activity }: { id: MuseId; activity: MuseActivity }) {
  const laptop = showLaptop(id, activity);
  switch (id) {
    case "scroller":
      return (
        <group>
          <group position={[0.16, 0.34, 0.2]} rotation={[0.15, -0.35, 0.18]}>
            <LitPhone />
          </group>
          {laptop ? (
            <group position={[0.02, 0.16, 0.3]} rotation={[0.42, 0, 0]}>
              <SilverLaptop kind={laptopKind(id)} />
            </group>
          ) : null}
        </group>
      );
    case "trader":
      return laptop ? (
        <group position={[0.02, 0.14, 0.28]} rotation={[0.44, 0, 0]}>
          <SilverLaptop kind={laptopKind(id)} />
        </group>
      ) : null;
    case "chill":
      return (
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
          {laptop ? (
            <group position={[0.04, 0.14, 0.26]} rotation={[0.4, 0.2, 0]}>
              <SilverLaptop kind={laptopKind(id)} />
            </group>
          ) : null}
        </group>
      );
    default:
      return assertNever(id);
  }
}
