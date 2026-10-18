import * as THREE from 'three';

export class CyberScene3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.windowHalfX = window.innerWidth / 2;
    this.windowHalfY = window.innerHeight / 2;
    this.clock = new THREE.Clock();
    this.isEntered = false;
    this.isWarping = false;
    this.warpTimer = 0;

    // Raycasting for interactive 3D crystals
    this.raycaster = new THREE.Raycaster();
    this.mouseCoord = new THREE.Vector2();

    // Shockwaves pool
    this.shockwaves = [];

    this.init();
    this.createLights();
    this.createHoloCore();
    this.createOuterShield();
    this.createSpectrumRing();
    this.createFloatingCrystals();
    this.createParticleStarfield();
    this.createWaveGrid();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 38);
    this.targetCameraZ = 38;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;

    this.container.appendChild(this.renderer.domElement);
  }

  createLights() {
    const ambientLight = new THREE.AmbientLight(0x060b18, 2.5);
    this.scene.add(ambientLight);

    // Interactive cursor light
    this.cursorLight = new THREE.PointLight(0x00f0ff, 5.5, 55);
    this.cursorLight.position.set(0, 0, 10);
    this.scene.add(this.cursorLight);

    // Orbiting rim light
    this.rimLight = new THREE.PointLight(0xd946ef, 4.5, 60);
    this.rimLight.position.set(0, -6, -10);
    this.scene.add(this.rimLight);

    // Core central glow light
    this.coreLight = new THREE.PointLight(0x00e5ff, 3.5, 25);
    this.coreLight.position.set(0, 0, 0);
    this.scene.add(this.coreLight);
  }

  createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(0, 240, 255, 0.9)');
    grad.addColorStop(0.65, 'rgba(0, 188, 212, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  createHoloCore() {
    this.coreGroup = new THREE.Group();
    this.coreGroup.position.set(0, 0.5, -1);

    // 1. Inner Wireframe Icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(2.5, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.55
    });
    this.innerIco = new THREE.Mesh(icoGeo, icoMat);
    this.coreGroup.add(this.innerIco);

    // 2. Glowing Inner Core Nucleus
    const nucleusGeo = new THREE.SphereGeometry(1.1, 16, 16);
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0xd946ef,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    this.nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    this.coreGroup.add(this.nucleus);

    // 3. Orbiting Holographic Rings
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    const ringGeo1 = new THREE.TorusGeometry(3.8, 0.045, 16, 90);
    this.ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    this.ring1.rotation.x = Math.PI / 3;
    this.coreGroup.add(this.ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    const ringGeo2 = new THREE.TorusGeometry(4.8, 0.035, 16, 90);
    this.ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    this.ring2.rotation.y = Math.PI / 4;
    this.ring2.rotation.x = -Math.PI / 5;
    this.coreGroup.add(this.ring2);

    // 4. Concentric Flat Cyber Ring
    const flatRingGeo = new THREE.RingGeometry(5.4, 5.5, 64);
    const flatRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    this.flatRing = new THREE.Mesh(flatRingGeo, flatRingMat);
    this.flatRing.rotation.x = Math.PI / 2;
    this.coreGroup.add(this.flatRing);

    // 5. Orbiting Satellites / Quantum Nodes
    this.satellites = [];
    const satCount = 8;
    for (let i = 0; i < satCount; i++) {
      const satGeo = new THREE.OctahedronGeometry(0.2);
      const satMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00f0ff : 0xd946ef,
        wireframe: false
      });
      const sat = new THREE.Mesh(satGeo, satMat);
      sat.userData = {
        radius: 5.2 + (i * 0.35),
        speed: 0.75 + (i * 0.2),
        offset: (i * Math.PI * 2) / satCount,
        inclination: (i * Math.PI) / 3.5
      };
      this.coreGroup.add(sat);
      this.satellites.push(sat);
    }

    this.scene.add(this.coreGroup);
  }

  createOuterShield() {
    const shieldGeo = new THREE.IcosahedronGeometry(7.5, 2);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldMesh.position.set(0, 0, -2);
    this.scene.add(this.shieldMesh);
  }

  // 3D Audio-Reactive Spectrum Ring (48 pulsating 3D vertical bars)
  createSpectrumRing() {
    this.spectrumBars = [];
    this.spectrumGroup = new THREE.Group();
    const barCount = 48;
    const radius = 6.2;

    const barGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const barMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00f0ff : 0xd946ef,
        transparent: true,
        opacity: 0.65
      });
      const bar = new THREE.Mesh(barGeo, barMat);

      bar.position.x = Math.cos(angle) * radius;
      bar.position.z = Math.sin(angle) * radius;
      bar.position.y = 0;
      bar.lookAt(0, 0, 0);

      bar.userData = {
        baseAngle: angle,
        speed: 1.5 + (i % 5) * 0.4,
        scaleFactor: 1
      };

      this.spectrumGroup.add(bar);
      this.spectrumBars.push(bar);
    }

    this.spectrumGroup.position.set(0, 0.5, -1);
    this.spectrumGroup.rotation.x = Math.PI / 6;
    this.scene.add(this.spectrumGroup);
  }

  // Interactive Floating 3D Tech Crystals
  createFloatingCrystals() {
    this.crystals = [];
    const crystalConfigs = [
      { geo: new THREE.OctahedronGeometry(0.9, 0), pos: [-10, 4, -4], rotSpeed: 0.015, color: 0x00f0ff },
      { geo: new THREE.TetrahedronGeometry(0.85, 0), pos: [11, 5, -5], rotSpeed: -0.018, color: 0xd946ef },
      { geo: new THREE.DodecahedronGeometry(0.8, 0), pos: [-11, -4, -6], rotSpeed: 0.02, color: 0x38bdf8 },
      { geo: new THREE.OctahedronGeometry(1.0, 0), pos: [10, -5, -4], rotSpeed: -0.014, color: 0x00f0ff }
    ];

    crystalConfigs.forEach((cfg, idx) => {
      const group = new THREE.Group();
      group.position.set(...cfg.pos);

      // Wireframe exterior
      const wireMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        wireframe: true,
        transparent: true,
        opacity: 0.7
      });
      const wireMesh = new THREE.Mesh(cfg.geo, wireMat);
      group.add(wireMesh);

      // Inner glowing core
      const innerMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.25
      });
      const innerMesh = new THREE.Mesh(cfg.geo, innerMat);
      innerMesh.scale.set(0.65, 0.65, 0.65);
      group.add(innerMesh);

      group.userData = {
        rotSpeed: cfg.rotSpeed,
        baseY: cfg.pos[1],
        floatSpeed: 1.2 + idx * 0.3,
        idx
      };

      this.scene.add(group);
      this.crystals.push(group);
    });
  }

  // Click Shockwave Burst
  spawnShockwave(x, y) {
    const shockGeo = new THREE.RingGeometry(0.2, 0.35, 64);
    const shockMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const shockMesh = new THREE.Mesh(shockGeo, shockMat);
    shockMesh.position.set(x, y, 4);

    this.scene.add(shockMesh);
    this.shockwaves.push({
      mesh: shockMesh,
      scale: 1,
      opacity: 0.9
    });
  }

  createParticleStarfield() {
    this.particleCount = 2800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    const colorChoices = [
      new THREE.Color(0x00f0ff),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xd946ef),
      new THREE.Color(0xa855f7)
    ];

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const radius = 12 + Math.random() * 55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = (Math.random() - 0.5) * 45;
      positions[i3 + 2] = (Math.random() - 0.5) * 85;

      const col = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.78,
      map: this.createParticleTexture(),
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  createWaveGrid() {
    const gridWidth = 90;
    const gridHeight = 90;
    const segments = 45;

    this.gridGeo = new THREE.PlaneGeometry(gridWidth, gridHeight, segments, segments);
    this.gridMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.16
    });

    this.gridMesh = new THREE.Mesh(this.gridGeo, this.gridMat);
    this.gridMesh.rotation.x = -Math.PI / 2;
    this.gridMesh.position.y = -9;
    this.scene.add(this.gridMesh);
  }

  setupEvents() {
    window.addEventListener('resize', () => this.onWindowResize(), false);

    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX - this.windowHalfX) / this.windowHalfX;
      this.mouse.targetY = (e.clientY - this.windowHalfY) / this.windowHalfY;

      this.mouseCoord.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseCoord.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('click', (e) => {
      const worldX = (e.clientX / window.innerWidth) * 20 - 10;
      const worldY = -(e.clientY / window.innerHeight) * 16 + 8;
      this.spawnShockwave(worldX, worldY);
    });

    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma !== null && e.beta !== null) {
        this.mouse.targetX = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
        this.mouse.targetY = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
      }
    });
  }

  onWindowResize() {
    this.windowHalfX = window.innerWidth / 2;
    this.windowHalfY = window.innerHeight / 2;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    const isMobile = window.innerWidth < 640;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

    if (this.isEntered) {
      this.targetCameraZ = isMobile ? 17.5 : 13.8;
    }
  }

  enterScene() {
    this.isEntered = true;
    this.isWarping = true;
    this.warpTimer = 1.4;
    this.targetCameraZ = window.innerWidth < 640 ? 17.5 : 13.8;
  }

  setTheme(palette) {
    if (palette === 'emerald') {
      this.innerIco.material.color.setHex(0x10b981);
      this.ring1.material.color.setHex(0x34d399);
      this.flatRing.material.color.setHex(0x10b981);
      this.cursorLight.color.setHex(0x10b981);
      this.coreLight.color.setHex(0x34d399);
      this.shieldMat.color.setHex(0x10b981);
      this.gridMat.color.setHex(0x059669);
    } else if (palette === 'magenta') {
      this.innerIco.material.color.setHex(0xd946ef);
      this.ring1.material.color.setHex(0xf43f5e);
      this.flatRing.material.color.setHex(0xd946ef);
      this.cursorLight.color.setHex(0xd946ef);
      this.coreLight.color.setHex(0xf43f5e);
      this.shieldMat.color.setHex(0xa855f7);
      this.gridMat.color.setHex(0xa855f7);
    } else {
      this.innerIco.material.color.setHex(0x00f0ff);
      this.ring1.material.color.setHex(0x00e5ff);
      this.flatRing.material.color.setHex(0x00f0ff);
      this.cursorLight.color.setHex(0x00f0ff);
      this.coreLight.color.setHex(0x00e5ff);
      this.shieldMat.color.setHex(0x00f0ff);
      this.gridMat.color.setHex(0x00e5ff);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    this.camera.position.z += (this.targetCameraZ - this.camera.position.z) * (this.isWarping ? 0.08 : 0.045);
    this.camera.position.x += (this.mouse.x * 3.0 - this.camera.position.x) * 0.04;
    this.camera.position.y += (-this.mouse.y * 2.2 - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 0, 0);

    if (this.cursorLight) {
      this.cursorLight.position.x = this.mouse.x * 15;
      this.cursorLight.position.y = -this.mouse.y * 12;
    }

    if (this.rimLight) {
      this.rimLight.position.x = Math.sin(elapsedTime * 0.75) * 17;
      this.rimLight.position.z = Math.cos(elapsedTime * 0.75) * 15;
    }

    // Core rotations
    if (this.coreGroup) {
      this.innerIco.rotation.x = elapsedTime * 0.38;
      this.innerIco.rotation.y = elapsedTime * 0.48;

      this.nucleus.rotation.y = -elapsedTime * 0.7;

      this.ring1.rotation.z = elapsedTime * 0.55;
      this.ring1.rotation.y = elapsedTime * 0.28;

      this.ring2.rotation.z = -elapsedTime * 0.45;
      this.ring2.rotation.x = elapsedTime * 0.35;

      this.flatRing.rotation.z = elapsedTime * 0.2;

      this.satellites.forEach((sat) => {
        const angle = elapsedTime * sat.userData.speed + sat.userData.offset;
        sat.position.x = Math.cos(angle) * sat.userData.radius;
        sat.position.z = Math.sin(angle) * sat.userData.radius;
        sat.position.y = Math.sin(angle * 2) * Math.sin(sat.userData.inclination) * 1.6;
        sat.rotation.x += 0.02;
        sat.rotation.y += 0.03;
      });

      this.coreGroup.position.y = 0.5 + Math.sin(elapsedTime * 1.3) * 0.3;
    }

    // Spectrum Bars Dancing
    if (this.spectrumBars && this.spectrumGroup) {
      this.spectrumGroup.rotation.y = elapsedTime * 0.15;
      this.spectrumBars.forEach((bar, idx) => {
        const wave = Math.sin(elapsedTime * 3.0 + idx * 0.3) * 0.5 + 0.5;
        const scaleY = 0.5 + wave * 3.5;
        bar.scale.y = scaleY;
        bar.position.y = (scaleY * 0.6) / 2;
      });
    }

    // Floating Crystals
    if (this.crystals) {
      this.crystals.forEach((cry) => {
        cry.rotation.x += cry.userData.rotSpeed;
        cry.rotation.y += cry.userData.rotSpeed * 1.3;
        cry.position.y = cry.userData.baseY + Math.sin(elapsedTime * cry.userData.floatSpeed) * 0.6;
      });
    }

    // Shockwaves Expansion and Fade
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.scale += delta * 18;
      sw.opacity -= delta * 1.4;
      sw.mesh.scale.set(sw.scale, sw.scale, 1);
      sw.mesh.material.opacity = Math.max(0, sw.opacity);

      if (sw.opacity <= 0) {
        this.scene.remove(sw.mesh);
        this.shockwaves.splice(i, 1);
      }
    }

    // Shield rotation
    if (this.shieldMesh) {
      this.shieldMesh.rotation.y = elapsedTime * 0.06;
      this.shieldMesh.rotation.x = Math.sin(elapsedTime * 0.04) * 0.1;
    }

    // Particle Starfield with Warp Speed
    if (this.particleSystem) {
      const posAttr = this.particleSystem.geometry.attributes.position;
      const count = posAttr.count;

      if (this.isWarping) {
        this.warpTimer -= delta;
        if (this.warpTimer <= 0) {
          this.isWarping = false;
        }
        for (let i = 0; i < count; i++) {
          let z = posAttr.getZ(i) + delta * 80;
          if (z > 40) z = -40;
          posAttr.setZ(i, z);
        }
        posAttr.needsUpdate = true;
      } else {
        this.particleSystem.rotation.y = elapsedTime * 0.035;
        this.particleSystem.rotation.x = Math.sin(elapsedTime * 0.02) * 0.04;
      }
    }

    // Grid Wave
    if (this.gridGeo) {
      const posAttr = this.gridGeo.attributes.position;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        const u = posAttr.getX(i);
        const v = posAttr.getY(i);
        const wave = Math.sin(u * 0.18 + elapsedTime * 1.6) * Math.cos(v * 0.18 + elapsedTime * 1.6) * 0.7;
        posAttr.setZ(i, wave);
      }
      posAttr.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
