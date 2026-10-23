import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { world } from "../world/worldState";
import { EYE_HEIGHT, MAX_SPEED_CAP } from "../constants";

export default function BikeRig() {
  const rig = useRef<THREE.Group>(null);
  const cam = useRef<THREE.PerspectiveCamera>(null);
  const handlebar = useRef<THREE.Group>(null);
  const cranks = useRef<THREE.Group>(null);
  const frontWheel = useRef<THREE.Group>(null);
  const shakeOffset = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    if (!rig.current || !cam.current) return;

    const bobY = Math.sin(world.bobPhase * 2.2) * 0.028 + (world.airborne ? 0.12 : 0);
    const bobX = Math.sin(world.bobPhase * 1.1) * 0.012;

    const shakeMag = world.shake * 0.07;
    shakeOffset.current.set(
      (Math.random() - 0.5) * shakeMag,
      (Math.random() - 0.5) * shakeMag,
      (Math.random() - 0.5) * shakeMag
    );

    rig.current.position.set(
      world.playerX + bobX + shakeOffset.current.x,
      world.playerY + EYE_HEIGHT + bobY + shakeOffset.current.y,
      -world.distance + shakeOffset.current.z
    );

    rig.current.rotation.set(
      world.pitchVisual * 0.5 + (world.airborne ? -0.08 : 0),
      -world.steerVisual * 0.09,
      -world.leanVisual * 0.5
    );

    const targetFov = 68 + Math.min(1, world.speed / MAX_SPEED_CAP) * 14 + (world.airborne ? 4 : 0);
    cam.current.fov += (targetFov - cam.current.fov) * Math.min(1, dt * 3);
    cam.current.updateProjectionMatrix();

    if (handlebar.current) {
      handlebar.current.rotation.y = -world.steerVisual * 0.5;
      handlebar.current.rotation.z = world.leanVisual * 0.18;
    }
    if (cranks.current) {
      cranks.current.rotation.x = world.bobPhase * 3.4;
    }
    if (frontWheel.current) {
      frontWheel.current.position.y = -0.92 + (world.airborne ? 0.07 : Math.sin(world.bobPhase * 2.2) * 0.012);
    }
  });

  return (
    <group ref={rig}>
      <PerspectiveCamera ref={cam} makeDefault fov={70} near={0.05} far={400} />

      {/* Handlebar + grips + hands */}
      <group ref={handlebar} position={[0, -0.52, -0.62]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.62, 10]} />
          <meshStandardMaterial color="#1b1b1e" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* grips */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.3, 0.01, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.024, 0.024, 0.13, 10]} />
              <meshStandardMaterial color="#111214" roughness={0.9} />
            </mesh>
            {/* hand / glove */}
            <mesh position={[0, -0.04, 0.05]} scale={[1, 0.85, 1.2]}>
              <sphereGeometry args={[0.065, 10, 8]} />
              <meshStandardMaterial color="#1c1c20" roughness={0.8} />
            </mesh>
            {/* brake lever */}
            <mesh position={[0.02, -0.02, 0.1]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.012, 0.012, 0.14]} />
              <meshStandardMaterial color="#2a2a2e" metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
        ))}
        {/* stem */}
        <mesh position={[0, -0.09, 0.05]}>
          <boxGeometry args={[0.05, 0.08, 0.14]} />
          <meshStandardMaterial color="#d9601f" roughness={0.4} metalness={0.4} />
        </mesh>
      </group>

      {/* front fork + wheel glimpse */}
      <group ref={frontWheel} position={[0, -0.92, -1.15]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.37, 0.045, 8, 20]} />
          <meshStandardMaterial color="#111214" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.42, 0.02]}>
          <boxGeometry args={[0.07, 0.55, 0.07]} />
          <meshStandardMaterial color="#d9601f" roughness={0.35} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.42, -0.02]}>
          <boxGeometry args={[0.07, 0.55, 0.07]} />
          <meshStandardMaterial color="#d9601f" roughness={0.35} metalness={0.5} />
        </mesh>
      </group>

      {/* pedals / cranks glimpsed at the bottom */}
      <group ref={cranks} position={[0, -1.18, -0.3]}>
        <mesh position={[0, 0, 0.22]}>
          <boxGeometry args={[0.1, 0.06, 0.03]} />
          <meshStandardMaterial color="#19191c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -0.22]}>
          <boxGeometry args={[0.1, 0.06, 0.03]} />
          <meshStandardMaterial color="#19191c" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}
