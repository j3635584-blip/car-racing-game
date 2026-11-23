import * as THREE from 'three';
import { ROAD_WIDTH } from './constants';
import type { CarPreset } from './types';

export interface PlayerCarRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  frontSteerPivots: THREE.Object3D[];
  tailLightMat: THREE.MeshStandardMaterial;
  nitroFlames: THREE.Mesh[];
  headlights: THREE.SpotLight[];
  paintMaterial: THREE.MeshPhysicalMaterial;
}

export type TrafficKind = 'sedan' | 'coupe' | 'truck';

function createWheel(radius: number, width: number, rimColor: number): THREE.Group {
  const wheel = new THREE.Group();

  // Rubber tire
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    roughness: 0.85,
    metalness: 0.08,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  wheel.add(tire);

  // Metallic alloy rim dish
  const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.25,
    metalness: 0.9,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheel.add(rim);

  // Brake disc center cap
  const hubGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width + 0.04, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.35,
    metalness: 0.65,
  });
  const hub = new THREE.Mesh(hubGeo, hubMat);
  wheel.add(hub);

  return wheel;
}

export function buildPlayerCar(
  preset: CarPreset,
  contactShadowMap: THREE.Texture,
  isSoftwareGl: boolean
): PlayerCarRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // 1. Contact shadow grounded at y = 0.02
  const shadowGeo = new THREE.PlaneGeometry(2.8, 5.4);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.62,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.position.y = 0.02;
  root.add(shadowPlane);

  // Materials
  const paintMaterial = new THREE.MeshPhysicalMaterial({
    color: preset.paintHex,
    metalness: 0.72,
    roughness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x181b20,
    roughness: 0.55,
    metalness: 0.3,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.1,
    roughness: 0.06,
    clearcoat: 1.0,
    transmission: isSoftwareGl ? 0 : 0.45,
    transparent: true,
    opacity: isSoftwareGl ? 0.85 : 0.94,
    ior: 1.5,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.16,
    metalness: 0.95,
  });

  // 2. Sculpted Extruded Chassis Side Profile (primary silhouette)
  // Car faces -Z forward! Profile in XY plane then rotated so X->Z, Y->Y, extrude along X
  const profile = new THREE.Shape();
  profile.moveTo(-2.15, 0.26); // front nose bottom
  profile.lineTo(-2.18, 0.48); // front bumper
  profile.lineTo(-1.35, 0.72); // hood slope
  profile.lineTo(-0.55, 1.18); // windshield
  profile.lineTo(0.65, 1.2); // roof
  profile.lineTo(1.72, 0.84); // fastback rear
  profile.lineTo(2.18, 0.78); // rear deck
  profile.lineTo(2.15, 0.28); // rear diffuser bottom
  profile.lineTo(-2.15, 0.26);

  const chassisGeo = new THREE.ExtrudeGeometry(profile, {
    steps: 1,
    depth: 1.84,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  chassisGeo.center();
  // Rotate so length is along Z (nose at -Z)
  chassisGeo.rotateY(Math.PI / 2);
  const chassisMesh = new THREE.Mesh(chassisGeo, paintMaterial);
  chassisMesh.position.set(0, 0.66, 0);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  bodyGroup.add(chassisMesh);

  // 3. Tinted Glass Cabin Canopy (secondary read)
  const cabinProfile = new THREE.Shape();
  cabinProfile.moveTo(-1.05, 0.0);
  cabinProfile.lineTo(-0.48, 0.43);
  cabinProfile.lineTo(0.6, 0.44);
  cabinProfile.lineTo(1.38, 0.06);
  cabinProfile.lineTo(-1.05, 0.0);

  const cabinGeo = new THREE.ExtrudeGeometry(cabinProfile, {
    steps: 1,
    depth: 1.46,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  cabinGeo.center();
  cabinGeo.rotateY(Math.PI / 2);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
  cabinMesh.position.set(0, 1.0, 0.12);
  bodyGroup.add(cabinMesh);

  // 4. Front Carbon Splitter & Side Skirts
  const splitterGeo = new THREE.BoxGeometry(2.02, 0.07, 0.55);
  const splitter = new THREE.Mesh(splitterGeo, carbonMat);
  splitter.position.set(0, 0.24, -2.02);
  bodyGroup.add(splitter);

  const diffuserGeo = new THREE.BoxGeometry(1.94, 0.14, 0.35);
  const diffuser = new THREE.Mesh(diffuserGeo, carbonMat);
  diffuser.position.set(0, 0.28, 2.08);
  bodyGroup.add(diffuser);

  // 5. Rear GT Wing Spoiler & Twin Pylons
  const wingBladeGeo = new THREE.BoxGeometry(2.04, 0.06, 0.34);
  const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMat);
  wingBlade.position.set(0, 1.24, 1.98);
  wingBlade.rotation.x = 0.08;
  wingBlade.castShadow = true;
  bodyGroup.add(wingBlade);

  const pylonGeo = new THREE.BoxGeometry(0.06, 0.28, 0.22);
  [-0.55, 0.55].forEach((px) => {
    const pylon = new THREE.Mesh(pylonGeo, carbonMat);
    pylon.position.set(px, 1.08, 1.95);
    bodyGroup.add(pylon);
  });

  // 6. Side Mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.22, 0.1, 0.14);
  [-1.02, 1.02].forEach((mx) => {
    const mirror = new THREE.Mesh(mirrorGeo, paintMaterial);
    mirror.position.set(mx, 0.92, -0.52);
    bodyGroup.add(mirror);
  });

  // 7. LED Headlights & Crimson Taillights
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });
  const headGeo = new THREE.BoxGeometry(0.38, 0.1, 0.08);
  const headlights: THREE.SpotLight[] = [];

  [-0.68, 0.68].forEach((hx) => {
    const hl = new THREE.Mesh(headGeo, headMat);
    hl.position.set(hx, 0.56, -2.21);
    bodyGroup.add(hl);

    // Night-mode headlight SpotLights (toggled via intensity)
    const spot = new THREE.SpotLight(0xe0f2fe, 0, 58, Math.PI / 5.5, 0.45, 1.3);
    spot.position.set(hx, 0.6, -2.25);
    spot.target.position.set(hx * 0.6, 0.1, -24);
    bodyGroup.add(spot);
    bodyGroup.add(spot.target);
    headlights.push(spot);
  });

  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xef4444,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });
  const tailGeo = new THREE.BoxGeometry(0.46, 0.11, 0.07);
  [-0.65, 0.65].forEach((tx) => {
    const tl = new THREE.Mesh(tailGeo, tailLightMat);
    tl.position.set(tx, 0.68, 2.22);
    bodyGroup.add(tl);
  });

  // 8. Dual Chrome Exhausts & Nitro Boost Flame Cones
  const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.22, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const flameGeo = new THREE.ConeGeometry(0.11, 0.85, 10);
  flameGeo.rotateX(Math.PI / 2);
  flameGeo.translate(0, 0, 0.42);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nitroFlames: THREE.Mesh[] = [];

  [-0.45, 0.45].forEach((ex) => {
    const pipe = new THREE.Mesh(exhaustGeo, chromeMat);
    pipe.position.set(ex, 0.34, 2.24);
    bodyGroup.add(pipe);

    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(ex, 0.34, 2.28);
    flame.visible = false;
    bodyGroup.add(flame);
    nitroFlames.push(flame);
  });

  // 9. Four Wheels (Front pair mounted in steering pivots)
  const wheels: THREE.Object3D[] = [];
  const frontSteerPivots: THREE.Object3D[] = [];
  const wheelPositions: Array<{ x: number; z: number; front: boolean }> = [
    { x: -0.96, z: -1.36, front: true },
    { x: 0.96, z: -1.36, front: true },
    { x: -0.98, z: 1.32, front: false },
    { x: 0.98, z: 1.32, front: false },
  ];

  for (const wp of wheelPositions) {
    const wheelMesh = createWheel(0.36, 0.28, 0xd4d4d8);
    if (wp.front) {
      const pivot = new THREE.Group();
      pivot.position.set(wp.x, 0.36, wp.z);
      pivot.add(wheelMesh);
      root.add(pivot);
      frontSteerPivots.push(pivot);
      wheels.push(wheelMesh);
    } else {
      wheelMesh.position.set(wp.x, 0.36, wp.z);
      root.add(wheelMesh);
      wheels.push(wheelMesh);
    }
  }

  return {
    root,
    bodyGroup,
    wheels,
    frontSteerPivots,
    tailLightMat,
    nitroFlames,
    headlights,
    paintMaterial,
  };
}

export function buildTrafficVehicle(
  kind: TrafficKind,
  colorHex: number,
  contactShadowMap: THREE.Texture
): THREE.Group {
  const group = new THREE.Group();

  const paintMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: kind === 'truck' ? 0.55 : 0.28,
    metalness: kind === 'truck' ? 0.2 : 0.65,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.7,
    metalness: 0.2,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.85,
  });

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff1e1e,
    emissive: 0xef4444,
    emissiveIntensity: 1.8,
  });

  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef3c7,
    emissiveIntensity: 1.4,
  });

  const length = kind === 'truck' ? 6.4 : kind === 'coupe' ? 4.2 : 4.5;
  const width = kind === 'truck' ? 2.25 : 1.9;

  // Ground contact shadow
  const shadowGeo = new THREE.PlaneGeometry(width * 1.35, length * 1.15);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMesh = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  if (kind === 'truck') {
    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.75, 1.8), paintMat);
    cab.position.set(0, 1.22, -2.0);
    cab.castShadow = true;
    group.add(cab);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 0.1), glassMat);
    windshield.position.set(0, 1.5, -2.91);
    group.add(windshield);

    // Cargo Box
    const cargoMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.65,
      metalness: 0.15,
    });
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.26, 2.35, 4.35), cargoMat);
    cargo.position.set(0, 1.62, 1.05);
    cargo.castShadow = true;
    group.add(cargo);

    // Chassis rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.35, 6.1), darkMat);
    rail.position.set(0, 0.42, 0);
    group.add(rail);
  } else {
    // Sedan or Coupe lower hull
    const hullH = kind === 'coupe' ? 0.54 : 0.62;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(width, hullH, length), paintMat);
    hull.position.set(0, 0.55, 0);
    hull.castShadow = true;
    group.add(hull);

    // Cabin
    const cabinL = kind === 'coupe' ? 1.85 : 2.25;
    const cabinH = kind === 'coupe' ? 0.48 : 0.56;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, cabinH, cabinL), glassMat);
    cabin.position.set(0, 0.55 + hullH / 2 + cabinH / 2 - 0.03, 0.15);
    cabin.castShadow = true;
    group.add(cabin);

    // Roof cap
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 0.08, cabinL * 0.75), paintMat);
    roof.position.set(0, 0.55 + hullH / 2 + cabinH - 0.01, 0.18);
    group.add(roof);

    // Bumpers
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.01, 0.2, length + 0.08), darkMat);
    bumper.position.set(0, 0.34, 0);
    group.add(bumper);
  }

  // Taillights & Headlights
  const tlGeo = new THREE.BoxGeometry(0.36, 0.14, 0.08);
  [-width * 0.34, width * 0.34].forEach((lx) => {
    const tl = new THREE.Mesh(tlGeo, tailMat);
    tl.position.set(lx, 0.68, length / 2 + 0.03);
    group.add(tl);

    const hl = new THREE.Mesh(tlGeo, headMat);
    hl.position.set(lx, 0.62, -length / 2 - 0.03);
    group.add(hl);
  });

  // 4 Wheels
  const wheelZ = kind === 'truck' ? 2.15 : length * 0.32;
  const wheelR = kind === 'truck' ? 0.44 : 0.34;
  [
    [-width * 0.49, -wheelZ],
    [width * 0.49, -wheelZ],
    [-width * 0.49, wheelZ],
    [width * 0.49, wheelZ],
  ].forEach(([wx, wz]) => {
    const w = createWheel(wheelR, 0.25, 0x94a3b8);
    w.position.set(wx, wheelR, wz);
    group.add(w);
  });

  return group;
}

export function buildNitroPickup(contactShadowMap: THREE.Texture): THREE.Group {
  const group = new THREE.Group();

  // Contact shadow
  const sGeo = new THREE.PlaneGeometry(1.5, 1.5);
  sGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    sGeo,
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.42,
    })
  );
  shadow.position.y = 0.03;
  group.add(shadow);

  // Energy Core Capsule
  const coreGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.72, 16);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.4,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 0.95;
  core.rotation.z = Math.PI / 8;
  group.add(core);

  // Metallic Caps
  const capGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.12, 16);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.9,
  });
  const topCap = new THREE.Mesh(capGeo, capMat);
  topCap.position.y = 0.38;
  core.add(topCap);
  const botCap = new THREE.Mesh(capGeo, capMat);
  botCap.position.y = -0.38;
  core.add(botCap);

  // Outer Orbital Ring
  const ringGeo = new THREE.TorusGeometry(0.62, 0.045, 10, 28);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.25,
    metalness: 0.7,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.95;
  ring.name = 'orbitRing';
  group.add(ring);

  return group;
}

export function buildFinishLineArch(): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.38,
    metalness: 0.78,
  });

  // Twin side truss pillars
  const pillarGeo = new THREE.BoxGeometry(0.6, 6.2, 0.6);
  const spanHalf = ROAD_WIDTH / 2 + 1.0;
  [-spanHalf, spanHalf].forEach((px) => {
    const pillar = new THREE.Mesh(pillarGeo, steelMat);
    pillar.position.set(px, 3.1, 0);
    pillar.castShadow = true;
    group.add(pillar);
  });

  // Overhead gantry truss beam
  const beamGeo = new THREE.BoxGeometry(ROAD_WIDTH + 2.6, 1.35, 0.7);
  const beam = new THREE.Mesh(beamGeo, steelMat);
  beam.position.set(0, 5.65, 0);
  beam.castShadow = true;
  group.add(beam);

  // Procedural checkered banner texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const cols = 24;
  const rows = 3;
  const cw = canvas.width / cols;
  const ch = canvas.height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f8fafc' : '#0f172a';
      ctx.fillRect(c * cw, r * ch, cw, ch);
    }
  }
  const checkerTex = new THREE.CanvasTexture(canvas);
  checkerTex.colorSpace = THREE.SRGBColorSpace;
  const bannerMat = new THREE.MeshStandardMaterial({
    map: checkerTex,
    roughness: 0.45,
    metalness: 0.1,
  });

  const bannerGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 1.2, 1.15);
  const frontBanner = new THREE.Mesh(bannerGeo, bannerMat);
  frontBanner.position.set(0, 5.65, 0.37);
  group.add(frontBanner);

  const backBanner = new THREE.Mesh(bannerGeo, bannerMat);
  backBanner.rotation.y = Math.PI;
  backBanner.position.set(0, 5.65, -0.37);
  group.add(backBanner);

  // Road surface checkered finish strip (y = 0.025 above asphalt)
  const stripGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 1.6);
  stripGeo.rotateX(-Math.PI / 2);
  const strip = new THREE.Mesh(stripGeo, bannerMat);
  strip.position.set(0, 0.025, 0);
  group.add(strip);

  // Glowing emerald/amber beacon lamps along top
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 2.2,
  });
  const beaconGeo = new THREE.BoxGeometry(0.75, 0.22, 0.85);
  for (let x = -5; x <= 5; x += 2.5) {
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(x, 6.42, 0);
    group.add(beacon);
  }

  return group;
}

export function buildOilSlickMesh(contactShadowMap: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const sGeo = new THREE.PlaneGeometry(3.6, 4.8);
  sGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    sGeo,
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    })
  );
  shadow.position.y = 0.02;
  group.add(shadow);

  const geo = new THREE.PlaneGeometry(3.0, 4.2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x05070c,
    roughness: 0.04,
    metalness: 0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.025;
  group.add(mesh);
  return group;
}

export function buildSandPatchMesh(contactShadowMap: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const sGeo = new THREE.PlaneGeometry(4.0, 5.2);
  sGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    sGeo,
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );
  shadow.position.y = 0.02;
  group.add(shadow);

  const geo = new THREE.PlaneGeometry(3.4, 4.6);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.92,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.025;
  group.add(mesh);
  return group;
}

