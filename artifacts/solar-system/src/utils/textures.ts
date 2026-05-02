import * as THREE from 'three';

export interface PlanetTextures {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
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

// ── Core: heights → roughness map ─────────────────────────────────────────────

function heightsToRoughnessMap(
  heights: Float32Array,
  W: number, H: number,
  base = 0.78,
  variation = 0.22
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = heights[y * W + x] ?? 0.5;
      const r = Math.max(0, Math.min(255, Math.round((base + (h - 0.5) * variation * 2) * 255)));
      const p = (y * W + x) * 4;
      d[p] = d[p + 1] = d[p + 2] = r;
      d[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  return tex;
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
      const c = Math.round(115 + h * 105);
      const p = (y * W + x) * 4;
      data[p] = c + 14; data[p + 1] = c + 6; data[p + 2] = c - 8; data[p + 3] = 255;
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
      const c = 188 + Math.round(h * 52);
      const p = (y * W + x) * 4;
      data[p] = Math.min(255, c + 32); data[p + 1] = Math.max(0, c - 8);
      data[p + 2] = Math.max(0, c - 78); data[p + 3] = 255;
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
        // Ocean — vivid deep blue, clearly visible
        const d = (SEA_LEVEL - h) / SEA_LEVEL;
        data[p]     = Math.round(22  + d * 28);
        data[p + 1] = Math.round(88  + d * 52);
        data[p + 2] = Math.round(195 + d * 48);
      } else {
        // Land
        const ht = (h - SEA_LEVEL) / (1 - SEA_LEVEL);
        if (ht < 0.35) {
          // Lowland / tropical
          data[p]     = Math.round(48  + ht * 75);
          data[p + 1] = Math.round(148 - ht * 22);
          data[p + 2] = Math.round(42);
        } else if (ht < 0.7) {
          // Highlands / savanna
          data[p]     = Math.round(118 + ht * 88);
          data[p + 1] = Math.round(118 + ht * 55);
          data[p + 2] = Math.round(58  + ht * 28);
        } else {
          // Mountain snow — bright
          const s = (ht - 0.7) / 0.3;
          data[p]     = Math.round(195 + s * 55);
          data[p + 1] = Math.round(190 + s * 60);
          data[p + 2] = Math.round(182 + s * 70);
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
      heights[y * NW + x] = fbm(x / NW * 2.8, y / NH * 2.8, 7) * 0.72 + 0.14;
    }
  }

  // Valles Marineris canyon system
  for (let x = 155; x < 390; x++) {
    const cy = 120 + Math.sin(x * 0.04) * 8 + Math.cos(x * 0.015) * 5;
    for (let dy = -10; dy <= 10; dy++) {
      const iy = Math.round(cy + dy);
      if (iy >= 0 && iy < NH) {
        heights[iy * NW + x] -= (1 - Math.abs(dy) / 10) * 0.62;
      }
    }
  }

  // Olympus Mons
  const omX = 90, omY = 100, omR = 32;
  for (let y2 = Math.max(0, omY - omR * 2); y2 < Math.min(NH, omY + omR * 2); y2++) {
    for (let x2 = Math.max(0, omX - omR * 2); x2 < Math.min(NW, omX + omR * 2); x2++) {
      const d = Math.sqrt((x2 - omX) ** 2 + (y2 - omY) ** 2);
      if (d < omR * 2) {
        heights[Math.floor(y2) * NW + Math.floor(x2)] += Math.exp(-d * d / (omR * omR * 0.85)) * 0.72;
      }
    }
  }

  // Impact craters of various sizes
  const craters: Array<[number, number, number]> = [
    [320, 160, 22], [480, 80, 14], [180, 200, 18],
    [400, 180, 10], [260, 60, 9],  [440, 220, 8],
    [140, 130, 12], [370, 50, 7],
  ];
  craters.forEach(([cx, cy, cr]) => {
    for (let y2 = Math.max(0, cy - cr * 2); y2 < Math.min(NH, cy + cr * 2); y2++) {
      for (let x2 = Math.max(0, cx - cr * 2); x2 < Math.min(NW, cx + cr * 2); x2++) {
        const d = Math.sqrt((x2 - cx) ** 2 + (y2 - cy) ** 2);
        if (d < cr) {
          const bowl = Math.cos((d / cr) * Math.PI * 0.5);
          heights[y2 * NW + x2] -= bowl * 0.45;
        } else if (d < cr * 1.4) {
          const rim = Math.exp(-(((d - cr) / (cr * 0.3)) ** 2));
          heights[y2 * NW + x2] += rim * 0.22;
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
      const h = Math.max(0, Math.min(1, heights[Math.floor(y / H * NH) * NW + Math.floor(x / W * NW)]));
      const polar = Math.abs(y / H - 0.5) * 2;
      const p = (y * W + x) * 4;
      // Regional color variation: lowlands darker/bluer, highlands brighter/more orange
      const regionN = snoise(x / W * 3, y / H * 3, 4) * 0.5 + 0.5;
      if (polar > 0.86) {
        const s = Math.min(1, (polar - 0.86) / 0.14);
        data[p]     = Math.round(215 + s * 30);
        data[p + 1] = Math.round(215 + s * 28);
        data[p + 2] = Math.round(228 + s * 22);
      } else {
        // Base rust/ochre + height-based variation + regional noise
        data[p]     = Math.round(148 + h * 88 + regionN * 18);
        data[p + 1] = Math.round(52  + h * 48 + regionN * 12);
        data[p + 2] = Math.round(14  + h * 22 + regionN * 6);
      }
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Valley shadow stroke
  ctx.strokeStyle = 'rgba(50,10,2,0.55)';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(155, 120 * H / NH); ctx.lineTo(390, (128) * H / NH); ctx.stroke();

  // Draw crater floors darker
  craters.forEach(([cx, cy, cr]) => {
    const gx = cx / NW * W, gy = cy / NH * H, gr = cr / NW * W;
    const cg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr * 2);
    cg.addColorStop(0, 'rgba(80,25,5,0.5)');
    cg.addColorStop(0.55, 'rgba(60,18,4,0.3)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(gx, gy, gr * 2, 0, Math.PI * 2); ctx.fill();
  });

  addNoiseOverlay(ctx, W, H, 0.07, 5);
  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 5.5);
  return { map, normalMap };
}

// ── Jupiter ───────────────────────────────────────────────────────────────────

export function createJupiterTextures(): PlanetTextures {
  const W = 1024, H = 512;
  const NW = 512, NH = 256;

  const heights = new Float32Array(NW * NH);
  // 18 alternating light/dark bands for higher realism
  const bands = [
    '#c0803a','#f2ba62','#a86c2e','#eeaa58',
    '#b87838','#f8cc56','#9a6222','#e0a840',
    '#c07030','#f5c060','#a86828','#e0b048',
    '#ba7a34','#f0be5a','#9e6420','#daa03c',
    '#c07838','#eebc56',
  ];

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bH = H / bands.length;
  bands.forEach((color, i) => {
    const g = ctx.createLinearGradient(0, i * bH, 0, (i + 1) * bH);
    g.addColorStop(0, color);
    g.addColorStop(0.5, bands[(i + 1) % bands.length]);
    g.addColorStop(1, bands[(i + 2) % bands.length]);
    ctx.fillStyle = g;
    ctx.fillRect(0, i * bH, W, bH + 1);
  });

  // Turbulent band edges — high-frequency wave distortion
  for (let y = 0; y < H; y++) {
    const wave = Math.sin(y * 0.28) * 18 + Math.cos(y * 0.09) * 32 + Math.sin(y * 0.62) * 9 + Math.cos(y * 0.18) * 14;
    for (let x = 0; x < W; x += 4) {
      const n = snoise((x + wave) / W, y / H, 7);
      heights[Math.floor(y / H * NH) * NW + Math.floor(x / W * NW)] = n;
      const r = 185 + Math.round(n * 52), g = 100 + Math.round(n * 34), b = 32;
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.abs(n) * 0.26})`;
      ctx.fillRect(x, y, 4, 1);
    }
  }

  // Great Red Spot — vivid, larger, multi-layer
  const grsX = W * 0.65, grsY = H * 0.58;
  const grsOuter = ctx.createRadialGradient(grsX, grsY, 0, grsX, grsY, 58);
  grsOuter.addColorStop(0, 'rgba(148,34,12,0.95)');
  grsOuter.addColorStop(0.18, 'rgba(172,48,22,0.92)');
  grsOuter.addColorStop(0.42, 'rgba(200,78,32,0.82)');
  grsOuter.addColorStop(0.65, 'rgba(210,110,48,0.60)');
  grsOuter.addColorStop(0.85, 'rgba(190,95,38,0.28)');
  grsOuter.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grsOuter;
  ctx.beginPath(); ctx.ellipse(grsX, grsY, 58, 36, 0, 0, Math.PI * 2); ctx.fill();
  // Inner bright core
  const grsInner = ctx.createRadialGradient(grsX - 6, grsY - 4, 0, grsX, grsY, 22);
  grsInner.addColorStop(0, 'rgba(230,130,60,0.88)');
  grsInner.addColorStop(0.5, 'rgba(190,70,28,0.70)');
  grsInner.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grsInner;
  ctx.beginPath(); ctx.ellipse(grsX, grsY, 24, 15, 0, 0, Math.PI * 2); ctx.fill();

  // GRS height bump
  const grsNX = Math.floor(grsX / W * NW), grsNY = Math.floor(grsY / H * NH);
  for (let y2 = Math.max(0, grsNY - 26); y2 < Math.min(NH, grsNY + 26); y2++) {
    for (let x2 = Math.max(0, grsNX - 38); x2 < Math.min(NW, grsNX + 38); x2++) {
      const d = Math.sqrt(((x2 - grsNX) / 38) ** 2 + ((y2 - grsNY) / 26) ** 2);
      if (d < 1) heights[y2 * NW + x2] += (1 - d) * 0.65;
    }
  }

  // Oval storms (smaller white/cream swirls)
  const storms = [
    { x: W * 0.25, y: H * 0.35, rx: 16, ry: 10 },
    { x: W * 0.45, y: H * 0.72, rx: 12, ry: 7  },
    { x: W * 0.82, y: H * 0.45, rx: 10, ry: 6  },
  ];
  storms.forEach(({ x, y, rx, ry }) => {
    const sg = ctx.createRadialGradient(x, y, 0, x, y, rx);
    sg.addColorStop(0, 'rgba(245,230,190,0.88)');
    sg.addColorStop(0.5, 'rgba(230,210,160,0.55)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  });

  addNoiseOverlay(ctx, W, H, 0.035, 3);
  const map = new THREE.CanvasTexture(canvas);
  const normalMap = heightsToNormalMap(heights, NW, NH, 3.0);
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

// ── Io ────────────────────────────────────────────────────────────────────────

function createIoTextures(): PlanetTextures {
  const W = 512, H = 256;
  const NW = 256, NH = 128;
  const heights = new Float32Array(NW * NH);
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      heights[y * NW + x] = fbm(x / NW * 3, y / NH * 3, 4) * 0.5 + 0.25;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = Math.max(0, Math.min(1, heights[Math.floor(y/H*NH)*NW+Math.floor(x/W*NW)]));
      const p = (y * W + x) * 4;
      if (h < 0.3) { d[p]=80; d[p+1]=60; d[p+2]=10; }
      else if (h < 0.55) { d[p]=Math.round(210+h*30); d[p+1]=Math.round(150+h*20); d[p+2]=Math.round(20+h*10); }
      else { d[p]=Math.round(240+h*10); d[p+1]=Math.round(200+h*20); d[p+2]=Math.round(50+h*20); }
      d[p+3]=255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const calderas: [number,number,number][] = Array.from({length:18},()=>[Math.random()*W,Math.random()*H,5+Math.random()*18]);
  calderas.forEach(([cx,cy,cr])=>{
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,cr);
    g.addColorStop(0,'rgba(20,10,5,0.95)');g.addColorStop(0.4,'rgba(180,60,10,0.6)');g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(cx,cy,cr,cr*0.7,Math.random()*Math.PI,0,Math.PI*2); ctx.fill();
  });
  addNoiseOverlay(ctx,W,H,0.06,4);
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights,NW,NH,2.5),
           roughnessMap: heightsToRoughnessMap(heights,NW,NH,0.75,0.2) };
}

// ── Europa ────────────────────────────────────────────────────────────────────

function createEuropaTextures(): PlanetTextures {
  const W = 512, H = 256;
  const NW = 256, NH = 128;
  const heights = new Float32Array(NW * NH);
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      heights[y*NW+x] = snoise(x/NW,y/NH,3)*0.25+0.5;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d')!;
  const img=ctx.createImageData(W,H); const d=img.data;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const p=(y*W+x)*4; const h=heights[Math.floor(y/H*NH)*NW+Math.floor(x/W*NW)];
    d[p]=Math.round(200+h*40); d[p+1]=Math.round(215+h*30); d[p+2]=Math.round(230+h*20); d[p+3]=255;
  }
  ctx.putImageData(img,0,0);
  ctx.strokeStyle='rgba(120,60,30,0.55)'; ctx.lineWidth=1.5;
  for (let i=0;i<22;i++) {
    const x0=Math.random()*W, y0=Math.random()*H, l=40+Math.random()*120;
    const a=Math.random()*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(x0,y0);
    ctx.bezierCurveTo(x0+Math.cos(a+0.5)*l*0.4,y0+Math.sin(a+0.5)*l*0.4,
      x0+Math.cos(a-0.3)*l*0.7,y0+Math.sin(a-0.3)*l*0.7,x0+Math.cos(a)*l,y0+Math.sin(a)*l);
    ctx.stroke();
  }
  addNoiseOverlay(ctx,W,H,0.04,3);
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights,NW,NH,1.5),
           roughnessMap: heightsToRoughnessMap(heights,NW,NH,0.55,0.1) };
}

// ── Ganymede ──────────────────────────────────────────────────────────────────

function createGanymedeTextures(): PlanetTextures {
  const W=512,H=256,NW=256,NH=128;
  const heights=new Float32Array(NW*NH);
  for (let y=0;y<NH;y++) for (let x=0;x<NW;x++) heights[y*NW+x]=fbm(x/NW*2,y/NH*2,4)*0.55+0.22;
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d')!;
  const img=ctx.createImageData(W,H); const d=img.data;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const h=Math.max(0,Math.min(1,heights[Math.floor(y/H*NH)*NW+Math.floor(x/W*NW)]));
    const c=Math.round(60+h*100); const p=(y*W+x)*4;
    d[p]=c+8; d[p+1]=c+4; d[p+2]=c-4; d[p+3]=255;
  }
  ctx.putImageData(img,0,0);
  ctx.strokeStyle='rgba(160,150,130,0.3)'; ctx.lineWidth=2;
  for (let i=0;i<12;i++) {
    const y0=(i/12)*H; ctx.beginPath(); ctx.moveTo(0,y0+Math.sin(i)*8);
    for (let x=0;x<W;x+=30) ctx.lineTo(x,y0+Math.sin(x*0.02+i)*12+(Math.random()-0.5)*6);
    ctx.stroke();
  }
  addNoiseOverlay(ctx,W,H,0.08,4);
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights,NW,NH,3.0),
           roughnessMap: heightsToRoughnessMap(heights,NW,NH,0.82,0.15) };
}

// ── Callisto ──────────────────────────────────────────────────────────────────

function createCallistoTextures(): PlanetTextures {
  const W=512,H=256,NW=256,NH=128;
  const heights=new Float32Array(NW*NH);
  for (let y=0;y<NH;y++) for (let x=0;x<NW;x++) heights[y*NW+x]=fbm(x/NW*2,y/NH*2,5)*0.4+0.3;
  const craters: [number,number,number][]=Array.from({length:40},()=>[Math.random()*NW,Math.random()*NH,3+Math.random()*14]);
  craters.forEach(([cx,cy,cr])=>{ for (let y2=Math.max(0,cy-cr*1.5);y2<Math.min(NH,cy+cr*1.5);y2++) for (let x2=Math.max(0,cx-cr*1.5);x2<Math.min(NW,cx+cr*1.5);x2++) { const d=Math.sqrt((x2-cx)**2+(y2-cy)**2); if (d<cr) heights[Math.floor(y2)*NW+Math.floor(x2)]-=(1-(d/cr)**2)*0.5; }});
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d')!; const img=ctx.createImageData(W,H); const d=img.data;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const h=Math.max(0,Math.min(1,heights[Math.floor(y/H*NH)*NW+Math.floor(x/W*NW)]));
    const c=Math.round(35+h*80); const p=(y*W+x)*4;
    d[p]=c; d[p+1]=c-3; d[p+2]=c-6; d[p+3]=255;
  }
  ctx.putImageData(img,0,0);
  craters.forEach(([cx,cy,cr])=>{ const sx=cx/NW*W,sy=cy/NH*H,sr=cr/NW*W; ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fillStyle='rgba(15,12,10,0.6)'; ctx.fill(); ctx.strokeStyle='rgba(140,130,120,0.4)'; ctx.lineWidth=1; ctx.stroke(); });
  addNoiseOverlay(ctx,W,H,0.06,5);
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights,NW,NH,3.5),
           roughnessMap: heightsToRoughnessMap(heights,NW,NH,0.88,0.1) };
}

// ── Titan ─────────────────────────────────────────────────────────────────────

function createTitanTextures(): PlanetTextures {
  const W=512,H=256,NW=256,NH=128;
  const heights=new Float32Array(NW*NH);
  for (let y=0;y<NH;y++) for (let x=0;x<NW;x++) heights[y*NW+x]=snoise(x/NW,y/NH,2)*0.3+0.35;
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d')!;
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#8B4513'); g.addColorStop(0.3,'#A0522D'); g.addColorStop(0.5,'#CD853F');
  g.addColorStop(0.7,'#A0522D'); g.addColorStop(1,'#8B4513');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for (let y=0;y<H;y+=6) {
    const wave=Math.sin(y*0.08)*10; const n=snoise(y/H,0.5,2)*0.12;
    ctx.fillStyle=`rgba(${Math.round(180+n*40)},${Math.round(100+n*20)},${Math.round(20+n*10)},0.18)`;
    ctx.fillRect(wave,y,W,6);
  }
  const polar=H*0.12;
  [0,H-polar].forEach(yy=>{ const pg=ctx.createLinearGradient(0,yy,0,yy+polar);
    pg.addColorStop(0,'rgba(220,200,160,0.7)'); pg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=pg; ctx.fillRect(0,yy,W,polar); });
  addNoiseOverlay(ctx,W,H,0.06,3);
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights,NW,NH,1.2),
           roughnessMap: heightsToRoughnessMap(heights,NW,NH,0.92,0.05) };
}

// ── Enceladus ─────────────────────────────────────────────────────────────────

function createEnceladusTextures(): PlanetTextures {
  const W=512,H=256,NW=256,NH=128;
  const heights=new Float32Array(NW*NH);
  for (let y=0;y<NH;y++) for (let x=0;x<NW;x++) heights[y*NW+x]=snoise(x/NW,y/NH,4)*0.15+0.5;
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d')!;
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#f0f8ff'); g.addColorStop(0.5,'#e8f4ff'); g.addColorStop(1,'#f0f8ff');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(100,120,200,0.35)'; ctx.lineWidth=1.2;
  for (let i=0;i<14;i++) {
    const x0=Math.random()*W,y0=H*0.6+Math.random()*H*0.35;
    ctx.beginPath(); ctx.moveTo(x0,y0);
    ctx.lineTo(x0+(Math.random()-0.5)*40,y0-20-Math.random()*30); ctx.stroke();
  }
  addNoiseOverlay(ctx,W,H,0.03,4);
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights,NW,NH,1.0),
           roughnessMap: heightsToRoughnessMap(heights,NW,NH,0.45,0.1) };
}

// ── Fobos ─────────────────────────────────────────────────────────────────────

function createFobosTextures(): PlanetTextures {
  const W=256,H=128,NW=128,NH=64;
  const heights=new Float32Array(NW*NH);
  for (let y=0;y<NH;y++) for (let x=0;x<NW;x++) heights[y*NW+x]=fbm(x/NW*3,y/NH*3,4)*0.5+0.25;
  const craters: [number,number,number][]=[[64,32,22],[30,25,10],[85,45,8],[50,15,6],[100,50,7],[15,45,5],...Array.from({length:15},():[ number,number,number]=>[Math.random()*NW,Math.random()*NH,2+Math.random()*6])];
  craters.forEach(([cx,cy,cr])=>{ for (let y2=Math.max(0,cy-cr*2);y2<Math.min(NH,cy+cr*2);y2++) for (let x2=Math.max(0,cx-cr*2);x2<Math.min(NW,cx+cr*2);x2++) { const d=Math.sqrt((x2-cx)**2+(y2-cy)**2); if (d<cr) heights[Math.floor(y2)*NW+Math.floor(x2)]-=(1-(d/cr)**2)*0.55; }});
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d')!; const img=ctx.createImageData(W,H); const d=img.data;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const h=Math.max(0,Math.min(1,heights[Math.floor(y/H*NH)*NW+Math.floor(x/W*NW)]));
    const c=Math.round(45+h*80); const p=(y*W+x)*4;
    d[p]=c+5; d[p+1]=c+3; d[p+2]=c-2; d[p+3]=255;
  }
  ctx.putImageData(img,0,0);
  craters.forEach(([cx,cy,cr])=>{ const sx=cx/NW*W,sy=cy/NH*H,sr=cr/NW*W*1.5; ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fillStyle='rgba(20,15,10,0.55)'; ctx.fill(); ctx.strokeStyle='rgba(160,150,130,0.3)'; ctx.lineWidth=0.8; ctx.stroke(); });
  addNoiseOverlay(ctx,W,H,0.1,5);
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights,NW,NH,4.5),
           roughnessMap: heightsToRoughnessMap(heights,NW,NH,0.88,0.1) };
}

// ── Triton ────────────────────────────────────────────────────────────────────

function createTritonTextures(): PlanetTextures {
  const W=512,H=256,NW=256,NH=128;
  const heights=new Float32Array(NW*NH);
  for (let y=0;y<NH;y++) for (let x=0;x<NW;x++) heights[y*NW+x]=fbm(x/NW*3,y/NH*3,4)*0.45+0.28;
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d')!; const img=ctx.createImageData(W,H); const d=img.data;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const h=Math.max(0,Math.min(1,heights[Math.floor(y/H*NH)*NW+Math.floor(x/W*NW)]));
    const polar=Math.abs(y/H-0.5)*2; const p=(y*W+x)*4;
    if (polar>0.7) { const s=(polar-0.7)/0.3; d[p]=Math.round(210+s*35); d[p+1]=Math.round(205+s*30); d[p+2]=Math.round(220+s*30); }
    else { d[p]=Math.round(140+h*60); d[p+1]=Math.round(120+h*50); d[p+2]=Math.round(130+h*55); }
    d[p+3]=255;
  }
  ctx.putImageData(img,0,0);
  for (let i=0;i<200;i++) {
    const x=Math.random()*W,y=H*0.2+Math.random()*H*0.6,s=3+Math.random()*10;
    ctx.fillStyle=`rgba(180,160,175,${0.12+Math.random()*0.15})`;
    ctx.beginPath(); ctx.ellipse(x,y,s,s*0.6,Math.random()*Math.PI*2,0,Math.PI*2); ctx.fill();
  }
  addNoiseOverlay(ctx,W,H,0.06,4);
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights,NW,NH,2.8),
           roughnessMap: heightsToRoughnessMap(heights,NW,NH,0.80,0.15) };
}

// ── Generic rocky satellite ───────────────────────────────────────────────────

function createRockySatelliteTextures(baseColor: string): PlanetTextures {
  const W=256,H=128,NW=128,NH=64;
  const heights=new Float32Array(NW*NH);
  for (let y=0;y<NH;y++) for (let x=0;x<NW;x++) heights[y*NW+x]=fbm(x/NW*2,y/NH*2,4)*0.5+0.25;
  const craters: [number,number,number][]=Array.from({length:20},()=>[Math.random()*NW,Math.random()*NH,2+Math.random()*9]);
  craters.forEach(([cx,cy,cr])=>{ for (let y2=Math.max(0,cy-cr*1.5);y2<Math.min(NH,cy+cr*1.5);y2++) for (let x2=Math.max(0,cx-cr*1.5);x2<Math.min(NW,cx+cr*1.5);x2++) { const d=Math.sqrt((x2-cx)**2+(y2-cy)**2); if (d<cr) heights[Math.floor(y2)*NW+Math.floor(x2)]-=(1-(d/cr)**2)*0.4; }});
  const r=parseInt(baseColor.slice(1,3),16)||150;
  const g=parseInt(baseColor.slice(3,5),16)||145;
  const b=parseInt(baseColor.slice(5,7),16)||135;
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d')!; const img=ctx.createImageData(W,H); const data=img.data;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const h=Math.max(0,Math.min(1,heights[Math.floor(y/H*NH)*NW+Math.floor(x/W*NW)]));
    const t=h*0.5+0.5; const p=(y*W+x)*4;
    data[p]=Math.round(r*t*0.9); data[p+1]=Math.round(g*t*0.9); data[p+2]=Math.round(b*t*0.9); data[p+3]=255;
  }
  ctx.putImageData(img,0,0);
  craters.forEach(([cx,cy,cr])=>{ const sx=cx/NW*W,sy=cy/NH*H,sr=cr/NW*W; ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fill(); ctx.strokeStyle='rgba(200,195,185,0.22)'; ctx.lineWidth=0.8; ctx.stroke(); });
  addNoiseOverlay(ctx,W,H,0.09,5);
  return { map: new THREE.CanvasTexture(canvas), normalMap: heightsToNormalMap(heights,NW,NH,3.5),
           roughnessMap: heightsToRoughnessMap(heights,NW,NH,0.85,0.12) };
}

// ── Satellite dispatcher ──────────────────────────────────────────────────────

export function createSatelliteTextures(id: string, color: string): PlanetTextures {
  switch (id) {
    case 'luna':      return createMoonTextures();
    case 'io':        return createIoTextures();
    case 'europa':    return createEuropaTextures();
    case 'ganymede':  return createGanymedeTextures();
    case 'callisto':  return createCallistoTextures();
    case 'titan':     return createTitanTextures();
    case 'enceladus': return createEnceladusTextures();
    case 'fobos':     return createFobosTextures();
    case 'triton':    return createTritonTextures();
    default:          return createRockySatelliteTextures(color);
  }
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

// ── Earth Cloud Layer ─────────────────────────────────────────────────────────

export function createEarthCloudTexture(): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = x / W * 5.5, ny = y / H * 5.5;
      const n1 = fbm(nx, ny, 6);
      const n2 = fbm(nx * 0.45 + 2.1, ny * 0.45 + 1.3, 4);
      const c = n1 * 0.7 + n2 * 0.3;
      const threshold = 0.50;
      const p = (y * W + x) * 4;
      if (c > threshold) {
        const t = Math.min(1, (c - threshold) / 0.45);
        const alpha = Math.round(t * 248);
        const bright = Math.round(228 + t * 22);
        d[p] = bright; d[p+1] = bright; d[p+2] = Math.min(255, bright + 7); d[p+3] = alpha;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// ── Earth Night Lights ────────────────────────────────────────────────────────

export function createEarthNightTexture(): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  const clusters = [
    { cx: 0.218, cy: 0.405, sx: 0.065, sy: 0.040, n: 55 },
    { cx: 0.165, cy: 0.385, sx: 0.055, sy: 0.038, n: 40 },
    { cx: 0.100, cy: 0.408, sx: 0.025, sy: 0.025, n: 18 },
    { cx: 0.490, cy: 0.340, sx: 0.095, sy: 0.045, n: 72 },
    { cx: 0.540, cy: 0.300, sx: 0.070, sy: 0.040, n: 30 },
    { cx: 0.815, cy: 0.388, sx: 0.028, sy: 0.022, n: 42 },
    { cx: 0.788, cy: 0.412, sx: 0.040, sy: 0.038, n: 48 },
    { cx: 0.798, cy: 0.372, sx: 0.018, sy: 0.016, n: 18 },
    { cx: 0.680, cy: 0.455, sx: 0.048, sy: 0.042, n: 32 },
    { cx: 0.762, cy: 0.490, sx: 0.042, sy: 0.035, n: 22 },
    { cx: 0.548, cy: 0.445, sx: 0.038, sy: 0.028, n: 20 },
    { cx: 0.272, cy: 0.588, sx: 0.038, sy: 0.028, n: 18 },
    { cx: 0.848, cy: 0.635, sx: 0.035, sy: 0.038, n: 16 },
    { cx: 0.485, cy: 0.498, sx: 0.028, sy: 0.025, n: 10 },
  ];

  clusters.forEach(({ cx, cy, sx, sy, n }) => {
    for (let i = 0; i < n; i++) {
      const lx = (cx + (Math.random() - 0.5) * sx) * W;
      const ly = (cy + (Math.random() - 0.5) * sy) * H;
      const r = 0.8 + Math.random() * 2.5;
      const a = 0.55 + Math.random() * 0.45;
      const warm = Math.random() > 0.22;
      ctx.fillStyle = warm
        ? `rgba(255,${160 + Math.round(Math.random() * 75)},${20 + Math.round(Math.random() * 50)},${a})`
        : `rgba(200,215,255,${a * 0.65})`;
      ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2); ctx.fill();
    }
    const gx = cx * W, gy = cy * H;
    const gr = Math.max(sx, sy) * W * 1.4;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(255,200,80,${Math.min(0.14, n / 580)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.max(0, gx - gr), Math.max(0, gy - gr), gr * 2, gr * 2);
  });
  return new THREE.CanvasTexture(canvas);
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
