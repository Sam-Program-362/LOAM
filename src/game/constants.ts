// Global tunable constants for the MTB downhill game.
// Keeping everything in one place makes the "realistic but playable" balance easy to tweak.

export const CORRIDOR_HALF_WIDTH = 4.2; // half width of the rideable single-track trail (m)
export const WORLD_HALF_WIDTH = 28; // half width of the generated terrain strip (m)
export const SLOT_LENGTH = 7; // distance between obstacle "slots" (m)
export const CHUNK_LENGTH = 20; // length of one terrain chunk (m)
export const CHUNKS_AHEAD = 11; // how many chunks are kept alive ahead of the player
export const CHUNKS_BEHIND = 1; // chunks kept behind before despawning

export const GRAVITY = 18; // m/s^2, slightly exaggerated for arcade feel
export const JUMP_IMPULSE = 6.4; // m/s, manual bunny-hop impulse
export const EYE_HEIGHT = 1.42; // rider eye height above ground contact (m)

// ---- Speed & gearing -----------------------------------------------------
export const MIN_SPEED = 1.6; // bike never fully stops (m/s)
export const START_SPEED_CAP = 13; // initial soft speed ceiling (m/s) ~ 47 km/h
export const MAX_SPEED_CAP = 24.5; // absolute top speed ceiling (m/s) ~ 88 km/h
export const SPEED_CAP_RAMP = 2600; // distance (m) over which the cap approaches max

export const GEAR_RATIOS = [0.62, 0.8, 1.0, 1.25, 1.55, 1.9, 2.3, 2.75];
export const MAX_CADENCE = 100; // rpm-like unit 0-100
export const CADENCE_RISE = 95; // cadence gained per second while pedalling (at full effort)
export const CADENCE_FALL_COAST = 55; // cadence lost per second while coasting
export const CADENCE_FALL_BRAKE = 160; // cadence lost per second while braking
export const PEDAL_K = 0.095; // m/s of speed per (cadence unit * gear ratio)
export const PEDAL_ACCEL_BASE = 3.4; // reference acceleration (m/s^2) at gear ratio = 1
export const GRAVITY_ASSIST_K = 0.62; // how strongly downhill grade translates to free speed
export const UPHILL_DRAG_K = 0.9; // how strongly uphill grade slows the bike
export const BRAKE_DECEL = 11; // m/s^2 while braking
export const ROLLING_DRAG = 0.045; // natural drag per second relative to speed over cap

// ---- Steering --------------------------------------------------------------
export const STEER_SPEED = 5.4; // m/s lateral speed at full steering input
export const STEER_RETURN = 3.2; // how fast handlebar visually re-centers
export const OFF_TRAIL_DRAG = 2.6; // extra drag multiplier applied off the beaten trail

// ---- Terrain shaping ---------------------------------------------------------
export const AVG_GRADE = 0.105; // average downhill grade (~10.5%)
export const GRADE_VARIATION = 0.1; // +/- grade noise amplitude

export type Phase = "menu" | "countdown" | "playing" | "paused" | "crashed";
