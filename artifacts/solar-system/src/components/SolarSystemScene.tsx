import {
  useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PLANETS, SUN_DATA, type PlanetData } from '@/data/planets';
import {
  createSunTexture, createPlanetTextureByType, createMoonTexture,
  createSaturnRingTexture, createStarTexture,
} from '@/utils/textures';

export interface SceneHandle {
  travelTo: (planetId: string, onArrived?: () => void) => void;
  resetCamera: () => void;
  setTravelMode: (active: boolean) => void;
}

interface PlanetObject {
  pivot: THREE.Object3D;
  mesh: THREE.Mesh;
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

interface Props {
  speedMultiplier: number;
  onPlanetSelect: (planet: PlanetData | null, isSun?: boolean) => void;
  onLoad: () => void;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

const SolarSystemScene = forwardRef<SceneHandle, Props>(
  ({ speedMultiplier, onPlanetSelect, onLoad }, ref) => {
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

    useEffect(() => { speedRef.current = speedMultiplier; }, [speedMultiplier]);

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      travelTo(planetId, onArrived) {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        if (!cam || !ctrl) return;

        let worldPos = new THREE.Vector3(0, 0, 0);
        let offset = 12;

        if (planetId === 'sun') {
          worldPos.set(0, 0, 0);
          offset = 10;
        } else {
          const obj = planetObjectsRef.current.get(planetId);
          if (obj) {
            obj.mesh.getWorldPosition(worldPos);
            offset = obj.data.radius * 6 + 5;
          }
        }

        // Move spaceship
        const ship = spaceshipRef.current;
        if (ship && travelModeRef.current) {
          ship.visible = true;
          ship.position.copy(worldPos);
          ship.position.x += offset * 0.5;
          ship.position.y += offset * 0.3;
        }

        const targetCamPos = worldPos.clone().add(new THREE.Vector3(0, offset * 0.5, offset));
        const start = cam.position.clone();
        const startTarget = ctrl.target.clone();
        let t = 0;
        lerpRef.current = true;

        function lerp() {
          t += 0.015;
          if (t >= 1) {
            cam.position.copy(targetCamPos);
            ctrl.target.copy(worldPos);
            ctrl.update();
            lerpRef.current = false;
            onArrived?.();
            return;
          }
          const e = easeInOut(Math.min(t, 1));
          cam.position.lerpVectors(start, targetCamPos, e);
          ctrl.target.lerpVectors(startTarget, worldPos, e);
          ctrl.update();
          requestAnimationFrame(lerp);
        }
        lerp();
      },
      resetCamera() {
        const cam = cameraRef.current;
        const ctrl = controlsRef.current;
        if (!cam || !ctrl) return;
        const start = cam.position.clone();
        const startTarget = ctrl.target.clone();
        const end = new THREE.Vector3(0, 40, 120);
        let t = 0;
        lerpRef.current = true;
        function lerp() {
          t += 0.02;
          if (t >= 1) {
            cam.position.copy(end);
            ctrl.target.set(0, 0, 0);
            ctrl.update();
            lerpRef.current = false;
            return;
          }
          const e = easeInOut(t);
          cam.position.lerpVectors(start, end, e);
          ctrl.target.lerpVectors(startTarget, new THREE.Vector3(), e);
          ctrl.update();
          requestAnimationFrame(lerp);
        }
        lerp();
      },
      setTravelMode(active) {
        travelModeRef.current = active;
        if (spaceshipRef.current) {
          spaceshipRef.current.visible = active;
        }
      },
    }));

    const handlePlanetClick = useCallback(onPlanetSelect, [onPlanetSelect]);

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

      // ─── Renderer ───────────────────────────────────────────────────
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
      renderer.toneMappingExposure = 1.0;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      // ─── Scene ──────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#000008');
      scene.fog = new THREE.FogExp2('#000010', 0.002);

      // ─── Camera ─────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(
        55, container.clientWidth / container.clientHeight, 0.05, 2000
      );
      camera.position.set(0, 40, 120);
      cameraRef.current = camera;

      // ─── Controls ───────────────────────────────────────────────────
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 1.5;
      controls.maxDistance = 380;
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // ─── Post-processing (Bloom) ────────────────────────────────────
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.55, 0.55, 0.78
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());

      // ─── Lighting ───────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0x111133, 1.0));
      const sunLight = new THREE.PointLight(0xfff5d8, 4.0, 700);
      scene.add(sunLight);
      const sunLight2 = new THREE.PointLight(0xff9900, 1.2, 250);
      scene.add(sunLight2);

      // ─── Stars (2 parallax layers) ──────────────────────────────────
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
          if (c < 0.65) { col[i*3]=1; col[i*3+1]=1; col[i*3+2]=1; }
          else if (c < 0.82) { col[i*3]=0.8; col[i*3+1]=0.85; col[i*3+2]=1; }
          else { col[i*3]=1; col[i*3+1]=0.9; col[i*3+2]=0.6; }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const mat = new THREE.PointsMaterial({ size, map: starTex, vertexColors: true, transparent: true, sizeAttenuation: true, alphaTest: 0.01, depthWrite: false });
        const pts = new THREE.Points(geo, mat);
        scene.add(pts);
        return { pts, speed };
      }

      const starLayers = [
        makeStarLayer(3500, 350, 500, 1.4, 0.00004),
        makeStarLayer(4000, 500, 800, 0.8, 0.00001),
      ];

      // ─── Sun ────────────────────────────────────────────────────────
      const sunGeo = new THREE.SphereGeometry(SUN_DATA.radius, 48, 48);
      const sunMat = new THREE.MeshStandardMaterial({
        map: createSunTexture(),
        emissive: new THREE.Color('#ff9900'),
        emissiveIntensity: 2.0,
        roughness: 1,
      });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      scene.add(sunMesh);
      sunMeshRef.current = sunMesh;

      // Sun glow layers
      [{ r: 1.25, c: '#ff7700', o: 0.18 }, { r: 1.55, c: '#ff4400', o: 0.08 }, { r: 2.0, c: '#ff2200', o: 0.03 }]
        .forEach(({ r, c, o }) => {
          const g = new THREE.SphereGeometry(SUN_DATA.radius * r, 32, 32);
          const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: THREE.BackSide, depthWrite: false });
          scene.add(new THREE.Mesh(g, m));
        });

      // ─── Orbit ring helper ──────────────────────────────────────────
      function createOrbitRing(radius: number, opacity = 0.3) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 128; i++) {
          const a = (i / 128) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: 0x3a4f66, transparent: true, opacity, depthWrite: false });
        return new THREE.Line(geo, mat);
      }

      // ─── Planets ────────────────────────────────────────────────────
      const planetObjects = new Map<string, PlanetObject>();

      PLANETS.forEach((planet) => {
        scene.add(createOrbitRing(planet.distance));
        const pivot = new THREE.Object3D();
        scene.add(pivot);

        const geo = new THREE.SphereGeometry(planet.radius, 40, 40);
        const tex = createPlanetTextureByType(planet.textureType, planet.color, planet.stripeColors);
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.82,
          metalness: 0.04,
          emissive: new THREE.Color(planet.emissive ?? '#000000'),
          emissiveIntensity: 0.12,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(planet.distance, 0, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (planet.tilt) mesh.rotation.z = planet.tilt;
        pivot.add(mesh);

        // Atmosphere
        if (planet.atmosphereColor) {
          const atmGeo = new THREE.SphereGeometry(planet.radius * 1.07, 32, 32);
          const atmMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(planet.atmosphereColor),
            transparent: true, opacity: 0.13, side: THREE.BackSide, depthWrite: false,
          });
          mesh.add(new THREE.Mesh(atmGeo, atmMat));
          // Second glow layer
          const atm2Geo = new THREE.SphereGeometry(planet.radius * 1.18, 32, 32);
          const atm2Mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(planet.atmosphereColor),
            transparent: true, opacity: 0.05, side: THREE.BackSide, depthWrite: false,
          });
          mesh.add(new THREE.Mesh(atm2Geo, atm2Mat));
        }

        // Saturn rings
        if (planet.hasRings) {
          const ringGeo = new THREE.RingGeometry(planet.ringInner!, planet.ringOuter!, 128);
          const ringTex = createSaturnRingTexture();
          // Fix UVs for ring
          const pos = ringGeo.attributes.position as THREE.BufferAttribute;
          const uv = ringGeo.attributes.uv as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            const d = Math.sqrt(x * x + z * z);
            uv.setXY(i, (d - planet.ringInner!) / (planet.ringOuter! - planet.ringInner!), 0.5);
          }
          const ringMat = new THREE.MeshBasicMaterial({
            map: ringTex, transparent: true, opacity: planet.ringOpacity ?? 0.75,
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
          mesh.add(satPivot);

          const satGeo = new THREE.SphereGeometry(sat.radius, 18, 18);
          const satTex = (sat.id === 'luna') ? createMoonTexture() : createPlanetTextureByType('rocky', sat.color);
          const satMat = new THREE.MeshStandardMaterial({
            map: satTex, roughness: 0.9, metalness: 0.0,
            emissive: sat.isArtificial ? new THREE.Color(sat.color) : new THREE.Color('#000000'),
            emissiveIntensity: sat.isArtificial ? 0.6 : 0.0,
          });
          const satMesh = new THREE.Mesh(satGeo, satMat);
          satMesh.position.set(sat.orbitRadius, 0, 0);
          satPivot.add(satMesh);

          // Sat orbit ring
          const satOrbPts: THREE.Vector3[] = [];
          for (let i = 0; i <= 64; i++) {
            const a = (i / 64) * Math.PI * 2;
            satOrbPts.push(new THREE.Vector3(Math.cos(a) * sat.orbitRadius, 0, Math.sin(a) * sat.orbitRadius));
          }
          const satOrbGeo = new THREE.BufferGeometry().setFromPoints(satOrbPts);
          const satOrbMat = new THREE.LineBasicMaterial({
            color: sat.isArtificial ? 0x4488ff : 0x334455,
            transparent: true, opacity: sat.isArtificial ? 0.6 : 0.25, depthWrite: false,
          });
          mesh.add(new THREE.Line(satOrbGeo, satOrbMat));

          satObjects.push({ pivot: satPivot, mesh: satMesh, angle: Math.random() * Math.PI * 2, speed: sat.orbitSpeed });
        });

        const startAngle = Math.random() * Math.PI * 2;
        pivot.rotation.y = startAngle;
        planetObjects.set(planet.id, { pivot, mesh, angle: startAngle, data: planet, satellites: satObjects });
      });

      planetObjectsRef.current = planetObjects;

      // ─── Asteroid Belt ──────────────────────────────────────────────
      const beltCount = 2800;
      const beltPos = new Float32Array(beltCount * 3);
      const beltCol = new Float32Array(beltCount * 3);
      for (let i = 0; i < beltCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 33 + Math.random() * 8;
        const y = (Math.random() - 0.5) * 2.5;
        beltPos[i * 3] = Math.cos(angle) * r;
        beltPos[i * 3 + 1] = y;
        beltPos[i * 3 + 2] = Math.sin(angle) * r;
        const g = 0.35 + Math.random() * 0.35;
        beltCol[i * 3] = g + 0.05; beltCol[i * 3 + 1] = g; beltCol[i * 3 + 2] = g * 0.88;
      }
      const beltGeo = new THREE.BufferGeometry();
      beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
      beltGeo.setAttribute('color', new THREE.BufferAttribute(beltCol, 3));
      const beltMat = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.65, sizeAttenuation: true, depthWrite: false });
      const asteroidBelt = new THREE.Points(beltGeo, beltMat);
      scene.add(asteroidBelt);

      // ─── Spaceship ──────────────────────────────────────────────────
      function createSpaceship(): THREE.Group {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: '#c0c8e0', roughness: 0.25, metalness: 0.8 });
        const darkMat = new THREE.MeshStandardMaterial({ color: '#8090b0', roughness: 0.3, metalness: 0.7 });
        // Body
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.35, 10), bodyMat);
        group.add(body);
        // Nose
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 10), bodyMat);
        nose.position.y = 0.265; group.add(nose);
        // Wings
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.018, 0.20), darkMat);
        wing.position.y = -0.06; group.add(wing);
        const wingB = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.12), darkMat);
        wingB.position.set(0, -0.10, 0.08); group.add(wingB);
        // Cockpit
        const cockpitMat = new THREE.MeshStandardMaterial({ color: '#80ccff', roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.85, emissive: new THREE.Color('#4488cc'), emissiveIntensity: 0.4 });
        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), cockpitMat);
        cockpit.position.y = 0.18; group.add(cockpit);
        // Engine glow
        const engineMat = new THREE.MeshBasicMaterial({ color: '#4488ff', transparent: true, opacity: 0.9 });
        const engine = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), engineMat);
        engine.position.y = -0.21; group.add(engine);
        // Engine trail
        const trailMat = new THREE.MeshBasicMaterial({ color: '#88aaff', transparent: true, opacity: 0.4 });
        const trail = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 8), trailMat);
        trail.position.y = -0.30; trail.rotation.z = Math.PI; group.add(trail);
        group.scale.setScalar(1.5);
        group.visible = false;
        return group;
      }
      const spaceship = createSpaceship();
      scene.add(spaceship);
      spaceshipRef.current = spaceship;

      // ─── Raycaster ──────────────────────────────────────────────────
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      function getAllPlanetMeshes() {
        const meshes: THREE.Mesh[] = [sunMesh];
        planetObjects.forEach((o) => meshes.push(o.mesh));
        return meshes;
      }

      function animateCameraTo(worldPos: THREE.Vector3, radius: number) {
        const cam = cameraRef.current!;
        const ctrl = controlsRef.current!;
        const offset = radius * 6 + 5;
        const targetPos = worldPos.clone().add(new THREE.Vector3(0, offset * 0.45, offset));
        const start = cam.position.clone();
        const startTarget = ctrl.target.clone();
        let t = 0;
        lerpRef.current = true;
        function lerp() {
          t += 0.018;
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
        const hits = raycaster.intersectObjects(getAllPlanetMeshes(), false);
        if (!hits.length) { handlePlanetClick(null, false); return; }
        const hit = hits[0].object as THREE.Mesh;
        if (hit === sunMesh) {
          handlePlanetClick(null, true);
          animateCameraTo(new THREE.Vector3(0, 0, 0), SUN_DATA.radius);
          return;
        }
        planetObjects.forEach((obj) => {
          if (obj.mesh === hit) {
            handlePlanetClick(obj.data, false);
            const wp = new THREE.Vector3();
            obj.mesh.getWorldPosition(wp);
            animateCameraTo(wp, obj.data.radius);
          }
        });
      }

      function onMouseMove(e: MouseEvent) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(getAllPlanetMeshes(), false);
        const prev = hoveredRef.current;
        if (hits.length) {
          const hit = hits[0].object as THREE.Mesh;
          if (prev !== hit) {
            if (prev && prev !== sunMesh) (prev.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12;
            hoveredRef.current = hit;
            if (hit !== sunMesh) (hit.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
          }
          renderer.domElement.style.cursor = 'pointer';
        } else {
          if (prev && prev !== sunMesh) (prev.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12;
          hoveredRef.current = null;
          renderer.domElement.style.cursor = 'default';
        }
      }

      renderer.domElement.addEventListener('click', onClick);
      renderer.domElement.addEventListener('mousemove', onMouseMove);

      // ─── Animation loop ─────────────────────────────────────────────
      const clock = new THREE.Clock();

      function animate() {
        frameRef.current = requestAnimationFrame(animate);
        const delta = Math.min(clock.getDelta(), 0.05);
        const speed = speedRef.current;

        sunMesh.rotation.y += 0.004 * delta * 60;

        planetObjects.forEach((obj) => {
          obj.angle += obj.data.orbitSpeed * delta * speed * 0.1;
          obj.pivot.rotation.y = obj.angle;
          obj.mesh.rotation.y += obj.data.rotationSpeed * delta * speed * 0.05;
          obj.satellites.forEach((sat) => {
            sat.angle += sat.speed * delta * speed * 0.15;
            sat.pivot.rotation.y = sat.angle;
          });
        });

        asteroidBelt.rotation.y += 0.002 * delta * speed;

        // Parallax stars
        starLayers.forEach(({ pts, speed: s }) => { pts.rotation.y += s * delta * 60; });

        // Spaceship engine pulse
        if (spaceship.visible) {
          const t = Date.now() * 0.003;
          const engine = spaceship.children[spaceship.children.length - 2] as THREE.Mesh;
          if (engine) (engine.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(t) * 0.25;
        }

        controls.update();
        composer.render();
      }
      animate();

      // ─── Resize ─────────────────────────────────────────────────────
      function onResize() {
        const w = container.clientWidth, h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
      }
      window.addEventListener('resize', onResize);

      onLoad();

      return () => {
        cancelAnimationFrame(frameRef.current);
        window.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.dispose();
        composer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      };
    }, []); // eslint-disable-line

    return <div ref={containerRef} className="w-full h-full" />;
  }
);

SolarSystemScene.displayName = 'SolarSystemScene';
export default SolarSystemScene;
