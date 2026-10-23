import { useEffect, useRef } from "react";

export interface InputState {
  steer: number; // -1..1
  pedal: boolean;
  brake: boolean;
  jumpPressed: boolean; // edge-triggered, consumed by physics loop
  gearUpPressed: boolean;
  gearDownPressed: boolean;
  pausePressed: boolean;
}

export function createInputState(): InputState {
  return {
    steer: 0,
    pedal: false,
    brake: false,
    jumpPressed: false,
    gearUpPressed: false,
    gearDownPressed: false,
    pausePressed: false,
  };
}

/**
 * Keyboard + touch input hook. Returns a mutable ref that the game loop reads
 * every frame - avoids re-rendering React on every key press.
 */
export function useInput() {
  const state = useRef<InputState>(createInputState());
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Space") {
        state.current.jumpPressed = true;
        e.preventDefault();
      }
      if (e.code === "KeyE" || e.code === "BracketRight") state.current.gearUpPressed = true;
      if (e.code === "KeyQ" || e.code === "BracketLeft") state.current.gearDownPressed = true;
      if (e.code === "KeyP" || e.code === "Escape") state.current.pausePressed = true;
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
        ].includes(e.code)
      ) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Called every frame by the physics loop to compute continuous axes & consume edges.
  function poll(): InputState {
    const k = keys.current;
    let steer = 0;
    if (k["ArrowLeft"] || k["KeyA"]) steer -= 1;
    if (k["ArrowRight"] || k["KeyD"]) steer += 1;
    state.current.steer = steer;
    state.current.pedal = !!(k["ArrowUp"] || k["KeyW"]);
    state.current.brake = !!(k["ArrowDown"] || k["KeyS"]);
    return state.current;
  }

  function consumeJump() {
    const v = state.current.jumpPressed;
    state.current.jumpPressed = false;
    return v;
  }
  function consumeGearUp() {
    const v = state.current.gearUpPressed;
    state.current.gearUpPressed = false;
    return v;
  }
  function consumeGearDown() {
    const v = state.current.gearDownPressed;
    state.current.gearDownPressed = false;
    return v;
  }
  function consumePause() {
    const v = state.current.pausePressed;
    state.current.pausePressed = false;
    return v;
  }

  // Touch control helpers for mobile on-screen buttons.
  function setTouch(key: "pedal" | "brake" | "steerLeft" | "steerRight", active: boolean) {
    if (key === "pedal") keys.current["KeyW"] = active;
    if (key === "brake") keys.current["KeyS"] = active;
    if (key === "steerLeft") keys.current["ArrowLeft"] = active;
    if (key === "steerRight") keys.current["ArrowRight"] = active;
  }
  function touchJump() {
    state.current.jumpPressed = true;
  }
  function touchGear(dir: 1 | -1) {
    if (dir > 0) state.current.gearUpPressed = true;
    else state.current.gearDownPressed = true;
  }

  return { poll, consumeJump, consumeGearUp, consumeGearDown, consumePause, setTouch, touchJump, touchGear };
}
