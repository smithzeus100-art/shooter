// High-Fidelity Spatial & Positional Web Audio Manager for Space Arcade Atmosphere
export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceOsc1: OscillatorNode | null = null;
  private ambienceOsc2: OscillatorNode | null = null;
  private isAmbiencePlaying: boolean = false;

  public init() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.28;
      this.masterGain.connect(this.ctx.destination);

      // Start atmospheric deep space background hum
      this.initAmbience();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Atmospheric low-frequency cosmic rumble
  private initAmbience() {
    if (!this.ctx || !this.masterGain || this.isAmbiencePlaying) return;

    try {
      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = this.isMuted ? 0 : 0.04;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 140;

      this.ambienceOsc1 = this.ctx.createOscillator();
      this.ambienceOsc1.type = 'sine';
      this.ambienceOsc1.frequency.value = 55; // Deep A1 note

      this.ambienceOsc2 = this.ctx.createOscillator();
      this.ambienceOsc2.type = 'triangle';
      this.ambienceOsc2.frequency.value = 58; // Subtle binaural beat

      this.ambienceOsc1.connect(filter);
      this.ambienceOsc2.connect(filter);
      filter.connect(this.ambienceGain);
      this.ambienceGain.connect(this.masterGain);

      this.ambienceOsc1.start();
      this.ambienceOsc2.start();
      this.isAmbiencePlaying = true;
    } catch {
      // Audio context might need user gesture
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.28, this.ctx.currentTime);
    }
    if (this.ambienceGain && this.ctx) {
      this.ambienceGain.gain.setValueAtTime(this.isMuted ? 0 : 0.04, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Helper to create a spatialized audio routing chain with stereo panning and distance-based low-pass attenuation.
   */
  private createSpatialRoute(
    emitterX: number,
    emitterY: number,
    listenerX: number,
    listenerY: number,
    baseGainValue: number = 0.25
  ): { input: AudioNode; outputGain: GainNode } | null {
    if (this.isMuted) return null;
    this.init();
    if (!this.ctx || !this.masterGain) return null;

    const t = this.ctx.currentTime;
    const dx = emitterX - listenerX;
    const dy = emitterY - listenerY;
    const dist = Math.hypot(dx, dy);

    // Distance attenuation: volume falls off smoothly
    const maxHearingDist = 1800;
    const distFactor = Math.max(0.08, 1 - Math.min(1, dist / maxHearingDist));
    const finalVolume = baseGainValue * distFactor;

    // Panning factor (-1.0 full left to +1.0 full right)
    const panRange = 900;
    const pan = Math.max(-0.95, Math.min(0.95, dx / panRange));

    // Acoustic high-frequency absorption over distance
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoffFreq = Math.max(700, 18000 * (1 - (dist / (maxHearingDist * 1.3))));
    filter.frequency.setValueAtTime(cutoffFreq, t);

    // Gain node
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(finalVolume, t);

    // Stereo Panner (if supported)
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, t);

      gainNode.connect(filter);
      filter.connect(panner);
      panner.connect(this.masterGain);
    } else {
      gainNode.connect(filter);
      filter.connect(this.masterGain);
    }

    return { input: gainNode, outputGain: gainNode };
  }

  // Railgun Capacitor Charge Whine
  public playRailgunCharge(emitterX: number, emitterY: number, listenerX: number, listenerY: number) {
    if (this.isMuted) return;
    const route = this.createSpatialRoute(emitterX, emitterY, listenerX, listenerY, 0.22);
    if (!route || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.25);
    osc.connect(route.input);
    route.outputGain.gain.setValueAtTime(0.01, t);
    route.outputGain.gain.linearRampToValueAtTime(0.24, t + 0.22);
    route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + 0.26);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Missile HUD Lock-On Ping
  public playLockOnPing(emitterX: number, emitterY: number, listenerX: number, listenerY: number) {
    if (this.isMuted) return;
    const route = this.createSpatialRoute(emitterX, emitterY, listenerX, listenerY, 0.2);
    if (!route || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t);
    osc.connect(route.input);
    route.outputGain.gain.setValueAtTime(0.2, t);
    route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Positional Laser / Weapon firing with distinct mechanical transients & kinetic weight
  public playPositionalLaser(
    type: 'PRIMARY' | 'BLASTER' | 'SPREAD' | 'RAILGUN' | 'MISSILE' | 'TESLA',
    emitterX: number,
    emitterY: number,
    listenerX: number,
    listenerY: number
  ) {
    if (this.isMuted) return;
    const baseGain = type === 'RAILGUN' ? 0.45 : type === 'SPREAD' ? 0.32 : type === 'MISSILE' ? 0.35 : 0.26;
    const route = this.createSpatialRoute(emitterX, emitterY, listenerX, listenerY, baseGain);
    if (!route || !this.ctx) return;

    const t = this.ctx.currentTime;

    if (type === 'RAILGUN') {
      // 1. Hypersonic Magnetic Whip-Crack & Heavy Low-End Thud
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.16);

      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(160, t);
      sub.frequency.exponentialRampToValueAtTime(40, t + 0.22);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.5, t);
      subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

      osc.connect(route.input);
      sub.connect(subGain);
      subGain.connect(route.input);

      route.outputGain.gain.setValueAtTime(0.48, t);
      route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

      osc.start(t);
      sub.start(t);
      osc.stop(t + 0.16);
      sub.stop(t + 0.22);
    } else if (type === 'BLASTER') {
      // 2. High-cadence mechanical autocannon snap
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(980, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.055);

      osc.connect(route.input);
      route.outputGain.gain.setValueAtTime(0.26, t);
      route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + 0.055);

      osc.start(t);
      osc.stop(t + 0.055);
    } else if (type === 'SPREAD') {
      // 3. Heavy concussive flak scatter burst
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.1);

      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(180, t);
      sub.frequency.exponentialRampToValueAtTime(45, t + 0.12);

      osc.connect(route.input);
      sub.connect(route.input);

      route.outputGain.gain.setValueAtTime(0.32, t);
      route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc.start(t);
      sub.start(t);
      osc.stop(t + 0.1);
      sub.stop(t + 0.12);
    } else if (type === 'MISSILE') {
      // 4. Missile ignition kick + rocket engine thrust pop
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(540, t + 0.06);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.22);

      osc.connect(route.input);
      route.outputGain.gain.setValueAtTime(0.36, t);
      route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

      osc.start(t);
      osc.stop(t + 0.22);
    } else if (type === 'TESLA') {
      // 5. Crackling high-voltage arc discharge
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1100 + Math.random() * 400, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);

      osc.connect(route.input);
      route.outputGain.gain.setValueAtTime(0.3, t);
      route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      osc.start(t);
      osc.stop(t + 0.08);
    } else {
      // PRIMARY: Twin plasma cannon discharge with tight energetic punch
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.085);

      const sub = this.ctx.createOscillator();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(260, t);
      sub.frequency.exponentialRampToValueAtTime(70, t + 0.085);

      osc.connect(route.input);
      sub.connect(route.input);

      route.outputGain.gain.setValueAtTime(0.28, t);
      route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + 0.085);

      osc.start(t);
      sub.start(t);
      osc.stop(t + 0.085);
      sub.stop(t + 0.085);
    }
  }

  // Positional Concussive Enemy Explosions
  public playPositionalExplosion(
    emitterX: number,
    emitterY: number,
    isLarge: boolean = false,
    listenerX: number,
    listenerY: number
  ) {
    if (this.isMuted) return;
    const baseGain = isLarge ? 0.65 : 0.38;
    const route = this.createSpatialRoute(emitterX, emitterY, listenerX, listenerY, baseGain);
    if (!route || !this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = isLarge ? 0.42 : 0.22;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(isLarge ? 480 : 850, t);
    lowpass.frequency.exponentialRampToValueAtTime(35, t + duration);

    noise.connect(lowpass);
    lowpass.connect(route.input);

    route.outputGain.gain.setValueAtTime(baseGain, t);
    route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.start(t);
  }

  // Positional Hull / Shield Impact
  public playPositionalHit(
    emitterX: number,
    emitterY: number,
    isShield: boolean,
    listenerX: number,
    listenerY: number
  ) {
    if (this.isMuted) return;
    const route = this.createSpatialRoute(emitterX, emitterY, listenerX, listenerY, 0.4);
    if (!route || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = isShield ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(isShield ? 380 : 160, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.16);

    osc.connect(route.input);
    route.outputGain.gain.setValueAtTime(0.4, t);
    route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Real Kinetic Armor Impact / Penetration Crack
  public playKineticImpact(
    emitterX: number,
    emitterY: number,
    isHeavy: boolean,
    listenerX: number,
    listenerY: number
  ) {
    if (this.isMuted) return;
    const gainVal = isHeavy ? 0.42 : 0.24;
    const route = this.createSpatialRoute(emitterX, emitterY, listenerX, listenerY, gainVal);
    if (!route || !this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. High-frequency metallic armor clink/snap
    const snap = this.ctx.createOscillator();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(isHeavy ? 1200 : 1600, t);
    snap.frequency.exponentialRampToValueAtTime(240, t + (isHeavy ? 0.06 : 0.035));

    // 2. Low-frequency concussive armor thud
    const thud = this.ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(isHeavy ? 180 : 220, t);
    thud.frequency.exponentialRampToValueAtTime(45, t + (isHeavy ? 0.09 : 0.05));

    snap.connect(route.input);
    thud.connect(route.input);

    route.outputGain.gain.setValueAtTime(gainVal, t);
    route.outputGain.gain.exponentialRampToValueAtTime(0.01, t + (isHeavy ? 0.09 : 0.05));

    snap.start(t);
    thud.start(t);
    snap.stop(t + (isHeavy ? 0.06 : 0.035));
    thud.stop(t + (isHeavy ? 0.09 : 0.05));
  }

  // Tactical Dash
  public playDash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.22);

    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // XP / Tactical Pickup Chime
  public playPickup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, t); // E5
    osc.frequency.setValueAtTime(880, t + 0.04); // A5

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Level Up Triumphant Chord
  public playLevelUp() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // Titan Boss Alert
  public playBossAlert() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(280, t + 0.25);
    osc.frequency.linearRampToValueAtTime(140, t + 0.5);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // Legacy backwards compatibility wrappers
  public playLaser(type: 'PRIMARY' | 'BLASTER' | 'SPREAD' | 'RAILGUN' | 'MISSILE' | 'TESLA') {
    this.playPositionalLaser(type, 0, 0, 0, 0);
  }

  public playExplosion(isLarge: boolean = false) {
    this.playPositionalExplosion(0, 0, isLarge, 0, 0);
  }

  public playPlayerHit(isShield: boolean = true) {
    this.playPositionalHit(0, 0, isShield, 0, 0);
  }
}

export const audioManager = new AudioManager();
export const soundEngine = audioManager;
