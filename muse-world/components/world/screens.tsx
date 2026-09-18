"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";
import { usePerf } from "@/components/world/perf-context";
import {
  paintScreen,
  quietScreenPulse,
  sanitizeScreenPulse,
  type ScreenKind,
  type ScreenPulse,
} from "@/lib/world/screen-texture";

const ScreenPulseContext = createContext<ScreenPulse>(quietScreenPulse());

export function ScreenPulseProvider({
  pulse,
  children,
}: {
  pulse: ScreenPulse;
  children: ReactNode;
}) {
  const value = useMemo(() => sanitizeScreenPulse(pulse), [pulse]);
  return <ScreenPulseContext.Provider value={value}>{children}</ScreenPulseContext.Provider>;
}

export function useScreenPulse(): ScreenPulse {
  return useContext(ScreenPulseContext);
}

function screenSize(kind: ScreenKind): [number, number] {
  switch (kind) {
    case "phone":
      return [256, 448];
    case "laptop":
      return [512, 320];
    case "desk":
      return [640, 400];
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

function useLitScreen(kind: ScreenKind) {
  const pulse = useScreenPulse();
  const { pauseExtras } = usePerf();
  const size = screenSize(kind);
  const canvas = useMemo(() => {
    const node = document.createElement("canvas");
    node.width = size[0];
    node.height = size[1];
    return node;
  }, [size]);
  const texture = useMemo(() => {
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [canvas]);

  const paint = (time: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    paintScreen(ctx, canvas.width, canvas.height, pulse, time, kind);
    texture.needsUpdate = true;
  };

  useLayoutEffect(() => {
    paint(0);
  }, [canvas, kind, pulse, texture]);

  useLayoutEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame((state) => {
    if (pauseExtras) {
      return;
    }
    paint(state.clock.elapsedTime);
  });

  return texture;
}

export function PulseGlass({
  kind,
  width,
  height,
}: {
  kind: ScreenKind;
  width: number;
  height: number;
}) {
  const texture = useLitScreen(kind);
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        emissive="#b7d7ea"
        emissiveMap={texture}
        emissiveIntensity={1.45}
        toneMapped={false}
        roughness={0.22}
        metalness={0.08}
      />
    </mesh>
  );
}

export function DeskMonitors() {
  return (
    <>
      {[-0.58, 0.62].map((x) => (
        <group key={x} position={[x, 1.2, -0.28]} rotation={[-0.1, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.92, 0.56, 0.03]} />
            <meshStandardMaterial color="#161513" metalness={0.72} roughness={0.26} />
          </mesh>
          <group position={[0, 0, 0.018]}>
            <PulseGlass kind="desk" width={0.86} height={0.5} />
          </group>
          <pointLight position={[0, 0, 0.28]} intensity={0.55} color="#8fb7cc" distance={1.8} decay={2} />
        </group>
      ))}
    </>
  );
}

export function DeskLaptop() {
  return (
    <group position={[1.08, 0.8, 0.2]} rotation={[0, -0.18, 0]}>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.34, 0.012, 0.24]} />
        <meshStandardMaterial color="#2a2a28" metalness={0.7} roughness={0.32} />
      </mesh>
      <group position={[0, 0.12, -0.09]} rotation={[-0.55, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.34, 0.22, 0.012]} />
          <meshStandardMaterial color="#1a1a18" metalness={0.68} roughness={0.3} />
        </mesh>
        <group position={[0, 0, 0.008]}>
          <PulseGlass kind="laptop" width={0.3} height={0.18} />
        </group>
      </group>
      <pointLight position={[0, 0.16, 0.08]} intensity={0.28} color="#9ec6d8" distance={1.1} decay={2} />
    </group>
  );
}

export function PhoneScreen() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.1, 0.17, 0.018]} />
        <meshStandardMaterial color="#11110f" roughness={0.3} metalness={0.4} />
      </mesh>
      <group position={[0, 0, 0.011]}>
        <PulseGlass kind="phone" width={0.082} height={0.14} />
      </group>
    </group>
  );
}
