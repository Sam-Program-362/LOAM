import { create } from "zustand";
import type { Phase } from "./constants";

interface UpcomingObstacle {
  id: string;
  type: string;
  lateral: number; // relative to player, metres
  distance: number; // metres ahead
  hard: boolean;
}

interface GameStore {
  phase: Phase;
  distance: number;
  speed: number; // m/s
  speedKmh: number;
  cadence: number; // 0-100
  gear: number; // index
  gearState: "optimal" | "lugging" | "spinning";
  stability: number; // 0-100
  crashReason: string;
  bestDistance: number;
  airborne: boolean;
  offTrail: boolean;
  combo: number;
  lastTrick: string;
  upcoming: UpcomingObstacle[];

  setPhase: (p: Phase) => void;
  startRun: () => void;
  updateHud: (partial: Partial<GameStore>) => void;
  crash: (reason: string, distanceOverride?: number) => void;
  resume: () => void;
  pause: () => void;
}

const BEST_KEY = "mtb_downhill_best";

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "menu",
  distance: 0,
  speed: 0,
  speedKmh: 0,
  cadence: 0,
  gear: 2,
  gearState: "optimal",
  stability: 100,
  crashReason: "",
  bestDistance: loadBest(),
  airborne: false,
  offTrail: false,
  combo: 0,
  lastTrick: "",
  upcoming: [],

  setPhase: (p) => set({ phase: p }),

  startRun: () =>
    set({
      phase: "playing",
      distance: 0,
      speed: 0,
      speedKmh: 0,
      cadence: 0,
      gear: 2,
      stability: 100,
      crashReason: "",
      airborne: false,
      offTrail: false,
      combo: 0,
      lastTrick: "",
      upcoming: [],
    }),

  updateHud: (partial) => set(partial),

  crash: (reason, distanceOverride) => {
    const d = distanceOverride ?? get().distance;
    const best = Math.max(d, get().bestDistance);
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch {
      /* ignore */
    }
    set({ phase: "crashed", crashReason: reason, bestDistance: best });
  },

  resume: () => set({ phase: "playing" }),
  pause: () => set({ phase: "paused" }),
}));
