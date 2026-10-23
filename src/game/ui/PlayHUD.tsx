import { useShallow } from "zustand/react/shallow";
import { useGameStore } from "../store";
import { CORRIDOR_HALF_WIDTH, GEAR_RATIOS } from "../constants";

const OBSTACLE_ICON: Record<string, string> = {
  tree: "🌲",
  log: "🪵",
  rock: "🪨",
  stone: "⚪",
  bush: "🌿",
  ramp: "⛰",
};

export default function PlayHUD() {
  const {
    speedKmh,
    gear,
    gearState,
    cadence,
    stability,
    distance,
    offTrail,
    airborne,
    lastTrick,
    combo,
    upcoming,
  } = useGameStore((s) => ({
    speedKmh: s.speedKmh,
    gear: s.gear,
    gearState: s.gearState,
    cadence: s.cadence,
    stability: s.stability,
    distance: s.distance,
    offTrail: s.offTrail,
    airborne: s.airborne,
    lastTrick: s.lastTrick,
    combo: s.combo,
    upcoming: s.upcoming,
  }));

  const speedFrac = Math.min(1, speedKmh / 90);
  const gearColor =
    gearState === "optimal" ? "text-emerald-400" : gearState === "lugging" ? "text-amber-400" : "text-red-400";

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans">
      {/* speed sense vignette */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 0 ${80 + speedFrac * 160}px ${10 + speedFrac * 40}px rgba(0,0,0,${0.25 + speedFrac * 0.35})`,
        }}
      />

      {/* top distance + radar */}
      <div className="absolute left-1/2 top-4 w-[min(92vw,560px)] -translate-x-1/2">
        <div className="mb-2 flex items-center justify-center gap-2 text-white">
          <span className="rounded-full bg-black/40 px-4 py-1 text-sm font-bold tracking-wide backdrop-blur">
            {Math.round(distance)} m
          </span>
          {offTrail && (
            <span className="animate-pulse rounded-full bg-red-600/80 px-3 py-1 text-xs font-bold tracking-wide">
              ⚠ OFF TRAIL
            </span>
          )}
        </div>
        <Radar upcoming={upcoming} />
      </div>

      {/* trick popup */}
      {lastTrick && (
        <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="animate-bounce text-3xl font-black text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            {lastTrick}
          </div>
          {combo > 1 && <div className="text-lg font-bold text-white/90">Combo x{combo}</div>}
        </div>
      )}

      {airborne && (
        <div className="absolute left-1/2 top-[20%] -translate-x-1/2 text-xs font-bold tracking-widest text-sky-300">
          AIRBORNE
        </div>
      )}

      {/* bottom-left: speed + gear */}
      <div className="absolute bottom-5 left-5 flex items-end gap-4">
        <div className="rounded-2xl bg-black/50 px-5 py-3 text-white backdrop-blur">
          <div className="text-4xl font-black leading-none tabular-nums">{Math.round(speedKmh)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">km/h</div>
        </div>
        <div className="rounded-2xl bg-black/50 px-4 py-3 text-center backdrop-blur">
          <div className={`text-2xl font-black leading-none ${gearColor}`}>{gear + 1}</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
            {gearState === "optimal" ? "gear" : gearState}
          </div>
        </div>
      </div>

      {/* bottom-right: cadence + stability */}
      <div className="absolute bottom-5 right-5 w-44 space-y-2">
        <Bar label="Cadence" value={cadence} color="#38bdf8" />
        <Bar label="Stability" value={stability} color={stability < 35 ? "#ef4444" : "#22c55e"} />
      </div>

      {/* gear ladder, tiny indicator bottom center */}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1">
        {GEAR_RATIOS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-5 rounded-full ${i === gear ? "bg-orange-400" : "bg-white/20"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-black/50 px-3 py-2 backdrop-blur">
      <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-300">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function Radar({
  upcoming,
}: {
  upcoming: { id: string; type: string; lateral: number; distance: number; hard: boolean }[];
}) {
  const span = CORRIDOR_HALF_WIDTH + 3;
  return (
    <div className="relative mx-auto h-14 w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur">
      <div className="absolute left-1/2 top-0 h-full w-px bg-white/25" />
      <div
        className="absolute top-0 h-full bg-emerald-400/10"
        style={{
          left: `calc(50% - ${(CORRIDOR_HALF_WIDTH / span) * 50}%)`,
          width: `${(CORRIDOR_HALF_WIDTH / span) * 100}%`,
        }}
      />
      {upcoming.map((o) => {
        const leftPct = 50 + (o.lateral / span) * 50;
        const opacity = Math.max(0.25, 1 - o.distance / 45);
        const size = Math.max(0.55, 1 - o.distance / 55);
        return (
          <div
            key={o.id}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl"
            style={{
              left: `${Math.max(2, Math.min(98, leftPct))}%`,
              opacity,
              transform: `translate(-50%, -50%) scale(${size})`,
              filter: o.hard ? "drop-shadow(0 0 4px rgba(239,68,68,0.9))" : undefined,
            }}
          >
            {OBSTACLE_ICON[o.type] ?? "❓"}
          </div>
        );
      })}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest text-white/40">
        you
      </div>
    </div>
  );
}
