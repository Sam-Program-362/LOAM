import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import Environment from "./world/Environment";
import Terrain from "./world/Terrain";
import Scenery from "./world/Scenery";
import Obstacles from "./world/Obstacles";
import BikeRig from "./player/BikeRig";
import GameLoop from "./player/GameLoop";
import HUD from "./ui/HUD";
import { useInput } from "./player/useInput";

export default function Game() {
  const input = useInput();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Canvas shadows={false} dpr={[1, 1.6]} gl={{ antialias: true, powerPreference: "high-performance" }}>
        <Suspense fallback={null}>
          <Environment />
          <Terrain />
          <Scenery />
          <Obstacles />
          <BikeRig />
          <GameLoop input={input} />
        </Suspense>
      </Canvas>
      <HUD input={input} />
    </div>
  );
}
