import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pathCenterX, terrainHeight, forestAmount } from "./path";
import { hash1 } from "../utils/noise";
import { world } from "./worldState";
import { CHUNK_LENGTH, CHUNKS_AHEAD, CHUNKS_BEHIND, CORRIDOR_HALF_WIDTH, WORLD_HALF_WIDTH } from "../constants";

const POOL_SIZE = CHUNKS_AHEAD + CHUNKS_BEHIND + 2;
const MAX_PER_TYPE = 11;
const CANDIDATES = 26;

type Item = { x: number; y: number; z: number; scale: number; rot: number };

const EMPTY: Item = { x: 0, y: -999, z: 0, scale: 0, rot: 0 };

function generateChunk(chunkIndex: number) {
  const pine: Item[] = [];
  const round: Item[] = [];
  const rock: Item[] = [];
  const bush: Item[] = [];
  const d0 = chunkIndex * CHUNK_LENGTH;

  for (let i = 0; i < CANDIDATES; i++) {
    const base = chunkIndex * 977 + i * 13.37;
    const d = d0 + hash1(base + 0.1) * CHUNK_LENGTH;
    const forest = forestAmount(d);
    const spawnChance = 0.3 + forest * 0.55;
    if (hash1(base + 0.2) > spawnChance) continue;

    const side = hash1(base + 0.3) > 0.5 ? 1 : -1;
    const latOffset = (CORRIDOR_HALF_WIDTH + 0.7) + hash1(base + 0.4) * (WORLD_HALF_WIDTH - CORRIDOR_HALF_WIDTH - 2);
    const x = pathCenterX(d) + side * latOffset;
    const y = terrainHeight(d, x);
    const z = -d;
    const rot = hash1(base + 0.5) * Math.PI * 2;
    const scaleJitter = 0.75 + hash1(base + 0.6) * 0.7;
    const item: Item = { x, y, z, scale: scaleJitter, rot };

    const typeRoll = hash1(base + 0.7);
    if (forest > 0.4) {
      if (typeRoll < 0.46) pine.push(item);
      else if (typeRoll < 0.72) round.push(item);
      else if (typeRoll < 0.88) bush.push(item);
      else rock.push(item);
    } else {
      if (typeRoll < 0.3) rock.push(item);
      else if (typeRoll < 0.56) bush.push(item);
      else if (typeRoll < 0.74) pine.push(item);
      else round.push(item);
    }
  }

  return { pine, round, rock, bush };
}

export default function Scenery() {
  const pineTrunkRef = useRef<THREE.InstancedMesh>(null);
  const pineFoliageRef = useRef<THREE.InstancedMesh>(null);
  const roundTrunkRef = useRef<THREE.InstancedMesh>(null);
  const roundFoliageRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const bushRef = useRef<THREE.InstancedMesh>(null);

  const capacity = POOL_SIZE * MAX_PER_TYPE;
  const assigned = useRef<Map<number, number>>(new Map());
  const lastWindowStart = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  function writeSlot(slot: number, data: ReturnType<typeof generateChunk>) {
    writeFamily(pineTrunkRef.current, pineFoliageRef.current, slot, data.pine, 0, 1.4);
    writeFamily(roundTrunkRef.current, roundFoliageRef.current, slot, data.round, 0, 1.1);
    writeSingle(rockRef.current, slot, data.rock);
    writeSingle(bushRef.current, slot, data.bush);
  }

  function writeFamily(
    trunkMesh: THREE.InstancedMesh | null,
    foliageMesh: THREE.InstancedMesh | null,
    slot: number,
    items: Item[],
    trunkYOffset: number,
    foliageYOffset: number
  ) {
    if (!trunkMesh || !foliageMesh) return;
    for (let k = 0; k < MAX_PER_TYPE; k++) {
      const it = items[k] ?? EMPTY;
      const instanceIdx = slot * MAX_PER_TYPE + k;

      dummy.position.set(it.x, it.y + trunkYOffset * it.scale, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.setScalar(it.scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(instanceIdx, dummy.matrix);

      dummy.position.set(it.x, it.y + foliageYOffset * it.scale, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.setScalar(it.scale);
      dummy.updateMatrix();
      foliageMesh.setMatrixAt(instanceIdx, dummy.matrix);
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    foliageMesh.instanceMatrix.needsUpdate = true;
  }

  function writeSingle(mesh: THREE.InstancedMesh | null, slot: number, items: Item[]) {
    if (!mesh) return;
    for (let k = 0; k < MAX_PER_TYPE; k++) {
      const it = items[k] ?? EMPTY;
      const instanceIdx = slot * MAX_PER_TYPE + k;
      dummy.position.set(it.x, it.y + 0.15 * it.scale, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.setScalar(it.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(instanceIdx, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  useEffect(() => {
    const startIdx = -CHUNKS_BEHIND;
    for (let i = 0; i < POOL_SIZE; i++) {
      const chunkIndex = startIdx + i;
      writeSlot(i, generateChunk(chunkIndex));
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
      let recycleKey = null as number | null;
      for (const key of assigned.current.keys()) {
        if (key < windowStart || key > windowEnd) {
          recycleKey = key;
          break;
        }
      }
      if (recycleKey === null) continue;
      const slot = assigned.current.get(recycleKey)!;
      assigned.current.delete(recycleKey);
      writeSlot(slot, generateChunk(ci));
      assigned.current.set(ci, slot);
    }
  });

  return (
    <group>
      <instancedMesh ref={pineTrunkRef} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <cylinderGeometry args={[0.1, 0.15, 1.2, 6]} />
        <meshStandardMaterial color="#5b4330" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={pineFoliageRef} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <coneGeometry args={[0.95, 3.1, 7]} />
        <meshStandardMaterial color="#2b4a2a" roughness={0.95} />
      </instancedMesh>

      <instancedMesh ref={roundTrunkRef} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <cylinderGeometry args={[0.12, 0.18, 1.6, 6]} />
        <meshStandardMaterial color="#6a4d35" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={roundFoliageRef} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color="#4c7a3b" roughness={0.9} />
      </instancedMesh>

      <instancedMesh ref={rockRef} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#8a877d" roughness={1} flatShading />
      </instancedMesh>

      <instancedMesh ref={bushRef} args={[undefined, undefined, capacity]} frustumCulled={false}>
        <sphereGeometry args={[0.6, 7, 6]} />
        <meshStandardMaterial color="#3f6a34" roughness={1} />
      </instancedMesh>
    </group>
  );
}
