export type GameState = 'MENU' | 'PLAYING' | 'LEVEL_UP' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

export type DroneType = 'BLASTER' | 'SPREAD' | 'MISSILE' | 'RAILGUN' | 'TESLA';

export interface DroneModule {
  id: string;
  type: DroneType;
  level: number;
  fireCooldown: number;
  fireTimer: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bankAngle: number;
  angle: number;
  targetAngle: number;
  color: string;
  // Tactical weapon state
  chargeTimer: number;
  maxChargeTimer: number;
  burstRemaining: number;
  burstTimer: number;
  targetEnemyId: string | null;
  barrelKick: number;
  isLockedOn: boolean;
  thrusterPulse: number;
  rcsFlare: number;
  afterburner: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  // Destructibility & Durability
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  shieldRegenTimer: number;
  hitFlashTimer: number;
  // Independent Tactical AI
  aiState: 'ESCORT' | 'ENGAGE' | 'EVADE' | 'INTERCEPT';
  aiEvasionTimer: number;
  aiEvasionVector: { x: number; y: number };
  aiOrbitPhase: number;
  // Synergy Mechanic state
  synergyBuff: {
    fireRateBonus: number;
    damageBonus: number;
    activeLinks: number;
    nexusLinked: boolean;
  };
}

export interface SynergyLink {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  color: string;
  intensity: number;
  isNexusLink: boolean;
}

export interface PlayerShip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  friction: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  shieldRegenTimer: number;
  shieldRegenDelay: number;
  dashCooldown: number;
  dashTimer: number;
  isDashing: boolean;
  invulnerableTimer: number;
  fireCooldown: number;
  fireTimer: number;
  damageMultiplier: number;
  fireRateMultiplier: number;
  pickupRadius: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  score: number;
  combo: number;
  comboTimer: number;
  history: Array<{ x: number; y: number; angle: number }>;
  drones: DroneModule[];
  // Physical recoil, kickback & heat mechanics
  leftBarrelRecoil: number;
  rightBarrelRecoil: number;
  barrelIndex: number;
  heat: number;
  visualRecoil: number;
  visualRecoilAngle: number;
  rcsTimer: number;
}

export type EnemyType = 'SCOUT' | 'SWARMER' | 'CHARGER' | 'BOMBER' | 'SNIPER' | 'TITAN_BOSS' | 'INTERCEPTOR' | 'SHIELD_BEARER';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetAngle: number;
  hp: number;
  maxHp: number;
  shield?: number;
  maxShield?: number;
  radius: number;
  speed: number;
  scoreValue: number;
  xpValue: number;
  color: string;
  fireTimer: number;
  fireInterval: number;
  aiTimer: number;
  chargeCooldown: number;
  isCharging: boolean;
  telegraphTimer: number;
  hitFlashTimer: number;
  // Advanced Survivability & Flight Physics
  dodgeCooldown: number;
  dodgeTimer: number;
  isRetreating: boolean;
  evasionVector: { x: number; y: number };
  shieldFlashTimer?: number;
  // Flanking & Directional Bulwark Shield Properties
  flankSide?: number; // -1 for left flank, 1 for right flank
  frontalShieldArc?: number; // radians of forward shield coverage (e.g. 2.4 rad)
  frontalShieldActive?: boolean;
  frontalShieldHp?: number;
  frontalShieldMaxHp?: number;
  frontalShieldFlash?: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  isEnemy: boolean;
  piercing: number;
  life: number;
  maxLife: number;
  isMissile?: boolean;
  weaponType?: 'PRIMARY' | 'BLASTER' | 'SPREAD' | 'MISSILE' | 'RAILGUN' | 'TESLA' | 'ENEMY_SCOUT' | 'ENEMY_BOMBER' | 'ENEMY_BOSS';
  level?: number;
  targetEnemyId?: string | null;
  homingStrength?: number;
  trail: Array<{ x: number; y: number }>;
  stage?: number;
  caliberScale?: number;
}

export interface IonizationBeam {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface LightningArc {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  decay: number;
  shape?: 'CIRCLE' | 'LINE' | 'SPARK' | 'EMBER' | 'DEBRIS' | 'SMOKE' | 'FLASH' | 'SHARD';
  drag?: number;
  rotation?: number;
  rotSpeed?: number;
  hasTrail?: boolean;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export type DropType = 'XP' | 'REPAIR' | 'SHIELD_BOOST' | 'OVERDRIVE';

export interface DropItem {
  id: string;
  type: DropType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  radius: number;
  life: number;
  color: string;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  vy: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  layer: 1 | 2 | 3;
  color: string;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface CosmicNebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  vx: number;
  vy: number;
}

export interface UpgradeOption {
  id: string;
  title: string;
  description: string;
  type: 'NEW_DRONE' | 'UPGRADE_DRONE' | 'SHIP_STAT' | 'TACTICAL';
  droneType?: DroneType;
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  icon: string;
}
