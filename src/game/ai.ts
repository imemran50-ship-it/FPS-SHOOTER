import * as THREE from 'three';
import { buildSoldierMesh } from './models.ts';
import { WEAPONS, calculateDamageWithFalloff, WeaponStats } from './ballistics.ts';
import { soundEngine } from './audio.ts';
import { MapObstacle } from './maps.ts';

export interface BotActor {
  id: string;
  name: string;
  team: 'alpha' | 'bravo';
  policy: 'rusher' | 'marksman' | 'flanker';
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationY: number;
  health: number;
  maxHealth: number;
  weapon: WeaponStats;
  ammo: number;
  state: 'patrol' | 'aiming' | 'firing' | 'reloading' | 'dead';
  stateTimer: number;
  targetPos: THREE.Vector3 | null;
  mesh: THREE.Group;
  collider: THREE.Box3;
  aimTelegraphLine: THREE.Line;
  isAimingAtPlayer: boolean;
  score: number;
  kills: number;
  deaths: number;
}

export class BotManager {
  public bots: BotActor[] = [];
  private scratchVec = new THREE.Vector3();
  private scratchTarget = new THREE.Vector3();
  private activeAttackersCount = 0;
  private readonly maxConcurrentAttackers = 3;

  constructor(private scene: THREE.Scene, private obstacles: MapObstacle[]) {}

  public spawnBots(count: number, mapId: string) {
    this.clearBots();

    const spawnPointsBravo: [number, number, number][] = [
      [20, 1.5, 20],
      [15, 1.5, 25],
      [25, 1.5, 15],
      [18, 1.5, -5],
      [5, 1.5, 22]
    ];

    const botNames = ['Apex_Ghost', 'Viper_Reaper', 'Shadow_Hawk', 'Steel_Titan', 'Frost_Sniper'];
    const policies: ('rusher' | 'marksman' | 'flanker')[] = ['rusher', 'marksman', 'flanker', 'rusher', 'flanker'];
    const weapons = [WEAPONS.viper4, WEAPONS.apex_longshot, WEAPONS.havoc12, WEAPONS.viper4, WEAPONS.titan45];

    for (let i = 0; i < count; i++) {
      const spawn = spawnPointsBravo[i % spawnPointsBravo.length];
      const mesh = buildSoldierMesh('bravo');
      mesh.position.set(spawn[0] + (Math.random() - 0.5) * 4, 0, spawn[2] + (Math.random() - 0.5) * 4);

      // Aim telegraph laser line
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 1.4, 0),
        new THREE.Vector3(0, 1.4, -15)
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0
      });
      const aimLine = new THREE.Line(lineGeom, lineMat);
      mesh.add(aimLine);

      this.scene.add(mesh);

      const bot: BotActor = {
        id: `bot_${i}_${Date.now()}`,
        name: botNames[i % botNames.length],
        team: 'bravo',
        policy: policies[i % policies.length],
        position: mesh.position,
        velocity: new THREE.Vector3(),
        rotationY: Math.PI,
        health: 100,
        maxHealth: 100,
        weapon: weapons[i % weapons.length],
        ammo: weapons[i % weapons.length].magSize,
        state: 'patrol',
        stateTimer: 1 + Math.random() * 2,
        targetPos: null,
        mesh,
        collider: new THREE.Box3().setFromCenterAndSize(mesh.position, new THREE.Vector3(0.8, 1.8, 0.8)),
        aimTelegraphLine: aimLine,
        isAimingAtPlayer: false,
        score: 0,
        kills: 0,
        deaths: 0
      };

      this.bots.push(bot);
    }
  }

  public update(
    dt: number,
    playerPosition: THREE.Vector3,
    onBotDamagePlayer: (damage: number) => void
  ) {
    this.activeAttackersCount = 0;

    for (const bot of this.bots) {
      if (bot.state === 'dead') continue;

      bot.collider.setFromCenterAndSize(
        new THREE.Vector3(bot.position.x, bot.position.y + 0.9, bot.position.z),
        new THREE.Vector3(0.8, 1.8, 0.8)
      );

      const distToPlayer = bot.position.distanceTo(playerPosition);
      const canSeePlayer = distToPlayer < 45; // Line of sight candidate

      // State Machine
      bot.stateTimer -= dt;

      if (bot.state === 'patrol') {
        bot.isAimingAtPlayer = false;
        (bot.aimTelegraphLine.material as THREE.LineBasicMaterial).opacity = 0;

        // Move towards center or random patrol point
        if (!bot.targetPos || bot.stateTimer <= 0) {
          bot.targetPos = new THREE.Vector3(
            (Math.random() - 0.5) * 30,
            0,
            (Math.random() - 0.5) * 30
          );
          bot.stateTimer = 3 + Math.random() * 3;
        }

        // Steer towards target
        this.scratchVec.subVectors(bot.targetPos, bot.position);
        this.scratchVec.y = 0;
        if (this.scratchVec.lengthSq() > 1) {
          this.scratchVec.normalize();
          const speed = bot.policy === 'rusher' ? 4.2 : 3.0;
          bot.position.x += this.scratchVec.x * speed * dt;
          bot.position.z += this.scratchVec.z * speed * dt;
          bot.rotationY = Math.atan2(this.scratchVec.x, this.scratchVec.z);
        }

        // Transition to aiming if spotted player and under attack token budget
        if (canSeePlayer && this.activeAttackersCount < this.maxConcurrentAttackers) {
          this.activeAttackersCount++;
          bot.state = 'aiming';
          bot.stateTimer = bot.policy === 'marksman' ? 0.7 : 0.45; // Visible windup telegraph
          bot.isAimingAtPlayer = true;
        }
      } else if (bot.state === 'aiming') {
        this.activeAttackersCount++;
        // Turn towards player
        this.scratchVec.subVectors(playerPosition, bot.position);
        this.scratchVec.y = 0;
        bot.rotationY = Math.atan2(this.scratchVec.x, this.scratchVec.z);

        // Flash visual telegraph laser line
        (bot.aimTelegraphLine.material as THREE.LineBasicMaterial).opacity = 0.85;

        // Rusher closes in while aiming
        if (bot.policy === 'rusher' && distToPlayer > 8) {
          this.scratchVec.normalize();
          bot.position.x += this.scratchVec.x * 2.5 * dt;
          bot.position.z += this.scratchVec.z * 2.5 * dt;
        }

        if (bot.stateTimer <= 0) {
          bot.state = 'firing';
          bot.stateTimer = 60 / bot.weapon.fireRateRPM;
        }
      } else if (bot.state === 'firing') {
        this.activeAttackersCount++;
        (bot.aimTelegraphLine.material as THREE.LineBasicMaterial).opacity = 0.3;

        // Face player
        this.scratchVec.subVectors(playerPosition, bot.position);
        this.scratchVec.y = 0;
        bot.rotationY = Math.atan2(this.scratchVec.x, this.scratchVec.z);

        // Shoot bullet
        if (bot.ammo > 0) {
          bot.ammo--;
          soundEngine.playGunshot(bot.weapon.category);

          // Hit chance based on distance and policy
          const accuracyChance = bot.policy === 'marksman' ? 0.75 : 0.55;
          const hitSuccess = Math.random() < accuracyChance && distToPlayer < 40;

          if (hitSuccess) {
            const isHead = Math.random() < 0.15;
            const dmg = calculateDamageWithFalloff(bot.weapon, distToPlayer, isHead ? 'head' : 'torso');
            onBotDamagePlayer(dmg);
          }

          bot.stateTimer = 60 / bot.weapon.fireRateRPM;

          // If empty, reload
          if (bot.ammo <= 0) {
            bot.state = 'reloading';
            bot.stateTimer = bot.weapon.reloadTimeSec;
            (bot.aimTelegraphLine.material as THREE.LineBasicMaterial).opacity = 0;
          } else if (Math.random() < 0.25) {
            // Reposition / burst pause
            bot.state = 'patrol';
            bot.stateTimer = 1.0;
          }
        } else {
          bot.state = 'reloading';
          bot.stateTimer = bot.weapon.reloadTimeSec;
        }
      } else if (bot.state === 'reloading') {
        if (bot.stateTimer <= 0) {
          bot.ammo = bot.weapon.magSize;
          bot.state = 'patrol';
          bot.stateTimer = 1.5;
        }
      }

      // Update Mesh orientation & position
      bot.mesh.position.copy(bot.position);
      bot.mesh.rotation.y = bot.rotationY;
    }
  }

  public damageBot(
    botId: string,
    damage: number,
    isHeadshot: boolean
  ): { isKilled: boolean; bot: BotActor | null } {
    const bot = this.bots.find((b) => b.id === botId);
    if (!bot || bot.state === 'dead') return { isKilled: false, bot: null };

    bot.health -= damage;
    soundEngine.playHitmarker(isHeadshot);

    // Emissive damage flash
    const soldierMesh = bot.mesh;
    soldierMesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissive.setHex(0xffffff);
          setTimeout(() => {
            if (mat && mat.emissive) {
              mat.emissive.setHex(0xff3838);
            }
          }, 60);
        }
      }
    });

    if (bot.health <= 0) {
      bot.health = 0;
      bot.state = 'dead';
      bot.deaths++;
      (bot.aimTelegraphLine.material as THREE.LineBasicMaterial).opacity = 0;

      // KO Topple transition
      let topple = 0;
      const interval = setInterval(() => {
        topple += 0.15;
        bot.mesh.rotation.x = topple;
        bot.mesh.position.y = Math.max(0.1, bot.mesh.position.y - 0.05);
        if (topple >= Math.PI / 2) {
          clearInterval(interval);
          // Respawn bot after 5 seconds
          setTimeout(() => {
            if (bot.state === 'dead') {
              this.respawnBot(bot);
            }
          }, 4500);
        }
      }, 30);

      return { isKilled: true, bot };
    }

    return { isKilled: false, bot };
  }

  private respawnBot(bot: BotActor) {
    bot.health = bot.maxHealth;
    bot.ammo = bot.weapon.magSize;
    bot.state = 'patrol';
    bot.stateTimer = 2.0;
    bot.position.set((Math.random() - 0.5) * 30 + 15, 0, (Math.random() - 0.5) * 30 + 15);
    bot.mesh.position.copy(bot.position);
    bot.mesh.rotation.set(0, Math.random() * Math.PI * 2, 0);
  }

  public clearBots() {
    for (const bot of this.bots) {
      this.scene.remove(bot.mesh);
    }
    this.bots = [];
  }
}
