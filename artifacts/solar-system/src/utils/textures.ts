import * as THREE from 'three';

function noise2d(x: number, y: number, scale: number): number {
  const n = Math.sin(x * scale * 127.1 + y * scale * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function addNoise(ctx: CanvasRenderingContext2D, width: number, height: number, intensity = 0.07, scale = 1) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 2) {
      const v = noise2d(x / width, y / height, scale) * intensity;
      const light = Math.random() > 0.5;
      ctx.fillStyle = light ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${v * 1.5})`;
      ctx.fillRect(x, y, 2, 1);
    }
  }
}

export function createSunTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Base radial gradient
  const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, H * 0.7);
  grad.addColorStop(0, '#fff7a0');
  grad.addColorStop(0.2, '#ffdd00');
  grad.addColorStop(0.5, '#ff9900');
  grad.addColorStop(0.75, '#ff6600');
  grad.addColorStop(1, '#cc3300');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Plasma convection cells
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 18 + 3;
    const cellGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
    cellGrad.addColorStop(0, `rgba(255,240,100,${0.15 + Math.random() * 0.2})`);
    cellGrad.addColorStop(1, 'rgba(200,80,0,0)');
    ctx.fillStyle = cellGrad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Solar flares
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const len = 20 + Math.random() * 40;
    const angle = Math.random() * Math.PI * 2;
    ctx.strokeStyle = `rgba(255,220,50,${0.3 + Math.random() * 0.3})`;
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

export function createMercuryTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(0, 0, W, H);
  // Highland/lowland variation
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const v = noise2d(x / W, y / H, 3);
    const col = 100 + Math.floor(v * 80);
    ctx.fillStyle = `rgb(${col},${col - 5},${col - 10})`;
    ctx.fillRect(x, y, 3, 3);
  }
  // Large craters
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = 10 + Math.random() * 25;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60,60,60,0.5)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(160,155,150,0.3)'; ctx.fill();
    // Rim
    ctx.strokeStyle = 'rgba(200,195,190,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }
  // Small craters
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = 2 + Math.random() * 8;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(50,50,50,0.4)'; ctx.fill();
  }
  addNoise(ctx, W, H, 0.06, 4);
  return new THREE.CanvasTexture(canvas);
}

export function createVenusTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d4a84b';
  ctx.fillRect(0, 0, W, H);
  // Swirling cloud bands
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x += 4) {
      const n = noise2d(x / W + y * 0.003, y / H, 2);
      const n2 = noise2d(x / W * 2, y / H + 0.5, 3);
      const c = 180 + Math.floor((n + n2 * 0.5) * 40);
      const r = Math.min(255, c + 20), g = Math.min(255, c - 10), b = Math.max(0, c - 80);
      ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
      ctx.fillRect(x, y, 4, 1);
    }
  }
  addNoise(ctx, W, H, 0.05, 2);
  return new THREE.CanvasTexture(canvas);
}

export function createEarthTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Ocean
  ctx.fillStyle = '#1a5fa8';
  ctx.fillRect(0, 0, W, H);

  // Continents (approximate world map)
  ctx.fillStyle = '#2d7a3a';
  const continents: [number, number, number, number][] = [
    [50, 60, 80, 50],   // North America
    [60, 130, 60, 50],  // South America
    [220, 50, 80, 60],  // Europe
    [220, 100, 100, 70],// Africa
    [300, 40, 120, 80], // Asia
    [380, 150, 70, 45], // Australia
    [0, 220, 512, 36],  // Antarctica
  ];
  continents.forEach(([x, y, w, h]) => {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Land detail
  ctx.fillStyle = '#3a8a45';
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = 3 + Math.random() * 12;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Polar ice caps
  ctx.fillStyle = '#e8f0ff';
  ctx.fillRect(0, 0, W, 18);
  ctx.fillRect(0, H - 18, W, 18);
  // Cloud streaks
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 20; i++) {
    const y = Math.random() * H;
    ctx.beginPath();
    ctx.moveTo(Math.random() * W, y);
    ctx.bezierCurveTo(
      Math.random() * W, y + (Math.random() - 0.5) * 20,
      Math.random() * W, y + (Math.random() - 0.5) * 20,
      Math.random() * W, y + (Math.random() - 0.5) * 30
    );
    ctx.stroke();
  }
  addNoise(ctx, W, H, 0.04, 3);
  return new THREE.CanvasTexture(canvas);
}

export function createMarsTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b54010';
  ctx.fillRect(0, 0, W, H);

  // Terrain variation
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x += 3) {
      const n = noise2d(x / W, y / H, 4);
      const r = 150 + Math.floor(n * 70), g = 50 + Math.floor(n * 30), b = 10;
      ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
      ctx.fillRect(x, y, 3, 1);
    }
  }
  // Valles Marineris (canyon system)
  ctx.strokeStyle = 'rgba(80,20,5,0.6)';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(160, 120); ctx.lineTo(360, 130); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(160, 115); ctx.lineTo(200, 130); ctx.stroke();
  // Olympus Mons
  const omGrad = ctx.createRadialGradient(100, 100, 0, 100, 100, 30);
  omGrad.addColorStop(0, 'rgba(200,120,80,0.7)');
  omGrad.addColorStop(1, 'rgba(180,60,20,0)');
  ctx.fillStyle = omGrad;
  ctx.beginPath(); ctx.arc(100, 100, 30, 0, Math.PI * 2); ctx.fill();
  // Polar ice caps
  ctx.fillStyle = '#e8ecff';
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, H - 10, W, 10);
  // Craters
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * W, y = 15 + Math.random() * (H - 30);
    const r = 4 + Math.random() * 18;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80,20,5,0.35)'; ctx.fill();
  }
  addNoise(ctx, W, H, 0.07, 3);
  return new THREE.CanvasTexture(canvas);
}

export function createJupiterTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bands = [
    '#c88b3a', '#e0a855', '#a87030', '#d4a060',
    '#b87828', '#e8b84a', '#9a6020', '#cc9838',
    '#b07030', '#e0b060', '#a06020', '#d09040',
  ];
  const bH = H / bands.length;
  bands.forEach((color, i) => {
    const grad = ctx.createLinearGradient(0, i * bH, 0, (i + 1) * bH);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color + 'dd');
    grad.addColorStop(1, bands[(i + 1) % bands.length]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, i * bH, W, bH + 1);
  });

  // Band turbulence
  for (let y = 0; y < H; y++) {
    const wave = Math.sin(y * 0.25) * 12 + Math.cos(y * 0.08) * 25 + Math.sin(y * 0.6) * 5;
    for (let x = 0; x < W; x += 6) {
      const n = noise2d((x + wave) / W, y / H, 5);
      ctx.fillStyle = `rgba(${200 + n * 30},${120 + n * 20},${40},${n * 0.15})`;
      ctx.fillRect(x, y, 6, 1);
    }
  }

  // Great Red Spot
  const grsX = W * 0.65, grsY = H * 0.58;
  const grsGrad = ctx.createRadialGradient(grsX, grsY, 0, grsX, grsY, 28);
  grsGrad.addColorStop(0, 'rgba(180, 60, 30, 0.85)');
  grsGrad.addColorStop(0.4, 'rgba(200, 80, 40, 0.7)');
  grsGrad.addColorStop(0.7, 'rgba(160, 70, 30, 0.4)');
  grsGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grsGrad;
  ctx.beginPath(); ctx.ellipse(grsX, grsY, 32, 20, 0, 0, Math.PI * 2); ctx.fill();

  addNoise(ctx, W, H, 0.04, 3);
  return new THREE.CanvasTexture(canvas);
}

export function createSaturnTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bands = ['#f0e0b0', '#e0cc98', '#d4b878', '#ecd8a8', '#c8aa68', '#e8d4a0', '#d0bc80'];
  const bH = H / bands.length;
  bands.forEach((color, i) => {
    const grad = ctx.createLinearGradient(0, i * bH, 0, (i + 1) * bH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, bands[(i + 1) % bands.length]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, i * bH, W, bH + 1);
  });
  // Subtle wave
  for (let y = 0; y < H; y += 2) {
    const wave = Math.sin(y * 0.15) * 8;
    ctx.fillStyle = `rgba(255,240,180,0.06)`;
    ctx.fillRect(wave, y, W, 2);
  }
  addNoise(ctx, W, H, 0.04, 2);
  return new THREE.CanvasTexture(canvas);
}

export function createUranusTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#a8f0f0');
  grad.addColorStop(0.5, '#7de8e8');
  grad.addColorStop(1, '#60d8d8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
    ctx.fillRect(x, y, Math.random() * 50 + 10, Math.random() * 3 + 1);
  }
  addNoise(ctx, W, H, 0.05, 2);
  return new THREE.CanvasTexture(canvas);
}

export function createNeptuneTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#2040a0');
  grad.addColorStop(0.4, '#3050c0');
  grad.addColorStop(0.6, '#4060d0');
  grad.addColorStop(1, '#203090');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Storm bands
  for (let y = 0; y < H; y += 8) {
    ctx.fillStyle = `rgba(80,120,220,${0.1 + Math.random() * 0.15})`;
    ctx.fillRect(0, y, W, 4);
  }
  // Great Dark Spot
  const dsGrad = ctx.createRadialGradient(W * 0.4, H * 0.5, 0, W * 0.4, H * 0.5, 25);
  dsGrad.addColorStop(0, 'rgba(10,20,80,0.8)');
  dsGrad.addColorStop(0.6, 'rgba(20,30,100,0.4)');
  dsGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dsGrad;
  ctx.beginPath(); ctx.ellipse(W * 0.4, H * 0.5, 28, 18, 0, 0, Math.PI * 2); ctx.fill();
  addNoise(ctx, W, H, 0.06, 3);
  return new THREE.CanvasTexture(canvas);
}

export function createMoonTexture(): THREE.CanvasTexture {
  const W = 256, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x += 4) {
      const n = noise2d(x / W, y / H, 5);
      const c = 150 + Math.floor(n * 50);
      ctx.fillStyle = `rgba(${c},${c},${c - 5},0.5)`;
      ctx.fillRect(x, y, 4, 1);
    }
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = 2 + Math.random() * 10;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(70,70,70,0.4)'; ctx.fill();
    ctx.strokeStyle = 'rgba(190,190,190,0.3)'; ctx.lineWidth = 1;
    ctx.stroke();
  }
  addNoise(ctx, W, H, 0.08, 4);
  return new THREE.CanvasTexture(canvas);
}

export function createSaturnRingTexture(): THREE.CanvasTexture {
  const W = 512, H = 1;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0.00, 'rgba(200,180,130,0)');
  grad.addColorStop(0.04, 'rgba(215,195,145,0.55)');
  grad.addColorStop(0.10, 'rgba(230,210,165,0.75)');
  grad.addColorStop(0.18, 'rgba(200,175,120,0.45)');
  grad.addColorStop(0.25, 'rgba(240,220,170,0.85)');
  grad.addColorStop(0.35, 'rgba(210,185,130,0.6)');
  grad.addColorStop(0.45, 'rgba(225,200,150,0.80)');
  grad.addColorStop(0.55, 'rgba(195,170,115,0.5)');
  grad.addColorStop(0.65, 'rgba(215,190,140,0.72)');
  grad.addColorStop(0.78, 'rgba(200,175,125,0.45)');
  grad.addColorStop(0.88, 'rgba(210,185,130,0.35)');
  grad.addColorStop(0.96, 'rgba(195,170,120,0.15)');
  grad.addColorStop(1.00, 'rgba(180,160,110,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  return new THREE.CanvasTexture(canvas);
}

export function createStarTexture(): THREE.CanvasTexture {
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.6, 'rgba(200,215,255,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(canvas);
}

export function createPlanetTextureByType(
  type: string,
  baseColor: string,
  _stripeColors?: string[]
): THREE.CanvasTexture {
  switch (type) {
    case 'mercury': return createMercuryTexture();
    case 'venus': return createVenusTexture();
    case 'earth': return createEarthTexture();
    case 'mars': return createMarsTexture();
    case 'jupiter': return createJupiterTexture();
    case 'saturn': return createSaturnTexture();
    case 'uranus': return createUranusTexture();
    case 'neptune': return createNeptuneTexture();
    default: return createGenericTexture(baseColor);
  }
}

function createGenericTexture(baseColor: string): THREE.CanvasTexture {
  const W = 256, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, W, H);
  addNoise(ctx, W, H, 0.1, 3);
  return new THREE.CanvasTexture(canvas);
}
