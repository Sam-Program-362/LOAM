import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../store";
import { world, resetWorld } from "../world/worldState";
import { elevationAlong, gradeAt, terrainHeight, lateralFromCenter } from "../world/path";
import { getObstaclesInRange, worldXOf, type Obstacle } from "../world/obstacles";
import {
  GEAR_RATIOS,
  MAX_CADENCE,
  CADENCE_RISE,
  CADENCE_FALL_COAST,
  CADENCE_FALL_BRAKE,
  PEDAL_K,
  PEDAL_ACCEL_BASE,
  GRAVITY_ASSIST_K,
  UPHILL_DRAG_K,
  BRAKE_DECEL,
  ROLLING_DRAG,
  OFF_TRAIL_DRAG,
  MIN_SPEED,
  START_SPEED_CAP,
  MAX_SPEED_CAP,
  SPEED_CAP_RAMP,
  GRAVITY,
  JUMP_IMPULSE,
  CORRIDOR_HALF_WIDTH,
} from "../constants";
import type { useInput } from "./useInput";

const RIDER_HALF_WIDTH = 0.32;
const LAUNCH_CURVATURE_THRESHOLD = -0.16;
const LAUNCH_MIN_SPEED = 5.5;

function speedCapAt(distance: number) {
  return START_SPEED_CAP + (MAX_SPEED_CAP - START_SPEED_CAP) * (1 - Math.exp(-distance / SPEED_CAP_RAMP));
}

interface Props {
  input: ReturnType<typeof useInput>;
}

export default function GameLoop({ input }: Props) {
  const gear = useRef(2);
  const cadence = useRef(0);
  const vy = useRef(0);
  const prevGroundY = useRef(0);
  const launchCooldown = useRef(0);
  const hudTimer = useRef(0);
  const resolved = useRef<Set<string>>(new Set());
  const trickTimer = useRef(0);
  const comboCount = useRef(0);
  const airborneTimer = useRef(0);

  useFrame((_, rawDelta) => {
    const phase = useGameStore.getState().phase;
    if (phase !== "playing") return;
    const dt = Math.min(rawDelta, 1 / 30);

    const { poll, consumeJump, consumeGearUp, consumeGearDown, consumePause } = input;
    const inp = poll();

    if (consumePause()) {
      useGameStore.getState().pause();
      return;
    }
    if (consumeGearUp()) gear.current = Math.min(GEAR_RATIOS.length - 1, gear.current + 1);
    if (consumeGearDown()) gear.current = Math.max(0, gear.current - 1);

    // ---------------- Cadence ----------------
    if (inp.brake) {
      cadence.current -= CADENCE_FALL_BRAKE * dt;
    } else if (inp.pedal) {
      cadence.current += CADENCE_RISE * dt;
    } else {
      cadence.current -= CADENCE_FALL_COAST * dt;
    }
    cadence.current = Math.max(0, Math.min(MAX_CADENCE, cadence.current));

    // ---------------- Longitudinal speed ----------------
    const prevDistance = world.distance;
    const grade = gradeAt(prevDistance);
    const gravityAssist = Math.max(0, -grade) * GRAVITY_ASSIST_K * 9.8;
    const uphillDrag = Math.max(0, grade) * UPHILL_DRAG_K * 9.8;
    const gearRatio = GEAR_RATIOS[gear.current];
    const pedalTarget = (cadence.current / 100) * gearRatio * PEDAL_K * 100;
    const pedalAccelCap = PEDAL_ACCEL_BASE / gearRatio;

    let speed = world.speed;
    speed += gravityAssist * dt - uphillDrag * dt - ROLLING_DRAG * speed * dt;
    if (inp.pedal && pedalTarget > speed) {
      speed = Math.min(pedalTarget, speed + pedalAccelCap * dt);
    }
    if (inp.brake) {
      speed -= BRAKE_DECEL * dt;
    }
    if (world.offTrail) {
      speed -= OFF_TRAIL_DRAG * dt;
    }
    const cap = speedCapAt(prevDistance);
    speed = Math.max(MIN_SPEED, Math.min(cap, speed));
    world.speed = speed;

    // gear efficiency feedback for HUD
    let gearState: "optimal" | "lugging" | "spinning" = "optimal";
    const maxForGear = gearRatio * PEDAL_K * 100;
    if (speed > maxForGear * 0.97) gearState = "spinning";
    else if (gearRatio > 1.4 && speed < maxForGear * 0.3) gearState = "lugging";

    const newDistance = prevDistance + speed * dt;
    world.distance = newDistance;

    // ---------------- Lateral steering ----------------
    const steerBoost = Math.max(0.55, Math.min(1.25, speed / 10));
    world.playerX += inp.steer * 5.4 * steerBoost * dt;
    const worldLimit = 24;
    world.playerX = Math.max(-worldLimit, Math.min(worldLimit, world.playerX));
    world.steerVisual += (inp.steer - world.steerVisual) * Math.min(1, dt * 7);
    world.leanVisual += (inp.steer * 0.55 - world.leanVisual) * Math.min(1, dt * 5);

    const lateral = lateralFromCenter(newDistance, world.playerX);
    world.offTrail = Math.abs(lateral) > CORRIDOR_HALF_WIDTH;

    // ---------------- Vertical / jump physics ----------------
    launchCooldown.current = Math.max(0, launchCooldown.current - dt);
    const groundY = terrainHeight(newDistance, world.playerX);
    const jumpRequested = consumeJump();

    if (world.grounded) {
      if (jumpRequested) {
        world.grounded = false;
        world.airborne = true;
        vy.current = JUMP_IMPULSE;
        launchCooldown.current = 0.25;
        airborneTimer.current = 0;
      } else {
        // detect natural launch via curvature of the slope ahead
        const h = 1.1;
        const curvature =
          (elevationAlong(newDistance + h) - 2 * elevationAlong(newDistance) + elevationAlong(newDistance - h)) /
          (h * h);
        if (
          curvature < LAUNCH_CURVATURE_THRESHOLD &&
          speed > LAUNCH_MIN_SPEED &&
          launchCooldown.current <= 0
        ) {
          world.grounded = false;
          world.airborne = true;
          vy.current = Math.max(0, -grade) * speed * 0.6 + 1.6;
          launchCooldown.current = 0.35;
          airborneTimer.current = 0;
        } else {
          world.playerY = groundY;
          vy.current = 0;
        }
      }
    }

    if (!world.grounded) {
      airborneTimer.current += dt;
      vy.current -= GRAVITY * dt;
      world.playerY += vy.current * dt;
      if (world.playerY <= groundY) {
        world.playerY = groundY;
        const impact = Math.abs(vy.current);
        vy.current = 0;
        world.grounded = true;
        world.airborne = false;
        if (impact > 9) {
          world.shake = Math.min(1, world.shake + 0.5);
          world.speed *= 0.86;
          useGameStore.getState().updateHud({ stability: Math.max(0, useGameStore.getState().stability - 6) });
        } else if (impact > 4) {
          world.shake = Math.min(1, world.shake + 0.22);
        }
        if (airborneTimer.current > 0.55) {
          comboCount.current += 1;
          useGameStore.getState().updateHud({ lastTrick: "BIG AIR!", combo: comboCount.current });
          trickTimer.current = 1.4;
        }
        airborneTimer.current = 0;
      }
    }
    prevGroundY.current = groundY;

    // ---------------- Obstacle collisions ----------------
    const obstacles: Obstacle[] = getObstaclesInRange(prevDistance, newDistance);
    for (const o of obstacles) {
      if (resolved.current.has(o.id)) continue;
      resolved.current.add(o.id);
      const ox = worldXOf(o);
      const overlap = Math.abs(world.playerX - ox) < o.width + RIDER_HALF_WIDTH;
      if (!overlap) continue;
      if (o.type === "ramp") continue;

      const clearanceHeight = world.playerY - groundY;
      const cleared = world.airborne && o.requiresJump && clearanceHeight > o.clearance;

      if (cleared) {
        comboCount.current += 1;
        useGameStore.getState().updateHud({
          lastTrick: o.type === "log" ? "LOG CLEARED!" : "NICE HOP!",
          combo: comboCount.current,
        });
        trickTimer.current = 1.4;
        world.speed = Math.min(cap, world.speed + 0.6);
        continue;
      }

      if (o.hard) {
        useGameStore.getState().crash(crashMessage(o.type), newDistance);
        return;
      } else {
        world.shake = Math.min(1, world.shake + 0.4);
        comboCount.current = 0;
        const st = Math.max(0, useGameStore.getState().stability - 14);
        useGameStore.getState().updateHud({ stability: st, combo: 0 });
        world.speed *= 0.82;
        if (st <= 0) {
          useGameStore.getState().crash("You lost control!", newDistance);
          return;
        }
      }
    }

    // off trail stability drain / shake
    if (world.offTrail) {
      world.shake = Math.min(1, world.shake + dt * 0.6);
      const st = Math.max(0, useGameStore.getState().stability - dt * 6);
      if (st <= 0) {
        useGameStore.getState().crash("You rode off the trail!", newDistance);
        return;
      }
      useGameStore.getState().updateHud({ stability: st });
    } else {
      const st = Math.min(100, useGameStore.getState().stability + dt * 4);
      useGameStore.getState().updateHud({ stability: st });
    }

    world.shake = Math.max(0, world.shake - dt * 1.4);
    world.bobPhase += dt * (1.4 + cadence.current * 0.045 + speed * 0.12);
    world.pitchVisual = Math.max(-0.55, Math.min(0.35, -grade * 1.4));

    if (trickTimer.current > 0) {
      trickTimer.current -= dt;
      if (trickTimer.current <= 0) useGameStore.getState().updateHud({ lastTrick: "" });
    }

    // ---------------- HUD throttled sync ----------------
    hudTimer.current += dt;
    if (hudTimer.current > 0.08) {
      hudTimer.current = 0;
      useGameStore.getState().updateHud({
        distance: newDistance,
        speed: world.speed,
        speedKmh: world.speed * 3.6,
        cadence: cadence.current,
        gear: gear.current,
        gearState,
        airborne: world.airborne,
        offTrail: world.offTrail,
        upcoming: buildRadar(newDistance, world.playerX),
      });
    }
  });

  return null;
}

function crashMessage(type: Obstacle["type"]) {
  switch (type) {
    case "tree":
      return "You hit a tree!";
    case "rock":
      return "You smashed into a boulder!";
    case "log":
      return "You endo'd over a fallen log!";
    default:
      return "You crashed!";
  }
}

function buildRadar(distance: number, playerX: number) {
  const obstacles = getObstaclesInRange(distance + 0.5, distance + 45);
  return obstacles
    .filter((o) => o.type !== "ramp")
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      type: o.type,
      lateral: worldXOf(o) - playerX,
      distance: o.d - distance,
      hard: o.hard,
    }));
}

export function startNewRun() {
  resetWorld();
}
