"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BackSide,
  CanvasTexture,
  InstancedMesh,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import type { ColorRepresentation } from "three";
import { IdeaWall } from "@/components/world/idea-wall";
import { MonitorDevice } from "@/components/world/screens";
import { usePerf } from "@/components/world/perf-context";
import type { CityLod, GlassQuality } from "@/lib/world/perf";
import type { ScreenId, SpatialPacket, WallPin, WorldSnapshot } from "@/types/world";
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

const WOOD = "#7a5840";
const WOOD_DEEP = "#4a3426";
const WOOD_GRAIN = "#8a6750";
const ALUMINUM = "#c8c5be";
const ALUMINUM_DARK = "#6a6762";
const LEATHER = "#5c4a3e";
const LEATHER_SOFT = "#6e5a4c";
const PAPER = "#ead9c0";
const CONCRETE = "#8a8680";

function rand(seed: number) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return next / 4294967296;
}

function makeSpeckle(size: number, base: string, seed0: number, count: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  let seed = seed0;
  for (let i = 0; i < count; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = rand(seed) * size;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const y = rand(seed) * size;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const a = 0.03 + rand(seed) * 0.07;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 88 + rand(seed) * 50;
    ctx.fillStyle = `rgba(${v},${v - 3},${v - 8},${a})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  return canvas;
}

function makeWood(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#7a5840";
  ctx.fillRect(0, 0, size, size);
  let seed = 90210;
  for (let x = 0; x < size; x += 2) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const wobble = Math.sin(x * 0.04) * 10 + rand(seed) * 6;
    ctx.strokeStyle = `rgba(18,12,8,${0.08 + rand(seed + 3) * 0.12})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + wobble, size * 0.35, x - wobble, size * 0.7, x, size);
    ctx.stroke();
  }
  return canvas;
}

function makeFacade(seed0: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#12151b";
  ctx.fillRect(0, 0, 128, 256);
  let seed = seed0;
  for (let y = 5; y < 250; y += 7) {
    for (let x = 4; x < 124; x += 6) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      if (rand(seed) < 0.42) continue;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const warm = 0.16 + rand(seed) * 0.28;
      ctx.fillStyle = `rgba(214,184,138,${warm})`;
      ctx.fillRect(x, y, 3, 4);
    }
  }
  return canvas;
}

function asMap(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1) {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function Panel({
  args,
  position,
  rotation,
  color,
  metalness = 0.08,
  roughness = 0.68,
  map,
}: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: ColorRepresentation;
  metalness?: number;
  roughness?: number;
  map?: CanvasTexture;
}) {
  const { shadows } = usePerf();
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow={shadows}
      receiveShadow={shadows}
      frustumCulled
    >
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        map={map}
      />
    </mesh>
  );
}

function BlueHourSky() {
  const material = useMemo(
    () => ({
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vDir = normalize(world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 zenith = vec3(0.10, 0.14, 0.20);
          vec3 mid = vec3(0.22, 0.30, 0.40);
          vec3 horizon = vec3(0.52, 0.62, 0.72);
          vec3 blush = vec3(0.62, 0.44, 0.34);
          vec3 ground = vec3(0.04, 0.045, 0.06);
          vec3 col = mix(horizon, mid, smoothstep(0.0, 0.24, h));
          col = mix(col, zenith, smoothstep(0.16, 0.72, h));
          float rim = 1.0 - smoothstep(-0.03, 0.09, abs(h));
          col = mix(col, blush, rim * 0.5);
          col = mix(ground, col, smoothstep(-0.28, 0.03, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
    [],
  );
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[58, 40, 20]} />
      <shaderMaterial
        args={[material]}
        side={BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

function cityTowers(count: number) {
  const items: { x: number; z: number; h: number; w: number; d: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    items.push({
      x: ((i * 53) % 34) - 17,
      z: -12 - ((i * 17) % 22),
      h: 3.2 + ((i * 19) % 11),
      w: 0.85 + ((i * 5) % 6) * 0.18,
      d: 0.75 + ((i * 7) % 5) * 0.16,
    });
  }
  return items;
}

function City({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const towers = useMemo(() => cityTowers(count), [count]);
  const facade = useMemo(() => asMap(makeFacade(11)), []);
  const { shadows } = usePerf();

  useLayoutEffect(() => {
    const instance = mesh.current;
    if (!instance) {
      return;
    }
    towers.forEach((tower, index) => {
      dummy.position.set(tower.x, tower.h / 2 - 1.15, tower.z);
      dummy.scale.set(tower.w, tower.h, tower.d);
      dummy.updateMatrix();
      instance.setMatrixAt(index, dummy.matrix);
    });
    instance.instanceMatrix.needsUpdate = true;
    instance.computeBoundingSphere();
    instance.frustumCulled = true;
  }, [dummy, towers]);

  useLayoutEffect(() => {
    return () => {
      facade.dispose();
    };
  }, [facade]);

  if (count <= 0) {
    return null;
  }

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, -24]} receiveShadow={shadows}>
        <planeGeometry args={[90, 56]} />
        <meshStandardMaterial color="#0b0f14" roughness={0.96} metalness={0.04} />
      </mesh>
      <instancedMesh key={count} ref={mesh} args={[undefined, undefined, count]} frustumCulled>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#161a21"
          map={facade}
          emissive="#c9b089"
          emissiveMap={facade}
          emissiveIntensity={0.85}
          roughness={0.52}
          metalness={0.22}
        />
      </instancedMesh>
      <mesh position={[0, 3.82, -7.8]}>
        <planeGeometry args={[26, 1.85]} />
        <meshBasicMaterial color="#6d8aa0" />
      </mesh>
      <mesh position={[0, 2.86, -7.79]}>
        <planeGeometry args={[26, 0.28]} />
        <meshBasicMaterial color="#8ea6b8" />
      </mesh>
      <mesh position={[0, 2.18, -7.78]}>
        <planeGeometry args={[26, 0.26]} />
        <meshBasicMaterial color="#c4a07a" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.6, -18]}>
        <planeGeometry args={[70, 5.2]} />
        <meshBasicMaterial color="#7a93a8" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.55, -17.6]}>
        <planeGeometry args={[70, 2.1]} />
        <meshBasicMaterial color="#8d6a52" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Haze() {
  const layers = useMemo(
    () =>
      [
        [0, 1.15, -11, 42, 3.2, 0.1],
        [0, 1.35, -17, 56, 3.6, 0.09],
        [0, 1.55, -24, 70, 4.0, 0.08],
      ] as const,
    [],
  );
  return (
    <group>
      {layers.map(([x, y, z, w, h, opacity]) => (
        <mesh key={z} position={[x, y, z]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="#1b2a38" transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function WoodSlats({
  count,
  spacing,
  position,
  rotation,
  height = 4.25,
}: {
  count: number;
  spacing: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  height?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const origin = -((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i += 1) {
      dummy.position.set(origin + i * spacing, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, spacing]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} position={position} rotation={rotation}>
      <boxGeometry args={[0.034, height, 0.05]} />
      <meshStandardMaterial color={WOOD_GRAIN} roughness={0.74} metalness={0.04} />
    </instancedMesh>
  );
}

function WindowWall() {
  const bays = [-7.2, -3.6, 0, 3.6, 7.2];
  const { glass } = usePerf();
  const physical = physicalGlass(glass);
  return (
    <group position={[0, 2.28, -4.58]}>
      <mesh frustumCulled>
        <boxGeometry args={[18.6, 4.52, 0.04]} />
        {physical ? (
          <meshPhysicalMaterial
            color="#8a96a2"
            metalness={0.12}
            roughness={0.04}
            transparent
            opacity={0.08}
            transmission={0.28}
            thickness={0.2}
            ior={1.5}
          />
        ) : (
          <meshStandardMaterial
            color="#8a96a2"
            transparent
            opacity={0.16}
            roughness={0.12}
            metalness={0.1}
          />
        )}
      </mesh>
      <Panel args={[18.9, 0.16, 0.2]} position={[0, 2.28, 0.05]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <Panel args={[18.9, 0.18, 0.24]} position={[0, -2.22, 0.06]} color={ALUMINUM_DARK} metalness={0.8} roughness={0.34} />
      {bays.map((x) => (
        <Panel
          key={x}
          args={[0.16, 4.52, 0.16]}
          position={[x, 0, 0.06]}
          color={ALUMINUM}
          metalness={0.86}
          roughness={0.3}
        />
      ))}
      <Panel args={[18.9, 0.05, 0.12]} position={[0, 0.12, 0.05]} color={ALUMINUM} metalness={0.84} roughness={0.3} />
      <mesh position={[0, 0.05, -0.08]}>
        <planeGeometry args={[18.2, 3.8]} />
        <meshBasicMaterial color="#7a93a8" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

function LoungeChair() {
  return (
    <group position={[-1.82, 0, 3.42]} rotation={[0, -0.55, 0]}>
      <Panel args={[0.92, 0.1, 0.86]} position={[0, 0.12, 0]} color={WOOD_DEEP} roughness={0.7} />
      <Panel args={[0.86, 0.14, 0.78]} position={[0, 0.24, 0.02]} color={LEATHER} roughness={0.64} />
      <Panel args={[0.86, 0.4, 0.12]} position={[0, 0.48, -0.34]} color={LEATHER} roughness={0.6} />
      <Panel args={[0.08, 0.22, 0.72]} position={[-0.42, 0.18, 0]} color={ALUMINUM} metalness={0.84} roughness={0.3} />
      <Panel args={[0.08, 0.22, 0.72]} position={[0.42, 0.18, 0]} color={ALUMINUM} metalness={0.84} roughness={0.3} />
    </group>
  );
}

function Lounge() {
  return (
    <group position={[-4.15, 0, 1.35]}>
      <Panel args={[3.55, 0.1, 1.5]} position={[0, 0.12, 0]} color={WOOD_DEEP} roughness={0.7} />
      <Panel args={[3.42, 0.2, 1.28]} position={[0, 0.26, 0.02]} color={LEATHER} roughness={0.62} />
      {[-1.05, 0, 1.05].map((x) => (
        <Panel
          key={x}
          args={[1.02, 0.16, 0.86]}
          position={[x, 0.42, 0.08]}
          color={LEATHER_SOFT}
          roughness={0.7}
        />
      ))}
      <Panel args={[3.42, 0.58, 0.2]} position={[0, 0.66, -0.56]} color={LEATHER} roughness={0.6} />
      <Panel args={[0.2, 0.46, 1.12]} position={[-1.62, 0.58, 0.02]} color={LEATHER} roughness={0.6} />
      <Panel args={[0.2, 0.46, 1.12]} position={[1.62, 0.58, 0.02]} color={LEATHER} roughness={0.6} />
      <Panel args={[0.08, 0.12, 1.22]} position={[-1.78, 0.14, 0]} color={ALUMINUM} metalness={0.84} roughness={0.3} />
      <Panel args={[0.08, 0.12, 1.22]} position={[1.78, 0.14, 0]} color={ALUMINUM} metalness={0.84} roughness={0.3} />
    </group>
  );
}

function CoffeeTable() {
  const { glass, shadows } = usePerf();
  const physical = physicalGlass(glass);
  return (
    <group position={[-2.7, 0, 2.2]}>
      <mesh position={[0, 0.3, 0]} castShadow={shadows} frustumCulled>
        <boxGeometry args={[1.28, 0.018, 0.72]} />
        {physical ? (
          <meshPhysicalMaterial
            color="#4a5560"
            metalness={0.2}
            roughness={0.06}
            transparent
            opacity={0.32}
            transmission={0.2}
          />
        ) : (
          <meshStandardMaterial color="#4a5560" metalness={0.2} roughness={0.18} />
        )}
      </mesh>
      {[-0.56, 0.56].map((x) =>
        [-0.28, 0.28].map((z) => (
          <Panel
            key={`${x}-${z}`}
            args={[0.03, 0.28, 0.03]}
            position={[x, 0.15, z]}
            color={ALUMINUM}
            metalness={0.86}
            roughness={0.3}
          />
        )),
      )}
    </group>
  );
}

function Hookah() {
  return (
    <group position={[-2.55, 0, 2.15]}>
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.11, 20, 16]} />
        <meshPhysicalMaterial color="#1c1814" metalness={0.35} roughness={0.12} transmission={0.08} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.42, 12]} />
        <meshStandardMaterial color={ALUMINUM} metalness={0.86} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.045, 0.038, 0.08, 16]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
    </group>
  );
}

function FloorLamp({ position = [-6.55, 0, 3.55] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
        <meshStandardMaterial color={ALUMINUM_DARK} metalness={0.82} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.72, 10]} />
        <meshStandardMaterial color={ALUMINUM} metalness={0.86} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.14, 20]} />
        <meshStandardMaterial color="#d8c9ae" emissive="#c9ae84" emissiveIntensity={1.15} roughness={0.5} />
      </mesh>
    </group>
  );
}


function DeskChair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, Math.PI, 0]}>
      <Panel args={[0.5, 0.05, 0.48]} position={[0, 0.36, 0]} color={LEATHER} roughness={0.64} />
      <Panel args={[0.5, 0.4, 0.06]} position={[0, 0.58, -0.22]} color={LEATHER} roughness={0.6} />
      <Panel args={[0.045, 0.34, 0.045]} position={[-0.18, 0.17, 0.16]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <Panel args={[0.045, 0.34, 0.045]} position={[0.18, 0.17, 0.16]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <Panel args={[0.045, 0.34, 0.045]} position={[-0.18, 0.17, -0.16]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <Panel args={[0.045, 0.34, 0.045]} position={[0.18, 0.17, -0.16]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
    </group>
  );
}

function DeskKeyboard({ x }: { x: number }) {
  return (
    <group position={[x, 0.785, 0.22]}>
      <Panel args={[0.38, 0.016, 0.14]} position={[0, 0, 0]} color="#1a1916" roughness={0.42} metalness={0.18} />
      <Panel args={[0.34, 0.008, 0.1]} position={[0, 0.01, 0]} color="#2a2824" roughness={0.5} />
    </group>
  );
}

function DeskScreen({
  id,
  position,
  active,
  onInspect,
}: {
  id: ScreenId;
  position: [number, number, number];
  active: boolean;
  onInspect: (id: ScreenId) => void;
}) {
  return (
    <MonitorDevice
      kind={id}
      position={position}
      active={active}
      onInspect={onInspect}
    />
  );
}

function Desk({
  wood,
  inspecting,
  onInspect,
}: {
  wood: CanvasTexture;
  inspecting: ScreenId | null;
  onInspect: (id: ScreenId) => void;
}) {
  return (
    <group position={[3.4, 0, -0.85]}>
      <Panel
        args={[3.28, 0.05, 1.18]}
        position={[0, 0.76, 0]}
        color="#4a2c18"
        roughness={0.46}
        metalness={0.06}
        map={wood}
      />
      <Panel args={[3.28, 0.018, 1.18]} position={[0, 0.73, 0]} color={ALUMINUM_DARK} metalness={0.8} roughness={0.35} />
      <Panel args={[0.05, 0.7, 1.12]} position={[-1.52, 0.36, 0]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <Panel args={[0.05, 0.7, 1.12]} position={[1.52, 0.36, 0]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <DeskScreen
        id="tape"
        position={[-0.58, 1.2, -0.28]}
        active={inspecting === "tape"}
        onInspect={onInspect}
      />
      <DeskScreen
        id="notes"
        position={[0.62, 1.2, -0.28]}
        active={inspecting === "notes"}
        onInspect={onInspect}
      />
      <DeskKeyboard x={0.62} />
      <Panel args={[0.42, 0.02, 0.3]} position={[1.18, 0.8, 0.22]} color={PAPER} roughness={0.82} />
      <Panel args={[0.36, 0.015, 0.26]} position={[1.2, 0.82, 0.2]} color="#d7c6aa" roughness={0.8} />
      <Panel args={[0.22, 0.03, 0.16]} position={[-1.28, 0.8, 0.28]} color="#3a2c20" roughness={0.7} />
      <Panel args={[0.2, 0.025, 0.14]} position={[-1.26, 0.83, 0.26]} color="#5c4030" roughness={0.68} />
      <Panel args={[0.18, 0.02, 0.12]} position={[-1.24, 0.86, 0.24]} color="#ead9c0" roughness={0.8} />
      <group position={[1.42, 0.78, -0.28]}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.32, 8]} />
          <meshStandardMaterial color={ALUMINUM} metalness={0.86} roughness={0.3} />
        </mesh>
        <mesh position={[0.08, 0.28, 0]} rotation={[0, 0, 0.7]}>
          <cylinderGeometry args={[0.08, 0.11, 0.04, 16]} />
          <meshStandardMaterial
            color="#d8c9ae"
            emissive="#c9ae84"
            emissiveIntensity={1.05}
            roughness={0.48}
          />
        </mesh>
      </group>
    </group>
  );
}

function Structure({
  concrete,
  wood,
}: {
  concrete: CanvasTexture;
  wood: CanvasTexture;
}) {
  const { glass, shadows } = usePerf();
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
        {physical ? (
          <meshPhysicalMaterial
            color={CONCRETE}
            map={concrete}
            metalness={0.22}
            roughness={0.28}
            clearcoat={0.4}
            clearcoatRoughness={0.22}
          />
        ) : (
          <meshStandardMaterial
            color={CONCRETE}
            map={concrete}
            metalness={0.16}
            roughness={0.42}
          />
        )}
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-3.5, 0.012, 1.9]}
        receiveShadow={shadows}
        frustumCulled
      >
        <planeGeometry args={[7.4, 5.6]} />
        <meshStandardMaterial color="#4f463e" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[3.35, 0.014, -0.35]}
        receiveShadow={shadows}
        frustumCulled
      >
        <planeGeometry args={[4.6, 3.2]} />
        <meshStandardMaterial color="#3f342c" roughness={0.92} metalness={0.02} />
      </mesh>
      <Panel args={[20.2, 0.16, 12.2]} position={[0, 4.68, 0.4]} color={WOOD_DEEP} roughness={0.78} map={wood} />
      <Panel args={[6.4, 0.04, 0.22]} position={[-3.2, 4.58, 0.2]} color={ALUMINUM} metalness={0.86} roughness={0.28} />
      <Panel args={[5.2, 0.04, 0.22]} position={[3.3, 4.58, -0.7]} color={ALUMINUM} metalness={0.86} roughness={0.28} />
      <mesh position={[-3.2, 4.56, 0.2]}>
        <boxGeometry args={[6.2, 0.015, 0.1]} />
        <meshStandardMaterial color="#ead7b4" emissive="#d7b889" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[3.3, 4.56, -0.7]}>
        <boxGeometry args={[5.0, 0.015, 0.1]} />
        <meshStandardMaterial color="#ead7b4" emissive="#d7b889" emissiveIntensity={0.9} />
      </mesh>
      <Panel args={[0.16, 4.7, 12]} position={[-9.92, 2.35, 0.4]} color={WOOD} roughness={0.72} map={wood} />
      <Panel args={[0.16, 4.7, 12]} position={[9.92, 2.35, 0.4]} color={WOOD} roughness={0.72} map={wood} />
      <Panel args={[3.4, 4.7, 0.16]} position={[-8.3, 2.35, 6.32]} color={WOOD} roughness={0.74} map={wood} />
      <Panel args={[3.4, 4.7, 0.16]} position={[8.3, 2.35, 6.32]} color={WOOD} roughness={0.74} map={wood} />
      <Panel args={[20.2, 0.22, 0.28]} position={[0, 4.57, 6.18]} color={WOOD_DEEP} roughness={0.76} />
      <Panel args={[20.2, 0.16, 0.16]} position={[0, 0.08, 6.32]} color={CONCRETE} roughness={0.5} metalness={0.12} />
      <WoodSlats count={16} spacing={0.2} position={[-8.3, 2.2, 6.2]} />
      <WoodSlats count={16} spacing={0.2} position={[8.3, 2.2, 6.2]} />
      <WoodSlats count={28} spacing={0.2} position={[-9.8, 2.2, 0.3]} rotation={[0, Math.PI / 2, 0]} />
      <Panel args={[0.12, 4.55, 0.12]} position={[-9.7, 2.28, -4.45]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <Panel args={[0.12, 4.55, 0.12]} position={[9.7, 2.28, -4.45]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <Panel args={[0.1, 4.5, 0.1]} position={[-6.55, 2.25, 6.28]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <Panel args={[0.1, 4.5, 0.1]} position={[6.55, 2.25, 6.28]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <mesh position={[0, 0.58, 6.32]}>
        <boxGeometry args={[12.9, 0.84, 0.03]} />
        <meshPhysicalMaterial
          color="#6a7682"
          metalness={0.18}
          roughness={0.06}
          transparent
          opacity={0.14}
        />
      </mesh>
      <Panel args={[4.6, 0.08, 0.48]} position={[0, 0.18, -4.05]} color={WOOD} roughness={0.58} />
      <mesh position={[0, -0.08, -5.35]} receiveShadow>
        <boxGeometry args={[20, 0.16, 1.6]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.55} metalness={0.1} />
      </mesh>
      <Panel args={[18.6, 0.04, 0.04]} position={[0, 1.05, -5.95]} color={ALUMINUM} metalness={0.84} roughness={0.3} />
    </group>
  );
}

export function Penthouse({
  packet = null,
  wallPins = [],
  builderPos = [6.4, 0.62, 2.8],
  inspecting = null,
  onInspect,
  deskLive = false,
  world,
}: {
  packet?: SpatialPacket | null;
  wallPins?: WallPin[];
  builderPos?: [number, number, number];
  inspecting?: ScreenId | null;
  onInspect?: (id: ScreenId) => void;
  deskLive?: boolean;
  world: WorldSnapshot;
}) {
  void deskLive;
  const { cityCount, cityLod } = usePerf();
  const dense = showDenseProps(cityLod);
  const concrete = useMemo(() => asMap(makeSpeckle(512, "#8a8680", 404, 9000), 3, 2), []);
  const wood = useMemo(() => asMap(makeWood(), 2, 1), []);

  useLayoutEffect(() => {
    return () => {
      concrete.dispose();
      wood.dispose();
    };
  }, [concrete, wood]);

  return (
    <group>
      <BlueHourSky />
      <Structure concrete={concrete} wood={wood} />
      <WindowWall />
      <Lounge />
      <LoungeChair />
      <CoffeeTable />
      {dense ? <Hookah /> : null}
      {dense ? <FloorLamp /> : null}
      <FloorLamp position={[5.55, 0, 1.05]} />
      <Desk
        wood={wood}
        inspecting={inspecting}
        onInspect={onInspect ?? (() => undefined)}
      />
      <DeskChair position={[3.28, 0, 0.12]} />
      <DeskChair position={[4.12, 0, 0.12]} />
      <IdeaWall packet={packet} pins={wallPins} builderPos={builderPos} world={world} />
      <City count={cityCount} />
      {dense ? <Haze /> : null}
    </group>
  );
}
