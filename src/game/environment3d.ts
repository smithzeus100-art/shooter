import * as THREE from 'three';
import { GameEngine } from './engine';

export class Environment3D {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private starPoints: THREE.Points | null = null;
  private planetMesh: THREE.Mesh | null = null;
  private ringMesh: THREE.Mesh | null = null;
  private asteroidMesh: THREE.InstancedMesh | null = null;
  private playerPointLight: THREE.PointLight | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private dummy = new THREE.Object3D();

  private asteroidData: Array<{
    x: number;
    y: number;
    z: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    rotSpeedX: number;
    rotSpeedY: number;
    rotSpeedZ: number;
    scale: number;
  }> = [];

  private isInitialized = false;

  public init(container: HTMLElement, width: number, height: number): void {
    if (this.isInitialized) return;

    // 1. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x020617, 1);
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    // 2. Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.00035);
    this.scene = scene;

    // 3. Perspective Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 10, 9000);
    camera.position.set(0, 0, 1100);
    this.camera = camera;

    // 4. Directional Sun & Ambient Celestial Lighting
    const ambientLight = new THREE.AmbientLight(0x0a1628, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xe0f2fe, 1.35);
    sunLight.position.set(1200, 1800, 1500);
    scene.add(sunLight);

    // Dynamic Player Engine Glow Point Light
    const playerLight = new THREE.PointLight(0x00f0ff, 1.8, 550);
    scene.add(playerLight);
    this.playerPointLight = playerLight;

    // 5. Deep Space Procedural Starfield (2,400 points)
    const starCount = 2400;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x00f0ff),
      new THREE.Color(0xf59e0b),
      new THREE.Color(0xa855f7),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      starPositions[idx] = (Math.random() - 0.5) * 8000;
      starPositions[idx + 1] = (Math.random() - 0.5) * 6000;
      starPositions[idx + 2] = -Math.random() * 4500 - 400;

      const col = palette[Math.floor(Math.random() * palette.length)];
      starColors[idx] = col.r;
      starColors[idx + 1] = col.g;
      starColors[idx + 2] = col.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);
    this.starPoints = starPoints;

    // 6. Ringed Gas Giant Planet in Deep Celestial Backdrop
    const planetCanvas = document.createElement('canvas');
    planetCanvas.width = 512;
    planetCanvas.height = 256;
    const pCtx = planetCanvas.getContext('2d');
    if (pCtx) {
      // Atmospheric gradient bands
      const grad = pCtx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.2, '#1e293b');
      grad.addColorStop(0.35, '#0284c7');
      grad.addColorStop(0.5, '#0369a1');
      grad.addColorStop(0.68, '#0c4a6e');
      grad.addColorStop(0.85, '#1e293b');
      grad.addColorStop(1.0, '#0f172a');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 512, 256);

      // Procedural storm turbulence bands
      pCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let y = 30; y < 230; y += 14) {
        pCtx.fillRect(0, y, 512, 4 + Math.sin(y) * 3);
      }
    }

    const planetTex = new THREE.CanvasTexture(planetCanvas);
    const planetGeo = new THREE.SphereGeometry(320, 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTex,
      roughness: 0.75,
      metalness: 0.1,
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetMesh.position.set(1600, -700, -3200);
    planetMesh.rotation.z = 0.35;
    scene.add(planetMesh);
    this.planetMesh = planetMesh;

    // Planetary Ring System
    const ringGeo = new THREE.RingGeometry(420, 680, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.32,
      roughness: 0.6,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(planetMesh.position);
    ringMesh.rotation.x = Math.PI / 2.3;
    ringMesh.rotation.y = 0.25;
    scene.add(ringMesh);
    this.ringMesh = ringMesh;

    // 7. Volumetric Asteroid Belt (InstancedMesh, 140 tumbling low-poly asteroids)
    const asteroidCount = 140;
    const astGeo = new THREE.DodecahedronGeometry(18, 1);
    // Deform vertices for natural rugged silhouette
    const posAttr = astGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const noise = 0.85 + Math.random() * 0.3;
      posAttr.setXYZ(i, vx * noise, vy * noise, vz * noise);
    }
    astGeo.computeVertexNormals();

    const astMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.2,
      flatShading: true,
    });

    const asteroidMesh = new THREE.InstancedMesh(astGeo, astMat, asteroidCount);
    this.asteroidData = [];

    for (let i = 0; i < asteroidCount; i++) {
      const x = (Math.random() - 0.5) * 4400;
      const y = (Math.random() - 0.5) * 3200;
      const z = -Math.random() * 1100 - 150;
      const scale = 0.4 + Math.random() * 1.6;

      this.asteroidData.push({
        x,
        y,
        z,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        rotSpeedX: (Math.random() - 0.5) * 0.6,
        rotSpeedY: (Math.random() - 0.5) * 0.8,
        rotSpeedZ: (Math.random() - 0.5) * 0.5,
        scale,
      });

      this.dummy.position.set(x, y, z);
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.dummy.updateMatrix();
      asteroidMesh.setMatrixAt(i, this.dummy.matrix);
    }
    asteroidMesh.instanceMatrix.needsUpdate = true;
    scene.add(asteroidMesh);
    this.asteroidMesh = asteroidMesh;

    // 8. Spatial Coordinate Depth Grid Plane
    const gridHelper = new THREE.GridHelper(5000, 50, 0x0369a1, 0x0f172a);
    gridHelper.position.set(0, 0, -420);
    gridHelper.rotation.x = Math.PI / 2;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.18;
    scene.add(gridHelper);
    this.gridHelper = gridHelper;

    this.isInitialized = true;
  }

  public update(engine: GameEngine, dt: number): void {
    if (!this.isInitialized || !this.renderer || !this.scene || !this.camera) return;

    const camX = engine.camera.x;
    const camY = engine.camera.y;
    const p = engine.player;

    // 1. Camera Tracking with Parallax & Dynamic Flight Tilt
    // 3D camera tracks player coordinate with realistic depth parallax
    this.camera.position.x = camX * 0.45;
    this.camera.position.y = -camY * 0.45;

    if (p) {
      // Dynamic 3D tilt and pitch based on lead ship velocity and lateral banking
      const targetRotX = p.vy * 0.0025;
      const targetRotY = p.vx * 0.0025;
      const lateralVel = -Math.sin(p.angle) * p.vx + Math.cos(p.angle) * p.vy;
      const targetRotZ = lateralVel * 0.018;

      this.camera.rotation.x += (targetRotX - this.camera.rotation.x) * Math.min(1.0, dt * 6);
      this.camera.rotation.y += (targetRotY - this.camera.rotation.y) * Math.min(1.0, dt * 6);
      this.camera.rotation.z += (targetRotZ - this.camera.rotation.z) * Math.min(1.0, dt * 6);

      // Dynamic engine point light follows flagship in 3D coordinate space
      if (this.playerPointLight) {
        this.playerPointLight.position.set(camX * 0.45, -camY * 0.45, 120);
        this.playerPointLight.intensity = 1.4 + Math.random() * 0.4;
      }
    }

    // 2. Rotate Celestial Planet
    if (this.planetMesh) {
      this.planetMesh.rotation.y += dt * 0.02;
    }

    // 3. Coordinate Grid Parallax alignment
    if (this.gridHelper) {
      const gridSize = 100;
      this.gridHelper.position.x = Math.floor((camX * 0.45) / gridSize) * gridSize;
      this.gridHelper.position.y = Math.floor((-camY * 0.45) / gridSize) * gridSize;
    }

    // 4. Animate Tumbling 3D Asteroids
    if (this.asteroidMesh && this.asteroidData.length > 0) {
      for (let i = 0; i < this.asteroidData.length; i++) {
        const d = this.asteroidData[i];
        d.rotX += d.rotSpeedX * dt;
        d.rotY += d.rotSpeedY * dt;
        d.rotZ += d.rotSpeedZ * dt;

        // Wrap asteroids relative to camera to maintain dense 3D belt
        const relX = ((d.x - camX * 0.45 + 2200) % 4400 + 4400) % 4400 - 2200 + camX * 0.45;
        const relY = ((d.y + camY * 0.45 + 1600) % 3200 + 3200) % 3200 - 1600 - camY * 0.45;

        this.dummy.position.set(relX, relY, d.z);
        this.dummy.scale.set(d.scale, d.scale, d.scale);
        this.dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
        this.dummy.updateMatrix();

        this.asteroidMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.asteroidMesh.instanceMatrix.needsUpdate = true;
    }

    // Render WebGL frame
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    if (this.renderer && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
    this.isInitialized = false;
  }
}
