import { useGameStore } from "../store";
import { startNewRun } from "../player/GameLoop";

export default function CrashScreen() {
  const { distance, crashReason, bestDistance } = useGameStore((s) => ({
    distance: s.distance,
    crashReason: s.crashReason,
    bestDistance: s.bestDistance,
  }));
  const isNewBest = Math.round(distance) >= Math.round(bestDistance) && distance > 0;

  const retry = () => {
    startNewRun();
    useGameStore.getState().startRun();
  };
  const menu = () => useGameStore.getState().setPhase("menu");

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-red-950/80 via-black/80 to-black/90 backdrop-blur-[2px]">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-red-500/20 bg-black/60 p-8 text-center shadow-2xl">
        <div className="mb-3 text-5xl">💥</div>
        <h2 className="mb-1 text-3xl font-black text-white">WIPEOUT!</h2>
        <p className="mb-5 text-sm text-red-300">{crashReason || "You crashed."}</p>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Distance</div>
            <div className="text-2xl font-black text-white">{Math.round(distance)} m</div>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Best</div>
            <div className="text-2xl font-black text-emerald-400">{Math.round(bestDistance)} m</div>
          </div>
        </div>
        {isNewBest && <div className="mb-5 text-sm font-bold text-amber-400">🎉 New personal best!</div>}

        <button
          onClick={retry}
          className="mb-3 w-full rounded-xl bg-orange-500 py-3 text-lg font-bold text-white shadow-lg shadow-orange-900/40 transition hover:bg-orange-400 active:scale-[0.98]"
        >
          Ride Again ↻
        </button>
        <button
          onClick={menu}
          className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/20"
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
