import { noise2D, fbm, clamp, smoothstep } from "../utils/noise";
import { AVG_GRADE, CORRIDOR_HALF_WIDTH } from "../constants";

// ---------------------------------------------------------------------------
// All of these functions are PURE functions of distance-down-the-mountain (d)
// and lateral offset (x). Because the whole world is generated from distance
// alone, we never need to store terrain data - chunks just sample these fns.
// ---------------------------------------------------------------------------

/** Winding centre-line of the single-track trail (metres, lateral). */
export function pathCenterX(d: number): number {
  return noise2D(d * 0.0035, 5.21) * 6.2 + noise2D(d * 0.0011, 55.7) * 4.4;
}

/** 0 = wide open plain, 1 = dense forest. Smooth low-frequency biome blend. */
export function forestAmount(d: number): number {
  const n = fbm(d * 0.0022, 2.7, 2);
  return clamp((n + 1) / 2, 0, 1);
}

/** Large scale elevation trend (big rolling mountain shapes). */
function elevationBase(d: number): number {
  return -(d * AVG_GRADE) + fbm(d * 0.0015, 3.3, 3) * 14;
}

/** Medium rollers - the main source of natural "catch air" bumps. */
function rollers(d: number): number {
  return fbm(d * 0.02, 77.4, 2) * 1.1;
}

/** Sharp, occasional ridged bumps -> natural jump lips. */
function ridgedBumps(d: number): number {
  const n = noise2D(d * 0.065, 9.9);
  const ridged = 1 - Math.abs(n);
  const shaped = Math.max(0, (ridged - 0.58) / 0.42);
  return shaped * shaped * 1.7;
}

/** Elevation ignoring lateral position / fine detail - used for physics (grade). */
export function elevationAlong(d: number): number {
  return elevationBase(d) + rollers(d) + ridgedBumps(d);
}

/** Local grade (negative = downhill) sampled via finite differences. */
export function gradeAt(d: number): number {
  const h = 0.6;
  return (elevationAlong(d + h) - elevationAlong(d - h)) / (2 * h);
}

/** Fine surface detail for visual richness + subtle handlebar chatter. */
function fineDetail(d: number, x: number): number {
  return fbm(d * 0.28 + x * 0.1, x * 0.28 - d * 0.03, 2) * 0.07;
}

/** Cross-trail shaping: berms rising away from the corridor + a gentle tread dish. */
function crossShape(d: number, x: number): number {
  const center = pathCenterX(d);
  const lateral = x - center;
  const abs = Math.abs(lateral);
  const outside = Math.max(0, abs - CORRIDOR_HALF_WIDTH);
  const berm = outside * outside * 0.075 + outside * 0.12;
  const dish = -(1 - smoothstep(0, CORRIDOR_HALF_WIDTH, abs)) * 0.1;
  return berm + dish;
}

/** Full terrain height sampled anywhere in the world. */
export function terrainHeight(d: number, x: number): number {
  return elevationBase(d) + rollers(d) + ridgedBumps(d) + crossShape(d, x) + fineDetail(d, x);
}

/** How far (metres) a lateral position is from the ridable corridor centre. */
export function lateralFromCenter(d: number, worldX: number): number {
  return worldX - pathCenterX(d);
}
