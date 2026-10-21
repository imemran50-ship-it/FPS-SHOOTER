import * as THREE from 'three';

interface Particle {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class ParticlePool {
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private maxParticles = 300;

  constructor(private scene: THREE.Scene) {
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        position: new THREE.Vector3(0, -999, 0),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 0.2,
        alpha: 1,
        life: 0,
        maxLife: 1
      });
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  public spawnSparks(origin: THREE.Vector3, normal: THREE.Vector3, count = 8, colorHex = 0xffa500) {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.position.copy(origin);
        p.velocity.set(
          normal.x + (Math.random() - 0.5) * 1.5,
          normal.y + Math.random() * 1.5,
          normal.z + (Math.random() - 0.5) * 1.5
        ).multiplyScalar(4 + Math.random() * 5);
        p.color.setHex(colorHex);
        p.life = 0;
        p.maxLife = 0.25 + Math.random() * 0.25;
        p.size = 0.15;
        spawned++;
      }
    }
  }

  public spawnMuzzleSmoke(origin: THREE.Vector3, dir: THREE.Vector3, count = 5) {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.position.copy(origin);
        p.velocity.set(
          dir.x * 3 + (Math.random() - 0.5) * 0.6,
          dir.y * 3 + Math.random() * 0.6,
          dir.z * 3 + (Math.random() - 0.5) * 0.6
        );
        p.color.setHex(0xaaaaaa);
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.3;
        p.size = 0.3;
        spawned++;
      }
    }
  }

  public update(dt: number) {
    let posIdx = 0;
    let colIdx = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.position.set(0, -999, 0);
        } else {
          // Physics
          p.velocity.y -= 9.8 * dt; // Gravity
          p.position.x += p.velocity.x * dt;
          p.position.y += p.velocity.y * dt;
          p.position.z += p.velocity.z * dt;
        }
      }

      this.positions[posIdx++] = p.position.x;
      this.positions[posIdx++] = p.position.y;
      this.positions[posIdx++] = p.position.z;

      this.colors[colIdx++] = p.color.r;
      this.colors[colIdx++] = p.color.g;
      this.colors[colIdx++] = p.color.b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public destroy() {
    this.scene.remove(this.points);
    this.geometry.dispose();
  }
}
