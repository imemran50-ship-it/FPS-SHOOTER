export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface WeaponStats {
  id: string;
  name: string;
  category: 'rifle' | 'sniper' | 'shotgun' | 'pistol';
  damage: number;
  fireRateRPM: number; // Rounds per minute
  magSize: number;
  maxReserveAmmo: number;
  reloadTimeSec: number;
  muzzleVelocity: number; // meters/second
  bulletDropFactor: number;
  baseSpreadRad: number; // base dispersion cone radius in radians
  adsSpreadMultiplier: number;
  crouchSpreadMultiplier: number;
  moveSpreadMultiplier: number;
  bloomPerShotRad: number;
  maxBloomRad: number;
  bloomRecoverySpeed: number; // rad/sec
  verticalRecoil: number; // pitch kick per shot in radians
  horizontalRecoil: number; // max yaw kick per shot in radians
  recoilRecoveryRate: number; // spring stiffness
  pelletCount: number; // >1 for shotguns
  damageFalloffStartM: number;
  damageFalloffEndM: number;
  minDamageMultiplier: number;
  scopeZoomFOV: number; // Target FOV when ADS (e.g., 50 for rifle, 20 for sniper)
}

export const WEAPONS: Record<string, WeaponStats> = {
  viper4: {
    id: 'viper4',
    name: 'Viper-4 AR',
    category: 'rifle',
    damage: 34,
    fireRateRPM: 650,
    magSize: 30,
    maxReserveAmmo: 120,
    reloadTimeSec: 2.1,
    muzzleVelocity: 720,
    bulletDropFactor: 1.0,
    baseSpreadRad: 0.012,
    adsSpreadMultiplier: 0.25,
    crouchSpreadMultiplier: 0.7,
    moveSpreadMultiplier: 2.2,
    bloomPerShotRad: 0.005,
    maxBloomRad: 0.045,
    bloomRecoverySpeed: 0.15,
    verticalRecoil: 0.024,
    horizontalRecoil: 0.012,
    recoilRecoveryRate: 14.0,
    pelletCount: 1,
    damageFalloffStartM: 25,
    damageFalloffEndM: 80,
    minDamageMultiplier: 0.55,
    scopeZoomFOV: 50
  },
  apex_longshot: {
    id: 'apex_longshot',
    name: 'Apex Longshot',
    category: 'sniper',
    damage: 110,
    fireRateRPM: 55,
    magSize: 5,
    maxReserveAmmo: 25,
    reloadTimeSec: 3.2,
    muzzleVelocity: 950,
    bulletDropFactor: 0.6,
    baseSpreadRad: 0.001,
    adsSpreadMultiplier: 0.05,
    crouchSpreadMultiplier: 0.5,
    moveSpreadMultiplier: 5.0,
    bloomPerShotRad: 0.08,
    maxBloomRad: 0.12,
    bloomRecoverySpeed: 0.1,
    verticalRecoil: 0.085,
    horizontalRecoil: 0.025,
    recoilRecoveryRate: 8.0,
    pelletCount: 1,
    damageFalloffStartM: 60,
    damageFalloffEndM: 150,
    minDamageMultiplier: 0.8,
    scopeZoomFOV: 22
  },
  havoc12: {
    id: 'havoc12',
    name: 'Havoc-12 CQB',
    category: 'shotgun',
    damage: 18, // 18 * 8 = 144 max point blank
    fireRateRPM: 140,
    magSize: 8,
    maxReserveAmmo: 40,
    reloadTimeSec: 2.6,
    muzzleVelocity: 420,
    bulletDropFactor: 1.5,
    baseSpreadRad: 0.055,
    adsSpreadMultiplier: 0.65,
    crouchSpreadMultiplier: 0.8,
    moveSpreadMultiplier: 1.5,
    bloomPerShotRad: 0.02,
    maxBloomRad: 0.09,
    bloomRecoverySpeed: 0.2,
    verticalRecoil: 0.065,
    horizontalRecoil: 0.03,
    recoilRecoveryRate: 12.0,
    pelletCount: 8,
    damageFalloffStartM: 8,
    damageFalloffEndM: 30,
    minDamageMultiplier: 0.2,
    scopeZoomFOV: 58
  },
  titan45: {
    id: 'titan45',
    name: 'Titan .45',
    category: 'pistol',
    damage: 38,
    fireRateRPM: 420,
    magSize: 12,
    maxReserveAmmo: 60,
    reloadTimeSec: 1.5,
    muzzleVelocity: 480,
    bulletDropFactor: 1.2,
    baseSpreadRad: 0.018,
    adsSpreadMultiplier: 0.35,
    crouchSpreadMultiplier: 0.75,
    moveSpreadMultiplier: 1.6,
    bloomPerShotRad: 0.008,
    maxBloomRad: 0.05,
    bloomRecoverySpeed: 0.25,
    verticalRecoil: 0.028,
    horizontalRecoil: 0.015,
    recoilRecoveryRate: 16.0,
    pelletCount: 1,
    damageFalloffStartM: 15,
    damageFalloffEndM: 45,
    minDamageMultiplier: 0.45,
    scopeZoomFOV: 60
  }
};

/**
 * Calculates projectile position along a realistic ballistic curve with gravity.
 */
export function calculateBallisticTrajectory(
  origin: Vector3D,
  direction: Vector3D,
  velocity: number,
  gravity: number,
  timeSec: number
): Vector3D {
  return {
    x: origin.x + direction.x * velocity * timeSec,
    y: origin.y + direction.y * velocity * timeSec - 0.5 * gravity * timeSec * timeSec,
    z: origin.z + direction.z * velocity * timeSec
  };
}

/**
 * Computes dynamic dispersion/bloom based on player state (ADS, crouch, moving, fire count).
 */
export function calculateWeaponDispersion(
  weapon: WeaponStats,
  state: {
    isADS: boolean;
    isCrouching: boolean;
    isMoving: boolean;
    continuousFireShots: number;
  }
): number {
  let spread = weapon.baseSpreadRad;

  if (state.isADS) {
    spread *= weapon.adsSpreadMultiplier;
  }
  if (state.isCrouching) {
    spread *= weapon.crouchSpreadMultiplier;
  }
  if (state.isMoving) {
    spread *= weapon.moveSpreadMultiplier;
  }

  const bloom = Math.min(state.continuousFireShots * weapon.bloomPerShotRad, weapon.maxBloomRad);
  return spread + bloom;
}

/**
 * Calculates damage with linear distance falloff and anatomical hit multipliers.
 */
export function calculateDamageWithFalloff(
  weapon: WeaponStats,
  distanceM: number,
  hitLocation: 'head' | 'torso' | 'limb'
): number {
  let falloff = 1.0;
  if (distanceM > weapon.damageFalloffStartM) {
    const range = weapon.damageFalloffEndM - weapon.damageFalloffStartM;
    const progress = Math.min(1.0, Math.max(0.0, (distanceM - weapon.damageFalloffStartM) / range));
    falloff = 1.0 - progress * (1.0 - weapon.minDamageMultiplier);
  }

  let locationMultiplier = 1.0;
  if (hitLocation === 'head') {
    locationMultiplier = 2.0; // Instant reward for precise marksman headshot
  } else if (hitLocation === 'limb') {
    locationMultiplier = 0.75;
  }

  const calculatedDamage = weapon.damage * falloff * locationMultiplier;
  return Math.max(1, Math.round(calculatedDamage));
}

/**
 * Recovers weapon recoil smoothly towards zero using exponential damping.
 */
export function calculateRecoilRecovery(
  currentRecoil: { pitch: number; yaw: number },
  dt: number,
  recoveryRate: number
): { pitch: number; yaw: number } {
  const decay = Math.exp(-recoveryRate * dt);
  return {
    pitch: Math.max(0, currentRecoil.pitch * decay),
    yaw: currentRecoil.yaw * decay
  };
}
