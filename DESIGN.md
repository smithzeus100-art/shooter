# DESIGN CONTRACT — VOID STRIKE PROTOCOL

## 1. Reference Games & Borrowed Properties
1. **Nova Drift**: Modular drone escort formation mechanics and recursive weapon augment synergies.
2. **Geometry Wars**: High-contrast entity silhouettes, vector clarity, and physicalized kinetic shrapnel.
3. **Homeworld**: 3D celestial depth, dynamic directional lighting, and volumetric void atmosphere.

## 2. Core Fantasy
Command a prototype strike corvette and an autonomous tactical drone escort wing against escalating alien fleets in deep space.

## 3. 5-Second Test
- **What player sees**: Player corvette positioned at canvas center, HUD instrumentation active, ambient starfield depth, first hostile wave approaching with directional vector indicators.
- **What player does**: Steers ship via WASD / mouse tracking, primary autocannon fires on target, dashes through incoming attack vector using Space / Right-Click.

## 4. Measurable Success Criteria
- **Time-to-first-death target**: 120s – 180s for an unupgraded baseline run.
- **Screen occupancy % during combat**: 8% to 18% maximum visual footprint across active entities and projectiles; never exceeding 22% during boss encounters.
- **Max simultaneous entities at 60fps**:
  - Enemies: 150 active units
  - Projectiles: 250 active rounds
  - Particles: 300 active elements
- **Maximum time without a player decision**: 4.0 seconds (continuous movement steering, dash cooldown execution, or upgrade selection).

## 5. Visual Budget
- **Hue Assignments**:
  - Player Hull & Friendly Ordnance: Cyan (`#00F0FF`), Gold (`#F59E0B`), Magenta (`#EC4899`), Emerald (`#10B981`), Purple (`#A855F7`)
  - Enemy Hulls & Hostile Fire: Hostile Crimson (`#EF4444`), Boss Violet (`#8B5CF6`), Charge Warning Amber (`#F59E0B`)
  - Pickups & Tactical Drops: Nanite Green (`#10B981`), Shield Cyan (`#06B6D4`)
  - Environment & Void Depth: Slate 950 (`#020617`), Deep Navy (`#0A0F1D`), Nebula Purple (`#1E1B4B`)
- **Max simultaneous high-luminance elements**: 12 (shockwaves, railgun beams, core flash points).
- **Max active effect types simultaneously**: 4 (shockwave rings, debris shrapnel, sparks/embers, smoke puffs).

## 6. Fail State & Run Length
- **Fail State**: Hull integrity reaches 0. Immediate defeat state with stats accounting and score logging.
- **Run Length**: 25 waves (10 to 15 minutes), culminating in a Titan Boss confrontation.

---

## Three.js Integration Scope Boundary
- **Role**: Three.js WebGL background / celestial scene layer rendered beneath the 2D gameplay canvas OR hybrid 3D rendering.
- **Budget Constraint**: Zero frame degradation from 60 FPS; memory ceiling < 50MB for WebGL buffers and textures.
- **Legibility Gate**: Background contrast must remain at least 4.5:1 against player and enemy silhouettes.
