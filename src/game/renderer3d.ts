import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getWorldById } from './catalog';
import {
  BlockyCharacterRig,
  animateCharacterRig,
  buildBlockyCharacter,
  buildBlockyMonster,
} from './characterMesh3d';
import {
  CharacterId,
  EquippedCostume,
  GraphicsQuality,
  LevelSimulation,
  WeaponId,
} from './types';

export function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function makeBlockTexture(baseColor: string, accentColor: string, maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 60, 60);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(6, 6, 22, 22);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(34, 34, 22, 22);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export class MazeRenderer3D {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly isSoftwareGl: boolean;

  private playerRig: BlockyCharacterRig;
  private shieldBubble: THREE.Mesh;
  private monsterMeshes = new Map<string, THREE.Group>();
  private itemMeshes = new Map<string, THREE.Object3D>();
  private projMeshes = new Map<string, THREE.Mesh>();
  private shockwaveMeshes = new Map<string, THREE.Mesh>();
  private boulderMeshes = new Map<string, THREE.Mesh>();
  private rockMeshes = new Map<string, THREE.Group>();
  private spikeMeshes: THREE.Group[] = [];
  private lockedDoorMeshes = new Map<string, THREE.Group>();
  private particlePool: THREE.Mesh[] = [];
  private doorMesh: THREE.Mesh | null = null;
  private movingWallMeshes: THREE.Mesh[] = [];
  private checkpointFlag: THREE.Mesh | null = null;
  private exitRing: THREE.Mesh | null = null;
  private envTextures: THREE.Texture[] = [];
  private disposableGeos: THREE.BufferGeometry[] = [];
  private disposableMats: THREE.Material[] = [];

  private camPos = new THREE.Vector3(0, 8, 8);
  private camLook = new THREE.Vector3(0, 0.8, 0);

  constructor(
    container: HTMLElement,
    sim: LevelSimulation,
    characterId: CharacterId,
    costume: EquippedCostume,
    weaponId: WeaponId,
    quality: GraphicsQuality
  ) {
    this.isSoftwareGl = detectSoftwareWebGL();
    const world = getWorldById(sim.worldId);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && quality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    const dprCap = quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, dprCap));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(world.skyColor);
    this.scene.fog = sim.levelData.isFoggy
      ? new THREE.Fog(0x064e3b, 6, 15)
      : new THREE.Fog(world.fogColor, 14, 38);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = envRT.texture;
    this.envTextures.push(envRT.texture);
    pmrem.dispose();

    const aspect = (container.clientWidth || 800) / (container.clientHeight || 600);
    this.camera = new THREE.PerspectiveCamera(54, aspect, 0.1, 120);

    const hemi = new THREE.HemisphereLight(world.skyColor, world.wallColor, 0.72);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    keyLight.position.set(12, 18, 12);
    if (this.renderer.shadowMap.enabled) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = quality === 'high' ? 2048 : 1024;
      keyLight.shadow.mapSize.height = quality === 'high' ? 2048 : 1024;
      const d = 15;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
    rimLight.position.set(-10, 8, -10);
    this.scene.add(rimLight);

    const outerColor =
      sim.worldId === 5 ? 0x93c5fd : sim.worldId === 2 ? 0x7c2d12 : sim.worldId === 1 ? 0x0284c7 : world.wallColor;
    const outerGeo = new THREE.PlaneGeometry(140, 140);
    const outerMat = new THREE.MeshStandardMaterial({ color: outerColor, roughness: 0.9 });
    const outerPlane = new THREE.Mesh(outerGeo, outerMat);
    outerPlane.rotation.x = -Math.PI / 2;
    outerPlane.position.set(sim.levelData.width / 2, -0.35, sim.levelData.height / 2);
    outerPlane.receiveShadow = true;
    this.scene.add(outerPlane);
    this.disposableGeos.push(outerGeo);
    this.disposableMats.push(outerMat);

    this.buildMazeWorld(sim);

    this.playerRig = buildBlockyCharacter(characterId, costume, weaponId);
    this.playerRig.group.position.set(sim.player.x, sim.player.y, sim.player.z);
    this.scene.add(this.playerRig.group);

    const shGeo = new THREE.SphereGeometry(0.78, 14, 14);
    const shMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      roughness: 0.1,
      depthWrite: false,
    });
    this.shieldBubble = new THREE.Mesh(shGeo, shMat);
    this.shieldBubble.position.y = 0.75;
    this.shieldBubble.visible = false;
    this.playerRig.group.add(this.shieldBubble);
    this.disposableGeos.push(shGeo);
    this.disposableMats.push(shMat);

    for (const m of sim.monsters) {
      const grp = buildBlockyMonster(m.kind, m.isBoss);
      grp.position.set(m.x, m.y, m.z);
      this.scene.add(grp);
      this.monsterMeshes.set(m.id, grp);
    }

    this.buildItems(sim);

    // Rolling Boulders
    const boulderGeo = new THREE.DodecahedronGeometry(0.42, 1);
    const boulderMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 });
    this.disposableGeos.push(boulderGeo);
    this.disposableMats.push(boulderMat);
    for (const b of sim.boulders) {
      const bm = new THREE.Mesh(boulderGeo, boulderMat);
      bm.position.set(b.x, 0.42, b.z);
      bm.castShadow = true;
      this.scene.add(bm);
      this.boulderMeshes.set(b.id, bm);
    }

    // Falling Rocks
    const rockGeo = new THREE.DodecahedronGeometry(0.38, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 });
    const warnGeo = new THREE.RingGeometry(0.25, 0.42, 16);
    const warnMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    this.disposableGeos.push(rockGeo, warnGeo);
    this.disposableMats.push(rockMat, warnMat);

    for (const r of sim.fallingRocks) {
      const grp = new THREE.Group();
      const rockMesh = new THREE.Mesh(rockGeo, rockMat);
      rockMesh.name = 'rock';
      rockMesh.position.set(r.x, r.y, r.z);
      const warnMesh = new THREE.Mesh(warnGeo, warnMat);
      warnMesh.name = 'warn';
      warnMesh.rotation.x = -Math.PI / 2;
      warnMesh.position.set(r.x, 0.03, r.z);
      grp.add(rockMesh, warnMesh);
      this.scene.add(grp);
      this.rockMeshes.set(r.id, grp);
    }

    const pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    this.disposableGeos.push(pGeo);
    for (let i = 0; i < 40; i++) {
      const pm = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      pm.visible = false;
      this.scene.add(pm);
      this.particlePool.push(pm);
      this.disposableMats.push(pm.material);
    }

    this.camPos.set(sim.player.x, 6.4, sim.player.z + 6.6);
    this.camLook.set(sim.player.x, 0.8, sim.player.z);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildMazeWorld(sim: LevelSimulation): void {
    const world = getWorldById(sim.worldId);
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const { width, height, tiles } = sim.levelData;

    const wallTex = makeBlockTexture(world.wallColor, world.wallTopColor, maxAniso);
    const floorTex = makeBlockTexture(world.floorColor, 'rgba(0,0,0,0.12)', maxAniso);
    this.envTextures.push(wallTex, floorTex);

    const wallGeo = new THREE.BoxGeometry(1, 1.35, 1);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.75, metalness: 0.05 });

    const floorGeo = new THREE.BoxGeometry(1, 0.25, 1);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 });

    const bridgeMat = new THREE.MeshStandardMaterial({ color: sim.worldId === 2 ? 0xea580c : 0x92400e, roughness: 0.7 });
    const lavaMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.7, roughness: 0.3 });
    const iceMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.12, metalness: 0.2 });
    const treasureMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.4 });
    const spikeGeo = new THREE.ConeGeometry(0.09, 0.42, 4);
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.25 });

    this.disposableGeos.push(wallGeo, floorGeo, spikeGeo);
    this.disposableMats.push(wallMat, floorMat, bridgeMat, lavaMat, iceMat, treasureMat, spikeMat);

    const wallCoords: [number, number][] = [];
    const floorCoords: [number, number][] = [];
    const dummy = new THREE.Object3D();

    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const t = tiles[z][x];
        if (t === 'void') continue;
        if (t === 'wall') {
          wallCoords.push([x, z]);
        } else {
          floorCoords.push([x, z]);
        }

        if (t === 'bridge') {
          const b = new THREE.Mesh(floorGeo, bridgeMat);
          b.position.set(x, -0.05, z);
          b.receiveShadow = true;
          this.scene.add(b);
        } else if (t === 'treasure_floor') {
          const tr = new THREE.Mesh(floorGeo, treasureMat);
          tr.position.set(x, -0.06, z);
          tr.receiveShadow = true;
          this.scene.add(tr);
        } else if (t === 'lava') {
          const l = new THREE.Mesh(floorGeo, lavaMat);
          l.position.set(x, -0.1, z);
          this.scene.add(l);
        } else if (t === 'spike_trap') {
          const sGrp = new THREE.Group();
          for (const [ox, oz] of [
            [-0.2, -0.2],
            [0.2, -0.2],
            [-0.2, 0.2],
            [0.2, 0.2],
          ]) {
            const sp = new THREE.Mesh(spikeGeo, spikeMat);
            sp.position.set(ox, 0.15, oz);
            sGrp.add(sp);
          }
          sGrp.position.set(x, 0, z);
          this.scene.add(sGrp);
          this.spikeMeshes.push(sGrp);
        } else if (t === 'locked_door') {
          const dGrp = new THREE.Group();
          const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
          const lockMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.2 });
          const doorBlock = new THREE.Mesh(wallGeo, doorMat);
          doorBlock.position.y = 0.65;
          const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.08), lockMat);
          lockPlate.position.y = 0.7;
          dGrp.add(doorBlock, lockPlate);
          dGrp.position.set(x, 0, z);
          this.scene.add(dGrp);
          this.lockedDoorMeshes.set(`${x},${z}`, dGrp);
          this.disposableMats.push(doorMat, lockMat);
        } else if (t === 'ice') {
          const ic = new THREE.Mesh(floorGeo, iceMat);
          ic.position.set(x, -0.08, z);
          ic.receiveShadow = true;
          this.scene.add(ic);
        } else if (t === 'secret_door') {
          const dMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.4 });
          const dm = new THREE.Mesh(wallGeo, dMat);
          dm.position.set(x, 0.65, z);
          this.scene.add(dm);
          this.doorMesh = dm;
          this.disposableMats.push(dMat);
        } else if (t === 'secret_switch') {
          const swGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.18, 10);
          const swMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.5 });
          const sw = new THREE.Mesh(swGeo, swMat);
          sw.position.set(x, 0.1, z);
          this.scene.add(sw);
          this.disposableGeos.push(swGeo);
          this.disposableMats.push(swMat);
        } else if (t === 'secret_passage') {
          const spMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.32 });
          const sp = new THREE.Mesh(wallGeo, spMat);
          sp.position.set(x, 0.65, z);
          this.scene.add(sp);
          this.disposableMats.push(spMat);
        } else if (t === 'moving_wall') {
          const mwMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.4, metalness: 0.3 });
          const mw = new THREE.Mesh(wallGeo, mwMat);
          mw.position.set(x, 0.65, z);
          this.scene.add(mw);
          this.movingWallMeshes.push(mw);
          this.disposableMats.push(mwMat);
        } else if (t === 'checkpoint') {
          const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8);
          const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.set(x, 0.7, z);
          const flagGeo = new THREE.BoxGeometry(0.45, 0.28, 0.06);
          const flagMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
          const flag = new THREE.Mesh(flagGeo, flagMat);
          flag.position.set(x + 0.22, 1.2, z);
          this.scene.add(pole, flag);
          this.checkpointFlag = flag;
          this.disposableGeos.push(poleGeo, flagGeo);
          this.disposableMats.push(poleMat, flagMat);
        } else if (t === 'exit') {
          const ringGeo = new THREE.TorusGeometry(0.45, 0.1, 10, 20);
          const ringMat = new THREE.MeshStandardMaterial({
            color: 0xfacc15,
            emissive: 0xca8a04,
            emissiveIntensity: 0.6,
            metalness: 0.6,
            roughness: 0.2,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.set(x, 0.75, z);
          this.scene.add(ring);
          this.exitRing = ring;
          this.disposableGeos.push(ringGeo);
          this.disposableMats.push(ringMat);
        }
      }
    }

    if (wallCoords.length > 0) {
      const wallInst = new THREE.InstancedMesh(wallGeo, wallMat, wallCoords.length);
      wallInst.castShadow = true;
      wallInst.receiveShadow = true;
      wallCoords.forEach(([x, z], i) => {
        dummy.position.set(x, 0.675, z);
        dummy.updateMatrix();
        wallInst.setMatrixAt(i, dummy.matrix);
      });
      wallInst.computeBoundingSphere();
      this.scene.add(wallInst);
    }

    if (floorCoords.length > 0) {
      const floorInst = new THREE.InstancedMesh(floorGeo, floorMat, floorCoords.length);
      floorInst.receiveShadow = true;
      floorCoords.forEach(([x, z], i) => {
        dummy.position.set(x, -0.125, z);
        dummy.updateMatrix();
        floorInst.setMatrixAt(i, dummy.matrix);
      });
      floorInst.computeBoundingSphere();
      this.scene.add(floorInst);
    }
  }

  private buildItems(sim: LevelSimulation): void {
    const coinGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.75, roughness: 0.2 });
    const boxGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.35, metalness: 0.2 });
    const orbGeo = new THREE.OctahedronGeometry(0.24, 0);
    this.disposableGeos.push(coinGeo, boxGeo, orbGeo);
    this.disposableMats.push(coinMat, boxMat);

    const colorMap: Record<string, number> = {
      heart: 0xf43f5e,
      speed_boost: 0x22d3ee,
      shield: 0x3b82f6,
      magnet_coin: 0xec4899,
      jump_boost: 0x4ade80,
    };

    for (const item of sim.items) {
      let mesh: THREE.Object3D;
      if (item.type === 'gold_coin') {
        const m = new THREE.Mesh(coinGeo, coinMat);
        m.rotation.x = Math.PI / 2;
        mesh = m;
      } else if (item.type === 'key') {
        const kGrp = new THREE.Group();
        const kRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 14), coinMat);
        const kBlade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.06), coinMat);
        kBlade.position.x = 0.26;
        kGrp.add(kRing, kBlade);
        mesh = kGrp;
      } else if (item.type === 'mystery_box') {
        mesh = new THREE.Mesh(boxGeo, boxMat);
      } else {
        const mat = new THREE.MeshStandardMaterial({
          color: colorMap[item.type] || 0xffffff,
          emissive: colorMap[item.type] || 0x000000,
          emissiveIntensity: 0.35,
          roughness: 0.25,
        });
        this.disposableMats.push(mat);
        mesh = new THREE.Mesh(orbGeo, mat);
      }
      mesh.position.set(item.x, 0.45, item.z);
      this.scene.add(mesh);
      this.itemMeshes.set(item.id, mesh);
    }
  }

  public syncAndRender(sim: LevelSimulation, dt: number): void {
    const p = sim.player;

    this.playerRig.group.position.set(p.x, p.y, p.z);
    this.playerRig.group.rotation.y = p.facing;
    animateCharacterRig(this.playerRig, p.animState, p.animTime);
    this.shieldBubble.visible = p.shieldTimer > 0;
    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 18) % 2 === 0) {
      this.playerRig.group.scale.setScalar(0.92);
    } else {
      this.playerRig.group.scale.setScalar(1.0);
    }

    // Doors & Traps
    if (this.doorMesh) this.doorMesh.visible = !sim.doorOpen;
    for (const [k, dGrp] of this.lockedDoorMeshes.entries()) {
      dGrp.visible = !sim.unlockedDoors.has(k);
    }
    for (const sGrp of this.spikeMeshes) {
      sGrp.position.y = THREE.MathUtils.damp(sGrp.position.y, sim.spikeActive ? 0.08 : -0.35, 12, dt);
    }
    for (const mw of this.movingWallMeshes) {
      const targetY = sim.movingWallOpen ? -1.1 : 0.65;
      mw.position.y = THREE.MathUtils.damp(mw.position.y, targetY, 8, dt);
    }

    // Rolling Boulders
    for (const b of sim.boulders) {
      const bm = this.boulderMeshes.get(b.id);
      if (bm) {
        bm.position.set(b.x, 0.42, b.z);
        bm.rotation.z = -b.angle;
      }
    }

    // Shockwave Rings
    const activeSwIds = new Set<string>();
    for (const sw of sim.shockwaves) {
      activeSwIds.add(sw.id);
      let swMesh = this.shockwaveMeshes.get(sw.id);
      if (!swMesh) {
        const g = new THREE.RingGeometry(0.85, 1.0, 24);
        const m = new THREE.MeshBasicMaterial({ color: sw.color, side: THREE.DoubleSide });
        swMesh = new THREE.Mesh(g, m);
        swMesh.rotation.x = -Math.PI / 2;
        this.scene.add(swMesh);
        this.shockwaveMeshes.set(sw.id, swMesh);
        this.disposableGeos.push(g);
        this.disposableMats.push(m);
      }
      swMesh.position.set(sw.x, 0.08, sw.z);
      swMesh.scale.setScalar(Math.max(0.3, sw.radius));
    }
    for (const [id, mesh] of this.shockwaveMeshes.entries()) {
      if (!activeSwIds.has(id)) {
        this.scene.remove(mesh);
        this.shockwaveMeshes.delete(id);
      }
    }

    if (this.checkpointFlag && p.checkpointReached) {
      (this.checkpointFlag.material as THREE.MeshStandardMaterial).color.setHex(0x22c55e);
    }
    if (this.exitRing) {
      this.exitRing.rotation.y += dt * 2.2;
      (this.exitRing.material as THREE.MeshStandardMaterial).color.setHex(
        sim.exitUnlocked ? 0xfacc15 : 0x64748b
      );
    }

    // Monsters (including dynamically spawned boss minions!)
    for (const m of sim.monsters) {
      let mesh = this.monsterMeshes.get(m.id);
      if (!mesh && m.alive) {
        mesh = buildBlockyMonster(m.kind, m.isBoss);
        this.scene.add(mesh);
        this.monsterMeshes.set(m.id, mesh);
      }
      if (!mesh) continue;
      mesh.visible = m.alive && !(m.invisibleTimer > 0 && Math.floor(m.animTime * 10) % 2 === 0);
      if (!m.alive) continue;
      const bounce = Math.abs(Math.sin(m.animTime * 5)) * 0.12;
      mesh.position.set(m.x, m.y + bounce, m.z);
      mesh.rotation.y = m.facing;
      mesh.scale.setScalar(m.hitFlash > 0 ? 1.15 : 1.0);
    }

    // Items
    for (const item of sim.items) {
      const mesh = this.itemMeshes.get(item.id);
      if (!mesh) continue;
      mesh.visible = !item.collected;
      if (!item.collected) {
        mesh.position.set(
          item.x,
          0.45 + Math.sin(sim.elapsedTime * 3.5 + item.bobOffset) * 0.12,
          item.z
        );
        mesh.rotation.y += dt * 2.4;
      }
    }

    // Falling Rocks
    for (const r of sim.fallingRocks) {
      const grp = this.rockMeshes.get(r.id);
      if (!grp) continue;
      const rock = grp.getObjectByName('rock');
      const warn = grp.getObjectByName('warn');
      if (rock) {
        rock.visible = r.y < 6.8;
        rock.position.y = r.y + 0.35;
      }
      if (warn) {
        warn.visible = r.timer > r.cycle - 1.4;
      }
    }

    // Projectiles
    const activeProjIds = new Set<string>();
    for (const proj of sim.projectiles) {
      activeProjIds.add(proj.id);
      let mesh = this.projMeshes.get(proj.id);
      if (!mesh) {
        const g = new THREE.SphereGeometry(proj.radius * 0.7, 10, 10);
        const m = new THREE.MeshStandardMaterial({
          color: proj.color,
          emissive: proj.color,
          emissiveIntensity: 0.45,
          roughness: 0.2,
        });
        mesh = new THREE.Mesh(g, m);
        this.scene.add(mesh);
        this.projMeshes.set(proj.id, mesh);
        this.disposableGeos.push(g);
        this.disposableMats.push(m);
      }
      mesh.position.set(proj.x, proj.y, proj.z);
    }
    for (const [id, mesh] of this.projMeshes.entries()) {
      if (!activeProjIds.has(id)) {
        this.scene.remove(mesh);
        this.projMeshes.delete(id);
      }
    }

    // Particles
    for (let i = 0; i < this.particlePool.length; i++) {
      const pm = this.particlePool[i];
      const pt = sim.particles[i];
      if (pt) {
        pm.visible = true;
        pm.position.set(pt.x, pt.y, pt.z);
        (pm.material as THREE.MeshBasicMaterial).color.set(pt.color);
        pm.scale.setScalar(Math.max(0.2, pt.life / pt.maxLife));
      } else {
        pm.visible = false;
      }
    }

    // Smooth Third-Person Follow Camera
    const targetCamX = p.x;
    const targetCamY = 6.4 + p.y * 0.4;
    const targetCamZ = p.z + 6.6;

    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, targetCamX, 7.5, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, targetCamY, 7.5, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, targetCamZ, 7.5, dt);

    this.camLook.x = THREE.MathUtils.damp(this.camLook.x, p.x, 10, dt);
    this.camLook.y = THREE.MathUtils.damp(this.camLook.y, 0.75 + p.y * 0.3, 10, dt);
    this.camLook.z = THREE.MathUtils.damp(this.camLook.z, p.z, 10, dt);

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    this.disposableGeos.forEach((g) => g.dispose());
    this.disposableMats.forEach((m) => m.dispose());
    this.envTextures.forEach((t) => t.dispose());
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
