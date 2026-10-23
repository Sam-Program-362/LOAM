import { useGameStore } from "../store";
import { startNewRun } from "../player/GameLoop";

export default function MenuScreen() {
  const bestDistance = useGameStore((s) => s.bestDistance);
  const start = () => {
    startNewRun();
    useGameStore.getState().startRun();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-sky-900/70 via-emerald-950/70 to-black/80 backdrop-blur-[2px]">
      <div className="mx-4 w-full max-w-xl rounded-2xl border border-white/10 bg-black/50 p-8 text-center shadow-2xl">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.4em] text-emerald-400">First-Person</p>
        <h1 className="mb-2 text-4xl font-black tracking-tight text-white drop-shadow sm:text-5xl">
          RIDGELINE <span className="text-orange-500">DOWNHILL</span>
        </h1>
        <p className="mx-auto mb-6 max-w-md text-sm text-slate-300">
          Drop into an endless, procedurally generated mountain trail. Pedal, shift gears, brake and bunny-hop your
          way through forests, plains and rock gardens. One good crash ends the run - how far can you ride?
        </p>

        {bestDistance > 0 && (
          <div className="mb-6 inline-block rounded-full bg-emerald-500/15 px-4 py-1 text-sm font-semibold text-emerald-300">
            🏆 Best run: {Math.round(bestDistance)} m
          </div>
        )}

        <button
          onClick={start}
          className="mb-6 w-full rounded-xl bg-orange-500 py-3.5 text-lg font-bold text-white shadow-lg shadow-orange-900/40 transition hover:bg-orange-400 active:scale-[0.98]"
        >
          Start Ride ▶
        </button>

        <div className="grid grid-cols-2 gap-3 text-left text-xs text-slate-300 sm:grid-cols-3">
          <Ctrl k="W / ↑" d="Pedal" />
          <Ctrl k="S / ↓" d="Brake" />
          <Ctrl k="A D / ◀ ▶" d="Steer" />
          <Ctrl k="Space" d="Jump" />
          <Ctrl k="E / ]" d="Gear up" />
          <Ctrl k="Q / [" d="Gear down" />
          <Ctrl k="P / Esc" d="Pause" />
          <Ctrl k="🎮" d="Touch controls on mobile" />
        </div>
      </div>
    </div>
  );
}

function Ctrl({ k, d }: { k: string; d: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
      <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-white">{k}</span>
      <span>{d}</span>
    </div>
  );
}
