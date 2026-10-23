import { useGameStore } from "../store";
import { startNewRun } from "../player/GameLoop";

export default function PauseScreen() {
  const resume = () => useGameStore.getState().resume();
  const menu = () => useGameStore.getState().setPhase("menu");
  const restart = () => {
    startNewRun();
    useGameStore.getState().startRun();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 p-8 text-center shadow-2xl">
        <h2 className="mb-6 text-3xl font-black text-white">PAUSED</h2>
        <button
          onClick={resume}
          className="mb-3 w-full rounded-xl bg-emerald-500 py-3 text-lg font-bold text-white transition hover:bg-emerald-400 active:scale-[0.98]"
        >
          Resume ▶
        </button>
        <button
          onClick={restart}
          className="mb-3 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
        >
          Restart Run
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
