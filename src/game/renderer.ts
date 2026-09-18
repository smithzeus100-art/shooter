import { GameEngine } from './engine';
import { PlayerShip, DroneModule, Enemy, Projectile } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

export class GameRenderer {
  public render(ctx: CanvasRenderingContext2D, engine: GameEngine, width: number, height: number) {
    ctx.save();

    // Responsive letterbox scaling to maintain crisp aspect ratio
    const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
    const offsetX = (width - CANVAS_WIDTH * scale) / 2;
    const offsetY = (height - CANVAS_HEIGHT * scale) / 2;

    // Clear canvas
    ctx.fillStyle = '#030712'; // Ultra dark space obsidian
    ctx.fillRect(0, 0, width, height);

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Screen Shake Offset
    if (engine.screenShakeAmount > 0) {
      const shakeX = (Math.random() - 0.5) * engine.screenShakeAmount * 2;
      const shakeY = (Math.random() - 0.5) * engine.screenShakeAmount * 2;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Starfield & Cosmic Dust
    this.drawBackground(ctx, engine);

    // 2. Draw Tractor Beam Aura
    this.drawTractorField(ctx, engine);

    // 3. Draw Drops (XP & Repair Pickups)
    this.drawDrops(ctx, engine);

    // 4. Draw Formation Links between Flagship and Drones
    this.drawDroneFormationLinks(ctx, engine);

    // 5. Draw Enemies
    this.drawEnemies(ctx, engine);

    // 6. Draw HUD Tactical Target Locks & Aim Beams
    this.drawTargetingHUD(ctx, engine);

    // 7. Draw Escort Drones
    this.drawDrones(ctx, engine);

    // 8. Draw Player Flagship
    this.drawPlayer(ctx, engine.player);

    // 9. Draw Ionization Beams & Lightning Arcs
    this.drawIonizationBeams(ctx, engine);
    this.drawLightningArcs(ctx, engine);

    // 10. Draw Projectiles & Missiles
    this.drawProjectiles(ctx, engine);

    // 9. Draw Particles & Explosions
    this.drawParticles(ctx, engine);

    // 10. Draw Shockwaves
    this.drawShockwaves(ctx, engine);

    // 11. Draw Floating Combat Text
    this.drawFloatingTexts(ctx, engine);

    // 12. Draw Boss Health Bar Overlay (if Titan active)
    this.drawBossOverlay(ctx, engine);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    // 1. Deep space background vignette
    const grad = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      120,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH * 0.8
    );
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.6, '#040711');
    grad.addColorStop(1, '#02040a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Cosmic Nebulae
    for (const neb of engine.nebulae) {
      ctx.save();
      const nebGrad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radius);
      nebGrad.addColorStop(0, neb.color);
      nebGrad.addColorStop(0.7, neb.color.replace(/[\d.]+\)$/, '0.015)'));
      nebGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebGrad;
      ctx.beginPath();
      ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Multi-layer Parallax Stars & Velocity Warp Streaks
    const p = engine.player;
    const pVx = p ? p.vx : 0;
    const pVy = p ? p.vy : 0;
    const speed = Math.hypot(pVx, pVy);
    const isHighSpeed = speed > 2.0;

    for (const star of engine.stars) {
      // Calculate twinkling brightness modulation
      const twinkle = Math.sin(star.twinklePhase) * 0.25;
      const currentAlpha = Math.max(0.15, Math.min(1.0, star.brightness + twinkle));

      // Foreground layer 3 velocity motion streaks
      if (star.layer === 3 && isHighSpeed) {
        const streakMultiplier = (p.isDashing ? 2.8 : 1.4) * (star.layer * 0.7);
        const tailX = star.x - pVx * streakMultiplier;
        const tailY = star.y - pVy * streakMultiplier;

        ctx.save();
        ctx.strokeStyle = star.color;
        ctx.globalAlpha = currentAlpha;
        ctx.lineWidth = star.size * 0.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Bright star head
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Crisp stellar body
        ctx.save();
        ctx.globalAlpha = currentAlpha;
        ctx.fillStyle = star.color;

        // Subtle bloom for larger midfield/foreground stars
        if (star.size > 2.0) {
          ctx.shadowColor = star.color;
          ctx.shadowBlur = 4;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawTractorField(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    const p = engine.player;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.pickupRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawDroneFormationLinks(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    const p = engine.player;
    ctx.save();
    ctx.setLineDash([4, 4]);

    for (const drone of p.drones) {
      const dist = Math.hypot(drone.x - p.x, drone.y - p.y);
      if (dist < 400) {
        ctx.strokeStyle = `${drone.color}22`; // Subtle transparent tether
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(drone.x, drone.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerShip) {
    ctx.save();
    // Dynamic visual kickback translation along reverse firing heading + subtle angular shudder
    const kickX = -Math.cos(p.angle) * (p.visualRecoil || 0);
    const kickY = -Math.sin(p.angle) * (p.visualRecoil || 0);
    ctx.translate(p.x + kickX, p.y + kickY);
    ctx.rotate(p.angle + (p.visualRecoilAngle || 0));

    // Counter-stabilizing RCS gas jets when absorbing heavy weapon kickback
    if ((p.rcsTimer && p.rcsTimer > 0) || (p.visualRecoil && p.visualRecoil > 2.0)) {
      ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
      ctx.fillRect(17, -4, 3, 1.2);
      ctx.fillRect(17, 2.8, 3, 1.2);
    }

    // Shield Aura
    if (p.shield > 0) {
      const shieldRatio = p.shield / p.maxShield;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.3 + shieldRatio * 0.4})`;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Invulnerability Flashing
    if (p.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Thermal Heat Sink Glow (orange/amber venting under high sustained fire)
    if (p.heat > 10) {
      const heatIntensity = Math.min(1.0, p.heat / 80);
      ctx.fillStyle = `rgba(249, 115, 22, ${0.25 + heatIntensity * 0.55})`;
      ctx.beginPath();
      ctx.rect(-10, -5, 6, 10);
      ctx.fill();
    }

    // Left & Right Physical Recoiling Gun Barrels
    const leftRecoilX = -p.leftBarrelRecoil * 3.8;
    const rightRecoilX = -p.rightBarrelRecoil * 3.8;

    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(leftRecoilX + 6, -13, 6, 2.5); // Left wing cannon barrel
    ctx.fillRect(rightRecoilX + 6, 10.5, 6, 2.5); // Right wing cannon barrel

    // Flagship Main Hull (High-Tech Razor Interceptor)
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2.0;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(22, 0); // Nose tip
    ctx.lineTo(-14, 18); // Right wingtip
    ctx.lineTo(-8, 6); // Right engine notch
    ctx.lineTo(-16, 0); // Aft center
    ctx.lineTo(-8, -6); // Left engine notch
    ctx.lineTo(-14, -18); // Left wingtip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Armor Accents
    ctx.fillStyle = '#00F0FF';
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-4, 4);
    ctx.lineTo(-4, -4);
    ctx.closePath();
    ctx.fill();

    // Cockpit Canopy
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.ellipse(2, 0, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTargetingHUD(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const drone of engine.player.drones) {
      if (drone.type === 'MISSILE' && drone.isLockedOn && drone.targetEnemyId) {
        const target = engine.enemies.find((e) => e.id === drone.targetEnemyId);
        if (target) {
          ctx.save();
          ctx.translate(target.x, target.y);
          const t = Date.now() * 0.005;
          const boxSize = target.radius + 10;

          ctx.strokeStyle = '#EC4899';
          ctx.lineWidth = 1.5;

          // Holographic lock-on bracket corners
          const b = boxSize;
          const c = 6;
          // Top-Left
          ctx.beginPath();
          ctx.moveTo(-b, -b + c);
          ctx.lineTo(-b, -b);
          ctx.lineTo(-b + c, -b);
          // Top-Right
          ctx.moveTo(b - c, -b);
          ctx.lineTo(b, -b);
          ctx.lineTo(b, -b + c);
          // Bottom-Right
          ctx.moveTo(b, b - c);
          ctx.lineTo(b, b);
          ctx.lineTo(b - c, b);
          // Bottom-Left
          ctx.moveTo(-b + c, b);
          ctx.lineTo(-b, b);
          ctx.lineTo(-b, b - c);
          ctx.stroke();

          // Rotating tactical diamond
          ctx.rotate(t);
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
          ctx.strokeRect(-b * 0.6, -b * 0.6, b * 1.2, b * 1.2);

          // Tactical HUD Lock text
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#EC4899';
          ctx.textAlign = 'center';
          ctx.fillText('LOCK-ON', 0, -b - 4);

          ctx.restore();
        }
      } else if (drone.type === 'RAILGUN' && drone.chargeTimer > 0) {
        // Subtle tactical targeting laser from railgun muzzle tip to target
        ctx.save();
        const chargeRatio = drone.chargeTimer / drone.maxChargeTimer;
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.2 + chargeRatio * 0.3})`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 4]);

        const muzzleX = drone.x + Math.cos(drone.angle) * 14;
        const muzzleY = drone.y + Math.sin(drone.angle) * 14;
        const targetX = muzzleX + Math.cos(drone.angle) * 800;
        const targetY = muzzleY + Math.sin(drone.angle) * 800;

        ctx.beginPath();
        ctx.moveTo(muzzleX, muzzleY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  private drawDrones(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const drone of engine.player.drones) {
      this.drawSingleDrone(ctx, drone);
    }
  }

  private drawSingleDrone(ctx: CanvasRenderingContext2D, drone: DroneModule) {
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(drone.angle);

    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = drone.color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';

    const kick = drone.barrelKick * 3.5;
    const lvl = drone.level;

    if (drone.type === 'BLASTER') {
      // === PULSE AUTOCANNON POD ===
      // Recoiling Gun Barrels
      ctx.fillStyle = drone.color;
      if (lvl >= 2) {
        // Heavy twin fluted barrels
        ctx.fillRect(8 - kick, -7, 7, 2.5);
        ctx.fillRect(8 - kick, 4.5, 7, 2.5);
      } else {
        ctx.fillRect(6 - kick, -6, 6, 2);
        ctx.fillRect(6 - kick, 4, 6, 2);
      }

      // Hull
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, lvl >= 3 ? 13 : 10);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, lvl >= 3 ? -13 : -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Reinforced MK armored winglets
      if (lvl >= 2) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-6, -7);
        ctx.lineTo(2, -7);
        ctx.moveTo(-6, 7);
        ctx.lineTo(2, 7);
        ctx.stroke();
      }
    } else if (drone.type === 'SPREAD') {
      // === FLAK SCATTERER POD ===
      // Multi-choke barrel array with recoil
      ctx.fillStyle = drone.color;
      ctx.fillRect(8 - kick, -6, 6, 2);
      ctx.fillRect(10 - kick, -1, 7, 2.2);
      ctx.fillRect(8 - kick, 4, 6, 2);

      // Wide triangular scatter pod hull
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-10, lvl >= 2 ? 16 : 14);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, lvl >= 2 ? -16 : -14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (drone.type === 'MISSILE') {
      // === SWARM MISSILE LAUNCH POD ===
      ctx.beginPath();
      ctx.arc(0, 0, lvl >= 3 ? 11 : 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Missile tubes with warhead tips
      ctx.fillStyle = drone.color;
      const tubes = lvl >= 3 ? [-5, 0, 5] : [-4, 4];
      for (const ty of tubes) {
        ctx.beginPath();
        ctx.arc(4, ty, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (drone.type === 'RAILGUN') {
      // === DUAL ELECTROMAGNETIC RAILGUN POD ===
      const chargeRatio = drone.chargeTimer / (drone.maxChargeTimer || 1);
      const recoilOffset = kick * 2.2; // Recoil translation along barrel axis

      // High-frequency micro-jitter when energizing high-voltage capacitors
      const jitterX = chargeRatio > 0.2 ? (Math.random() - 0.5) * (chargeRatio * 1.6) : 0;
      const jitterY = chargeRatio > 0.2 ? (Math.random() - 0.5) * (chargeRatio * 1.6) : 0;
      ctx.translate(jitterX - recoilOffset, jitterY);

      // 1. Heavy Armored Breech & Mounting Chassis
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = drone.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-12, lvl >= 3 ? 9 : 7);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, lvl >= 3 ? -9 : -7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 2. High-Voltage Capacitor Coil Bank
      const capGlow = chargeRatio > 0 ? '#FFFFFF' : '#059669';
      ctx.fillStyle = chargeRatio > 0 ? `rgba(16, 185, 129, ${0.4 + chargeRatio * 0.6})` : '#1E293B';
      ctx.strokeStyle = capGlow;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.rect(-8, -4, 12, 8);
      ctx.fill();
      ctx.stroke();

      // 3. Ceramic Dielectric Insulator Block
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -5, 6, 10);

      // 4. Dual Magnetic Acceleration Rails (Top Rail & Bottom Rail)
      const railGlow = chargeRatio > 0 ? '#FFFFFF' : '#10B981';
      ctx.strokeStyle = railGlow;
      ctx.lineWidth = lvl >= 2 ? 2.2 : 1.8;

      // Top Rail
      ctx.beginPath();
      ctx.moveTo(2, -3);
      ctx.lineTo(22, -3);
      ctx.stroke();

      // Bottom Rail
      ctx.beginPath();
      ctx.moveTo(2, 3);
      ctx.lineTo(22, 3);
      ctx.stroke();

      // 5. Superconducting Magnetic Induction Rings
      const ringGlow = chargeRatio > 0 ? `rgba(255, 255, 255, ${0.6 + chargeRatio * 0.4})` : 'rgba(16, 185, 129, 0.7)';
      ctx.strokeStyle = ringGlow;
      ctx.lineWidth = 1.2;
      const ringPositions = lvl >= 3 ? [4, 9, 14, 19] : [5, 12, 19];
      for (const rx of ringPositions) {
        ctx.beginPath();
        ctx.moveTo(rx, -4);
        ctx.lineTo(rx, 4);
        ctx.stroke();
      }

      // 6. Charging Energy Arcs Between Rails (Inter-Rail Plasma Arcing)
      if (chargeRatio > 0) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.0;
        const arcCount = Math.floor(chargeRatio * 3) + 1;
        for (let a = 0; a < arcCount; a++) {
          const ax = 4 + Math.random() * 16;
          ctx.beginPath();
          ctx.moveTo(ax, -3);
          ctx.lineTo(ax + (Math.random() - 0.5) * 2, 0);
          ctx.lineTo(ax, 3);
          ctx.stroke();
        }

        // Muzzle Charging Plasma Orb Core
        ctx.fillStyle = `rgba(16, 185, 129, ${0.4 + chargeRatio * 0.6})`;
        ctx.beginPath();
        ctx.arc(22, 0, 2 + chargeRatio * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(22, 0, 1 + chargeRatio * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (drone.type === 'TESLA') {
      // === ARC DISCHARGE COIL ===
      ctx.beginPath();
      ctx.arc(0, 0, lvl >= 3 ? 12 : 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating inner capacitor core
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Status Level Pips (● ● ●)
    ctx.fillStyle = '#FFFFFF';
    const pipCount = Math.min(3, lvl);
    for (let p = 0; p < pipCount; p++) {
      const px = -6 + p * 4;
      ctx.beginPath();
      ctx.arc(px, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawIonizationBeams(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const beam of engine.ionizationBeams) {
      ctx.save();
      ctx.globalAlpha = beam.alpha;

      // 1. Outer subtle emerald channel
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = beam.width * 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();

      // 2. Core crisp white needle trace
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(0.8, beam.width * 0.4);
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();

      // 3. Compact Muzzle Flash Point
      ctx.fillStyle = `rgba(255, 255, 255, ${beam.alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(beam.x1, beam.y1, 3 * beam.alpha, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawLightningArcs(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const arc of engine.lightningArcs) {
      if (arc.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = arc.alpha;

      // Outer electrostatic purple/cyan corona
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(arc.points[0].x, arc.points[0].y);
      for (let i = 1; i < arc.points.length; i++) {
        ctx.lineTo(arc.points[i].x, arc.points[i].y);
      }
      ctx.stroke();

      // Inner white-hot high voltage core
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(arc.points[0].x, arc.points[0].y);
      for (let i = 1; i < arc.points.length; i++) {
        ctx.lineTo(arc.points[i].x, arc.points[i].y);
      }
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawEnemies(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const enemy of engine.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.angle);

      // Flash white on hit
      const isFlashing = enemy.hitFlashTimer > 0;

      ctx.fillStyle = isFlashing ? '#FFFFFF' : '#111827';
      ctx.strokeStyle = isFlashing ? '#FFFFFF' : enemy.color;
      ctx.lineWidth = 2.0;
      ctx.lineJoin = 'round';

      // Telegraph sightline for Chargers
      if (enemy.type === 'CHARGER' && enemy.telegraphTimer > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + Math.sin(Date.now() * 0.02) * 0.4})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(400, 0);
        ctx.stroke();
        ctx.restore();
      }

      if (enemy.type === 'SWARMER') {
        // Razor Blade Triangle
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (enemy.type === 'SCOUT') {
        // Swept-wing Dart
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-12, 14);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye core
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(2, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'CHARGER') {
        // Armored Ram Wedge
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-14, 16);
        ctx.lineTo(-14, -16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (enemy.type === 'BOMBER') {
        // Heavy Octagon
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'TITAN_BOSS') {
        // Massive Dreadnought Hull with spinning rings
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotating outer armor plating
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 12, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing core
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const p of engine.projectiles) {
      ctx.save();

      // 1. Aerodynamic Ionization Wake Trail
      if (p.trail && p.trail.length > 1) {
        ctx.save();
        const wakeColor = p.weaponType === 'RAILGUN' ? '#10B981' : p.color;
        for (let t = 0; t < p.trail.length - 1; t++) {
          const alpha = (1 - t / p.trail.length) * (p.weaponType === 'RAILGUN' ? 0.6 : 0.35);
          ctx.strokeStyle = wakeColor;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = Math.max(0.6, (1 - t / p.trail.length) * (p.weaponType === 'RAILGUN' ? 2.2 : 1.6));
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.trail[t].x, p.trail[t].y);
          ctx.lineTo(p.trail[t + 1].x, p.trail[t + 1].y);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.translate(p.x, p.y);
      const ang = Math.atan2(p.vy, p.vx);
      ctx.rotate(ang);

      const type = p.weaponType;

      if (p.isMissile || type === 'MISSILE') {
        // === SWARM MICRO-MISSILE (Military Aerodynamic Airframe) ===
        // 1. Graphite ceramic fuselage
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        ctx.moveTo(7, 0); // Razor sharp nosecone
        ctx.lineTo(2, 1.8);
        ctx.lineTo(-5, 1.8);
        ctx.lineTo(-7, 0.8);
        ctx.lineTo(-7, -0.8);
        ctx.lineTo(-5, -1.8);
        ctx.lineTo(2, -1.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. Titanium stabilizer fins
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#F43F5E';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-2, -1.8);
        ctx.lineTo(-6, -4.2);
        ctx.lineTo(-5, -1.8);
        ctx.moveTo(-2, 1.8);
        ctx.lineTo(-6, 4.2);
        ctx.lineTo(-5, 1.8);
        ctx.fill();
        ctx.stroke();

        // 3. Optical IR seeker lens at nose
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(5, 0, 1.0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Solid-fuel supersonic rocket flame
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(-6, -1.2);
        ctx.lineTo(-12 - Math.random() * 4, 0);
        ctx.lineTo(-6, 1.2);
        ctx.closePath();
        ctx.fill();

        // White-hot flame nozzle core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-6, -0.6);
        ctx.lineTo(-9, 0);
        ctx.lineTo(-6, 0.6);
        ctx.closePath();
        ctx.fill();
      } else if (type === 'RAILGUN') {
        // === PIERCING LANCE RAILGUN (Relativistic Sabot Needle) ===
        // 1. Searing outer emerald ionization sheath
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(14, 0);
        ctx.stroke();

        // 2. Ultra-bright white-hot penetrator core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();

        // 3. Superconducting magnetic rings
        ctx.strokeStyle = '#6EE7B7';
        ctx.lineWidth = 0.8;
        for (const rx of [-7, 0, 7]) {
          ctx.beginPath();
          ctx.moveTo(rx, -2.5);
          ctx.lineTo(rx, 2.5);
          ctx.stroke();
        }

        // 4. Leading spear flash
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(15, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'SPREAD') {
        // === FLAK SCATTERER (Hypersonic Tungsten Flechette) ===
        // 1. Aerodynamic diamond flechette body
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(0, 1.8);
        ctx.lineTo(-6, 0.8);
        ctx.lineTo(-6, -0.8);
        ctx.lineTo(0, -1.8);
        ctx.closePath();
        ctx.fill();

        // 2. Incandescent white spine
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();
      } else if (type === 'BLASTER') {
        // === PULSE AUTOCANNON (High-Velocity Kinetic Tracer Dart) ===
        // 1. Searing tracer envelope
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(7, 0);
        ctx.stroke();

        // 2. White-hot kinetic penetrator core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();

        // 3. Micro shock chevron
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(2, -2.0);
        ctx.lineTo(5, 0);
        ctx.lineTo(2, 2.0);
        ctx.stroke();
      } else if (type === 'ENEMY_BOMBER') {
        // === ENEMY HEAVY PLASMA MORTAR (Unstable Superheated Slug) ===
        // 1. Dense plasma orb
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // 2. White core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // 3. Orbiting plasma corona
        ctx.strokeStyle = '#F43F5E';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.25, 0, Math.PI * 2);
        ctx.stroke();
      } else if (type === 'ENEMY_BOSS') {
        // === TITAN HEAVY SALVO ===
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(9, 0);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();
      } else if (type === 'ENEMY_SCOUT') {
        // === ENEMY SCOUT KINETIC DART ===
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(7, 0);
        ctx.stroke();
      } else {
        // === PRIMARY TWIN PLASMA NEEDLES ===
        // 1. Outer high-energy ionization envelope
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();

        // 2. Searing white-hot tungsten-plasma core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(9, 0);
        ctx.stroke();

        // 3. Supersonic Mach diamond shockwave chevron
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(2, -2.6);
        ctx.lineTo(6, 0);
        ctx.lineTo(2, 2.6);
        ctx.stroke();

        // 4. Pinpoint leading ion spark
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(9, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawDrops(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const drop of engine.drops) {
      ctx.save();
      ctx.translate(drop.x, drop.y);

      // Pulsing Glow
      const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.2;
      ctx.fillStyle = drop.color;
      ctx.beginPath();
      ctx.arc(0, 0, drop.radius * pulse, 0, Math.PI * 2);
      ctx.fill();

      // White inner core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, drop.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const part of engine.particles) {
      ctx.save();
      ctx.globalAlpha = part.alpha;

      if (part.shape === 'SPARK') {
        // Directional kinetic spark streak
        const speed = Math.hypot(part.vx, part.vy);
        const streakLen = Math.max(3, speed * 1.5);
        const ang = Math.atan2(part.vy, part.vx);

        ctx.translate(part.x, part.y);
        ctx.rotate(ang);
        ctx.strokeStyle = part.color;
        ctx.lineWidth = part.size;
        ctx.beginPath();
        ctx.moveTo(-streakLen, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
      } else if (part.shape === 'FLASH') {
        // High-luminance explosion lens flash core
        const grad = ctx.createRadialGradient(part.x, part.y, 0, part.x, part.y, part.size);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, part.color || '#F59E0B');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (part.shape === 'SMOKE') {
        // Expanding dark thermal smoke plume
        ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (part.shape === 'DEBRIS') {
        // Spinning hull fragmentation piece
        ctx.translate(part.x, part.y);
        ctx.rotate(part.rotation || 0);
        ctx.fillStyle = part.color;
        ctx.strokeStyle = `${part.color}AA`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const s = part.size;
        ctx.moveTo(-s, -s * 0.6);
        ctx.lineTo(s * 0.8, -s);
        ctx.lineTo(s, s * 0.7);
        ctx.lineTo(-s * 0.5, s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (part.shape === 'EMBER') {
        // Glowing ember thermal particle
        ctx.fillStyle = part.color;
        ctx.shadowColor = part.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawShockwaves(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const sw of engine.shockwaves) {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    ctx.save();
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';

    for (const ft of engine.floatingTexts) {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  private drawBossOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    const boss = engine.enemies.find((e) => e.type === 'TITAN_BOSS');
    if (!boss) return;

    ctx.save();
    const barWidth = 460;
    const barHeight = 16;
    const barX = (CANVAS_WIDTH - barWidth) / 2;
    const barY = 36;

    // Label
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#EF4444';
    ctx.textAlign = 'center';
    ctx.fillText('TITAN DREADNOUGHT', CANVAS_WIDTH / 2, barY - 10);

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Fill
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * hpRatio, barHeight - 4);

    ctx.restore();
  }
}
