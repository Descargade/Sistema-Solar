import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLANETS, SUN_DATA, type PlanetData } from '@/data/planets';
import {
  createSunTexture,
  createPlanetTexture,
  createMoonTexture,
  createSaturnRingTexture,
  createStarTexture,
  createEarthTexture,
} from '@/utils/textures';

interface PlanetObject {
  pivot: THREE.Object3D;
  mesh: THREE.Mesh;
  angle: number;
  data: PlanetData;
  satellites: SatelliteObject[];
  glowMesh?: THREE.Mesh;
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

export default function SolarSystemScene({ speedMultiplier, onPlanetSelect, onLoad }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef(speedMultiplier);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planetObjectsRef = useRef<Map<string, PlanetObject>>(new Map());
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const frameRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  const lerpActiveRef = useRef(false);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  const resetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const start = cam.position.clone();
    const startTarget = ctrl.target.clone();
    const end = new THREE.Vector3(0, 40, 120);
    const endTarget = new THREE.Vector3(0, 0, 0);
    let t = 0;
    lerpActiveRef.current = true;
    function lerp() {
      t += 0.02;
      if (t >= 1) {
        cam.position.copy(end);
        ctrl.target.copy(endTarget);
        ctrl.update();
        lerpActiveRef.current = false;
        return;
      }
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      cam.position.lerpVectors(start, end, e);
      ctrl.target.lerpVectors(startTarget, endTarget, e);
      ctrl.update();
      requestAnimationFrame(lerp);
    }
    lerp();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Check WebGL support first
    const testCanvas = document.createElement('canvas');
    const hasWebGL = !!(
      testCanvas.getContext('webgl2') ||
      testCanvas.getContext('webgl') ||
      testCanvas.getContext('experimental-webgl')
    );

    if (!hasWebGL) {
      container.innerHTML = `
        <div style="
          position:absolute;inset:0;display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:20px;
          color:#e8eeff;font-family:'Inter',sans-serif;text-align:center;padding:40px;
        ">
          <div style="font-size:48px;filter:drop-shadow(0 0 20px #ffd700aa)">🪐</div>
          <h2 style="font-size:22px;font-weight:700;font-family:'Space Grotesk',sans-serif;letter-spacing:0.04em;">
            Sistema Solar 3D listo
          </h2>
          <p style="font-size:14px;color:rgba(180,200,255,0.65);max-width:400px;line-height:1.7;">
            La visualización 3D requiere aceleración de hardware (WebGL).<br>
            Abre este enlace en tu navegador para ver el Sistema Solar interactivo.
          </p>
          <div style="
            display:flex;align-items:center;gap:10px;
            padding:12px 20px;border-radius:12px;
            background:rgba(74,158,255,0.1);border:1px solid rgba(74,158,255,0.3);
            font-size:13px;color:#4a9eff;
          ">
            <span style="font-size:16px">🚀</span>
            Despliega la app para verla en tu navegador
          </div>
          <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap;justify-content:center;">
            <div style="text-align:center;padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(100,150,255,0.15);border-radius:10px;font-size:12px;color:rgba(180,200,255,0.6);">
              ☀ Sol + 8 planetas
            </div>
            <div style="text-align:center;padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(100,150,255,0.15);border-radius:10px;font-size:12px;color:rgba(180,200,255,0.6);">
              🌙 Satélites naturales
            </div>
            <div style="text-align:center;padding:12px 16px;background:rgba(79,195,247,0.06);border:1px solid rgba(79,195,247,0.2);border-radius:10px;font-size:12px;color:rgba(79,195,247,0.8);">
              🛰 ISS · Hubble · ARSAT-1
            </div>
          </div>
        </div>
      `;
      onLoad();
      return;
    }

    // Renderer - try with antialias first, fall back to basic if WebGL context fails
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
    } catch {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
      } catch (e) {
        console.error('WebGL not supported:', e);
        container.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(180,200,255,0.6);font-family:'Inter',sans-serif;">No se pudo inicializar WebGL</div>`;
        onLoad();
        return;
      }
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000008');

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 40, 120);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 400;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x111133, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xfff5e0, 3.0, 600);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const sunLight2 = new THREE.PointLight(0xff8800, 1.0, 200);
    sunLight2.position.set(0, 0, 0);
    scene.add(sunLight2);

    // Stars
    const starCount = 6000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 400 + Math.random() * 200;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        starColors[i * 3] = 1; starColors[i * 3 + 1] = 1; starColors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.85) {
        starColors[i * 3] = 0.9; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 1;
      } else {
        starColors[i * 3] = 1; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 0.7;
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starTex = createStarTexture();
    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      map: starTex,
      vertexColors: true,
      transparent: true,
      sizeAttenuation: true,
      alphaTest: 0.01,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // Sun
    const sunGeo = new THREE.SphereGeometry(SUN_DATA.radius, 32, 32);
    const sunTex = createSunTexture();
    const sunMat = new THREE.MeshStandardMaterial({
      map: sunTex,
      emissive: new THREE.Color(SUN_DATA.emissive),
      emissiveIntensity: 1.5,
      roughness: 1,
      metalness: 0,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    // Sun glow
    const glowGeo = new THREE.SphereGeometry(SUN_DATA.radius * 1.3, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff6600'),
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    const glowGeo2 = new THREE.SphereGeometry(SUN_DATA.radius * 1.7, 32, 32);
    const glowMat2 = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff9900'),
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(glowGeo2, glowMat2));

    // Orbit rings
    function createOrbitRing(radius: number): THREE.Line {
      const points: THREE.Vector3[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.35 });
      return new THREE.Line(geo, mat);
    }

    // Planets
    const planetObjects = new Map<string, PlanetObject>();

    PLANETS.forEach((planet) => {
      scene.add(createOrbitRing(planet.distance));

      const pivot = new THREE.Object3D();
      scene.add(pivot);

      const geo = new THREE.SphereGeometry(planet.radius, 32, 32);
      let tex: THREE.CanvasTexture;
      if (planet.id === 'earth') {
        tex = createEarthTexture();
      } else {
        tex = createPlanetTexture(planet.color, planet.textureType, planet.stripeColors);
      }
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.85,
        metalness: 0.05,
        emissive: new THREE.Color(planet.emissive || '#000000'),
        emissiveIntensity: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(planet.distance, 0, 0);
      if (planet.tilt) {
        mesh.rotation.z = planet.tilt;
      }
      pivot.add(mesh);

      // Atmosphere glow
      if (planet.atmosphereColor) {
        const atmGeo = new THREE.SphereGeometry(planet.radius * 1.08, 32, 32);
        const atmMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(planet.atmosphereColor),
          transparent: true,
          opacity: 0.12,
          side: THREE.BackSide,
        });
        mesh.add(new THREE.Mesh(atmGeo, atmMat));
      }

      // Saturn rings
      if (planet.hasRings) {
        const ringGeo = new THREE.RingGeometry(planet.ringInner!, planet.ringOuter!, 64);
        const ringTex = createSaturnRingTexture();
        const pos = ringGeo.attributes.position as THREE.BufferAttribute;
        const uv = ringGeo.attributes.uv as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const z = pos.getZ(i);
          const dist = Math.sqrt(x * x + z * z);
          const t = (dist - planet.ringInner!) / (planet.ringOuter! - planet.ringInner!);
          uv.setXY(i, t, 0.5);
        }
        const ringMat = new THREE.MeshBasicMaterial({
          map: ringTex,
          transparent: true,
          opacity: planet.ringOpacity || 0.7,
          side: THREE.DoubleSide,
          depthWrite: false,
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

        const satGeo = new THREE.SphereGeometry(sat.radius, 16, 16);
        let satTex: THREE.CanvasTexture;
        if (!sat.isArtificial && sat.id === 'luna') {
          satTex = createMoonTexture();
        } else {
          satTex = createPlanetTexture(sat.color, 'rocky');
        }
        const satMat = new THREE.MeshStandardMaterial({
          map: satTex,
          roughness: 0.9,
          metalness: 0.0,
          emissive: sat.isArtificial ? new THREE.Color(sat.color) : new THREE.Color('#000000'),
          emissiveIntensity: sat.isArtificial ? 0.3 : 0.0,
        });
        const satMesh = new THREE.Mesh(satGeo, satMat);
        satMesh.position.set(sat.orbitRadius, 0, 0);
        satPivot.add(satMesh);

        // Orbit ring for satellite
        const satOrbitPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= 64; i++) {
          const angle = (i / 64) * Math.PI * 2;
          satOrbitPoints.push(new THREE.Vector3(
            Math.cos(angle) * sat.orbitRadius, 0, Math.sin(angle) * sat.orbitRadius
          ));
        }
        const satOrbitGeo = new THREE.BufferGeometry().setFromPoints(satOrbitPoints);
        const satOrbitColor = sat.isArtificial ? 0x4488ff : 0x334455;
        const satOrbitMat = new THREE.LineBasicMaterial({
          color: satOrbitColor,
          transparent: true,
          opacity: sat.isArtificial ? 0.5 : 0.25,
        });
        mesh.add(new THREE.Line(satOrbitGeo, satOrbitMat));

        satObjects.push({
          pivot: satPivot,
          mesh: satMesh,
          angle: Math.random() * Math.PI * 2,
          speed: sat.orbitSpeed,
        });
      });

      const obj: PlanetObject = {
        pivot,
        mesh,
        angle: Math.random() * Math.PI * 2,
        data: planet,
        satellites: satObjects,
      };
      planetObjects.set(planet.id, obj);
    });

    planetObjectsRef.current = planetObjects;

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMouseClick(event: MouseEvent) {
      if (lerpActiveRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const allMeshes: THREE.Mesh[] = [];
      planetObjects.forEach((obj) => allMeshes.push(obj.mesh));
      if (sunMesh) allMeshes.push(sunMesh);

      const intersects = raycaster.intersectObjects(allMeshes, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (hit === sunMesh) {
          onPlanetSelect(null, true);
          animateCameraTo(new THREE.Vector3(0, 6, 16), new THREE.Vector3(0, 0, 0));
          return;
        }
        let found: PlanetObject | null = null;
        planetObjects.forEach((obj) => { if (obj.mesh === hit) found = obj; });
        if (found) {
          const f = found as PlanetObject;
          onPlanetSelect(f.data, false);
          const worldPos = new THREE.Vector3();
          f.mesh.getWorldPosition(worldPos);
          const offset = f.data.radius * 5 + 5;
          animateCameraTo(
            worldPos.clone().add(new THREE.Vector3(0, f.data.radius * 2, offset)),
            worldPos
          );
        }
      } else {
        onPlanetSelect(null, false);
      }
    }

    function animateCameraTo(target: THREE.Vector3, lookAt: THREE.Vector3) {
      const start = camera.position.clone();
      const startTarget = controls.target.clone();
      let t = 0;
      lerpActiveRef.current = true;
      function lerp() {
        t += 0.018;
        if (t >= 1) {
          camera.position.copy(target);
          controls.target.copy(lookAt);
          controls.update();
          lerpActiveRef.current = false;
          return;
        }
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        camera.position.lerpVectors(start, target, e);
        controls.target.lerpVectors(startTarget, lookAt, e);
        controls.update();
        requestAnimationFrame(lerp);
      }
      lerp();
    }

    renderer.domElement.addEventListener('click', onMouseClick);

    // Hover cursor
    function onMouseMove(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const allMeshes: THREE.Mesh[] = [];
      planetObjects.forEach((obj) => allMeshes.push(obj.mesh));
      allMeshes.push(sunMesh);
      const intersects = raycaster.intersectObjects(allMeshes, false);
      renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    }
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Animation loop
    const clock = clockRef.current;
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const speed = speedRef.current;

      sunMesh.rotation.y += 0.003 * delta * 60;

      planetObjects.forEach((obj) => {
        obj.angle += obj.data.orbitSpeed * delta * speed * 0.1;
        obj.pivot.rotation.y = obj.angle;
        obj.mesh.rotation.y += obj.data.rotationSpeed * delta * speed * 0.05;
        obj.satellites.forEach((sat) => {
          sat.angle += sat.speed * delta * speed * 0.15;
          sat.pivot.rotation.y = sat.angle;
        });
      });

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize
    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    onLoad();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('click', onMouseClick);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onLoad, onPlanetSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resetBtn = (window as unknown as { __resetCamera?: () => void }).__resetCamera;
    if (resetBtn) resetBtn();
  }, []);

  useEffect(() => {
    (window as unknown as { __resetCamera: () => void }).__resetCamera = resetCamera;
  }, [resetCamera]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: 'relative' }}
    />
  );
}
