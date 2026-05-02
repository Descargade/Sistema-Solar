import * as THREE from 'three';

function addNoise(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number = 0.08) {
  for (let i = 0; i < width * height * 0.3; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 1.5;
    const alpha = Math.random() * intensity;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fill();
  }
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export function createSunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(256, 128, 0, 256, 128, 256);
  grad.addColorStop(0, '#ffffa0');
  grad.addColorStop(0.3, '#ffcc00');
  grad.addColorStop(0.6, '#ff9900');
  grad.addColorStop(0.85, '#ff6600');
  grad.addColorStop(1, '#cc3300');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = Math.random() * 8 + 2;
    const alpha = Math.random() * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,220,0,${alpha})`;
    ctx.fill();
  }

  addNoise(ctx, 512, 256, 0.15);
  return new THREE.CanvasTexture(canvas);
}

export function createPlanetTexture(
  baseColor: string,
  type: 'solid' | 'stripes' | 'rocky' | 'gas' | 'ice',
  stripeColors?: string[]
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseColor);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 256);

  if (type === 'stripes' && stripeColors && stripeColors.length > 0) {
    const stripeHeight = 256 / stripeColors.length;
    stripeColors.forEach((color, i) => {
      const yPos = i * stripeHeight;
      const gradient = ctx.createLinearGradient(0, yPos, 0, yPos + stripeHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + 'dd');
      gradient.addColorStop(1, stripeColors[(i + 1) % stripeColors.length]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, yPos, 512, stripeHeight + 1);
    });
    // Add turbulence/wave effect
    for (let y = 0; y < 256; y += 2) {
      const wave = Math.sin(y * 0.2) * 10 + Math.cos(y * 0.07) * 20;
      ctx.fillStyle = `rgba(${r}, ${Math.min(255, g + 20)}, ${b}, 0.15)`;
      ctx.fillRect(0 + wave, y, 512, 2);
    }
    addNoise(ctx, 512, 256, 0.05);
  } else if (type === 'rocky') {
    // Rocky craters
    addNoise(ctx, 512, 256, 0.12);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const cr = Math.random() * 12 + 2;
      ctx.beginPath();
      ctx.arc(x, y, cr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,0.25)`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - cr * 0.2, y - cr * 0.2, cr * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,0.08)`;
      ctx.fill();
    }
    addNoise(ctx, 512, 256, 0.1);
  } else if (type === 'gas') {
    // Gas planet bands
    for (let y = 0; y < 256; y += 8) {
      const alpha = 0.05 + Math.random() * 0.1;
      const lightness = Math.random() > 0.5 ? 30 : -30;
      ctx.fillStyle = `rgba(${Math.max(0, Math.min(255, r + lightness))},${Math.max(0, Math.min(255, g + lightness))},${Math.max(0, Math.min(255, b + lightness))},${alpha})`;
      ctx.fillRect(0, y, 512, 8);
    }
    addNoise(ctx, 512, 256, 0.08);
  } else if (type === 'ice') {
    // Icy with subtle variations
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const w = Math.random() * 60 + 10;
      const h = Math.random() * 4 + 1;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
      ctx.fillRect(x, y, w, h);
    }
    addNoise(ctx, 512, 256, 0.06);
  } else {
    // Solid with subtle variations
    const grad = ctx.createRadialGradient(200, 100, 0, 256, 128, 280);
    grad.addColorStop(0, `rgba(255,255,255,0.2)`);
    grad.addColorStop(1, `rgba(0,0,0,0.3)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    addNoise(ctx, 512, 256, 0.08);
  }

  return new THREE.CanvasTexture(canvas);
}

export function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 128;
    const r = Math.random() * 8 + 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80,80,80,0.4)`;
    ctx.fill();
  }
  addNoise(ctx, 256, 128, 0.1);
  return new THREE.CanvasTexture(canvas);
}

export function createSaturnRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, 'rgba(200, 180, 130, 0)');
  grad.addColorStop(0.05, 'rgba(210, 190, 140, 0.5)');
  grad.addColorStop(0.15, 'rgba(230, 210, 160, 0.8)');
  grad.addColorStop(0.3, 'rgba(200, 175, 120, 0.6)');
  grad.addColorStop(0.45, 'rgba(220, 195, 145, 0.85)');
  grad.addColorStop(0.6, 'rgba(200, 180, 130, 0.6)');
  grad.addColorStop(0.75, 'rgba(210, 190, 140, 0.75)');
  grad.addColorStop(0.9, 'rgba(190, 170, 120, 0.4)');
  grad.addColorStop(1, 'rgba(180, 160, 110, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 32);
  return new THREE.CanvasTexture(canvas);
}

export function createStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.7, 'rgba(200,220,255,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a6fa8';
  ctx.fillRect(0, 0, 512, 256);

  const continents = [
    { x: 200, y: 80, rx: 50, ry: 35 },
    { x: 180, y: 140, rx: 30, ry: 20 },
    { x: 290, y: 90, rx: 40, ry: 30 },
    { x: 330, y: 130, rx: 25, ry: 35 },
    { x: 100, y: 100, rx: 35, ry: 25 },
    { x: 60, y: 130, rx: 20, ry: 28 },
    { x: 380, y: 100, rx: 30, ry: 20 },
    { x: 430, y: 75, rx: 20, ry: 15 },
    { x: 250, y: 200, rx: 45, ry: 20 },
  ];

  ctx.fillStyle = '#2d8a45';
  continents.forEach(({ x, y, rx, ry }) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 20);
  ctx.fillRect(0, 236, 512, 20);

  addNoise(ctx, 512, 256, 0.05);
  return new THREE.CanvasTexture(canvas);
}

export function createArtificialSatelliteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c0d0e8';
  ctx.fillRect(12, 14, 8, 4);
  ctx.fillStyle = '#4080c0';
  ctx.fillRect(2, 13, 10, 6);
  ctx.fillRect(20, 13, 10, 6);
  return new THREE.CanvasTexture(canvas);
}
