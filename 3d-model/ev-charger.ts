import * as THREE from "three";

/**
 * Creates a 3D EV charging station model.
 * Built in Z-up orientation for Mapbox custom layer integration.
 * Scale: 1 unit ≈ 1 meter. Designed at ~30m tall; apply group scaling for map visibility.
 *
 * @param beaconColor - Hex color for the status beacon (green/yellow/red based on availability)
 */
export function createEVChargerModel(beaconColor: number = 0x22c55e): THREE.Group {
  const group = new THREE.Group();

  const phong = (
    color: number,
    emissive?: number,
    emissiveIntensity = 0.5,
    opts?: { opacity?: number }
  ) =>
    new THREE.MeshPhongMaterial({
      color,
      flatShading: true,
      ...(emissive !== undefined && { emissive, emissiveIntensity }),
      ...(opts?.opacity !== undefined && { transparent: true, opacity: opts.opacity }),
    });

  // ── Base platform (octagonal disc) ──
  const baseGeo = new THREE.CylinderGeometry(3.5, 4, 1, 8);
  baseGeo.rotateX(Math.PI / 2); // align cylinder to Z-up
  const base = new THREE.Mesh(baseGeo, phong(0x1e293b));
  base.position.set(0, 0, 0.5);
  group.add(base);

  // ── Main pillar body ──
  const pillarGeo = new THREE.BoxGeometry(2.2, 1.4, 20);
  const pillar = new THREE.Mesh(pillarGeo, phong(0x334155));
  pillar.position.set(0, 0, 11.5);
  group.add(pillar);

  // ── Front screen (glowing teal) ──
  const screenGeo = new THREE.BoxGeometry(1.6, 0.15, 5);
  const screen = new THREE.Mesh(screenGeo, phong(0x00d4aa, 0x00d4aa, 0.8));
  screen.position.set(0, -0.78, 16);
  group.add(screen);

  // ── Accent stripe ──
  const stripeGeo = new THREE.BoxGeometry(1.8, 0.12, 0.6);
  const stripe = new THREE.Mesh(stripeGeo, phong(0x3b82f6, 0x3b82f6, 0.4));
  stripe.position.set(0, -0.78, 12);
  group.add(stripe);

  // ── Top cap section ──
  const capGeo = new THREE.CylinderGeometry(1.3, 1.6, 4, 8);
  capGeo.rotateX(Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, phong(0x3b82f6, 0x3b82f6, 0.35));
  cap.position.set(0, 0, 23.5);
  group.add(cap);

  // ── Glowing energy ring ──
  const ringGeo = new THREE.TorusGeometry(2.2, 0.3, 8, 24);
  const ring = new THREE.Mesh(
    ringGeo,
    phong(0x3b82f6, 0x3b82f6, 1.6, { opacity: 0.75 })
  );
  ring.position.set(0, 0, 22);
  ring.userData.animate = true; // flagged for rotation animation
  group.add(ring);

  // ── Status beacon (top light) ──
  const beaconGeo = new THREE.SphereGeometry(0.9, 16, 16);
  const beacon = new THREE.Mesh(beaconGeo, phong(beaconColor, beaconColor, 2.5));
  beacon.position.set(0, 0, 26.5);
  group.add(beacon);

  // ── Charging cable arm ──
  const armGeo = new THREE.BoxGeometry(4, 0.45, 0.45);
  const arm = new THREE.Mesh(armGeo, phong(0x475569));
  arm.position.set(2.8, 0, 9);
  group.add(arm);

  // ── Connector head ──
  const connGeo = new THREE.CylinderGeometry(0.45, 0.35, 1.2, 8);
  connGeo.rotateX(Math.PI / 2);
  const conn = new THREE.Mesh(connGeo, phong(0x1e40af, 0x1e40af, 0.4));
  conn.position.set(5, 0, 9);
  group.add(conn);

  return group;
}
