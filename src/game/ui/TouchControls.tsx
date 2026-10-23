import type { ReactNode } from "react";
import type { useInput } from "../player/useInput";

interface Props {
  input: ReturnType<typeof useInput>;
}

function TouchBtn({
  children,
  className,
  onDown,
  onUp,
}: {
  children: ReactNode;
  className?: string;
  onDown: () => void;
  onUp?: () => void;
}) {
  return (
    <button
      className={`pointer-events-auto flex select-none items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-bold text-white backdrop-blur active:bg-white/30 ${className ?? ""}`}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onDown();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onUp?.();
      }}
      onPointerLeave={() => onUp?.()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

export default function TouchControls({ input }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-between p-4 sm:hidden">
      <div className="flex gap-3">
        <TouchBtn
          className="h-16 w-16"
          onDown={() => input.setTouch("steerLeft", true)}
          onUp={() => input.setTouch("steerLeft", false)}
        >
          ◀
        </TouchBtn>
        <TouchBtn
          className="h-16 w-16"
          onDown={() => input.setTouch("steerRight", true)}
          onUp={() => input.setTouch("steerRight", false)}
        >
          ▶
        </TouchBtn>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
          <TouchBtn className="h-11 w-11 text-sm" onDown={() => input.touchGear(-1)}>
            ⬇︎G
          </TouchBtn>
          <TouchBtn className="h-11 w-11 text-sm" onDown={() => input.touchGear(1)}>
            ⬆︎G
          </TouchBtn>
        </div>
        <TouchBtn className="h-16 w-16" onDown={() => input.touchJump()}>
          ⤒
        </TouchBtn>
      </div>

      <div className="flex gap-3">
        <TouchBtn
          className="h-16 w-16 bg-red-500/30"
          onDown={() => input.setTouch("brake", true)}
          onUp={() => input.setTouch("brake", false)}
        >
          ✋
        </TouchBtn>
        <TouchBtn
          className="h-16 w-16 bg-emerald-500/30"
          onDown={() => input.setTouch("pedal", true)}
          onUp={() => input.setTouch("pedal", false)}
        >
          🚴
        </TouchBtn>
      </div>
    </div>
  );
}
