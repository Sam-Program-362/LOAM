import { pathCenterX } from "./path";

// Mutable, non-reactive singleton holding the authoritative per-frame state of
// the ride. Written once per frame by GameLoop, read by every visual renderer
// (terrain, scenery, obstacles, bike rig). Avoiding React state here keeps the
// simulation running at full frame rate without re-render overhead.
export const world = {
  distance: 0, // metres travelled down the mountain
  playerX: 0, // world X position of the rider
  playerY: 0, // world Y (ground-relative + air) position of the rider
  groundY: 0, // terrain height directly under the rider
  speed: 0, // current m/s
  grounded: true,
  airborne: false,
  steerVisual: 0, // -1..1 smoothed handlebar turn
  leanVisual: 0, // camera roll amount
  pitchVisual: 0, // camera pitch from slope
  bobPhase: 0, // pedal/terrain bob cycle
  shake: 0, // impact shake decay
  offTrail: false,
  started: false,
};

export function resetWorld() {
  world.distance = 0;
  world.playerX = pathCenterX(0);
  world.playerY = 0;
  world.groundY = 0;
  world.speed = 0;
  world.grounded = true;
  world.airborne = false;
  world.steerVisual = 0;
  world.leanVisual = 0;
  world.pitchVisual = 0;
  world.bobPhase = 0;
  world.shake = 0;
  world.offTrail = false;
  world.started = true;
}
