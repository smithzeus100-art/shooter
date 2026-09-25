import {
  PlayerShip,
  Enemy,
  EnemyType,
  Projectile,
  Particle,
  Shockwave,
  DropItem,
  FloatingText,
  Star,
  CosmicNebula,
  DroneModule,
  DroneType,
  UpgradeOption,
  GameState,
  IonizationBeam,
  LightningArc,
  SynergyLink,
  Ai3DStrategy,
} from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DRONE_BLUEPRINTS, ALL_UPGRADES, updateCanvasDimensions } from './constants';
import { audioManager } from './audio';

export class GameEngine {
  public state: GameState = 'MENU';
  public player!: PlayerShip;
  public enemies: Enemy[] = [];

  public resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    updateCanvasDimensions(width, height);

    // Adjust background starfield count dynamically
    const targetStarCount = Math.floor((width * height) / 8000);
    while (this.stars.length < targetStarCount) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.4 + 0.1,
        brightness: Math.random() * 0.7 + 0.3,
        layer: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3,
        color: '#FFFFFF',
        twinkleSpeed: Math.random() * 2 + 0.5,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public shockwaves: Shockwave[] = [];
  public ionizationBeams: IonizationBeam[] = [];
  public lightningArcs: LightningArc[] = [];
  public synergyLinks: SynergyLink[] = [];
  public drops: DropItem[] = [];
  public floatingTexts: FloatingText[] = [];
  public stars: Star[] = [];
  public nebulae: CosmicNebula[] = [];

  public wave: number = 1;
  public waveTimer: number = 0;
  public waveDuration: number = 30; // 30s per wave
  public spawnTimer: number = 0;
  public bossActive: boolean = false;
  public bossDefeated: boolean = false;

  public screenShakeAmount: number = 0;
  public keys: Record<string, boolean> = {};
  public camera = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
  };
  public screenMouseX: number = CANVAS_WIDTH / 2;
  public screenMouseY: number = CANVAS_HEIGHT / 2;
  public mouseX: number = CANVAS_WIDTH / 2;
  public mouseY: number = CANVAS_HEIGHT / 2;
  public isMouseDown: boolean = false;
  public hasDashShockwave: boolean = false;
  public isAiPilot: boolean = true;
  public aiStatusText: string = 'AI PILOT: [DECK RECON] ALT: +0m | SECTOR PATROL';
  public ai3dStrategy: Ai3DStrategy = 'DECK_LEVEL_INTERCEPT';
  public ai3dTimer: number = 0;
  public ai3dCyclePhase: number = 0;

  public toggleAiPilot() {
    this.isAiPilot = !this.isAiPilot;
    if (this.isAiPilot) {
      this.aiStatusText = 'AI PILOT: [3D MANEUVERS] ENGAGED';
      this.addFloatingText(this.player.x, this.player.y - 40, 'AI PILOT: 3D ENGAGED', '#00F0FF');
    } else {
      if (this.player) this.player.targetZ = 0;
      this.aiStatusText = 'MANUAL CONTROL ACTIVE';
      this.addFloatingText(this.player.x, this.player.y - 40, 'MANUAL OVERRIDE', '#F59E0B');
    }
  }

  public selectBestUpgrade(): UpgradeOption | null {
    if (!this.upgradeOptions || this.upgradeOptions.length === 0) return null;

    let bestOpt = this.upgradeOptions[0];
    let bestScore = -Infinity;

    for (const opt of this.upgradeOptions) {
      let score = 0;
      if (opt.rarity === 'EPIC') score += 10;
      else if (opt.rarity === 'RARE') score += 5;
      else score += 2;

      if (opt.type === 'NEW_DRONE') score += 8;
      else if (opt.type === 'UPGRADE_DRONE') score += 6;
      else if (opt.id === 'stat_shield' && this.player.health < this.player.maxHealth * 0.6) score += 7;
      else if (opt.id === 'stat_hull' && this.player.health < this.player.maxHealth * 0.6) score += 7;

      if (score > bestScore) {
        bestScore = score;
        bestOpt = opt;
      }
    }

    return bestOpt;
  }

  public upgradeOptions: UpgradeOption[] = [];
  public highScore: number = 0;
  public onStateChange?: (state: GameState) => void;
  public onLevelUp?: (options: UpgradeOption[]) => void;

  constructor() {
    this.initStars();
    this.loadHighScore();
    this.resetGame();
  }

  private loadHighScore() {
    try {
      const saved = localStorage.getItem('aegis_fleet_high_score');
      if (saved) this.highScore = parseInt(saved, 10) || 0;
    } catch {
      this.highScore = 0;
    }
  }

  public saveHighScore() {
    if (this.player && this.player.score > this.highScore) {
      this.highScore = this.player.score;
      try {
        localStorage.setItem('aegis_fleet_high_score', this.highScore.toString());
      } catch {
        // ignore
      }
    }
  }

  private initStars() {
    this.stars = [];
    const starColors = ['#FFFFFF', '#E0F2FE', '#BAE6FD', '#38BDF8', '#FDE68A', '#DDD6FE'];

    // Layer 1: Deep distant stars (100 stars)
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 1.0 + 0.6,
        speed: Math.random() * 0.3 + 0.15,
        brightness: Math.random() * 0.4 + 0.3,
        layer: 1,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        twinkleSpeed: Math.random() * 2 + 1,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    // Layer 2: Mid-field stars (80 stars)
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 1.2 + 1.2,
        speed: Math.random() * 0.6 + 0.4,
        brightness: Math.random() * 0.35 + 0.55,
        layer: 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        twinkleSpeed: Math.random() * 3 + 1.5,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    // Layer 3: Foreground high-speed stars (40 stars)
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 1.4 + 2.0,
        speed: Math.random() * 1.0 + 0.9,
        brightness: Math.random() * 0.2 + 0.8,
        layer: 3,
        color: '#FFFFFF',
        twinkleSpeed: Math.random() * 4 + 2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    // Initialize atmospheric deep cosmic nebulae
    this.nebulae = [
      {
        x: CANVAS_WIDTH * 0.25,
        y: CANVAS_HEIGHT * 0.3,
        radius: 320,
        color: 'rgba(56, 189, 248, 0.05)',
        alpha: 0.06,
        vx: 0.05,
        vy: 0.08,
      },
      {
        x: CANVAS_WIDTH * 0.75,
        y: CANVAS_HEIGHT * 0.7,
        radius: 380,
        color: 'rgba(168, 85, 247, 0.04)',
        alpha: 0.05,
        vx: -0.04,
        vy: 0.06,
      },
      {
        x: CANVAS_WIDTH * 0.5,
        y: CANVAS_HEIGHT * 0.15,
        radius: 280,
        color: 'rgba(236, 72, 153, 0.035)',
        alpha: 0.04,
        vx: 0.03,
        vy: 0.05,
      },
      {
        x: CANVAS_WIDTH * 0.85,
        y: CANVAS_HEIGHT * 0.2,
        radius: 300,
        color: 'rgba(14, 165, 233, 0.04)',
        alpha: 0.05,
        vx: -0.05,
        vy: 0.07,
      },
    ];
  }

  public resetGame() {
    this.ai3dStrategy = 'DECK_LEVEL_INTERCEPT';
    this.ai3dTimer = 0;
    this.ai3dCyclePhase = 0;
    this.player = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      speed: 0,
      maxSpeed: 4.8,
      acceleration: 0.32,
      friction: 0.972,
      health: 100,
      maxHealth: 100,
      shield: 50,
      maxShield: 50,
      shieldRegenTimer: 0,
      shieldRegenDelay: 3.5,
      dashCooldown: 2.5,
      dashTimer: 0,
      isDashing: false,
      invulnerableTimer: 0,
      fireCooldown: 0.14,
      fireTimer: 0,
      damageMultiplier: 1.0,
      fireRateMultiplier: 1.0,
      pickupRadius: 160,
      level: 1,
      xp: 0,
      nextLevelXp: 100,
      score: 0,
      combo: 0,
      comboTimer: 0,
      history: [],
      leftBarrelRecoil: 0,
      rightBarrelRecoil: 0,
      barrelIndex: 0,
      heat: 0,
      visualRecoil: 0,
      visualRecoilAngle: 0,
      rcsTimer: 0,
      // 3D Spatial Flight Dynamics
      z: 0,
      vz: 0,
      roll: 0,
      pitch: 0,
      targetRoll: 0,
      targetPitch: 0,
      targetZ: 0,
      barrelRollProgress: 0,
      drones: [
        {
          id: 'drone_starter_blaster',
          type: 'BLASTER',
          level: 1,
          fireCooldown: DRONE_BLUEPRINTS.BLASTER.baseCooldown,
          fireTimer: 0,
          x: CANVAS_WIDTH / 2 - 30,
          y: CANVAS_HEIGHT / 2 + 30,
          vx: 0,
          vy: 0,
          bankAngle: 0,
          z: 14,
          vz: 0,
          targetZ: 14,
          pitch: 0,
          angle: -Math.PI / 2,
          targetAngle: -Math.PI / 2,
          color: DRONE_BLUEPRINTS.BLASTER.color,
          chargeTimer: 0,
          maxChargeTimer: 0.28,
          burstRemaining: 0,
          burstTimer: 0,
          targetEnemyId: null,
          barrelKick: 0,
          isLockedOn: false,
          thrusterPulse: 0,
          rcsFlare: 0,
          afterburner: 0,
          trail: [],
          health: 60,
          maxHealth: 60,
          shield: 30,
          maxShield: 30,
          shieldRegenTimer: 0,
          hitFlashTimer: 0,
          aiState: 'ESCORT',
          aiEvasionTimer: 0,
          aiEvasionVector: { x: 0, y: 0 },
          aiOrbitPhase: Math.random() * Math.PI * 2,
          synergyBuff: {
            fireRateBonus: 0,
            damageBonus: 0,
            activeLinks: 0,
            nexusLinked: false,
          },
        },
      ],
    };

    // Prepopulate historical positions for smooth formation startup
    for (let i = 0; i < 60; i++) {
      this.player.history.push({
        x: this.player.x,
        y: this.player.y + i * 2,
        angle: this.player.angle,
      });
    }

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.shockwaves = [];
    this.ionizationBeams = [];
    this.lightningArcs = [];
    this.drops = [];
    this.floatingTexts = [];
    this.wave = 1;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.bossActive = false;
    this.bossDefeated = false;
    this.hasDashShockwave = false;
    this.screenShakeAmount = 0;
    this.camera.x = CANVAS_WIDTH / 2;
    this.camera.y = CANVAS_HEIGHT / 2;
    this.screenMouseX = CANVAS_WIDTH / 2;
    this.screenMouseY = CANVAS_HEIGHT / 2;
    this.mouseX = CANVAS_WIDTH / 2;
    this.mouseY = CANVAS_HEIGHT / 2;
  }

  public startGame() {
    this.resetGame();
    this.state = 'PLAYING';
    if (this.onStateChange) this.onStateChange('PLAYING');
  }

  public pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      if (this.onStateChange) this.onStateChange('PAUSED');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      if (this.onStateChange) this.onStateChange('PLAYING');
    }
  }

  public addDrone(type: DroneType) {
    const bp = DRONE_BLUEPRINTS[type];
    const existing = this.player.drones.find((d) => d.type === type);
    if (existing) {
      existing.level++;
      this.addFloatingText(this.player.x, this.player.y - 30, `${bp.name} MK-${existing.level} UPGRADE!`, bp.color);
      audioManager.playPickup();
      this.triggerScreenShake(2);
      return;
    }

    const newDrone: DroneModule = {
      id: `drone_${Date.now()}_${Math.random()}`,
      type,
      level: 1,
      fireCooldown: bp.baseCooldown,
      fireTimer: 0,
      x: this.player.x,
      y: this.player.y,
      vx: this.player.vx,
      vy: this.player.vy,
      bankAngle: 0,
      z: 0,
      vz: 0,
      targetZ: 0,
      pitch: 0,
      angle: this.player.angle,
      targetAngle: this.player.angle,
      color: bp.color,
      chargeTimer: 0,
      maxChargeTimer: 0.28,
      burstRemaining: 0,
      burstTimer: 0,
      targetEnemyId: null,
      barrelKick: 0,
      isLockedOn: false,
      thrusterPulse: 0,
      rcsFlare: 0,
      afterburner: 0,
      trail: [],
      health: 60,
      maxHealth: 60,
      shield: 30,
      maxShield: 30,
      shieldRegenTimer: 0,
      hitFlashTimer: 0,
      aiState: 'ESCORT',
      aiEvasionTimer: 0,
      aiEvasionVector: { x: 0, y: 0 },
      aiOrbitPhase: Math.random() * Math.PI * 2,
      synergyBuff: {
        fireRateBonus: 0,
        damageBonus: 0,
        activeLinks: 0,
        nexusLinked: false,
      },
    };
    this.player.drones.push(newDrone);
    this.addFloatingText(this.player.x, this.player.y - 30, `+ ${bp.name}`, bp.color);
    audioManager.playPickup();
  }

  public applyUpgrade(upgrade: UpgradeOption) {
    if (upgrade.type === 'NEW_DRONE' && upgrade.droneType) {
      this.addDrone(upgrade.droneType);
    } else if (upgrade.id === 'stat_damage') {
      this.player.damageMultiplier += 0.25;
      this.addFloatingText(this.player.x, this.player.y - 30, '+25% DMG', '#F59E0B');
    } else if (upgrade.id === 'stat_fire_rate') {
      this.player.fireRateMultiplier += 0.2;
      this.addFloatingText(this.player.x, this.player.y - 30, '+20% ATK SPD', '#00F0FF');
    } else if (upgrade.id === 'stat_shield') {
      this.player.maxShield += 30;
      this.player.shield = this.player.maxShield;
      this.player.shieldRegenDelay = Math.max(1.5, this.player.shieldRegenDelay - 0.5);
      this.addFloatingText(this.player.x, this.player.y - 30, '+30 SHIELD', '#38BDF8');
    } else if (upgrade.id === 'stat_speed') {
      this.player.maxSpeed *= 1.18;
      this.player.dashCooldown *= 0.75;
      this.addFloatingText(this.player.x, this.player.y - 30, '+SPEED & DASH', '#10B981');
    } else if (upgrade.id === 'stat_magnet') {
      this.player.pickupRadius += 100;
      this.addFloatingText(this.player.x, this.player.y - 30, '+MAGNET RANGE', '#A855F7');
    } else if (upgrade.id === 'stat_hull') {
      this.player.maxHealth += 40;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 50);
      this.addFloatingText(this.player.x, this.player.y - 30, '+40 MAX HP', '#EF4444');
    } else if (upgrade.id === 'spec_overdrive') {
      this.hasDashShockwave = true;
      this.addFloatingText(this.player.x, this.player.y - 30, 'OVERDRIVE ACTIVE', '#EC4899');
    }

    this.state = 'PLAYING';
    if (this.onStateChange) this.onStateChange('PLAYING');
  }

  public triggerLevelUp() {
    this.player.level++;
    this.player.xp -= this.player.nextLevelXp;
    this.player.nextLevelXp = Math.floor(this.player.nextLevelXp * 1.45 + 50);

    // Pick 3 random distinct upgrades
    const pool = [...ALL_UPGRADES];
    const shuffled = pool.sort(() => Math.random() - 0.5);
    this.upgradeOptions = shuffled.slice(0, 3);

    this.state = 'LEVEL_UP';
    audioManager.playLevelUp();
    if (this.onLevelUp) this.onLevelUp(this.upgradeOptions);
    if (this.onStateChange) this.onStateChange('LEVEL_UP');
  }

  public addXp(amount: number) {
    this.player.xp += amount;
    this.player.score += amount * 10 * (1 + this.player.combo * 0.1);

    if (this.player.xp >= this.player.nextLevelXp) {
      this.triggerLevelUp();
    }
  }

  public triggerDash() {
    if (this.player.dashTimer > 0 || this.state !== 'PLAYING') return;

    this.player.dashTimer = this.player.dashCooldown;
    this.player.isDashing = true;
    this.player.invulnerableTimer = 0.4;
    // Initiate 3D dynamic barrel roll & vertical altitude burst
    this.player.barrelRollProgress = 1.0;
    this.player.vz = 48;

    // High velocity burst in current movement direction or facing angle
    const moveAngle =
      Math.hypot(this.player.vx, this.player.vy) > 0.5
        ? Math.atan2(this.player.vy, this.player.vx)
        : this.player.angle;

    const dashSpeed = 18;
    this.player.vx = Math.cos(moveAngle) * dashSpeed;
    this.player.vy = Math.sin(moveAngle) * dashSpeed;

    audioManager.playDash();
    this.triggerScreenShake(4);

    // Spawn afterimage shockwave & particles
    this.shockwaves.push({
      x: this.player.x,
      y: this.player.y,
      radius: 10,
      maxRadius: 60,
      color: '#00F0FF',
      alpha: 0.9,
      life: 0.25,
      maxLife: 0.25,
    });

    if (this.hasDashShockwave) {
      // Overdrive shockwave clears enemy projectiles in 180 radius
      this.shockwaves.push({
        x: this.player.x,
        y: this.player.y,
        radius: 20,
        maxRadius: 200,
        color: '#EC4899',
        alpha: 1.0,
        life: 0.35,
        maxLife: 0.35,
      });

      // Clear projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        if (p.isEnemy && Math.hypot(p.x - this.player.x, p.y - this.player.y) < 200) {
          this.spawnSparks(p.x, p.y, '#EC4899', 4);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  public triggerScreenShake(amount: number) {
    this.screenShakeAmount = Math.max(this.screenShakeAmount, amount);
  }

  public addFloatingText(x: number, y: number, text: string, color: string = '#FFFFFF') {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      x,
      y,
      text,
      color,
      alpha: 1.0,
      life: 0.8,
      maxLife: 0.8,
      vy: -1.5,
    });
  }

  public spawnSparks(x: number, y: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 5 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: Math.random() * 2.5 + 1.5,
        color,
        alpha: 1.0,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        decay: 1.8,
        shape: 'SPARK',
      });
    }
  }

  // Realistic directional molten metal / kinetic armor spatter
  public spawnKineticHitSpatter(x: number, y: number, bulletAngle: number, color: string, count: number = 6) {
    for (let i = 0; i < count; i++) {
      // Deflect sparks backwards and outward from armor point
      const deflectAngle = bulletAngle + Math.PI + (Math.random() - 0.5) * 1.5;
      const spd = Math.random() * 9 + 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(deflectAngle) * spd,
        vy: Math.sin(deflectAngle) * spd,
        size: Math.random() * 2.0 + 1.0,
        color: Math.random() > 0.4 ? '#FFFFFF' : color,
        alpha: 1.0,
        life: 0.12 + Math.random() * 0.1,
        maxLife: 0.22,
        decay: 6.0,
        shape: 'SPARK',
      });
    }
  }

  // Core 60fps update cycle
  public update(dt: number) {
    const clampedDt = Math.min(dt, 0.1);
    const isPlaying = this.state === 'PLAYING';

    // Update background stars ambient gentle drift and twinkle
    for (const star of this.stars) {
      star.y += star.speed * (isPlaying ? 18 : 8) * clampedDt;
      star.twinklePhase += star.twinkleSpeed * clampedDt;

      // Wrap boundary
      if (star.y > CANVAS_HEIGHT + 30) {
        star.y = -30;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    }

    // Update cosmic nebulae ambient drift
    for (const neb of this.nebulae) {
      neb.x += neb.vx * clampedDt * 20;
      neb.y += neb.vy * clampedDt * 20;

      if (neb.x < -neb.radius) neb.x = CANVAS_WIDTH + neb.radius;
      if (neb.x > CANVAS_WIDTH + neb.radius) neb.x = -neb.radius;
      if (neb.y < -neb.radius) neb.y = CANVAS_HEIGHT + neb.radius;
      if (neb.y > CANVAS_HEIGHT + neb.radius) neb.y = -neb.radius;
    }

    if (this.state !== 'PLAYING') return;

    // Screen shake decay
    if (this.screenShakeAmount > 0) {
      this.screenShakeAmount = Math.max(0, this.screenShakeAmount - clampedDt * 18);
    }

    // Update Player & Drones
    this.updatePlayer(clampedDt);
    this.updateDrones(clampedDt);

    // Dynamic Cinematic Eased Camera: Smooth velocity lead ahead of ship vector for cinematic spatial framing
    const targetCamX = this.player.x + this.player.vx * 26;
    const targetCamY = this.player.y + this.player.vy * 26;
    const camEasing = 1.0 - Math.exp(-4.5 * clampedDt);
    this.camera.x += (targetCamX - this.camera.x) * camEasing;
    this.camera.y += (targetCamY - this.camera.y) * camEasing;

    // Convert screen mouse coordinates to continuous world coordinates
    this.mouseX = this.screenMouseX - CANVAS_WIDTH / 2 + this.camera.x;
    this.mouseY = this.screenMouseY - CANVAS_HEIGHT / 2 + this.camera.y;

    // Update Projectiles & Collisions
    this.updateProjectiles(clampedDt);

    // Update Enemies & Waves
    this.updateEnemies(clampedDt);
    this.resolvePhysicalCollisions();
    this.updateWaveSystem(clampedDt);

    // Update Drops & Pickups
    this.updateDrops(clampedDt);

    // Update Particles & FX
    this.updateParticles(clampedDt);
    this.updateShockwaves(clampedDt);
    this.updateFloatingTexts(clampedDt);

    // Update combo timer
    if (this.player.comboTimer > 0) {
      this.player.comboTimer -= clampedDt;
      if (this.player.comboTimer <= 0) {
        this.player.combo = 0;
      }
    }
  }

  private updateAiAutopilot(dt: number, isManualMove: boolean) {
    const p = this.player;
    this.ai3dTimer += dt;
    this.ai3dCyclePhase += dt * 2.2;

    // A. Priority Target Acquisition (Incorporating 3D distance and threat profile)
    let priorityTarget: Enemy | null = null;
    let highestScore = -Infinity;

    for (const enemy of this.enemies) {
      const dist2d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      const deltaZ = (enemy.z || 0) - (p.z || 0);
      const dist3d = Math.hypot(dist2d, deltaZ);

      let typeWeight = 5;
      if (enemy.type === 'TITAN_BOSS') typeWeight = 16;
      else if (enemy.type === 'BOMBER') typeWeight = 11;
      else if (enemy.type === 'CHARGER') typeWeight = 10;
      else if (enemy.type === 'SNIPER') typeWeight = 9;
      else if (enemy.type === 'SCOUT') typeWeight = 7;

      const score = typeWeight * 1000 - dist3d;
      if (score > highestScore) {
        highestScore = score;
        priorityTarget = enemy;
      }
    }

    // B. AI Targeting & Auto-Firing (Predictive Lead Calculation)
    if (priorityTarget) {
      const projSpeed = 16;
      const targetDist = Math.hypot(priorityTarget.x - p.x, priorityTarget.y - p.y);
      const timeToHit = targetDist / (projSpeed || 1);
      const leadX = priorityTarget.x + priorityTarget.vx * timeToHit * 0.7;
      const leadY = priorityTarget.y + priorityTarget.vy * timeToHit * 0.7;

      this.mouseX = leadX;
      this.mouseY = leadY;

      // Auto-trigger primary fire if target is in sight
      if (p.fireTimer <= 0) {
        this.firePlayerPrimary();
        p.fireTimer = p.fireCooldown / p.fireRateMultiplier;
      }
    }

    // C. 3D Spatial Movement Strategies & Vector Navigation
    if (!isManualMove) {
      let navX = 0;
      let navY = 0;
      let projectileEvadeCount = 0;

      // 1. Hostile Threat Sensing (Projectiles, Chargers, Melee Swarms)
      for (const proj of this.projectiles) {
        if (proj.isEnemy) {
          const pdx = p.x - proj.x;
          const pdy = p.y - proj.y;
          const pdist = Math.hypot(pdx, pdy);
          if (pdist < 230 && pdist > 0) {
            const dot = (proj.vx * pdx + proj.vy * pdy) / (Math.hypot(proj.vx, proj.vy) * pdist || 1);
            if (dot > 0.15) {
              projectileEvadeCount++;
            }
          }
        }
      }

      const closeHostiles = this.enemies.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < 150).length;
      const chargingEnemy = this.enemies.find(
        (e) => e.type === 'CHARGER' && e.isCharging && Math.hypot(e.x - p.x, e.y - p.y) < 260
      );
      const isShieldCritical = p.shield <= 0 || p.health < p.maxHealth * 0.4;
      const targetDist = priorityTarget ? Math.hypot(priorityTarget.x - p.x, priorityTarget.y - p.y) : Infinity;

      // 2. Tactical 3D Strategy Arbitration
      if (isShieldCritical && (closeHostiles > 0 || projectileEvadeCount > 0)) {
        this.ai3dStrategy = 'VERTICAL_DISENGAGE';
      } else if (projectileEvadeCount >= 2 || chargingEnemy || closeHostiles >= 3) {
        this.ai3dStrategy = 'SPIRAL_CORKSCREW';
      } else if (priorityTarget && (priorityTarget.type === 'TITAN_BOSS' || priorityTarget.type === 'BOMBER' || priorityTarget.type === 'SHIELD_BEARER')) {
        this.ai3dStrategy = targetDist > 270 ? 'BOOM_AND_ZOOM' : 'ORBITAL_BRACKET';
      } else {
        this.ai3dStrategy = 'DECK_LEVEL_INTERCEPT';
      }

      // 3. Execution of Selected 3D Movement Strategy
      switch (this.ai3dStrategy) {
        case 'VERTICAL_DISENGAGE': {
          // Emergency High-Ceiling Climb: Ascend to maximum vertical clearance to recover shields
          p.targetZ = 55 + Math.sin(this.ai3dCyclePhase * 1.5) * 6;
          p.targetPitch = -0.38; // Nose tilted up in climb
          p.targetRoll = Math.sin(this.ai3dCyclePhase) * 0.28;

          // Retro-burn away from enemy centroid
          let avgEx = 0;
          let avgEy = 0;
          let enemyCount = 0;
          for (const e of this.enemies) {
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < 350) {
              avgEx += e.x;
              avgEy += e.y;
              enemyCount++;
            }
          }
          if (enemyCount > 0) {
            avgEx /= enemyCount;
            avgEy /= enemyCount;
            const awayAngle = Math.atan2(p.y - avgEy, p.x - avgEx);
            navX += Math.cos(awayAngle) * 3.2;
            navY += Math.sin(awayAngle) * 3.2;
          }

          // Seek repair/shield pickup if within sensor range
          for (const drop of this.drops) {
            if (drop.type === 'REPAIR' || drop.type === 'SHIELD_BOOST') {
              const ddist = Math.hypot(drop.x - p.x, drop.y - p.y);
              if (ddist < 320) {
                navX += ((drop.x - p.x) / ddist) * 2.2;
                navY += ((drop.y - p.y) / ddist) * 2.2;
                break;
              }
            }
          }

          this.aiStatusText = `AI PILOT: [VERTICAL DISENGAGE] ALT: +${Math.round(p.z)}m | RECHARGING SHIELD`;
          break;
        }

        case 'SPIRAL_CORKSCREW': {
          // 3D Helical Roll Evasion: Rapid altitude oscillation + alternating roll to defeat linear tracking
          p.targetZ = 32 + Math.sin(this.ai3dCyclePhase * 3.4) * 24; // Oscillates between +8 and +56
          p.targetRoll = Math.sin(this.ai3dCyclePhase * 3.8) * 0.95; // High-G banking
          p.targetPitch = Math.cos(this.ai3dCyclePhase * 2.6) * 0.25;

          // 3D Evasive vector: 90° transverse displacement against incoming projectiles
          for (const proj of this.projectiles) {
            if (proj.isEnemy) {
              const pdx = p.x - proj.x;
              const pdy = p.y - proj.y;
              const pdist = Math.hypot(pdx, pdy);
              if (pdist < 230 && pdist > 0) {
                const perpX = -proj.vy;
                const perpY = proj.vx;
                const perpLen = Math.hypot(perpX, perpY) || 1;
                const sideSign = (pdx * perpX + pdy * perpY) >= 0 ? 1 : -1;
                const evadeMag = (230 - pdist) / 230;
                navX += (perpX / perpLen) * sideSign * evadeMag * 3.4;
                navY += (perpY / perpLen) * sideSign * evadeMag * 3.4;
              }
            }
          }

          if (chargingEnemy) {
            const cdx = p.x - chargingEnemy.x;
            const cdy = p.y - chargingEnemy.y;
            const perpX = -chargingEnemy.vy;
            const perpY = chargingEnemy.vx;
            const perpLen = Math.hypot(perpX, perpY) || 1;
            navX += (perpX / perpLen) * 3.0;
            navY += (perpY / perpLen) * 3.0;
          }

          // Automated Emergency 3D Barrel Roll Dash
          if (p.dashTimer <= 0 && !p.isDashing && (projectileEvadeCount >= 2 || chargingEnemy)) {
            this.triggerDash();
          }

          this.aiStatusText = `AI PILOT: [3D CORKSCREW HELIX] ALT: +${Math.round(p.z)}m | EVADING ${projectileEvadeCount || 1} THREATS`;
          break;
        }

        case 'BOOM_AND_ZOOM': {
          if (!priorityTarget) break;
          // Energy Altitude Dive & Climb: 3-phase tactical cycle (4.2s loop)
          const bzCycle = this.ai3dTimer % 4.2;

          if (bzCycle < 2.0) {
            // Phase 1: High-Ceiling Standoff & Climb (gaining altitude advantage)
            p.targetZ = 52;
            p.targetPitch = -0.32; // Nose up
            p.targetRoll = Math.sin(this.ai3dCyclePhase * 1.5) * 0.22;

            // Ingress toward high-angle firing lane
            const angleToTarget = Math.atan2(priorityTarget.y - p.y, priorityTarget.x - p.x);
            navX += Math.cos(angleToTarget) * 1.5;
            navY += Math.sin(angleToTarget) * 1.5;

            this.aiStatusText = `AI PILOT: [BOOM & ZOOM: CLIMB] ALT: +${Math.round(p.z)}m | GAINING ALTITUDE ADVANTAGE`;
          } else if (bzCycle < 3.2) {
            // Phase 2: Steep Top-Down Dive & Strafe Run (kinetic plunge toward coordinate plane)
            p.targetZ = 6;
            p.targetPitch = 0.44; // Steep dive pitch
            p.targetRoll = Math.sin(this.ai3dCyclePhase * 2.2) * 0.35;

            // Dive acceleration into target
            const diveAngle = Math.atan2(priorityTarget.y - p.y, priorityTarget.x - p.x);
            navX += Math.cos(diveAngle) * 3.0;
            navY += Math.sin(diveAngle) * 3.0;
            p.vx *= 1.018; // Kinetic dive velocity impulse
            p.vy *= 1.018;

            this.aiStatusText = `AI PILOT: [BOOM & ZOOM: DIVE] ALT: +${Math.round(p.z)}m | TOP-DOWN STRAFE RUN`;
          } else {
            // Phase 3: Breakaway Zoom-Climb (recovering altitude and breaking hostile lock)
            p.targetZ = 48;
            p.targetPitch = -0.36; // Pulling up
            p.targetRoll = 0.45;

            // Bank away from target
            const egressAngle = Math.atan2(p.y - priorityTarget.y, p.x - priorityTarget.x) + 0.5;
            navX += Math.cos(egressAngle) * 2.6;
            navY += Math.sin(egressAngle) * 2.6;

            this.aiStatusText = `AI PILOT: [BOOM & ZOOM: RECOVER] ALT: +${Math.round(p.z)}m | BREAKAWAY ZOOM CLIMB`;
          }
          break;
        }

        case 'ORBITAL_BRACKET': {
          if (!priorityTarget) break;
          // High-Low 3D Orbital Pincer: Orbit target while oscillating altitude between dorsal (+36m) and ventral deck (-8m)
          p.targetZ = 16 + Math.sin(this.ai3dCyclePhase * 1.6) * 22;
          p.targetPitch = Math.cos(this.ai3dCyclePhase * 1.6) * 0.22;
          p.targetRoll = 0.55; // Sustained banking into orbit center

          // 3D Orbital tangential vector (maintaining 230-310px radius)
          const tdx = priorityTarget.x - p.x;
          const tdy = priorityTarget.y - p.y;
          const tdist = Math.hypot(tdx, tdy) || 1;
          const desiredDist = 260;

          // Tangential component (clockwise orbit)
          const tangX = -tdy / tdist;
          const tangY = tdx / tdist;

          // Radial component (push/pull to maintain standoff)
          const radialScale = (tdist - desiredDist) / 100;
          const radX = (tdx / tdist) * radialScale;
          const radY = (tdy / tdist) * radialScale;

          navX += (tangX * 2.2 + radX * 1.4);
          navY += (tangY * 2.2 + radY * 1.4);

          this.aiStatusText = `AI PILOT: [3D ORBITAL BRACKET] ALT: +${Math.round(p.z)}m | BRACKETING ${priorityTarget.type.replace('_', ' ')}`;
          break;
        }

        case 'DECK_LEVEL_INTERCEPT':
        default: {
          // Low-Altitude Deck Skim & Intercept: Fast low altitude sweep for nimble swarmers and drops
          p.targetZ = Math.sin(this.ai3dCyclePhase * 0.9) * 5;
          p.targetPitch = Math.max(-0.25, Math.min(0.25, (Math.hypot(p.vx, p.vy) / p.maxSpeed) * 0.22));

          // Aim/steer toward priority target or harvest drops
          let closestDrop: DropItem | null = null;
          let closestDropDist = 360;

          for (const drop of this.drops) {
            const ddist = Math.hypot(drop.x - p.x, drop.y - p.y);
            if (ddist < closestDropDist) {
              let urgency = 1.2;
              if (drop.type === 'REPAIR' && p.health < p.maxHealth * 0.75) urgency = 2.6;
              if (drop.type === 'SHIELD_BOOST' && p.shield < p.maxShield * 0.5) urgency = 2.0;

              closestDropDist = ddist;
              closestDrop = drop;
              navX += ((drop.x - p.x) / ddist) * urgency * 1.8;
              navY += ((drop.y - p.y) / ddist) * urgency * 1.8;
            }
          }

          if (priorityTarget && (!closestDrop || closestDropDist > 200)) {
            const edx = priorityTarget.x - p.x;
            const edy = priorityTarget.y - p.y;
            const edist = Math.hypot(edx, edy) || 1;
            if (edist > 220) {
              navX += (edx / edist) * 1.8;
              navY += (edy / edist) * 1.8;
            } else if (edist < 140) {
              navX -= (edx / edist) * 1.5;
              navY -= (edy / edist) * 1.5;
            }
          }

          // Telemetry
          if (closestDrop && closestDropDist < 180) {
            this.aiStatusText = `AI PILOT: [DECK HARVEST] ALT: +${Math.round(p.z)}m | HARVESTING ${closestDrop.type}`;
          } else if (priorityTarget) {
            const tName = priorityTarget.type.replace('_', ' ');
            const distM = Math.round(Math.hypot(priorityTarget.x - p.x, priorityTarget.y - p.y));
            this.aiStatusText = `AI PILOT: [DECK INTERCEPT] ALT: +${Math.round(p.z)}m | ENGAGING ${tName} [${distM}m]`;
          } else {
            this.aiStatusText = `AI PILOT: [DECK RECON] ALT: +${Math.round(p.z)}m | SECTOR PATROL`;
          }
          break;
        }
      }

      // 4. Apply Navigation Vector to Ship Velocity
      const navLen = Math.hypot(navX, navY);
      if (navLen > 0) {
        const nx = navX / navLen;
        const ny = navY / navLen;
        p.vx += nx * p.acceleration * 1.25;
        p.vy += ny * p.acceleration * 1.25;
      }
    } else {
      this.aiStatusText = 'MANUAL OVERRIDE ACTIVE';
    }
  }

  private updatePlayer(dt: number) {
    const p = this.player;

    // Movement Controls (WASD / Arrows)
    let moveX = 0;
    let moveY = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    const isManualMove = moveX !== 0 || moveY !== 0;

    // Run AI Autopilot routines if AI mode is enabled
    if (this.isAiPilot) {
      this.updateAiAutopilot(dt, isManualMove);
    }

    // Normalize diagonal manual velocity
    if (isManualMove) {
      const len = Math.hypot(moveX, moveY);
      if (len > 0) {
        moveX /= len;
        moveY /= len;
        p.vx += moveX * p.acceleration;
        p.vy += moveY * p.acceleration;
      }
    }

    // Apply friction and speed cap
    p.vx *= p.friction;
    p.vy *= p.friction;

    const curSpeed = Math.hypot(p.vx, p.vy);
    if (curSpeed > p.maxSpeed && !p.isDashing) {
      p.vx = (p.vx / curSpeed) * p.maxSpeed;
      p.vy = (p.vy / curSpeed) * p.maxSpeed;
    }

    p.x += p.vx;
    p.y += p.vy;

    // Aim toward mouse cursor smoothly with rotational inertia (respecting angular mass)
    const targetAngle = Math.atan2(this.mouseY - p.y, this.mouseX - p.x);
    let diff = targetAngle - p.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    p.angle += diff * Math.min(1.0, dt * 6.5);

    // Record trail history for smooth drone escort wing tracking
    p.history.unshift({ x: p.x, y: p.y, angle: p.angle });
    if (p.history.length > 120) p.history.pop();

    // Dash cooldown & timer
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      if (p.dashTimer <= p.dashCooldown - 0.25) {
        p.isDashing = false;
      }
    }

    // 3D Spatial Flight Dynamics & G-Force Simulation (Roll banking, pitch, and altitude)
    const forwardVel = Math.cos(p.angle) * p.vx + Math.sin(p.angle) * p.vy;
    const lateralVel = -Math.sin(p.angle) * p.vx + Math.cos(p.angle) * p.vy;

    if (!this.isAiPilot || isManualMove) {
      // Manual flight: Pitch dips under forward thrust, lifts on deceleration
      p.targetPitch = Math.max(-0.45, Math.min(0.45, (forwardVel / p.maxSpeed) * 0.32));
      // Roll banking responds to both angular turn rate and lateral G-force drift
      p.targetRoll = Math.max(-0.65, Math.min(0.65, (diff * 1.8) + (lateralVel * 0.12)));
      p.targetZ = 0;
    }
    p.pitch += (p.targetPitch - p.pitch) * Math.min(1.0, dt * 8);

    // Roll & 3D Barrel Roll:
    if (p.barrelRollProgress > 0) {
      p.barrelRollProgress = Math.max(0, p.barrelRollProgress - dt * 2.6);
      p.roll = (1.0 - p.barrelRollProgress) * Math.PI * 2;
      p.z += p.vz * dt;
      p.vz -= 110 * dt; // Altitude return gravity
      if (p.z < 0) {
        p.z = 0;
        p.vz = 0;
      }
    } else {
      p.roll += (p.targetRoll - p.roll) * Math.min(1.0, dt * 9);
      // Aerodynamic altitude hover tracking commanded targetZ
      const commandedZ = p.targetZ !== undefined ? p.targetZ : 0;
      const hoverZ = commandedZ + Math.sin(Date.now() * 0.003) * 4;
      p.z += (hoverZ - p.z) * Math.min(1.0, dt * 4.8);
    }

    // Invulnerability timer
    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer -= dt;
    }

    // Shield passive regeneration
    if (p.shield < p.maxShield) {
      p.shieldRegenTimer += dt;
      if (p.shieldRegenTimer >= p.shieldRegenDelay) {
        p.shield = Math.min(p.maxShield, p.shield + dt * 15);
      }
    }

    // Engine exhaust particles
    if (curSpeed > 0.5) {
      const exhaustAngle = p.angle + Math.PI + (Math.random() - 0.5) * 0.4;
      const exSpeed = 3 + Math.random() * 3;
      this.particles.push({
        x: p.x - Math.cos(p.angle) * 16,
        y: p.y - Math.sin(p.angle) * 16,
        vx: Math.cos(exhaustAngle) * exSpeed,
        vy: Math.sin(exhaustAngle) * exSpeed,
        size: Math.random() * 3 + 2,
        color: p.isDashing ? '#00F0FF' : '#38BDF8',
        alpha: 0.8,
        life: 0.2,
        maxLife: 0.2,
        decay: 3.5,
        shape: 'CIRCLE',
      });
    }

    // Primary weapon firing & Recoil/Kickback/Heat decay
    p.leftBarrelRecoil = Math.max(0, p.leftBarrelRecoil - dt * 6.5);
    p.rightBarrelRecoil = Math.max(0, p.rightBarrelRecoil - dt * 6.5);
    p.heat = Math.max(0, p.heat - dt * 26);
    
    // Smooth high-frequency recovery for visual hull kickback and angular shudder
    p.visualRecoil = Math.max(0, p.visualRecoil - dt * (22 + p.visualRecoil * 4.5));
    p.visualRecoilAngle *= Math.pow(0.0001, dt);

    if (p.rcsTimer > 0) {
      p.rcsTimer -= dt;
      // Front counter-stabilizer RCS plasma micro-puffs under heavy weapon kickback
      if (Math.random() > 0.35) {
        const perp = p.angle + Math.PI / 2;
        const side = Math.random() > 0.5 ? 1 : -1;
        const rcsX = p.x + Math.cos(p.angle) * 14 + Math.cos(perp) * (side * 10);
        const rcsY = p.y + Math.sin(p.angle) * 14 + Math.sin(perp) * (side * 10);
        const rcsAngle = p.angle + (Math.random() - 0.5) * 0.6;
        this.particles.push({
          x: rcsX,
          y: rcsY,
          vx: Math.cos(rcsAngle) * (2.5 + Math.random() * 2),
          vy: Math.sin(rcsAngle) * (2.5 + Math.random() * 2),
          size: Math.random() * 2.0 + 1.0,
          color: '#E0F2FE',
          alpha: 0.65,
          life: 0.08,
          maxLife: 0.08,
          decay: 8.0,
          shape: 'SPARK',
        });
      }
    }

    // Heat sink thermal smoke venting if running hot
    if (p.heat > 35 && Math.random() > 0.4) {
      const ventAngle = p.angle + Math.PI + (Math.random() - 0.5) * 1.2;
      this.particles.push({
        x: p.x - Math.cos(p.angle) * 8 + (Math.random() - 0.5) * 10,
        y: p.y - Math.sin(p.angle) * 8 + (Math.random() - 0.5) * 10,
        vx: Math.cos(ventAngle) * 2,
        vy: Math.sin(ventAngle) * 2,
        size: Math.random() * 2.5 + 1.2,
        color: '#F97316',
        alpha: 0.5,
        life: 0.16,
        maxLife: 0.16,
        decay: 3.5,
        shape: 'CIRCLE',
      });
    }

    if (p.fireTimer > 0) {
      p.fireTimer -= dt;
    }

    const shouldFire = this.isMouseDown && p.fireTimer <= 0;
    if (shouldFire) {
      this.firePlayerPrimary();
      p.fireTimer = p.fireCooldown / p.fireRateMultiplier;
    }
  }

  public getEquippedWeaponPower(): number {
    let power = this.player.damageMultiplier;
    for (const drone of this.player.drones) {
      const weight =
        drone.type === 'RAILGUN'
          ? 0.55
          : drone.type === 'MISSILE'
          ? 0.42
          : drone.type === 'SPREAD'
          ? 0.35
          : drone.type === 'TESLA'
          ? 0.3
          : 0.22;
      power += weight * drone.level;
    }
    return Math.max(1.0, power);
  }

  private spawnMuzzleFlash(x: number, y: number, angle: number, color: string, count: number = 4) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * 0.45;
      const spd = Math.random() * 7 + 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: Math.random() * 2.4 + 1.4,
        color: Math.random() > 0.35 ? '#FFFFFF' : color,
        alpha: 0.95,
        life: 0.08 + Math.random() * 0.04,
        maxLife: 0.12,
        decay: 8.0,
        shape: 'SPARK',
      });
    }
  }

  private firePlayerPrimary() {
    const p = this.player;
    const speed = 25;
    const power = this.getEquippedWeaponPower();
    const dmg = 26 * p.damageMultiplier;

    // Tactical micro-recoil impulse & dynamic drift scaled by total weapon power
    const driftRear = 0.34 + 0.15 * Math.min(3.5, power);
    p.vx -= Math.cos(p.angle) * driftRear;
    p.vy -= Math.sin(p.angle) * driftRear;
    p.heat = Math.min(100, p.heat + 7);

    // Visual hull kickback spring displacement (scaled with weapon power)
    const visualKick = Math.min(7.5, 2.4 * Math.sqrt(power));
    p.visualRecoil = Math.min(9.5, p.visualRecoil + visualKick);

    // Alternate firing between left and right wing cannons
    const isLeft = p.barrelIndex % 2 === 0;
    p.barrelIndex++;

    const wingOffset = 13;
    const perpAngle = p.angle + Math.PI / 2;
    const sideMultiplier = isLeft ? 1 : -1;

    // Asymmetric barrel angular kick & lateral drift torque
    p.visualRecoilAngle += sideMultiplier * (0.024 + 0.012 * Math.min(2.5, power));
    const driftLateral = (0.07 + 0.03 * Math.min(2.5, power)) * sideMultiplier;
    p.vx += Math.cos(perpAngle) * driftLateral;
    p.vy += Math.sin(perpAngle) * driftLateral;

    if (power > 1.2) {
      p.rcsTimer = 0.11;
    }

    if (isLeft) {
      p.leftBarrelRecoil = 1.0;
    } else {
      p.rightBarrelRecoil = 1.0;
    }

    const barrelX = p.x + Math.cos(perpAngle) * (wingOffset * sideMultiplier) + Math.cos(p.angle) * 12;
    const barrelY = p.y + Math.sin(perpAngle) * (wingOffset * sideMultiplier) + Math.sin(p.angle) * 12;

    this.spawnMuzzleFlash(barrelX, barrelY, p.angle, '#00F0FF', 4);

    this.projectiles.push({
      id: `p_prim_${Date.now()}_${Math.random()}`,
      x: barrelX,
      y: barrelY,
      vx: p.vx + Math.cos(p.angle) * speed,
      vy: p.vy + Math.sin(p.angle) * speed,
      radius: 3.5,
      damage: dmg,
      color: '#00F0FF',
      weaponType: 'PRIMARY',
      isEnemy: false,
      piercing: 1,
      life: 1.1,
      maxLife: 1.1,
      caliberScale: 1.0,
      trail: [{ x: barrelX, y: barrelY }],
    });

    audioManager.playPositionalLaser('PRIMARY', barrelX, barrelY, p.x, p.y);
  }

  private updateDrones(dt: number) {
    const p = this.player;
    const drones = p.drones;
    if (drones.length === 0) {
      this.synergyLinks = [];
      return;
    }

    // --- Dynamic Synergy Link & Buff Network ---
    this.synergyLinks = [];
    const SYNERGY_NEXUS_RADIUS = 180;
    const SYNERGY_DRONE_RADIUS = 150;

    // Reset synergy buffs per frame
    for (const d of drones) {
      d.synergyBuff = {
        fireRateBonus: 0,
        damageBonus: 0,
        activeLinks: 0,
        nexusLinked: false,
      };
    }

    // 1. Drone <-> Nexus Core links
    for (const d of drones) {
      const distToPlayer = Math.hypot(d.x - p.x, d.y - p.y);
      if (distToPlayer <= SYNERGY_NEXUS_RADIUS) {
        const proximityRatio = Math.max(0, 1 - distToPlayer / SYNERGY_NEXUS_RADIUS);
        d.synergyBuff.nexusLinked = true;
        d.synergyBuff.activeLinks++;
        d.synergyBuff.fireRateBonus += 0.20 * (0.5 + 0.5 * proximityRatio); // +10% to +20%
        d.synergyBuff.damageBonus += 0.20 * (0.5 + 0.5 * proximityRatio);   // +10% to +20%

        this.synergyLinks.push({
          sourceId: 'player',
          targetId: d.id,
          x1: p.x,
          y1: p.y,
          x2: d.x,
          y2: d.y,
          distance: distToPlayer,
          maxDistance: SYNERGY_NEXUS_RADIUS,
          color: d.color,
          alpha: 0.25 + 0.55 * proximityRatio,
          pulsePhase: (Date.now() * 0.006) % (Math.PI * 2),
        });
      }
    }

    // 2. Drone <-> Drone peer synergy links
    for (let i = 0; i < drones.length; i++) {
      for (let j = i + 1; j < drones.length; j++) {
        const d1 = drones[i];
        const d2 = drones[j];
        const dist = Math.hypot(d2.x - d1.x, d2.y - d1.y);
        if (dist <= SYNERGY_DRONE_RADIUS) {
          const proximityRatio = Math.max(0, 1 - dist / SYNERGY_DRONE_RADIUS);
          d1.synergyBuff.activeLinks++;
          d2.synergyBuff.activeLinks++;

          // Cross-wingman mutual fire rate and damage amplification (+8% to +15%)
          const peerBonus = 0.15 * (0.5 + 0.5 * proximityRatio);
          d1.synergyBuff.fireRateBonus += peerBonus;
          d1.synergyBuff.damageBonus += peerBonus;
          d2.synergyBuff.fireRateBonus += peerBonus;
          d2.synergyBuff.damageBonus += peerBonus;

          // Blend colors or use source color
          this.synergyLinks.push({
            sourceId: d1.id,
            targetId: d2.id,
            x1: d1.x,
            y1: d1.y,
            x2: d2.x,
            y2: d2.y,
            distance: dist,
            maxDistance: SYNERGY_DRONE_RADIUS,
            color: d1.color,
            alpha: 0.2 + 0.5 * proximityRatio,
            pulsePhase: (Date.now() * 0.007 + i) % (Math.PI * 2),
          });
        }
      }
    }

    // Process each escort wingman with realistic aerospace flight physics and autonomous tactical AI
    for (let idx = drones.length - 1; idx >= 0; idx--) {
      const drone = drones[idx];

      // 1. Health & Shield durability ticks
      if (drone.hitFlashTimer > 0) {
        drone.hitFlashTimer = Math.max(0, drone.hitFlashTimer - dt);
      }
      if (drone.shield < drone.maxShield) {
        drone.shieldRegenTimer += dt;
        if (drone.shieldRegenTimer >= 2.5) {
          drone.shield = Math.min(drone.maxShield, drone.shield + dt * 14);
        }
      }

      // Decay visual effects (RCS flare, barrel kick)
      if (drone.rcsFlare > 0) {
        drone.rcsFlare = Math.max(0, drone.rcsFlare - dt * 4.0);
      }
      if (drone.barrelKick > 0) {
        drone.barrelKick = Math.max(0, drone.barrelKick - dt * 6.0);
      }

      // 2. Proximity Hostile & Threat Detection
      const nearestEnemy = this.findNearestEnemy(drone.x, drone.y, 750);
      const distToPlayer = Math.hypot(drone.x - p.x, drone.y - p.y);

      // Check if enemy is tailing the player flagship (within 220px behind player heading)
      let tailChaser: Enemy | null = null;
      if (nearestEnemy) {
        const dxToEnemy = nearestEnemy.x - p.x;
        const dyToEnemy = nearestEnemy.y - p.y;
        const distToShip = Math.hypot(dxToEnemy, dyToEnemy);
        if (distToShip < 240) {
          const angleToEnemy = Math.atan2(dyToEnemy, dxToEnemy);
          let relAngle = angleToEnemy - p.angle;
          while (relAngle < -Math.PI) relAngle += Math.PI * 2;
          while (relAngle > Math.PI) relAngle -= Math.PI * 2;
          // Enemy is behind flagship (+/- 60 degrees from reverse heading)
          if (Math.abs(relAngle) > 2.1) {
            tailChaser = nearestEnemy;
          }
        }
      }

      // Check for incoming hostile projectile threat within collision path (130px)
      if (drone.aiEvasionTimer <= 0) {
        let incomingThreat = false;
        let threatAngle = 0;
        for (let pj = 0; pj < this.projectiles.length; pj++) {
          const prj = this.projectiles[pj];
          if (!prj.isEnemy) continue;
          const pDist = Math.hypot(prj.x - drone.x, prj.y - drone.y);
          if (pDist < 110) {
            incomingThreat = true;
            threatAngle = Math.atan2(drone.y - prj.y, drone.x - prj.x);
            break;
          }
        }

        // Also evade if an enemy is dangerously close and ramming
        if (!incomingThreat && nearestEnemy && Math.hypot(nearestEnemy.x - drone.x, nearestEnemy.y - drone.y) < 70) {
          incomingThreat = true;
          threatAngle = Math.atan2(drone.y - nearestEnemy.y, drone.x - nearestEnemy.x);
        }

        if (incomingThreat) {
          drone.aiState = 'EVADE';
          drone.aiEvasionTimer = 0.38;
          // Break hard perpendicular to threat trajectory
          const breakSide = Math.random() < 0.5 ? 1 : -1;
          const evadeAngle = threatAngle + (Math.PI / 2) * breakSide;
          drone.aiEvasionVector = { x: Math.cos(evadeAngle), y: Math.sin(evadeAngle) };
          drone.rcsFlare = 1.0;
          this.spawnSparks(drone.x, drone.y, drone.color, 3);
        }
      }

      // 3. Tactical Wingman Station Formation in Flagship Reference Frame
      drone.aiState = 'ESCORT';

      let formAngleOffset = 0;
      let formDist = 50;

      if (idx === 0) {
        // Port Echelon Wingman
        formAngleOffset = -2.45;
        formDist = 48;
      } else if (idx === 1) {
        // Starboard Echelon Wingman
        formAngleOffset = 2.45;
        formDist = 48;
      } else if (idx === 2) {
        // Port Outer Wing
        formAngleOffset = -2.20;
        formDist = 72;
      } else if (idx === 3) {
        // Starboard Outer Wing
        formAngleOffset = 2.20;
        formDist = 72;
      } else if (idx === 4) {
        // Rear High-Guard Cover
        formAngleOffset = Math.PI;
        formDist = 58;
      } else {
        // Extended Outer Wingman Spread
        const side = idx % 2 === 0 ? 1 : -1;
        const tier = Math.floor((idx - 5) / 2);
        formAngleOffset = Math.PI + side * (0.42 + tier * 0.12);
        formDist = 78 + tier * 16;
      }

      const slotAngle = p.angle + formAngleOffset;
      const targetX = p.x + Math.cos(slotAngle) * formDist;
      const targetY = p.y + Math.sin(slotAngle) * formDist;

      // 4. Spacecraft Newtonian Propulsion & Velocity Physics
      const toTargetX = targetX - drone.x;
      const toTargetY = targetY - drone.y;
      const distToStation = Math.hypot(toTargetX, toTargetY);

      // Smooth proportional thruster acceleration toward station
      if (distToStation > 0.5) {
        const stationDirX = toTargetX / distToStation;
        const stationDirY = toTargetY / distToStation;
        const thrustPower = Math.min(0.75, distToStation * 0.05);
        drone.vx += stationDirX * thrustPower;
        drone.vy += stationDirY * thrustPower;
      }

      // Match lead spacecraft velocity curve
      drone.vx += (p.vx - drone.vx) * 0.15;
      drone.vy += (p.vy - drone.vy) * 0.15;

      // Spacecraft vacuum inertia & friction damping (identical to flagship flight model)
      drone.vx *= 0.94;
      drone.vy *= 0.94;

      // Velocity clamp
      const currentSpeed = Math.hypot(drone.vx, drone.vy);
      const maxWingmanSpeed = p.maxSpeed * 1.35;
      if (currentSpeed > maxWingmanSpeed) {
        drone.vx = (drone.vx / currentSpeed) * maxWingmanSpeed;
        drone.vy = (drone.vy / currentSpeed) * maxWingmanSpeed;
      }

      // Smooth position integration in velocity units
      drone.x += drone.vx;
      drone.y += drone.vy;

      // Engine thruster pulse
      drone.thrusterPulse = Math.min(1.0, currentSpeed / p.maxSpeed);

      // Update fading ion thruster trail history
      const nozzleX = drone.x - Math.cos(drone.angle) * 10;
      const nozzleY = drone.y - Math.sin(drone.angle) * 10;
      if (!drone.trail) drone.trail = [];
      drone.trail.unshift({ x: nozzleX, y: nozzleY, alpha: 1.0 });
      if (drone.trail.length > 9) drone.trail.pop();
      for (let t = 0; t < drone.trail.length; t++) {
        drone.trail[t].alpha = Math.max(0, drone.trail[t].alpha - dt * 3.8);
      }

      // 5. Realistic Aerodynamic Heading & Target Aiming Calculation
      if (nearestEnemy && Math.hypot(nearestEnemy.x - drone.x, nearestEnemy.y - drone.y) < 550) {
        // Predictive lead aiming on target from wingman station
        const targetLeadDist = Math.hypot(nearestEnemy.x - drone.x, nearestEnemy.y - drone.y);
        const projectileSpd = DRONE_BLUEPRINTS[drone.type].speed;
        const timeToHit = targetLeadDist / (projectileSpd * 60);
        const aimTargetX = nearestEnemy.x + nearestEnemy.vx * timeToHit * 60;
        const aimTargetY = nearestEnemy.y + nearestEnemy.vy * timeToHit * 60;

        drone.targetAngle = Math.atan2(aimTargetY - drone.y, aimTargetX - drone.x);
        drone.targetEnemyId = nearestEnemy.id;
      } else {
        // Heading aligns smoothly with flight velocity vector or lead ship heading
        if (currentSpeed > 0.8) {
          drone.targetAngle = Math.atan2(drone.vy, drone.vx);
        } else {
          drone.targetAngle = this.player.angle;
        }
        drone.targetEnemyId = null;
        drone.isLockedOn = false;
        drone.chargeTimer = 0;
      }

      // Smooth angular turning with angular rate limit
      let headingDiff = drone.targetAngle - drone.angle;
      while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
      while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;

      const turnRate = Math.max(-8.0, Math.min(8.0, headingDiff * 14.0));
      drone.angle += turnRate * dt;

      // Dynamic banking calculation based on angular turn rate and lateral G-forces
      const lateralG = (-Math.sin(drone.angle) * drone.vx + Math.cos(drone.angle) * drone.vy) * 0.08;
      const targetBank = Math.max(-0.75, Math.min(0.75, turnRate * 0.08 + lateralG));
      drone.bankAngle += (targetBank - drone.bankAngle) * Math.min(1.0, dt * 11);

      // Staggered 3D echelon wingman vertical tiers:
      // Alternating above (+15) and below (-14) lead ship orbital plane
      const tierSign = idx % 2 === 0 ? 1 : -1;
      const echelonTierAltitude = tierSign * (14 + Math.floor(idx / 2) * 10);
      drone.targetZ = (p.z || 0) + echelonTierAltitude + Math.sin(Date.now() * 0.0035 + idx * 1.6) * 4;
      drone.z = (drone.z || 0) + (drone.targetZ - (drone.z || 0)) * Math.min(1.0, dt * 5.0);

      // 3D Pitch from forward velocity
      const droneForward = Math.cos(drone.angle) * drone.vx + Math.sin(drone.angle) * drone.vy;
      const droneTargetPitch = Math.max(-0.35, Math.min(0.35, (droneForward / p.maxSpeed) * 0.26));
      drone.pitch = (drone.pitch || 0) + (droneTargetPitch - (drone.pitch || 0)) * Math.min(1.0, dt * 7);

      if (Math.abs(headingDiff) > 0.7) {
        drone.rcsFlare = Math.max(drone.rcsFlare, 0.6);
      }

      const isAligned = Math.abs(headingDiff) < 0.38;

      // Drone Weapon Cooldown Tick
      if (drone.fireTimer > 0) {
        drone.fireTimer -= dt;
      }

      const bp = DRONE_BLUEPRINTS[drone.type];
      const synergyFireBonus = drone.synergyBuff ? drone.synergyBuff.fireRateBonus : 0;
      const effectiveCooldown = (bp.baseCooldown / (this.player.fireRateMultiplier * (1 + synergyFireBonus))) * (1 - (drone.level - 1) * 0.12);

      // --- Weapon-Specific Tactical Cadence Engines ---

      if (drone.type === 'BLASTER') {
        // Smart Seeker Drone: Targets nearest hostile autonomously with terminal-guided micro-torpedoes
        if (drone.fireTimer <= 0 && nearestEnemy) {
          this.fireBlasterBurstRound(drone);
          drone.fireTimer = effectiveCooldown;
        }
      } else if (drone.type === 'SPREAD') {
        // Flak Scatterer: High-impact heavy blast when on-target
        if (drone.fireTimer <= 0 && isAligned && (nearestEnemy || this.isMouseDown)) {
          this.fireSpreadFlak(drone);
          drone.fireTimer = effectiveCooldown;
        }
      } else if (drone.type === 'MISSILE') {
        // Micro-Missile Pod: Sensor lock requirement
        if (nearestEnemy && isAligned) {
          if (!drone.isLockedOn) {
            drone.isLockedOn = true;
            audioManager.playLockOnPing(drone.x, drone.y, this.player.x, this.player.y);
          }
          if (drone.fireTimer <= 0) {
            this.fireMissileSalvo(drone, nearestEnemy);
            drone.fireTimer = effectiveCooldown;
          }
        } else {
          drone.isLockedOn = false;
        }
      } else if (drone.type === 'RAILGUN') {
        // Piercing Lance: Focused capacitor charge before relativistic discharge
        if (nearestEnemy && isAligned) {
          if (drone.fireTimer <= 0) {
            if (drone.chargeTimer === 0) {
              audioManager.playRailgunCharge(drone.x, drone.y, this.player.x, this.player.y);
            }
            drone.chargeTimer += dt;

            // Ambient electric energy particles converging on dual rail muzzle tip
            if (Math.random() < 0.25) {
              const muzzleX = drone.x + Math.cos(drone.angle) * 14;
              const muzzleY = drone.y + Math.sin(drone.angle) * 14;
              const a = Math.random() * Math.PI * 2;
              const dist = 10 + Math.random() * 12;
              const px = muzzleX + Math.cos(a) * dist;
              const py = muzzleY + Math.sin(a) * dist;
              this.particles.push({
                x: px,
                y: py,
                vx: (muzzleX - px) * 2.5,
                vy: (muzzleY - py) * 2.5,
                size: 1.0,
                color: '#10B981',
                alpha: 0.6,
                life: 0.12,
                maxLife: 0.12,
                decay: 1.0 / 0.12,
                shape: 'SPARK',
              });
            }

            if (drone.chargeTimer >= drone.maxChargeTimer) {
              this.fireRailgunSabot(drone);
              drone.fireTimer = effectiveCooldown;
              drone.chargeTimer = 0;
            }
          }
        } else {
          drone.chargeTimer = Math.max(0, drone.chargeTimer - dt * 2);
        }
      } else if (drone.type === 'TESLA') {
        // Arc Coil: Branching lightning discharge
        if (drone.fireTimer <= 0 && nearestEnemy && Math.hypot(nearestEnemy.x - drone.x, nearestEnemy.y - drone.y) < 280) {
          this.fireTeslaArc(drone, nearestEnemy);
          drone.fireTimer = effectiveCooldown;
        }
      }
    }
  }

  public hitDrone(drone: DroneModule, damage: number) {
    drone.shieldRegenTimer = 0;
    let remainingDmg = damage;

    if (drone.shield > 0) {
      drone.hitFlashTimer = 0.12;
      if (drone.shield >= remainingDmg) {
        drone.shield -= remainingDmg;
        remainingDmg = 0;
        this.addFloatingText(drone.x, drone.y - 12, `DEFLECT ${Math.round(damage)}`, '#38BDF8');
        this.spawnSparks(drone.x, drone.y, '#38BDF8', 4);
        audioManager.playPositionalHit(drone.x, drone.y, true, this.player.x, this.player.y);
      } else {
        remainingDmg -= drone.shield;
        drone.shield = 0;
        this.addFloatingText(drone.x, drone.y - 12, 'SHIELD BROKEN', '#38BDF8');
        this.shockwaves.push({
          x: drone.x,
          y: drone.y,
          radius: 4,
          maxRadius: 20,
          color: '#38BDF8',
          alpha: 0.8,
          life: 0.12,
          maxLife: 0.12,
        });
        audioManager.playPositionalHit(drone.x, drone.y, true, this.player.x, this.player.y);
      }
    }

    if (remainingDmg > 0) {
      drone.health -= remainingDmg;
      drone.hitFlashTimer = 0.15;
      this.addFloatingText(drone.x, drone.y - 10, `-${Math.round(remainingDmg)}`, '#F59E0B');
      this.spawnSparks(drone.x, drone.y, drone.color, 5);
      audioManager.playPositionalHit(drone.x, drone.y, false, this.player.x, this.player.y);
    }

    if (drone.health <= 0) {
      this.destroyDrone(drone);
    }
  }

  private destroyDrone(drone: DroneModule) {
    const idx = this.player.drones.findIndex((d) => d.id === drone.id);
    if (idx !== -1) {
      this.player.drones.splice(idx, 1);
    }

    // Positional explosion audio & screen micro-shake
    audioManager.playPositionalExplosion(drone.x, drone.y, false, this.player.x, this.player.y);
    this.triggerScreenShake(3.5);

    // Floating combat text
    const bp = DRONE_BLUEPRINTS[drone.type];
    this.addFloatingText(drone.x, drone.y - 20, `${bp.name.toUpperCase()} LOST`, '#EF4444');

    // Shockwave
    this.shockwaves.push({
      x: drone.x,
      y: drone.y,
      radius: 4,
      maxRadius: 38,
      color: drone.color,
      alpha: 0.9,
      life: 0.22,
      maxLife: 0.22,
    });

    // Hull debris & sparks
    this.spawnSparks(drone.x, drone.y, drone.color, 16);
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 2;
      this.particles.push({
        x: drone.x,
        y: drone.y,
        vx: Math.cos(ang) * spd + drone.vx * 0.3,
        vy: Math.sin(ang) * spd + drone.vy * 0.3,
        size: Math.random() * 3.5 + 1.5,
        color: drone.color,
        alpha: 1.0,
        life: Math.random() * 0.5 + 0.3,
        maxLife: Math.random() * 0.5 + 0.3,
        decay: 2.0,
        shape: 'DEBRIS',
        drag: 0.92,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        hasTrail: true,
      });
    }
  }

  // Tactical Drone Firing Implementations:

  private fireBlasterBurstRound(drone: DroneModule) {
    const bp = DRONE_BLUEPRINTS.BLASTER;
    const synergyDmgBonus = drone.synergyBuff ? drone.synergyBuff.damageBonus : 0;
    const dmg = bp.damage * this.player.damageMultiplier * (1 + synergyDmgBonus) * (1 + (drone.level - 1) * 0.3);
    const speed = bp.speed;
    const fireAngle = drone.angle;
    const nearest = this.findNearestEnemy(drone.x, drone.y, 650);

    drone.barrelKick = 1.0;
    this.spawnMuzzleFlash(drone.x, drone.y, fireAngle, bp.color, 3);

    this.projectiles.push({
      id: `dr_b_${Date.now()}_${Math.random()}`,
      x: drone.x + Math.cos(fireAngle) * 8,
      y: drone.y + Math.sin(fireAngle) * 8,
      vx: drone.vx + Math.cos(fireAngle) * speed,
      vy: drone.vy + Math.sin(fireAngle) * speed,
      radius: 3.5,
      damage: dmg,
      color: bp.color,
      weaponType: 'BLASTER',
      level: drone.level,
      isEnemy: false,
      piercing: 1,
      life: 1.8,
      maxLife: 1.8,
      isMissile: true,
      targetEnemyId: nearest ? nearest.id : null,
      homingStrength: 0.16 + (drone.level - 1) * 0.04,
      stage: 0,
      trail: [{ x: drone.x, y: drone.y }],
    });

    audioManager.playPositionalLaser('BLASTER', drone.x, drone.y, this.player.x, this.player.y);
  }

  private fireSpreadFlak(drone: DroneModule) {
    const bp = DRONE_BLUEPRINTS.SPREAD;
    const synergyDmgBonus = drone.synergyBuff ? drone.synergyBuff.damageBonus : 0;
    const dmg = bp.damage * this.player.damageMultiplier * (1 + synergyDmgBonus) * (1 + (drone.level - 1) * 0.25);
    const speed = bp.speed;
    const fireAngle = drone.angle;

    drone.barrelKick = 1.0;
    this.spawnMuzzleFlash(drone.x, drone.y, fireAngle, bp.color, 6);

    // Number of flechettes scales by level: 3 (lvl 1), 5 (lvl 2), 7 (lvl 3+)
    const count = 3 + (drone.level - 1) * 2;
    const spreadSpan = 0.32 + (drone.level - 1) * 0.08;
    const step = count > 1 ? spreadSpan / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const offsetAngle = -spreadSpan / 2 + i * step;
      const a = fireAngle + offsetAngle + (Math.random() - 0.5) * 0.04;
      const spd = speed * (0.92 + Math.random() * 0.16);

      this.projectiles.push({
        id: `dr_s_${Date.now()}_${Math.random()}`,
        x: drone.x + Math.cos(a) * 6,
        y: drone.y + Math.sin(a) * 6,
        vx: drone.vx + Math.cos(a) * spd,
        vy: drone.vy + Math.sin(a) * spd,
        radius: 3,
        damage: dmg,
        color: bp.color,
        weaponType: 'SPREAD',
        level: drone.level,
        isEnemy: false,
        piercing: 1,
        life: 0.82,
        maxLife: 0.82,
        trail: [{ x: drone.x, y: drone.y }],
      });
    }

    this.triggerScreenShake(1.2);
    // Sympathetic tactical kickback on player hull from flak shockwave
    this.player.visualRecoil = Math.min(8.5, this.player.visualRecoil + 1.2 * drone.level);
    this.player.vx -= Math.cos(fireAngle) * (0.15 * drone.level);
    this.player.vy -= Math.sin(fireAngle) * (0.15 * drone.level);
    audioManager.playPositionalLaser('SPREAD', drone.x, drone.y, this.player.x, this.player.y);
  }

  private fireMissileSalvo(drone: DroneModule, target: Enemy) {
    const bp = DRONE_BLUEPRINTS.MISSILE;
    const synergyDmgBonus = drone.synergyBuff ? drone.synergyBuff.damageBonus : 0;
    const dmg = bp.damage * this.player.damageMultiplier * (1 + synergyDmgBonus) * (1 + (drone.level - 1) * 0.35);
    const speed = bp.speed;
    const fireAngle = drone.angle;

    drone.barrelKick = 1.0;
    this.spawnMuzzleFlash(drone.x, drone.y, fireAngle, '#F59E0B', 4);
    // Missile backblast impulse
    this.player.visualRecoil = Math.min(7.5, this.player.visualRecoil + 0.8 * drone.level);
    this.player.vx -= Math.cos(fireAngle) * (0.12 * drone.level);
    this.player.vy -= Math.sin(fireAngle) * (0.12 * drone.level);

    const warheads = drone.level >= 3 ? 3 : drone.level === 2 ? 2 : 1;

    for (let i = 0; i < warheads; i++) {
      const angleOffset = warheads === 1 ? 0 : (i - (warheads - 1) / 2) * 0.28;
      const launchAngle = fireAngle + angleOffset;

      this.projectiles.push({
        id: `dr_m_${Date.now()}_${Math.random()}`,
        x: drone.x + Math.cos(launchAngle) * 6,
        y: drone.y + Math.sin(launchAngle) * 6,
        vx: drone.vx + Math.cos(launchAngle) * (speed * 0.65), // Starts with cold launch, accelerates with rocket motor
        vy: drone.vy + Math.sin(launchAngle) * (speed * 0.65),
        radius: 4.2,
        damage: dmg,
        color: bp.color,
        weaponType: 'MISSILE',
        level: drone.level,
        isEnemy: false,
        piercing: 1,
        life: 2.4,
        maxLife: 2.4,
        isMissile: true,
        targetEnemyId: target.id,
        homingStrength: 0.12 + (drone.level - 1) * 0.03,
        stage: 0,
        trail: [{ x: drone.x, y: drone.y }],
      });
    }

    audioManager.playPositionalLaser('MISSILE', drone.x, drone.y, this.player.x, this.player.y);
  }

  private fireRailgunSabot(drone: DroneModule) {
    const bp = DRONE_BLUEPRINTS.RAILGUN;
    const synergyDmgBonus = drone.synergyBuff ? drone.synergyBuff.damageBonus : 0;
    const dmg = bp.damage * this.player.damageMultiplier * (1 + synergyDmgBonus) * (1 + (drone.level - 1) * 0.35);
    const speed = bp.speed;
    const fireAngle = drone.angle;

    drone.barrelKick = 0.6;

    // Exact dual rail muzzle tip position
    const muzzleX = drone.x + Math.cos(fireAngle) * 14;
    const muzzleY = drone.y + Math.sin(fireAngle) * 14;
    const endX = muzzleX + Math.cos(fireAngle) * 850;
    const endY = muzzleY + Math.sin(fireAngle) * 850;

    // Relativistic Lorentz Muzzle Blast & Plasma Sparks
    this.spawnMuzzleFlash(muzzleX, muzzleY, fireAngle, '#FFFFFF', 5);

    for (let i = 0; i < 4; i++) {
      const spread = fireAngle + (Math.random() - 0.5) * 0.4;
      const spd = 120 + Math.random() * 140;
      this.particles.push({
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(spread) * spd,
        vy: Math.sin(spread) * spd,
        size: 1.2,
        color: '#10B981',
        alpha: 0.8,
        life: 0.15,
        maxLife: 0.15,
        decay: 1.0 / 0.15,
        shape: 'SPARK',
      });
    }

    // Expanding Muzzle Shockwave
    this.shockwaves.push({
      x: muzzleX,
      y: muzzleY,
      radius: 2,
      maxRadius: 10 + drone.level * 2,
      color: '#10B981',
      alpha: 0.7,
      life: 0.15,
      maxLife: 0.15,
    });

    // Create lingering ionization beam in space starting PRECISELY at muzzle tip
    this.ionizationBeams.push({
      id: `beam_${Date.now()}_${Math.random()}`,
      x1: muzzleX,
      y1: muzzleY,
      x2: endX,
      y2: endY,
      color: bp.color,
      width: 1.5 + (drone.level - 1) * 0.5,
      alpha: 0.85,
      life: 0.22,
      maxLife: 0.22,
    });

    this.projectiles.push({
      id: `dr_r_${Date.now()}_${Math.random()}`,
      x: muzzleX,
      y: muzzleY,
      vx: drone.vx + Math.cos(fireAngle) * speed,
      vy: drone.vy + Math.sin(fireAngle) * speed,
      radius: 3.5,
      damage: dmg,
      color: bp.color,
      weaponType: 'RAILGUN',
      level: drone.level,
      isEnemy: false,
      piercing: bp.piercing + (drone.level - 1) * 2,
      life: 1.2,
      maxLife: 1.2,
      trail: [{ x: muzzleX, y: muzzleY }],
    });

    this.triggerScreenShake(3.2);
    // Relativistic magnetic recoil shockwave on player flagship
    this.player.visualRecoil = Math.min(10.0, this.player.visualRecoil + 2.4 * drone.level);
    this.player.vx -= Math.cos(fireAngle) * (0.28 * drone.level);
    this.player.vy -= Math.sin(fireAngle) * (0.28 * drone.level);
    this.player.rcsTimer = 0.14;
    audioManager.playPositionalLaser('RAILGUN', drone.x, drone.y, this.player.x, this.player.y);
  }

  private fireTeslaArc(drone: DroneModule, primaryTarget: Enemy) {
    const bp = DRONE_BLUEPRINTS.TESLA;
    const synergyDmgBonus = drone.synergyBuff ? drone.synergyBuff.damageBonus : 0;
    const dmg = bp.damage * this.player.damageMultiplier * (1 + synergyDmgBonus) * (1 + (drone.level - 1) * 0.3);
    const maxChains = 1 + drone.level; // Level 1: 2 enemies, Level 2: 3 enemies, Level 3: 4 enemies

    const hitEnemies: Enemy[] = [primaryTarget];
    this.damageEnemy(primaryTarget, dmg, bp.color);
    primaryTarget.hitFlashTimer = 0.25;

    // Generate jagged lightning arc points from drone to primary
    const mainArcPoints = this.generateLightningPoints(drone.x, drone.y, primaryTarget.x, primaryTarget.y);
    this.lightningArcs.push({
      id: `arc_${Date.now()}_0`,
      points: mainArcPoints,
      color: bp.color,
      alpha: 1.0,
      life: 0.16,
      maxLife: 0.16,
    });

    this.spawnSparks(primaryTarget.x, primaryTarget.y, bp.color, 8);

    // Chain to nearby hostiles
    let currentOrigin = primaryTarget;
    for (let c = 1; c < maxChains; c++) {
      const nextTarget = this.enemies.find(
        (e) => !hitEnemies.includes(e) && Math.hypot(e.x - currentOrigin.x, e.y - currentOrigin.y) < 220
      );
      if (!nextTarget) break;

      hitEnemies.push(nextTarget);
      const chainDmg = dmg * Math.pow(0.75, c);
      this.damageEnemy(nextTarget, chainDmg, bp.color);
      nextTarget.hitFlashTimer = 0.2;

      const chainPoints = this.generateLightningPoints(currentOrigin.x, currentOrigin.y, nextTarget.x, nextTarget.y);
      this.lightningArcs.push({
        id: `arc_${Date.now()}_${c}`,
        points: chainPoints,
        color: bp.color,
        alpha: 0.9,
        life: 0.16,
        maxLife: 0.16,
      });

      this.spawnSparks(nextTarget.x, nextTarget.y, bp.color, 6);
      currentOrigin = nextTarget;
    }

    this.triggerScreenShake(1.5);
    audioManager.playPositionalLaser('TESLA', drone.x, drone.y, this.player.x, this.player.y);
  }

  private generateLightningPoints(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
    const totalDist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(3, Math.floor(totalDist / 28));
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpAngle = angle + Math.PI / 2;

    for (let s = 1; s < steps; s++) {
      const progress = s / steps;
      const baseX = x1 + (x2 - x1) * progress;
      const baseY = y1 + (y2 - y1) * progress;
      const jitter = (Math.random() - 0.5) * 22;
      points.push({
        x: baseX + Math.cos(perpAngle) * jitter,
        y: baseY + Math.sin(perpAngle) * jitter,
      });
    }

    points.push({ x: x2, y: y2 });
    return points;
  }

  private updateProjectiles(dt: number) {
    // Update Ionization Beams
    for (let b = this.ionizationBeams.length - 1; b >= 0; b--) {
      const beam = this.ionizationBeams[b];
      beam.life -= dt;
      beam.alpha = Math.max(0, beam.life / beam.maxLife);
      if (beam.life <= 0) {
        this.ionizationBeams.splice(b, 1);
      }
    }

    // Update Lightning Arcs
    for (let a = this.lightningArcs.length - 1; a >= 0; a--) {
      const arc = this.lightningArcs[a];
      arc.life -= dt;
      arc.alpha = Math.max(0, arc.life / arc.maxLife);
      if (arc.life <= 0) {
        this.lightningArcs.splice(a, 1);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Two-stage rocket acceleration for seeking micro-missiles
      if (p.isMissile) {
        p.stage = (p.stage || 0) + dt;
        const currentSpeed = Math.hypot(p.vx, p.vy);
        const topMissileSpeed = 22;

        if (currentSpeed < topMissileSpeed) {
          const accel = dt * 18;
          const heading = Math.atan2(p.vy, p.vx);
          p.vx += Math.cos(heading) * accel;
          p.vy += Math.sin(heading) * accel;
        }

        if (p.targetEnemyId) {
          const target = this.enemies.find((e) => e.id === p.targetEnemyId);
          if (target) {
            const desiredAngle = Math.atan2(target.y - p.y, target.x - p.x);
            const currentAngle = Math.atan2(p.vy, p.vx);
            let diff = desiredAngle - currentAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            const newAngle = currentAngle + diff * (p.homingStrength || 0.12);
            const spd = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(newAngle) * spd;
            p.vy = Math.sin(newAngle) * spd;
          } else {
            // Re-acquire nearest hostile
            const nearest = this.findNearestEnemy(p.x, p.y, 500);
            if (nearest) p.targetEnemyId = nearest.id;
          }
        }

        // Dense missile rocket smoke plume
        if (Math.random() > 0.2) {
          const heading = Math.atan2(p.vy, p.vx);
          this.particles.push({
            x: p.x - Math.cos(heading) * 7,
            y: p.y - Math.sin(heading) * 7,
            vx: -Math.cos(heading) * (1.5 + Math.random() * 2) + (Math.random() - 0.5) * 1.5,
            vy: -Math.sin(heading) * (1.5 + Math.random() * 2) + (Math.random() - 0.5) * 1.5,
            size: Math.random() * 2.6 + 1.4,
            color: Math.random() > 0.35 ? '#F59E0B' : '#EC4899',
            alpha: 0.75,
            life: 0.16,
            maxLife: 0.16,
            decay: 4.5,
            shape: 'CIRCLE',
          });
        }
      }

      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;

      // Update trajectory trail
      if (!p.trail) p.trail = [];
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > (p.weaponType === 'RAILGUN' ? 10 : 5)) p.trail.pop();

      // Despawn projectiles when life expires or when far outside active camera view
      const distFromCam = Math.hypot(p.x - this.camera.x, p.y - this.camera.y);
      if (p.life <= 0 || distFromCam > 1800) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with player & escort drones (Enemy projectiles)
      if (p.isEnemy) {
        let projectileHit = false;

        // Check collision with player
        const distToPlayer = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (distToPlayer < 18 + p.radius && this.player.invulnerableTimer <= 0) {
          this.hitPlayer(p.damage);
          this.spawnSparks(p.x, p.y, p.color, 6);
          this.projectiles.splice(i, 1);
          continue;
        }

        // Check collision with autonomous escort drones
        for (let d = this.player.drones.length - 1; d >= 0; d--) {
          const drone = this.player.drones[d];
          const distToDrone = Math.hypot(p.x - drone.x, p.y - drone.y);
          if (distToDrone < 12 + p.radius) {
            this.hitDrone(drone, p.damage);
            this.spawnSparks(p.x, p.y, p.color, 6);
            this.projectiles.splice(i, 1);
            projectileHit = true;
            break;
          }
        }

        if (projectileHit) continue;
      } else {
        // Check collision with enemies (Player & Drone projectiles)
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
          if (dist < enemy.radius + p.radius) {
            const impactAngle = Math.atan2(p.vy, p.vx);

            // 0. Check Frontal Energy Bulwark Block on Shield-Bearers
            if (enemy.type === 'SHIELD_BEARER' && enemy.frontalShieldActive) {
              const hitAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
              let angleDiff = Math.abs(hitAngle - enemy.angle);
              while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

              const shieldHalfArc = (enemy.frontalShieldArc || 2.4) / 2;
              if (angleDiff <= shieldHalfArc) {
                // Projectile hits the frontal energy bulwark
                enemy.frontalShieldHp = (enemy.frontalShieldHp || 120) - p.damage;
                enemy.frontalShieldFlash = 0.22;
                enemy.shieldFlashTimer = 0.2;

                if (enemy.frontalShieldHp <= 0) {
                  // Catastrophic Bulwark Overload / Shield Shatter
                  this.shatterEnemyBulwarkShield(enemy, hitAngle);
                  this.damageEnemy(enemy, p.damage * 0.5, p.color);
                } else if (p.weaponType === 'RAILGUN') {
                  // Railgun sabots overcharge and pierce through with 40% damage
                  this.addFloatingText(p.x, p.y - 12, 'SHIELD PIERCED', '#10B981');
                  this.damageEnemy(enemy, p.damage * 0.4, '#10B981');
                  this.spawnKineticHitSpatter(p.x, p.y, hitAngle, '#10B981', 8);
                } else {
                  // Standard munitions are deflected
                  this.addFloatingText(p.x, p.y - 12, 'BLOCKED', '#38BDF8');
                  this.spawnSparks(p.x, p.y, '#38BDF8', 7);
                  this.spawnKineticHitSpatter(p.x, p.y, hitAngle, '#38BDF8', 6);
                  this.shockwaves.push({
                    x: p.x,
                    y: p.y,
                    radius: 3,
                    maxRadius: 18,
                    color: '#38BDF8',
                    alpha: 0.85,
                    life: 0.12,
                    maxLife: 0.12,
                  });
                  audioManager.playPositionalHit(p.x, p.y, true, this.player.x, this.player.y);
                  this.triggerScreenShake(0.6);

                  p.piercing--;
                  if (p.piercing <= 0) {
                    this.projectiles.splice(i, 1);
                    break;
                  }
                  continue;
                }
              } else {
                // Outflanked! Projectile strikes vulnerable rear thermal radiator
                p.damage *= 1.75;
                this.addFloatingText(enemy.x + (Math.random() - 0.5) * 16, enemy.y - 16, 'CRITICAL HIT!', '#F97316');
                enemy.frontalShieldHp = (enemy.frontalShieldHp || 120) - p.damage * 0.65;
                if (enemy.frontalShieldHp <= 0 && enemy.frontalShieldActive) {
                  this.shatterEnemyBulwarkShield(enemy, hitAngle);
                }
              }
            }

            // 1. Kinetic pushback impulse (armor stagger physics)
            const massFactor = enemy.type === 'TITAN_BOSS' ? 0.08 : enemy.type === 'BOMBER' ? 0.35 : 0.85;
            const pushMagnitude =
              (p.weaponType === 'RAILGUN' ? 7.5 : p.weaponType === 'SPREAD' ? 4.8 : 2.8) * massFactor;
            enemy.vx += Math.cos(impactAngle) * pushMagnitude;
            enemy.vy += Math.sin(impactAngle) * pushMagnitude;

            // 2. Damage enemy with hit state
            this.damageEnemy(enemy, p.damage, p.color);

            // 3. Directional molten armor spatter
            this.spawnKineticHitSpatter(
              p.x,
              p.y,
              impactAngle,
              p.color,
              p.weaponType === 'RAILGUN' ? 12 : p.weaponType === 'SPREAD' ? 7 : 5
            );

            // 4. Micro armor penetration shockwave ring
            this.shockwaves.push({
              x: p.x,
              y: p.y,
              radius: 2,
              maxRadius: p.weaponType === 'RAILGUN' ? 26 : 14,
              color: '#FFFFFF',
              alpha: 0.9,
              life: 0.09,
              maxLife: 0.09,
            });

            // 5. Tactile screen micro-shake
            this.triggerScreenShake(p.weaponType === 'RAILGUN' ? 3.0 : 0.9);

            // 6. Kinetic armor impact sound
            audioManager.playKineticImpact(p.x, p.y, p.weaponType === 'RAILGUN', this.player.x, this.player.y);

            // Explosive area-of-effect for seeking missiles & guided micro-torpedoes
            if (p.isMissile) {
              const blastColor = p.color || '#EC4899';
              this.shockwaves.push({
                x: p.x,
                y: p.y,
                radius: 10,
                maxRadius: p.weaponType === 'BLASTER' ? 55 : 75,
                color: blastColor,
                alpha: 0.9,
                life: 0.25,
                maxLife: 0.25,
              });
              this.triggerScreenShake(p.weaponType === 'BLASTER' ? 2.5 : 4.0);

              // Damage surrounding hostiles in blast radius
              const blastRadius = p.weaponType === 'BLASTER' ? 60 : 80;
              for (const splash of this.enemies) {
                if (splash.id !== enemy.id && Math.hypot(splash.x - p.x, splash.y - p.y) < blastRadius) {
                  this.damageEnemy(splash, p.damage * 0.65, blastColor);
                  this.spawnSparks(splash.x, splash.y, blastColor, 5);
                }
              }
            }

            p.piercing--;
            if (p.piercing <= 0) {
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }
    }
  }

  public damageEnemy(enemy: Enemy, damage: number, hitColor: string = '#FFFFFF', impulseX: number = 0, impulseY: number = 0) {
    let effectiveDmg = damage;

    // Active Shield Absorption
    if (enemy.shield && enemy.shield > 0) {
      enemy.shieldFlashTimer = 0.15;
      if (enemy.shield >= effectiveDmg) {
        enemy.shield -= effectiveDmg;
        this.addFloatingText(
          enemy.x + (Math.random() - 0.5) * 16,
          enemy.y - 14,
          `DEFLECT ${Math.round(effectiveDmg)}`,
          '#38BDF8'
        );
        this.spawnSparks(enemy.x, enemy.y, '#38BDF8', 4);
        effectiveDmg = 0;
      } else {
        effectiveDmg -= enemy.shield;
        this.addFloatingText(enemy.x, enemy.y - 18, 'SHIELD BROKEN', '#38BDF8');
        this.shockwaves.push({
          x: enemy.x,
          y: enemy.y,
          radius: enemy.radius,
          maxRadius: enemy.radius + 20,
          color: '#38BDF8',
          alpha: 0.8,
          life: 0.15,
          maxLife: 0.15,
        });
        enemy.shield = 0;
      }
    }

    if (effectiveDmg > 0) {
      enemy.hp -= effectiveDmg;
      enemy.hitFlashTimer = 0.08;

      this.addFloatingText(
        enemy.x + (Math.random() - 0.5) * 16,
        enemy.y - 12,
        Math.round(effectiveDmg).toString(),
        hitColor
      );
    }
    
    // Physical impulse momentum transfer
    if (impulseX !== 0 || impulseY !== 0) {
      const massFactor = enemy.type === 'TITAN_BOSS' ? 0.05 : enemy.type === 'BOMBER' ? 0.25 : 0.65;
      enemy.vx += impulseX * massFactor;
      enemy.vy += impulseY * massFactor;
    }

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private shatterEnemyBulwarkShield(enemy: Enemy, impactAngle?: number) {
    if (enemy.frontalShieldActive === false) return;
    enemy.frontalShieldActive = false;
    enemy.frontalShieldHp = 0;
    enemy.hitFlashTimer = 0.28;

    const angle = impactAngle !== undefined ? impactAngle : enemy.angle;

    // 1. Audio Cue - Resonant crystalline shield shatter
    audioManager.playShieldShatter(enemy.x, enemy.y, this.player.x, this.player.y);

    // 2. Heavy tactile screen shake
    this.triggerScreenShake(4.5);

    // 3. Floating Combat Text Banner
    this.addFloatingText(enemy.x, enemy.y - 20, 'SHIELD SHATTERED!', '#38BDF8');

    // 4. Expanding double hardlight shockwaves
    this.shockwaves.push({
      x: enemy.x,
      y: enemy.y,
      radius: enemy.radius + 6,
      maxRadius: 70,
      color: '#38BDF8',
      alpha: 1.0,
      life: 0.28,
      maxLife: 0.28,
    });
    this.shockwaves.push({
      x: enemy.x,
      y: enemy.y,
      radius: 4,
      maxRadius: 45,
      color: '#FFFFFF',
      alpha: 0.9,
      life: 0.18,
      maxLife: 0.18,
    });

    // 5. High-Luminance Flash Core
    this.particles.push({
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      size: 32,
      color: '#38BDF8',
      alpha: 1.0,
      life: 0.2,
      maxLife: 0.2,
      decay: 5.0,
      shape: 'FLASH',
    });

    // 6. Hardlight Shard Explosion Particles (Angular faceted glass crystals)
    const shardCount = 18;
    for (let s = 0; s < shardCount; s++) {
      const arcSpread = (Math.random() - 0.5) * (enemy.frontalShieldArc || 2.4);
      const shardAngle = angle + arcSpread;
      const speed = Math.random() * 11 + 6;
      const color = s % 3 === 0 ? '#FFFFFF' : s % 3 === 1 ? '#38BDF8' : '#06B6D4';

      this.particles.push({
        x: enemy.x + Math.cos(shardAngle) * (enemy.radius + 8),
        y: enemy.y + Math.sin(shardAngle) * (enemy.radius + 8),
        vx: Math.cos(shardAngle) * speed + enemy.vx * 0.3,
        vy: Math.sin(shardAngle) * speed + enemy.vy * 0.3,
        size: Math.random() * 4.5 + 2.5,
        color,
        alpha: 1.0,
        life: Math.random() * 0.45 + 0.3,
        maxLife: Math.random() * 0.45 + 0.3,
        decay: 1.8,
        shape: 'SHARD',
        drag: 0.92,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 25,
      });
    }

    // 7. Electric arc ionization sparks
    this.spawnSparks(enemy.x, enemy.y, '#38BDF8', 14);

    // 8. Stagger physical impulse
    const knockback = 5.0;
    enemy.vx += Math.cos(angle) * knockback;
    enemy.vy += Math.sin(angle) * knockback;
  }

  private killEnemy(enemy: Enemy) {
    if (enemy.type === 'SHIELD_BEARER' && enemy.frontalShieldActive !== false) {
      this.shatterEnemyBulwarkShield(enemy);
    }

    const idx = this.enemies.findIndex((e) => e.id === enemy.id);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

    // Sound and visual FX
    const isBoss = enemy.type === 'TITAN_BOSS';
    audioManager.playPositionalExplosion(enemy.x, enemy.y, isBoss, this.player.x, this.player.y);
    
    // Weighty screen shake scaled to target mass
    const shakePower = isBoss ? 24 : enemy.type === 'BOMBER' ? 12 : enemy.type === 'CHARGER' ? 8 : enemy.type === 'SNIPER' ? 9 : 4;
    this.triggerScreenShake(shakePower);

    // Radial Blast Impulse Physics: Blow nearby enemies and drops outward
    const blastRadius = isBoss ? 320 : enemy.radius * 6.5;
    const blastForce = isBoss ? 16 : 8;
    for (const other of this.enemies) {
      if (other.id === enemy.id) continue;
      const dx = other.x - enemy.x;
      const dy = other.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < blastRadius) {
        const factor = (1 - dist / blastRadius) * blastForce;
        const massFactor = other.type === 'TITAN_BOSS' ? 0.1 : other.type === 'BOMBER' ? 0.35 : 0.8;
        other.vx += (dx / dist) * factor * massFactor;
        other.vy += (dy / dist) * factor * massFactor;
      }
    }

    // Blast force on XP drops
    for (const drop of this.drops) {
      const dx = drop.x - enemy.x;
      const dy = drop.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < blastRadius * 0.8) {
        const factor = (1 - dist / (blastRadius * 0.8)) * blastForce * 1.2;
        drop.vx += (dx / dist) * factor;
        drop.vy += (dy / dist) * factor;
      }
    }

    // Shockwave
    this.shockwaves.push({
      x: enemy.x,
      y: enemy.y,
      radius: 10,
      maxRadius: isBoss ? 220 : enemy.radius * 3.2,
      color: enemy.color,
      alpha: 1.0,
      life: isBoss ? 0.55 : 0.32,
      maxLife: isBoss ? 0.55 : 0.32,
    });

    // High-luminance explosion core flash
    this.particles.push({
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      size: enemy.radius * (isBoss ? 3.5 : 2.0),
      color: '#FFFFFF',
      alpha: 1.0,
      life: 0.18,
      maxLife: 0.18,
      decay: 5.5,
      shape: 'FLASH',
    });

    // Particle debris & physics shrapnel
    this.spawnSparks(enemy.x, enemy.y, enemy.color, isBoss ? 55 : 18);
    
    // Spawn spinning hull debris pieces with smoke trails
    const debrisCount = isBoss ? 22 : 8;
    for (let i = 0; i < debrisCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 9 + 3;
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(ang) * spd + enemy.vx * 0.4,
        vy: Math.sin(ang) * spd + enemy.vy * 0.4,
        size: Math.random() * 5 + 2.5,
        color: enemy.color,
        alpha: 1.0,
        life: Math.random() * 0.7 + 0.4,
        maxLife: Math.random() * 0.7 + 0.4,
        decay: 1.4,
        shape: 'DEBRIS',
        drag: 0.93,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 16,
        hasTrail: true,
      });
    }

    // Thermal embers
    const emberCount = isBoss ? 28 : 10;
    for (let i = 0; i < emberCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 5 + 1.5;
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: Math.random() * 3 + 1,
        color: '#F59E0B',
        alpha: 1.0,
        life: Math.random() * 0.6 + 0.3,
        maxLife: Math.random() * 0.6 + 0.3,
        decay: 2.0,
        shape: 'EMBER',
        drag: 0.91,
      });
    }

    // Increment combo
    this.player.combo++;
    this.player.comboTimer = 2.5;

    // Spawn XP and tactical drops
    const xpDrops = isBoss ? 12 : Math.max(1, Math.floor(enemy.xpValue / 20));
    for (let i = 0; i < xpDrops; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 3 + 1;
      this.drops.push({
        id: `drop_xp_${Date.now()}_${Math.random()}`,
        type: 'XP',
        x: enemy.x + (Math.random() - 0.5) * 20,
        y: enemy.y + (Math.random() - 0.5) * 20,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        value: enemy.xpValue / xpDrops,
        radius: 6,
        life: 25,
        color: '#00F0FF',
      });
    }

    // Rare Repair drop
    if (Math.random() < 0.08 || isBoss) {
      this.drops.push({
        id: `drop_rep_${Date.now()}_${Math.random()}`,
        type: 'REPAIR',
        x: enemy.x,
        y: enemy.y,
        vx: 0,
        vy: 0,
        value: 25,
        radius: 9,
        life: 20,
        color: '#10B981',
      });
    }

    if (isBoss) {
      this.bossActive = false;
      this.bossDefeated = true;
      this.addFloatingText(enemy.x, enemy.y - 40, 'TITAN DESTROYED!', '#F59E0B');
    }
  }

  public hitPlayer(damage: number) {
    const p = this.player;
    if (p.invulnerableTimer > 0) return;

    p.shieldRegenTimer = 0; // Reset shield regen delay
    let remainingDmg = damage;

    if (p.shield > 0) {
      if (p.shield >= remainingDmg) {
        p.shield -= remainingDmg;
        remainingDmg = 0;
        audioManager.playPositionalHit(p.x, p.y, true, p.x, p.y);
      } else {
        remainingDmg -= p.shield;
        p.shield = 0;
        audioManager.playPositionalHit(p.x, p.y, true, p.x, p.y);
      }
    }

    if (remainingDmg > 0) {
      p.health -= remainingDmg;
      audioManager.playPositionalHit(p.x, p.y, false, p.x, p.y);
      this.triggerScreenShake(6);
    }

    p.invulnerableTimer = 0.35;
    this.addFloatingText(p.x, p.y - 20, `-${Math.round(damage)}`, '#EF4444');

    if (p.health <= 0) {
      p.health = 0;
      this.gameOver();
    }
  }

  private gameOver() {
    this.state = 'GAME_OVER';
    audioManager.playPositionalExplosion(this.player.x, this.player.y, true, this.player.x, this.player.y);
    this.saveHighScore();
    if (this.onStateChange) this.onStateChange('GAME_OVER');
  }

  private updateEnemies(dt: number) {
    const p = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
      }
      if (enemy.shieldFlashTimer && enemy.shieldFlashTimer > 0) {
        enemy.shieldFlashTimer -= dt;
      }
      if (enemy.frontalShieldFlash && enemy.frontalShieldFlash > 0) {
        enemy.frontalShieldFlash -= dt;
      }

      const distToPlayer = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      const angleToPlayer = Math.atan2(p.y - enemy.y, p.x - enemy.x);

      // --- Advanced Tactical AI: Projectile Threat Detection & Evasion Thrusters ---
      if (enemy.dodgeCooldown > 0) {
        enemy.dodgeCooldown -= dt;
      }

      if (enemy.dodgeTimer > 0) {
        enemy.dodgeTimer -= dt;
        // Apply active tactical dodge burn
        enemy.vx += enemy.evasionVector.x * dt * 45;
        enemy.vy += enemy.evasionVector.y * dt * 45;
      } else if (enemy.dodgeCooldown <= 0 && (enemy.type === 'SCOUT' || enemy.type === 'SWARMER' || enemy.type === 'BOMBER' || enemy.type === 'INTERCEPTOR')) {
        // Detect incoming player projectiles within proximity cone (180px)
        let incomingThreat: Projectile | null = null;
        for (let pj = 0; pj < this.projectiles.length; pj++) {
          const prj = this.projectiles[pj];
          if (prj.isEnemy) continue;
          const pDist = Math.hypot(prj.x - enemy.x, prj.y - enemy.y);
          if (pDist < 160) {
            // Check if projectile velocity is heading directly towards enemy
            const pAng = Math.atan2(prj.vy, prj.vx);
            const toEnemyAng = Math.atan2(enemy.y - prj.y, enemy.x - prj.x);
            let diffAng = Math.abs(pAng - toEnemyAng);
            while (diffAng > Math.PI) diffAng = Math.PI * 2 - diffAng;
            if (diffAng < 0.6) {
              incomingThreat = prj;
              break;
            }
          }
        }

        if (incomingThreat) {
          // Perform emergency lateral break burn
          const evadeDir = Math.random() > 0.5 ? 1 : -1;
          const threatAngle = Math.atan2(incomingThreat.vy, incomingThreat.vx);
          const lateralAngle = threatAngle + (Math.PI / 2) * evadeDir;
          enemy.evasionVector = {
            x: Math.cos(lateralAngle),
            y: Math.sin(lateralAngle),
          };
          enemy.dodgeTimer = 0.28;
          enemy.dodgeCooldown = enemy.type === 'INTERCEPTOR' ? 1.8 : enemy.type === 'SCOUT' ? 2.4 : 3.8;
          // Spawn thruster burst particles
          this.spawnSparks(enemy.x, enemy.y, '#38BDF8', 4);
        }
      }

      // Check if low HP retreat behavior should trigger
      if (enemy.hp < enemy.maxHp * 0.35 && (enemy.type === 'SCOUT' || enemy.type === 'BOMBER' || enemy.type === 'INTERCEPTOR')) {
        enemy.isRetreating = true;
      }

      // Tactical Lead Targeting (predict where player will be based on player velocity)
      const leadFactor = Math.min(1.2, distToPlayer / 450);
      const predictedPlayerX = p.x + p.vx * leadFactor * 12;
      const predictedPlayerY = p.y + p.vy * leadFactor * 12;
      const leadAngleToPlayer = Math.atan2(predictedPlayerY - enemy.y, predictedPlayerX - enemy.x);

      // AI Behaviors by Enemy Archetype
      if (enemy.type === 'INTERCEPTOR') {
        // High-g Flanking Interceptor: Actively out-maneuvers to get behind the player's engines
        if (enemy.flankSide === undefined) {
          enemy.flankSide = i % 2 === 0 ? 1 : -1;
        }

        const rearRadius = 220;
        const playerRearAngle = p.angle + Math.PI;
        const flankTargetAngle = playerRearAngle + enemy.flankSide * 0.45;
        const flankX = p.x + Math.cos(flankTargetAngle) * rearRadius;
        const flankY = p.y + Math.sin(flankTargetAngle) * rearRadius;

        const distToFlankPocket = Math.hypot(flankX - enemy.x, flankY - enemy.y);
        const angleToPocket = Math.atan2(flankY - enemy.y, flankX - enemy.x);

        // Accelerated burn towards player's blind rear quadrant with inertial drift
        const thrust = enemy.speed * (distToFlankPocket > 100 ? 0.24 : 0.14);
        enemy.vx += Math.cos(angleToPocket) * thrust;
        enemy.vy += Math.sin(angleToPocket) * thrust;
        enemy.vx *= 0.965;
        enemy.vy *= 0.965;

        // Turn nose towards player rear / predicted position with g-force limited turn rate
        let diff = leadAngleToPlayer - enemy.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        enemy.angle += diff * Math.min(1.0, dt * 4.8);

        // Firing: High-rate twin plasma needles when situated in player's rear arc
        enemy.fireTimer += dt;
        const playerToEnemyAngle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
        let playerRearDiff = Math.abs(playerToEnemyAngle - playerRearAngle);
        while (playerRearDiff > Math.PI) playerRearDiff = Math.PI * 2 - playerRearDiff;

        if (enemy.fireTimer >= enemy.fireInterval && distToPlayer < 550 && Math.abs(diff) < 0.45) {
          enemy.fireTimer = 0;
          this.fireEnemyProjectile(enemy.x, enemy.y, enemy.angle - 0.08, 12, 11, '#06B6D4', 3.8, 'ENEMY_SCOUT', enemy.vx, enemy.vy);
          this.fireEnemyProjectile(enemy.x, enemy.y, enemy.angle + 0.08, 12, 11, '#06B6D4', 3.8, 'ENEMY_SCOUT', enemy.vx, enemy.vy);
          audioManager.playPositionalLaser('PRIMARY', enemy.x, enemy.y, p.x, p.y);
        }
      } else if (enemy.type === 'SHIELD_BEARER') {
        // Heavy Phalanx Shield-Bearer: Maintains frontal energy bulwark locked onto player
        const desiredDist = 240;
        let moveAngle = angleToPlayer;

        if (distToPlayer < desiredDist - 30) {
          moveAngle = angleToPlayer + Math.PI; // Back up slightly if rammed
        } else if (distToPlayer > desiredDist + 60) {
          moveAngle = angleToPlayer; // Advance to screen for allies
        } else {
          // Slow steady strafe while holding shield wall
          moveAngle = angleToPlayer + (Math.PI / 2) * 0.3 * (i % 2 === 0 ? 1 : -1);
        }

        enemy.vx += Math.cos(moveAngle) * 0.12;
        enemy.vy += Math.sin(moveAngle) * 0.12;
        enemy.vx *= 0.95;
        enemy.vy *= 0.95;

        // Frontal shield tracking: Firmly locks angle directly facing player
        let diff = angleToPlayer - enemy.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        enemy.angle += diff * Math.min(1.0, dt * 3.4);

        // Heavy forward concussive cannon fire through shield port
        enemy.fireTimer += dt;
        if (enemy.fireTimer >= enemy.fireInterval && distToPlayer < 650 && Math.abs(diff) < 0.35) {
          enemy.fireTimer = 0;
          this.fireEnemyProjectile(enemy.x, enemy.y, enemy.angle, 9, 20, '#3B82F6', 5.0, 'ENEMY_SCOUT', enemy.vx, enemy.vy);
          audioManager.playPositionalLaser('PRIMARY', enemy.x, enemy.y, p.x, p.y);
        }
      } else if (enemy.type === 'SWARMER') {
        // High-agility kinetic interceptor: Flanks player rather than dead-on rush
        const flankOffset = Math.sin(Date.now() * 0.003 + i) * 0.65;
        const targetAng = angleToPlayer + flankOffset;
        
        // Turn-rate limited rotation
        let diff = targetAng - enemy.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        enemy.angle += diff * Math.min(1.0, dt * 4.5);

        // Forward main thruster acceleration with vacuum momentum
        const thrust = enemy.speed * 0.20;
        enemy.vx += Math.cos(enemy.angle) * thrust;
        enemy.vy += Math.sin(enemy.angle) * thrust;
        enemy.vx *= 0.965;
        enemy.vy *= 0.965;
      } else if (enemy.type === 'SCOUT') {
        // Advanced Dogfighter: Stalker, tactical retreat when wounded, predictive burst fire
        enemy.aiTimer += dt;
        const desiredDist = enemy.isRetreating ? 500 : 320;

        let targetMoveAngle = angleToPlayer;
        if (enemy.isRetreating) {
          // Break engagement and gain distance
          targetMoveAngle = angleToPlayer + Math.PI;
        } else if (distToPlayer > desiredDist + 40) {
          targetMoveAngle = angleToPlayer + Math.sin(enemy.aiTimer * 1.5) * 0.4;
        } else if (distToPlayer < desiredDist - 40) {
          targetMoveAngle = angleToPlayer + Math.PI + Math.sin(enemy.aiTimer * 1.5) * 0.5;
        } else {
          // Dynamic tactical strafe orbit
          targetMoveAngle = angleToPlayer + (Math.PI / 2) * (i % 2 === 0 ? 1 : -1);
        }

        // Inertial flight acceleration
        enemy.vx += Math.cos(targetMoveAngle) * 0.18;
        enemy.vy += Math.sin(targetMoveAngle) * 0.18;
        enemy.vx *= 0.965;
        enemy.vy *= 0.965;

        // Smooth nose turn towards predicted player intercept
        let targetFaceAngle = leadAngleToPlayer;
        let diff = targetFaceAngle - enemy.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        enemy.angle += diff * Math.min(1.0, dt * 4.2);

        // Scout weapon firing with predictive lead
        enemy.fireTimer += dt;
        if (enemy.fireTimer >= enemy.fireInterval && Math.abs(diff) < 0.45 && distToPlayer < 650) {
          enemy.fireTimer = 0;
          this.fireEnemyProjectile(enemy.x, enemy.y, enemy.angle, 10, 14, '#FB923C', 4.0, 'ENEMY_SCOUT', enemy.vx, enemy.vy);
          audioManager.playPositionalLaser('PRIMARY', enemy.x, enemy.y, p.x, p.y);
        }
      } else if (enemy.type === 'CHARGER') {
        // Armored Kinetic Rammer: Stalks, aligns, locks trajectory, fires booster burn
        if (enemy.isCharging) {
          // In active rocket charge
          enemy.aiTimer -= dt;
          if (enemy.aiTimer <= 0) {
            enemy.isCharging = false;
            enemy.chargeCooldown = 3.2;
          }
        } else if (enemy.telegraphTimer > 0) {
          // Pre-ignition lock: Aligns rigidly onto lead vector before booster kicks
          enemy.telegraphTimer -= dt;
          enemy.vx *= 0.88;
          enemy.vy *= 0.88;
          
          let diff = leadAngleToPlayer - enemy.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          enemy.angle += diff * 0.12;

          if (enemy.telegraphTimer <= 0) {
            enemy.isCharging = true;
            enemy.aiTimer = 1.0;
            enemy.vx = Math.cos(enemy.angle) * 11.5;
            enemy.vy = Math.sin(enemy.angle) * 11.5;
            this.triggerScreenShake(3);
            audioManager.playPositionalLaser('SPREAD', enemy.x, enemy.y, p.x, p.y);
          }
        } else {
          // Stalk player and prepare charge angle
          enemy.chargeCooldown -= dt;
          
          let diff = angleToPlayer - enemy.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          enemy.angle += diff * Math.min(1.0, dt * 2.8);

          enemy.vx += Math.cos(enemy.angle) * 0.16;
          enemy.vy += Math.sin(enemy.angle) * 0.16;
          enemy.vx *= 0.96;
          enemy.vy *= 0.96;

          if (enemy.chargeCooldown <= 0 && distToPlayer < 480 && Math.abs(diff) < 0.5) {
            enemy.telegraphTimer = 0.85;
          }
        }
      } else if (enemy.type === 'BOMBER') {
        // Tactical Missile Cruiser: Maintains artillery range, retreats if rushed, fires cluster spread
        const desiredDist = enemy.isRetreating ? 540 : 440;
        let targetMoveAngle = angleToPlayer;

        if (distToPlayer < desiredDist) {
          // Backpedal and maintain standoff range
          targetMoveAngle = angleToPlayer + Math.PI;
        } else {
          // Slowly adjust standoff firing arc
          targetMoveAngle = angleToPlayer + (Math.PI / 2) * 0.4;
        }

        enemy.vx += Math.cos(targetMoveAngle) * 0.12;
        enemy.vy += Math.sin(targetMoveAngle) * 0.12;
        enemy.vx *= 0.96;
        enemy.vy *= 0.96;

        // Smooth hull rotation towards lead target with heavy cruiser moment of inertia
        let diff = leadAngleToPlayer - enemy.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        enemy.angle += diff * Math.min(1.0, dt * 2.2);

        enemy.fireTimer += dt;
        if (enemy.fireTimer >= enemy.fireInterval && distToPlayer < 800) {
          enemy.fireTimer = 0;
          // Dual plasma cluster shot
          this.fireEnemyProjectile(enemy.x, enemy.y, enemy.angle - 0.12, 7.0, 22, '#A855F7', 5.5, 'ENEMY_BOMBER', enemy.vx, enemy.vy);
          this.fireEnemyProjectile(enemy.x, enemy.y, enemy.angle + 0.12, 7.0, 22, '#A855F7', 5.5, 'ENEMY_BOMBER', enemy.vx, enemy.vy);
          audioManager.playPositionalLaser('SPREAD', enemy.x, enemy.y, p.x, p.y);
        }
      } else if (enemy.type === 'TITAN_BOSS') {
        // Massive Dreadnought Flagship with heavy capital ship inertia
        enemy.angle += 0.008;
        enemy.vx += Math.cos(angleToPlayer) * 0.06;
        enemy.vy += Math.sin(angleToPlayer) * 0.06;
        enemy.vx *= 0.975;
        enemy.vy *= 0.975;

        enemy.fireTimer += dt;
        if (enemy.fireTimer >= enemy.fireInterval) {
          enemy.fireTimer = 0;
          // 8-directional radial salvo plus targeted heavy rail pulse
          for (let b = 0; b < 8; b++) {
            const salvoAngle = enemy.angle + (b / 8) * Math.PI * 2;
            this.fireEnemyProjectile(enemy.x, enemy.y, salvoAngle, 7.5, 18, '#F59E0B', 4.5, 'ENEMY_BOSS', enemy.vx, enemy.vy);
          }
          // Direct aimed slug towards player
          this.fireEnemyProjectile(enemy.x, enemy.y, angleToPlayer, 10, 28, '#EF4444', 6.0, 'ENEMY_BOSS', enemy.vx, enemy.vy);
          audioManager.playPositionalLaser('RAILGUN', enemy.x, enemy.y, p.x, p.y);
        }
      }

      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      // 3D Flight Banking & Hover Altitude
      let eDiff = enemy.targetAngle - enemy.angle;
      while (eDiff < -Math.PI) eDiff += Math.PI * 2;
      while (eDiff > Math.PI) eDiff -= Math.PI * 2;
      enemy.bankAngle = Math.max(-0.55, Math.min(0.55, eDiff * 1.6));
      const baseAlt = enemy.type === 'TITAN_BOSS' ? 26 : enemy.type === 'BOMBER' ? -15 : enemy.type === 'SCOUT' ? 12 : 0;
      const enemyTargetZ = baseAlt + Math.sin(Date.now() * 0.0025 + distToPlayer * 0.01) * 6;
      enemy.z = (enemy.z || 0) + (enemyTargetZ - (enemy.z || 0)) * Math.min(1.0, dt * 4);

      // Open continuous space: Reposition distant stragglers towards the flagship
      if (distToPlayer > 2200 && enemy.type !== 'TITAN_BOSS') {
        const wrapAng = Math.random() * Math.PI * 2;
        enemy.x = p.x + Math.cos(wrapAng) * 1100;
        enemy.y = p.y + Math.sin(wrapAng) * 1100;
      }

      // Melee ram damage to player
      if (distToPlayer < enemy.radius + 18 && p.invulnerableTimer <= 0) {
        const ramDmg = enemy.type === 'CHARGER' ? 35 : enemy.type === 'TITAN_BOSS' ? 50 : 15;
        this.hitPlayer(ramDmg);
        this.damageEnemy(enemy, 30, '#FFFFFF');
      }

      // Melee ram damage to escort drones
      for (let d = this.player.drones.length - 1; d >= 0; d--) {
        const drone = this.player.drones[d];
        const distToDrone = Math.hypot(drone.x - enemy.x, drone.y - enemy.y);
        if (distToDrone < enemy.radius + 12) {
          const ramDmg = enemy.type === 'CHARGER' ? 30 : enemy.type === 'TITAN_BOSS' ? 45 : 15;
          this.hitDrone(drone, ramDmg);
          this.damageEnemy(enemy, 20, '#FFFFFF');
          // Elastic bounce impulse
          const pushAngle = Math.atan2(drone.y - enemy.y, drone.x - enemy.x);
          drone.vx += Math.cos(pushAngle) * 5;
          drone.vy += Math.sin(pushAngle) * 5;
          enemy.vx -= Math.cos(pushAngle) * 2.5;
          enemy.vy -= Math.sin(pushAngle) * 2.5;
        }
      }
    }
  }

  private resolvePhysicalCollisions() {
    const p = this.player;
    const playerRadius = 18;
    const droneRadius = 12;

    // 1. Player <-> Enemy Collisions (Hard geometric separation + rebound impulse)
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const dx = enemy.x - p.x;
      const dy = enemy.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minDist = playerRadius + enemy.radius;

      if (dist < minDist && dist > 0.0001) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        const pMass = 1.0;
        const eMass = enemy.type === 'TITAN_BOSS' ? 8.0 : enemy.type === 'CHARGER' ? 2.5 : enemy.type === 'BOMBER' ? 2.0 : 0.8;
        const totalMass = pMass + eMass;

        p.x -= nx * overlap * (eMass / totalMass);
        p.y -= ny * overlap * (eMass / totalMass);
        enemy.x += nx * overlap * (pMass / totalMass);
        enemy.y += ny * overlap * (pMass / totalMass);

        // Elastic momentum rebound
        const relVx = enemy.vx - p.vx;
        const relVy = enemy.vy - p.vy;
        const velAlongNormal = relVx * nx + relVy * ny;

        if (velAlongNormal < 0) {
          const restitution = 0.55;
          const impulseScalar = (-(1 + restitution) * velAlongNormal) / (1 / pMass + 1 / eMass);
          p.vx -= (nx * impulseScalar) / pMass;
          p.vy -= (ny * impulseScalar) / pMass;
          enemy.vx += (nx * impulseScalar) / eMass;
          enemy.vy += (ny * impulseScalar) / eMass;
        }
      }
    }

    // 2. Enemy <-> Enemy Collisions (Prevent clustering / overlapping)
    for (let i = 0; i < this.enemies.length; i++) {
      const e1 = this.enemies[i];
      for (let j = i + 1; j < this.enemies.length; j++) {
        const e2 = this.enemies[j];
        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = e1.radius + e2.radius;

        if (dist < minDist && dist > 0.0001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          const m1 = e1.type === 'TITAN_BOSS' ? 8.0 : 1.0;
          const m2 = e2.type === 'TITAN_BOSS' ? 8.0 : 1.0;
          const totalM = m1 + m2;

          e1.x -= nx * overlap * (m2 / totalM);
          e1.y -= ny * overlap * (m2 / totalM);
          e2.x += nx * overlap * (m1 / totalM);
          e2.y += ny * overlap * (m1 / totalM);

          const bounce = 0.7;
          e1.vx -= nx * bounce;
          e1.vy -= ny * bounce;
          e2.vx += nx * bounce;
          e2.vy += ny * bounce;
        }
      }
    }

    // 3. Player <-> Drone Collisions (Prevent drones passing through player hull)
    for (let i = 0; i < p.drones.length; i++) {
      const drone = p.drones[i];
      const dx = drone.x - p.x;
      const dy = drone.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minDist = playerRadius + droneRadius + 4;

      if (dist < minDist && dist > 0.0001) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        drone.x += nx * overlap;
        drone.y += ny * overlap;

        // Dampen converging velocity along contact normal to eliminate bouncing
        const relVn = (drone.vx - p.vx) * nx + (drone.vy - p.vy) * ny;
        if (relVn < 0) {
          drone.vx -= nx * relVn;
          drone.vy -= ny * relVn;
        }
      }
    }

    // 4. Drone <-> Drone Collisions (Prevent wingmen clipping through each other)
    for (let i = 0; i < p.drones.length; i++) {
      const d1 = p.drones[i];
      for (let j = i + 1; j < p.drones.length; j++) {
        const d2 = p.drones[j];
        const dx = d2.x - d1.x;
        const dy = d2.y - d1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = droneRadius * 2 + 6;

        if (dist < minDist && dist > 0.0001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          d1.x -= nx * overlap * 0.5;
          d1.y -= ny * overlap * 0.5;
          d2.x += nx * overlap * 0.5;
          d2.y += ny * overlap * 0.5;

          // Dampen converging relative velocity along contact normal
          const relVn = (d2.vx - d1.vx) * nx + (d2.vy - d1.vy) * ny;
          if (relVn < 0) {
            d1.vx += nx * relVn * 0.5;
            d1.vy += ny * relVn * 0.5;
            d2.vx -= nx * relVn * 0.5;
            d2.vy -= ny * relVn * 0.5;
          }
        }
      }
    }

    // 5. Drone <-> Enemy Collisions (Prevent enemies and drones clipping through each other)
    for (let i = 0; i < p.drones.length; i++) {
      const drone = p.drones[i];
      for (let j = 0; j < this.enemies.length; j++) {
        const enemy = this.enemies[j];
        const dx = drone.x - enemy.x;
        const dy = drone.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const minDist = droneRadius + enemy.radius;

        if (dist < minDist && dist > 0.0001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          drone.x += nx * overlap * 0.75;
          drone.y += ny * overlap * 0.75;
          enemy.x -= nx * overlap * 0.25;
          enemy.y -= ny * overlap * 0.25;
        }
      }
    }
  }

  private fireEnemyProjectile(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    color: string,
    radius: number = 4.5,
    weaponType: 'ENEMY_SCOUT' | 'ENEMY_BOMBER' | 'ENEMY_BOSS' = 'ENEMY_SCOUT',
    platformVx: number = 0,
    platformVy: number = 0
  ) {
    this.projectiles.push({
      id: `ep_${Date.now()}_${Math.random()}`,
      x,
      y,
      vx: platformVx + Math.cos(angle) * speed,
      vy: platformVy + Math.sin(angle) * speed,
      radius,
      damage,
      color,
      weaponType,
      isEnemy: true,
      piercing: 1,
      life: 3.5,
      maxLife: 3.5,
      trail: [{ x, y }],
    });
  }

  private updateWaveSystem(dt: number) {
    this.waveTimer += dt;
    this.spawnTimer += dt;

    // Boss spawn check at wave 5, 10, etc.
    if (this.wave % 5 === 0 && !this.bossActive && !this.bossDefeated) {
      this.spawnBoss();
      return;
    }

    // Regular wave enemy spawner: Focused tactical encounter limit (max 10 high-quality combatants)
    const maxEnemiesOnScreen = Math.min(10, 5 + this.wave);
    const spawnInterval = Math.max(1.2, 3.2 - this.wave * 0.18);
    if (this.spawnTimer >= spawnInterval && this.enemies.length < maxEnemiesOnScreen) {
      this.spawnTimer = 0;
      this.spawnRandomEnemy();
    }

    // Advance wave
    if (this.waveTimer >= this.waveDuration) {
      this.waveTimer = 0;
      this.wave++;
      this.bossDefeated = false;
      this.addFloatingText(
        this.camera.x,
        this.camera.y - 100,
        `WAVE ${this.wave} INCOMING`,
        '#00F0FF'
      );
      audioManager.playPickup();
    }
  }

  private spawnBoss() {
    this.bossActive = true;
    audioManager.playBossAlert();
    this.triggerScreenShake(8);

    const bossHp = 2200 + this.wave * 550;
    const boss: Enemy = {
      id: `boss_titan_${Date.now()}`,
      type: 'TITAN_BOSS',
      x: this.camera.x,
      y: this.camera.y - CANVAS_HEIGHT * 0.55,
      vx: 0,
      vy: 0.8,
      angle: Math.PI / 2,
      targetAngle: Math.PI / 2,
      hp: bossHp,
      maxHp: bossHp,
      shield: 450 + this.wave * 120,
      maxShield: 450 + this.wave * 120,
      radius: 58,
      speed: 1.1,
      scoreValue: 7500,
      xpValue: 500,
      color: '#EF4444',
      fireTimer: 0,
      fireInterval: 1.2,
      aiTimer: 0,
      chargeCooldown: 0,
      isCharging: false,
      telegraphTimer: 0,
      hitFlashTimer: 0,
      dodgeCooldown: 4.0,
      dodgeTimer: 0,
      isRetreating: false,
      evasionVector: { x: 0, y: 0 },
      shieldFlashTimer: 0,
    };
    this.enemies.push(boss);
    this.addFloatingText(this.camera.x, this.camera.y - 80, 'WARNING: TITAN FLAGSHIP DETECTED', '#EF4444');
  }

  private spawnRandomEnemy() {
    // Spawn offscreen perimeter relative to dynamic camera view
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = Math.hypot(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.55 + 100;
    const x = this.camera.x + Math.cos(spawnAngle) * spawnDist;
    const y = this.camera.y + Math.sin(spawnAngle) * spawnDist;

    const r = Math.random();
    let type: EnemyType = 'SCOUT';
    let hp = 110 + this.wave * 28;
    let shield = 0;
    let radius = 18;
    let color = '#FB923C';
    let speed = 2.8;
    let score = 150;
    let xp = 45;
    let fireInterval = 1.6;
    let frontalShieldActive = false;
    let frontalShieldArc = 2.4;
    let frontalShieldHp = 0;
    let frontalShieldMaxHp = 0;

    if (r < 0.22) {
      // Tactical Interceptor Scout (agile dogfighter with side-shields)
      type = 'SCOUT';
      hp = 95 + this.wave * 24;
      shield = 35 + this.wave * 10;
      radius = 17;
      color = '#FB923C';
      speed = 2.8;
      score = 160;
      xp = 45;
      fireInterval = 1.4;
    } else if (r < 0.44) {
      // High-g Flanking Interceptor (pursues player rear quadrant, fires dual needles)
      type = 'INTERCEPTOR';
      hp = 85 + this.wave * 20;
      shield = 30 + this.wave * 8;
      radius = 16;
      color = '#06B6D4';
      speed = 3.6;
      score = 190;
      xp = 55;
      fireInterval = 1.1;
    } else if (r < 0.62) {
      // Vanguard Skirmisher (high speed kinetic pursuer, dodges fire)
      type = 'SWARMER';
      hp = 75 + this.wave * 18;
      shield = 20;
      radius = 15;
      color = '#F43F5E';
      speed = 3.2;
      score = 120;
      xp = 35;
      fireInterval = 0;
    } else if (r < 0.78) {
      // Phalanx Shield-Bearer (impervious directional frontal energy bulwark)
      type = 'SHIELD_BEARER';
      hp = 180 + this.wave * 38;
      shield = 0; // Shield is directional frontal barrier
      radius = 22;
      color = '#3B82F6';
      speed = 1.4;
      score = 260;
      xp = 75;
      fireInterval = 1.8;
      frontalShieldActive = true;
      frontalShieldArc = 2.4;
      frontalShieldHp = 120;
      frontalShieldMaxHp = 120;
    } else if (r < 0.90) {
      // Heavy Armored Charger (armored prow, telegraphed ramming vector)
      type = 'CHARGER';
      hp = 210 + this.wave * 45;
      shield = 60 + this.wave * 15;
      radius = 24;
      color = '#E11D48';
      speed = 2.2;
      score = 280;
      xp = 80;
      fireInterval = 0;
    } else {
      // Artillery Cruiser Bomber (long-range cluster fire, retreats when low)
      type = 'BOMBER';
      hp = 260 + this.wave * 55;
      shield = 90 + this.wave * 20;
      radius = 26;
      color = '#A855F7';
      speed = 1.6;
      score = 420;
      xp = 120;
      fireInterval = 2.2;
    }

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: 0,
      targetAngle: 0,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      radius,
      speed,
      scoreValue: score,
      xpValue: xp,
      color,
      fireTimer: 0,
      fireInterval,
      aiTimer: 0,
      chargeCooldown: 2.2,
      isCharging: false,
      telegraphTimer: 0,
      hitFlashTimer: 0,
      dodgeCooldown: Math.random() * 2 + 1.5,
      dodgeTimer: 0,
      isRetreating: false,
      evasionVector: { x: 0, y: 0 },
      shieldFlashTimer: 0,
      frontalShieldActive,
      frontalShieldArc,
      frontalShieldHp,
      frontalShieldMaxHp,
      frontalShieldFlash: 0,
      flankSide: Math.random() > 0.5 ? 1 : -1,
    };

    this.enemies.push(enemy);
  }

  private updateDrops(dt: number) {
    const p = this.player;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.life -= dt;
      if (drop.life <= 0) {
        this.drops.splice(i, 1);
        continue;
      }

      // Drag
      drop.vx *= 0.96;
      drop.vy *= 0.96;
      drop.x += drop.vx;
      drop.y += drop.vy;

      // Despawn drops when far outside active camera sector
      const distFromCam = Math.hypot(drop.x - this.camera.x, drop.y - this.camera.y);
      if (distFromCam > 2400) {
        this.drops.splice(i, 1);
        continue;
      }

      // Tractor beam magnet pull
      const dist = Math.hypot(p.x - drop.x, p.y - drop.y);
      if (dist < p.pickupRadius) {
        const pull = ((p.pickupRadius - dist) / p.pickupRadius) * 14 + 4;
        const ang = Math.atan2(p.y - drop.y, p.x - drop.x);
        drop.x += Math.cos(ang) * pull;
        drop.y += Math.sin(ang) * pull;
      }

      // Collect
      if (dist < 24 + drop.radius) {
        if (drop.type === 'XP') {
          this.addXp(drop.value);
          audioManager.playPickup();
        } else if (drop.type === 'REPAIR') {
          p.health = Math.min(p.maxHealth, p.health + drop.value);
          this.addFloatingText(p.x, p.y - 30, `+${drop.value} HP`, '#10B981');
          audioManager.playPickup();
        }
        this.spawnSparks(drop.x, drop.y, drop.color, 4);
        this.drops.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx;
      part.y += part.vy;
      
      const d = part.drag ?? 0.96;
      part.vx *= d;
      part.vy *= d;

      if (part.rotSpeed) {
        part.rotation = (part.rotation || 0) + part.rotSpeed * dt;
      }

      // Emit smoke trails from moving shrapnel chunks
      if (part.hasTrail && Math.random() < 0.35 && this.particles.length < 300) {
        this.particles.push({
          x: part.x,
          y: part.y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          size: Math.random() * 3 + 2,
          color: '#64748B',
          alpha: 0.5,
          life: 0.3,
          maxLife: 0.3,
          decay: 2.5,
          shape: 'SMOKE',
          drag: 0.9,
        });
      }

      part.life -= dt;
      part.alpha = Math.max(0, part.life / part.maxLife);
      if (part.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateShockwaves(dt: number) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      sw.alpha = Math.max(0, sw.life / sw.maxLife);
      sw.radius += (sw.maxRadius - sw.radius) * 0.22;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private findNearestEnemy(x: number, y: number, maxRadius: number = 600): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = maxRadius;
    for (const enemy of this.enemies) {
      const d = Math.hypot(enemy.x - x, enemy.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    }
    return nearest;
  }
}
