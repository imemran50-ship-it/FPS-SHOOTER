import * as THREE from 'three';
import { createGridCanvasTexture, createCamouflageTexture } from './models.ts';

export interface MapObstacle {
  box: THREE.Box3;
  mesh?: THREE.Object3D;
}

export interface MapDefinition {
  id: string;
  name: string;
  theme: string;
  description: string;
  fogColor: number;
  fogDensity: number;
  skyColor: number;
  groundColor: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  alphaSpawn: [number, number, number];
  bravoSpawn: [number, number, number];
  obstacles: MapObstacle[];
  buildScene: (scene: THREE.Scene) => { obstacles: MapObstacle[]; cleanUp: () => void };
}

export const MAP_CONFIGS: Record<string, { id: string; name: string; theme: string; description: string }> = {
  dust: {
    id: 'dust',
    name: 'Dust Protocol',
    theme: 'Desert Outpost',
    description: 'Sun-bleached tactical outpost with sandstone compounds, shipping containers, and long sightlines.'
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Neon Sector',
    theme: 'Neo-Tokyo Industrial',
    description: 'High-contrast nocturnal metropolis sector with glowing neon pylons and elevated metal catwalks.'
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Outpost Zero',
    theme: 'Sub-Zero Installation',
    description: 'Cryogenic research compound surrounded by snow banks, radar domes, and icy barricades.'
  }
};

/**
 * Builds Map 1: Dust Protocol
 */
function buildDustMap(scene: THREE.Scene) {
  const obstacles: MapObstacle[] = [];
  const mapGroup = new THREE.Group();

  // Ground Terrain (Sandstone)
  const groundTex = createGridCanvasTexture('#d7b17a', '#c29b63', 512, 16);
  groundTex.repeat.set(16, 16);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.9,
    metalness: 0.05
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMat);
  ground.rotateX(-Math.PI / 2);
  ground.receiveShadow = true;
  mapGroup.add(ground);

  // Outer Sand Dune Perimeter (Non-boxing natural terrain boundaries)
  const duneMat = new THREE.MeshStandardMaterial({ color: 0xcca366, roughness: 0.95 });
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    const r = 50 + Math.random() * 8;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const dune = new THREE.Mesh(new THREE.SphereGeometry(14, 8, 6), duneMat);
    dune.scale.set(1.5, 0.45, 1.2);
    dune.position.set(x, 1.5, z);
    mapGroup.add(dune);
    obstacles.push({ box: new THREE.Box3().setFromObject(dune) });
  }

  // Sandstone Military Compounds
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xc8a474,
    roughness: 0.85,
    metalness: 0.1
  });

  // Central Fortress Choke Point
  const centerBuilding = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 12), stoneMat);
  centerBuilding.position.set(0, 2.5, 0);
  centerBuilding.castShadow = true;
  centerBuilding.receiveShadow = true;
  mapGroup.add(centerBuilding);
  obstacles.push({ box: new THREE.Box3().setFromObject(centerBuilding) });

  // Gateway corridor cutout (open archways)
  // Flanking Sandstone Bunkers
  const bunkerLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 8), stoneMat);
  bunkerLeft.position.set(-20, 2, -10);
  bunkerLeft.castShadow = true;
  bunkerLeft.receiveShadow = true;
  mapGroup.add(bunkerLeft);
  obstacles.push({ box: new THREE.Box3().setFromObject(bunkerLeft) });

  const bunkerRight = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 8), stoneMat);
  bunkerRight.position.set(20, 2, 10);
  bunkerRight.castShadow = true;
  bunkerRight.receiveShadow = true;
  mapGroup.add(bunkerRight);
  obstacles.push({ box: new THREE.Box3().setFromObject(bunkerRight) });

  // Shipping Containers (Tactical cover props)
  const containerColors = [0x995d3f, 0x2b4c59, 0x4a6b4e];
  const containerLocations: [number, number, number, number][] = [
    [-8, 1.4, -14, 0.2],
    [8, 1.4, 14, -0.4],
    [-18, 1.4, 8, 0.8],
    [16, 1.4, -8, -0.6],
    [-4, 1.4, 18, 0],
    [4, 1.4, -20, 0.3],
    [-26, 1.4, -20, 0.5],
    [26, 1.4, 20, -0.5]
  ];

  containerLocations.forEach(([x, y, z, rot], idx) => {
    const cMat = new THREE.MeshStandardMaterial({
      color: containerColors[idx % containerColors.length],
      metalness: 0.6,
      roughness: 0.4
    });
    const container = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 2.8), cMat);
    container.position.set(x, y, z);
    container.rotateY(rot);
    container.castShadow = true;
    container.receiveShadow = true;
    mapGroup.add(container);
    obstacles.push({ box: new THREE.Box3().setFromObject(container) });
  });

  // Watchtowers with ladder frames
  const towerPositions = [[-28, 28], [28, -28]];
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x3a404a, metalness: 0.8, roughness: 0.3 });
  towerPositions.forEach(([tx, tz]) => {
    const tower = new THREE.Group();
    // Legs
    for (let lx = -1.2; lx <= 1.2; lx += 2.4) {
      for (let lz = -1.2; lz <= 1.2; lz += 2.4) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), steelMat);
        leg.position.set(lx, 3, lz);
        tower.add(leg);
      }
    }
    // Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 3.6), steelMat);
    platform.position.y = 6;
    tower.add(platform);
    // Railings
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 3.6), new THREE.MeshBasicMaterial({ wireframe: true, color: 0x8899a6 }));
    rail.position.y = 6.6;
    tower.add(rail);

    tower.position.set(tx, 0, tz);
    mapGroup.add(tower);
    obstacles.push({ box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(tx, 3, tz), new THREE.Vector3(3.6, 6, 3.6)) });
  });

  scene.add(mapGroup);
  return {
    obstacles,
    cleanUp: () => scene.remove(mapGroup)
  };
}

/**
 * Builds Map 2: Cyber Neon Sector
 */
function buildCyberMap(scene: THREE.Scene) {
  const obstacles: MapObstacle[] = [];
  const mapGroup = new THREE.Group();

  // Dark Wet Asphalt Floor with Cyan Grid
  const cyberTex = createGridCanvasTexture('#0a0d14', '#00f0ff', 512, 16);
  cyberTex.repeat.set(14, 14);
  const floorMat = new THREE.MeshStandardMaterial({
    map: cyberTex,
    roughness: 0.25,
    metalness: 0.85
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), floorMat);
  floor.rotateX(-Math.PI / 2);
  floor.receiveShadow = true;
  mapGroup.add(floor);

  // Concrete & Carbon Cybernetic Buildings
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x141820,
    metalness: 0.7,
    roughness: 0.35
  });

  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00d2d3,
    emissiveIntensity: 1.5,
    roughness: 0.1
  });

  const neonMagentaMat = new THREE.MeshStandardMaterial({
    color: 0xff0055,
    emissive: 0xff0055,
    emissiveIntensity: 1.5,
    roughness: 0.1
  });

  // Central Server Core
  const core = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 14), carbonMat);
  core.position.set(0, 3.5, 0);
  core.castShadow = true;
  core.receiveShadow = true;
  mapGroup.add(core);

  // Neon Trim Ring around core
  const trimCyan = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.4, 14.4), neonCyanMat);
  trimCyan.position.set(0, 3.5, 0);
  mapGroup.add(trimCyan);

  const trimMagenta = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.4, 14.4), neonMagentaMat);
  trimMagenta.position.set(0, 6.5, 0);
  mapGroup.add(trimMagenta);
  obstacles.push({ box: new THREE.Box3().setFromObject(core) });

  // Flanking Data Terminal Blocks
  const blockOffsets = [
    [-18, 2.5, -12, 8, 5, 8],
    [18, 2.5, 12, 8, 5, 8],
    [-16, 2, 16, 6, 4, 10],
    [16, 2, -16, 6, 4, 10]
  ];

  blockOffsets.forEach(([bx, by, bz, bw, bh, bd], i) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), carbonMat);
    block.position.set(bx, by, bz);
    block.castShadow = true;
    block.receiveShadow = true;
    mapGroup.add(block);

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(bw + 0.1, 0.3, bd + 0.1),
      i % 2 === 0 ? neonCyanMat : neonMagentaMat
    );
    stripe.position.set(bx, by + 1.2, bz);
    mapGroup.add(stripe);

    obstacles.push({ box: new THREE.Box3().setFromObject(block) });
  });

  // Neon Street Barriers & Cover Pillars
  const pillarLocs = [
    [-8, -8], [8, 8], [-8, 8], [8, -8],
    [-24, 0], [24, 0], [0, -22], [0, 22]
  ];
  pillarLocs.forEach(([px, pz], idx) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.2, 8), carbonMat);
    pillar.position.set(px, 1.6, pz);
    pillar.castShadow = true;
    mapGroup.add(pillar);

    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.25, 8),
      idx % 2 === 0 ? neonCyanMat : neonMagentaMat
    );
    ring.position.set(px, 2.8, pz);
    mapGroup.add(ring);

    obstacles.push({ box: new THREE.Box3().setFromObject(pillar) });
  });

  scene.add(mapGroup);
  return {
    obstacles,
    cleanUp: () => scene.remove(mapGroup)
  };
}

/**
 * Builds Map 3: Arctic Outpost Zero
 */
function buildArcticMap(scene: THREE.Scene) {
  const obstacles: MapObstacle[] = [];
  const mapGroup = new THREE.Group();

  // Snow terrain
  const snowTex = createGridCanvasTexture('#eef2f7', '#d0d8e2', 512, 16);
  snowTex.repeat.set(12, 12);
  const snowMat = new THREE.MeshStandardMaterial({
    map: snowTex,
    roughness: 0.8,
    metalness: 0.05
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), snowMat);
  ground.rotateX(-Math.PI / 2);
  ground.receiveShadow = true;
  mapGroup.add(ground);

  // Perimeter Glaciers / Ice Blocks
  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    roughness: 0.2,
    metalness: 0.1,
    transmission: 0.6,
    thickness: 1.2
  });

  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 5) {
    const r = 48 + Math.random() * 6;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const glacier = new THREE.Mesh(new THREE.DodecahedronGeometry(12, 1), iceMat);
    glacier.scale.set(1.4, 0.8, 1.2);
    glacier.position.set(x, 2, z);
    mapGroup.add(glacier);
    obstacles.push({ box: new THREE.Box3().setFromObject(glacier) });
  }

  // Central Geodesic Radar Dome Compound
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.7, roughness: 0.3 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xd9e2ec, roughness: 0.5 });

  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 3, 16), steelMat);
  domeBase.position.set(0, 1.5, 0);
  domeBase.castShadow = true;
  domeBase.receiveShadow = true;
  mapGroup.add(domeBase);

  const domeSphere = new THREE.Mesh(new THREE.SphereGeometry(7.2, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), whiteMat);
  domeSphere.position.set(0, 3, 0);
  domeSphere.castShadow = true;
  mapGroup.add(domeSphere);

  obstacles.push({ box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 3.5, 0), new THREE.Vector3(16, 7, 16)) });

  // Industrial Cryogenic Storage Tanks
  const tankPositions = [
    [-18, -12], [-14, -12], [18, 12], [14, 12],
    [-20, 14], [20, -14]
  ];
  tankPositions.forEach(([tx, tz]) => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 5, 12), whiteMat);
    tank.position.set(tx, 2.5, tz);
    tank.castShadow = true;
    tank.receiveShadow = true;
    mapGroup.add(tank);
    obstacles.push({ box: new THREE.Box3().setFromObject(tank) });
  });

  // Ice Barricades (Low cover)
  const barricadeLocs = [
    [-6, 1.0, -10, 0.4],
    [6, 1.0, 10, -0.4],
    [-10, 1.0, 6, 0.8],
    [10, 1.0, -6, -0.8]
  ];
  barricadeLocs.forEach(([bx, by, bz, rot]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 0.9), iceMat);
    bar.position.set(bx, by, bz);
    bar.rotateY(rot);
    bar.castShadow = true;
    mapGroup.add(bar);
    obstacles.push({ box: new THREE.Box3().setFromObject(bar) });
  });

  scene.add(mapGroup);
  return {
    obstacles,
    cleanUp: () => scene.remove(mapGroup)
  };
}

export const MAPS: Record<string, MapDefinition> = {
  dust: {
    id: 'dust',
    name: 'Dust Protocol',
    theme: 'Desert Outpost',
    description: 'Sun-bleached tactical outpost with sandstone compounds, shipping containers, and long sightlines.',
    fogColor: 0xd2b48c,
    fogDensity: 0.012,
    skyColor: 0xfffae6,
    groundColor: 0x8b6b4f,
    sunColor: 0xfff2cc,
    sunIntensity: 2.2,
    sunPosition: [35, 50, 25],
    alphaSpawn: [-25, 1.5, -28],
    bravoSpawn: [25, 1.5, 28],
    obstacles: [],
    buildScene: buildDustMap
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Neon Sector',
    theme: 'Neo-Tokyo Industrial',
    description: 'High-contrast nocturnal metropolis sector with glowing neon pylons and elevated metal catwalks.',
    fogColor: 0x060913,
    fogDensity: 0.018,
    skyColor: 0x00d2d3,
    groundColor: 0x1e152a,
    sunColor: 0x70a1ff,
    sunIntensity: 1.4,
    sunPosition: [15, 40, -20],
    alphaSpawn: [-24, 1.5, -24],
    bravoSpawn: [24, 1.5, 24],
    obstacles: [],
    buildScene: buildCyberMap
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Outpost Zero',
    theme: 'Sub-Zero Installation',
    description: 'Cryogenic research compound surrounded by snow banks, radar domes, and icy barricades.',
    fogColor: 0xc8d6e5,
    fogDensity: 0.015,
    skyColor: 0xe0f7fa,
    groundColor: 0x485460,
    sunColor: 0xf5f6fa,
    sunIntensity: 2.0,
    sunPosition: [-25, 45, 30],
    alphaSpawn: [-26, 1.5, -26],
    bravoSpawn: [26, 1.5, 26],
    obstacles: [],
    buildScene: buildArcticMap
  }
};
