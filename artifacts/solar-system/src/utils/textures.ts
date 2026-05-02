import * as THREE from 'three';

export interface PlanetTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
}

// ── Noise helpers ─────────────────────────────────────────────────────────────

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise2d(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (d - a - c + b) * ux * uy; // fix sign
}

// Actually use the simpler sin-based version which is faster
function snoise(x: number, y: number, scale: number): number {
  const n = Math.sin(x * scale * 127.1 + y * scale * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x: number, y: number, octaves = 4): number {
  let v = 0, a = 0.5, f = 2.0;
  for (let i = 0; i < octaves; i++) {
    v += snoise(x, y, f) * a;
    a *= 0.5; f *= 2.07;
  }
  return v;
}

// ── Core: heights → normal map ────────────────────────────────────────────────

function heightsToNormalMap(
  heights: Float32Array,
  W: number,
  H: number,
  strength = 3.0
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const l = heights[y * W + Math.max(0, x - 1)];
      const r = heights[y * W + Math.min(W - 1, x + 1)];
      const u = heights[Math.max(0, y - 1) * W + x];
      const dn = heights[Math.min(H - 1, y + 1) * W + x];
      const dx = (l - r) * strength;
      const dy = (u - dn) * strength;
      const dz = 1.0;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const p = (y * W + x) * 4;
      d[p]     = Math.round((dx / len * 0.5 + 0.5) * 255);
      d[p + 1] = Math.round((dy / len * 0.5 + 0.5) * 255);
      d[p + 2] = Math.round((dz / len * 0.5 + 0.5) * 255);
      d[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  return tex;
}

// ── Noise overlay ────────────────────────────────────────────────────────────

function addNoiseOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  intensity = 0.06, scale = 1
) {
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 2) {
      const v = snoise(x / W, y / H, scale) * intensity;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(255,255,255,${v})`
        : `rgba(0,0,0,${v * 1.4})`;
      ctx.fillRect(x, y, 2, 1);
    }
  }
}

// ── Sun ──────────────────────────────────────────────────────────────────────

export function createSunTexture(): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, H * 0.7);
  grad.addColorStop(0, '#fff8c0');
  grad.addColorStop(0.18, '#ffe040');
  grad.addColorStop(0.45, '#ff9900');
  grad.addColorStop(0.72, '#ff5500');
  grad.addColorStop(1, '#cc2200');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 600; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = 4 + Math.random() * 22;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, `rgba(255,245,120,${0.12 + Math.random() * 0.22})`);
    g2.addColorStop(1, 'rgba(200,80,0,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const len = 25 + Math.random() * 55;
    const angle = Math.random() * Math.PI * 2;
    ctx.strokeStyle = `rgba(255,220,50,${0.25 + Math.random() * 0.35})`;
    ctx.lineWidth = 2 + Math.random() * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  addNoiseOverlay(ctx, W, H, 0.05, 2);
  return new THREE.CanvasTexture(canvas);
}

// ── Mercury ──────────────────────────────────────────────────────────────────

export function createMercuryTextures(): PlanetTextures {
  const W = 1024, H = 512;
  const NW = 512, NH = 256;

  const heights = new Float32Array(NW * NH);
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      heights[y * NW + x] = fbm(x / NW, y / NH, 5) * 0.6 + 0.2;
    }
  }

  // Craters in heights
  const craters: [number, number, number][] = [];
  for (let i = 0; i < 18; i++) {
    craters.push([Math.random() * NW, Math.random() * NH, 8 + Math.random() * 30]);
  }
  craters.forEach(([cx, cy, cr]) => {
    for (let y = Math.max(0, cy - cr * 1.5); y < Math.min(NH, cy + cr * 1.5); y++) {
      for (let x = Math.max(0, cx - cr * 1.5); x < Math.min(NW, cx + cr * 1.5); x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (d < cr) {
          const t = d / cr;
          heights[Math.floor(y) * NW + Math.floor(x)] -= (1 - t * t) * 0.4;
        }
      }
    }
  });

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const img = ctx.createImageData(W, H);
  const data = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const hn = heights[Math.floor(y / H * NH) * NW + Math.floor(x / W * NW)];
      const h = Math.max(0, Math.min(1, hn));
      const c = Math.round(80 + h * 120);
      const p = (y * W + x) * 4;
      data[p] = c + 12; data[p + 1] = c + 4; data[p + 2] = c - 8; data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  craters.forEach(([cx, cy, cr]) => {
    const sx = cx / NW * W, sy = cy / NH * H, sr = cr / NW * W;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(50,45,40,0.45)'; ctx.fill();
    ctx.strokeStyle = 'rgba(200,195,185,0.35)'; ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  addNoiseOverlay(ctx, W, H, 0.07, 5);
  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 3.5);
  return { map, normalMap };
}

// ── Venus ─────────────────────────────────────────────────────────────────────

export function createVenusTextures(): PlanetTextures {
  const W = 1024, H = 512;
  const NW = 512, NH = 256;

  const heights = new Float32Array(NW * NH);
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      const n1 = snoise(x / NW + y * 0.004, y / NH, 2.2);
      const n2 = snoise(x / NW * 2.5, y / NH + 0.6, 3.4);
      heights[y * NW + x] = (n1 * 0.6 + n2 * 0.4);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d4a84b';
  ctx.fillRect(0, 0, W, H);

  const img = ctx.createImageData(W, H);
  const data = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = heights[Math.floor(y / H * NH) * NW + Math.floor(x / W * NW)];
      const c = 170 + Math.round(h * 55);
      const p = (y * W + x) * 4;
      data[p] = Math.min(255, c + 30); data[p + 1] = Math.max(0, c - 15);
      data[p + 2] = Math.max(0, c - 90); data[p + 3] = 180;
    }
  }
  ctx.putImageData(img, 0, 0);
  addNoiseOverlay(ctx, W, H, 0.05, 2);

  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 2.0);
  return { map, normalMap };
}

// ── Earth ─────────────────────────────────────────────────────────────────────

export function createEarthTextures(): PlanetTextures {
  const W = 1024, H = 512;
  const NW = 512, NH = 256;

  const heights = new Float32Array(NW * NH);

  // Land mass definition using noise
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      const nx = x / NW, ny = y / NH;
      const h = fbm(nx * 1.8, ny * 1.8, 5);
      heights[y * NW + x] = h;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Render based on height (land/sea split)
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const SEA_LEVEL = 0.47;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = x / W, ny = y / H;
      const h = heights[Math.floor(ny * NH) * NW + Math.floor(nx * NW)];
      const polar = Math.abs(ny - 0.5) * 2;
      const p = (y * W + x) * 4;
      if (polar > 0.88) {
        // Polar ice
        const blend = Math.min(1, (polar - 0.88) / 0.12);
        const oc = h < SEA_LEVEL
          ? [20, 80, 170]
          : [45, 130, 60];
        data[p]     = Math.round(oc[0] + (240 - oc[0]) * blend);
        data[p + 1] = Math.round(oc[1] + (245 - oc[1]) * blend);
        data[p + 2] = Math.round(oc[2] + (255 - oc[2]) * blend);
      } else if (h < SEA_LEVEL) {
        // Ocean depth
        const d = (SEA_LEVEL - h) / SEA_LEVEL;
        data[p] = Math.round(10 + d * 15);
        data[p + 1] = Math.round(50 + d * 40);
        data[p + 2] = Math.round(140 + d * 60);
      } else {
        // Land
        const ht = (h - SEA_LEVEL) / (1 - SEA_LEVEL);
        if (ht < 0.35) {
          // Lowland / jungle
          data[p] = Math.round(35 + ht * 60);
          data[p + 1] = Math.round(120 - ht * 20);
          data[p + 2] = Math.round(35);
        } else if (ht < 0.7) {
          // Highlands
          data[p] = Math.round(80 + ht * 80);
          data[p + 1] = Math.round(90 + ht * 50);
          data[p + 2] = Math.round(40 + ht * 20);
        } else {
          // Mountain snow
          const s = (ht - 0.7) / 0.3;
          data[p] = Math.round(160 + s * 90);
          data[p + 1] = Math.round(150 + s * 95);
          data[p + 2] = Math.round(140 + s * 115);
        }
      }
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Cloud layer
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 28; i++) {
    const cy = Math.random() * H;
    ctx.beginPath();
    ctx.moveTo(0, cy + (Math.random() - 0.5) * 20);
    for (let x = 0; x < W; x += 60) {
      ctx.bezierCurveTo(
        x + 20, cy + (Math.random() - 0.5) * 30,
        x + 40, cy + (Math.random() - 0.5) * 30,
        x + 60, cy + (Math.random() - 0.5) * 20
      );
    }
    ctx.stroke();
  }

  addNoiseOverlay(ctx, W, H, 0.04, 3);
  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 4.0);
  return { map, normalMap };
}

// ── Mars ──────────────────────────────────────────────────────────────────────

export function createMarsTextures(): PlanetTextures {
  const W = 1024, H = 512;
  const NW = 512, NH = 256;

  const heights = new Float32Array(NW * NH);
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      heights[y * NW + x] = fbm(x / NW * 2, y / NH * 2, 5) * 0.7 + 0.15;
    }
  }
  // Valles Marineris canyon
  for (let x = 160; x < 380; x++) {
    const cx = x / NW * NW;
    const cy = 120 + Math.sin(x * 0.04) * 6;
    for (let dy = -8; dy <= 8; dy++) {
      const iy = Math.round(cy + dy);
      if (iy >= 0 && iy < NH) {
        heights[iy * NW + cx] -= (1 - Math.abs(dy) / 8) * 0.5;
      }
    }
  }
  // Olympus Mons volcano
  const omX = 90, omY = 100, omR = 28;
  for (let y2 = Math.max(0, omY - omR * 2); y2 < Math.min(NH, omY + omR * 2); y2++) {
    for (let x2 = Math.max(0, omX - omR * 2); x2 < Math.min(NW, omX + omR * 2); x2++) {
      const d = Math.sqrt((x2 - omX) ** 2 + (y2 - omY) ** 2);
      if (d < omR * 2) {
        heights[Math.floor(y2) * NW + Math.floor(x2)] += Math.exp(-d * d / (omR * omR * 0.8)) * 0.6;
      }
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const data = img.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = Math.max(0, Math.min(1, heights[Math.floor(y / H * NH) * NW + Math.floor(x / W * NW)]));
      const polar = Math.abs(y / H - 0.5) * 2;
      const p = (y * W + x) * 4;
      if (polar > 0.9) {
        const s = (polar - 0.9) / 0.1;
        data[p]     = Math.round(210 + s * 35);
        data[p + 1] = Math.round(210 + s * 35);
        data[p + 2] = Math.round(225 + s * 25);
      } else {
        data[p]     = Math.round(140 + h * 80);
        data[p + 1] = Math.round(50 + h * 35);
        data[p + 2] = Math.round(15 + h * 10);
      }
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Valley shadow
  ctx.strokeStyle = 'rgba(60,15,5,0.5)';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(160, 120 * H / NH); ctx.lineTo(380, (120 + 6) * H / NH); ctx.stroke();
  addNoiseOverlay(ctx, W, H, 0.07, 4);

  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 4.5);
  return { map, normalMap };
}

// ── Jupiter ───────────────────────────────────────────────────────────────────

export function createJupiterTextures(): PlanetTextures {
  const W = 1024, H = 512;
  const NW = 512, NH = 256;

  const heights = new Float32Array(NW * NH);
  const bands = [
    '#c88b3a','#e0a855','#a87030','#d4a060',
    '#b87828','#e8b84a','#9a6020','#cc9838',
    '#b07030','#e0b060','#a06020','#d09040',
    '#c08030','#dca850',
  ];

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bH = H / bands.length;
  bands.forEach((color, i) => {
    const g = ctx.createLinearGradient(0, i * bH, 0, (i + 1) * bH);
    g.addColorStop(0, color);
    g.addColorStop(1, bands[(i + 1) % bands.length]);
    ctx.fillStyle = g;
    ctx.fillRect(0, i * bH, W, bH + 1);
  });

  for (let y = 0; y < H; y++) {
    const wave = Math.sin(y * 0.22) * 14 + Math.cos(y * 0.07) * 28 + Math.sin(y * 0.55) * 6;
    for (let x = 0; x < W; x += 5) {
      const n = snoise((x + wave) / W, y / H, 6);
      heights[Math.floor(y / H * NH) * NW + Math.floor(x / W * NW)] = n;
      ctx.fillStyle = `rgba(${180 + Math.round(n * 40)},${100 + Math.round(n * 25)},30,${n * 0.18})`;
      ctx.fillRect(x, y, 5, 1);
    }
  }

  // Great Red Spot
  const grsX = W * 0.65, grsY = H * 0.58;
  const grs = ctx.createRadialGradient(grsX, grsY, 0, grsX, grsY, 34);
  grs.addColorStop(0, 'rgba(170,50,22,0.9)');
  grs.addColorStop(0.35, 'rgba(195,75,35,0.75)');
  grs.addColorStop(0.7, 'rgba(150,60,25,0.45)');
  grs.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grs;
  ctx.beginPath(); ctx.ellipse(grsX, grsY, 40, 26, 0, 0, Math.PI * 2); ctx.fill();

  // GRS height bump
  const grsNX = Math.floor(grsX / W * NW), grsNY = Math.floor(grsY / H * NH);
  for (let y2 = Math.max(0, grsNY - 20); y2 < Math.min(NH, grsNY + 20); y2++) {
    for (let x2 = Math.max(0, grsNX - 30); x2 < Math.min(NW, grsNX + 30); x2++) {
      const d = Math.sqrt(((x2 - grsNX) / 30) ** 2 + ((y2 - grsNY) / 20) ** 2);
      if (d < 1) heights[y2 * NW + x2] += (1 - d) * 0.5;
    }
  }

  addNoiseOverlay(ctx, W, H, 0.04, 3);
  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 2.5);
  return { map, normalMap };
}

// ── Saturn ────────────────────────────────────────────────────────────────────

export function createSaturnTextures(): PlanetTextures {
  const W = 1024, H = 512;
  const NW = 512, NH = 256;
  const heights = new Float32Array(NW * NH);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bands = ['#f0e0b0','#e0cc98','#d4b878','#ecd8a8','#c8aa68','#e8d4a0','#d0bc80','#e8d0a0'];
  const bH = H / bands.length;
  bands.forEach((color, i) => {
    const g = ctx.createLinearGradient(0, i * bH, 0, (i + 1) * bH);
    g.addColorStop(0, color);
    g.addColorStop(1, bands[(i + 1) % bands.length]);
    ctx.fillStyle = g;
    ctx.fillRect(0, i * bH, W, bH + 1);
  });

  for (let y = 0; y < NH; y++) {
    const wave = Math.sin(y * 0.15) * 6;
    for (let x = 0; x < NW; x++) {
      heights[y * NW + x] = snoise((x + wave) / NW, y / NH, 3) * 0.4 + 0.3;
    }
  }

  for (let y = 0; y < H; y += 2) {
    const wave = Math.sin(y * 0.15) * 8;
    ctx.fillStyle = 'rgba(255,245,190,0.07)';
    ctx.fillRect(wave, y, W, 2);
  }
  addNoiseOverlay(ctx, W, H, 0.04, 2);

  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 1.5);
  return { map, normalMap };
}

// ── Uranus ────────────────────────────────────────────────────────────────────

export function createUranusTextures(): PlanetTextures {
  const W = 1024, H = 512;
  const NW = 512, NH = 256;
  const heights = new Float32Array(NW * NH);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#b0f4f4');
  g.addColorStop(0.35, '#80eeee');
  g.addColorStop(0.65, '#60e2e2');
  g.addColorStop(1, '#50d0d0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      heights[y * NW + x] = snoise(x / NW, y / NH, 3) * 0.3 + 0.35;
    }
  }

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
    ctx.fillRect(x, y, Math.random() * 60 + 15, Math.random() * 3 + 1);
  }
  addNoiseOverlay(ctx, W, H, 0.05, 2);

  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 1.2);
  return { map, normalMap };
}

// ── Neptune ───────────────────────────────────────────────────────────────────

export function createNeptuneTextures(): PlanetTextures {
  const W = 1024, H = 512;
  const NW = 512, NH = 256;
  const heights = new Float32Array(NW * NH);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a3090');
  g.addColorStop(0.4, '#2848c0');
  g.addColorStop(0.6, '#3858d8');
  g.addColorStop(1, '#152878');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      const n = fbm(x / NW * 3, y / NH * 3, 4);
      heights[y * NW + x] = n;
    }
  }

  for (let y = 0; y < H; y += 9) {
    ctx.fillStyle = `rgba(70,110,230,${0.08 + Math.random() * 0.12})`;
    ctx.fillRect(0, y, W, 5);
  }

  // Great Dark Spot
  const dsX = W * 0.4, dsY = H * 0.5;
  const ds = ctx.createRadialGradient(dsX, dsY, 0, dsX, dsY, 30);
  ds.addColorStop(0, 'rgba(8,15,70,0.88)');
  ds.addColorStop(0.55, 'rgba(15,25,90,0.5)');
  ds.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ds;
  ctx.beginPath(); ctx.ellipse(dsX, dsY, 36, 22, 0, 0, Math.PI * 2); ctx.fill();
  const dsBump = { x: Math.floor(dsX / W * NW), y: Math.floor(dsY / H * NH) };
  for (let y2 = Math.max(0, dsBump.y - 15); y2 < Math.min(NH, dsBump.y + 15); y2++) {
    for (let x2 = Math.max(0, dsBump.x - 22); x2 < Math.min(NW, dsBump.x + 22); x2++) {
      const d = Math.sqrt(((x2 - dsBump.x) / 22) ** 2 + ((y2 - dsBump.y) / 15) ** 2);
      if (d < 1) heights[y2 * NW + x2] -= (1 - d) * 0.6;
    }
  }

  addNoiseOverlay(ctx, W, H, 0.06, 3);
  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 2.8);
  return { map, normalMap };
}

// ── Moon ─────────────────────────────────────────────────────────────────────

export function createMoonTextures(): PlanetTextures {
  const W = 512, H = 256;
  const NW = 256, NH = 128;
  const heights = new Float32Array(NW * NH);
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      heights[y * NW + x] = fbm(x / NW * 2, y / NH * 2, 4) * 0.5 + 0.25;
    }
  }
  const craters: [number, number, number][] = Array.from({ length: 35 }, () => [
    Math.random() * NW, Math.random() * NH, 2 + Math.random() * 12
  ]);
  craters.forEach(([cx, cy, cr]) => {
    for (let y2 = Math.max(0, cy - cr * 1.5); y2 < Math.min(NH, cy + cr * 1.5); y2++) {
      for (let x2 = Math.max(0, cx - cr * 1.5); x2 < Math.min(NW, cx + cr * 1.5); x2++) {
        const d = Math.sqrt((x2 - cx) ** 2 + (y2 - cy) ** 2);
        if (d < cr) heights[Math.floor(y2) * NW + Math.floor(x2)] -= (1 - (d / cr) ** 2) * 0.45;
      }
    }
  });

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const data = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = Math.max(0, Math.min(1, heights[Math.floor(y / H * NH) * NW + Math.floor(x / W * NW)]));
      const c = Math.round(100 + h * 110);
      const p = (y * W + x) * 4;
      data[p] = c + 8; data[p + 1] = c + 4; data[p + 2] = c - 5; data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  craters.forEach(([cx, cy, cr]) => {
    const sx = cx / NW * W, sy = cy / NH * H, sr = cr / NW * W;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(55,50,45,0.4)'; ctx.fill();
    ctx.strokeStyle = 'rgba(200,195,185,0.28)'; ctx.lineWidth = 1;
    ctx.stroke();
  });
  addNoiseOverlay(ctx, W, H, 0.09, 5);

  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 4.0);
  return { map, normalMap };
}

// ── Saturn rings ─────────────────────────────────────────────────────────────

export function createSaturnRingTexture(): THREE.CanvasTexture {
  const W = 1024, H = 1;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0.00, 'rgba(200,180,130,0)');
  g.addColorStop(0.03, 'rgba(215,195,145,0.5)');
  g.addColorStop(0.08, 'rgba(235,215,168,0.78)');
  g.addColorStop(0.15, 'rgba(200,175,120,0.42)');
  g.addColorStop(0.22, 'rgba(245,225,175,0.88)');
  g.addColorStop(0.32, 'rgba(210,185,130,0.60)');
  g.addColorStop(0.42, 'rgba(228,205,155,0.82)');
  g.addColorStop(0.52, 'rgba(195,168,112,0.48)');
  g.addColorStop(0.62, 'rgba(218,192,142,0.72)');
  g.addColorStop(0.72, 'rgba(202,178,128,0.50)');
  g.addColorStop(0.82, 'rgba(208,183,133,0.38)');
  g.addColorStop(0.92, 'rgba(195,170,120,0.18)');
  g.addColorStop(1.00, 'rgba(180,160,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return new THREE.CanvasTexture(canvas);
}

// ── Star sprite ───────────────────────────────────────────────────────────────

export function createStarTexture(): THREE.CanvasTexture {
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.55, 'rgba(210,220,255,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(canvas);
}

// ── Generic (fallback) ────────────────────────────────────────────────────────

function createGenericTextures(baseColor: string): PlanetTextures {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, W, H);
  addNoiseOverlay(ctx, W, H, 0.12, 3);
  const heights = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) heights[i] = Math.random() * 0.4 + 0.3;
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights, W, H, 2.0) };
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export function createPlanetTextureByType(
  type: string,
  baseColor: string,
): PlanetTextures {
  switch (type) {
    case 'mercury': return createMercuryTextures();
    case 'venus':   return createVenusTextures();
    case 'earth':   return createEarthTextures();
    case 'mars':    return createMarsTextures();
    case 'jupiter': return createJupiterTextures();
    case 'saturn':  return createSaturnTextures();
    case 'uranus':  return createUranusTextures();
    case 'neptune': return createNeptuneTextures();
    default:        return createGenericTextures(baseColor);
  }
}
