"use client";

import { Html } from "@react-three/drei";

export function NameTag({
  name,
  mark,
  y = 1.2,
}: {
  name: string;
  mark?: string;
  y?: number;
}) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
      <div className="muse-name-tag">
        <strong>{name}</strong>
        {mark ? <span>{mark}</span> : null}
      </div>
    </Html>
  );
}
