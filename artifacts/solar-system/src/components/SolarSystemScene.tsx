import {
  useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PLANETS, SUN_DATA, type PlanetData, type SatelliteData } from '@/data/planets';
import {
  createSunTexture, createPlanetTextureByType, createSatelliteTextures,
  createSaturnRingTexture, createStarTexture,
  createEarthCloudTexture, createEarthNightTexture,
} from '@/utils/textures';

export interface SceneHandle {
  travelTo: (planetId: string, onArrived?: () => void) => void;
  resetCamera: () => void;
  setTravelMode: (active: boolean) => void;
  focusPlanet: (planetId: string) => void;
}

interface ClickableInfo {
  type: 'sun' | 'planet' | 'satellite';
  planet?: PlanetData;
  sat?: SatelliteData;
}

interface PlanetObject {
  pivot: THREE.Object3D;
  mesh: THREE.Mesh;
  cloudMesh?: THREE.Mesh;
  angle: number;
  data: PlanetData;
  satellites: SatelliteObject[];
}

interface SatelliteObject {
  pivot: THREE.Object3D;
  mesh: THREE.Mesh;
  angle: number;
  speed: number;
}

interface OrbitalTracker {
  group: THREE.Group;
  tailGeo: THREE.BufferGeometry;
  futureGeo: THREE.BufferGeometry;
  futureLine: THREE.Line;
  marker: THREE.Mesh;
  planetId: string;
  distance: number;
}

interface Props {
  speedMultiplier: number;
  onPlanetSelect: (planet: PlanetData | null, isSun?: boolean) => void;
  onSatelliteSelect?: (sat: SatelliteData, planet: PlanetData) => void;
  onLoad: () => void;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

const SolarSystemScene = forwardRef<SceneHandle, Props>(
  ({ speedMultiplier, onPlanetSelect, onSatelliteSelect, onLoad }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const speedRef = useRef(speedMultiplier);
    const planetObjectsRef = useRef<Map<string, PlanetObject>>(new Map());
    const sunMeshRef = useRef<THREE.Mesh | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameRef = useRef<number>(0);
    const lerpRef = useRef(false);
    const spaceshipRef = useRef<THREE.Group | null>(null);
    const travelModeRef = useRef(false);
    const hoveredRef = useRef<THREE.Mesh | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const trailPointsRef = useRef<THREE.Vector3[]>([]);
    const trailLineRef = useRef<THREE.Line | null>(null);
    const orbitalTrackerRef = useRef<OrbitalTracker | null>(null);
    const createOrbitalTrackerRef = useRef<((id: string) => void) | null>(null);
    const clearOrbitalTrackerRef = useRef<(() => void) | null>(null);
    const clickableRef = useRef<Map<THREE.Mesh, ClickableInfo>>(new Map());

    useEffect(() => { speedRef.current = speedMultiplier; }, [speedMultiplier]);

    // ── Imperative API ────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      travelTo(planetId, onArrived) {
        const cam = cameraRef.current as THREE.PerspectiveCamera | null;
        const ctrl = controlsRef.current as OrbitControls | null;
        if (!cam || !ctrl) return;
        const safeC = cam, safeCt = ctrl;

        let worldPos = new THREE.Vector3(0, 0, 0);
        let offset = 12;

        if (planetId === 'sun') {
          offset = 12;
        } else {
          const obj = planetObjectsRef.current.get(planetId);
          if (obj) {
            obj.mesh.getWorldPosition(worldPos);
            offset = obj.data.radius * 6 + 5;
          }
        }

        // Move spaceship to destination
        const ship = spaceshipRef.current;
        if (ship && travelModeRef.current) {
          ship.visible = true;
          ship.position.copy(worldPos);
          ship.position.x += offset * 0.4;
          ship.position.y += offset * 0.25;
        }

        const targetCamPos = worldPos.clone().add(new THREE.Vector3(0, offset * 0.5, offset));
        const start = safeC.position.clone();
        const startTarget = safeCt.target.clone();
        let t = 0;
        lerpRef.current = true;

        function lerp() {
          t += 0.005;
          if (t >= 1) {
            safeC.position.copy(targetCamPos);
            safeCt.target.copy(worldPos);
            safeCt.update();
            lerpRef.current = false;

            // Add to travel trail
            if (travelModeRef.current) {
              trailPointsRef.current.push(worldPos.clone());
              updateTrail();
            }

            onArrived?.();
            return;
          }
          const e = easeInOut(Math.min(t, 1));
          safeC.position.lerpVectors(start, targetCamPos, e);
          safeCt.target.lerpVectors(startTarget, worldPos, e);
          safeCt.update();
          requestAnimationFrame(lerp);
        }
        lerp();
      },

      resetCamera() {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        if (!cam || !ctrl) return;
        const safeC2 = cam, safeCt2 = ctrl;
        const start = safeC2.position.clone();
        const startTarget = safeCt2.target.clone();
        const end = new THREE.Vector3(0, 40, 120);
        let t = 0;
        lerpRef.current = true;
        function lerp() {
          t += 0.02;
          if (t >= 1) {
            safeC2.position.copy(end);
            safeCt2.target.set(0, 0, 0);
            safeCt2.update();
            lerpRef.current = false;
            return;
          }
          const e = easeInOut(t);
          safeC2.position.lerpVectors(start, end, e);
          safeCt2.target.lerpVectors(startTarget, new THREE.Vector3(), e);
          safeCt2.update();
          requestAnimationFrame(lerp);
        }
        lerp();
      },

      setTravelMode(active) {
        travelModeRef.current = active;
        if (spaceshipRef.current) spaceshipRef.current.visible = active;
        clearOrbitalTrackerRef.current?.();
        if (!active) {
          trailPointsRef.current = [];
          if (trailLineRef.current && sceneRef.current) {
            sceneRef.current.remove(trailLineRef.current);
            trailLineRef.current.geometry.dispose();
            (trailLineRef.current.material as THREE.Material).dispose();
            trailLineRef.current = null;
          }
        }
      },

      focusPlanet(planetId) {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        if (!cam || !ctrl) return;
        const safeC = cam, safeCt = ctrl;

        let worldPos = new THREE.Vector3(0, 0, 0);
        let radius = SUN_DATA.radius;

        if (planetId !== 'sun') {
          const obj = planetObjectsRef.current.get(planetId);
          if (!obj) return;
          obj.mesh.getWorldPosition(worldPos);
          radius = obj.data.radius;
        }

        const offset = radius * 6 + 5;
        const targetCamPos = worldPos.clone().add(new THREE.Vector3(0, offset * 0.42, offset));
        const start = safeC.position.clone();
        const startTarget = safeCt.target.clone();
        let t = 0;
        lerpRef.current = true;

        if (planetId !== 'sun') {
          createOrbitalTrackerRef.current?.(planetId);
        } else {
          clearOrbitalTrackerRef.current?.();
        }

        function focusLerp() {
          t += 0.016;
          if (t >= 1) {
            safeC.position.copy(targetCamPos);
            safeCt.target.copy(worldPos);
            safeCt.update();
            lerpRef.current = false;
            return;
          }
          const e = easeInOut(t);
          safeC.position.lerpVectors(start, targetCamPos, e);
          safeCt.target.lerpVectors(startTarget, worldPos, e);
          safeCt.update();
          requestAnimationFrame(focusLerp);
        }
        focusLerp();
      },
    }));

    function updateTrail() {
      const sc = sceneRef.current;
      if (!sc) return;
      const pts = trailPointsRef.current;
      if (pts.length < 2) return;

      const curve = new THREE.CatmullRomCurve3(pts);
      const curvePoints = curve.getPoints(pts.length * 30);

      if (!trailLineRef.current) {
        const mat = new THREE.LineDashedMaterial({
          color: 0x4a9eff,
          transparent: true,
          opacity: 0.70,
          dashSize: 2.0,
          gapSize: 1.0,
          depthWrite: false,
        });
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curvePoints), mat);
        line.computeLineDistances();
        sc.add(line);
        trailLineRef.current = line;
      } else {
        // Dispose old geometry before replacing to avoid buffer size warning
        trailLineRef.current.geometry.dispose();
        trailLineRef.current.geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        trailLineRef.current.computeLineDistances();
      }
    }

    const handlePlanetClick = useCallback(onPlanetSelect, [onPlanetSelect]);
    const handleSatelliteClick = useCallback(
      (sat: SatelliteData, planet: PlanetData) => onSatelliteSelect?.(sat, planet),
      [onSatelliteSelect]
    );

    useEffect(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;

      // WebGL check
      const testCanvas = document.createElement('canvas');
      const hasWebGL = !!(
        testCanvas.getContext('webgl2') ||
        testCanvas.getContext('webgl') ||
        (testCanvas.getContext as unknown as (t: string) => unknown)('experimental-webgl')
      );

      if (!hasWebGL) {
        container.innerHTML = `
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:#e8eeff;font-family:Inter,sans-serif;text-align:center;padding:40px;">
            <div style="font-size:52px">🪐</div>
            <h2 style="font-size:24px;font-weight:700;letter-spacing:0.05em;">Sistema Solar 3D listo</h2>
            <p style="font-size:14px;color:rgba(180,200,255,0.65);max-width:400px;line-height:1.7;">La visualización requiere WebGL (aceleración gráfica). Despliega la app para verla en tu navegador.</p>
            <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:8px;">
              <div style="padding:12px 18px;background:rgba(255,255,255,0.04);border:1px solid rgba(100,150,255,0.2);border-radius:10px;font-size:12px;color:rgba(180,200,255,0.7);">☀ Sol + 8 planetas en órbita</div>
              <div style="padding:12px 18px;background:rgba(255,255,255,0.04);border:1px solid rgba(100,150,255,0.2);border-radius:10px;font-size:12px;color:rgba(180,200,255,0.7);">🌙 Satélites naturales y artificiales</div>
              <div style="padding:12px 18px;background:rgba(79,195,247,0.07);border:1px solid rgba(79,195,247,0.25);border-radius:10px;font-size:12px;color:rgba(79,195,247,0.85);">🛸 Modo Viaje con narración en español</div>
            </div>
          </div>`;
        onLoad();
        return;
      }

      // ── Renderer ─────────────────────────────────────────────────────────
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      } catch {
        try { renderer = new THREE.WebGLRenderer({ antialias: false }); }
        catch { onLoad(); return; }
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.6;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      container.appendChild(renderer.domElement);

      // ── Scene ─────────────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#000008');
      scene.fog = new THREE.FogExp2('#000010', 0.0018);
      sceneRef.current = scene;

      // ── Camera ────────────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(
        55, container.clientWidth / container.clientHeight, 0.05, 2000
      );
      camera.position.set(0, 40, 120);
      cameraRef.current = camera;

      // ── Controls ──────────────────────────────────────────────────────────
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 1.5;
      controls.maxDistance = 400;
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // ── Post-processing ───────────────────────────────────────────────────
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.70, 0.40, 0.52
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());

      // ── Lighting ──────────────────────────────────────────────────────────
      // Ambient — strong enough that the dark side is visible, not pitch black
      scene.add(new THREE.AmbientLight(0x1a2a5e, 2.2));
      // Hemisphere: space blue above, dark navy below — gives depth
      const hemi = new THREE.HemisphereLight(0x334488, 0x111133, 0.55);
      scene.add(hemi);
      // Sun point light — decay=0 so ALL planets (even Neptune) receive light
      const sunLight = new THREE.PointLight(0xfff8e8, 3.5, 0);
      sunLight.decay = 0;
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.radius = 2;
      scene.add(sunLight);
      // Warm secondary fill — also no falloff
      const sunFill = new THREE.PointLight(0xff9944, 1.6, 0);
      sunFill.decay = 0;
      scene.add(sunFill);

      // ── Stars ─────────────────────────────────────────────────────────────
      const starTex = createStarTexture();

      function makeStarLayer(count: number, rMin: number, rMax: number, size: number, speed: number) {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          const r = rMin + Math.random() * (rMax - rMin);
          pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          pos[i * 3 + 2] = r * Math.cos(phi);
          const c = Math.random();
          if (c < 0.62) { col[i*3]=1; col[i*3+1]=1; col[i*3+2]=1; }
          else if (c < 0.80) { col[i*3]=0.75; col[i*3+1]=0.82; col[i*3+2]=1; }
          else { col[i*3]=1; col[i*3+1]=0.88; col[i*3+2]=0.55; }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const mat = new THREE.PointsMaterial({
          size, map: starTex, vertexColors: true,
          transparent: true, sizeAttenuation: true, alphaTest: 0.01, depthWrite: false,
        });
        const pts = new THREE.Points(geo, mat);
        scene.add(pts);
        return { pts, speed };
      }

      const starLayers = [
        makeStarLayer(4000, 350, 520, 1.5, 0.00004),
        makeStarLayer(5000, 520, 900, 0.8, 0.00001),
      ];

      // ── Sun ───────────────────────────────────────────────────────────────
      const sunGeo = new THREE.SphereGeometry(SUN_DATA.radius, 56, 56);
      const sunMat = new THREE.MeshStandardMaterial({
        map: createSunTexture(),
        emissive: new THREE.Color('#ff8800'),
        emissiveIntensity: 2.2,
        roughness: 1.0,
        metalness: 0,
      });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      scene.add(sunMesh);
      sunMeshRef.current = sunMesh;
      clickableRef.current.set(sunMesh, { type: 'sun' });

      // Sun glow halos
      [
        { r: 1.22, c: '#ff7700', o: 0.20 },
        { r: 1.52, c: '#ff4400', o: 0.09 },
        { r: 2.1,  c: '#ff2200', o: 0.04 },
      ].forEach(({ r, c, o }) => {
        const m = new THREE.MeshBasicMaterial({
          color: c, transparent: true, opacity: o, side: THREE.BackSide, depthWrite: false,
        });
        scene.add(new THREE.Mesh(new THREE.SphereGeometry(SUN_DATA.radius * r, 32, 32), m));
      });

      // ── Orbit ring helper ─────────────────────────────────────────────────
      function createOrbitRing(radius: number, opacity = 0.28, color = 0x2a4060) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 128; i++) {
          const a = (i / 128) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return new THREE.Line(geo, new THREE.LineBasicMaterial({
          color, transparent: true, opacity, depthWrite: false,
        }));
      }

      // ── Planets ───────────────────────────────────────────────────────────
      const planetObjects = new Map<string, PlanetObject>();
      const clickable = clickableRef.current;

      PLANETS.forEach((planet) => {
        scene.add(createOrbitRing(planet.distance));
        const pivot = new THREE.Object3D();
        scene.add(pivot);

        const geo = new THREE.SphereGeometry(planet.radius, 64, 64);
        const textures = createPlanetTextureByType(planet.textureType, planet.color);
        const isGasGiant = ['jupiter','saturn','uranus','neptune'].includes(planet.id);
        const isRocky    = ['mercury','venus','earth','mars'].includes(planet.id);
        let cloudMesh: THREE.Mesh | undefined;
        const isEarth = planet.id === 'earth';
        const earthNightTex = isEarth ? createEarthNightTexture() : undefined;
        const mat = new THREE.MeshStandardMaterial({
          map: textures.map,
          normalMap: textures.normalMap,
          normalScale: new THREE.Vector2(
            isRocky ? 1.5 : isGasGiant ? 0.50 : 0.90,
            isRocky ? 1.5 : isGasGiant ? 0.50 : 0.90
          ),
          ...(textures.roughnessMap
            ? { roughnessMap: textures.roughnessMap }
            : { roughness: isGasGiant ? 0.80 : 0.72 }),
          metalness: isEarth ? 0.03 : 0.0,
          ...(earthNightTex ? {
            emissiveMap: earthNightTex,
            emissive: new THREE.Color('#ffffff'),
            emissiveIntensity: 0.90,
          } : {
            emissive: new THREE.Color(planet.emissive ?? '#000000'),
            emissiveIntensity: 0.18,
          }),
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(planet.distance, 0, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (planet.tilt) mesh.rotation.z = planet.tilt;
        pivot.add(mesh);
        clickable.set(mesh, { type: 'planet', planet });

        // Atmosphere glow — layered for more physical look
        if (planet.atmosphereColor) {
          const ac = new THREE.Color(planet.atmosphereColor);
          const layers = [
            { scale: 1.04, opacity: 0.22 },
            { scale: 1.10, opacity: 0.10 },
            { scale: 1.22, opacity: 0.04 },
          ];
          layers.forEach(({ scale, opacity }) => {
            mesh.add(new THREE.Mesh(
              new THREE.SphereGeometry(planet.radius * scale, 32, 32),
              new THREE.MeshBasicMaterial({ color: ac, transparent: true, opacity, side: THREE.BackSide, depthWrite: false })
            ));
          });
        }

        // Earth: dynamic cloud layer
        if (isEarth) {
          const cloudTex = createEarthCloudTexture();
          const cloudMat = new THREE.MeshStandardMaterial({
            map: cloudTex,
            transparent: true,
            opacity: 0.88,
            depthWrite: false,
            roughness: 1.0,
            metalness: 0.0,
            emissive: new THREE.Color('#ffffff'),
            emissiveIntensity: 0.03,
          });
          cloudMesh = new THREE.Mesh(
            new THREE.SphereGeometry(planet.radius * 1.028, 48, 48),
            cloudMat,
          );
          mesh.add(cloudMesh);
        }

        // Saturn rings
        if (planet.hasRings) {
          const ringGeo = new THREE.RingGeometry(planet.ringInner!, planet.ringOuter!, 140);
          const ringTex = createSaturnRingTexture();
          const pos = ringGeo.attributes.position as THREE.BufferAttribute;
          const uv = ringGeo.attributes.uv as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            const d = Math.sqrt(x * x + z * z);
            uv.setXY(i, (d - planet.ringInner!) / (planet.ringOuter! - planet.ringInner!), 0.5);
          }
          const ringMat = new THREE.MeshBasicMaterial({
            map: ringTex, transparent: true, opacity: planet.ringOpacity ?? 0.78,
            side: THREE.DoubleSide, depthWrite: false,
          });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.rotation.x = Math.PI / 2;
          mesh.add(ringMesh);
        }

        // Satellites
        const satObjects: SatelliteObject[] = [];
        planet.satellites.forEach((sat) => {
          const satPivot = new THREE.Object3D();
          // Slight orbital inclination for natural moons for visual realism
          if (!sat.isArtificial) satPivot.rotation.x = (Math.random() - 0.5) * 0.18;
          mesh.add(satPivot);

          const satSegments = sat.isArtificial ? 12 : 24;
          const satGeo = new THREE.SphereGeometry(sat.radius, satSegments, satSegments);

          let satMat: THREE.MeshStandardMaterial;
          if (sat.isArtificial) {
            // Artificial satellites: metallic look with gentle glow
            satMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(sat.color),
              roughness: 0.18,
              metalness: 0.85,
              emissive: new THREE.Color(sat.color),
              emissiveIntensity: 0.55,
            });
          } else {
            const st = createSatelliteTextures(sat.id, sat.color);
            satMat = new THREE.MeshStandardMaterial({
              map: st.map,
              normalMap: st.normalMap,
              normalScale: new THREE.Vector2(1.8, 1.8),
              ...(st.roughnessMap
                ? { roughnessMap: st.roughnessMap }
                : { roughness: 0.90 }),
              metalness: 0.0,
              emissive: new THREE.Color('#000000'),
              emissiveIntensity: 0.0,
            });
          }

          const satMesh = new THREE.Mesh(satGeo, satMat);
          satMesh.position.set(sat.orbitRadius, 0, 0);
          satMesh.castShadow = true;
          satPivot.add(satMesh);
          clickable.set(satMesh, { type: 'satellite', sat, planet });

          // Artificial satellite visual extensions (solar panels / structure)
          if (sat.isArtificial) {
            const panelColor = sat.id === 'arsat1' ? '#ddcc44' : '#1a3a7a';
            const panelMat = new THREE.MeshStandardMaterial({
              color: panelColor, roughness: 0.18, metalness: 0.75,
              emissive: new THREE.Color(panelColor), emissiveIntensity: 0.18,
            });
            if (sat.id === 'iss') {
              const wings = new THREE.Mesh(
                new THREE.BoxGeometry(sat.radius * 10, sat.radius * 0.25, sat.radius * 2.2),
                panelMat,
              );
              satMesh.add(wings);
              const truss = new THREE.Mesh(
                new THREE.BoxGeometry(sat.radius * 0.4, sat.radius * 0.25, sat.radius * 4.5),
                new THREE.MeshStandardMaterial({ color: '#8899aa', roughness: 0.3, metalness: 0.8 }),
              );
              satMesh.add(truss);
            } else if (sat.id === 'hubble') {
              const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(sat.radius * 0.7, sat.radius * 0.7, sat.radius * 4, 10),
                new THREE.MeshStandardMaterial({ color: '#c0c8d8', roughness: 0.22, metalness: 0.72 }),
              );
              barrel.rotation.z = Math.PI / 2;
              satMesh.add(barrel);
              const panels = new THREE.Mesh(
                new THREE.BoxGeometry(sat.radius * 7, sat.radius * 0.2, sat.radius * 2),
                panelMat,
              );
              satMesh.add(panels);
            } else if (sat.id === 'arsat1') {
              const body = new THREE.Mesh(
                new THREE.BoxGeometry(sat.radius * 2, sat.radius * 2.8, sat.radius * 2),
                new THREE.MeshStandardMaterial({ color: '#b8a840', roughness: 0.3, metalness: 0.65 }),
              );
              satMesh.add(body);
              const solPanels = new THREE.Mesh(
                new THREE.BoxGeometry(sat.radius * 7, sat.radius * 0.15, sat.radius * 2.2),
                panelMat,
              );
              satMesh.add(solPanels);
            }
          }

          // Satellite orbit ring
          const satOrbPts: THREE.Vector3[] = [];
          for (let i = 0; i <= 80; i++) {
            const a = (i / 80) * Math.PI * 2;
            satOrbPts.push(new THREE.Vector3(Math.cos(a) * sat.orbitRadius, 0, Math.sin(a) * sat.orbitRadius));
          }
          const satOrbMat = new THREE.LineBasicMaterial({
            color: sat.isArtificial ? 0x44aaff : 0x2a4055,
            transparent: true, opacity: sat.isArtificial ? 0.65 : 0.28, depthWrite: false,
          });
          mesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(satOrbPts), satOrbMat));

          satObjects.push({
            pivot: satPivot, mesh: satMesh,
            angle: Math.random() * Math.PI * 2, speed: sat.orbitSpeed,
          });
        });

        const startAngle = Math.random() * Math.PI * 2;
        pivot.rotation.y = startAngle;
        planetObjects.set(planet.id, { pivot, mesh, cloudMesh, angle: startAngle, data: planet, satellites: satObjects });
      });

      planetObjectsRef.current = planetObjects;

      // ── Orbital Trail System ──────────────────────────────────────────────
      function clearOrbitalTracker() {
        const tracker = orbitalTrackerRef.current;
        if (!tracker) return;
        scene.remove(tracker.group);
        tracker.group.traverse((child) => {
          if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              (child.material as THREE.Material[]).forEach(m => m.dispose());
            } else {
              (child.material as THREE.Material).dispose();
            }
          }
        });
        orbitalTrackerRef.current = null;
      }

      function createOrbitalTracker(planetId: string) {
        clearOrbitalTracker();
        const obj = planetObjects.get(planetId);
        if (!obj) return;

        const dist = obj.data.distance;
        const group = new THREE.Group();

        // Full orbit glow ring
        const orbitPts: THREE.Vector3[] = [];
        for (let i = 0; i <= 128; i++) {
          const a = (i / 128) * Math.PI * 2;
          orbitPts.push(new THREE.Vector3(Math.cos(a) * dist, 0, Math.sin(a) * dist));
        }
        group.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(orbitPts),
          new THREE.LineBasicMaterial({ color: 0x4a9eff, transparent: true, opacity: 0.55, depthWrite: false }),
        ));

        // Tail arc: 180° behind planet (updated per frame)
        const tailPts = Array.from({ length: 49 }, () => new THREE.Vector3());
        const tailGeo = new THREE.BufferGeometry().setFromPoints(tailPts);
        group.add(new THREE.Line(
          tailGeo,
          new THREE.LineBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.82, depthWrite: false }),
        ));

        // Future arc: 90° ahead (dashed, updated per frame)
        const futurePts = Array.from({ length: 25 }, () => new THREE.Vector3());
        const futureGeo = new THREE.BufferGeometry().setFromPoints(futurePts);
        const futureLine = new THREE.Line(
          futureGeo,
          new THREE.LineDashedMaterial({
            color: 0xaaccff, transparent: true, opacity: 0.40,
            depthWrite: false, dashSize: 1.8, gapSize: 1.0,
          }),
        );
        group.add(futureLine);

        // Glowing position indicator at current planet location
        const markerRadius = Math.max(0.18, obj.data.radius * 0.25);
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(markerRadius, 12, 12),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(obj.data.color),
            emissive: new THREE.Color(0x4a9eff),
            emissiveIntensity: 2.8,
            roughness: 0.0,
            metalness: 0.0,
          }),
        );
        group.add(marker);

        scene.add(group);
        orbitalTrackerRef.current = { group, tailGeo, futureGeo, futureLine, marker, planetId, distance: dist };
      }

      function updateOrbitalTracker() {
        const tracker = orbitalTrackerRef.current;
        if (!tracker) return;
        const obj = planetObjects.get(tracker.planetId);
        if (!obj) return;

        const dist = tracker.distance;
        const angle = obj.angle;

        // Trailing arc: 180° behind current position
        const tailPts: THREE.Vector3[] = [];
        for (let i = 0; i <= 48; i++) {
          const a = (angle - Math.PI) + (i / 48) * Math.PI;
          tailPts.push(new THREE.Vector3(Math.cos(a) * dist, 0, Math.sin(a) * dist));
        }
        tracker.tailGeo.setFromPoints(tailPts);

        // Future arc: 90° ahead
        const futurePts: THREE.Vector3[] = [];
        for (let i = 0; i <= 24; i++) {
          const a = angle + (i / 24) * (Math.PI / 2);
          futurePts.push(new THREE.Vector3(Math.cos(a) * dist, 0, Math.sin(a) * dist));
        }
        tracker.futureGeo.setFromPoints(futurePts);
        tracker.futureLine.computeLineDistances();

        // Move position marker to current planet location
        tracker.marker.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      }

      createOrbitalTrackerRef.current = createOrbitalTracker;
      clearOrbitalTrackerRef.current = clearOrbitalTracker;

      // ── Asteroid Belt ─────────────────────────────────────────────────────
      const beltCount = 3200;
      const beltPos = new Float32Array(beltCount * 3);
      const beltCol = new Float32Array(beltCount * 3);
      for (let i = 0; i < beltCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 33 + Math.random() * 8;
        const y = (Math.random() - 0.5) * 2.8;
        beltPos[i * 3] = Math.cos(angle) * r;
        beltPos[i * 3 + 1] = y;
        beltPos[i * 3 + 2] = Math.sin(angle) * r;
        const g = 0.32 + Math.random() * 0.38;
        beltCol[i * 3] = g + 0.06; beltCol[i * 3 + 1] = g; beltCol[i * 3 + 2] = g * 0.85;
      }
      const beltGeo = new THREE.BufferGeometry();
      beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
      beltGeo.setAttribute('color', new THREE.BufferAttribute(beltCol, 3));
      const beltMat = new THREE.PointsMaterial({
        size: 0.55, vertexColors: true, transparent: true, opacity: 0.62, sizeAttenuation: true, depthWrite: false,
      });
      const asteroidBelt = new THREE.Points(beltGeo, beltMat);
      scene.add(asteroidBelt);

      // ── Spaceship ─────────────────────────────────────────────────────────
      function createSpaceship(): THREE.Group {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: '#c0c8e0', roughness: 0.22, metalness: 0.82 });
        const darkMat = new THREE.MeshStandardMaterial({ color: '#7888a8', roughness: 0.32, metalness: 0.72 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 0.38, 12), bodyMat);
        group.add(body);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.20, 12), bodyMat);
        nose.position.y = 0.29; group.add(nose);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.016, 0.22), darkMat);
        wing.position.y = -0.06; group.add(wing);
        const wingB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.011, 0.13), darkMat);
        wingB.position.set(0, -0.11, 0.09); group.add(wingB);
        const cockpitMat = new THREE.MeshStandardMaterial({
          color: '#80ccff', roughness: 0.04, metalness: 0.5,
          transparent: true, opacity: 0.85,
          emissive: new THREE.Color('#3388cc'), emissiveIntensity: 0.5,
        });
        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 14), cockpitMat);
        cockpit.position.y = 0.19; group.add(cockpit);
        const engineMat = new THREE.MeshBasicMaterial({ color: '#4488ff', transparent: true, opacity: 0.92 });
        const engine = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), engineMat);
        engine.position.y = -0.22; group.add(engine);
        const trailMat = new THREE.MeshBasicMaterial({ color: '#88aaff', transparent: true, opacity: 0.42 });
        const trail = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.20, 10), trailMat);
        trail.position.y = -0.32; trail.rotation.z = Math.PI; group.add(trail);
        group.scale.setScalar(1.6);
        group.visible = false;
        return group;
      }
      const spaceship = createSpaceship();
      scene.add(spaceship);
      spaceshipRef.current = spaceship;

      // ── Raycaster ─────────────────────────────────────────────────────────
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      function animateCameraTo(worldPos: THREE.Vector3, radius: number) {
        const cam = cameraRef.current!;
        const ctrl = controlsRef.current!;
        const offset = radius * 6 + 5;
        const targetPos = worldPos.clone().add(new THREE.Vector3(0, offset * 0.42, offset));
        const start = cam.position.clone();
        const startTarget = ctrl.target.clone();
        let t = 0;
        lerpRef.current = true;
        function lerp() {
          t += 0.016;
          if (t >= 1) {
            cam.position.copy(targetPos);
            ctrl.target.copy(worldPos);
            ctrl.update();
            lerpRef.current = false;
            return;
          }
          const e = easeInOut(t);
          cam.position.lerpVectors(start, targetPos, e);
          ctrl.target.lerpVectors(startTarget, worldPos, e);
          ctrl.update();
          requestAnimationFrame(lerp);
        }
        lerp();
      }

      function onClick(e: MouseEvent) {
        if (lerpRef.current || travelModeRef.current) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const allMeshes = Array.from(clickable.keys());
        const hits = raycaster.intersectObjects(allMeshes, false);
        if (!hits.length) { handlePlanetClick(null, false); clearOrbitalTracker(); return; }

        const hitMesh = hits[0].object as THREE.Mesh;
        const info = clickable.get(hitMesh);
        if (!info) return;

        if (info.type === 'sun') {
          handlePlanetClick(null, true);
          animateCameraTo(new THREE.Vector3(0, 0, 0), SUN_DATA.radius);
          clearOrbitalTracker();
        } else if (info.type === 'planet' && info.planet) {
          handlePlanetClick(info.planet, false);
          const wp = new THREE.Vector3();
          hitMesh.getWorldPosition(wp);
          animateCameraTo(wp, info.planet.radius);
          createOrbitalTracker(info.planet.id);
        } else if (info.type === 'satellite' && info.sat && info.planet) {
          handleSatelliteClick(info.sat, info.planet);
          const wp = new THREE.Vector3();
          hitMesh.getWorldPosition(wp);
          animateCameraTo(wp, info.sat.radius * 8);
          clearOrbitalTracker();
        }
      }

      function onMouseMove(e: MouseEvent) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const allMeshes = Array.from(clickable.keys());
        const hits = raycaster.intersectObjects(allMeshes, false);
        const prev = hoveredRef.current;

        if (hits.length) {
          const hitMesh = hits[0].object as THREE.Mesh;
          if (prev !== hitMesh) {
            if (prev) {
              const prevMat = prev.material as THREE.MeshStandardMaterial;
              if (prevMat.emissiveIntensity !== undefined) prevMat.emissiveIntensity = 0.18;
            }
            hoveredRef.current = hitMesh;
            const hitMat = hitMesh.material as THREE.MeshStandardMaterial;
            if (hitMat.emissiveIntensity !== undefined) hitMat.emissiveIntensity = 0.52;
          }
          renderer.domElement.style.cursor = 'pointer';
        } else {
          if (prev) {
            const prevMat = prev.material as THREE.MeshStandardMaterial;
            if (prevMat.emissiveIntensity !== undefined) prevMat.emissiveIntensity = 0.18;
          }
          hoveredRef.current = null;
          renderer.domElement.style.cursor = 'default';
        }
      }

      renderer.domElement.addEventListener('click', onClick);
      renderer.domElement.addEventListener('mousemove', onMouseMove);

      // ── Animation loop ────────────────────────────────────────────────────
      let lastTime = performance.now();

      function animate() {
        frameRef.current = requestAnimationFrame(animate);
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        const speed = speedRef.current;

        sunMesh.rotation.y += 0.004 * delta * 60;

        planetObjects.forEach((obj) => {
          obj.angle += obj.data.orbitSpeed * delta * speed * 0.1;
          obj.pivot.rotation.y = obj.angle;
          obj.mesh.rotation.y += obj.data.rotationSpeed * delta * speed * 0.05;
          if (obj.cloudMesh) {
            obj.cloudMesh.rotation.y += obj.data.rotationSpeed * delta * speed * 0.058;
          }
          obj.satellites.forEach((sat) => {
            sat.angle += sat.speed * delta * speed * 0.15;
            sat.pivot.rotation.y = sat.angle;
          });
        });

        updateOrbitalTracker();

        asteroidBelt.rotation.y += 0.0018 * delta * speed;
        starLayers.forEach(({ pts, speed: s }) => { pts.rotation.y += s * delta * 60; });

        // Spaceship engine pulse
        if (spaceship.visible) {
          const t = now * 0.003;
          const engine = spaceship.children[spaceship.children.length - 2] as THREE.Mesh;
          if (engine) (engine.material as THREE.MeshBasicMaterial).opacity = 0.72 + Math.sin(t) * 0.24;
        }

        controls.update();
        composer.render();
      }
      animate();

      // ── Resize ────────────────────────────────────────────────────────────
      function onResize() {
        const w = container.clientWidth, h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
        bloomPass.resolution.set(w, h);
      }
      window.addEventListener('resize', onResize);

      onLoad();

      return () => {
        cancelAnimationFrame(frameRef.current);
        clearOrbitalTracker();
        window.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.dispose();
        composer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        sceneRef.current = null;
        clickableRef.current.clear();
      };
    }, []); // eslint-disable-line

    return <div ref={containerRef} className="w-full h-full" />;
  }
);

SolarSystemScene.displayName = 'SolarSystemScene';
export default SolarSystemScene;
