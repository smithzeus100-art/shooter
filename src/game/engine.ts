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
  public mouseX: number = CANVAS_WIDTH / 2;
  public mouseY: number = CANVAS_HEIGHT / 2;
  public isMouseDown: boolean = false;
  public autoFire: boolean = true;
  public hasDashShockwave: boolean = false;
  public isAiPilot: boolean = true;
  public aiStatusText: string = 'AI PILOT: SECTOR RECON PATROL';

  public toggleAiPilot() {
    this.isAiPilot = !this.isAiPilot;
    if (this.isAiPilot) {
      this.aiStatusText = 'AI PILOT: ENGAGED';
      this.addFloatingText(this.player.x, this.player.y - 40, 'AI PILOT: ENGAGED', '#00F0FF');
    } else {
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
    this.player = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      speed: 0,
      maxSpeed: 7.5,
      acceleration: 0.65,
      friction: 0.94,
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
      drones: [
        {
          id: 'drone_starter_blaster',
          type: 'BLASTER',
          level: 1,
          fireCooldown: DRONE_BLUEPRINTS.BLASTER.baseCooldown,
          fireTimer: 0,
          x: CANVAS_WIDTH / 2 - 30,
          y: CANVAS_HEIGHT / 2 + 30,
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

    // Player velocity for parallax displacement
    const pVx = this.player ? this.player.vx : 0;
    const pVy = this.player ? this.player.vy : 0;
    const isPlaying = this.state === 'PLAYING';

    // Update dynamic multi-layer parallax stars
    for (const star of this.stars) {
      // Base natural ambient drift down
      const baseDrift = star.speed * (isPlaying ? 1.4 : 0.5);

      // Parallax layer multiplier: Layer 1 (0.08x), Layer 2 (0.24x), Layer 3 (0.55x)
      const parallaxFactor = star.layer === 1 ? 0.08 : star.layer === 2 ? 0.24 : 0.55;

      // React dynamically to player velocity vector
      star.x -= pVx * parallaxFactor;
      star.y += baseDrift - pVy * parallaxFactor;

      // Twinkle phase update
      star.twinklePhase += star.twinkleSpeed * clampedDt;

      // Seamless boundary wrapping with generous bleed margins
      const bleed = 40;
      if (star.x < -bleed) {
        star.x = CANVAS_WIDTH + bleed;
        star.y = Math.random() * CANVAS_HEIGHT;
      } else if (star.x > CANVAS_WIDTH + bleed) {
        star.x = -bleed;
        star.y = Math.random() * CANVAS_HEIGHT;
      }

      if (star.y < -bleed) {
        star.y = CANVAS_HEIGHT + bleed;
        star.x = Math.random() * CANVAS_WIDTH;
      } else if (star.y > CANVAS_HEIGHT + bleed) {
        star.y = -bleed;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    }

    // Update drifting cosmic nebulae
    for (const neb of this.nebulae) {
      neb.x += neb.vx - pVx * 0.03;
      neb.y += neb.vy - pVy * 0.03;

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

    // Update Projectiles & Collisions
    this.updateProjectiles(clampedDt);

    // Update Enemies & Waves
    this.updateEnemies(clampedDt);
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

    // A. Priority Target Acquisition
    let priorityTarget: Enemy | null = null;
    let highestScore = -Infinity;

    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      let typeWeight = 5;
      if (enemy.type === 'TITAN_BOSS') typeWeight = 16;
      else if (enemy.type === 'BOMBER') typeWeight = 11;
      else if (enemy.type === 'CHARGER') typeWeight = 10;
      else if (enemy.type === 'SNIPER') typeWeight = 9;
      else if (enemy.type === 'SCOUT') typeWeight = 7;

      const score = typeWeight * 1000 - dist;
      if (score > highestScore) {
        highestScore = score;
        priorityTarget = enemy;
      }
    }

    // B. AI Targeting & Auto-Firing
    if (priorityTarget) {
      this.mouseX = priorityTarget.x;
      this.mouseY = priorityTarget.y;

      // Auto-trigger primary fire if target is in sight
      if (p.fireTimer <= 0) {
        this.firePlayerPrimary();
        p.fireTimer = p.fireCooldown / p.fireRateMultiplier;
      }
    }

    // C. Autonomous Steering & Vector Forces
    if (!isManualMove) {
      let navX = 0;
      let navY = 0;
      let projectileEvadeCount = 0;

      // 1. Hostile Projectile Sidestep Evasion
      for (const proj of this.projectiles) {
        if (proj.isEnemy) {
          const pdx = p.x - proj.x;
          const pdy = p.y - proj.y;
          const pdist = Math.hypot(pdx, pdy);
          if (pdist < 210 && pdist > 0) {
            const dot = (proj.vx * pdx + proj.vy * pdy) / (Math.hypot(proj.vx, proj.vy) * pdist || 1);
            if (dot > 0.15) {
              projectileEvadeCount++;
              const perpX = -proj.vy;
              const perpY = proj.vx;
              const sideSign = (pdx * perpX + pdy * perpY) >= 0 ? 1 : -1;
              const evadeMag = (210 - pdist) / 210;
              const perpLen = Math.hypot(perpX, perpY) || 1;
              navX += (perpX / perpLen) * sideSign * evadeMag * 2.8;
              navY += (perpY / perpLen) * sideSign * evadeMag * 2.8;
            }
          }
        }
      }

      // 2. Safe Standoff Distance keeping from Hostiles
      for (const enemy of this.enemies) {
        const edx = p.x - enemy.x;
        const edy = p.y - enemy.y;
        const edist = Math.hypot(edx, edy) || 1;
        const safeDist = enemy.type === 'CHARGER' || enemy.type === 'TITAN_BOSS' ? 300 : 210;

        if (edist < safeDist) {
          const repelMag = (safeDist - edist) / safeDist;
          navX += (edx / edist) * repelMag * 2.4;
          navY += (edy / edist) * repelMag * 2.4;
        } else if (edist > 380 && priorityTarget === enemy) {
          navX -= (edx / edist) * 0.9;
          navY -= (edy / edist) * 0.9;
        }
      }

      // 3. Drop Item Harvesting Vector
      let closestDrop: DropItem | null = null;
      let closestDropDist = 380;

      for (const drop of this.drops) {
        const ddist = Math.hypot(drop.x - p.x, drop.y - p.y);
        if (ddist < closestDropDist) {
          let urgency = 1.2;
          if (drop.type === 'REPAIR' && p.health < p.maxHealth * 0.75) urgency = 2.8;
          if (drop.type === 'SHIELD_BOOST' && p.shield < p.maxShield * 0.5) urgency = 2.2;

          closestDropDist = ddist;
          closestDrop = drop;
          navX += ((drop.x - p.x) / ddist) * urgency * 1.6;
          navY += ((drop.y - p.y) / ddist) * urgency * 1.6;
        }
      }

      // 4. Center Anchor Force (Removed for endless space navigation)

      // Apply Navigation Vector
      const navLen = Math.hypot(navX, navY);
      if (navLen > 0) {
        const nx = navX / navLen;
        const ny = navY / navLen;
        p.vx += nx * p.acceleration * 1.15;
        p.vy += ny * p.acceleration * 1.15;
      }

      // 5. Automated Emergency Dash
      if (p.dashTimer <= 0 && !p.isDashing) {
        const closeHostiles = this.enemies.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < 130).length;
        const chargingEnemy = this.enemies.some(
          (e) => e.type === 'CHARGER' && e.isCharging && Math.hypot(e.x - p.x, e.y - p.y) < 220
        );

        if (projectileEvadeCount >= 2 || closeHostiles >= 3 || chargingEnemy) {
          this.triggerDash();
        }
      }

      // D. Dynamic AI Telemetry Status Update
      if (projectileEvadeCount > 0) {
        this.aiStatusText = `AI PILOT: EVADING ${projectileEvadeCount} HOSTILE PROJECTILE${
          projectileEvadeCount > 1 ? 'S' : ''
        }`;
      } else if (closestDrop && closestDropDist < 180) {
        this.aiStatusText = `AI PILOT: HARVESTING ${closestDrop.type} MODULE`;
      } else if (priorityTarget) {
        const tName = priorityTarget.type.replace('_', ' ');
        const distM = Math.round(Math.hypot(priorityTarget.x - p.x, priorityTarget.y - p.y));
        this.aiStatusText = `AI PILOT: ENGAGING ${tName} [RANGE: ${distM}m]`;
      } else {
        this.aiStatusText = 'AI PILOT: SECTOR RECON PATROL';
      }
    } else {
      this.aiStatusText = 'AI PILOT: MANUAL OVERRIDE ACTIVE';
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

    // Endless Space Matrix: Seamless Toroidal Space Wrapping
    if (p.x < 0) {
      p.x += CANVAS_WIDTH;
      p.history.forEach((h) => (h.x += CANVAS_WIDTH));
    } else if (p.x >= CANVAS_WIDTH) {
      p.x -= CANVAS_WIDTH;
      p.history.forEach((h) => (h.x -= CANVAS_WIDTH));
    }

    if (p.y < 0) {
      p.y += CANVAS_HEIGHT;
      p.history.forEach((h) => (h.y += CANVAS_HEIGHT));
    } else if (p.y >= CANVAS_HEIGHT) {
      p.y -= CANVAS_HEIGHT;
      p.history.forEach((h) => (h.y -= CANVAS_HEIGHT));
    }

    // Aim toward mouse cursor smoothly
    const targetAngle = Math.atan2(this.mouseY - p.y, this.mouseX - p.x);
    let diff = targetAngle - p.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    p.angle += diff * 0.22;

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

    const shouldFire = (this.isMouseDown || this.autoFire) && p.fireTimer <= 0;
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
      vx: Math.cos(p.angle) * speed,
      vy: Math.sin(p.angle) * speed,
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
    const drones = this.player.drones;
    if (drones.length === 0) return;

    // Position drones smoothly in dynamic tactical escort formations
    drones.forEach((drone, idx) => {
      // Calculate target wing offset position based on historical anchor
      const historyIndex = Math.min((idx + 1) * 8, this.player.history.length - 1);
      const anchor = this.player.history[historyIndex] || {
        x: this.player.x,
        y: this.player.y,
        angle: this.player.angle,
      };

      // Lateral V-wing spacing
      const side = idx % 2 === 0 ? 1 : -1;
      const tier = Math.floor(idx / 2) + 1;
      const lateralDist = side * tier * 30;
      const perpAngle = anchor.angle + Math.PI / 2;

      const targetX = anchor.x + Math.cos(perpAngle) * lateralDist;
      const targetY = anchor.y + Math.sin(perpAngle) * lateralDist;

      // Smooth flight interpolation with toroidal wrap handling
      let dx = targetX - drone.x;
      if (dx > CANVAS_WIDTH / 2) dx -= CANVAS_WIDTH;
      if (dx < -CANVAS_WIDTH / 2) dx += CANVAS_WIDTH;

      let dy = targetY - drone.y;
      if (dy > CANVAS_HEIGHT / 2) dy -= CANVAS_HEIGHT;
      if (dy < -CANVAS_HEIGHT / 2) dy += CANVAS_HEIGHT;

      drone.x += dx * 0.22;
      drone.y += dy * 0.22;

      // Wrap drone coordinates
      if (drone.x < 0) drone.x += CANVAS_WIDTH;
      else if (drone.x >= CANVAS_WIDTH) drone.x -= CANVAS_WIDTH;

      if (drone.y < 0) drone.y += CANVAS_HEIGHT;
      else if (drone.y >= CANVAS_HEIGHT) drone.y -= CANVAS_HEIGHT;

      // Decay physical barrel recoil kick
      if (drone.barrelKick > 0) {
        drone.barrelKick = Math.max(0, drone.barrelKick - dt * 5.5);
      }

      // Find nearest hostile target within active sensor range (650px)
      const nearestEnemy = this.findNearestEnemy(drone.x, drone.y, 650);
      if (nearestEnemy) {
        drone.targetAngle = Math.atan2(nearestEnemy.y - drone.y, nearestEnemy.x - drone.x);
        drone.targetEnemyId = nearestEnemy.id;
      } else {
        drone.targetAngle = this.player.angle;
        drone.targetEnemyId = null;
        drone.isLockedOn = false;
        drone.chargeTimer = 0;
      }

      // Smooth turret rotation towards target
      let diff = drone.targetAngle - drone.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      drone.angle += diff * 0.2;

      const isAligned = Math.abs(diff) < 0.38;

      // Drone Weapon Cooldown Tick
      if (drone.fireTimer > 0) {
        drone.fireTimer -= dt;
      }

      const bp = DRONE_BLUEPRINTS[drone.type];
      const effectiveCooldown = (bp.baseCooldown / this.player.fireRateMultiplier) * (1 - (drone.level - 1) * 0.12);

      // --- Weapon-Specific Tactical Cadence Engines ---

      if (drone.type === 'BLASTER') {
        // Continuous burst processor
        if (drone.burstRemaining > 0) {
          drone.burstTimer -= dt;
          if (drone.burstTimer <= 0) {
            this.fireBlasterBurstRound(drone);
            drone.burstRemaining--;
            drone.burstTimer = 0.07;
          }
        } else if (drone.fireTimer <= 0 && isAligned && (nearestEnemy || this.isMouseDown)) {
          // Initiate new 3-round (or 4/5 round at higher levels) burst
          drone.burstRemaining = 3 + (drone.level - 1);
          drone.burstTimer = 0;
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
            const chargeRatio = drone.chargeTimer / drone.maxChargeTimer;
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
              drone.chargeTimer = 0;
              drone.fireTimer = effectiveCooldown;
            }
          }
        } else {
          drone.chargeTimer = 0;
        }
      } else if (drone.type === 'TESLA') {
        // Arc Discharge Coil: High-voltage lightning discharge
        if (drone.fireTimer <= 0 && nearestEnemy && Math.hypot(nearestEnemy.x - drone.x, nearestEnemy.y - drone.y) < 380) {
          this.fireTeslaArc(drone, nearestEnemy);
          drone.fireTimer = effectiveCooldown;
        }
      }
    });
  }

  // Tactical Drone Firing Implementations:

  private fireBlasterBurstRound(drone: DroneModule) {
    const bp = DRONE_BLUEPRINTS.BLASTER;
    const dmg = bp.damage * this.player.damageMultiplier * (1 + (drone.level - 1) * 0.3);
    const speed = bp.speed;
    const fireAngle = drone.angle;

    drone.barrelKick = 1.0;
    this.spawnMuzzleFlash(drone.x, drone.y, fireAngle, bp.color, 3);

    this.projectiles.push({
      id: `dr_b_${Date.now()}_${Math.random()}`,
      x: drone.x + Math.cos(fireAngle) * 8,
      y: drone.y + Math.sin(fireAngle) * 8,
      vx: Math.cos(fireAngle) * speed,
      vy: Math.sin(fireAngle) * speed,
      radius: 3.2,
      damage: dmg,
      color: bp.color,
      weaponType: 'BLASTER',
      level: drone.level,
      isEnemy: false,
      piercing: 1,
      life: 0.95,
      maxLife: 0.95,
      trail: [{ x: drone.x, y: drone.y }],
    });

    audioManager.playPositionalLaser('BLASTER', drone.x, drone.y, this.player.x, this.player.y);
  }

  private fireSpreadFlak(drone: DroneModule) {
    const bp = DRONE_BLUEPRINTS.SPREAD;
    const dmg = bp.damage * this.player.damageMultiplier * (1 + (drone.level - 1) * 0.25);
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
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
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
    const dmg = bp.damage * this.player.damageMultiplier * (1 + (drone.level - 1) * 0.35);
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
        vx: Math.cos(launchAngle) * (speed * 0.65), // Starts with cold launch, accelerates with rocket motor
        vy: Math.sin(launchAngle) * (speed * 0.65),
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
    const dmg = bp.damage * this.player.damageMultiplier * (1 + (drone.level - 1) * 0.35);
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
      vx: Math.cos(fireAngle) * speed,
      vy: Math.sin(fireAngle) * speed,
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
    const dmg = bp.damage * this.player.damageMultiplier * (1 + (drone.level - 1) * 0.3);
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

      // Despawn projectiles when exiting the play area to prevent bullet clutter
      const pMargin = 40;
      if (
        p.life <= 0 ||
        p.x < -pMargin ||
        p.x > CANVAS_WIDTH + pMargin ||
        p.y < -pMargin ||
        p.y > CANVAS_HEIGHT + pMargin
      ) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with player (Enemy projectiles)
      if (p.isEnemy) {
        const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (dist < 18 + p.radius && this.player.invulnerableTimer <= 0) {
          this.hitPlayer(p.damage);
          this.spawnSparks(p.x, p.y, p.color, 6);
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Check collision with enemies (Player & Drone projectiles)
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
          if (dist < enemy.radius + p.radius) {
            const impactAngle = Math.atan2(p.vy, p.vx);

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

            // Explosive area-of-effect for seeking missiles
            if (p.isMissile) {
              this.shockwaves.push({
                x: p.x,
                y: p.y,
                radius: 12,
                maxRadius: 75,
                color: '#EC4899',
                alpha: 0.9,
                life: 0.28,
                maxLife: 0.28,
              });
              this.triggerScreenShake(4.0);

              // Damage surrounding hostiles in blast radius
              for (const splash of this.enemies) {
                if (splash.id !== enemy.id && Math.hypot(splash.x - p.x, splash.y - p.y) < 80) {
                  this.damageEnemy(splash, p.damage * 0.65, '#EC4899');
                  this.spawnSparks(splash.x, splash.y, '#EC4899', 5);
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
    enemy.hp -= damage;
    enemy.hitFlashTimer = 0.08;
    
    // Physical impulse momentum transfer
    if (impulseX !== 0 || impulseY !== 0) {
      const massFactor = enemy.type === 'TITAN_BOSS' ? 0.05 : enemy.type === 'BOMBER' ? 0.25 : 0.65;
      enemy.vx += impulseX * massFactor;
      enemy.vy += impulseY * massFactor;
    }

    this.addFloatingText(
      enemy.x + (Math.random() - 0.5) * 16,
      enemy.y - 12,
      Math.round(damage).toString(),
      hitColor
    );

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy) {
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

      const distToPlayer = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      const angleToPlayer = Math.atan2(p.y - enemy.y, p.x - enemy.x);

      // AI Behaviors by Enemy Archetype
      if (enemy.type === 'SWARMER') {
        // Relentless pursuit
        enemy.vx = Math.cos(angleToPlayer) * enemy.speed;
        enemy.vy = Math.sin(angleToPlayer) * enemy.speed;
        enemy.angle = angleToPlayer;
      } else if (enemy.type === 'SCOUT') {
        // Swoops in, fires, circles around
        enemy.aiTimer += dt;
        const orbitDist = 280;
        if (distToPlayer > orbitDist) {
          enemy.vx += Math.cos(angleToPlayer) * 0.4;
          enemy.vy += Math.sin(angleToPlayer) * 0.4;
        } else {
          // Circle tangentially
          const tangent = angleToPlayer + Math.PI / 2;
          enemy.vx += Math.cos(tangent) * 0.5;
          enemy.vy += Math.sin(tangent) * 0.5;
        }
        enemy.vx *= 0.96;
        enemy.vy *= 0.96;
        enemy.angle = angleToPlayer;

        // Scout weapon firing
        enemy.fireTimer += dt;
        if (enemy.fireTimer >= enemy.fireInterval) {
          enemy.fireTimer = 0;
          this.fireEnemyProjectile(enemy.x, enemy.y, angleToPlayer, 10, 12, '#F43F5E', 3.5, 'ENEMY_SCOUT');
          audioManager.playPositionalLaser('PRIMARY', enemy.x, enemy.y, p.x, p.y);
        }
      } else if (enemy.type === 'CHARGER') {
        // Charges forward in a straight high-speed line after telegraphing
        if (enemy.isCharging) {
          // In active rocket charge
          enemy.aiTimer -= dt;
          if (enemy.aiTimer <= 0) {
            enemy.isCharging = false;
            enemy.chargeCooldown = 2.5;
          }
        } else if (enemy.telegraphTimer > 0) {
          // Telegraphed laser line charging
          enemy.telegraphTimer -= dt;
          enemy.vx *= 0.85;
          enemy.vy *= 0.85;
          if (enemy.telegraphTimer <= 0) {
            enemy.isCharging = true;
            enemy.aiTimer = 1.0;
            enemy.vx = Math.cos(enemy.angle) * 16;
            enemy.vy = Math.sin(enemy.angle) * 16;
            audioManager.playPositionalLaser('SPREAD', enemy.x, enemy.y, p.x, p.y);
          }
        } else {
          // Stalk player
          enemy.chargeCooldown -= dt;
          enemy.angle = angleToPlayer;
          enemy.vx += Math.cos(angleToPlayer) * 0.2;
          enemy.vy += Math.sin(angleToPlayer) * 0.2;
          enemy.vx *= 0.94;
          enemy.vy *= 0.94;

          if (enemy.chargeCooldown <= 0 && distToPlayer < 450) {
            enemy.telegraphTimer = 0.8;
          }
        }
      } else if (enemy.type === 'BOMBER') {
        // Keeps distance and fires cluster plasma balls
        const desiredDist = 380;
        if (distToPlayer < desiredDist - 40) {
          enemy.vx -= Math.cos(angleToPlayer) * 0.3;
          enemy.vy -= Math.sin(angleToPlayer) * 0.3;
        } else if (distToPlayer > desiredDist + 40) {
          enemy.vx += Math.cos(angleToPlayer) * 0.3;
          enemy.vy += Math.sin(angleToPlayer) * 0.3;
        }
        enemy.vx *= 0.95;
        enemy.vy *= 0.95;
        enemy.angle = angleToPlayer;

        enemy.fireTimer += dt;
        if (enemy.fireTimer >= enemy.fireInterval) {
          enemy.fireTimer = 0;
          this.fireEnemyProjectile(enemy.x, enemy.y, angleToPlayer, 7, 25, '#EC4899', 5.5, 'ENEMY_BOMBER');
          audioManager.playPositionalLaser('SPREAD', enemy.x, enemy.y, p.x, p.y);
        }
      } else if (enemy.type === 'TITAN_BOSS') {
        // Massive boss with multi-barrel rotating turrets
        enemy.angle += 0.015;
        enemy.vx = Math.cos(angleToPlayer) * 1.8;
        enemy.vy = Math.sin(angleToPlayer) * 1.8;

        enemy.fireTimer += dt;
        if (enemy.fireTimer >= enemy.fireInterval) {
          enemy.fireTimer = 0;
          // 8-directional radial salvo
          for (let b = 0; b < 8; b++) {
            const salvoAngle = enemy.angle + (b / 8) * Math.PI * 2;
            this.fireEnemyProjectile(enemy.x, enemy.y, salvoAngle, 8.5, 18, '#F59E0B', 4.5, 'ENEMY_BOSS');
          }
          audioManager.playPositionalLaser('RAILGUN', enemy.x, enemy.y, p.x, p.y);
        }
      }

      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      // Endless Space Matrix: Wrap enemies across space margins
      const eMargin = 60;
      if (enemy.x < -eMargin) enemy.x += CANVAS_WIDTH + eMargin * 2;
      else if (enemy.x > CANVAS_WIDTH + eMargin) enemy.x -= CANVAS_WIDTH + eMargin * 2;

      if (enemy.y < -eMargin) enemy.y += CANVAS_HEIGHT + eMargin * 2;
      else if (enemy.y > CANVAS_HEIGHT + eMargin) enemy.y -= CANVAS_HEIGHT + eMargin * 2;

      // Melee ram damage to player
      if (distToPlayer < enemy.radius + 18 && p.invulnerableTimer <= 0) {
        const ramDmg = enemy.type === 'CHARGER' ? 35 : enemy.type === 'TITAN_BOSS' ? 50 : 15;
        this.hitPlayer(ramDmg);
        this.damageEnemy(enemy, 30, '#FFFFFF');
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
    weaponType: 'ENEMY_SCOUT' | 'ENEMY_BOMBER' | 'ENEMY_BOSS' = 'ENEMY_SCOUT'
  ) {
    this.projectiles.push({
      id: `ep_${Date.now()}_${Math.random()}`,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
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

    // Regular wave enemy spawner
    const spawnInterval = Math.max(0.6, 2.2 - this.wave * 0.15);
    if (this.spawnTimer >= spawnInterval && this.enemies.length < 28) {
      this.spawnTimer = 0;
      this.spawnRandomEnemy();
    }

    // Advance wave
    if (this.waveTimer >= this.waveDuration) {
      this.waveTimer = 0;
      this.wave++;
      this.bossDefeated = false;
      this.addFloatingText(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 100,
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

    const boss: Enemy = {
      id: `boss_titan_${Date.now()}`,
      type: 'TITAN_BOSS',
      x: CANVAS_WIDTH / 2,
      y: -80,
      vx: 0,
      vy: 2,
      angle: Math.PI / 2,
      targetAngle: Math.PI / 2,
      hp: 1200 + this.wave * 300,
      maxHp: 1200 + this.wave * 300,
      radius: 55,
      speed: 1.8,
      scoreValue: 5000,
      xpValue: 400,
      color: '#EF4444',
      fireTimer: 0,
      fireInterval: 1.4,
      aiTimer: 0,
      chargeCooldown: 0,
      isCharging: false,
      telegraphTimer: 0,
      hitFlashTimer: 0,
    };
    this.enemies.push(boss);
    this.addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80, 'WARNING: TITAN FLAGSHIP DETECTED', '#EF4444');
  }

  private spawnRandomEnemy() {
    // Spawn offscreen border
    let x = 0;
    let y = 0;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      x = Math.random() * CANVAS_WIDTH;
      y = -40;
    } else if (side === 1) {
      x = CANVAS_WIDTH + 40;
      y = Math.random() * CANVAS_HEIGHT;
    } else if (side === 2) {
      x = Math.random() * CANVAS_WIDTH;
      y = CANVAS_HEIGHT + 40;
    } else {
      x = -40;
      y = Math.random() * CANVAS_HEIGHT;
    }

    const r = Math.random();
    let type: EnemyType = 'SWARMER';
    let hp = 30 + this.wave * 8;
    let radius = 14;
    let color = '#EF4444';
    let speed = 4.2;
    let score = 50;
    let xp = 20;
    let fireInterval = 0;

    if (r < 0.4) {
      type = 'SWARMER';
      hp = 25 + this.wave * 6;
      radius = 12;
      color = '#F43F5E';
      speed = 4.8;
      score = 40;
      xp = 15;
    } else if (r < 0.7) {
      type = 'SCOUT';
      hp = 45 + this.wave * 10;
      radius = 16;
      color = '#FB923C';
      speed = 3.8;
      score = 80;
      xp = 35;
      fireInterval = 1.8;
    } else if (r < 0.9) {
      type = 'CHARGER';
      hp = 85 + this.wave * 18;
      radius = 20;
      color = '#E11D48';
      speed = 2.5;
      score = 140;
      xp = 60;
    } else {
      type = 'BOMBER';
      hp = 120 + this.wave * 25;
      radius = 24;
      color = '#A855F7';
      speed = 2.0;
      score = 200;
      xp = 90;
      fireInterval = 2.4;
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
      radius,
      speed,
      scoreValue: score,
      xpValue: xp,
      color,
      fireTimer: 0,
      fireInterval,
      aiTimer: 0,
      chargeCooldown: 2.0,
      isCharging: false,
      telegraphTimer: 0,
      hitFlashTimer: 0,
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

      // Endless Space Matrix: Wrap drops across screen margins
      if (drop.x < -30) drop.x += CANVAS_WIDTH + 60;
      else if (drop.x > CANVAS_WIDTH + 30) drop.x -= CANVAS_WIDTH + 60;

      if (drop.y < -30) drop.y += CANVAS_HEIGHT + 60;
      else if (drop.y > CANVAS_HEIGHT + 30) drop.y -= CANVAS_HEIGHT + 60;

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
      let dx = Math.abs(enemy.x - x);
      if (dx > CANVAS_WIDTH / 2) dx = CANVAS_WIDTH - dx;
      let dy = Math.abs(enemy.y - y);
      if (dy > CANVAS_HEIGHT / 2) dy = CANVAS_HEIGHT - dy;
      const d = Math.hypot(dx, dy);
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    }
    return nearest;
  }
}
