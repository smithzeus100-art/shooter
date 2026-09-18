import { DroneType, UpgradeOption } from '../types';

export let CANVAS_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 1920;
export let CANVAS_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 1080;

export function updateCanvasDimensions(w: number, h: number) {
  if (w > 0 && h > 0) {
    CANVAS_WIDTH = w;
    CANVAS_HEIGHT = h;
  }
}

export interface DroneBlueprint {
  type: DroneType;
  name: string;
  description: string;
  color: string;
  baseCooldown: number;
  damage: number;
  speed: number;
  piercing: number;
  icon: string;
}

export const DRONE_BLUEPRINTS: Record<DroneType, DroneBlueprint> = {
  BLASTER: {
    type: 'BLASTER',
    name: 'Pulse Autocannon',
    description: 'Controlled 3-round kinetic bursts with tungsten penetrators that shred armor.',
    color: '#00F0FF',
    baseCooldown: 0.55,
    damage: 28,
    speed: 26,
    piercing: 1,
    icon: 'Crosshair',
  },
  SPREAD: {
    type: 'SPREAD',
    name: 'Flak Scatterer',
    description: 'Heavy concussive flak charge that unleashes a lethal wall of flechettes.',
    color: '#F59E0B',
    baseCooldown: 0.85,
    damage: 24,
    speed: 19,
    piercing: 1,
    icon: 'Maximize2',
  },
  MISSILE: {
    type: 'MISSILE',
    name: 'Swarm Micro-Missile',
    description: 'HUD lock-on launcher that fires seeking high-explosive armor-piercing warheads.',
    color: '#EC4899',
    baseCooldown: 1.25,
    damage: 75,
    speed: 16,
    piercing: 1,
    icon: 'Target',
  },
  RAILGUN: {
    type: 'RAILGUN',
    name: 'Piercing Lance Railgun',
    description: 'Laser-targeted relativistic magnetic sabot that pierces straight through entire hostile lines.',
    color: '#10B981',
    baseCooldown: 1.5,
    damage: 135,
    speed: 42,
    piercing: 6,
    icon: 'Zap',
  },
  TESLA: {
    type: 'TESLA',
    name: 'Arc Discharge Coil',
    description: 'High-voltage capacitor coil that unleashes branching lightning and stuns hostiles.',
    color: '#A855F7',
    baseCooldown: 0.95,
    damage: 48,
    speed: 22,
    piercing: 3,
    icon: 'Activity',
  },
};

export const ALL_UPGRADES: UpgradeOption[] = [
  // Drone Unlocks
  {
    id: 'drone_blaster',
    title: 'Deploy Pulse Autocannon',
    description: 'Attaches a rapid-fire kinetic drone to your escort formation.',
    type: 'NEW_DRONE',
    droneType: 'BLASTER',
    rarity: 'COMMON',
    icon: 'Crosshair',
  },
  {
    id: 'drone_spread',
    title: 'Deploy Flak Scatterer',
    description: 'Attaches a multi-barrel perimeter defense drone to your wing.',
    type: 'NEW_DRONE',
    droneType: 'SPREAD',
    rarity: 'COMMON',
    icon: 'Maximize2',
  },
  {
    id: 'drone_missile',
    title: 'Deploy Seeking Missile Pod',
    description: 'Attaches a homing warhead launcher module to your trailing fleet.',
    type: 'NEW_DRONE',
    droneType: 'MISSILE',
    rarity: 'RARE',
    icon: 'Target',
  },
  {
    id: 'drone_railgun',
    title: 'Deploy Lance Railgun',
    description: 'Attaches an armor-piercing heavy sniper drone to the wing.',
    type: 'NEW_DRONE',
    droneType: 'RAILGUN',
    rarity: 'RARE',
    icon: 'Zap',
  },
  {
    id: 'drone_tesla',
    title: 'Deploy Arc Coil Drone',
    description: 'Attaches an electrostatic chain-lightning drone to your formation.',
    type: 'NEW_DRONE',
    droneType: 'TESLA',
    rarity: 'EPIC',
    icon: 'Activity',
  },

  // Stat Upgrades
  {
    id: 'stat_damage',
    title: 'Overclocked Munitions',
    description: 'Increases all flagship and drone weapon damage by +25%.',
    type: 'SHIP_STAT',
    rarity: 'COMMON',
    icon: 'Flame',
  },
  {
    id: 'stat_fire_rate',
    title: 'Rapid Cycling Heat Sinks',
    description: 'Increases overall fleet firing rate by +20%.',
    type: 'SHIP_STAT',
    rarity: 'COMMON',
    icon: 'FastForward',
  },
  {
    id: 'stat_shield',
    title: 'Deflector Matrix Capacitor',
    description: 'Boosts max shield capacity by +30 and speeds up shield recharge.',
    type: 'SHIP_STAT',
    rarity: 'RARE',
    icon: 'Shield',
  },
  {
    id: 'stat_speed',
    title: 'Ion Thruster Tuning',
    description: 'Increases ship top speed by +20% and reduces dash cooldown by 30%.',
    type: 'SHIP_STAT',
    rarity: 'COMMON',
    icon: 'Wind',
  },
  {
    id: 'stat_magnet',
    title: 'Tractor Beam Field',
    description: 'Expands energy crystal and salvage collection radius by +60%.',
    type: 'SHIP_STAT',
    rarity: 'COMMON',
    icon: 'Radio',
  },
  {
    id: 'stat_hull',
    title: 'Reinforced Nanite Plating',
    description: 'Increases max hull integrity by +40 and immediately repairs 50 HP.',
    type: 'SHIP_STAT',
    rarity: 'RARE',
    icon: 'Heart',
  },
  {
    id: 'spec_overdrive',
    title: 'Sublight Overdrive Reactor',
    description: 'Dashing releases a shockwave that destroys incoming enemy projectiles.',
    type: 'TACTICAL',
    rarity: 'EPIC',
    icon: 'Sparkles',
  },
];
