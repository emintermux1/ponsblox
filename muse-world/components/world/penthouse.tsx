"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  BackSide,
  CanvasTexture,
  InstancedMesh,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import type { ColorRepresentation, Mesh } from "three";
import { usePerf } from "@/components/world/perf-context";
import {
  IDEA_WALL_CARDS,
  IDEA_WALL_ORIGIN,
  PACKET_TRAVEL_MS,
  wallSlotLocal,
  worldToWallLocal,
} from "@/lib/world/layout";
import type { CityLod, GlassQuality } from "@/lib/world/perf";
import type { SpatialPacket, WallPin } from "@/types/world";
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

function FloorLamp() {
  return (
    <group position={[-6.55, 0, 3.55]}>
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

function Desk({ wood }: { wood: CanvasTexture }) {
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
      {[-0.58, 0.62].map((x) => (
        <group key={x} position={[x, 1.2, -0.28]} rotation={[-0.1, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.92, 0.56, 0.03]} />
            <meshStandardMaterial color="#161513" metalness={0.72} roughness={0.26} />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.86, 0.5]} />
            <meshPhysicalMaterial
              color="#0e1216"
              metalness={0.35}
              roughness={0.08}
              transparent
              opacity={0.88}
            />
          </mesh>
        </group>
      ))}
      <Panel args={[0.42, 0.02, 0.3]} position={[1.18, 0.8, 0.22]} color={PAPER} roughness={0.82} />
      <Panel args={[0.36, 0.015, 0.26]} position={[1.2, 0.82, 0.2]} color="#d7c6aa" roughness={0.8} />
    </group>
  );
}

function FlyingWallCard({
  pin,
  from,
  to,
}: {
  pin: SpatialPacket;
  from: [number, number, number];
  to: [number, number, number];
}) {
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    if (!mesh.current) {
      return;
    }
    const u = Math.min(1, (Date.now() - pin.t) / PACKET_TRAVEL_MS);
    mesh.current.visible = u < 1;
    mesh.current.position.set(
      from[0] + (to[0] - from[0]) * u,
      from[1] + (to[1] - from[1]) * u + Math.sin(u * Math.PI) * 0.32,
      from[2] + (to[2] - from[2]) * u,
    );
  });
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[0.62, 0.38, 0.02]} />
      <meshStandardMaterial color={PAPER} roughness={0.78} />
    </mesh>
  );
}

function IdeaWall({
  packet,
  pins,
  builderPos,
}: {
  packet: SpatialPacket | null;
  pins: WallPin[];
  builderPos: [number, number, number];
}) {
  const traveling = packet?.kind === "PIN" && packet.to === "wall" ? packet : null;
  const travelId = traveling ? `${traveling.t}:${traveling.label}:${traveling.slot ?? 0}` : null;
  const [landedId, setLandedId] = useState<string | null>(null);
  const fromLocal = useMemo(() => worldToWallLocal(builderPos), [builderPos]);
  useFrame(() => {
    if (!traveling || !travelId) {
      return;
    }
    if (Date.now() - traveling.t >= PACKET_TRAVEL_MS && landedId !== travelId) {
      setLandedId(travelId);
    }
  });
  const flyingSlot = travelId && landedId !== travelId ? (traveling?.slot ?? 0) : null;

  return (
    <group position={IDEA_WALL_ORIGIN} rotation={[0, -Math.PI / 2, 0]}>
      <Panel args={[3.85, 2.55, 0.07]} position={[0, 0, 0]} color={WOOD_DEEP} roughness={0.7} />
      <Panel args={[3.9, 0.03, 0.08]} position={[0, 1.28, 0.02]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      <Panel args={[3.9, 0.03, 0.08]} position={[0, -1.28, 0.02]} color={ALUMINUM} metalness={0.86} roughness={0.3} />
      {IDEA_WALL_CARDS.map((card) => (
        <mesh key={card.key} position={[card.x, card.y, 0.05]}>
          <boxGeometry args={[0.62, 0.38, 0.02]} />
          <meshStandardMaterial color={PAPER} roughness={0.8} />
        </mesh>
      ))}
      {pins
        .filter((pin) => pin.slot !== flyingSlot)
        .map((pin) => {
          const [x, y, z] = wallSlotLocal(pin.slot);
          return (
            <group key={pin.id} position={[x, y, z]}>
              <mesh>
                <boxGeometry args={[0.58, 0.34, 0.018]} />
                <meshStandardMaterial color={PAPER} roughness={0.8} />
              </mesh>
              <Text
                position={[0, 0, 0.014]}
                fontSize={0.082}
                letterSpacing={0.12}
                color="#3a3226"
                fillOpacity={0.85}
                anchorX="center"
                anchorY="middle"
              >
                {`$${pin.label}`}
              </Text>
            </group>
          );
        })}
      {traveling ? (
        <FlyingWallCard
          pin={traveling}
          from={fromLocal}
          to={wallSlotLocal(traveling.slot ?? 0)}
        />
      ) : null}
      <Panel args={[1.8, 0.08, 0.42]} position={[0, -1.55, 0.18]} color={WOOD} roughness={0.62} />
    </group>
  );
}

function CenterRug() {
  const { shadows } = usePerf();
  return (
    <group position={[0.3, 0.014, 2.6]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow={shadows}>
        <circleGeometry args={[1.85, 40]} />
        <meshStandardMaterial color="#4a3f33" roughness={0.94} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <ringGeometry args={[1.62, 1.85, 40]} />
        <meshStandardMaterial color="#5c4e3d" roughness={0.9} />
      </mesh>
    </group>
  );
}

function DeskRug() {
  const { shadows } = usePerf();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.4, 0.012, -0.45]} receiveShadow={shadows}>
      <planeGeometry args={[4.4, 2.7]} />
      <meshStandardMaterial color="#453b31" roughness={0.95} metalness={0.02} />
    </mesh>
  );
}

function Plant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const { shadows } = usePerf();
  const leaves: [number, number, number, number][] = [
    [0, 0.95, 0, 0.34],
    [0.24, 0.78, 0.1, 0.24],
    [-0.22, 0.82, -0.08, 0.26],
    [0.05, 0.7, -0.22, 0.2],
    [-0.05, 1.1, 0.14, 0.18],
  ];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow={shadows}>
        <cylinderGeometry args={[0.17, 0.21, 0.4, 12]} />
        <meshStandardMaterial color="#3a322a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.022, 0.034, 0.45, 6]} />
        <meshStandardMaterial color="#4a3d2c" roughness={0.9} />
      </mesh>
      {leaves.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow={shadows}>
          <sphereGeometry args={[r, 10, 8]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#31493a" : "#3d5a45"}
            roughness={0.92}
          />
        </mesh>
      ))}
    </group>
  );
}

function Sideboard({ wood }: { wood: CanvasTexture }) {
  return (
    <group position={[9.3, 0, -2.0]} rotation={[0, -Math.PI / 2, 0]}>
      <Panel args={[2.3, 0.09, 0.5]} position={[0, 0.52, 0]} color={WOOD} roughness={0.55} map={wood} />
      <Panel args={[2.3, 0.42, 0.46]} position={[0, 0.28, 0]} color={WOOD_DEEP} roughness={0.66} map={wood} />
      <Panel args={[0.05, 0.1, 0.4]} position={[-1.05, 0.05, 0]} color={ALUMINUM_DARK} metalness={0.8} roughness={0.35} />
      <Panel args={[0.05, 0.1, 0.4]} position={[1.05, 0.05, 0]} color={ALUMINUM_DARK} metalness={0.8} roughness={0.35} />
      <mesh position={[-0.7, 0.75, 0]} rotation={[0, 0, -0.16]}>
        <boxGeometry args={[0.02, 0.34, 0.34]} />
        <meshStandardMaterial color="#5a4638" roughness={0.8} />
      </mesh>
      <mesh position={[-0.62, 0.74, 0]} rotation={[0, 0, -0.28]}>
        <boxGeometry args={[0.02, 0.32, 0.32]} />
        <meshStandardMaterial color="#3c4a52" roughness={0.8} />
      </mesh>
      <mesh position={[-0.52, 0.73, 0]} rotation={[0, 0, -0.38]}>
        <boxGeometry args={[0.02, 0.3, 0.3]} />
        <meshStandardMaterial color="#6a5a44" roughness={0.8} />
      </mesh>
      <mesh position={[0.75, 0.66, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.18, 10]} />
        <meshStandardMaterial color={ALUMINUM_DARK} metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0.75, 0.84, 0]}>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshStandardMaterial
          color="#e8d5b0"
          emissive="#d9b57e"
          emissiveIntensity={1.05}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

function TableDressing() {
  return (
    <group position={[-2.7, 0.31, 2.2]}>
      <mesh position={[-0.32, 0.015, 0.12]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.26, 0.03, 0.19]} />
        <meshStandardMaterial color="#5a4638" roughness={0.75} />
      </mesh>
      <mesh position={[-0.3, 0.045, 0.1]} rotation={[0, 0.14, 0]}>
        <boxGeometry args={[0.22, 0.026, 0.16]} />
        <meshStandardMaterial color={PAPER} roughness={0.85} />
      </mesh>
      <mesh position={[0.28, 0.045, -0.08]}>
        <cylinderGeometry args={[0.032, 0.028, 0.075, 10]} />
        <meshStandardMaterial color="#2e2a26" roughness={0.5} />
      </mesh>
      <mesh position={[0.05, 0.02, -0.16]} rotation={[0, -0.4, 0]}>
        <boxGeometry args={[0.16, 0.022, 0.11]} />
        <meshStandardMaterial color="#3c4a52" roughness={0.8} />
      </mesh>
    </group>
  );
}

function DeskDressing() {
  return (
    <group position={[3.4, 0.785, -0.85]}>
      <mesh position={[-1.28, 0.045, 0.32]}>
        <cylinderGeometry args={[0.034, 0.03, 0.08, 10]} />
        <meshStandardMaterial color="#e3d3b8" roughness={0.6} />
      </mesh>
      <group position={[1.3, 0, -0.35]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 0.035, 10]} />
          <meshStandardMaterial color="#1e1c19" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[-0.07, 0.16, 0]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.011, 0.011, 0.32, 6]} />
          <meshStandardMaterial color="#1e1c19" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[-0.2, 0.31, 0]} rotation={[0, 0, 1.9]}>
          <coneGeometry args={[0.06, 0.13, 12]} />
          <meshStandardMaterial color="#26221d" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[-0.24, 0.28, 0]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#f2ddb2" emissive="#e2b87e" emissiveIntensity={1.5} />
        </mesh>
      </group>
    </group>
  );
}

function Pendants() {
  return (
    <group>
      {[2.75, 4.05].map((x) => (
        <group key={x} position={[x, 0, -0.85]}>
          <mesh position={[0, 3.5, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 2.3, 6]} />
            <meshStandardMaterial color="#1a1714" roughness={0.6} />
          </mesh>
          <mesh position={[0, 2.32, 0]}>
            <coneGeometry args={[0.17, 0.2, 16]} />
            <meshStandardMaterial color="#221e19" metalness={0.35} roughness={0.5} />
          </mesh>
          <mesh position={[0, 2.22, 0]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial
              color="#f4dfb4"
              emissive="#e6bd82"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function WallArt() {
  return (
    <group position={[-9.72, 2.55, 0.9]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <boxGeometry args={[0.95, 1.25, 0.05]} />
        <meshStandardMaterial color="#1c1813" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.028]}>
        <planeGeometry args={[0.8, 1.1]} />
        <meshStandardMaterial color="#6a5a44" roughness={0.88} />
      </mesh>
      <group position={[1.55, -0.22, 0]}>
        <mesh>
          <boxGeometry args={[1.15, 0.8, 0.05]} />
          <meshStandardMaterial color="#1c1813" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.028]}>
          <planeGeometry args={[1.0, 0.66]} />
          <meshStandardMaterial color="#39434c" roughness={0.88} />
        </mesh>
      </group>
    </group>
  );
}

function FloorCushions() {
  const { shadows } = usePerf();
  return (
    <group>
      <mesh position={[-0.55, 0.085, 3.35]} scale={[1, 0.5, 1]} castShadow={shadows}>
        <sphereGeometry args={[0.34, 14, 10]} />
        <meshStandardMaterial color={LEATHER_SOFT} roughness={0.88} />
      </mesh>
      <mesh position={[1.35, 0.08, 2.05]} scale={[1, 0.48, 1]} castShadow={shadows}>
        <sphereGeometry args={[0.3, 14, 10]} />
        <meshStandardMaterial color="#4e5a46" roughness={0.9} />
      </mesh>
    </group>
  );
}

function BookStack() {
  return (
    <group position={[-5.95, 0, 3.3]}>
      <mesh position={[0, 0.03, 0]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.34, 0.06, 0.26]} />
        <meshStandardMaterial color="#5a4638" roughness={0.8} />
      </mesh>
      <mesh position={[0.02, 0.085, 0.01]} rotation={[0, -0.12, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.23]} />
        <meshStandardMaterial color="#3c4a52" roughness={0.8} />
      </mesh>
      <mesh position={[-0.01, 0.13, -0.01]} rotation={[0, 0.34, 0]}>
        <boxGeometry args={[0.27, 0.04, 0.2]} />
        <meshStandardMaterial color="#6a5a44" roughness={0.8} />
      </mesh>
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
}: {
  packet?: SpatialPacket | null;
  wallPins?: WallPin[];
  builderPos?: [number, number, number];
}) {
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
      {dense ? <LoungeChair /> : null}
      <CoffeeTable />
      <TableDressing />
      {dense ? <Hookah /> : null}
      {dense ? <FloorLamp /> : null}
      <Desk wood={wood} />
      <DeskRug />
      <DeskDressing />
      <CenterRug />
      <IdeaWall packet={packet} pins={wallPins} builderPos={builderPos} />
      {dense ? <Plant position={[-8.9, 0, 5.3]} /> : null}
      {dense ? <Plant position={[8.8, 0, -3.5]} scale={0.85} /> : null}
      {dense ? <Sideboard wood={wood} /> : null}
      {dense ? <Pendants /> : null}
      {dense ? <WallArt /> : null}
      {dense ? <FloorCushions /> : null}
      {dense ? <BookStack /> : null}
      <City count={cityCount} />
      {dense ? <Haze /> : null}
    </group>
  );
}
