"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { useTape } from "@/components/world/tape-context";
import { dexEmbedSrc, dexHonesty } from "@/lib/world/dex-embed";
import { tapeHeadline, tapeStamp } from "@/lib/world/tape";

const bl = new Vector3();
const br = new Vector3();
const tl = new Vector3();
const mid = new Vector3();

const MIN_W = 320;
const MIN_H = 180;

export function DexOnLcd({ width, height }: { width: number; height: number }) {
  const tape = useTape();
  const src = dexEmbedSrc(tape);
  const mount = useRef<Group>(null);
  const pane = useRef<HTMLDivElement>(null);
  const { gl } = useThree();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const mark = dexHonesty(tape.source);
  const headline = tape.ticker ?? tapeHeadline(tape);

  useLayoutEffect(() => {
    setHost(gl.domElement.parentElement);
  }, [gl]);

  useFrame(({ camera }) => {
    const node = pane.current;
    const group = mount.current;
    if (!node || !group || !src) {
      if (node) {
        node.style.display = "none";
      }
      return;
    }
    group.updateWorldMatrix(true, false);
    const el = gl.domElement;
    const hw = width / 2;
    const hh = height / 2;
    bl.set(-hw, -hh, 0).applyMatrix4(group.matrixWorld).project(camera);
    br.set(hw, -hh, 0).applyMatrix4(group.matrixWorld).project(camera);
    tl.set(-hw, hh, 0).applyMatrix4(group.matrixWorld).project(camera);
    mid.set(0, 0, 0).applyMatrix4(group.matrixWorld).project(camera);
    if (mid.z > 1 || Math.abs(mid.x) > 1.35 || Math.abs(mid.y) > 1.35) {
      node.style.display = "none";
      return;
    }
    const left = (bl.x * 0.5 + 0.5) * el.clientWidth;
    const right = (br.x * 0.5 + 0.5) * el.clientWidth;
    const top = (-tl.y * 0.5 + 0.5) * el.clientHeight;
    const bottom = (-bl.y * 0.5 + 0.5) * el.clientHeight;
    const cx = (mid.x * 0.5 + 0.5) * el.clientWidth;
    const cy = (-mid.y * 0.5 + 0.5) * el.clientHeight;
    const w = Math.max(Math.abs(right - left), MIN_W);
    const h = Math.max(Math.abs(bottom - top), MIN_H);
    node.style.display = "flex";
    node.style.left = `${Math.max(8, cx - w / 2)}px`;
    node.style.top = `${Math.max(8, cy - h / 2)}px`;
    node.style.width = `${w}px`;
    node.style.height = `${h}px`;
  });

  return (
    <group ref={mount}>
      {host && src
        ? createPortal(
            <div
              ref={pane}
              className="loft-dex-screen"
              data-dex-embed="live"
              data-dex-mark={mark}
              style={{ display: "none" }}
            >
              <span className="loft-dex-screen-bar">
                DEXSCREENER · {headline} · {mark} · {tapeStamp(tape.source)} · no fills
              </span>
              <iframe
                title="DexScreener"
                src={src}
                className="loft-dex-frame"
                allow="fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>,
            host,
          )
        : null}
    </group>
  );
}
