import * as THREE from 'three';

// Procedural texture generators to guarantee ZERO external 404 dependencies
export function createGridCanvasTexture(baseColor: string, lineColor: string, size = 512, gridCount = 16): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  const step = size / gridCount;

  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCamouflageTexture(color1: string, color2: string, color3: string, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, size, size);

  // Procedural camouflage blotches
  const colors = [color2, color3];
  for (let c = 0; c < colors.length; c++) {
    ctx.fillStyle = colors[c];
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 15 + Math.random() * 35;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a soft radial contact shadow disc flush with ground.
 */
export function createContactShadow(radius = 0.6): THREE.Mesh {
  const geom = new THREE.CircleGeometry(radius, 16);
  geom.rotateX(-Math.PI / 2);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = 0.02;
  return mesh;
}

/**
 * Procedural Composite 3-12 Part Weapon Models
 */
export function buildWeaponMesh(weaponId: string): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1f242e,
    metalness: 0.85,
    roughness: 0.25
  });

  const darkPolymerMat = new THREE.MeshStandardMaterial({
    color: 0x11141a,
    metalness: 0.1,
    roughness: 0.75
  });

  const opticGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x00ffcc,
    transmission: 0.9,
    roughness: 0.05,
    metalness: 0.1,
    emissive: 0x003322,
    emissiveIntensity: 0.4
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xe67e22,
    metalness: 0.6,
    roughness: 0.4
  });

  if (weaponId === 'apex_longshot') {
    // 1. Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.45), steelMat);
    group.add(receiver);

    // 2. Long Fluted Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.8, 12), steelMat);
    barrel.rotateX(Math.PI / 2);
    barrel.position.set(0, 0.02, -0.55);
    group.add(barrel);

    // 3. Muzzle Brake
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.09), accentMat);
    muzzle.position.set(0, 0.02, -0.98);
    group.add(muzzle);

    // 4. Large Sniper Scope
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 12), darkPolymerMat);
    scopeTube.rotateX(Math.PI / 2);
    scopeTube.position.set(0, 0.11, -0.05);
    group.add(scopeTube);

    // 5. Scope Lens
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 12), opticGlassMat);
    lens.rotateX(Math.PI / 2);
    lens.position.set(0, 0.11, -0.22);
    group.add(lens);

    // 6. Bolt Action Handle
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), steelMat);
    bolt.rotateZ(Math.PI / 3);
    bolt.position.set(0.05, 0.06, 0.08);
    group.add(bolt);

    // 7. Marksman Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), darkPolymerMat);
    stock.position.set(0, -0.02, 0.32);
    group.add(stock);

    // 8. Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), darkPolymerMat);
    grip.rotateX(-0.3);
    grip.position.set(0, -0.12, 0.08);
    group.add(grip);
  } else if (weaponId === 'havoc12') {
    // Shotgun Havoc-12
    // 1. Heavy Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.38), darkPolymerMat);
    group.add(receiver);

    // 2. Heavy Gauge Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 12), steelMat);
    barrel.rotateX(Math.PI / 2);
    barrel.position.set(0, 0.03, -0.42);
    group.add(barrel);

    // 3. Mag Tube Under Barrel
    const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.45, 12), steelMat);
    magTube.rotateX(Math.PI / 2);
    magTube.position.set(0, -0.02, -0.38);
    group.add(magTube);

    // 4. Ribbed Pump Forend
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.22, 10), darkPolymerMat);
    pump.rotateX(Math.PI / 2);
    pump.position.set(0, -0.02, -0.32);
    group.add(pump);

    // 5. Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.28), darkPolymerMat);
    stock.position.set(0, -0.02, 0.28);
    group.add(stock);

    // 6. Pistol Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), darkPolymerMat);
    grip.rotateX(-0.25);
    grip.position.set(0, -0.1, 0.06);
    group.add(grip);

    // 7. Tactical Sight
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.03), accentMat);
    sight.position.set(0, 0.07, -0.66);
    group.add(sight);
  } else if (weaponId === 'titan45') {
    // Pistol Titan .45
    // 1. Slide
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.22), steelMat);
    slide.position.set(0, 0.03, -0.02);
    group.add(slide);

    // 2. Polymer Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.05, 0.18), darkPolymerMat);
    frame.position.set(0, -0.01, -0.01);
    group.add(frame);

    // 3. Barrel Tip
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 10), steelMat);
    barrel.rotateX(Math.PI / 2);
    barrel.position.set(0, 0.03, -0.14);
    group.add(barrel);

    // 4. Ergonomic Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.14, 0.07), darkPolymerMat);
    grip.rotateX(-0.35);
    grip.position.set(0, -0.09, 0.03);
    group.add(grip);

    // 5. Mag baseplate
    const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.015, 0.07), steelMat);
    magBase.rotateX(-0.35);
    magBase.position.set(0, -0.16, 0.055);
    group.add(magBase);

    // 6. Sights
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.015), opticGlassMat);
    frontSight.position.set(0, 0.065, -0.11);
    group.add(frontSight);
  } else {
    // Default: Viper-4 Tactical Assault Rifle
    // 1. Upper Receiver
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.35), steelMat);
    group.add(upper);

    // 2. Picatinny Rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.32), darkPolymerMat);
    rail.position.set(0, 0.045, 0);
    group.add(rail);

    // 3. Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 10), steelMat);
    barrel.rotateX(Math.PI / 2);
    barrel.position.set(0, 0.01, -0.38);
    group.add(barrel);

    // 4. Muzzle Flash Hider
    const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.06, 8), accentMat);
    flashHider.rotateX(Math.PI / 2);
    flashHider.position.set(0, 0.01, -0.62);
    group.add(flashHider);

    // 5. Handguard Heat Shield
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.26), darkPolymerMat);
    handguard.position.set(0, 0.005, -0.28);
    group.add(handguard);

    // 6. Curved Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.08), darkPolymerMat);
    mag.rotateX(-0.18);
    mag.position.set(0, -0.11, -0.06);
    group.add(mag);

    // 7. Tactical Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.15, 0.06), darkPolymerMat);
    grip.rotateX(-0.3);
    grip.position.set(0, -0.09, 0.09);
    group.add(grip);

    // 8. Collapsible Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.24), darkPolymerMat);
    stock.position.set(0, -0.01, 0.26);
    group.add(stock);

    // 9. Reflex Optic Sight
    const opticHousing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.09), darkPolymerMat);
    opticHousing.position.set(0, 0.075, -0.02);
    group.add(opticHousing);

    const opticLens = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), opticGlassMat);
    opticLens.position.set(0, 0.075, -0.05);
    group.add(opticLens);
  }

  return group;
}

/**
 * Procedural Composite 3-12 Part Tactical Soldier Model
 */
export function buildSoldierMesh(team: 'alpha' | 'bravo' = 'alpha'): THREE.Group {
  const soldier = new THREE.Group();

  const isAlpha = team === 'alpha';
  const suitColor = isAlpha ? 0x1b2838 : 0x22181c;
  const armorColor = isAlpha ? 0x2c3e50 : 0x78281f;
  const visorColor = isAlpha ? 0x00d2d3 : 0xff3838;

  const suitMat = new THREE.MeshStandardMaterial({
    color: suitColor,
    roughness: 0.8,
    metalness: 0.1
  });

  const armorMat = new THREE.MeshStandardMaterial({
    color: armorColor,
    roughness: 0.45,
    metalness: 0.4
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: visorColor,
    emissive: visorColor,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.9
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x202025,
    roughness: 0.6
  });

  // 1. Torso Plate Carrier Armor (Chest)
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.3), armorMat);
  chest.position.y = 1.15;
  soldier.add(chest);

  // 2. Tactical Pouches on Vest
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.08), suitMat);
  pouch.position.set(0, 1.05, 0.18);
  soldier.add(pouch);

  // 3. Tactical Helmet
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), armorMat);
  helmet.position.y = 1.62;
  soldier.add(helmet);

  // 4. Glow Visor Glass
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.08), visorMat);
  visor.position.set(0, 1.62, 0.16);
  soldier.add(visor);

  // 5. Left Leg
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.68, 8), suitMat);
  leftLeg.position.set(-0.15, 0.45, 0);
  soldier.add(leftLeg);

  // 6. Right Leg
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.68, 8), suitMat);
  rightLeg.position.set(0.15, 0.45, 0);
  soldier.add(rightLeg);

  // 7. Tactical Boots
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), skinMat);
  leftBoot.position.set(-0.15, 0.06, 0.04);
  soldier.add(leftBoot);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), skinMat);
  rightBoot.position.set(0.15, 0.06, 0.04);
  soldier.add(rightBoot);

  // 8. Right Arm holding gun
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.5, 8), suitMat);
  rightArm.rotateX(-Math.PI / 4);
  rightArm.position.set(0.32, 1.15, 0.16);
  soldier.add(rightArm);

  // 9. Left Arm supporting gun
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.5, 8), suitMat);
  leftArm.rotateX(-Math.PI / 3);
  leftArm.rotateZ(0.3);
  leftArm.position.set(-0.3, 1.12, 0.18);
  soldier.add(leftArm);

  // 10. Equipped Weapon Mesh
  const weapon = buildWeaponMesh('viper4');
  weapon.scale.set(0.7, 0.7, 0.7);
  weapon.position.set(0.18, 1.05, 0.38);
  soldier.add(weapon);

  // 11. Soft Radial Contact Shadow Grounding
  const shadow = createContactShadow(0.55);
  soldier.add(shadow);

  return soldier;
}
