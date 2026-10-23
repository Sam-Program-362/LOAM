import { createNoise2D } from "simplex-noise";

// Deterministic seeded PRNG (mulberry32) so the whole mountain is identical
// every run - this lets players learn the trail and "get better" like a real track.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 133742069;
const rng = mulberry32(SEED);
export const noise2D = createNoise2D(rng);

// Cheap deterministic hash -> [0,1) for obstacle / scenery placement decisions.
export function hash1(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

export function hash2(i: number, j: number): number {
  return hash1(i * 311.7 + j * 97.13 + 11.1);
}

export function fbm(x: number, y: number, octaves = 3, lacunarity = 2, gain = 0.5): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise2D(x * freq, y * freq) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
