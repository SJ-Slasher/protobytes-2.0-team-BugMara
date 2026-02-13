"use client";

import { useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  useGLTF,
  ContactShadows,
  Float,
} from "@react-three/drei";
import * as THREE from "three";

/* ─── GLB Car Model ─── */
function CarModel({
  position = [0, 0, 0] as [number, number, number],
  scale = 2,
  rotation = [0, 0, 0] as [number, number, number],
}) {
  const { scene } = useGLTF("/models/car_mg4.glb");
  const cloned = useMemo(() => scene.clone(), [scene]);

  return (
    <primitive
      object={cloned}
      position={position}
      scale={scale}
      rotation={rotation}
    />
  );
}

/* ─── GLB Charging Station Model ─── */
function StationModel({
  position = [0, 0, 0] as [number, number, number],
  scale = 1,
  rotation = [0, 0, 0] as [number, number, number],
}) {
  const { scene } = useGLTF("/models/electric_charging_station.glb");
  const cloned = useMemo(() => scene.clone(), [scene]);

  return (
    <primitive
      object={cloned}
      position={position}
      scale={scale}
      rotation={rotation}
    />
  );
}

/* ─── Floating Energy Particles ─── */
function EnergyParticles({ count = 40 }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 6;
      arr[i * 3 + 1] = Math.random() * 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
      const posArr = ref.current.geometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArr[i * 3 + 1] +=
          Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.001;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#22c55e"
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

/* ─── Glowing Ground Ring ─── */
function GroundRing() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime) * 0.05;
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <ringGeometry args={[1.5, 2.2, 64]} />
      <meshStandardMaterial
        color="#16a34a"
        emissive="#16a34a"
        emissiveIntensity={0.5}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─── Main Scene Export ─── */
interface ChargingSceneProps {
  className?: string;
  variant?: "full" | "car-only" | "station-only" | "compact";
  autoRotate?: boolean;
}

export function ChargingScene({
  className = "h-[400px] w-full",
  variant = "full",
  autoRotate = true,
}: ChargingSceneProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [4, 2.5, 4], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight
            position={[-3, 4, -3]}
            intensity={0.3}
            color="#22c55e"
          />
          <pointLight position={[0, 3, 0]} intensity={0.4} color="#16a34a" />

          {/* Models */}
          {(variant === "full" || variant === "car-only") && (
            <CarModel position={[-0.8, 0, 0.3]} scale={0.8} rotation={[0, 0.3, 0]} />
          )}

          {(variant === "full" || variant === "station-only") && (
            <Float speed={1.2} rotationIntensity={0.02} floatIntensity={0.08}>
              <StationModel position={[1.2, 0, -0.3]} scale={0.8} rotation={[0, -0.5, 0]} />
            </Float>
          )}

          {variant === "compact" && (
            <>
              <CarModel position={[-0.5, 0, 0.2]} scale={0.6} rotation={[0, 0.3, 0]} />
              <StationModel position={[0.8, 0, -0.2]} scale={0.6} rotation={[0, -0.5, 0]} />
            </>
          )}

          {/* Environment & Effects */}
          <GroundRing />
          <EnergyParticles count={variant === "compact" ? 20 : 40} />
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.3}
            scale={8}
            blur={2}
            far={4}
          />

          <Environment preset="city" />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
            maxPolarAngle={Math.PI / 2.2}
            minPolarAngle={Math.PI / 6}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

/* ─── Mini 3D Badge for Cards ─── */
export function ChargingBadge3D({
  className = "h-16 w-16",
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [3, 2, 3], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 3, 3]} intensity={0.8} />
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.3}>
            <StationModel position={[0, 0, 0]} scale={0.4} />
          </Float>
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}

/* ─── Preload models ─── */
useGLTF.preload("/models/car_mg4.glb");
useGLTF.preload("/models/electric_charging_station.glb");
