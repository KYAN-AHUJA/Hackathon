import * as THREE from 'three';
import {
  createAirlinerBodyTexture,
  createAirlinerTailTexture,
  createAirlinerWingTexture,
  createAirlinerTurbofanTexture,
} from './airlinerTextureGenerator';

export interface AirlinerModelResult {
  root: THREE.Group;
  landingGearGroup: THREE.Group;
  beaconLights: {
    top: THREE.PointLight;
    bottom: THREE.PointLight;
    strobes: THREE.PointLight[];
  };
  turbofanSpins: THREE.Mesh[];
  exhaustPositions: THREE.Vector3[];
}

export function build11803Airliner(): AirlinerModelResult {
  const root = new THREE.Group();

  // 1. Textures from the 11803 texture set
  const bodyTexture = createAirlinerBodyTexture();
  const tailTexture = createAirlinerTailTexture();
  const wingTextureL = createAirlinerWingTexture(true);
  const wingTextureR = createAirlinerWingTexture(false);
  const turbofanTexture = createAirlinerTurbofanTexture();

  // Materials
  const fuselageMat = new THREE.MeshStandardMaterial({
    map: bodyTexture,
    metalness: 0.12,
    roughness: 0.22,
  });

  const tailMat = new THREE.MeshStandardMaterial({
    map: tailTexture,
    metalness: 0.1,
    roughness: 0.25,
  });

  const wingMatL = new THREE.MeshStandardMaterial({
    map: wingTextureL,
    metalness: 0.15,
    roughness: 0.35,
  });

  const wingMatR = new THREE.MeshStandardMaterial({
    map: wingTextureR,
    metalness: 0.15,
    roughness: 0.35,
  });

  const engineMat = new THREE.MeshStandardMaterial({
    map: turbofanTexture,
    metalness: 0.15,
    roughness: 0.28,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe6e9ef,
    metalness: 0.92,
    roughness: 0.12,
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x3d414a,
    metalness: 0.85,
    roughness: 0.3,
  });

  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    roughness: 0.85,
    metalness: 0.08,
  });

  const cockpitGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x050c1e,
    metalness: 0.45,
    roughness: 0.04,
    transmission: 0.6,
    transparent: true,
    opacity: 0.9,
    reflectivity: 0.95,
  });

  const fanBladeMat = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    metalness: 0.7,
    roughness: 0.3,
  });

  const glowExhaustMat = new THREE.MeshBasicMaterial({
    color: 0x3377ff,
  });

  // ---------------------------------------------------------------------------
  // 1. FUSELAGE (COMMERCIAL AIRLINER 11803 GEOMETRY)
  // Length: 6.4, Radius: 0.45
  // Nose points along -Z, tail points along +Z
  // ---------------------------------------------------------------------------
  const fuselageGeom = new THREE.CylinderGeometry(0.44, 0.44, 6.2, 40, 32);
  fuselageGeom.rotateX(Math.PI / 2);

  const pos = fuselageGeom.attributes.position;
  const uv = fuselageGeom.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    let rScale = 1;
    let yShift = 0;

    // Streamlined aerodynamic nose radome
    if (z < -1.4) {
      const t = (-1.4 - z) / (3.1 - 1.4); // 0 at -1.4, 1 at -3.1
      rScale = Math.cos(Math.min(t, 1) * Math.PI * 0.5);
      yShift = -0.06 * Math.sin(t * Math.PI * 0.5); // nose droop slightly down
    }
    // Streamlined tail empennage cone
    else if (z > 1.3) {
      const t = (z - 1.3) / (3.1 - 1.3);
      rScale = 1 - t * 0.76;
      yShift = 0.12 * Math.sin(t * Math.PI * 0.5); // upswept tail cone
    }

    pos.setX(i, pos.getX(i) * rScale);
    pos.setY(i, pos.getY(i) * rScale + yShift);

    // Adjust UV mapping along fuselage
    const u = (z + 3.1) / 6.2;
    uv.setX(i, u);
  }
  fuselageGeom.computeVertexNormals();
  const fuselageMesh = new THREE.Mesh(fuselageGeom, fuselageMat);
  root.add(fuselageMesh);

  // Aerodynamic Wing-to-Body Belly Fairing (Canoe belly)
  const bellyGeom = new THREE.BoxGeometry(1.05, 0.28, 2.8);
  bellyGeom.translate(0, -0.32, 0.1);
  const bellyMesh = new THREE.Mesh(bellyGeom, fuselageMat);
  root.add(bellyMesh);

  // Radome nose tip pitot sensor
  const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.005, 0.3, 8), chromeMat);
  pitot.rotateX(Math.PI / 2);
  pitot.position.set(0, -0.06, -3.22);
  root.add(pitot);

  // ---------------------------------------------------------------------------
  // 2. COCKPIT WINDSHIELD (6-PANEL COMMERCIAL JET GLASS)
  // ---------------------------------------------------------------------------
  const cockpitGeom = new THREE.SphereGeometry(0.448, 24, 16, 0, Math.PI, 0, Math.PI * 0.36);
  cockpitGeom.rotateX(Math.PI * 0.49);
  cockpitGeom.scale(0.88, 0.52, 1.15);
  const cockpitMesh = new THREE.Mesh(cockpitGeom, cockpitGlassMat);
  cockpitMesh.position.set(0, 0.15, -1.92);
  root.add(cockpitMesh);

  // Cockpit center mullion and eyebrow frames
  const centerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.11, 0.38), chromeMat);
  centerFrame.rotateX(0.32);
  centerFrame.position.set(0, 0.25, -2.0);
  root.add(centerFrame);

  // ---------------------------------------------------------------------------
  // 3. SWEPT WINGS & RED WINGLETS (LOW-WING COMMERCIAL CONFIGURATION)
  // Wingspan: ~7.6 units, sweep back angle: ~26°
  // ---------------------------------------------------------------------------
  const wingGroup = new THREE.Group();
  wingGroup.position.set(0, -0.22, 0);

  // Left & Right Wing meshes with dedicated UV textures (registration D-3262)
  const buildWingHalf = (isLeft: boolean) => {
    const side = isLeft ? -1 : 1;
    const wingHalf = new THREE.Group();

    const shape = new THREE.Shape();
    // Root leading edge
    shape.moveTo(0.45 * side, -0.45);
    // Tip leading edge
    shape.lineTo(3.8 * side, 1.4);
    // Tip trailing edge
    shape.lineTo(3.72 * side, 1.75);
    // Root trailing edge
    shape.lineTo(0.45 * side, 0.95);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });
    geom.rotateX(Math.PI / 2);

    // Dihedral upward wing flex (slight positive angle)
    const wMesh = new THREE.Mesh(geom, isLeft ? wingMatL : wingMatR);
    wMesh.rotation.z = -side * 0.035;
    wingHalf.add(wMesh);

    // Chrome Leading Edge Slats
    const slatGeom = new THREE.CylinderGeometry(0.02, 0.02, 3.8, 8);
    const slat = new THREE.Mesh(slatGeom, chromeMat);
    slat.position.set(2.1 * side, 0.02, 0.48);
    slat.rotation.z = side * (Math.PI / 2 - 0.48);
    slat.rotation.y = side * 0.02;
    wingHalf.add(slat);

    // Flap Track Fairings (3 canoes protruding under each wing)
    const canoeOffsets = [1.2, 2.0, 2.8];
    canoeOffsets.forEach((cx, idx) => {
      const canoeZ = 0.5 + idx * 0.35;
      const canoeGeom = new THREE.ConeGeometry(0.045, 0.48, 8);
      canoeGeom.rotateX(Math.PI / 2);
      const canoe = new THREE.Mesh(canoeGeom, fuselageMat);
      canoe.position.set(cx * side, -0.06, canoeZ);
      wingHalf.add(canoe);
    });

    // Red Winglet Tip (matching 11803 texture)
    const wingletGeom = new THREE.ConeGeometry(0.08, 0.72, 4);
    wingletGeom.scale(0.25, 1, 1.35);
    const winglet = new THREE.Mesh(wingletGeom, tailMat); // Uses scarlet red tail/winglet texture
    winglet.position.set(3.82 * side, 0.28, 1.58);
    winglet.rotation.z = side * 0.55;
    winglet.rotation.y = -side * 0.12;
    wingHalf.add(winglet);

    // Navigation Wingtip Light (Red on port/left, Green on starboard/right)
    const navLight = new THREE.PointLight(isLeft ? 0xff2020 : 0x20ff50, 1.2, 3.5);
    navLight.position.set(3.86 * side, 0.34, 1.6);
    wingHalf.add(navLight);

    // Wingtip High-Intensity White Strobe
    const strobe = new THREE.PointLight(0xffffff, 1.5, 4);
    strobe.position.set(3.84 * side, 0.34, 1.65);
    wingHalf.add(strobe);

    return { wingHalf, strobe };
  };

  const leftWingData = buildWingHalf(true);
  const rightWingData = buildWingHalf(false);
  wingGroup.add(leftWingData.wingHalf);
  wingGroup.add(rightWingData.wingHalf);
  root.add(wingGroup);

  // ---------------------------------------------------------------------------
  // 4. UNDER-WING HIGH-BYPASS TURBOFAN ENGINES (11803 CFM56 / LEAP AIRLINER STYLE)
  // Mounted on forward pylons UNDER the wings at X = ±1.45, Y = -0.26, Z = 0.22
  // ---------------------------------------------------------------------------
  const engineGroup = new THREE.Group();
  const turbofanSpins: THREE.Mesh[] = [];
  const exhaustPositions: THREE.Vector3[] = [];

  for (let side = -1; side <= 1; side += 2) {
    const engX = side * 1.45;
    const engY = -0.32;
    const engZ = 0.35;

    // Aerodynamic Engine Pylon connecting wing undersurface to nacelle
    const pylonGeom = new THREE.BoxGeometry(0.12, 0.36, 1.2);
    pylonGeom.translate(0, 0.16, -0.15);
    const pylon = new THREE.Mesh(pylonGeom, titaniumMat);
    pylon.position.set(engX, engY + 0.14, engZ);
    pylon.rotateX(0.04);
    engineGroup.add(pylon);

    // Turbofan Engine Cowling / Nacelle (White with red racing stripe)
    const nacelleGeom = new THREE.CylinderGeometry(0.3, 0.28, 1.55, 32);
    nacelleGeom.rotateX(Math.PI / 2);
    const nacelle = new THREE.Mesh(nacelleGeom, engineMat);
    nacelle.position.set(engX, engY, engZ);
    engineGroup.add(nacelle);

    // Polished Chrome Intake Cowl Lip
    const intakeLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.29, 0.03, 10, 32),
      chromeMat
    );
    intakeLip.position.set(engX, engY, engZ - 0.78);
    engineGroup.add(intakeLip);

    // Spinning Turbofan Disk & Fan Blades
    const fanDisk = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), fanBladeMat);
    fanDisk.position.set(engX, engY, engZ - 0.72);
    turbofanSpins.push(fanDisk);
    engineGroup.add(fanDisk);

    // Titanium Intake Spinner Cone with Spiral
    const spinnerGeom = new THREE.ConeGeometry(0.08, 0.26, 16);
    spinnerGeom.rotateX(-Math.PI / 2);
    const spinner = new THREE.Mesh(spinnerGeom, titaniumMat);
    spinner.position.set(engX, engY, engZ - 0.74);
    engineGroup.add(spinner);

    // Titanium Core Exhaust Nozzle & Center Plug
    const exhaustNozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.18, 0.32, 24),
      titaniumMat
    );
    exhaustNozzle.rotateX(Math.PI / 2);
    exhaustNozzle.position.set(engX, engY, engZ + 0.92);
    engineGroup.add(exhaustNozzle);

    const exhaustPlug = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 16), titaniumMat);
    exhaustPlug.rotateX(Math.PI / 2);
    exhaustPlug.position.set(engX, engY, engZ + 1.15);
    engineGroup.add(exhaustPlug);

    // Exhaust thrust glow ring
    const thrustGlow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), glowExhaustMat);
    thrustGlow.position.set(engX, engY, engZ + 1.08);
    engineGroup.add(thrustGlow);

    exhaustPositions.push(new THREE.Vector3(engX, engY, engZ + 1.1));
  }
  root.add(engineGroup);

  // ---------------------------------------------------------------------------
  // 5. EMPENNAGE (TALL SWEPT RED TAIL FIN & HORIZONTAL STABILIZERS)
  // Uses authentic scarlet red 11803_Airplane_tail_diff texture
  // ---------------------------------------------------------------------------
  const empennageGroup = new THREE.Group();

  // Tall Swept Vertical Stabilizer
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.35, 1.85);   // fin top leading edge
  finShape.lineTo(0.95, 1.85);   // fin top trailing edge
  finShape.lineTo(1.65, 0);      // fin root trailing edge
  finShape.closePath();

  const finGeom = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.065,
    bevelEnabled: true,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  });
  finGeom.rotateY(Math.PI / 2);
  finGeom.translate(0, 0.38, 1.3);

  const finMesh = new THREE.Mesh(finGeom, tailMat);
  empennageGroup.add(finMesh);

  // Low-Mounted Horizontal Stabilizer Tailplanes
  const hStabShape = new THREE.Shape();
  hStabShape.moveTo(0, 0);
  hStabShape.lineTo(1.6, 0.7);
  hStabShape.lineTo(1.5, 1.05);
  hStabShape.lineTo(0, 0.45);
  hStabShape.lineTo(-1.5, 1.05);
  hStabShape.lineTo(-1.6, 0.7);
  hStabShape.closePath();

  const hStabGeom = new THREE.ExtrudeGeometry(hStabShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
  });
  hStabGeom.rotateX(Math.PI / 2);
  hStabGeom.translate(0, 0.28, 2.45);

  const hStabMesh = new THREE.Mesh(hStabGeom, fuselageMat);
  empennageGroup.add(hStabMesh);

  // Tailcone APU (Auxiliary Power Unit) Exhaust Orifice
  const apu = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), titaniumMat);
  apu.rotateX(Math.PI / 2);
  apu.position.set(0, 0.12, 3.12);
  empennageGroup.add(apu);

  // Tail White Navigation Light
  const tailNavLight = new THREE.PointLight(0xffffff, 1.4, 4);
  tailNavLight.position.set(0, 0.12, 3.16);
  empennageGroup.add(tailNavLight);

  root.add(empennageGroup);

  // ---------------------------------------------------------------------------
  // 6. TRICYCLE LANDING GEAR (MATCHING 11803 DETAILS)
  // Deployed for In-Hangar ground tarmac mode, retracted during In-Air flight
  // ---------------------------------------------------------------------------
  const landingGearGroup = new THREE.Group();

  // A. Nose Gear (Dual tires, oleo shock strut, steering actuator, taxi lights)
  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.032, 0.72, 12), chromeMat);
  noseStrut.position.set(0, -0.5, -1.7);
  landingGearGroup.add(noseStrut);

  const noseTorqueLink = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.06), titaniumMat);
  noseTorqueLink.position.set(0, -0.58, -1.65);
  noseTorqueLink.rotateX(0.3);
  landingGearGroup.add(noseTorqueLink);

  // Nose Taxi & Takeoff Lights
  const taxiLight = new THREE.PointLight(0xfff4d6, 1.8, 6);
  taxiLight.position.set(0, -0.45, -1.76);
  landingGearGroup.add(taxiLight);

  const taxiFixture = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), chromeMat);
  taxiFixture.rotateX(Math.PI / 2);
  taxiFixture.position.set(0, -0.45, -1.74);
  landingGearGroup.add(taxiFixture);

  // Twin Nose Wheels
  for (let side = -1; side <= 1; side += 2) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 18), rubberMat);
    tire.rotateZ(Math.PI / 2);
    tire.position.set(side * 0.08, -0.84, -1.7);
    landingGearGroup.add(tire);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.075, 12), chromeMat);
    hub.rotateZ(Math.PI / 2);
    hub.position.set(side * 0.08, -0.84, -1.7);
    landingGearGroup.add(hub);
  }

  // B. Main Landing Gear (Port & Starboard Bogies under wing roots)
  for (let side = -1; side <= 1; side += 2) {
    const mainStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.042, 0.82, 12), chromeMat);
    mainStrut.position.set(side * 1.05, -0.52, 0.45);
    landingGearGroup.add(mainStrut);

    const mainAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), chromeMat);
    mainAxle.rotateZ(Math.PI / 2);
    mainAxle.position.set(side * 1.05, -0.88, 0.45);
    landingGearGroup.add(mainAxle);

    // Twin Main Tires per side
    for (let w = -1; w <= 1; w += 2) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 20), rubberMat);
      tire.rotateZ(Math.PI / 2);
      tire.position.set(side * 1.05 + w * 0.085, -0.88, 0.45);
      landingGearGroup.add(tire);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.095, 12), chromeMat);
      hub.rotateZ(Math.PI / 2);
      hub.position.set(side * 1.05 + w * 0.085, -0.88, 0.45);
      landingGearGroup.add(hub);
    }
  }
  root.add(landingGearGroup);

  // ---------------------------------------------------------------------------
  // 7. ANTI-COLLISION BEACONS (ROTATING RED FLASHERS)
  // Top crown of fuselage, bottom center belly
  // ---------------------------------------------------------------------------
  const topBeaconLight = new THREE.PointLight(0xff1818, 1.8, 5);
  topBeaconLight.position.set(0, 0.52, 0.1);
  root.add(topBeaconLight);

  const topBeaconLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff1111 })
  );
  topBeaconLens.position.set(0, 0.48, 0.1);
  root.add(topBeaconLens);

  const bottomBeaconLight = new THREE.PointLight(0xff1818, 1.8, 5);
  bottomBeaconLight.position.set(0, -0.5, 0.3);
  root.add(bottomBeaconLight);

  const bottomBeaconLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff1111 })
  );
  bottomBeaconLens.position.set(0, -0.46, 0.3);
  root.add(bottomBeaconLens);

  return {
    root,
    landingGearGroup,
    beaconLights: {
      top: topBeaconLight,
      bottom: bottomBeaconLight,
      strobes: [leftWingData.strobe, rightWingData.strobe, tailNavLight],
    },
    turbofanSpins,
    exhaustPositions,
  };
}
