"use client";

import { useRef, useEffect, useState, Suspense, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ChevronDown } from "lucide-react";

/* ─────────── Animated Car that drives away based on scroll ─────────── */
function AnimatedCar({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const { scene } = useGLTF("/models/car_mg4.glb");
  const cloned = useMemo(() => scene.clone(), [scene]);
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!group.current) return;
    const t = scrollProgress.current; // 0 → 1

    // Car drives to the right and slightly forward
    group.current.position.x = -0.5 + t * 12;
    group.current.position.z = 0.3 - t * 3;

    // Slight turn as it drives away
    group.current.rotation.y = 0.3 - t * 0.5;

    // Subtle bounce
    group.current.position.y = Math.sin(t * Math.PI * 3) * 0.02 * (1 - t);
  });

  return (
    <group ref={group} position={[-0.5, 0, 0.3]} rotation={[0, 0.3, 0]}>
      <primitive object={cloned} scale={0.9} />
    </group>
  );
}

/* ─────────── Road surface ─────────── */
function Road({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity = 1 - scrollProgress.current * 1.5;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[30, 8]} />
      <meshStandardMaterial color="#1a1a2e" metalness={0.1} roughness={0.9} transparent />
    </mesh>
  );
}

/* ─────────── Road lane markings ─────────── */
function LaneMarkings({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = 1 - scrollProgress.current * 1.5;
    });
  });

  return (
    <group ref={ref}>
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-7 + i * 2, 0.005, 0]}
        >
          <planeGeometry args={[0.8, 0.08]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.3}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────── Headlight beams ─────────── */
function Headlights({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    const t = scrollProgress.current;
    ref.current.position.x = -0.5 + t * 12;
    ref.current.position.z = 0.3 - t * 3;
    ref.current.rotation.y = 0.3 - t * 0.5;

    ref.current.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = (0.3 - t * 0.5) * Math.max(0, 1);
    });
  });

  return (
    <group ref={ref}>
      <spotLight
        position={[-1.2, 0.4, 0.35]}
        angle={0.4}
        penumbra={0.6}
        intensity={2}
        color="#fef3c7"
        distance={8}
        target-position={[-4, 0, 0.35]}
      />
      <spotLight
        position={[-1.2, 0.4, -0.35]}
        angle={0.4}
        penumbra={0.6}
        intensity={2}
        color="#fef3c7"
        distance={8}
        target-position={[-4, 0, -0.35]}
      />
    </group>
  );
}

/* ─────────── Camera animation ─────────── */
function CameraRig({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const { camera } = useThree();

  useFrame(() => {
    const t = scrollProgress.current;

    // Camera pulls back and up as car drives away
    camera.position.x = 2 + t * 2;
    camera.position.y = 1.8 + t * 3;
    camera.position.z = 4 - t * 1;

    camera.lookAt(t * 4, 0.5, 0);
  });

  return null;
}

/* ─────────── Scene wrapper ─────────── */
function IntroScene({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 3]} intensity={1.5} castShadow />
      <directionalLight position={[-3, 4, -3]} intensity={0.2} color="#22c55e" />

      <AnimatedCar scrollProgress={scrollProgress} />
      <Road scrollProgress={scrollProgress} />
      <LaneMarkings scrollProgress={scrollProgress} />
      <Headlights scrollProgress={scrollProgress} />
      <CameraRig scrollProgress={scrollProgress} />

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={6}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={["#0f172a", 8, 25]} />

      <Environment preset="night" />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   Main Exported Component
   ══════════════════════════════════════════════════════ */
interface DashboardCarIntroProps {
  onIntroComplete?: () => void;
}

export function DashboardCarIntro({ onIntroComplete }: DashboardCarIntroProps) {
  const scrollProgress = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    const progress = Math.min(scrollTop / scrollHeight, 1);
    scrollProgress.current = progress;

    if (progress > 0.05) setShowHint(false);

    if (progress >= 0.95 && !introComplete) {
      setIntroComplete(true);
      onIntroComplete?.();
    }
  }, [introComplete, onIntroComplete]);

  // Allow skip on click
  const handleSkip = useCallback(() => {
    setIntroComplete(true);
    onIntroComplete?.();
  }, [onIntroComplete]);

  if (introComplete) return null;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ scrollBehavior: "smooth" }}
    >
      {/* Sticky canvas fills viewport */}
      <div className="sticky top-0 h-screen w-full">
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          style={{ background: "#0f172a" }}
        >
          <Suspense fallback={null}>
            <IntroScene scrollProgress={scrollProgress} />
          </Suspense>
        </Canvas>

        {/* Gradient overlay that fades in */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/80"
          style={{ opacity: scrollProgress.current }}
        />

        {/* Text overlay */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-24 text-center">
          {/* Scroll hint */}
          <div
            className={`flex flex-col items-center gap-2 transition-opacity duration-700 ${
              showHint ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="text-sm font-medium text-white/70">Scroll to enter your dashboard</p>
            <ChevronDown className="h-5 w-5 animate-bounce text-white/50" />
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute right-6 top-6 z-10 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
        >
          Skip Intro
        </button>

        {/* Logo / branding */}
        <div className="absolute left-6 top-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">Urja Station</span>
        </div>
      </div>

      {/* Scroll spacer — determines how much scrolling triggers the animation */}
      <div className="h-[200vh]" />
    </div>
  );
}

useGLTF.preload("/models/car_mg4.glb");
