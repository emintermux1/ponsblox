"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { usePerf } from "@/components/world/perf-context";
import {
  DESK_SIGNAL,
  MIND_ANCHORS,
  MIND_LINKS,
  grokSignalLive,
  nodePulse,
  phaseFor,
  signalCadence,
} from "@/lib/world/mind-graph";
import type { MindNodeId, MuseMind } from "@/types/world";
import { MIND_NODES } from "@/types/world";

const SIGNAL_SLOTS = [0, 1, 2, 3, 4] as const;

function StarDust() {
  const seeds = useMemo(() => {
    const items: { pos: [number, number, number]; phase: number }[] = [];
    for (let i = 0; i < 28; i += 1) {
      const u = (i * 2.399) % (Math.PI * 2);
      const v = Math.acos((((i * 17) % 200) / 100) - 1);
      const r = 0.38 + ((i * 13) % 40) / 80;
      items.push({
        pos: [
          r * Math.sin(v) * Math.cos(u),
          r * Math.cos(v) * 0.62,
          r * Math.sin(v) * Math.sin(u),
        ],
        phase: i * 0.37,
      });
    }
    return items;
  }, []);
  const mats = useRef<Array<MeshBasicMaterial | null>>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    seeds.forEach((seed, i) => {
      const mat = mats.current[i];
      if (mat) {
        mat.opacity = 0.16 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.9 + seed.phase));
      }
    });
  });

  return (
    <group>
      {seeds.map((seed, i) => (
        <mesh key={i} position={seed.pos}>
          <sphereGeometry args={[0.007, 6, 6]} />
          <meshBasicMaterial
            ref={(node) => {
              mats.current[i] = node;
            }}
            color="#e8d6b0"
            transparent
            opacity={0.28}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function MindLink({
  a,
  b,
  strength,
}: {
  a: MindNodeId;
  b: MindNodeId;
  strength: number;
}) {
  const mat = useRef<MeshBasicMaterial>(null);
  const layout = useMemo(() => {
    const from = new Vector3(...MIND_ANCHORS[a]);
    const to = new Vector3(...MIND_ANCHORS[b]);
    const dir = to.clone().sub(from);
    const len = dir.length();
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
    return { mid: mid.toArray() as [number, number, number], quat, len };
  }, [a, b]);

  useFrame((state) => {
    if (!mat.current) return;
    const wave =
      0.5 + 0.5 * Math.sin(state.clock.elapsedTime * (1.05 + strength * 1.4) + layout.len * 4);
    mat.current.opacity = (0.1 + strength * 0.38) * (0.55 + wave * 0.45);
  });

  return (
    <mesh position={layout.mid} quaternion={layout.quat}>
      <cylinderGeometry args={[0.0032, 0.0032, layout.len, 5]} />
      <meshBasicMaterial ref={mat} color="#d8c9a4" transparent opacity={0.2} depthWrite={false} />
    </mesh>
  );
}

function ConstellationNode({ id, value }: { id: MindNodeId; value: number }) {
  const core = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const coreMat = useRef<MeshBasicMaterial>(null);
  const haloMat = useRef<MeshBasicMaterial>(null);
  const pos = MIND_ANCHORS[id];
  const phase = useMemo(() => phaseFor(id), [id]);
  const grok = id === "GROK";

  useFrame((state) => {
    const pulse = nodePulse(value, state.clock.elapsedTime, phase);
    const wobble = 0.012 * Math.sin(state.clock.elapsedTime * (0.55 + value * 0.4) + phase);
    const x = pos[0] + wobble;
    const y = pos[1] + wobble * 0.45;
    const z = pos[2];
    if (core.current) {
      core.current.position.set(x, y, z);
      core.current.scale.setScalar((0.72 + value * 0.5) * (0.88 + pulse * 0.16));
    }
    if (halo.current) {
      halo.current.position.set(x, y, z);
      halo.current.scale.setScalar(1.15 + pulse * 0.35 + value * 0.2);
    }
    if (coreMat.current) {
      coreMat.current.opacity = 0.55 + value * 0.4 + pulse * 0.08;
    }
    if (haloMat.current) {
      haloMat.current.opacity = 0.04 + value * 0.08 + pulse * 0.04;
    }
  });

  return (
    <group>
      <mesh ref={halo} position={pos}>
        <sphereGeometry args={[0.046, 12, 12]} />
        <meshBasicMaterial
          ref={haloMat}
          color={grok ? "#d7b56a" : "#efe6d4"}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={core} position={pos}>
        <sphereGeometry args={[0.022, 12, 12]} />
        <meshBasicMaterial
          ref={coreMat}
          color={grok ? "#e4c67a" : "#f0e6d2"}
          transparent
          opacity={0.86}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function GrokSignal({
  origin,
  value,
  live,
}: {
  origin: [number, number, number];
  value: number;
  live: boolean;
}) {
  const slots = useRef<Array<Mesh | null>>([]);
  const age = useRef<number[]>(SIGNAL_SLOTS.map(() => -1));
  const lastEmit = useRef(-99);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (t - lastEmit.current >= signalCadence(value, live)) {
      lastEmit.current = t;
      const free = age.current.findIndex((slot) => slot < 0);
      if (free >= 0) {
        age.current[free] = 0;
      }
    }
    const [ox, oy, oz] = origin;
    const sx = MIND_ANCHORS.GROK[0];
    const sy = MIND_ANCHORS.GROK[1];
    const sz = MIND_ANCHORS.GROK[2];
    const ex = DESK_SIGNAL[0] - ox;
    const ey = DESK_SIGNAL[1] - oy;
    const ez = DESK_SIGNAL[2] - oz;
    const mx = (sx + ex) * 0.5;
    const my = Math.max(sy, ey) + 0.7;
    const mz = (sz + ez) * 0.5;
    for (const i of SIGNAL_SLOTS) {
      const mesh = slots.current[i];
      if (!mesh) continue;
      const current = age.current[i];
      if (current < 0) {
        mesh.visible = false;
        continue;
      }
      const next = current + dt / 2.35;
      if (next >= 1) {
        age.current[i] = -1;
        mesh.visible = false;
        continue;
      }
      age.current[i] = next;
      const u = next;
      const uu = 1 - u;
      mesh.visible = true;
      mesh.position.set(
        uu * uu * sx + 2 * uu * u * mx + u * u * ex,
        uu * uu * sy + 2 * uu * u * my + u * u * ey,
        uu * uu * sz + 2 * uu * u * mz + u * u * ez,
      );
      const fade = Math.sin(u * Math.PI);
      mesh.scale.setScalar(0.45 + fade * (0.55 + value * 0.5));
    }
  });

  return (
    <group>
      {SIGNAL_SLOTS.map((i) => (
        <mesh
          key={i}
          ref={(node) => {
            slots.current[i] = node;
          }}
          visible={false}
        >
          <octahedronGeometry args={[0.028, 0]} />
          <meshBasicMaterial color="#e8d2a0" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export function MuseMindField({
  mind,
  origin,
  visible,
}: {
  mind: MuseMind;
  origin: [number, number, number];
  visible: boolean;
}) {
  const sway = useRef<Group>(null);
  const { pauseExtras } = usePerf();

  useFrame((state) => {
    if (!sway.current) return;
    if (pauseExtras) return;
    const t = state.clock.elapsedTime;
    sway.current.rotation.y = Math.sin(t * 0.17) * 0.11;
    sway.current.rotation.x = Math.cos(t * 0.13) * 0.05;
    sway.current.position.y = Math.sin(t * 0.65) * 0.025;
  });

  if (!visible) {
    return null;
  }

  return (
    <group position={origin}>
      <group ref={sway}>
        <StarDust />
        {MIND_LINKS.map(([a, b]) => (
          <MindLink key={`${a}-${b}`} a={a} b={b} strength={(mind.nodes[a] + mind.nodes[b]) * 0.5} />
        ))}
        {MIND_NODES.map((id) => (
          <ConstellationNode key={id} id={id} value={mind.nodes[id]} />
        ))}
        <pointLight
          position={MIND_ANCHORS.GROK}
          color="#d7b56a"
          intensity={0.12 + mind.nodes.GROK * 0.7}
          distance={2.2}
        />
      </group>
      <GrokSignal origin={origin} value={mind.nodes.GROK} live={grokSignalLive(mind)} />
    </group>
  );
}
