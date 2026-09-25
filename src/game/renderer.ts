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

    // Clear 2D gameplay canvas to reveal 3D celestial environment
    ctx.clearRect(0, 0, width, height);

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Screen Shake Offset (Tamed micro-rumble)
    if (engine.screenShakeAmount > 0) {
      const clampedShake = Math.min(engine.screenShakeAmount, 2.0);
      const shakeX = (Math.random() - 0.5) * clampedShake;
      const shakeY = (Math.random() - 0.5) * clampedShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Starfield & Cosmic Dust with camera parallax
    this.drawBackground(ctx, engine);

    // Dynamic Camera: Center viewport on continuous camera position
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2 - engine.camera.x, CANVAS_HEIGHT / 2 - engine.camera.y);

    // 2. Draw Tractor Beam Aura
    this.drawTractorField(ctx, engine);

    // 3. Draw Drops (XP & Repair Pickups)
    this.drawDrops(ctx, engine);

    // 4. Draw Escort Wingman Ion Thruster Trails (No tethers)
    this.drawDroneThrusterTrails(ctx, engine);

    // 5. Draw Dynamic Energy Synergy Links
    this.drawSynergyLinks(ctx, engine);

    // 6. Draw Enemies
    this.drawEnemies(ctx, engine);

    // 7. Draw HUD Tactical Target Locks & Aim Beams
    this.drawTargetingHUD(ctx, engine);

    // 8. Draw Escort Drones
    this.drawDrones(ctx, engine);

    // 9. Draw Player Flagship
    this.drawPlayer(ctx, engine.player);

    // 10. Draw Ionization Beams & Lightning Arcs
    this.drawIonizationBeams(ctx, engine);
    this.drawLightningArcs(ctx, engine);

    // 11. Draw Projectiles & Missiles
    this.drawProjectiles(ctx, engine);

    // 12. Draw Particles & Explosions
    this.drawParticles(ctx, engine);

    // 13. Draw Shockwaves
    this.drawShockwaves(ctx, engine);

    // 14. Draw Floating Combat Text
    this.drawFloatingTexts(ctx, engine);

    ctx.restore(); // End dynamic camera transform

    // 15. Draw Boss Health Bar Overlay (if Titan active) in screen space
    this.drawBossOverlay(ctx, engine);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    // Reveal 3D celestial Three.js environment beneath with high-contrast subtle vignette
    ctx.save();

    // Subtle edge vignette to softly frame playfield boundaries without obscuring WebGL stars or planet
    const grad = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH * 0.45,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH * 0.85
    );
    grad.addColorStop(0, 'rgba(2, 6, 23, 0)');
    grad.addColorStop(0.8, 'rgba(2, 6, 23, 0.15)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle tactical HUD coordinate corner brackets
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    const pad = 24;
    const len = 16;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(pad, pad + len);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + len, pad);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - pad - len, pad);
    ctx.lineTo(CANVAS_WIDTH - pad, pad);
    ctx.lineTo(CANVAS_WIDTH - pad, pad + len);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(pad, CANVAS_HEIGHT - pad - len);
    ctx.lineTo(pad, CANVAS_HEIGHT - pad);
    ctx.lineTo(pad + len, CANVAS_HEIGHT - pad);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - pad - len, CANVAS_HEIGHT - pad);
    ctx.lineTo(CANVAS_WIDTH - pad, CANVAS_HEIGHT - pad);
    ctx.lineTo(CANVAS_WIDTH - pad, CANVAS_HEIGHT - pad - len);
    ctx.stroke();

    ctx.restore();
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

  private drawDroneThrusterTrails(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    const p = engine.player;
    if (p.drones.length === 0) return;

    ctx.save();
    for (const drone of p.drones) {
      if (!drone.trail || drone.trail.length < 2) continue;

      // Draw fading dual ion trail stream
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < drone.trail.length - 1; i++) {
        const pt1 = drone.trail[i];
        const pt2 = drone.trail[i + 1];
        if (pt1.alpha <= 0.01) continue;

        ctx.strokeStyle = drone.color;
        ctx.globalAlpha = pt1.alpha * 0.45;
        ctx.lineWidth = Math.max(0.8, 2.5 * (1 - i / drone.trail.length));

        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();

        // Inner white-hot filament for active afterburners
        if (drone.afterburner && drone.afterburner > 0.3) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.globalAlpha = pt1.alpha * 0.6 * drone.afterburner;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerShip) {
    // 1. 3D Altitude Drop Shadow cast onto celestial depth coordinate plane
    const alt = p.z || 0;
    const shadowDist = Math.max(6, 12 + alt * 0.45);
    const shadowScale = Math.max(0.65, 1.0 - alt / 400);
    const shadowAlpha = Math.max(0.08, 0.35 * (1.0 - alt / 350));
    ctx.save();
    ctx.translate(p.x - shadowDist * 0.6, p.y + shadowDist * 0.6);
    ctx.rotate(p.angle);
    ctx.scale(shadowScale, shadowScale * 0.75);
    ctx.fillStyle = `rgba(2, 6, 23, ${shadowAlpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    // Dynamic visual kickback translation along reverse firing heading + subtle angular shudder
    const kickX = -Math.cos(p.angle) * (p.visualRecoil || 0);
    const kickY = -Math.sin(p.angle) * (p.visualRecoil || 0);
    ctx.translate(p.x + kickX, p.y + kickY);
    ctx.rotate(p.angle + (p.visualRecoilAngle || 0));

    // 3D Spatial Flight Transformation (Roll banking, pitch, and altitude scaling)
    const altScale = Math.max(0.85, 1.0 + (p.z || 0) / 750);
    const rollScaleY = Math.max(0.25, Math.abs(Math.cos(p.roll || 0)));
    const pitchScaleX = Math.max(0.72, Math.cos(p.pitch || 0));
    ctx.scale(pitchScaleX * altScale, rollScaleY * altScale);

    // 0. Twin Main Engine Ion Thruster Plumes with Mach Shock Diamonds
    const speed = Math.hypot(p.vx, p.vy);
    const throttle = Math.min(1.0, speed / (p.maxSpeed || 7.5));
    const isDash = p.isDashing;

    if (throttle > 0.04 || isDash) {
      const plumeLen = isDash ? 36 : (7 + throttle * 22);
      const plumeWidth = isDash ? 6.0 : (2.4 + throttle * 2.2);
      const nozzleOffsets = [-6.5, 6.5];

      ctx.save();
      for (const ny of nozzleOffsets) {
        // Outer ion plasma plume (electric cyan / sky blue gradient)
        const plumeGrad = ctx.createLinearGradient(-19, ny, -19 - plumeLen, ny);
        plumeGrad.addColorStop(0, isDash ? 'rgba(0, 240, 255, 0.95)' : 'rgba(56, 189, 248, 0.85)');
        plumeGrad.addColorStop(0.55, isDash ? 'rgba(6, 182, 212, 0.45)' : 'rgba(14, 165, 233, 0.35)');
        plumeGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');

        ctx.fillStyle = plumeGrad;
        ctx.beginPath();
        ctx.moveTo(-19, ny - plumeWidth);
        ctx.lineTo(-19 - plumeLen, ny);
        ctx.lineTo(-19, ny + plumeWidth);
        ctx.closePath();
        ctx.fill();

        // Inner white-hot high-temperature filament
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = Math.min(1.0, 0.45 + throttle * 0.55);
        ctx.beginPath();
        ctx.moveTo(-19, ny - plumeWidth * 0.45);
        ctx.lineTo(-19 - plumeLen * 0.52, ny);
        ctx.lineTo(-19, ny + plumeWidth * 0.45);
        ctx.closePath();
        ctx.fill();

        // Pulsating Mach Shock Diamond Discs
        if (throttle > 0.28 || isDash) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.0;
          ctx.globalAlpha = 0.85;
          const d1X = -19 - plumeLen * 0.28;
          const d2X = -19 - plumeLen * 0.55;
          for (const dX of [d1X, d2X]) {
            ctx.beginPath();
            ctx.moveTo(dX, ny - 1.8);
            ctx.lineTo(dX + 2.2, ny);
            ctx.lineTo(dX, ny + 1.8);
            ctx.lineTo(dX - 2.2, ny);
            ctx.closePath();
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // Wingtip Ionization Contrail Ribbons during high-G banking or hard thrust
    if (throttle > 0.55 || Math.abs(p.roll || 0) > 0.22 || isDash) {
      ctx.save();
      const contrailAlpha = isDash ? 0.75 : Math.min(0.5, (throttle - 0.4) * 0.9 + Math.abs(p.roll || 0) * 0.4);
      ctx.strokeStyle = `rgba(56, 189, 248, ${contrailAlpha.toFixed(2)})`;
      ctx.lineWidth = isDash ? 2.2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(-12, -20);
      ctx.lineTo(-12 - 16 * throttle, -20 - (p.roll || 0) * 4);
      ctx.moveTo(-12, 20);
      ctx.lineTo(-12 - 16 * throttle, 20 - (p.roll || 0) * 4);
      ctx.stroke();
      ctx.restore();
    }

    // 3D Tactical Shield Envelope with Hexagonal Deflection Lattice
    if (p.shield > 0) {
      const shieldRatio = p.shield / p.maxShield;
      const isInvuln = p.invulnerableTimer > 0;
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);

      ctx.save();
      // Outer subtle deflector envelope conforming to hull
      ctx.strokeStyle = isInvuln
        ? 'rgba(255, 255, 255, 0.85)'
        : `rgba(56, 189, 248, ${0.2 + shieldRatio * 0.35 + pulse * 0.12})`;
      ctx.lineWidth = isInvuln ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.ellipse(2, 0, 28, 23, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Hexagonal telemetry deflection lattice markers on shield perimeter
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 + shieldRatio * 0.22})`;
      ctx.lineWidth = 1.0;
      for (let h = 0; h < 6; h++) {
        const hAng = (Math.PI / 3) * h + Date.now() * 0.001;
        const hx = 2 + Math.cos(hAng) * 28;
        const hy = Math.sin(hAng) * 23;
        ctx.strokeRect(hx - 2, hy - 2, 4, 4);
      }
      ctx.restore();
    }

    // Counter-stabilizing RCS gas jets when absorbing heavy weapon kickback
    if ((p.rcsTimer && p.rcsTimer > 0) || (p.visualRecoil && p.visualRecoil > 2.0)) {
      ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
      ctx.fillRect(17, -4, 3, 1.2);
      ctx.fillRect(17, 2.8, 3, 1.2);
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

    // 3D Directional Lighting Calculation from Celestial Sun
    const roll = p.roll || 0;
    const pitch = p.pitch || 0;
    const portLight = Math.max(0.24, Math.min(1.0, 0.58 - roll * 0.85 + pitch * 0.25));
    const stbdLight = Math.max(0.24, Math.min(1.0, 0.58 + roll * 0.85 + pitch * 0.25));
    const dorsalLight = Math.max(0.35, Math.min(1.0, 0.72 - pitch * 0.55));

    const portFill = `rgb(${Math.floor(18 * portLight + 12)}, ${Math.floor(28 * portLight + 18)}, ${Math.floor(52 * portLight + 34)})`;
    const stbdFill = `rgb(${Math.floor(18 * stbdLight + 12)}, ${Math.floor(28 * stbdLight + 18)}, ${Math.floor(52 * stbdLight + 34)})`;
    const dorsalFill = `rgb(${Math.floor(25 * dorsalLight + 18)}, ${Math.floor(40 * dorsalLight + 26)}, ${Math.floor(70 * dorsalLight + 45)})`;

    // 1. Lower Ventral Undercarriage & Exhaust Bell Housing
    ctx.fillStyle = '#090D1A';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-16, -14);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-18, 6);
    ctx.lineTo(-16, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin Aft Thruster Housing Blocks
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-19, -9, 4, 5);
    ctx.fillRect(-19, 4, 4, 5);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(-19, -9, 4, 5);
    ctx.strokeRect(-19, 4, 4, 5);

    // 2. Heavy Underslung Cannon Nacelles with Recoil Slides & Thermal Tempering
    const leftRecoilX = -p.leftBarrelRecoil * 4.0;
    const rightRecoilX = -p.rightBarrelRecoil * 4.0;

    // Cannon mounts with mechanical slide tracks
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, -14, 8, 3.5);
    ctx.fillRect(0, 10.5, 8, 3.5);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(0, -14, 8, 3.5);
    ctx.strokeRect(0, 10.5, 8, 3.5);

    // Thermal Tempering Color on Weapon Barrels
    let barrelColor = '#00F0FF';
    let muzzleCrownColor = '#FFFFFF';
    if (p.heat > 35) {
      barrelColor = '#F59E0B'; // Tempered amber
      muzzleCrownColor = '#FDE047';
    } else if (p.heat > 18) {
      barrelColor = '#818CF8'; // Tempered blue-violet
    }

    // Left Cannon Assembly
    ctx.fillStyle = barrelColor;
    ctx.fillRect(leftRecoilX + 7, -13.2, 8, 2.0);
    ctx.fillStyle = muzzleCrownColor;
    ctx.fillRect(leftRecoilX + 14, -13.8, 2, 3.2); // Flash suppressor crown
    // Left heat vent slots
    ctx.fillStyle = '#020617';
    ctx.fillRect(leftRecoilX + 9, -13, 1.2, 1.6);
    ctx.fillRect(leftRecoilX + 11.5, -13, 1.2, 1.6);

    // Right Cannon Assembly
    ctx.fillStyle = barrelColor;
    ctx.fillRect(rightRecoilX + 7, 11.2, 8, 2.0);
    ctx.fillStyle = muzzleCrownColor;
    ctx.fillRect(rightRecoilX + 14, 10.6, 2, 3.2); // Flash suppressor crown
    // Right heat vent slots
    ctx.fillStyle = '#020617';
    ctx.fillRect(rightRecoilX + 9, 11.4, 1.2, 1.6);
    ctx.fillRect(rightRecoilX + 11.5, 11.4, 1.2, 1.6);

    // 3. Port & Starboard Faceted Composite Armor Wings
    // Port Wing Primary Facet
    ctx.fillStyle = portFill;
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-12, -20);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Port Wing Panel Seams (Micro-Greebles)
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.lineTo(-6, -14); // Mid-wing panel seam
    ctx.moveTo(2, -3);
    ctx.lineTo(-8, -7); // Elevon hinge line
    ctx.stroke();

    // Port Wing Chamfer Bevel Highlight
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + portLight * 0.5})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-10, -18);
    ctx.stroke();

    // Starboard Wing Primary Facet
    ctx.fillStyle = stbdFill;
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-12, 20);
    ctx.lineTo(-8, 7);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Starboard Wing Panel Seams (Micro-Greebles)
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.lineTo(-6, 14); // Mid-wing panel seam
    ctx.moveTo(2, 3);
    ctx.lineTo(-8, 7); // Elevon hinge line
    ctx.stroke();

    // Starboard Wing Chamfer Bevel Highlight
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + stbdLight * 0.5})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-10, 18);
    ctx.stroke();

    // Military Aeronautical Navigational Beacons
    // Port Wingtip RED Strobe Beacon
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(-11, -19.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.arc(-11, -19.5, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Starboard Wingtip EMERALD Strobe Beacon
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(-11, 19.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.beginPath();
    ctx.arc(-11, 19.5, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // 4. Inboard Engine Intake Nacelle Cowlings with Radiator Louvers
    ctx.fillStyle = portFill;
    ctx.fillRect(-6, -8, 8, 3);
    ctx.fillStyle = stbdFill;
    ctx.fillRect(-6, 5, 8, 3);

    // Dark Intake Openings with Splitter Plate
    ctx.fillStyle = '#020617';
    ctx.fillRect(1.5, -8, 1.6, 3);
    ctx.fillRect(1.5, 5, 1.6, 3);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(1.5, -6.8, 1.6, 0.6); // Port splitter
    ctx.fillRect(1.5, 6.2, 1.6, 0.6); // Starboard splitter

    // Heat Dissipation Radiator Louvers on Nacelles (3 copper micro-slits)
    ctx.fillStyle = '#F59E0B';
    for (let l = 0; l < 3; l++) {
      ctx.fillRect(-4 + l * 2.2, -7.5, 1.0, 2.0);
      ctx.fillRect(-4 + l * 2.2, 5.5, 1.0, 2.0);
    }

    // 5. Center Raised Dorsal Deck & Longitudinal Armor Ridge
    ctx.fillStyle = dorsalFill;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(6, -5);
    ctx.lineTo(-14, -5);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-14, 5);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();

    // Sharp Dorsal Keel Line
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-16, 0);
    ctx.stroke();

    // Glowing Cyan Hull Pylons & Armor Chevron
    ctx.fillStyle = '#00F0FF';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(2, 0);
    ctx.lineTo(0, -3.5);
    ctx.closePath();
    ctx.fill();

    // Bow Forward Targeting Sensor Aperture
    ctx.fillStyle = '#00F0FF';
    ctx.beginPath();
    ctx.arc(23.5, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Dorsal Military White Anti-Collision Strobe (Pulsing 1.0s cycle: 80ms flash)
    const strobeTime = Date.now() % 1000;
    if (strobeTime < 90) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-14, 0, 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(-14, 0, 5.0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.arc(-14, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Raised 3D Cockpit Canopy with Roll & Pitch Parallax
    const canopyParallaxY = roll * 2.8;
    const canopyParallaxX = 1.5 - pitch * 3.5;
    ctx.save();
    ctx.translate(canopyParallaxX, canopyParallaxY);

    // Canopy Titanium Mounting Flange
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8.8, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Pressurized Multi-Facet Viewport Glass
    const canopyGrad = ctx.createLinearGradient(0, -4, 0, 4);
    canopyGrad.addColorStop(0, '#38BDF8');
    canopyGrad.addColorStop(0.5, '#0284C7');
    canopyGrad.addColorStop(1, '#0369A1');
    ctx.fillStyle = canopyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.2, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Internal Holographic Pilot HUD Horizon Reticle
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.moveTo(0, -1.5);
    ctx.lineTo(0, 1.5);
    ctx.stroke();

    // Specular Reflection Gleam (Simulates curved crystalline canopy glint)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(2 - roll * 1.5, -1, 3.2, 1.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

  private drawSynergyLinks(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    if (!engine.synergyLinks || engine.synergyLinks.length === 0) return;

    ctx.save();
    const now = Date.now() * 0.005;

    for (const link of engine.synergyLinks) {
      const isNexus = link.sourceId === 'player';
      const pulse = 0.5 + 0.5 * Math.sin(link.pulsePhase + now);

      // Gradient energy beam
      const grad = ctx.createLinearGradient(link.x1, link.y1, link.x2, link.y2);
      if (isNexus) {
        grad.addColorStop(0, `rgba(0, 240, 255, ${link.alpha * 0.7})`);
        grad.addColorStop(1, `${link.color}${Math.floor(link.alpha * 255).toString(16).padStart(2, '0')}`);
      } else {
        grad.addColorStop(0, `${link.color}${Math.floor(link.alpha * 200).toString(16).padStart(2, '0')}`);
        grad.addColorStop(1, `${link.color}${Math.floor(link.alpha * 255).toString(16).padStart(2, '0')}`);
      }

      // Outer glow beam
      ctx.beginPath();
      ctx.moveTo(link.x1, link.y1);
      ctx.lineTo(link.x2, link.y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = isNexus ? 1.8 + pulse * 1.2 : 1.2 + pulse * 0.8;
      ctx.stroke();

      // Inner high-luminance core filament
      ctx.beginPath();
      ctx.moveTo(link.x1, link.y1);
      ctx.lineTo(link.x2, link.y2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${link.alpha * 0.85})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Traveling photonic nodes along the link
      const nodeCount = isNexus ? 2 : 1;
      for (let n = 0; n < nodeCount; n++) {
        const offset = (now * 0.4 + n / nodeCount) % 1;
        const nx = link.x1 + (link.x2 - link.x1) * offset;
        const ny = link.y1 + (link.y2 - link.y1) * offset;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(nx, ny, 1.2 + pulse * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawDrones(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    for (const drone of engine.player.drones) {
      this.drawSingleDrone(ctx, drone);
    }
  }

  private drawSingleDrone(ctx: CanvasRenderingContext2D, drone: DroneModule) {
    // 3D Staggered Altitude Drop Shadow on coordinate plane
    const dAlt = drone.z || 0;
    const shadowDist = Math.max(4, 9 + dAlt * 0.4);
    const shadowScale = Math.max(0.65, 1.0 - dAlt / 400);
    const shadowAlpha = Math.max(0.08, 0.3 * (1.0 - dAlt / 350));
    ctx.save();
    ctx.translate(drone.x - shadowDist * 0.6, drone.y + shadowDist * 0.6);
    ctx.rotate(drone.angle);
    ctx.scale(shadowScale, shadowScale * 0.7);
    ctx.fillStyle = `rgba(2, 6, 23, ${shadowAlpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(drone.angle);

    // 3D Perspective Foreshortening & Altitude Scaling
    const dAltScale = Math.max(0.8, 1.0 + (drone.z || 0) / 700);
    const bankScaleY = Math.max(0.3, Math.abs(Math.cos(drone.bankAngle || 0)));
    const pitchScaleX = Math.max(0.75, Math.cos(drone.pitch || 0));
    ctx.scale(pitchScaleX * dAltScale, bankScaleY * dAltScale);

    // 1. Dual Main Engine Ion Thruster Flares & Afterburners
    const thrust = drone.thrusterPulse || 0;
    const afterburn = drone.afterburner || 0;
    if (thrust > 0.04 || afterburn > 0.05) {
      ctx.save();
      const flareLen = 5 + thrust * 12 + afterburn * 14;
      const flareWidth = 2.5 + afterburn * 1.5;

      // Twin rear nozzle exhaust flares (Port & Starboard engines)
      const nozzleYOffsets = [-3.5, 3.5];
      for (const ny of nozzleYOffsets) {
        // Outer chromatic flame plume
        ctx.fillStyle = drone.color;
        ctx.globalAlpha = Math.min(0.85, (thrust * 0.7 + afterburn * 0.3) + 0.15);
        ctx.beginPath();
        ctx.moveTo(-8, ny - flareWidth);
        ctx.lineTo(-8 - flareLen, ny);
        ctx.lineTo(-8, ny + flareWidth);
        ctx.closePath();
        ctx.fill();

        // High-temperature white-hot core
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = Math.min(0.95, thrust * 0.9 + afterburn * 0.5);
        ctx.beginPath();
        ctx.moveTo(-8, ny - flareWidth * 0.45);
        ctx.lineTo(-8 - flareLen * 0.55, ny);
        ctx.lineTo(-8, ny + flareWidth * 0.45);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Reaction Control System (RCS) Lateral Gas Plumes
    const rcs = drone.rcsFlare || 0;
    const bank = drone.bankAngle || 0;
    if (rcs > 0.1 || Math.abs(bank) > 0.28) {
      ctx.save();
      ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
      const rcsLen = 3.5 + rcs * 6;
      if (bank > 0.2 || rcs > 0.1) {
        // Port RCS vent firing
        ctx.fillRect(-2, -9 - rcsLen, 1.6, rcsLen);
      }
      if (bank < -0.2 || rcs > 0.1) {
        // Starboard RCS vent firing
        ctx.fillRect(-2, 9, 1.6, rcsLen);
      }
      ctx.restore();
    }

    // 3D Directional Lighting Calculation from Celestial Sun
    const dBank = drone.bankAngle || 0;
    const dPitch = drone.pitch || 0;
    const portDLight = Math.max(0.24, Math.min(1.0, 0.58 - dBank * 0.85 + dPitch * 0.25));
    const stbdDLight = Math.max(0.24, Math.min(1.0, 0.58 + dBank * 0.85 + dPitch * 0.25));
    const dorsalDLight = Math.max(0.35, Math.min(1.0, 0.70 - dPitch * 0.5));

    const portDFill = `rgb(${Math.floor(22 * portDLight + 14)}, ${Math.floor(32 * portDLight + 20)}, ${Math.floor(54 * portDLight + 34)})`;
    const stbdDFill = `rgb(${Math.floor(22 * stbdDLight + 14)}, ${Math.floor(32 * stbdDLight + 20)}, ${Math.floor(54 * stbdDLight + 34)})`;
    const dorsalDFill = `rgb(${Math.floor(30 * dorsalDLight + 20)}, ${Math.floor(44 * dorsalDLight + 28)}, ${Math.floor(72 * dorsalDLight + 46)})`;

    ctx.strokeStyle = drone.color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';

    const kick = drone.barrelKick * 3.5;
    const lvl = drone.level;

    if (drone.type === 'BLASTER') {
      // === 3D PULSE AUTOCANNON POD ===
      // Aft Engine Nozzles
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-11, -5, 3, 3);
      ctx.fillRect(-11, 2, 3, 3);

      // Port Wing Facet
      ctx.fillStyle = portDFill;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-8, -12);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Starboard Wing Facet
      ctx.fillStyle = stbdDFill;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-8, 12);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Raised Center Dorsal Armor Spine
      ctx.fillStyle = dorsalDFill;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(2, -4);
      ctx.lineTo(-8, -3);
      ctx.lineTo(-8, 3);
      ctx.lineTo(2, 4);
      ctx.closePath();
      ctx.fill();

      // Elevated Central Sensor Visor Prism
      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.arc(3, 0, 2.0, 0, Math.PI * 2);
      ctx.fill();

      // Fluted Twin Autocannon Barrels with Recoil & Muzzle Crowns
      ctx.fillStyle = drone.color;
      const bLen = lvl >= 2 ? 8 : 6;
      const bW = lvl >= 2 ? 2.5 : 2.0;
      ctx.fillRect(7 - kick, -7, bLen, bW);
      ctx.fillRect(7 - kick, 5, bLen, bW);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(7 + bLen - kick, -7.5, 1.5, bW + 1);
      ctx.fillRect(7 + bLen - kick, 4.5, 1.5, bW + 1);

      // Level 2+ MK Armored Outer Outriggers
      if (lvl >= 2) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(3, -8);
        ctx.moveTo(-6, 8);
        ctx.lineTo(3, 8);
        ctx.stroke();
      }
    } else if (drone.type === 'SPREAD') {
      // === 3D FLAK SCATTERER POD ===
      // Broad Tri-Wedge Chassis with Faceted Armor
      ctx.fillStyle = portDFill;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-10, -15);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = stbdDFill;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-10, 15);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center Heavy Armored Cap
      ctx.fillStyle = dorsalDFill;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(0, -6);
      ctx.lineTo(-8, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();

      // Lateral Heat Sink Radiator Vents
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-6, -11, 4, 1.5);
      ctx.fillRect(-6, 9.5, 4, 1.5);

      // 3 Stepped Muzzle Ports with Recoil
      ctx.fillStyle = drone.color;
      ctx.fillRect(7 - kick, -6, 6, 2);
      ctx.fillRect(9 - kick, -1.2, 7, 2.4);
      ctx.fillRect(7 - kick, 4, 6, 2);
    } else if (drone.type === 'MISSILE') {
      // === 3D SWARM MISSILE LAUNCH POD ===
      // Faceted Hexagonal Launcher Hull
      ctx.fillStyle = dorsalDFill;
      ctx.beginPath();
      ctx.moveTo(8, -6);
      ctx.lineTo(10, 0);
      ctx.lineTo(8, 6);
      ctx.lineTo(-8, 9);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-8, -9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Recessed Frontal Cell Baffle
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(2, -7, 6, 14);

      // Launch Cells with Conical Warheads
      ctx.fillStyle = drone.color;
      const tubes = lvl >= 3 ? [-5, 0, 5] : [-4, 4];
      for (const ty of tubes) {
        ctx.beginPath();
        ctx.arc(4, ty, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(5.5, ty - 1, 2, 2); // Warhead tip
        ctx.fillStyle = drone.color;
      }
    } else if (drone.type === 'RAILGUN') {
      // === 3D DUAL ELECTROMAGNETIC RAILGUN POD ===
      const chargeRatio = drone.chargeTimer / (drone.maxChargeTimer || 1);
      const recoilOffset = kick * 2.2;

      const jitterX = chargeRatio > 0.2 ? (Math.random() - 0.5) * (chargeRatio * 1.6) : 0;
      const jitterY = chargeRatio > 0.2 ? (Math.random() - 0.5) * (chargeRatio * 1.6) : 0;
      ctx.translate(jitterX - recoilOffset, jitterY);

      // 1. Heavy Armored Breech Chassis with Faceted Shading
      ctx.fillStyle = dorsalDFill;
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

      // 4. Dual Magnetic Acceleration Rails (Metallic Bevel Lines)
      const railGlow = chargeRatio > 0 ? '#FFFFFF' : '#10B981';
      ctx.strokeStyle = railGlow;
      ctx.lineWidth = lvl >= 2 ? 2.2 : 1.8;

      ctx.beginPath();
      ctx.moveTo(2, -3);
      ctx.lineTo(24, -3);
      ctx.moveTo(2, 3);
      ctx.lineTo(24, 3);
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

      // 6. Charging Energy Arcs Between Rails
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
        ctx.arc(24, 0, 2 + chargeRatio * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(24, 0, 1 + chargeRatio * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (drone.type === 'TESLA') {
      // === 3D ARC DISCHARGE COIL ===
      // Toroidal Outer Magnetic Rings
      ctx.fillStyle = dorsalDFill;
      ctx.beginPath();
      ctx.arc(0, 0, lvl >= 3 ? 12 : 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating Inner Capacitor Core
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Directional Ceramic Discharge Prongs
      ctx.fillStyle = '#A855F7';
      const prongR = lvl >= 3 ? 14 : 12;
      for (let p = 0; p < 4; p++) {
        const pAng = (Math.PI / 2) * p + Date.now() * 0.002;
        ctx.beginPath();
        ctx.arc(Math.cos(pAng) * prongR, Math.sin(pAng) * prongR, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
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

    // Synergy Field Halo (rendered when actively linked)
    if (drone.synergyBuff && drone.synergyBuff.activeLinks > 0) {
      const synPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
      ctx.strokeStyle = drone.color;
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.25 + 0.35 * synPulse;
      ctx.beginPath();
      ctx.arc(0, 0, 13 + synPulse * 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Hit flash overlay
    if (drone.hitFlashTimer > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // World-space Health & Shield Pips (rendered only when damaged or shielded)
    if (drone.health < drone.maxHealth || drone.shield < drone.maxShield) {
      ctx.save();
      const barW = 20;
      const barH = 2.5;
      const barX = drone.x - barW / 2;
      const barY = drone.y - 18;

      // Dark background tray
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 4);

      // Hull Health Bar
      const hpRatio = Math.max(0, drone.health / drone.maxHealth);
      ctx.fillStyle = hpRatio > 0.5 ? '#10B981' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      // Shield Bar Layer (slim cyan strip above health)
      if (drone.maxShield > 0) {
        const shieldRatio = Math.max(0, drone.shield / drone.maxShield);
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(barX, barY + barH + 0.5, barW * shieldRatio, 1.5);
      }
      ctx.restore();
    }
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
      // 3D Altitude Drop Shadow on coordinate plane
      const eAlt = enemy.z || 0;
      const shadowDist = Math.max(5, 10 + eAlt * 0.4);
      const shadowScale = Math.max(0.65, 1.0 - eAlt / 450);
      const shadowAlpha = Math.max(0.08, 0.3 * (1.0 - eAlt / 400));
      ctx.save();
      ctx.translate(enemy.x - shadowDist * 0.6, enemy.y + shadowDist * 0.6);
      ctx.rotate(enemy.angle);
      ctx.scale(shadowScale, shadowScale * 0.75);
      ctx.fillStyle = `rgba(2, 6, 23, ${shadowAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius * 0.9, enemy.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.angle);

      // 3D Perspective Foreshortening & Altitude Scaling
      const eAltScale = Math.max(0.8, 1.0 + (enemy.z || 0) / 800);
      const eBankCos = Math.max(0.35, Math.abs(Math.cos(enemy.bankAngle || 0)));
      const ePitchCos = Math.max(0.75, Math.cos(enemy.pitch || 0));
      ctx.scale(ePitchCos * eAltScale, eBankCos * eAltScale);

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

      // 3D Directional Lighting Calculation for Enemy Warships
      const eBank = enemy.bankAngle || 0;
      const ePitch = enemy.pitch || 0;
      const ePortLight = Math.max(0.24, Math.min(1.0, 0.58 - eBank * 0.85 + ePitch * 0.2));
      const eStbdLight = Math.max(0.24, Math.min(1.0, 0.58 + eBank * 0.85 + ePitch * 0.2));
      const eDorsalLight = Math.max(0.35, Math.min(1.0, 0.72 - ePitch * 0.5));

      // Base shading tone by enemy archetype
      let rBase = 180, gBase = 30, bBase = 30; // Hostile Crimson default
      if (enemy.type === 'TITAN_BOSS') {
        rBase = 139; gBase = 92; bBase = 246; // Boss Violet
      } else if (enemy.type === 'CHARGER') {
        rBase = 217; gBase = 119; bBase = 6; // Charge Amber
      } else if (enemy.type === 'SNIPER') {
        rBase = 236; gBase = 72; bBase = 153; // Magenta sniper
      } else if (enemy.type === 'BOMBER') {
        rBase = 168; gBase = 85; bBase = 247; // Heavy purple
      }

      const ePortFill = `rgb(${Math.floor(rBase * 0.16 * ePortLight + 10)}, ${Math.floor(gBase * 0.16 * ePortLight + 8)}, ${Math.floor(bBase * 0.16 * ePortLight + 14)})`;
      const eStbdFill = `rgb(${Math.floor(rBase * 0.16 * eStbdLight + 10)}, ${Math.floor(gBase * 0.16 * eStbdLight + 8)}, ${Math.floor(bBase * 0.16 * eStbdLight + 14)})`;
      const eDorsalFill = `rgb(${Math.floor(rBase * 0.25 * eDorsalLight + 16)}, ${Math.floor(gBase * 0.25 * eDorsalLight + 12)}, ${Math.floor(bBase * 0.25 * eDorsalLight + 22)})`;

      if (enemy.type === 'INTERCEPTOR') {
        // === 3D SWEPT DELTA INTERCEPTOR ===
        // Port Wing Facet
        ctx.fillStyle = isFlashing ? '#FFFFFF' : ePortFill;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-8, -16);
        ctx.lineTo(-14, -12);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Starboard Wing Facet
        ctx.fillStyle = isFlashing ? '#FFFFFF' : eStbdFill;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-8, 16);
        ctx.lineTo(-14, 12);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Raised Centerline Avionics Spine
        ctx.fillStyle = isFlashing ? '#FFFFFF' : eDorsalFill;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(-12, -3);
        ctx.lineTo(-16, 0);
        ctx.lineTo(-12, 3);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        // Twin Forward Plasma Needle Emitters with Cylindrical Mounts
        ctx.fillStyle = enemy.color;
        ctx.fillRect(8, -6, 7, 2.0);
        ctx.fillRect(8, 4, 7, 2.0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(15, -6.5, 1.5, 3.0);
        ctx.fillRect(15, 3.5, 1.5, 3.0);

        // Core Ruby Targeting Sensor Slit
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.ellipse(3, 0, 3.5, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'SHIELD_BEARER') {
        // === 3D HEAVY PHALANX VANGUARD CRUISER ===
        // Heavy Port & Starboard Armor Baffle Slabs
        ctx.fillStyle = isFlashing ? '#FFFFFF' : ePortFill;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(14, -16);
        ctx.lineTo(-12, -18);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isFlashing ? '#FFFFFF' : eStbdFill;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(14, 16);
        ctx.lineTo(-12, 18);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Interlocking Frontal Armor Plate
        ctx.fillStyle = isFlashing ? '#FFFFFF' : eDorsalFill;
        ctx.beginPath();
        ctx.moveTo(16, -10);
        ctx.lineTo(20, 0);
        ctx.lineTo(16, 10);
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fill();

        // Dual Armored Shield Projector Pylons
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(10, -15, 4, 3);
        ctx.fillRect(10, 12, 4, 3);

        // Exposed Rear Thermal Radiator Weakpoint
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.arc(-11, 0, 5.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Projected Frontal Energy Bulwark Barrier (140° forward arc)
        if (enemy.frontalShieldActive !== false) {
          ctx.save();
          const shieldArc = enemy.frontalShieldArc || 2.4;
          const isShieldHit = (enemy.frontalShieldFlash || 0) > 0;
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);

          ctx.fillStyle = isShieldHit
            ? 'rgba(255, 255, 255, 0.4)'
            : `rgba(56, 189, 248, ${0.12 + pulse * 0.08})`;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius + 10, -shieldArc / 2, shieldArc / 2);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = isShieldHit ? '#FFFFFF' : `rgba(56, 189, 248, ${0.75 + pulse * 0.25})`;
          ctx.lineWidth = isShieldHit ? 3.8 : 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius + 10, -shieldArc / 2, shieldArc / 2);
          ctx.stroke();

          const tip1X = Math.cos(-shieldArc / 2) * (enemy.radius + 10);
          const tip1Y = Math.sin(-shieldArc / 2) * (enemy.radius + 10);
          const tip2X = Math.cos(shieldArc / 2) * (enemy.radius + 10);
          const tip2Y = Math.sin(shieldArc / 2) * (enemy.radius + 10);
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(tip1X, tip1Y, 2.2, 0, Math.PI * 2);
          ctx.arc(tip2X, tip2Y, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(10, -14, 1.8, 0, Math.PI * 2);
          ctx.arc(10, 14, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (enemy.type === 'SWARMER') {
        // === 3D CHITINOUS RAZOR BLADE ===
        // Port & Starboard Sickle Carapace Facets
        ctx.fillStyle = isFlashing ? '#FFFFFF' : ePortFill;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -12);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isFlashing ? '#FFFFFF' : eStbdFill;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, 12);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Center Overlapping Dorsal Armor Scale
        ctx.fillStyle = isFlashing ? '#FFFFFF' : eDorsalFill;
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(-8, 0);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        // Pulsating Bio-Plasma Core
        const bioPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01 + enemy.x);
        ctx.fillStyle = `rgba(239, 68, 68, ${0.7 + bioPulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(1, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'SCOUT') {
        // === 3D DIAMOND NEEDLE RECON DART ===
        // Upper Port & Starboard Diamond Facets
        ctx.fillStyle = isFlashing ? '#FFFFFF' : ePortFill;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-12, -15);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isFlashing ? '#FFFFFF' : eStbdFill;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-12, 15);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Longitudinal Dorsal Keel Line
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-14, 0);
        ctx.stroke();

        // Raised Spherical Targeting Eye with Lens Reflection
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(2, 0, 4.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(2, 0, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(3, -1, 1.0, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'CHARGER') {
        // === 3D ARMORED BATTERING RAM CHASSIS ===
        // Port Bow Armor Wedge
        ctx.fillStyle = isFlashing ? '#FFFFFF' : ePortFill;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-14, -18);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Starboard Bow Armor Wedge
        ctx.fillStyle = isFlashing ? '#FFFFFF' : eStbdFill;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-14, 18);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Central Reinforced Impact Keel Plate
        ctx.fillStyle = isFlashing ? '#FFFFFF' : eDorsalFill;
        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.lineTo(8, -7);
        ctx.lineTo(-12, -7);
        ctx.lineTo(-12, 7);
        ctx.lineTo(8, 7);
        ctx.closePath();
        ctx.fill();

        // Amber Hazard Ram Teeth Striping
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(12, -4);
        ctx.lineTo(12, 4);
        ctx.closePath();
        ctx.fill();

        // Heavy Flanking Rocket Boosters
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-16, -14, 5, 6);
        ctx.fillRect(-16, 8, 5, 6);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(-16, -14, 5, 6);
        ctx.strokeRect(-16, 8, 5, 6);
      } else if (enemy.type === 'BOMBER') {
        // === 3D HEAVY OCTAGONAL SIEGE DREADNOUGHT ===
        const r = enemy.radius;

        // 8 Faceted Carapace Outer Armor Segments
        const segCount = 8;
        for (let i = 0; i < segCount; i++) {
          const a1 = (i / segCount) * Math.PI * 2;
          const a2 = ((i + 1) / segCount) * Math.PI * 2;
          const midA = (a1 + a2) / 2;

          const facetLight = Math.max(0.25, Math.min(1.0, 0.58 + Math.cos(midA + eBank) * 0.45));
          ctx.fillStyle = isFlashing
            ? '#FFFFFF'
            : `rgb(${Math.floor(168 * 0.16 * facetLight + 12)}, ${Math.floor(85 * 0.16 * facetLight + 10)}, ${Math.floor(247 * 0.16 * facetLight + 18)})`;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
          ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Recessed Heavy Bomb Bay Launcher Chamber
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Pulsating Internal High-Yield Plasma Ordnance
        const bPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
        ctx.fillStyle = `rgba(168, 85, 247, ${0.5 + bPulse * 0.5})`;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // 4 Corner Maneuvering Nacelles
        for (let n = 0; n < 4; n++) {
          const nAng = (Math.PI / 2) * n + Math.PI / 4;
          const nx = Math.cos(nAng) * (r * 0.85);
          const ny = Math.sin(nAng) * (r * 0.85);
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#A855F7';
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      } else if (enemy.type === 'SNIPER') {
        // === 3D ASYMMETRICAL SPINAL RAIL LANCE ===
        // Extended Primary Magnetic Accelerator Barrel
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-6, -2.5, 34, 5); // 34px elongated spinal rail barrel
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-6, -2.5, 34, 5);

        // Port & Starboard Stabilizing Outriggers
        ctx.fillStyle = isFlashing ? '#FFFFFF' : ePortFill;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-12, -14);
        ctx.lineTo(-16, -10);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isFlashing ? '#FFFFFF' : eStbdFill;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-12, 14);
        ctx.lineTo(-16, 10);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Elevated Emerald Targeting Optics Mast
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(14, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(15, -4.5, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Muzzle Accelerator Rings
        ctx.fillStyle = '#EC4899';
        ctx.fillRect(20, -3.5, 2, 7);
        ctx.fillRect(26, -3.5, 2, 7);
      } else if (enemy.type === 'TITAN_BOSS') {
        // === 3D MONUMENTAL CAPITAL DREADNOUGHT ===
        const r = enemy.radius;
        const now = Date.now() * 0.001;

        // 1. Concentric Rotating Heavy Armor Belt (8 segmented 3D plates)
        const plateCount = 8;
        for (let i = 0; i < plateCount; i++) {
          const a1 = (i / plateCount) * Math.PI * 2 + now * 0.3;
          const a2 = ((i + 0.85) / plateCount) * Math.PI * 2 + now * 0.3;
          const midA = (a1 + a2) / 2;

          const plateLight = Math.max(0.24, Math.min(1.0, 0.58 + Math.cos(midA + eBank) * 0.45));
          ctx.fillStyle = isFlashing
            ? '#FFFFFF'
            : `rgb(${Math.floor(139 * 0.22 * plateLight + 14)}, ${Math.floor(92 * 0.22 * plateLight + 10)}, ${Math.floor(246 * 0.22 * plateLight + 22)})`;
          ctx.strokeStyle = '#8B5CF6';
          ctx.lineWidth = 2.0;

          ctx.beginPath();
          ctx.arc(0, 0, r + 10, a1, a2);
          ctx.arc(0, 0, r * 0.72, a2, a1, true);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // 2. Command Citadel Superstructure Deck
        ctx.fillStyle = isFlashing ? '#FFFFFF' : eDorsalFill;
        ctx.beginPath();
        for (let h = 0; h < 6; h++) {
          const hAng = (h / 6) * Math.PI * 2;
          const hx = Math.cos(hAng) * (r * 0.65);
          const hy = Math.sin(hAng) * (r * 0.65);
          if (h === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 3. Flanking Broadside Heavy Weapon Turrets
        const turretOffsets = [-r * 0.55, r * 0.55];
        for (const ty of turretOffsets) {
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.arc(0, ty, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Dual Turret Barrels
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(4, ty - 2.5, 8, 2);
          ctx.fillRect(4, ty + 0.5, 8, 2);
        }

        // 4. Central Armored Trench & Pulsating Singularity Reactor Core
        ctx.fillStyle = '#090D1A';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        const corePulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.007);
        ctx.fillStyle = `rgba(239, 68, 68, ${0.6 + corePulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Active Energy Shield Ring
      if (enemy.shield && enemy.shield > 0) {
        ctx.save();
        const shieldAlpha = enemy.shieldFlashTimer && enemy.shieldFlashTimer > 0 ? 0.9 : 0.45;
        ctx.strokeStyle = `rgba(56, 189, 248, ${shieldAlpha})`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      // World-space tactical health & shield gauge above enemy hull
      const barW = Math.max(22, enemy.radius * 1.5);
      const barH = 3;
      const barX = enemy.x - barW / 2;
      const barY = enemy.y - enemy.radius - 12;

      ctx.save();
      // Background bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      // HP Fill
      const hpPct = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
      ctx.fillStyle = hpPct > 0.4 ? '#10B981' : hpPct > 0.2 ? '#F59E0B' : '#EF4444';
      ctx.fillRect(barX, barY, barW * hpPct, barH);

      // Shield bar overlay
      if (enemy.maxShield && enemy.maxShield > 0 && enemy.shield && enemy.shield > 0) {
        const shieldPct = Math.max(0, Math.min(1, enemy.shield / enemy.maxShield));
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(barX, barY - 2, barW * shieldPct, 1.5);
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
      } else if (part.shape === 'SHARD') {
        // High-energy crystalline hardlight shield fragment
        ctx.translate(part.x, part.y);
        ctx.rotate(part.rotation || 0);
        ctx.fillStyle = part.color;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        const s = part.size;
        ctx.moveTo(s * 1.5, 0);
        ctx.lineTo(0, s * 0.55);
        ctx.lineTo(-s * 1.2, 0);
        ctx.lineTo(0, -s * 0.55);
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
