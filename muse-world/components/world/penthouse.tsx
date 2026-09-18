"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ColorRepresentation, InstancedMesh } from "three";
import { Object3D } from "three";
import { usePerf } from "@/components/world/perf-context";
import type { CityLod, GlassQuality } from "@/lib/world/perf";
import { assertNever } from "@/types/world";

function physicalGlass(glass: GlassQuality): boolean {
  switch (glass) {
    case "physical":
      return true;
    case "standard":
      return false;
    default:
      return assertNever(glass);
  }
}

function showDenseProps(lod: CityLod): boolean {
  switch (lod) {
    case "dense":
      return true;
    case "sparse":
      return false;
    default:
      return assertNever(lod);
  }
}

function Panel({
  args,
  position,
  rotation,
  color,
  metalness = 0.18,
  roughness = 0.62,
  shadows,
}: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: ColorRepresentation;
  metalness?: number;
  roughness?: number;
  shadows: boolean;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow={shadows}
      receiveShadow={shadows}
      frustumCulled
    >
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function WindowWall({ physical, shadows }: { physical: boolean; shadows: boolean }) {
  return (
    <group position={[0, 2.35, -4.55]}>
      <mesh frustumCulled>
        <boxGeometry args={[18.4, 4.4, 0.08]} />
        {physical ? (
          <meshPhysicalMaterial
            color="#8aa0b4"
            transmission={0.72}
            thickness={0.4}
            roughness={0.08}
            metalness={0.05}
            transparent
            opacity={0.42}
          />
        ) : (
          <meshStandardMaterial
            color="#8aa0b4"
            transparent
            opacity={0.28}
            roughness={0.18}
            metalness={0.08}
          />
        )}
      </mesh>
      {[-6, -2, 2, 6].map((x) => (
        <mesh key={x} position={[x, 0, 0.02]} castShadow={shadows} frustumCulled>
          <boxGeometry args={[0.06, 4.4, 0.1]} />
          <meshStandardMaterial color="#2a241c" metalness={0.55} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
}

function Couch({ shadows }: { shadows: boolean }) {
  return (
    <group position={[-4.15, 0, 1.35]}>
      <Panel
        args={[3.4, 0.38, 1.35]}
        position={[0, 0.32, 0]}
        color="#3c332b"
        roughness={0.86}
        shadows={shadows}
      />
      <Panel
        args={[3.4, 0.72, 0.28]}
        position={[0, 0.78, -0.52]}
        color="#2f2923"
        roughness={0.84}
        shadows={shadows}
      />
      <Panel
        args={[0.28, 0.55, 1.2]}
        position={[-1.56, 0.68, 0.04]}
        color="#2f2923"
        roughness={0.84}
        shadows={shadows}
      />
      <Panel
        args={[0.28, 0.55, 1.2]}
        position={[1.56, 0.68, 0.04]}
        color="#2f2923"
        roughness={0.84}
        shadows={shadows}
      />
    </group>
  );
}

function Hookah() {
  return (
    <group position={[-2.55, 0, 2.15]}>
      <mesh position={[0, 0.18, 0]} frustumCulled>
        <cylinderGeometry args={[0.12, 0.16, 0.2, 16]} />
        <meshStandardMaterial color="#1c1914" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.55, 0]} frustumCulled>
        <cylinderGeometry args={[0.025, 0.03, 0.55, 10]} />
        <meshStandardMaterial color="#8a8478" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.9, 0]} frustumCulled>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Desk({ shadows }: { shadows: boolean }) {
  return (
    <group position={[3.4, 0, -0.85]}>
      <Panel
        args={[3.2, 0.07, 1.15]}
        position={[0, 0.74, 0]}
        color="#c4b7a2"
        metalness={0.15}
        roughness={0.35}
        shadows={shadows}
      />
      <Panel
        args={[0.08, 0.7, 1.1]}
        position={[-1.5, 0.36, 0]}
        color="#2b261f"
        metalness={0.45}
        roughness={0.4}
        shadows={shadows}
      />
      <Panel
        args={[0.08, 0.7, 1.1]}
        position={[1.5, 0.36, 0]}
        color="#2b261f"
        metalness={0.45}
        roughness={0.4}
        shadows={shadows}
      />
      {[-0.85, 0, 0.85].map((x, i) => (
        <group key={x} position={[x, 1.18, -0.22]} rotation={[-0.12, 0, 0]}>
          <mesh frustumCulled>
            <boxGeometry args={[0.78, 0.5, 0.04]} />
            <meshStandardMaterial color="#11110f" metalness={0.6} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0, 0.028]} frustumCulled>
            <planeGeometry args={[0.7, 0.42]} />
            <meshStandardMaterial
              color={i === 1 ? "#d8c7a4" : i === 0 ? "#1c2430" : "#142018"}
              emissive={i === 1 ? "#8a7348" : "#1a2a22"}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function IdeaWall({ shadows }: { shadows: boolean }) {
  const cards = useMemo(
    () =>
      [
        [-0.7, 0.55, "thesis"],
        [0.15, 0.9, "flow"],
        [0.85, 0.4, "ref"],
        [-0.25, -0.15, "risk"],
        [0.55, -0.35, "ask"],
      ] as const,
    [],
  );
  return (
    <group position={[7.55, 1.8, 2.6]} rotation={[0, -Math.PI / 2, 0]}>
      <Panel args={[3.6, 2.3, 0.06]} position={[0, 0, 0]} color="#1a1713" roughness={0.7} shadows={shadows} />
      {cards.map(([x, y, label]) => (
        <mesh key={label} position={[x, y, 0.05]} frustumCulled>
          <boxGeometry args={[0.62, 0.38, 0.02]} />
          <meshStandardMaterial color="#e6d7bc" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function cityTowers(count: number) {
  const items: { x: number; z: number; h: number; w: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    items.push({
      x: ((i * 47) % 28) - 14,
      z: -10 - ((i * 13) % 18),
      h: 2.4 + ((i * 17) % 9),
      w: 0.7 + ((i * 3) % 5) * 0.15,
    });
  }
  return items;
}

function City({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const towers = useMemo(() => cityTowers(count), [count]);

  useLayoutEffect(() => {
    const instance = mesh.current;
    if (!instance) {
      return;
    }
    towers.forEach((tower, index) => {
      dummy.position.set(tower.x, tower.h / 2 - 0.4, tower.z);
      dummy.scale.set(tower.w, tower.h, tower.w);
      dummy.updateMatrix();
      instance.setMatrixAt(index, dummy.matrix);
    });
    instance.instanceMatrix.needsUpdate = true;
    instance.computeBoundingSphere();
    instance.frustumCulled = true;
  }, [dummy, towers]);

  if (count <= 0) {
    return null;
  }

  return (
    <instancedMesh key={count} ref={mesh} args={[undefined, undefined, count]} frustumCulled>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#151820" roughness={0.55} metalness={0.25} />
    </instancedMesh>
  );
}

export function Penthouse() {
  const { shadows, glass, cityCount, cityLod } = usePerf();
  const physical = physicalGlass(glass);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0.4]}
        receiveShadow={shadows}
        frustumCulled
      >
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#6d675e" roughness={0.92} metalness={0.04} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-3.4, 0.01, 1.8]}
        receiveShadow={shadows}
        frustumCulled
      >
        <planeGeometry args={[7.2, 5.4]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.78} />
      </mesh>
      <Panel args={[20, 0.2, 12]} position={[0, 4.7, 0.4]} color="#1c1915" roughness={0.85} shadows={shadows} />
      <Panel args={[0.22, 4.7, 12]} position={[-9.9, 2.35, 0.4]} color="#2a241c" shadows={shadows} />
      <Panel args={[0.22, 4.7, 12]} position={[9.9, 2.35, 0.4]} color="#2a241c" shadows={shadows} />
      <Panel args={[20, 4.7, 0.22]} position={[0, 2.35, 6.3]} color="#241f19" shadows={shadows} />
      <WindowWall physical={physical} shadows={shadows} />
      <Couch shadows={shadows} />
      {showDenseProps(cityLod) ? <Hookah /> : null}
      <Panel
        args={[1.35, 0.12, 0.78]}
        position={[-2.7, 0.28, 2.2]}
        color="#1f1b16"
        metalness={0.4}
        shadows={shadows}
      />
      <Desk shadows={shadows} />
      <IdeaWall shadows={shadows} />
      <mesh position={[-6.6, 0.28, 3.8]} frustumCulled>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 20]} />
        <meshStandardMaterial color="#d8c3a0" roughness={0.35} />
      </mesh>
      <City count={cityCount} />
    </group>
  );
}
