import { useGameStore } from "../store";
import MenuScreen from "./MenuScreen";
import PlayHUD from "./PlayHUD";
import PauseScreen from "./PauseScreen";
import CrashScreen from "./CrashScreen";
import TouchControls from "./TouchControls";
import type { useInput } from "../player/useInput";

export default function HUD({ input }: { input: ReturnType<typeof useInput> }) {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {(phase === "playing" || phase === "paused") && (
        <>
          <PlayHUD />
          <TouchControls input={input} />
          <button
            onClick={() => useGameStore.getState().pause()}
            className="pointer-events-auto absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-lg text-white backdrop-blur hover:bg-black/60"
            aria-label="Pause"
          >
            ❚❚
          </button>
        </>
      )}
      {phase === "menu" && <MenuScreen />}
      {phase === "paused" && <PauseScreen />}
      {phase === "crashed" && <CrashScreen />}
    </div>
  );
}
