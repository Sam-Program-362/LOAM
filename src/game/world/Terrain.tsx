import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { terrainHeight, pathCenterX, forestAmount, gradeAt } from "./path";
import { hash2, clamp, smoothstep } from "../utils/noise";
import { world } from "./worldState";
import { CHUNK_LENGTH, CHUNKS_AHEAD, CHUNKS_BEHIND, CORRIDOR_HALF_WIDTH, WORLD_HALF_WIDTH } from "../constants";

const SEG_X = 20;
const SEG_Z = 18;
const POOL_SIZE = CHUNKS_AHEAD + CHUNKS_BEHIND + 2;

const GRASS_OPEN = new THREE.Color("#6f9a46");
const GRASS_FOREST = new THREE.Color("#3f5f33");
const DIRT = new THREE.Color("#71543a");
const DIRT_DARK = new THREE.Color("#4a3523");
const ROCK = new THREE.Color("#8d897f");

function sharedIndices() {
  const indices: number[] = [];
  for (let i = 0; i < SEG_X; i++) {
    for (let j = 0; j < SEG_Z; j++) {
      const a = i * (SEG_Z + 1) + j;
      const b = a + 1;
      const c = a + (SEG_Z + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return indices;
}

function buildChunk(geometry: THREE.BufferGeometry, chunkIndex: number) {
  const d0 = chunkIndex * CHUNK_LENGTH;
  const vertCount = (SEG_X + 1) * (SEG_Z + 1);
  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const tmp = new THREE.Color();

  for (let i = 0; i <= SEG_X; i++) {
    const u = i / SEG_X;
    const d = d0 + u * CHUNK_LENGTH;
    const center = pathCenterX(d);
    const forest = forestAmount(d);
    const steep = clamp(Math.abs(gradeAt(d)) * 2.2, 0, 1);
    const base = GRASS_OPEN.clone().lerp(GRASS_FOREST, forest);

    for (let j = 0; j <= SEG_Z; j++) {
      const v = (j / SEG_Z) * 2 - 1;
      const x = center + v * WORLD_HALF_WIDTH;
      const y = terrainHeight(d, x);
      const idx = i * (SEG_Z + 1) + j;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = -d;

      const lateral = x - center;
      const absLat = Math.abs(lateral);
      const trailFactor = 1 - smoothstep(0, CORRIDOR_HALF_WIDTH * 0.95, absLat);
      const rut = Math.exp(-((absLat - 0.55) * (absLat - 0.55)) / 0.05) * (trailFactor > 0.25 ? 1 : 0);

      tmp.copy(base);
      tmp.lerp(ROCK, steep * 0.55);
      tmp.lerp(DIRT, trailFactor * 0.82);
      tmp.lerp(DIRT_DARK, rut * 0.45);

      const n = (hash2(Math.floor(x * 3.1), Math.floor(d * 3.1)) - 0.5) * 0.12;
      tmp.r = clamp(tmp.r + n, 0, 1);
      tmp.g = clamp(tmp.g + n, 0, 1);
      tmp.b = clamp(tmp.b + n, 0, 1);

      colors[idx * 3] = tmp.r;
      colors[idx * 3 + 1] = tmp.g;
      colors[idx * 3 + 2] = tmp.b;
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

export default function Terrain() {
  const indices = useMemo(() => sharedIndices(), []);
  const geometries = useMemo(() => {
    const arr: THREE.BufferGeometry[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const g = new THREE.BufferGeometry();
      g.setIndex(indices);
      arr.push(g);
    }
    return arr;
  }, [indices]);

  const assigned = useRef<Map<number, number>>(new Map());
  const lru = useRef<number[]>([]);
  const lastWindowStart = useRef<number | null>(null);

  useEffect(() => {
    // initial build near the start
    const startIdx = -CHUNKS_BEHIND;
    for (let i = 0; i < POOL_SIZE; i++) {
      const chunkIndex = startIdx + i;
      buildChunk(geometries[i], chunkIndex);
      assigned.current.set(chunkIndex, i);
      lru.current.push(chunkIndex);
    }
    lastWindowStart.current = startIdx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometries]);

  useFrame(() => {
    const curChunk = Math.floor(world.distance / CHUNK_LENGTH);
    const windowStart = curChunk - CHUNKS_BEHIND;
    const windowEnd = curChunk + CHUNKS_AHEAD;
    if (lastWindowStart.current === windowStart) return;
    lastWindowStart.current = windowStart;

    for (let ci = windowStart; ci <= windowEnd; ci++) {
      if (assigned.current.has(ci)) continue;
      // find a chunk outside the window to recycle
      let recycleKey = -Infinity;
      for (const key of assigned.current.keys()) {
        if (key < windowStart || key > windowEnd) {
          recycleKey = key;
          break;
        }
      }
      if (recycleKey === -Infinity) continue;
      const slot = assigned.current.get(recycleKey)!;
      assigned.current.delete(recycleKey);
      buildChunk(geometries[slot], ci);
      assigned.current.set(ci, slot);
    }
  });

  return (
    <group>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow frustumCulled={false}>
          <meshStandardMaterial vertexColors roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
