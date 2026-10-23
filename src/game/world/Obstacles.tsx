import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getObstaclesInRange, worldXOf, type Obstacle } from "./obstacles";
import { world } from "./worldState";
import { terrainHeight } from "./path";
import { CHUNK_LENGTH, CHUNKS_AHEAD, CHUNKS_BEHIND } from "../constants";

const POOL_SIZE = CHUNKS_AHEAD + CHUNKS_BEHIND + 2;
const MAX_PER_TYPE = 5;

const HIDDEN = new THREE.Object3D();
HIDDEN.position.set(0, -999, 0);
HIDDEN.updateMatrix();

function groupByType(obstacles: Obstacle[]) {
  const g: Record<Obstacle["type"], Obstacle[]> = { tree: [], log: [], rock: [], stone: [], bush: [], ramp: [] };
  for (const o of obstacles) g[o.type].push(o);
  return g;
}

export default function Obstacles() {
  const treeTrunk = useRef<THREE.InstancedMesh>(null);
  const treeFoliage = useRef<THREE.InstancedMesh>(null);
  const log = useRef<THREE.InstancedMesh>(null);
  const rock = useRef<THREE.InstancedMesh>(null);
  const stone = useRef<THREE.InstancedMesh>(null);
  const bush = useRef<THREE.InstancedMesh>(null);
  const ramp = useRef<THREE.InstancedMesh>(null);

  const capacity = POOL_SIZE * MAX_PER_TYPE;
  const assigned = useRef<Map<number, number>>(new Map());
  const lastWindowStart = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  function place(mesh: THREE.InstancedMesh | null, slot: number, items: Obstacle[], yOff: number, extra?: (o: Obstacle, d: THREE.Object3D) => void) {
    if (!mesh) return;
    for (let k = 0; k < MAX_PER_TYPE; k++) {
      const o = items[k];
      const idx = slot * MAX_PER_TYPE + k;
      if (!o) {
        mesh.setMatrixAt(idx, HIDDEN.matrix);
        continue;
      }
      const x = worldXOf(o);
      const y = terrainHeight(o.d, x);
      dummy.position.set(x, y + yOff * o.scale, -o.d);
      dummy.rotation.set(0, o.rotation, 0);
      dummy.scale.setScalar(o.scale);
      if (extra) extra(o, dummy);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function writeSlot(slot: number, byType: Record<Obstacle["type"], Obstacle[]>) {
    place(treeTrunk.current, slot, byType.tree, 0.9);
    place(treeFoliage.current, slot, byType.tree, 2.6);
    place(log.current, slot, byType.log, 0.26, (_o, d) => {
      d.rotation.z = Math.PI / 2;
    });
    place(rock.current, slot, byType.rock, 0.4);
    place(stone.current, slot, byType.stone, 0.14);
    place(bush.current, slot, byType.bush, 0.3);
    place(ramp.current, slot, byType.ramp, 0.05, (o, d) => {
      d.scale.set(1.6 * o.scale, 0.4 * o.scale, 1.3 * o.scale);
    });
  }

  useEffect(() => {
    const startIdx = -CHUNKS_BEHIND;
    for (let i = 0; i < POOL_SIZE; i++) {
      const chunkIndex = startIdx + i;
      const list = getObstaclesInRange(chunkIndex * CHUNK_LENGTH, (chunkIndex + 1) * CHUNK_LENGTH);
      writeSlot(i, groupByType(list));
      assigned.current.set(chunkIndex, i);
    }
    lastWindowStart.current = startIdx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const curChunk = Math.floor(world.distance / CHUNK_LENGTH);
    const windowStart = curChunk - CHUNKS_BEHIND;
    const windowEnd = curChunk + CHUNKS_AHEAD;
    if (lastWindowStart.current === windowStart) return;
    lastWindowStart.current = windowStart;

    for (let ci = windowStart; ci <= windowEnd; ci++) {
      if (assigned.current.has(ci)) continue;
      let recycleKey: number | null = null;
      for (const key of assigned.current.keys()) {
        if (key < windowStart || key > windowEnd) {
          recycleKey = key;
          break;
        }
      }
      if (recycleKey === null) continue;
      const slot = assigned.current.get(recycleKey)!;
      assigned.current.delete(recycleKey);
      const list = getObstaclesInRange(ci * CHUNK_LENGTH, (ci + 1) * CHUNK_LENGTH);
      writeSlot(slot, groupByType(list));
      assigned.current.set(ci, slot);
    }
  });

  return (
    <group>
      <instancedMesh ref={treeTrunk} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <cylinderGeometry args={[0.13, 0.19, 1.8, 7]} />
        <meshStandardMaterial color="#51392a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={treeFoliage} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <coneGeometry args={[1.05, 3.4, 8]} />
        <meshStandardMaterial color="#24431f" roughness={0.95} />
      </instancedMesh>

      <instancedMesh ref={log} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <cylinderGeometry args={[0.32, 0.32, 5.6, 9]} />
        <meshStandardMaterial color="#5c4027" roughness={1} />
      </instancedMesh>

      <instancedMesh ref={rock} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <dodecahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial color="#817c71" roughness={1} flatShading />
      </instancedMesh>

      <instancedMesh ref={stone} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#8d887c" roughness={1} flatShading />
      </instancedMesh>

      <instancedMesh ref={bush} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <sphereGeometry args={[0.55, 7, 6]} />
        <meshStandardMaterial color="#395e2d" roughness={1} />
      </instancedMesh>

      <instancedMesh ref={ramp} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6e4f34" roughness={1} />
      </instancedMesh>
    </group>
  );
}
