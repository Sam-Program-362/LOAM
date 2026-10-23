import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { world } from "./worldState";

const SKY_TOP = new THREE.Color("#5fa6e8");
const SKY_HORIZON = new THREE.Color("#cfe9ea");
const FOG_COLOR = new THREE.Color("#bfe0dd");

function SkyDome() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(400, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.9);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 400;
      const t = THREE.MathUtils.clamp(y * 1.4 + 0.15, 0, 1);
      const c = SKY_HORIZON.clone().lerp(SKY_TOP, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.set(world.playerX, world.playerY, -world.distance);
  });

  return (
    <mesh ref={ref} geometry={geo} frustumCulled={false}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

function Clouds() {
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2 + Math.random() * 0.3;
      const r = 140 + Math.random() * 110;
      arr.push({
        pos: [Math.cos(ang) * r, 45 + Math.random() * 35, Math.sin(ang) * r],
        scale: 14 + Math.random() * 22,
      });
    }
    return arr;
  }, []);

  useFrame(() => {
    if (group.current) group.current.position.set(world.playerX, 0, -world.distance);
  });

  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh key={i} position={p.pos} scale={[p.scale, p.scale * 0.45, p.scale]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function Environment() {
  const { scene } = useThree();
  useMemo(() => {
    scene.fog = new THREE.Fog(FOG_COLOR, 18, 165);
  }, [scene]);

  const sun = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    if (sun.current) {
      sun.current.position.set(world.playerX + 60, 90, -world.distance + 40);
      sun.current.target.position.set(world.playerX, world.playerY, -world.distance);
      sun.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <SkyDome />
      <Clouds />
      <hemisphereLight args={["#bfe3ff", "#3c5f3a", 0.65]} />
      <directionalLight ref={sun} intensity={1.65} color="#fff6e0" castShadow={false} />
      <ambientLight intensity={0.28} />
    </>
  );
}
