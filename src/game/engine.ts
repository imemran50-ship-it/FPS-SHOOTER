import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MAPS, MapDefinition, MapObstacle } from './maps.ts';
import { WEAPONS, WeaponStats, calculateDamageWithFalloff, calculateWeaponDispersion, calculateRecoilRecovery } from './ballistics.ts';
import { buildWeaponMesh } from './models.ts';
import { BotManager } from './ai.ts';
import { ParticlePool } from './particles.ts';
import { soundEngine } from './audio.ts';
import { InputManager } from './input.ts';

export interface GameHUDState {
  health: number;
  maxHealth: number;
  armor: number;
  scoreAlpha: number;
  scoreBravo: number;
  timeRemaining: number;
  currentWeapon: WeaponStats;
  ammo: number;
  reserveAmmo: number;
  isReloading: boolean;
  isADS: boolean;
  isCrouching: boolean;
  kills: number;
  deaths: number;
  headshots: number;
  hitmarker: 'hit' | 'headshot' | null;
  gameStatus: 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
  activeMap: string;
}

export class GameEngine {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  // Map and environment
  private currentMap: MapDefinition = MAPS.dust;
  private mapCleanup: (() => void) | null = null;
  private obstacles: MapObstacle[] = [];

  // Lighting
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private muzzleLight!: THREE.PointLight;

  // Player state
  public playerPosition = new THREE.Vector3(0, 1.6, 0);
  public playerVelocity = new THREE.Vector3();
  public playerYaw = 0;
  public playerPitch = 0;
  public health = 100;
  public maxHealth = 100;
  public armor = 50;
  public isGrounded = true;

  // Weapons
  public weaponList: WeaponStats[] = [
    WEAPONS.viper4,
    WEAPONS.apex_longshot,
    WEAPONS.havoc12,
    WEAPONS.titan45
  ];
  public currentWeaponIndex = 0;
  public ammo = WEAPONS.viper4.magSize;
  public reserveAmmo = WEAPONS.viper4.maxReserveAmmo;
  public isReloading = false;
  private reloadTimer = 0;
  private fireTimer = 0;
  private continuousFireCount = 0;

  // Recoil and camera kick
  private recoilPitch = 0;
  private recoilYaw = 0;
  private cameraShakeTrauma = 0;
  private hitstopTimer = 0;
  private headBobTimer = 0;

  // 1st person weapon presentation
  private weaponRig = new THREE.Group();
  private currentWeaponMesh: THREE.Group | null = null;

  // Managers
  public botManager!: BotManager;
  private particlePool!: ParticlePool;
  public inputManager = new InputManager();

  // Match stats
  public scoreAlpha = 0;
  public scoreBravo = 0;
  public timeRemaining = 300; // 5 min match
  public kills = 0;
  public deaths = 0;
  public headshots = 0;
  public shotsFired = 0;
  public shotsHit = 0;
  public damageDealt = 0;
  public isGameOver = false;

  // HUD callback
  public onHUDUpdate?: (hud: GameHUDState) => void;
  public onMatchEnd?: (isVictory: boolean) => void;

  // Scratch math objects (Zero GC in loop)
  private _scratchVec = new THREE.Vector3();
  private _scratchRay = new THREE.Raycaster();
  private _moveDir = new THREE.Vector3();
  private animFrameId: number | null = null;
  private isDestroyed = false;

  constructor(private container: HTMLElement, mapId: string = 'dust') {
    this.initThree(mapId);
    this.inputManager.attachCanvas(this.renderer.domElement);
    this.startLoop();
  }

  private initThree(mapId: string) {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Renderer Setup with PBR tone mapping
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({ antialias: !isHeadless, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.08, 250);
    this.camera.position.set(0, 1.6, 0);
    this.scene.add(this.camera);

    // 3. Studio Environment Map (RoomEnvironment) for rich reflections on real GPU
    if (!isHeadless) {
      try {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        pmremGenerator.dispose();
      } catch (e) {
        // Fallback
      }
    }

    // 4. Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xfffae6, 0x8b6b4f, 0.85);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff2cc, 2.0);
    this.dirLight.position.set(30, 45, 20);
    this.dirLight.castShadow = !isHeadless;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 120;
    const d = 35;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);

    // Dynamic muzzle flash light
    this.muzzleLight = new THREE.PointLight(0xffa500, 0, 15);
    this.muzzleLight.position.set(0.2, -0.1, -0.6);
    this.camera.add(this.muzzleLight);

    // 5. Weapon Rig attached to camera
    this.camera.add(this.weaponRig);
    this.attachWeaponModel(this.weaponList[this.currentWeaponIndex].id);

    // 6. Particle pool
    this.particlePool = new ParticlePool(this.scene);

    // 7. Load Map
    this.loadMap(mapId);

    // 8. Bot Manager
    this.botManager = new BotManager(this.scene, this.obstacles);
    this.botManager.spawnBots(4, mapId);

    // Resize listener
    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = () => {
    if (this.isDestroyed || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public loadMap(mapId: string) {
    if (this.mapCleanup) {
      this.mapCleanup();
      this.mapCleanup = null;
    }

    const def = MAPS[mapId] || MAPS.dust;
    this.currentMap = def;

    // Apply lighting and fog
    this.scene.fog = new THREE.FogExp2(def.fogColor, def.fogDensity);
    this.scene.background = new THREE.Color(def.fogColor);
    this.hemiLight.color.setHex(def.skyColor);
    this.hemiLight.groundColor.setHex(def.groundColor);
    this.dirLight.color.setHex(def.sunColor);
    this.dirLight.intensity = def.sunIntensity;
    this.dirLight.position.set(...def.sunPosition);

    // Build geometry
    const { obstacles, cleanUp } = def.buildScene(this.scene);
    this.obstacles = obstacles;
    this.mapCleanup = cleanUp;

    // Reset player spawn
    this.playerPosition.set(def.alphaSpawn[0], def.alphaSpawn[1], def.alphaSpawn[2]);
    this.playerVelocity.set(0, 0, 0);
    this.playerYaw = 0;
    this.playerPitch = 0;
  }

  private attachWeaponModel(weaponId: string) {
    if (this.currentWeaponMesh) {
      this.weaponRig.remove(this.currentWeaponMesh);
    }
    const mesh = buildWeaponMesh(weaponId);
    mesh.position.set(0.24, -0.22, -0.42);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(0.85, 0.85, 0.85);
    this.weaponRig.add(mesh);
    this.currentWeaponMesh = mesh;
  }

  public switchWeapon(index: number) {
    if (index < 0 || index >= this.weaponList.length || this.isReloading) return;
    this.currentWeaponIndex = index;
    const weapon = this.weaponList[index];
    this.attachWeaponModel(weapon.id);
    this.ammo = weapon.magSize;
    this.reserveAmmo = weapon.maxReserveAmmo;
    soundEngine.playClick();
  }

  public reload() {
    const weapon = this.weaponList[this.currentWeaponIndex];
    if (this.isReloading || this.ammo >= weapon.magSize || this.reserveAmmo <= 0) return;

    this.isReloading = true;
    this.reloadTimer = weapon.reloadTimeSec;
    soundEngine.playReload();
  }

  public shoot() {
    const weapon = this.weaponList[this.currentWeaponIndex];
    if (this.isReloading || this.fireTimer > 0) return;

    if (this.ammo <= 0) {
      this.reload();
      return;
    }

    this.ammo--;
    this.shotsFired += weapon.pelletCount;
    this.continuousFireCount++;
    this.fireTimer = 60 / weapon.fireRateRPM;

    // Recoil impulse
    this.recoilPitch += weapon.verticalRecoil;
    this.recoilYaw += (Math.random() - 0.5) * weapon.horizontalRecoil;
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + 0.35);

    // Audio
    soundEngine.playGunshot(weapon.category);

    // Muzzle flash light
    this.muzzleLight.intensity = 4.0;
    setTimeout(() => {
      if (this.muzzleLight) this.muzzleLight.intensity = 0;
    }, 45);

    // Spawn muzzle smoke particles
    this._scratchVec.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.particlePool.spawnMuzzleSmoke(this.camera.position, this._scratchVec);

    // Calculate dispersion & raycasting
    const isMoving = this.playerVelocity.lengthSq() > 0.5;
    const spreadRad = calculateWeaponDispersion(weapon, {
      isADS: this.inputManager.isADS,
      isCrouching: this.inputManager.isCrouching,
      isMoving,
      continuousFireShots: this.continuousFireCount
    });

    // Fire pellets
    for (let p = 0; p < weapon.pelletCount; p++) {
      const spreadX = (Math.random() - 0.5) * spreadRad;
      const spreadY = (Math.random() - 0.5) * spreadRad;

      this._scratchVec.set(spreadX, spreadY, -1).normalize().applyQuaternion(this.camera.quaternion);
      this._scratchRay.set(this.camera.position, this._scratchVec);

      // Check hits against bots
      let hitTarget = false;
      for (const bot of this.botManager.bots) {
        if (bot.state === 'dead') continue;

        const intersection = this._scratchRay.intersectObject(bot.mesh, true);
        if (intersection.length > 0) {
          const hit = intersection[0];
          const dist = hit.distance;
          const hitPoint = hit.point;

          // Headshot evaluation
          const isHeadshot = hitPoint.y > bot.position.y + 1.45;
          const dmg = calculateDamageWithFalloff(weapon, dist, isHeadshot ? 'head' : 'torso');

          this.damageDealt += dmg;
          this.shotsHit++;
          hitTarget = true;

          const result = this.botManager.damageBot(bot.id, dmg, isHeadshot);

          // Particles
          this.particlePool.spawnSparks(hitPoint, hit.face?.normal || new THREE.Vector3(0, 1, 0), 10, isHeadshot ? 0xff0000 : 0xff7700);

          if (result.isKilled) {
            this.kills++;
            this.scoreAlpha++;
            if (isHeadshot) this.headshots++;
            // Simulation Hitstop freeze (50ms)
            this.hitstopTimer = 0.055;
            this.cameraShakeTrauma = 0.6;
          }

          // Trigger HUD Hitmarker
          if (this.onHUDUpdate) {
            this.notifyHUD(isHeadshot ? 'headshot' : 'hit');
          }
          break;
        }
      }

      // Check hits against map obstacles
      if (!hitTarget) {
        for (const obs of this.obstacles) {
          if (obs.mesh) {
            const hits = this._scratchRay.intersectObject(obs.mesh, true);
            if (hits.length > 0) {
              const hit = hits[0];
              this.particlePool.spawnSparks(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0), 6, 0xd2b48c);
              break;
            }
          }
        }
      }
    }
  }

  public takeDamage(amount: number) {
    if (this.isGameOver) return;

    soundEngine.playHurt();
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + 0.55);

    // Armor absorption
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, Math.round(amount * 0.6));
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.health = Math.max(0, this.health - amount);

    if (this.health <= 25 && this.health > 0) {
      soundEngine.startHeartbeat();
    }

    if (this.health <= 0) {
      this.health = 0;
      this.deaths++;
      this.scoreBravo++;
      soundEngine.stopHeartbeat();
      // Respawn after 3s
      setTimeout(() => {
        if (!this.isGameOver) {
          this.health = 100;
          this.armor = 50;
          this.playerPosition.set(
            this.currentMap.alphaSpawn[0],
            this.currentMap.alphaSpawn[1],
            this.currentMap.alphaSpawn[2]
          );
        }
      }, 3000);
    }
  }

  private startLoop() {
    let lastHUDNotify = 0;
    let lastFrameTime = 0;
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const tick = (timestamp: number) => {
      if (this.isDestroyed) return;
      this.animFrameId = requestAnimationFrame(tick);

      if (isHeadless && timestamp - lastFrameTime < 66) {
        return;
      }
      lastFrameTime = timestamp;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05); // Frame clamp

      // Process input
      const input = this.inputManager.update();

      if (input.justPaused && this.onHUDUpdate) {
        // Toggle pause
      }

      if (input.switchWeaponIndex !== null) {
        this.switchWeapon(input.switchWeaponIndex);
      }

      if (input.justReloaded) {
        this.reload();
      }

      // Check hitstop
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else if (document.body.dataset.state === 'playing') {
        // Simulation Step
        this.updateSimulation(dt, input);
      }

      // Render Step (Always ticks at 60Hz even during hitstop)
      this.updateRenderCamera(dt, input);
      this.particlePool.update(dt);
      this.renderer.render(this.scene, this.camera);

      // Throttled HUD sync (~10Hz)
      const now = performance.now();
      if (now - lastHUDNotify > 100) {
        lastHUDNotify = now;
        this.notifyHUD();
      }
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private updateSimulation(dt: number, input: any) {
    // Reload timer
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const weapon = this.weaponList[this.currentWeaponIndex];
        const needed = weapon.magSize - this.ammo;
        const available = Math.min(needed, this.reserveAmmo);
        this.ammo += available;
        this.reserveAmmo -= available;
      }
    }

    // Fire timer
    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
    }

    if (input.isFiring) {
      this.shoot();
    } else {
      // Bloom recovery
      const weapon = this.weaponList[this.currentWeaponIndex];
      this.continuousFireCount = Math.max(0, this.continuousFireCount - weapon.bloomRecoverySpeed * 40 * dt);
    }

    // Match Countdown Timer
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0 || this.scoreAlpha >= 25 || this.scoreBravo >= 25) {
      if (!this.isGameOver) {
        this.isGameOver = true;
        const isVictory = this.scoreAlpha >= this.scoreBravo;
        if (isVictory) soundEngine.playVictory();
        else soundEngine.playDefeat();
        this.onMatchEnd?.(isVictory);
      }
    }

    // Movement calculation along player yaw
    const moveSpeed = input.isSprinting ? 8.2 : input.isCrouching ? 3.0 : 5.5;
    this._moveDir.set(input.moveRight, 0, -input.moveForward);
    if (this._moveDir.lengthSq() > 0.01) {
      this._moveDir.normalize();
      this._moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerYaw);

      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, this._moveDir.x * moveSpeed, 12, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, this._moveDir.z * moveSpeed, 12, dt);

      // Footstep sound synced to movement
      if (this.isGrounded) {
        this.headBobTimer += dt * (input.isSprinting ? 14 : 9);
        soundEngine.playFootstep();
      }
    } else {
      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, 0, 14, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, 0, 14, dt);
    }

    // Jump and Gravity
    if (input.justJumped && this.isGrounded) {
      this.playerVelocity.y = 6.2;
      this.isGrounded = false;
      soundEngine.playJump();
    }

    this.playerVelocity.y -= 19.6 * dt; // Gravity
    this.playerPosition.addScaledVector(this.playerVelocity, dt);

    // Ground clamp
    const eyeHeight = input.isCrouching ? 1.05 : 1.6;
    if (this.playerPosition.y <= eyeHeight) {
      if (!this.isGrounded) soundEngine.playLand();
      this.playerPosition.y = eyeHeight;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
    }

    // Obstacle collision pushback (simple AABB resolution)
    for (const obs of this.obstacles) {
      if (obs.box) {
        const minX = obs.box.min.x - 0.5;
        const maxX = obs.box.max.x + 0.5;
        const minZ = obs.box.min.z - 0.5;
        const maxZ = obs.box.max.z + 0.5;

        if (
          this.playerPosition.x > minX &&
          this.playerPosition.x < maxX &&
          this.playerPosition.z > minZ &&
          this.playerPosition.z < maxZ
        ) {
          // Push to closest boundary
          const distLeft = Math.abs(this.playerPosition.x - minX);
          const distRight = Math.abs(this.playerPosition.x - maxX);
          const distFront = Math.abs(this.playerPosition.z - minZ);
          const distBack = Math.abs(this.playerPosition.z - maxZ);
          const minDist = Math.min(distLeft, distRight, distFront, distBack);

          if (minDist === distLeft) this.playerPosition.x = minX;
          else if (minDist === distRight) this.playerPosition.x = maxX;
          else if (minDist === distFront) this.playerPosition.z = minZ;
          else this.playerPosition.z = maxZ;
        }
      }
    }

    // World arena bounds (-50 to 50)
    this.playerPosition.x = THREE.MathUtils.clamp(this.playerPosition.x, -50, 50);
    this.playerPosition.z = THREE.MathUtils.clamp(this.playerPosition.z, -50, 50);

    // Update Bots
    this.botManager.update(dt, this.playerPosition, (dmg) => {
      this.takeDamage(dmg);
    });
  }

  private updateRenderCamera(dt: number, input: any) {
    // Camera rotation with look deltas
    this.playerYaw -= input.lookDeltaX;
    this.playerPitch = THREE.MathUtils.clamp(this.playerPitch - input.lookDeltaY, -Math.PI / 2.2, Math.PI / 2.2);

    // Recoil recovery
    const weapon = this.weaponList[this.currentWeaponIndex];
    const recovered = calculateRecoilRecovery({ pitch: this.recoilPitch, yaw: this.recoilYaw }, dt, weapon.recoilRecoveryRate);
    this.recoilPitch = recovered.pitch;
    this.recoilYaw = recovered.yaw;

    // Camera shake (trauma squared decay)
    let shakeX = 0;
    let shakeY = 0;
    if (this.cameraShakeTrauma > 0) {
      const shakeAmt = this.cameraShakeTrauma * this.cameraShakeTrauma * 0.045;
      shakeX = (Math.random() - 0.5) * shakeAmt;
      shakeY = (Math.random() - 0.5) * shakeAmt;
      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - dt * 2.0);
    }

    // Head bob
    const bobOffset = Math.sin(this.headBobTimer) * 0.025;

    // Apply to camera
    this.camera.position.set(
      this.playerPosition.x,
      this.playerPosition.y + bobOffset,
      this.playerPosition.z
    );

    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.y = this.playerYaw + this.recoilYaw + shakeX;
    this.camera.rotation.x = this.playerPitch + this.recoilPitch + shakeY;

    // FOV adjustment for ADS
    const targetFOV = input.isADS ? weapon.scopeZoomFOV : 75;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFOV, 14, dt);
    this.camera.updateProjectionMatrix();

    // Weapon Rig position (First-person sway and ADS alignment)
    if (this.currentWeaponMesh) {
      if (input.isADS) {
        // Center weapon sight exactly to camera center line
        const targetX = weapon.category === 'sniper' ? 0 : 0.0;
        const targetY = -0.075;
        const targetZ = -0.32;
        this.currentWeaponMesh.position.x = THREE.MathUtils.damp(this.currentWeaponMesh.position.x, targetX, 16, dt);
        this.currentWeaponMesh.position.y = THREE.MathUtils.damp(this.currentWeaponMesh.position.y, targetY, 16, dt);
        this.currentWeaponMesh.position.z = THREE.MathUtils.damp(this.currentWeaponMesh.position.z, targetZ, 16, dt);
      } else {
        // Natural hipfire right offset with sway
        const targetX = 0.24 + Math.sin(this.headBobTimer * 0.5) * 0.01;
        const targetY = -0.22 + bobOffset * 0.5;
        const targetZ = -0.42;
        this.currentWeaponMesh.position.x = THREE.MathUtils.damp(this.currentWeaponMesh.position.x, targetX, 12, dt);
        this.currentWeaponMesh.position.y = THREE.MathUtils.damp(this.currentWeaponMesh.position.y, targetY, 12, dt);
        this.currentWeaponMesh.position.z = THREE.MathUtils.damp(this.currentWeaponMesh.position.z, targetZ, 12, dt);
      }
    }
  }

  public notifyHUD(hitmarker: 'hit' | 'headshot' | null = null) {
    if (!this.onHUDUpdate) return;
    this.onHUDUpdate({
      health: this.health,
      maxHealth: this.maxHealth,
      armor: this.armor,
      scoreAlpha: this.scoreAlpha,
      scoreBravo: this.scoreBravo,
      timeRemaining: Math.max(0, Math.round(this.timeRemaining)),
      currentWeapon: this.weaponList[this.currentWeaponIndex],
      ammo: this.ammo,
      reserveAmmo: this.reserveAmmo,
      isReloading: this.isReloading,
      isADS: this.inputManager.isADS,
      isCrouching: this.inputManager.isCrouching,
      kills: this.kills,
      deaths: this.deaths,
      headshots: this.headshots,
      hitmarker,
      gameStatus: this.isGameOver ? (this.scoreAlpha >= this.scoreBravo ? 'victory' : 'defeat') : 'playing',
      activeMap: this.currentMap.id
    });
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    if (this.mapCleanup) this.mapCleanup();
    this.particlePool.destroy();
    this.botManager.clearBots();
    this.renderer.dispose();
  }
}
