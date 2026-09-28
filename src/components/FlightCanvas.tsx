import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { build11803Airliner } from './build11803Airliner';

export interface FlightTelemetryData {
  altitude: number;
  mach: number;
  roll: number;
  pitch: number;
  heading: number;
  cabinPressure: number;
  progress: number;
}

export interface GroundServiceStatus {
  fuelPct: number;       // 0 to 100
  baggagePct: number;    // 0 to 100
  passengerPct: number;  // 0 to 100
  isPushbackReady: boolean;
}

export type InAirCameraAngle = 'front-hero' | 'front-headon' | 'front-low' | 'front-high';
export type HangarCameraAngle = 'apron' | 'fuel' | 'baggage' | 'passengers';

interface FlightCanvasProps {
  scrollProgress: number;
  scrollVelocity: number;
  viewMode: 'in-air' | 'in-hangar';
  inAirCameraAngle?: InAirCameraAngle;
  hangarCameraAngle?: HangarCameraAngle;
  groundStatus: GroundServiceStatus;
  customModelGroup?: THREE.Group | null;
  onTelemetryUpdate?: (data: FlightTelemetryData) => void;
}

export function FlightCanvas({
  scrollProgress,
  scrollVelocity,
  viewMode,
  inAirCameraAngle = 'front-hero',
  hangarCameraAngle = 'apron',
  groundStatus,
  customModelGroup = null,
  onTelemetryUpdate,
}: FlightCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    scrollProgress: 0,
    scrollVelocity: 0,
    viewMode: 'in-air' as 'in-air' | 'in-hangar',
    inAirCameraAngle: 'front-hero' as InAirCameraAngle,
    hangarCameraAngle: 'apron' as HangarCameraAngle,
    customModelGroup: null as THREE.Group | null,
    groundStatus: {
      fuelPct: 100,
      baggagePct: 100,
      passengerPct: 100,
      isPushbackReady: true,
    },
  });

  stateRef.current.scrollProgress = scrollProgress;
  stateRef.current.scrollVelocity = scrollVelocity;
  stateRef.current.viewMode = viewMode;
  stateRef.current.inAirCameraAngle = inAirCameraAngle;
  stateRef.current.hangarCameraAngle = hangarCameraAngle;
  stateRef.current.groundStatus = groundStatus;
  stateRef.current.customModelGroup = customModelGroup;

  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  onTelemetryUpdateRef.current = onTelemetryUpdate;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1e45ee, 0.0055);

    // ATMOS-style sky sphere for gradient background (lighter luminous atmosphere)
    const skySphereGeom = new THREE.SphereGeometry(800, 32, 32);
    const skySphereMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1b3fed) },
        middleColor: { value: new THREE.Color(0x3e62f5) },
        bottomColor: { value: new THREE.Color(0x6e8bf8) },
        whiteColor: { value: new THREE.Color(0xffffff) },
        scrollProgress: { value: 0 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying float vHeight;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vHeight = normalize(worldPosition).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 middleColor;
        uniform vec3 bottomColor;
        uniform vec3 whiteColor;
        uniform float scrollProgress;
        uniform float exponent;
        varying vec3 vWorldPosition;
        varying float vHeight;
        void main() {
          float h = max(vHeight, 0.0);
          float t = pow(h, exponent);

          // Transition from violet to white after 40% scroll
          float whiteTransition = smoothstep(0.4, 0.8, scrollProgress);

          vec3 skyTop = mix(topColor, middleColor, scrollProgress * 0.3);
          vec3 skyBottom = mix(middleColor, bottomColor, scrollProgress * 0.2);
          vec3 finalTop = mix(skyTop, whiteColor, whiteTransition);
          vec3 finalBottom = mix(skyBottom, whiteColor, whiteTransition);

          vec3 skyColor = mix(finalBottom, finalTop, t);
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide
    });
    const skySphere = new THREE.Mesh(skySphereGeom, skySphereMat);
    scene.add(skySphere);

    const camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.1,
      2500
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0x8592ff, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ea, 2.6);
    sunLight.position.set(20, 25, 15);
    scene.add(sunLight);

    // Front Key Light & Fill Light to illuminate plane from the front
    const frontKeyLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    frontKeyLight.position.set(10, 16, -20);
    scene.add(frontKeyLight);

    const frontNoseFill = new THREE.DirectionalLight(0xcfd8ff, 1.8);
    frontNoseFill.position.set(-14, 6, -18);
    scene.add(frontNoseFill);

    const sideFillLight = new THREE.DirectionalLight(0xa5b8ff, 1.6);
    sideFillLight.position.set(-20, 10, -10);
    scene.add(sideFillLight);

    const groundBounceLight = new THREE.DirectionalLight(0xffffff, 0.8);
    groundBounceLight.position.set(0, -10, 0);
    scene.add(groundBounceLight);

    // =========================================================================
    // 11803 COMMERCIAL AIRLINER MODEL (LIVERY D-3262 / RED & WHITE SWOOP)
    // Recreates the authentic commercial jet airliner using the 5 diffuse textures
    // =========================================================================
    const airliner = build11803Airliner();
    const airplaneRoot = new THREE.Group();
    airplaneRoot.add(airliner.root);
    scene.add(airplaneRoot);

    const landingGearGroup = airliner.landingGearGroup;

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe8ecf5,
      metalness: 0.95,
      roughness: 0.1,
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.8,
      metalness: 0.1,
    });

    // =========================================================================
    // 3D AIRPORT SIMULATION & AIRSTRIP SCENE (IN-HANGAR MODE)
    // Tarmac runway, Fuel truck, Baggage loader train, Passenger stairs
    // =========================================================================
    const airportGroundGroup = new THREE.Group();
    scene.add(airportGroundGroup);

    // Igloo-inspired procedural crystal particles for hangar scene
    const crystalCount = 150;
    const crystalGeom = new THREE.BufferGeometry();
    const crystalPos = new Float32Array(crystalCount * 3);
    const crystalColors = new Float32Array(crystalCount * 3);

    for (let i = 0; i < crystalCount; i++) {
      crystalPos[i * 3 + 0] = (Math.random() - 0.5) * 30;
      crystalPos[i * 3 + 1] = Math.random() * 8;
      crystalPos[i * 3 + 2] = (Math.random() - 0.5) * 30;

      // Blue-grey crystal colors
      crystalColors[i * 3 + 0] = 0.5 + Math.random() * 0.2;
      crystalColors[i * 3 + 1] = 0.6 + Math.random() * 0.2;
      crystalColors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
    }
    crystalGeom.setAttribute('position', new THREE.BufferAttribute(crystalPos, 3));
    crystalGeom.setAttribute('color', new THREE.BufferAttribute(crystalColors, 3));

    const crystalCanvas = document.createElement('canvas');
    crystalCanvas.width = 32;
    crystalCanvas.height = 32;
    const crystalCtx = crystalCanvas.getContext('2d')!;
    const crystalGrad = crystalCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    crystalGrad.addColorStop(0, 'rgba(180, 200, 255, 0.9)');
    crystalGrad.addColorStop(0.4, 'rgba(150, 180, 255, 0.5)');
    crystalGrad.addColorStop(1, 'rgba(100, 150, 255, 0)');
    crystalCtx.fillStyle = crystalGrad;
    crystalCtx.fillRect(0, 0, 32, 32);
    const crystalTex = new THREE.CanvasTexture(crystalCanvas);

    const crystalMat = new THREE.PointsMaterial({
      size: 0.2,
      map: crystalTex,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const crystalParticles = new THREE.Points(crystalGeom, crystalMat);
    crystalParticles.visible = false;
    scene.add(crystalParticles);

    // Airstrip tarmac ground plane
    const runwayGeom = new THREE.PlaneGeometry(160, 240);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e28,
      roughness: 0.85,
      metalness: 0.15,
    });
    const runwayMesh = new THREE.Mesh(runwayGeom, runwayMat);
    runwayMesh.rotateX(-Math.PI / 2);
    runwayMesh.position.set(0, -0.96, 0);
    airportGroundGroup.add(runwayMesh);

    // Runway Centerline Yellow Stripe
    const stripeGeom = new THREE.PlaneGeometry(0.4, 220);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf5b800 });
    const stripeMesh = new THREE.Mesh(stripeGeom, stripeMat);
    stripeMesh.rotateX(-Math.PI / 2);
    stripeMesh.position.set(0, -0.95, 0);
    airportGroundGroup.add(stripeMesh);

    // Apron Stand Parking Markings & Stop Bar
    const stopBar = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 0.35), stripeMat);
    stopBar.rotateX(-Math.PI / 2);
    stopBar.position.set(0, -0.948, -1.8);
    airportGroundGroup.add(stopBar);

    // Airstrip edge lights
    for (let z = -60; z <= 60; z += 12) {
      for (const x of [-9, 9]) {
        const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), chromeMat);
        fixture.position.set(x, -0.8, z);
        airportGroundGroup.add(fixture);

        const edgeLight = new THREE.PointLight(0x44ffaa, 0.8, 8);
        edgeLight.position.set(x, -0.6, z);
        airportGroundGroup.add(edgeLight);
      }
    }

    // 3D Ground Servicing 1: FUEL TRUCK & HOSE
    const fuelTruckGroup = new THREE.Group();
    fuelTruckGroup.position.set(3.2, -0.96, 0.8);

    // Truck chassis & cab
    const truckChassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.7, 2.8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    truckChassis.position.set(0, 0.5, 0);
    fuelTruckGroup.add(truckChassis);

    // Fuel Tanker Cylindrical Tank
    const tankerCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 2.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x0825c6, metalness: 0.3, roughness: 0.3 })
    );
    tankerCylinder.rotateX(Math.PI / 2);
    tankerCylinder.position.set(0, 0.75, 0.2);
    fuelTruckGroup.add(tankerCylinder);

    // Flexible Fuel Hose connecting truck to underwing fuel port
    const hoseCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.7, 0),
      new THREE.Vector3(-0.9, 0.1, 0),
      new THREE.Vector3(-1.8, 0.85, 0)
    );
    const hoseGeom = new THREE.TubeGeometry(hoseCurve, 16, 0.035, 8, false);
    const hoseMesh = new THREE.Mesh(hoseGeom, rubberMat);
    fuelTruckGroup.add(hoseMesh);

    airportGroundGroup.add(fuelTruckGroup);

    // 3D Ground Servicing 2: BAGGAGE LOADER & CARTS
    const baggageGroup = new THREE.Group();
    baggageGroup.position.set(-2.8, -0.96, 0.2);

    // Baggage Belt Loader ramp entering forward cargo hold
    const loaderChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.5, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xf5b800, roughness: 0.4 })
    );
    loaderChassis.position.set(0, 0.35, 0);
    baggageGroup.add(loaderChassis);

    // Angled conveyor belt
    const beltRamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.08, 2.2),
      rubberMat
    );
    beltRamp.rotateX(-0.4);
    beltRamp.position.set(0.65, 0.6, -0.4);
    baggageGroup.add(beltRamp);

    // Loaded luggage suitcases
    const bagColors = [0x992222, 0x224488, 0x222222, 0x555555];
    for (let b = 0; b < 3; b++) {
      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.12, 0.32),
        new THREE.MeshStandardMaterial({ color: bagColors[b % bagColors.length] })
      );
      bag.position.set(0.65, 0.4 + b * 0.25, -0.1 - b * 0.4);
      baggageGroup.add(bag);
    }
    airportGroundGroup.add(baggageGroup);

    // 3D Ground Servicing 3: PASSENGER BOARDING STAIRS / JETWAY
    const stairsGroup = new THREE.Group();
    stairsGroup.position.set(-1.6, -0.96, -1.0);

    const stairsChassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.4, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    stairsChassis.position.set(0, 0.28, 0);
    stairsGroup.add(stairsChassis);

    // Mobile passenger steps leading to cabin entry door
    for (let step = 0; step < 5; step++) {
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.1, 0.22),
        chromeMat
      );
      stepMesh.position.set(0.4, 0.45 + step * 0.12, 0.4 - step * 0.22);
      stairsGroup.add(stepMesh);
    }

    // Modern architectural glass handrail
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.8, 1.3),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.8, transparent: true })
    );
    rail.position.set(0.72, 0.8, 0.0);
    stairsGroup.add(rail);

    airportGroundGroup.add(stairsGroup);

    // 3D Hangar Background Structure
    const hangarWall = new THREE.Mesh(
      new THREE.BoxGeometry(45, 18, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x1e2433, roughness: 0.7 })
    );
    hangarWall.position.set(0, 8, -25);
    airportGroundGroup.add(hangarWall);

    // Hangar Glowing Architectural Sign
    const signBar = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.8, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    signBar.position.set(0, 14, -24.2);
    airportGroundGroup.add(signBar);

    // =========================================================================
    // DYNAMIC CONTRAILS & VOLUMETRIC MIST SYSTEM (FOR IN-AIR FLIGHT)
    // =========================================================================
    const contrailCount = 100;
    const contrailGeom = new THREE.BufferGeometry();
    const contrailPos = new Float32Array(contrailCount * 3);

    for (let i = 0; i < contrailCount; i++) {
      const isLeft = i % 2 === 0;
      contrailPos[i * 3 + 0] = isLeft ? -1.45 : 1.45;
      contrailPos[i * 3 + 1] = -0.32;
      contrailPos[i * 3 + 2] = 1.4 + (i / 2) * 0.45;
    }
    contrailGeom.setAttribute('position', new THREE.BufferAttribute(contrailPos, 3));

    const cCanvas = document.createElement('canvas');
    cCanvas.width = 64;
    cCanvas.height = 64;
    const contrailCtx = cCanvas.getContext('2d')!;
    const contrailGrad = contrailCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    contrailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    contrailGrad.addColorStop(0.35, 'rgba(235, 242, 255, 0.4)');
    contrailGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    contrailCtx.fillStyle = contrailGrad;
    contrailCtx.fillRect(0, 0, 64, 64);
    const contrailTex = new THREE.CanvasTexture(cCanvas);

    const contrailMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      map: contrailTex,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const contrailPoints = new THREE.Points(contrailGeom, contrailMat);
    airplaneRoot.add(contrailPoints);

    // High quality organic multi-cluster cloud puffs for in-air flight - ATMOS style
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 256;
    cloudCanvas.height = 256;
    const cloudCtx = cloudCanvas.getContext('2d')!;

    // Draw overlapping soft cloud lobes for natural cumulus shape
    const drawLobe = (cx: number, cy: number, r: number, alpha: number) => {
      const grad = cloudCtx.createRadialGradient(cx, cy, 2, cx, cy, r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      grad.addColorStop(0.4, `rgba(248, 250, 255, ${alpha * 0.7})`);
      grad.addColorStop(0.75, `rgba(235, 242, 255, ${alpha * 0.25})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      cloudCtx.fillStyle = grad;
      cloudCtx.beginPath();
      cloudCtx.arc(cx, cy, r, 0, Math.PI * 2);
      cloudCtx.fill();
    };

    drawLobe(128, 128, 100, 0.95);
    drawLobe(90, 138, 76, 0.85);
    drawLobe(166, 138, 80, 0.85);
    drawLobe(128, 92, 78, 0.8);
    drawLobe(105, 105, 65, 0.75);
    drawLobe(150, 105, 68, 0.75);

    const cloudTex = new THREE.CanvasTexture(cloudCanvas);

    const cloudPuffMat = new THREE.SpriteMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.72,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const cloudsGroup = new THREE.Group();
    scene.add(cloudsGroup);

    // ATMOS Multi-Layered Volumetric Cloud System:
    // 1. Corridor Fly-Through Clouds (in front of camera and plane)
    // 2. Dense Cumulus Carpet (beneath aircraft)
    // 3. Flanking Horizon Banks (left and right depth)
    const cloudNodes: { sprite: THREE.Sprite; initialX: number; initialY: number; speed: number; rotSpeed: number }[] = [];

    // Group 1: Corridor Fly-Through Clouds (75 sprites directly in the flight path)
    for (let i = 0; i < 75; i++) {
      const sprite = new THREE.Sprite(cloudPuffMat.clone());
      const x = (Math.random() - 0.5) * 32;
      const y = -1.6 + Math.random() * 4.2;
      const z = 25 - Math.random() * 195;
      const scale = 12 + Math.random() * 20;

      sprite.position.set(x, y, z);
      sprite.scale.set(scale, scale, 1);
      cloudsGroup.add(sprite);

      cloudNodes.push({
        sprite,
        initialX: x,
        initialY: y,
        speed: 0.05 + Math.random() * 0.08,
        rotSpeed: (Math.random() - 0.5) * 0.0014,
      });
    }

    // Group 2: Volumetric Under-Wing Cumulus Carpet (125 sprites)
    for (let i = 0; i < 125; i++) {
      const sprite = new THREE.Sprite(cloudPuffMat.clone());
      const x = (Math.random() - 0.5) * 110;
      const y = -2.8 - Math.random() * 6.5;
      const z = 40 - Math.random() * 230;
      const scale = 22 + Math.random() * 34;

      sprite.position.set(x, y, z);
      sprite.scale.set(scale, scale, 1);
      cloudsGroup.add(sprite);

      cloudNodes.push({
        sprite,
        initialX: x,
        initialY: y,
        speed: 0.035 + Math.random() * 0.05,
        rotSpeed: (Math.random() - 0.5) * 0.0008,
      });
    }

    // Group 3: Flanking Horizon Banks (50 sprites)
    for (let i = 0; i < 50; i++) {
      const sprite = new THREE.Sprite(cloudPuffMat.clone());
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (26 + Math.random() * 48);
      const y = -2.0 + Math.random() * 6.0;
      const z = 30 - Math.random() * 210;
      const scale = 25 + Math.random() * 32;

      sprite.position.set(x, y, z);
      sprite.scale.set(scale, scale, 1);
      cloudsGroup.add(sprite);

      cloudNodes.push({
        sprite,
        initialX: x,
        initialY: y,
        speed: 0.04 + Math.random() * 0.06,
        rotSpeed: (Math.random() - 0.5) * 0.001,
      });
    }

    // ATMOS-style wind particles - visible on fast scroll
    const windParticleCount = 400;
    const windGeom = new THREE.BufferGeometry();
    const windPos = new Float32Array(windParticleCount * 3);
    const windVel = new Float32Array(windParticleCount);
    const windLength = new Float32Array(windParticleCount);

    for (let i = 0; i < windParticleCount; i++) {
      windPos[i * 3 + 0] = (Math.random() - 0.5) * 60;
      windPos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      windPos[i * 3 + 2] = -Math.random() * 80;
      windVel[i] = 0.8 + Math.random() * 1.2;
      windLength[i] = 2 + Math.random() * 4;
    }
    windGeom.setAttribute('position', new THREE.BufferAttribute(windPos, 3));

    // Create wind line texture
    const windCanvas = document.createElement('canvas');
    windCanvas.width = 64;
    windCanvas.height = 2;
    const windCtx = windCanvas.getContext('2d')!;
    const windGrad = windCtx.createLinearGradient(0, 0, 64, 0);
    windGrad.addColorStop(0, 'rgba(200, 220, 255, 0)');
    windGrad.addColorStop(0.5, 'rgba(220, 240, 255, 0.8)');
    windGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
    windCtx.fillStyle = windGrad;
    windCtx.fillRect(0, 0, 64, 2);
    const windTex = new THREE.CanvasTexture(windCanvas);

    const windMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      map: windTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const windParticles = new THREE.Points(windGeom, windMat);
    scene.add(windParticles);

    // --- WINDOW RESIZE ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // =========================================================================
    // ANIMATION LOOP (SUPPORTING IN-AIR SIDEVIEW & IN-HANGAR AIRSTRIP VIEW)
    // =========================================================================
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let lastTelemetryTime = 0;

    const curPlanePos = new THREE.Vector3(0, 0, 0);
    const curPlaneRot = new THREE.Euler(0, 0, 0);
    const curCamPos = new THREE.Vector3(8.5, 0.8, 0);
    const curCamLookAt = new THREE.Vector3(0, 0, 0);

    // Store reference to sky sphere material for animation updates
    const skySphereMatRef = skySphereMat;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const p = stateRef.current.scrollProgress;
      const v = stateRef.current.scrollVelocity;
      const mode = stateRef.current.viewMode;

      const turbY = Math.sin(elapsedTime * 1.5) * 0.05 + Math.cos(elapsedTime * 2.8) * 0.02;
      const turbPitch = Math.sin(elapsedTime * 1.2) * 0.012;
      const turbRoll = Math.sin(elapsedTime * 1.4) * 0.018 + Math.cos(elapsedTime * 2.1) * 0.008;

      // Update ATMOS sky sphere gradient based on scroll progress
      skySphereMatRef.uniforms.scrollProgress.value = p;

      let targetPlaneX = 0;
      let targetPlaneY = 0;
      let targetPlaneZ = 0;
      let targetRotX = 0;
      let targetRotY = 0;
      let targetRotZ = 0;

      let targetCamX = 8.5;
      let targetCamY = 0.8;
      let targetCamZ = 0;
      const targetLookAt = new THREE.Vector3(0, 0, 0);

      if (mode === 'in-air') {
        // ===================================================================
        // IN-AIR FLIGHT MODE: FRONT PERSPECTIVE (APPROACHING AIR-TO-AIR HERO VIEW)
        // Camera is positioned in FRONT of the aircraft, viewing the nose radome,
        // cockpit windshield, swept wings (D-3262), and under-wing turbofans.
        // ===================================================================
        airportGroundGroup.visible = false;
        cloudsGroup.visible = true;
        landingGearGroup.visible = false; // Retracted during flight
        contrailPoints.visible = true;
        crystalParticles.visible = false;
        windParticles.visible = true;

        const inAirAngle = stateRef.current.inAirCameraAngle || 'front-hero';
        let baseOffsetX = 1.35;
        let baseOffsetY = 0.35;
        let baseOffsetZ = -7.4;

        if (inAirAngle === 'front-headon') {
          baseOffsetX = 0.0;
          baseOffsetY = 0.16;
          baseOffsetZ = -7.0;
        } else if (inAirAngle === 'front-low') {
          baseOffsetX = 0.85;
          baseOffsetY = -0.75;
          baseOffsetZ = -6.5;
        } else if (inAirAngle === 'front-high') {
          baseOffsetX = 1.6;
          baseOffsetY = 2.2;
          baseOffsetZ = -6.8;
        }

        // Total flight corridor depth traversed by scrolling
        const flightDepth = 150.0;
        const totalFlightZ = -p * flightDepth;

        if (p < 0.24) {
          // Phase 0: Hero Stratosphere (0% - 24%) - 3/4 front-hero angle looking up at airliner
          const lp = p / 0.24;
          targetPlaneX = 0;
          targetPlaneY = 0.35 + lp * 0.4 + turbY;
          targetPlaneZ = totalFlightZ;

          targetRotX = -0.05 + turbPitch;
          targetRotY = 0;
          targetRotZ = turbRoll;

          // Hero camera front view looking up at nose, windshield, wings
          targetCamX = targetPlaneX + 1.5;
          targetCamY = targetPlaneY + 0.55;
          targetCamZ = targetPlaneZ - 7.2;
          targetLookAt.set(targetPlaneX, targetPlaneY + 0.2, targetPlaneZ);
        } else if (p < 0.48) {
          // Phase 1: Stratospheric Ascent & Wing Glide (24% - 48%)
          // Camera glides into the sky, swinging alongside starboard wing
          const lp = (p - 0.24) / 0.24;
          const arc = Math.sin(lp * Math.PI);
          targetPlaneX = -2.2 * arc;
          targetPlaneY = 0.75 + lp * 0.6 + turbY;
          targetPlaneZ = totalFlightZ;

          // Gentle aerodynamic banking
          targetRotX = -0.04 + 0.02 * arc;
          targetRotY = -0.12 * arc;
          targetRotZ = -0.26 * arc + turbRoll;

          // Camera tracks alongside starboard wing slicing through upper clouds
          targetCamX = targetPlaneX + 3.8;
          targetCamY = targetPlaneY + 1.1;
          targetCamZ = targetPlaneZ - 4.5 + lp * 2.2;
          targetLookAt.set(targetPlaneX + 0.6, targetPlaneY + 0.2, targetPlaneZ);
        } else if (p < 0.74) {
          // Phase 2: The Cloud Dive (48% - 74%) - Penetrating dense cumulus clouds
          const lp = (p - 0.48) / 0.26;
          const arc = Math.sin(lp * Math.PI);
          targetPlaneX = arc * 2.0;
          targetPlaneY = 1.35 - lp * 1.8 + turbY; // Dives down into the clouds
          targetPlaneZ = totalFlightZ;

          // Dramatic banking into the cloud deck
          targetRotX = 0.12 * lp;
          targetRotY = 0.15 * arc;
          targetRotZ = -0.38 * arc + turbRoll;

          // Camera descends alongside the plane right through the cloud layers
          targetCamX = targetPlaneX + 2.2;
          targetCamY = targetPlaneY + 2.0;
          targetCamZ = targetPlaneZ - 3.2;
          targetLookAt.set(targetPlaneX, targetPlaneY, targetPlaneZ);
        } else {
          // Phase 3: Approach & Emerging on Destination Horizon (74% - 100%)
          const lp = (p - 0.74) / 0.26;
          targetPlaneX = Math.sin(lp * Math.PI * 0.5) * 0.4;
          targetPlaneY = -0.45 - lp * 0.6 + turbY;
          targetPlaneZ = totalFlightZ;

          // Level off gracefully above cloud deck
          targetRotX = 0.06 * (1 - lp);
          targetRotY = 0.04 * (1 - lp);
          targetRotZ = -0.04 * (1 - lp) + turbRoll;

          // Trailing approach view over sunlit cloud sea
          targetCamX = targetPlaneX + 1.5;
          targetCamY = targetPlaneY + 1.7;
          targetCamZ = targetPlaneZ + 5.5 - (1 - lp) * 7.5;
          targetLookAt.set(targetPlaneX, targetPlaneY + 0.1, targetPlaneZ - 3.5);
        }

        // Contrail streaming aft towards the chase camera
        const posArr = contrailGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < contrailCount; i++) {
          posArr[i * 3 + 2] += 0.12 * (1 + Math.abs(v) * 2.5);
          if (posArr[i * 3 + 2] > 28) {
            posArr[i * 3 + 2] = 1.4;
          }
        }
        contrailGeom.attributes.position.needsUpdate = true;

        // Clouds scroll & drift:
        // Clouds move dynamically as you scroll into them + continuous idle drift
        const scrollDrive = Math.abs(v) * 1.2;
        cloudNodes.forEach((c) => {
          c.sprite.position.z += c.speed * 2.0 + scrollDrive;
          c.sprite.material.rotation += c.rotSpeed;

          // Wrap clouds ahead when they pass behind the camera
          if (c.sprite.position.z > camera.position.z + 25) {
            c.sprite.position.z = camera.position.z - (160 + Math.random() * 55);
            c.sprite.position.x = c.initialX + (Math.random() - 0.5) * 8;
          } else if (c.sprite.position.z < camera.position.z - 225) {
            c.sprite.position.z = camera.position.z + (10 + Math.random() * 15);
          }
        });

        // ATMOS wind particles - visible on fast scroll
        const windPosArr = windGeom.attributes.position.array as Float32Array;
        const scrollSpeed = Math.abs(v);
        windMat.opacity = Math.min(scrollSpeed * 0.12, 0.7);

        for (let i = 0; i < windParticleCount; i++) {
          windPosArr[i * 3 + 2] += windVel[i] * (1 + scrollSpeed * 2.5);
          if (windPosArr[i * 3 + 2] > camera.position.z + 10) {
            windPosArr[i * 3 + 2] = camera.position.z - 80;
            windPosArr[i * 3 + 0] = (Math.random() - 0.5) * 60;
            windPosArr[i * 3 + 1] = (Math.random() - 0.5) * 15;
          }
        }
        windGeom.attributes.position.needsUpdate = true;

        // Fog color: Luminous violet fading to brilliant cloud white
        const fogViolet = new THREE.Color(0x1e45ee);
        const fogWhite = new THREE.Color(0xffffff);
        const fogT = Math.min(Math.max((p - 0.32) * 1.8, 0), 1);
        (scene.fog as THREE.FogExp2).color.lerpColors(fogViolet, fogWhite, fogT);
        (scene.fog as THREE.FogExp2).density = 0.0055 + fogT * 0.01;
      } else {
        // ===================================================================
        // IN-HANGAR / ON-AIRSTRIP MODE: 3D AIRPORT APRON SIMULATION
        // ===================================================================
        airportGroundGroup.visible = true;
        cloudsGroup.visible = false;
        landingGearGroup.visible = true; // Deployed on tarmac
        contrailPoints.visible = false;
        crystalParticles.visible = true; // Igloo-inspired crystal particles
        windParticles.visible = false;

        // Plane rests parked on the tarmac centerline
        targetPlaneX = 0;
        targetPlaneY = 0;
        targetPlaneZ = 0;
        targetRotX = 0;
        targetRotY = 0;
        targetRotZ = 0;

        const angle = stateRef.current.hangarCameraAngle;
        if (angle === 'fuel') {
          // Focused on wing fueling operation & fuel truck
          targetCamX = 4.2;
          targetCamY = 1.4;
          targetCamZ = 2.0;
          targetLookAt.set(1.5, 0.45, 0.6);
        } else if (angle === 'baggage') {
          // Focused on cargo hold belt loader and luggage train
          targetCamX = -3.8;
          targetCamY = 1.3;
          targetCamZ = 1.2;
          targetLookAt.set(-1.4, 0.4, 0.1);
        } else if (angle === 'passengers') {
          // Focused on cabin airstairs & passenger boarding
          targetCamX = -2.6;
          targetCamY = 1.7;
          targetCamZ = -1.8;
          targetLookAt.set(-0.6, 0.75, -1.0);
        } else {
          // 'apron': High elevated 3/4 apron overview showcasing entire airstrip
          targetCamX = 6.6;
          targetCamY = 3.5;
          targetCamZ = 6.2;
          targetLookAt.set(0, 0.4, 0);
        }

        // Clear airport apron fog
        (scene.fog as THREE.FogExp2).color.setHex(0x101524);
        (scene.fog as THREE.FogExp2).density = 0.0055;

        // Animate Igloo-inspired crystal particles
        const crystalPosArr = crystalGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < crystalCount; i++) {
          crystalPosArr[i * 3 + 1] += Math.sin(elapsedTime * 0.5 + i) * 0.002;
          crystalPosArr[i * 3 + 0] += Math.cos(elapsedTime * 0.3 + i * 0.1) * 0.001;
        }
        crystalGeom.attributes.position.needsUpdate = true;
      }

      // Smooth interpolation (LERP)
      const lerpSpeed = 0.07;
      curPlanePos.lerp(new THREE.Vector3(targetPlaneX, targetPlaneY, targetPlaneZ), lerpSpeed);
      airplaneRoot.position.copy(curPlanePos);

      curPlaneRot.x += (targetRotX - curPlaneRot.x) * lerpSpeed;
      curPlaneRot.y += (targetRotY - curPlaneRot.y) * lerpSpeed;
      curPlaneRot.z += (targetRotZ - curPlaneRot.z) * lerpSpeed;
      airplaneRoot.rotation.copy(curPlaneRot);

      // Rotate 11803 Turbofan blades & pulse beacon lights
      airliner.turbofanSpins.forEach((spin) => {
        spin.rotation.z += 0.35 + Math.abs(v) * 0.5;
      });

      const beaconPhase = Math.sin(elapsedTime * 6.5);
      const isBeaconOn = beaconPhase > 0.45;
      airliner.beaconLights.top.intensity = isBeaconOn ? 2.8 : 0.05;
      airliner.beaconLights.bottom.intensity = isBeaconOn ? 2.8 : 0.05;

      const strobeFlash = Math.sin(elapsedTime * 7.5) > 0.85;
      airliner.beaconLights.strobes.forEach((strobe) => {
        strobe.intensity = strobeFlash ? 3.0 : 0.1;
      });

      // Handle custom model switching if user loaded external 3D file
      const customModel = stateRef.current.customModelGroup;
      if (customModel && !airplaneRoot.children.includes(customModel)) {
        airliner.root.visible = false;
        airplaneRoot.add(customModel);
      } else if (!customModel) {
        airliner.root.visible = true;
      }

      curCamPos.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), lerpSpeed);
      camera.position.copy(curCamPos);

      // Keep atmospheric sky sphere encasing camera as it travels through space
      skySphere.position.copy(camera.position);
      skySphereMat.uniforms.scrollProgress.value = p;

      // Dynamic FOV speed-warp effect when scrolling quickly into clouds
      if (mode === 'in-air') {
        const targetFov = 38 + Math.min(Math.abs(v) * 2.5, 4.5);
        camera.fov += (targetFov - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
      }

      curCamLookAt.lerp(targetLookAt, lerpSpeed);
      camera.lookAt(curCamLookAt);

      // Broadcast Telemetry (Throttled to ~10Hz to prevent React state thrashing)
      if (onTelemetryUpdateRef.current && (elapsedTime - lastTelemetryTime > 0.09 || lastTelemetryTime === 0)) {
        lastTelemetryTime = elapsedTime;
        if (mode === 'in-air') {
          const altitude = Math.round(45200 - p * 8000 - (p > 0.6 ? (p - 0.6) * 16000 : 0));
          const mach = +(0.92 + Math.abs(v) * 0.05).toFixed(2);
          onTelemetryUpdateRef.current({
            altitude,
            mach,
            roll: 0,
            pitch: Math.round((-curPlaneRot.x * 180) / Math.PI),
            heading: 284,
            cabinPressure: 3100,
            progress: p,
          });
        } else {
          onTelemetryUpdateRef.current({
            altitude: 45, // Airstrip ground elevation in feet
            mach: 0.0,
            roll: 0,
            pitch: 0,
            heading: 180,
            cabinPressure: 0,
            progress: 0,
          });
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ overflow: 'hidden' }}
    />
  );
}
