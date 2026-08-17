"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* A falling water table, rendered as a drifting particle plane that slowly sinks
   and re-fills — quiet, thematic, GPU-cheap (one Points draw call). */

function WaterTable({ dark }: { dark: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 2600;

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    return { positions, seeds };
  }, []);

  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime;
    const pts = ref.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i];
      const x = pos[i * 3];
      // gentle standing wave + slow sink-and-refill cycle
      pos[i * 3 + 1] =
        Math.sin(x * 0.55 + t * 0.6 + s) * 0.35 +
        Math.sin(t * 0.12 + s) * 0.9 -
        ((t * 0.08 + s) % 2.4) * 0.55;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    pts.rotation.y = pointer.x * 0.08;
    pts.rotation.x = pointer.y * 0.04 - 0.35;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        sizeAttenuation
        transparent
        opacity={dark ? 0.65 : 0.5}
        color={dark ? "#5eead4" : "#0e7490"}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function WaterScene({ dark }: { dark: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.6, 7], fov: 50 }}
      gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <WaterTable dark={dark} />
    </Canvas>
  );
}
