import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  curbMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  sparkMap: THREE.CanvasTexture;
  billboardMaps: THREE.CanvasTexture[];
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Multi-lane Asphalt Road Texture
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 1024;
  roadCanvas.height = 1024;
  const rctx = roadCanvas.getContext('2d')!;

  // Base asphalt dark slate
  rctx.fillStyle = '#1b1f27';
  rctx.fillRect(0, 0, 1024, 1024);

  // Subtle worn tire tracks along the 4 lanes
  const laneOffsets = [138, 384, 640, 886];
  for (const cx of laneOffsets) {
    const grad = rctx.createLinearGradient(cx - 80, 0, cx + 80, 0);
    grad.addColorStop(0, 'rgba(12, 15, 20, 0)');
    grad.addColorStop(0.32, 'rgba(10, 12, 16, 0.42)');
    grad.addColorStop(0.5, 'rgba(18, 21, 28, 0.08)');
    grad.addColorStop(0.68, 'rgba(10, 12, 16, 0.42)');
    grad.addColorStop(1, 'rgba(12, 15, 20, 0)');
    rctx.fillStyle = grad;
    rctx.fillRect(cx - 80, 0, 160, 1024);
  }

  // Fine asphalt grain speckles
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const v = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.08)';
    rctx.fillStyle = v;
    rctx.fillRect(x, y, 2, 2);
  }

  // Outer shoulder solid amber/white edge lines
  rctx.fillStyle = '#f59e0b';
  rctx.fillRect(22, 0, 14, 1024);
  rctx.fillStyle = '#e2e8f0';
  rctx.fillRect(988, 0, 14, 1024);

  // Center double yellow median divider
  rctx.fillStyle = '#f59e0b';
  rctx.fillRect(500, 0, 8, 1024);
  rctx.fillRect(516, 0, 8, 1024);

  // Dashed white lane dividers at 1/4 and 3/4 widths
  rctx.fillStyle = '#e2e8f0';
  for (let y = 24; y < 1024; y += 128) {
    rctx.fillRect(256 - 5, y, 10, 68);
    rctx.fillRect(768 - 5, y, 10, 68);
  }

  const asphaltMap = new THREE.CanvasTexture(roadCanvas);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = THREE.ClampToEdgeWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(1, 3);
  asphaltMap.anisotropy = maxAnisotropy;

  // 2. FIA Red & White Rumble Curb Texture
  const curbCanvas = document.createElement('canvas');
  curbCanvas.width = 64;
  curbCanvas.height = 512;
  const cctx = curbCanvas.getContext('2d')!;
  const stripeCount = 8;
  const stripeH = 512 / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    cctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#f1f5f9';
    cctx.fillRect(0, i * stripeH, 64, stripeH);
  }
  const curbMap = new THREE.CanvasTexture(curbCanvas);
  curbMap.colorSpace = THREE.SRGBColorSpace;
  curbMap.wrapS = THREE.ClampToEdgeWrapping;
  curbMap.wrapT = THREE.RepeatWrapping;
  curbMap.repeat.set(1, 6);
  curbMap.anisotropy = maxAnisotropy;

  // 3. Soft Radial Contact Shadow Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext('2d')!;
  const sGrad = sctx.createRadialGradient(128, 128, 22, 128, 128, 124);
  sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  sGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = sGrad;
  sctx.fillRect(0, 0, 256, 256);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  // 4. Particle Spark Texture
  const sparkCanvas = document.createElement('canvas');
  sparkCanvas.width = 64;
  sparkCanvas.height = 64;
  const pctx = sparkCanvas.getContext('2d')!;
  const pGrad = pctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  pGrad.addColorStop(0.35, 'rgba(255, 210, 120, 0.85)');
  pGrad.addColorStop(1, 'rgba(255, 120, 30, 0)');
  pctx.fillStyle = pGrad;
  pctx.fillRect(0, 0, 64, 64);
  const sparkMap = new THREE.CanvasTexture(sparkCanvas);
  sparkMap.colorSpace = THREE.SRGBColorSpace;

  // 5. Highway Sponsor & Game Promotional Billboard Textures
  const adSpecs: Array<{
    bgTop: string;
    bgBottom: string;
    accent: string;
    kicker: string;
    headline: string;
    subline: string;
  }> = [
    {
      bgTop: '#0f172a',
      bgBottom: '#1e293b',
      accent: '#f59e0b',
      kicker: 'OFFICIAL GAME FEATURE',
      headline: 'APEX VELOCITY',
      subline: '305 KM/H HIGHWAY PURSUIT · PLAY NOW',
    },
    {
      bgTop: '#081b26',
      bgBottom: '#0f293a',
      accent: '#06b6d4',
      kicker: 'NITRO CELL SYSTEMS',
      headline: 'VOLTCHARGE BOOST',
      subline: 'INSTANT THERMAL SURGE · ZERO LAG',
    },
    {
      bgTop: '#1f0d14',
      bgBottom: '#2d121b',
      accent: '#ef4444',
      kicker: 'TRACK COMPOUND SERIES',
      headline: 'VELOCE MOTORSPORT',
      subline: 'ALL-WEATHER HIGHWAY GRIP',
    },
  ];

  const billboardMaps = adSpecs.map((spec) => {
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 512;
    bCanvas.height = 256;
    const bctx = bCanvas.getContext('2d')!;

    const grad = bctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, spec.bgTop);
    grad.addColorStop(1, spec.bgBottom);
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, 512, 256);

    // Racing accent stripe
    bctx.fillStyle = spec.accent;
    bctx.fillRect(0, 0, 512, 12);
    bctx.fillRect(0, 244, 512, 12);
    bctx.fillRect(28, 42, 8, 172);

    // Kicker
    bctx.fillStyle = spec.accent;
    bctx.font = '700 20px sans-serif';
    bctx.fillText(spec.kicker, 52, 74);

    // Main Headline
    bctx.fillStyle = '#f8fafc';
    bctx.font = '800 44px sans-serif';
    bctx.fillText(spec.headline, 52, 140);

    // Subline
    bctx.fillStyle = '#cbd5e1';
    bctx.font = '600 20px sans-serif';
    bctx.fillText(spec.subline, 52, 192);

    const tex = new THREE.CanvasTexture(bCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return tex;
  });

  return {
    asphaltMap,
    curbMap,
    contactShadowMap,
    sparkMap,
    billboardMaps,
  };
}
