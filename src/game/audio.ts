/**
 * Procedural Web Audio Sound Synthesizer for ApexStrike 3D FPS
 * 100% zero-dependency procedural audio synthesis.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;
  private lastFootstepTime: number = 0;
  private heartbeatInterval: any = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.buildNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private buildNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted) {
      this.stopHeartbeat();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Procedural Gunfire Synth scaled per weapon type
   */
  public playGunshot(category: 'rifle' | 'sniper' | 'shotgun' | 'pistol') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;

    // Noise burst through bandpass / lowpass filter
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Body sub-bass oscillator for physical punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    if (category === 'rifle') {
      // Punchy rapid assault rifle
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, t);
      filter.frequency.exponentialRampToValueAtTime(180, t + 0.16);

      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

      oscGain.gain.setValueAtTime(0.5, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    } else if (category === 'sniper') {
      // Massive thunderous sniper crack with long tail
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(90, t + 0.55);

      gain.gain.setValueAtTime(1.0, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

      oscGain.gain.setValueAtTime(0.9, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    } else if (category === 'shotgun') {
      // Wide concussive boom
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 0.28);

      gain.gain.setValueAtTime(0.95, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      osc.type = 'square';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.2);

      oscGain.gain.setValueAtTime(0.65, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    } else {
      // Pistol snappy crack
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.12);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

      oscGain.gain.setValueAtTime(0.4, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.7);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  /**
   * Hitmarker tick sound when bullet impacts enemy
   */
  public playHitmarker(isHeadshot: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isHeadshot) {
      // High rewarding double ping for headshot
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, t);
      osc.frequency.setValueAtTime(2400, t + 0.04);
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.16);
    } else {
      // Crisp mechanical crosshair hit tick
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.06);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.09);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);
  }

  /**
   * Player or bot hurt sound
   */
  public playHurt() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.23);
  }

  /**
   * Tactical footstep procedural audio
   */
  public playFootstep() {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastFootstepTime < 240) return;
    this.lastFootstepTime = now;

    this.initCtx();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350 + Math.random() * 80, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.1);
  }

  /**
   * Jump takeoff and landing audio
   */
  public playJump() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  public playLand() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.18);
  }

  /**
   * Reload magazine slide sound
   */
  public playReload() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Part 1: Mag out slide
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(300, t);
    osc1.frequency.exponentialRampToValueAtTime(150, t + 0.15);
    gain1.gain.setValueAtTime(0.25, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.2);

    // Part 2: Mag click in after 0.8s
    setTimeout(() => {
      if (this.isMuted || !this.ctx) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(500, t2);
      osc2.frequency.setValueAtTime(800, t2 + 0.05);
      gain2.gain.setValueAtTime(0.28, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.12);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.15);
    }, 600);
  }

  /**
   * Low Health Heartbeat Loop
   */
  public startHeartbeat() {
    if (this.heartbeatInterval || this.isMuted) return;
    this.heartbeatInterval = setInterval(() => {
      if (this.isMuted) return;
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    }, 800);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Victory Fanfare
   */
  public playVictory() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);
      gain.gain.setValueAtTime(0.3, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.45);
    });
  }

  /**
   * Defeat Sting
   */
  public playDefeat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [330, 311.13, 293.66, 261.63];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.18);
      gain.gain.setValueAtTime(0.3, t + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.18 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.18);
      osc.stop(t + idx * 0.18 + 0.4);
    });
  }

  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }
}

export const soundEngine = new SoundEngine();
