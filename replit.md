# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Sistema Solar 3D (`artifacts/solar-system`)
- **Framework**: React + Vite + TypeScript
- **3D Engine**: Three.js with post-processing (UnrealBloomPass)
- **Preview path**: `/`
- **Port**: 21688

#### Features
- 8 planets + Sun with procedural textures unique per planet (craters, bands, polar caps, Great Red Spot, etc.)
- Orbital animation with speed control, realistic planet axial tilt
- Saturn rings with RingGeometry + custom UV mapping
- Atmospheric glow layers for Earth, Venus, Mars, Uranus, Neptune
- Asteroid belt (2800 particles) between Mars and Jupiter
- Natural satellites: Luna, Fobos/Deimos, 4 Galilean moons, Titán/Encélado/Rea, Miranda/Ariel, Tritón/Nereida
- Artificial satellites for Earth: ISS (fast LEO), Hubble (MEO), ARSAT-1 (geostationary)
- Bloom post-processing (EffectComposer + UnrealBloomPass + OutputPass)
- Two-layer parallax starfield
- Geometric spaceship model shown in travel mode
- **Modo Viaje**: cinematic camera tour, Web Speech API narration in Spanish, skip/pause/stop controls
- InfoPanel with 3 tabs: Info | Satélites | Curiosidades
- Orbitron + Inter typography
- Hover highlight on planets (raycaster), click-to-zoom with eased lerp camera
- WebGL fallback UI when hardware acceleration unavailable (e.g. Replit preview)
- Responsive design (desktop priority, mobile functional)

#### File Structure
```
artifacts/solar-system/src/
  data/planets.ts          — All planet/satellite data + narration texts
  utils/textures.ts        — Procedural CanvasTexture generators per planet
  components/
    SolarSystemScene.tsx   — Three.js scene (forwardRef + SceneHandle imperative API)
    InfoPanel.tsx          — Tabbed glassmorphism info panel
    TravelMode.tsx         — Travel mode overlay + speech synthesis
    Controls.tsx           — Speed slider + reset camera
    Loader.tsx             — Animated loading screen
  App.tsx                  — Root state management
  index.css                — Space theme CSS (glass, Orbitron, animations)
```
