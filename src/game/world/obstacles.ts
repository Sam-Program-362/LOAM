import { hash1, hash2, clamp } from "../utils/noise";
import { forestAmount, pathCenterX } from "./path";
import { CORRIDOR_HALF_WIDTH, SLOT_LENGTH } from "../constants";

export type ObstacleType = "tree" | "log" | "rock" | "stone" | "bush" | "ramp";

export interface Obstacle {
  id: string;
  d: number; // distance down the mountain
  lateral: number; // offset from corridor centre (m)
  type: ObstacleType;
  rotation: number;
  scale: number;
  hard: boolean; // true = instant crash on collision
  requiresJump: boolean;
  width: number; // collision half width (m)
  clearance: number; // min air height needed to clear (m), 0 = cannot clear by jumping
  cleared?: boolean;
}

const SAFE_START = 32; // no hazards before this distance

function buildObstacle(slot: number, sub: number): Obstacle | null {
  const base = slot * 1000 + sub * 37;
  const d = slot * SLOT_LENGTH + 2 + hash1(base + 0.11) * (SLOT_LENGTH - 4);
  if (d < SAFE_START) return null;

  const forest = forestAmount(d);
  const r0 = hash1(base + 1.2); // spawn chance roll
  const difficultyBoost = clamp(d / 4000, 0, 0.22);
  const density = 0.42 + forest * 0.16 + difficultyBoost;
  if (r0 > density) return null;

  const r1 = hash1(base + 2.3); // type pick
  const r2 = hash1(base + 3.4); // lateral pick
  const r3 = hash1(base + 4.5); // scale pick
  const r4 = hash1(base + 5.6); // rotation

  let type: ObstacleType;
  if (forest > 0.5) {
    if (r1 < 0.4) type = "tree";
    else if (r1 < 0.62) type = "log";
    else if (r1 < 0.8) type = "bush";
    else if (r1 < 0.93) type = "stone";
    else type = "ramp";
  } else {
    if (r1 < 0.28) type = "rock";
    else if (r1 < 0.45) type = "stone";
    else if (r1 < 0.6) type = "tree";
    else if (r1 < 0.78) type = "log";
    else if (r1 < 0.92) type = "ramp";
    else type = "bush";
  }

  let lateral: number;
  let width: number;
  let requiresJump = false;
  let clearance = 0;
  let hard = true;

  switch (type) {
    case "tree":
      lateral = (r2 * 2 - 1) * (CORRIDOR_HALF_WIDTH - 0.5);
      width = 0.55 + r3 * 0.25;
      hard = true;
      break;
    case "log":
      // spans (most of) the trail - must be jumped
      lateral = (r2 * 2 - 1) * 0.6;
      width = CORRIDOR_HALF_WIDTH + 1.2;
      requiresJump = true;
      clearance = 0.55 + r3 * 0.25;
      hard = true;
      break;
    case "rock":
      lateral = (r2 * 2 - 1) * (CORRIDOR_HALF_WIDTH - 0.3);
      width = 0.7 + r3 * 0.5;
      hard = true;
      break;
    case "stone":
      lateral = (r2 * 2 - 1) * (CORRIDOR_HALF_WIDTH - 0.6);
      width = 0.28 + r3 * 0.18;
      requiresJump = true;
      clearance = 0.18;
      hard = false; // small - clip it and just lose some stability
      break;
    case "bush":
      lateral = (r2 * 2 - 1) * (CORRIDOR_HALF_WIDTH - 0.4);
      width = 0.45 + r3 * 0.2;
      hard = false;
      break;
    case "ramp":
      lateral = (r2 * 2 - 1) * 1.2;
      width = 2.2;
      hard = false;
      requiresJump = false;
      break;
  }

  return {
    id: `${slot}_${sub}`,
    d,
    lateral,
    type,
    rotation: r4 * Math.PI * 2,
    scale: 0.85 + r3 * 0.5,
    hard,
    requiresJump,
    width,
    clearance,
  };
}

export function getObstaclesInRange(dMin: number, dMax: number): Obstacle[] {
  const slotMin = Math.floor(dMin / SLOT_LENGTH) - 1;
  const slotMax = Math.ceil(dMax / SLOT_LENGTH) + 1;
  const out: Obstacle[] = [];
  for (let s = slotMin; s <= slotMax; s++) {
    const o = buildObstacle(s, 0);
    if (o && o.d >= dMin && o.d <= dMax) out.push(o);
    // occasionally a second, off-trail decorative hazard in the same slot
    const r = hash2(s, 99.9);
    if (r > 0.8) {
      const o2 = buildObstacle(s, 1);
      if (o2 && o2.d >= dMin && o2.d <= dMax) {
        o2.lateral += (hash1(s + 0.77) > 0.5 ? 1 : -1) * 1.8;
        o2.id += "_b";
        out.push(o2);
      }
    }
  }
  return out;
}

export function worldXOf(o: Obstacle): number {
  return pathCenterX(o.d) + o.lateral;
}
