import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBallisticTrajectory,
  calculateWeaponDispersion,
  calculateDamageWithFalloff,
  calculateRecoilRecovery,
  WEAPONS
} from './ballistics.ts';
import type { WeaponStats } from './ballistics.ts';

test('ballistics: calculateBallisticTrajectory computes projectile drop and velocity correctly', () => {
  const muzzleVelocity = 800; // m/s
  const gravity = 9.81;
  const time = 0.5; // seconds
  const result = calculateBallisticTrajectory(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 0, z: -1 },
    muzzleVelocity,
    gravity,
    time
  );

  assert.equal(result.x, 0);
  assert.equal(result.z, -400); // 800 * 0.5
  // y = 1.5 + 0 - 0.5 * 9.81 * 0.25 = 1.5 - 1.22625 = 0.27375
  assert.ok(Math.abs(result.y - 0.27375) < 0.001);
});

test('ballistics: weapon dispersion increases with fire and decreases with ADS and crouch', () => {
  const rifle = WEAPONS['viper4'];
  const hipfireSpread = calculateWeaponDispersion(rifle, {
    isADS: false,
    isCrouching: false,
    isMoving: false,
    continuousFireShots: 0
  });

  const adsSpread = calculateWeaponDispersion(rifle, {
    isADS: true,
    isCrouching: false,
    isMoving: false,
    continuousFireShots: 0
  });

  const movingSpread = calculateWeaponDispersion(rifle, {
    isADS: false,
    isCrouching: false,
    isMoving: true,
    continuousFireShots: 0
  });

  const bloomingSpread = calculateWeaponDispersion(rifle, {
    isADS: false,
    isCrouching: false,
    isMoving: false,
    continuousFireShots: 10
  });

  assert.ok(adsSpread < hipfireSpread, 'ADS spread must be smaller than hipfire');
  assert.ok(movingSpread > hipfireSpread, 'Moving spread must be larger than stationary hipfire');
  assert.ok(bloomingSpread > hipfireSpread, 'Continuous fire bloom must increase spread');
});

test('ballistics: damage falloff and hit location multiplier work accurately', () => {
  const rifle = WEAPONS['viper4'];
  const baseDmg = rifle.damage;

  const closeHeadshot = calculateDamageWithFalloff(rifle, 10, 'head');
  const closeTorso = calculateDamageWithFalloff(rifle, 10, 'torso');
  const farTorso = calculateDamageWithFalloff(rifle, 120, 'torso');
  const closeLeg = calculateDamageWithFalloff(rifle, 10, 'limb');

  assert.equal(closeTorso, baseDmg);
  assert.equal(closeHeadshot, Math.round(baseDmg * 2.0));
  assert.ok(farTorso < closeTorso, 'Distant shots must suffer damage falloff');
  assert.ok(closeLeg < closeTorso, 'Limb shots deal reduced damage');
});

test('ballistics: recoil recovery smoothly damps towards zero', () => {
  const initialPitch = 0.15;
  const initialYaw = 0.05;
  const recovered = calculateRecoilRecovery({ pitch: initialPitch, yaw: initialYaw }, 0.05, 12);

  assert.ok(recovered.pitch < initialPitch, 'Recoil pitch must recover over time');
  assert.ok(recovered.yaw < initialYaw, 'Recoil yaw must recover over time');
  assert.ok(recovered.pitch >= 0);
  assert.ok(recovered.yaw >= 0);
});
