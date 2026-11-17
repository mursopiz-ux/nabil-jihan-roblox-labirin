import { audioEngine } from './audio';
import { CHARACTERS, MAGIC_SPELLS, MONSTER_TEMPLATES, WEAPONS } from './catalog';
import { generateMazeLevel, isTileWalkable } from './mazeGenerator';
import {
  CharacterId,
  InputState,
  LevelSimulation,
  MagicSpellId,
  MonsterEntity,
  PowerUpType,
  TileType,
  WeaponId,
  WorldId,
} from './types';

let uidCounter = 0;
function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${uidCounter}`;
}

export interface SimulationCallbacks {
  onCoinsCollected: (delta: number) => void;
  onCheckpointReached: (x: number, z: number) => void;
  onPowerUpStored?: (type: Exclude<PowerUpType, 'gold_coin' | 'mystery_box' | 'key'>) => void;
  onLevelWin: (coinsEarned: number, monstersDefeated: number, elapsed: number) => void;
  onGameOver: () => void;
}

export interface StepSimulationOptions {
  hasDragonWings?: boolean;
  wingStyle?: 'mini' | 'dragon_fire' | 'dragon_energy';
}

export function createLevelSimulation(
  worldId: WorldId,
  levelNumber: number,
  characterId: CharacterId,
  resumeCheckpoint?: { x: number; z: number } | null
): LevelSimulation {
  const { levelData, monsters, items, boulders, fallingRocks } = generateMazeLevel(
    worldId,
    levelNumber
  );
  const charDef = CHARACTERS[characterId];
  const spawnX = resumeCheckpoint ? resumeCheckpoint.x : levelData.startX;
  const spawnZ = resumeCheckpoint ? resumeCheckpoint.z : levelData.startZ;

  return {
    worldId,
    levelNumber,
    levelData,
    player: {
      x: spawnX,
      y: 0,
      z: spawnZ,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: 0,
      hp: charDef.stats.maxHp,
      maxHp: charDef.stats.maxHp,
      mp: 100,
      maxMp: 100,
      keysHeld: 0,
      grounded: true,
      animState: 'idle',
      animTime: 0,
      attackTimer: 0,
      attackCooldown: 0,
      hitTimer: 0,
      invulnTimer: 0,
      timeSinceLastHit: 0,
      regenTickTimer: 0,
      damageFlashTimer: 0,
      koCount: 0,
      magicCooldowns: {
        fireball: 0,
        lightning: 0,
        ice: 0,
      },
      speedBoostTimer: 0,
      shieldTimer: 0,
      magnetTimer: 0,
      jumpBoostTimer: 0,
      checkpointX: spawnX,
      checkpointZ: spawnZ,
      checkpointReached: Boolean(resumeCheckpoint),
    },
    monsters,
    items,
    projectiles: [],
    lightningArcs: [],
    shockwaves: [],
    boulders,
    fallingRocks,
    particles: [],
    floatingTexts: [],
    doorOpen: !levelData.doorPos,
    unlockedDoors: new Set<string>(),
    movingWallOpen: true,
    movingWallTimer: 0,
    spikeActive: false,
    spikeTimer: 0,
    bossDefeated: !levelData.isBossLevel,
    exitUnlocked: !levelData.isBossLevel,
    levelCompleted: false,
    gameOver: false,
    coinsEarnedThisRun: 0,
    monstersDefeatedThisRun: 0,
    elapsedTime: 0,
    bannerMessage: levelData.isBossLevel
      ? `BOSS: ${levelData.title}`
      : `Level ${levelData.campaignIndex}: ${levelData.title}`,
    bannerTimer: 2.8,
  };
}

function getTileAt(sim: LevelSimulation, gx: number, gz: number): TileType {
  const { width, height, tiles } = sim.levelData;
  if (gx < 0 || gz < 0 || gx >= width || gz >= height) return 'wall';
  return tiles[gz][gx];
}

function canStandAt(
  sim: LevelSimulation,
  x: number,
  z: number,
  radius = 0.28,
  ignoreWalls = false
): boolean {
  const { width, height } = sim.levelData;
  if (x < 0.6 || z < 0.6 || x > width - 1.6 || z > height - 1.6) return false;
  if (ignoreWalls) return true;

  const checks = [
    [x - radius, z - radius],
    [x + radius, z - radius],
    [x - radius, z + radius],
    [x + radius, z + radius],
  ];
  for (const [cx, cz] of checks) {
    const gx = Math.round(cx);
    const gz = Math.round(cz);
    const t = getTileAt(sim, gx, gz);
    if (!isTileWalkable(t, sim.doorOpen, sim.movingWallOpen, sim.unlockedDoors, gx, gz)) {
      return false;
    }
  }
  return true;
}

// Grid A* Pathfinding so monsters navigate corridors smartly around walls
function findNextAStarStep(
  sim: LevelSimulation,
  sx: number,
  sz: number,
  tx: number,
  tz: number
): { x: number; z: number } | null {
  const startGx = Math.round(sx);
  const startGz = Math.round(sz);
  const goalGx = Math.round(tx);
  const goalGz = Math.round(tz);
  if (startGx === goalGx && startGz === goalGz) return null;

  const { width, height, tiles } = sim.levelData;
  const key = (x: number, z: number) => z * width + x;

  const open: { x: number; z: number; g: number; f: number }[] = [
    {
      x: startGx,
      z: startGz,
      g: 0,
      f: Math.abs(goalGx - startGx) + Math.abs(goalGz - startGz),
    },
  ];
  const gScore = new Map<number, number>([[key(startGx, startGz), 0]]);
  const cameFrom = new Map<number, { x: number; z: number }>();
  const closed = new Set<number>();

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let iterations = 0;
  while (open.length > 0 && iterations < 120) {
    iterations++;
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const curKey = key(cur.x, cur.z);

    if (cur.x === goalGx && cur.z === goalGz) {
      let step = { x: goalGx, z: goalGz };
      while (true) {
        const prev = cameFrom.get(key(step.x, step.z));
        if (!prev) break;
        if (prev.x === startGx && prev.z === startGz) {
          return step;
        }
        step = prev;
      }
      return null;
    }

    closed.add(curKey);

    for (const [dx, dz] of dirs) {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      const nk = key(nx, nz);
      if (closed.has(nk)) continue;
      const t = tiles[nz][nx];
      if (!isTileWalkable(t, sim.doorOpen, sim.movingWallOpen, sim.unlockedDoors, nx, nz)) {
        continue;
      }
      const tentG = cur.g + 1;
      const prevG = gScore.get(nk);
      if (prevG === undefined || tentG < prevG) {
        cameFrom.set(nk, { x: cur.x, z: cur.z });
        gScore.set(nk, tentG);
        const h = Math.abs(goalGx - nx) + Math.abs(goalGz - nz);
        open.push({ x: nx, z: nz, g: tentG, f: tentG + h });
      }
    }
  }
  return null;
}

function spawnBurst(
  sim: LevelSimulation,
  x: number,
  y: number,
  z: number,
  color: string,
  count = 8
): void {
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const spd = 1.5 + Math.random() * 2.5;
    sim.particles.push({
      id: uid('pt'),
      x,
      y: y + 0.4,
      z,
      vx: Math.cos(ang) * spd,
      vy: 1.5 + Math.random() * 2.2,
      vz: Math.sin(ang) * spd,
      color,
      size: 0.12 + Math.random() * 0.1,
      life: 0.45,
      maxLife: 0.45,
    });
  }
}

function addFloatingText(
  sim: LevelSimulation,
  x: number,
  y: number,
  z: number,
  text: string,
  color: string
): void {
  sim.floatingTexts.push({
    id: uid('ft'),
    x,
    y: y + 1.1,
    z,
    text,
    color,
    life: 0.95,
    maxLife: 0.95,
  });
}

function damagePlayer(
  sim: LevelSimulation,
  amount: number,
  fromX: number,
  fromZ: number,
  callbacks: SimulationCallbacks
): void {
  const p = sim.player;
  if (p.invulnTimer > 0 || sim.levelCompleted || sim.gameOver) return;

  if (p.shieldTimer > 0) {
    p.invulnTimer = 0.6;
    spawnBurst(sim, p.x, p.y, p.z, '#38bdf8', 10);
    addFloatingText(sim, p.x, p.y, p.z, 'BLOCKED!', '#38bdf8');
    audioEngine.playSfx('powerup');
    return;
  }

  p.hp = Math.max(0, p.hp - amount);
  p.hitTimer = 0.28;
  p.invulnTimer = 1.1;
  p.timeSinceLastHit = 0;
  p.regenTickTimer = 0;
  p.damageFlashTimer = 0.42;
  p.animState = 'hit';

  const dx = p.x - fromX;
  const dz = p.z - fromZ;
  const len = Math.hypot(dx, dz) || 1;
  p.vx = (dx / len) * 5.4;
  p.vz = (dz / len) * 5.4;

  spawnBurst(sim, p.x, p.y, p.z, '#ef4444', 10);
  addFloatingText(sim, p.x, p.y, p.z, `-${amount}`, '#f87171');
  audioEngine.playSfx('hit');

  if (p.hp <= 0) {
    p.koCount += 1;
    sim.gameOver = true;
    audioEngine.playSfx('ko');
    callbacks.onGameOver();
  }
}

export function respawnPlayerAtCheckpoint(sim: LevelSimulation): void {
  const p = sim.player;
  p.x = p.checkpointX;
  p.y = 0;
  p.z = p.checkpointZ;
  p.vx = 0;
  p.vy = 0;
  p.vz = 0;
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  p.hitTimer = 0;
  p.invulnTimer = 2.6;
  p.timeSinceLastHit = 0;
  p.damageFlashTimer = 0;
  p.animState = 'idle';
  sim.gameOver = false;
  sim.bannerMessage = p.checkpointReached
    ? 'Respawn di Checkpoint!'
    : 'Respawn di Titik Awal!';
  sim.bannerTimer = 2.4;

  // Gently push away monsters camping too close to spawn
  for (const m of sim.monsters) {
    if (!m.alive || m.isBoss) continue;
    if (Math.hypot(m.x - p.x, m.z - p.z) < 2.2) {
      m.x = m.originX;
      m.z = m.originZ;
      m.stunTimer = Math.max(m.stunTimer, 1.0);
    }
  }

  spawnBurst(sim, p.x, 0.5, p.z, '#34d399', 16);
  addFloatingText(sim, p.x, 0.7, p.z, 'BANGKIT!', '#34d399');
  audioEngine.playSfx('respawn');
}

export function castMagicSpell(
  sim: LevelSimulation,
  spellId: MagicSpellId,
  characterId: CharacterId,
  weaponId: WeaponId,
  callbacks: SimulationCallbacks
): boolean {
  if (sim.levelCompleted || sim.gameOver) return false;
  const p = sim.player;
  const spell = MAGIC_SPELLS[spellId];
  if (p.magicCooldowns[spellId] > 0) return false;
  if (p.mp < spell.mpCost) {
    addFloatingText(sim, p.x, p.y + 0.4, p.z, 'MP Kurang!', '#93c5fd');
    return false;
  }

  const charDef = CHARACTERS[characterId];
  const wandBoost = weaponId === 'magic_wand' ? 1.25 : 1.0;
  const dmg = Math.round((spell.damage + charDef.stats.attackBonus) * wandBoost);

  p.mp -= spell.mpCost;
  p.magicCooldowns[spellId] = spell.cooldown;
  p.attackTimer = 0.28;

  if (spellId === 'fireball') {
    const spd = 11.5;
    sim.projectiles.push({
      id: uid('mfire'),
      fromPlayer: true,
      kind: 'player_fireball',
      x: p.x + Math.sin(p.facing) * 0.55,
      y: p.y + 0.55,
      z: p.z + Math.cos(p.facing) * 0.55,
      vx: Math.sin(p.facing) * spd,
      vy: 0,
      vz: Math.cos(p.facing) * spd,
      damage: dmg,
      color: spell.color,
      radius: 0.48,
      life: 1.0,
    });
    spawnBurst(sim, p.x + Math.sin(p.facing) * 0.5, p.y + 0.5, p.z + Math.cos(p.facing) * 0.5, '#f97316', 10);
    addFloatingText(sim, p.x, p.y + 0.6, p.z, 'BOLA API!', '#fb923c');
    audioEngine.playSfx('fireball');
    return true;
  }

  if (spellId === 'ice') {
    const spd = 11.0;
    sim.projectiles.push({
      id: uid('mice'),
      fromPlayer: true,
      kind: 'player_ice',
      x: p.x + Math.sin(p.facing) * 0.55,
      y: p.y + 0.55,
      z: p.z + Math.cos(p.facing) * 0.55,
      vx: Math.sin(p.facing) * spd,
      vy: 0,
      vz: Math.cos(p.facing) * spd,
      damage: dmg,
      color: spell.color,
      radius: 0.45,
      life: 1.05,
    });
    spawnBurst(sim, p.x + Math.sin(p.facing) * 0.5, p.y + 0.5, p.z + Math.cos(p.facing) * 0.5, '#67e8f9', 10);
    addFloatingText(sim, p.x, p.y + 0.6, p.z, 'SIHIR ES!', '#67e8f9');
    audioEngine.playSfx('ice');
    return true;
  }

  // Lightning: instant chain strike up to 3 alive monsters within 7.2 tiles
  const targets = sim.monsters
    .filter((m) => m.alive && Math.hypot(m.x - p.x, m.z - p.z) <= 7.2)
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
    .slice(0, 3);

  let prevX = p.x;
  let prevZ = p.z;
  if (targets.length === 0) {
    const endX = p.x + Math.sin(p.facing) * 3.8;
    const endZ = p.z + Math.cos(p.facing) * 3.8;
    sim.lightningArcs.push({
      id: uid('arc'),
      x1: p.x,
      z1: p.z,
      x2: endX,
      z2: endZ,
      life: 0.28,
      maxLife: 0.28,
      color: '#38bdf8',
    });
    spawnBurst(sim, endX, p.y + 0.4, endZ, '#38bdf8', 10);
  } else {
    for (const m of targets) {
      sim.lightningArcs.push({
        id: uid('arc'),
        x1: prevX,
        z1: prevZ,
        x2: m.x,
        z2: m.z,
        life: 0.34,
        maxLife: 0.34,
        color: '#38bdf8',
      });
      m.shockTimer = 1.4;
      m.stunTimer = Math.max(m.stunTimer, m.isBoss ? 0.55 : 1.35);
      damageMonster(sim, m, dmg, prevX, prevZ, callbacks);
      spawnBurst(sim, m.x, 0.7, m.z, '#facc15', 10);
      prevX = m.x;
      prevZ = m.z;
    }
  }
  addFloatingText(sim, p.x, p.y + 0.6, p.z, 'PETIR!', '#38bdf8');
  audioEngine.playSfx('lightning');
  return true;
}

export function applyPowerUpEffect(
  sim: LevelSimulation,
  type: PowerUpType,
  x: number,
  z: number,
  callbacks: SimulationCallbacks
): void {
  const p = sim.player;
  switch (type) {
    case 'gold_coin': {
      sim.coinsEarnedThisRun += 10;
      callbacks.onCoinsCollected(10);
      spawnBurst(sim, x, 0.3, z, '#facc15', 8);
      addFloatingText(sim, x, 0.4, z, '+10 Koin', '#fde047');
      audioEngine.playSfx('coin');
      break;
    }
    case 'key': {
      p.keysHeld += 1;
      sim.bannerMessage = 'Kunci Ditemukan! Cari Pintu Terkunci!';
      sim.bannerTimer = 2.6;
      spawnBurst(sim, x, 0.4, z, '#facc15', 14);
      addFloatingText(sim, x, 0.5, z, '+1 KUNCI!', '#fde047');
      audioEngine.playSfx('powerup');
      break;
    }
    case 'heart': {
      p.hp = Math.min(p.maxHp, p.hp + 35);
      p.mp = Math.min(p.maxMp, p.mp + 20);
      spawnBurst(sim, x, 0.3, z, '#4ade80', 12);
      addFloatingText(sim, x, 0.4, z, '+35 HP', '#fb7185');
      audioEngine.playSfx('heal');
      break;
    }
    case 'speed_boost': {
      p.speedBoostTimer = 8.0;
      spawnBurst(sim, x, 0.3, z, '#22d3ee', 10);
      addFloatingText(sim, x, 0.4, z, 'SPEED UP!', '#22d3ee');
      audioEngine.playSfx('powerup');
      break;
    }
    case 'shield': {
      p.shieldTimer = 9.0;
      spawnBurst(sim, x, 0.3, z, '#60a5fa', 12);
      addFloatingText(sim, x, 0.4, z, 'SHIELD!', '#60a5fa');
      audioEngine.playSfx('shield');
      break;
    }
    case 'magnet_coin': {
      p.magnetTimer = 10.0;
      spawnBurst(sim, x, 0.3, z, '#f472b6', 10);
      addFloatingText(sim, x, 0.4, z, 'MAGNET!', '#f472b6');
      audioEngine.playSfx('powerup');
      break;
    }
    case 'jump_boost': {
      p.jumpBoostTimer = 10.0;
      spawnBurst(sim, x, 0.3, z, '#4ade80', 10);
      addFloatingText(sim, x, 0.4, z, 'SUPER JUMP!', '#4ade80');
      audioEngine.playSfx('powerup');
      break;
    }
    case 'mystery_box': {
      const pool: PowerUpType[] = ['gold_coin', 'heart', 'speed_boost', 'shield', 'magnet_coin', 'jump_boost'];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick === 'gold_coin') {
        sim.coinsEarnedThisRun += 35;
        callbacks.onCoinsCollected(35);
        addFloatingText(sim, x, 0.5, z, 'HARTA: +35 Koin!', '#fde047');
        spawnBurst(sim, x, 0.4, z, '#fde047', 14);
        audioEngine.playSfx('powerup');
      } else {
        applyPowerUpEffect(sim, pick, x, z, callbacks);
      }
      break;
    }
  }
}

function tryUnlockAdjacentLockedDoor(sim: LevelSimulation): boolean {
  const p = sim.player;
  if (p.keysHeld <= 0) return false;
  const px = Math.round(p.x);
  const pz = Math.round(p.z);
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = px + dx;
      const gz = pz + dz;
      const k = `${gx},${gz}`;
      if (getTileAt(sim, gx, gz) === 'locked_door' && !sim.unlockedDoors.has(k)) {
        if (Math.hypot(p.x - gx, p.z - gz) < 1.35) {
          p.keysHeld -= 1;
          sim.unlockedDoors.add(k);
          sim.bannerMessage = 'Pintu Terkunci Dibuka!';
          sim.bannerTimer = 2.4;
          spawnBurst(sim, gx, 0.6, gz, '#facc15', 16);
          addFloatingText(sim, gx, 0.8, gz, 'TERBUKA!', '#fde047');
          audioEngine.playSfx('door');
          return true;
        }
      }
    }
  }
  return false;
}

export function stepLevelSimulation(
  sim: LevelSimulation,
  dt: number,
  input: InputState,
  characterId: CharacterId,
  weaponId: WeaponId,
  callbacks: SimulationCallbacks,
  options?: StepSimulationOptions
): void {
  if (sim.levelCompleted || sim.gameOver) return;

  const clampedDt = Math.min(dt, 0.05);
  sim.elapsedTime += clampedDt;
  if (sim.bannerTimer > 0) {
    sim.bannerTimer = Math.max(0, sim.bannerTimer - clampedDt);
    if (sim.bannerTimer === 0) sim.bannerMessage = null;
  }

  // Spike Trap Cycle (retracted -> active every 2.8s)
  sim.spikeTimer += clampedDt;
  if (sim.spikeTimer >= 2.8) {
    sim.spikeTimer = 0;
    sim.spikeActive = !sim.spikeActive;
  }

  // Moving Maze Walls (World 4)
  if (sim.worldId === 4) {
    sim.movingWallTimer += clampedDt;
    if (sim.movingWallTimer >= 3.6) {
      sim.movingWallTimer = 0;
      sim.movingWallOpen = !sim.movingWallOpen;
    }
  }

  const p = sim.player;
  const charDef = CHARACTERS[characterId];
  const weapon = WEAPONS[weaponId];

  // Timers & MP/HP Regen
  p.animTime += clampedDt;
  p.timeSinceLastHit += clampedDt;
  if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - clampedDt);
  if (p.attackCooldown > 0) p.attackCooldown = Math.max(0, p.attackCooldown - clampedDt);
  if (p.hitTimer > 0) p.hitTimer = Math.max(0, p.hitTimer - clampedDt);
  if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - clampedDt);
  if (p.damageFlashTimer > 0) p.damageFlashTimer = Math.max(0, p.damageFlashTimer - clampedDt);
  if (p.speedBoostTimer > 0) p.speedBoostTimer = Math.max(0, p.speedBoostTimer - clampedDt);
  if (p.shieldTimer > 0) p.shieldTimer = Math.max(0, p.shieldTimer - clampedDt);
  if (p.magnetTimer > 0) p.magnetTimer = Math.max(0, p.magnetTimer - clampedDt);
  if (p.jumpBoostTimer > 0) p.jumpBoostTimer = Math.max(0, p.jumpBoostTimer - clampedDt);

  p.magicCooldowns.fireball = Math.max(0, p.magicCooldowns.fireball - clampedDt);
  p.magicCooldowns.lightning = Math.max(0, p.magicCooldowns.lightning - clampedDt);
  p.magicCooldowns.ice = Math.max(0, p.magicCooldowns.ice - clampedDt);

  // Passive MP Regeneration
  if (p.mp < p.maxMp) {
    const mpRate = weaponId === 'magic_wand' ? 11.5 : 8.5;
    p.mp = Math.min(p.maxMp, p.mp + mpRate * clampedDt);
  }

  // Passive HP Regeneration after 4.5s without taking damage
  if (p.hp > 0 && p.hp < p.maxHp && p.timeSinceLastHit >= 4.5) {
    const hpRate =
      options?.wingStyle === 'dragon_energy' || options?.wingStyle === 'dragon_fire' ? 8.0 : 5.5;
    p.hp = Math.min(p.maxHp, p.hp + hpRate * clampedDt);
    p.regenTickTimer += clampedDt;
    if (p.regenTickTimer >= 1.1) {
      p.regenTickTimer = 0;
      addFloatingText(sim, p.x, p.y + 0.35, p.z, '+HP', '#4ade80');
      spawnBurst(sim, p.x, p.y + 0.3, p.z, '#4ade80', 3);
    }
  }

  const curGx = Math.round(p.x);
  const curGz = Math.round(p.z);
  const curTile = getTileAt(sim, curGx, curGz);
  const onIce = curTile === 'ice' && p.grounded;

  // Horizontal movement
  const speedMul = p.speedBoostTimer > 0 ? 1.45 : 1.0;
  const targetSpeed = charDef.stats.speed * speedMul;
  const inputLen = Math.hypot(input.moveX, input.moveZ);
  const normX = inputLen > 0.05 ? input.moveX / Math.max(1, inputLen) : 0;
  const normZ = inputLen > 0.05 ? input.moveZ / Math.max(1, inputLen) : 0;

  if (p.hitTimer <= 0) {
    const accel = onIce ? 3.5 : 18.0;
    p.vx += (normX * targetSpeed - p.vx) * Math.min(1, accel * clampedDt);
    p.vz += (normZ * targetSpeed - p.vz) * Math.min(1, accel * clampedDt);
  } else {
    p.vx *= 0.9;
    p.vz *= 0.9;
  }

  if (inputLen > 0.12) {
    p.facing = Math.atan2(normX, normZ);
  }

  // Auto-open adjacent locked door if player has a key & walks right against it
  tryUnlockAdjacentLockedDoor(sim);

  // Axis-separated collision
  const nextX = p.x + p.vx * clampedDt;
  if (canStandAt(sim, nextX, p.z)) {
    p.x = nextX;
  } else {
    p.vx = 0;
  }

  const nextZ = p.z + p.vz * clampedDt;
  if (canStandAt(sim, p.x, nextZ)) {
    p.z = nextZ;
  } else {
    p.vz = 0;
  }

  // Jump, Dragon Wing Glide & Gravity
  if (input.jumpPressed && p.grounded) {
    const jumpMul = p.jumpBoostTimer > 0 ? 1.38 : 1.0;
    p.vy = charDef.stats.jumpForce * jumpMul;
    p.grounded = false;
    audioEngine.playSfx('jump');
  }

  if (!p.grounded) {
    const glideActive = Boolean(options?.hasDragonWings) && p.vy < 0;
    const gravity = glideActive ? 12.0 : 22.0;
    p.vy -= gravity * clampedDt;
    if (glideActive && p.vy < -2.4) {
      p.vy = -2.4;
    }
    p.y += p.vy * clampedDt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.grounded = true;
    }
  }

  // Animation state
  const horizSpeed = Math.hypot(p.vx, p.vz);
  if (p.hitTimer > 0) p.animState = 'hit';
  else if (p.attackTimer > 0) p.animState = 'attack';
  else if (!p.grounded) p.animState = 'jump';
  else if (horizSpeed > targetSpeed * 0.72) p.animState = 'run';
  else if (horizSpeed > 0.35) p.animState = 'walk';
  else p.animState = 'idle';

  // Attack Action
  if (input.attackPressed && p.attackCooldown <= 0) {
    p.attackTimer = 0.28;
    p.attackCooldown = weapon.cooldown;
    audioEngine.playSfx('attack');

    if (weapon.isRanged) {
      const spd = weapon.projectileSpeed || 10;
      sim.projectiles.push({
        id: uid('proj'),
        fromPlayer: true,
        kind: weaponId === 'bubble_blaster' ? 'bubble' : 'star',
        x: p.x + Math.sin(p.facing) * 0.5,
        y: p.y + 0.55,
        z: p.z + Math.cos(p.facing) * 0.5,
        vx: Math.sin(p.facing) * spd,
        vy: 0,
        vz: Math.cos(p.facing) * spd,
        damage: weapon.damage + charDef.stats.attackBonus,
        color: weapon.color,
        radius: 0.35,
        life: weapon.range / spd,
      });
    } else {
      const hitX = p.x + Math.sin(p.facing) * 0.9;
      const hitZ = p.z + Math.cos(p.facing) * 0.9;
      spawnBurst(sim, hitX, p.y + 0.3, hitZ, weapon.color, 6);

      for (const m of sim.monsters) {
        if (!m.alive) continue;
        const d = Math.hypot(m.x - p.x, m.z - p.z);
        const dFront = Math.hypot(m.x - hitX, m.z - hitZ);
        if (d <= weapon.range || dFront <= weapon.range * 0.85) {
          damageMonster(sim, m, weapon.damage + charDef.stats.attackBonus, p.x, p.z, callbacks);
        }
      }
    }
  }

  // Tile hazards: Lava & Spike Traps (jumpable!)
  if (curTile === 'lava' && p.y < 0.3) {
    damagePlayer(sim, 16, curGx, curGz, callbacks);
  }
  if (curTile === 'spike_trap' && sim.spikeActive && p.y < 0.35) {
    damagePlayer(sim, 12, curGx, curGz, callbacks);
  }

  // Checkpoint
  if (curTile === 'checkpoint' && !p.checkpointReached) {
    p.checkpointReached = true;
    p.checkpointX = curGx;
    p.checkpointZ = curGz;
    sim.bannerMessage = 'Checkpoint Tercapai & Tersimpan!';
    sim.bannerTimer = 2.4;
    spawnBurst(sim, curGx, 0.5, curGz, '#22c55e', 14);
    audioEngine.playSfx('checkpoint');
    callbacks.onCheckpointReached(curGx, curGz);
  }

  // Secret Switch
  if (curTile === 'secret_switch' && !sim.doorOpen) {
    sim.doorOpen = true;
    sim.bannerMessage = 'Pintu Rahasia Terbuka!';
    sim.bannerTimer = 2.4;
    spawnBurst(sim, curGx, 0.5, curGz, '#38bdf8', 14);
    audioEngine.playSfx('door');
  }

  if (input.interactPressed) {
    tryUnlockAdjacentLockedDoor(sim);
    if (sim.levelData.switchPos && !sim.doorOpen) {
      const ds = Math.hypot(p.x - sim.levelData.switchPos.x, p.z - sim.levelData.switchPos.z);
      if (ds < 1.6) {
        sim.doorOpen = true;
        audioEngine.playSfx('door');
      }
    }
    for (const item of sim.items) {
      if (!item.collected && item.type === 'mystery_box') {
        if (Math.hypot(p.x - item.x, p.z - item.z) < 1.5) {
          item.collected = true;
          applyPowerUpEffect(sim, 'mystery_box', item.x, item.z, callbacks);
        }
      }
    }
  }

  // Exit Portal
  const distToExit = Math.hypot(p.x - sim.levelData.exitX, p.z - sim.levelData.exitZ);
  if (distToExit < 0.72 && sim.exitUnlocked) {
    sim.levelCompleted = true;
    audioEngine.playSfx('victory');
    callbacks.onLevelWin(sim.coinsEarnedThisRun, sim.monstersDefeatedThisRun, sim.elapsedTime);
    return;
  }

  // Items Pickup & Magnet
  for (const item of sim.items) {
    if (item.collected) continue;
    const dx = p.x - item.x;
    const dz = p.z - item.z;
    const dist = Math.hypot(dx, dz);

    if (p.magnetTimer > 0 && item.type === 'gold_coin' && dist < 4.8 && dist > 0.05) {
      item.x += (dx / dist) * 7.5 * clampedDt;
      item.z += (dz / dist) * 7.5 * clampedDt;
    }

    if (dist < 0.72) {
      item.collected = true;
      applyPowerUpEffect(sim, item.type, item.x, item.z, callbacks);
    }
  }

  // Rolling Boulders
  for (const b of sim.boulders) {
    b.x += b.dir * b.speed * clampedDt;
    b.angle += b.dir * b.speed * clampedDt * 2.2;
    if (b.x >= b.endX) {
      b.x = b.endX;
      b.dir = -1;
    } else if (b.x <= b.startX) {
      b.x = b.startX;
      b.dir = 1;
    }
    if (Math.hypot(p.x - b.x, p.z - b.z) < 0.65 && p.y < 0.65) {
      damagePlayer(sim, 16, b.x, b.z, callbacks);
    }
  }

  // Falling Rocks
  for (const rock of sim.fallingRocks) {
    rock.timer += clampedDt;
    if (rock.timer >= rock.cycle) rock.timer = 0;
    if (rock.timer > rock.cycle - 0.8) {
      const progress = (rock.timer - (rock.cycle - 0.8)) / 0.8;
      rock.y = Math.max(0, 7 * (1 - progress * progress));
      if (progress > 0.88 && Math.hypot(p.x - rock.x, p.z - rock.z) < 0.75 && p.y < 0.6) {
        damagePlayer(sim, 14, rock.x, rock.z, callbacks);
      }
    } else {
      rock.y = 7;
    }
  }

  // Shockwave Rings (Boss / Lava Golem ground slams)
  for (let i = sim.shockwaves.length - 1; i >= 0; i--) {
    const sw = sim.shockwaves[i];
    if (sw.warningTimer > 0) {
      sw.warningTimer = Math.max(0, sw.warningTimer - clampedDt);
      continue;
    }
    sw.radius += sw.speed * clampedDt;
    const dPlayer = Math.hypot(p.x - sw.x, p.z - sw.z);
    if (!sw.hitPlayer && Math.abs(dPlayer - sw.radius) < 0.6 && p.y < 0.55) {
      sw.hitPlayer = true;
      damagePlayer(sim, sw.damage, sw.x, sw.z, callbacks);
    }
    if (sw.radius >= sw.maxRadius) {
      sim.shockwaves.splice(i, 1);
    }
  }

  // Monsters & 3-Phase Bosses with 7-State A* AI & Elemental Statuses
  for (const m of sim.monsters) {
    if (!m.alive) continue;
    m.animTime += clampedDt;
    if (m.hitFlash > 0) m.hitFlash = Math.max(0, m.hitFlash - clampedDt);
    if (m.attackTimer > 0) m.attackTimer = Math.max(0, m.attackTimer - clampedDt);
    if (m.freezeTimer > 0) m.freezeTimer = Math.max(0, m.freezeTimer - clampedDt);
    if (m.shockTimer > 0) m.shockTimer = Math.max(0, m.shockTimer - clampedDt);

    // Fireball Burn DoT
    if (m.burnTimer > 0) {
      m.burnTimer = Math.max(0, m.burnTimer - clampedDt);
      m.burnTickTimer += clampedDt;
      if (m.burnTickTimer >= 0.9) {
        m.burnTickTimer = 0;
        damageMonster(sim, m, 10 + m.defense, m.x, m.z, callbacks);
        spawnBurst(sim, m.x, 0.5, m.z, '#f97316', 4);
        if (!m.alive) continue;
      }
    }

    // Leap physics (Shadow Slime)
    if (m.y > 0 || m.leapVy !== 0) {
      m.leapVy -= 18 * clampedDt;
      m.y += m.leapVy * clampedDt;
      if (m.y <= 0) {
        m.y = 0;
        m.leapVy = 0;
      }
    }

    // Stunned state
    if (m.stunTimer > 0) {
      m.stunTimer = Math.max(0, m.stunTimer - clampedDt);
      m.aiState = 'stunned';
      continue;
    }

    const dx = p.x - m.x;
    const dz = p.z - m.z;
    const distToPlayer = Math.hypot(dx, dz);

    // Special Cute Horror Abilities
    if (!m.isBoss) {
      if (m.kind === 'phantom_ghost') {
        m.specialTimer -= clampedDt;
        if (m.specialTimer <= 0) {
          m.specialTimer = 4.2;
          m.invisibleTimer = 1.6;
          m.isPhasing = true;
          addFloatingText(sim, m.x, 0.8, m.z, 'Boo~!', '#e879f9');
        }
        if (m.invisibleTimer > 0) {
          m.invisibleTimer = Math.max(0, m.invisibleTimer - clampedDt);
          if (m.invisibleTimer === 0) m.isPhasing = false;
        }
      } else if (m.kind === 'shadow_slime' && m.aiState === 'chase' && m.y === 0) {
        m.specialTimer -= clampedDt;
        if (m.specialTimer <= 0 && distToPlayer < 4.5) {
          m.specialTimer = 2.6;
          m.leapVy = 6.2;
        }
      } else if (m.kind === 'lava_golem' && m.aiState === 'chase') {
        m.specialTimer -= clampedDt;
        if (m.specialTimer <= 0 && distToPlayer < 4.5) {
          m.specialTimer = 3.8;
          sim.shockwaves.push({
            id: uid('sw'),
            x: m.x,
            z: m.z,
            radius: 0.4,
            maxRadius: 3.4,
            speed: 5.5,
            damage: 14,
            color: '#f97316',
            warningTimer: 0.45,
            hitPlayer: false,
          });
        }
      }
    }

    if (m.isBoss) {
      // Only aggro boss once player enters arena (x >= 4.6)
      if (p.x < 4.6) {
        m.aiState = 'idle';
        continue;
      }

      // 3-Phase Boss Transition!
      const hpRatio = m.hp / m.maxHp;
      if (m.phase === 1 && hpRatio <= 0.66) {
        m.phase = 2;
        m.speed *= 1.18;
        sim.bannerMessage = `${m.name} Memasuki FASE 2!`;
        sim.bannerTimer = 2.6;
        spawnBurst(sim, m.x, 1, m.z, '#facc15', 18);
        audioEngine.playSfx('boss');

        // Forest King summons 2 mini slimes on Phase 2!
        if (m.kind === 'forest_king') {
          sim.monsters.push(
            makeSlimeHelper(m.x - 1.5, m.z - 1.5),
            makeSlimeHelper(m.x - 1.5, m.z + 1.5)
          );
        }
      } else if (m.phase === 2 && hpRatio <= 0.33) {
        m.phase = 3;
        m.speed *= 1.2;
        sim.bannerMessage = `${m.name} Mengamuk — FASE 3!`;
        sim.bannerTimer = 2.8;
        spawnBurst(sim, m.x, 1, m.z, '#ef4444', 24);
        audioEngine.playSfx('boss');
      }

      m.aiState = distToPlayer <= m.attackRange ? 'attack' : 'chase';
      m.facing = Math.atan2(dx, dz);

      if (distToPlayer > 1.4) {
        moveMonsterWithAStar(sim, m, p.x, p.z, clampedDt);
      }

      if (distToPlayer <= m.attackRange && m.attackTimer <= 0) {
        m.attackTimer = m.attackCooldown;
        damagePlayer(sim, m.damage, m.x, m.z, callbacks);
      }

      // Boss Special Attacks by Phase
      m.specialTimer -= clampedDt;
      if (m.specialTimer <= 0) {
        m.specialTimer = m.phase === 3 ? 1.8 : m.phase === 2 ? 2.4 : 3.0;
        const tpl = MONSTER_TEMPLATES[m.kind];
        const baseAng = Math.atan2(dx, dz);

        if (m.kind === 'forest_king') {
          // Ground slam shockwave + radial nature orbs
          sim.shockwaves.push({
            id: uid('bsw'),
            x: m.x,
            z: m.z,
            radius: 0.6,
            maxRadius: m.phase === 3 ? 6.0 : 4.5,
            speed: 5.5,
            damage: 16,
            color: '#22c55e',
            warningTimer: 0.5,
            hitPlayer: false,
          });
          const count = m.phase === 3 ? 6 : 3;
          for (let i = 0; i < count; i++) {
            const ang = count === 3 ? baseAng + (i - 1) * 0.35 : (Math.PI * 2 * i) / count;
            sim.projectiles.push({
              id: uid('bproj'),
              fromPlayer: false,
              kind: 'slime_glob',
              x: m.x,
              y: 0.7,
              z: m.z,
              vx: Math.sin(ang) * 5.2,
              vy: 0,
              vz: Math.cos(ang) * 5.2,
              damage: 15,
              color: '#4ade80',
              radius: 0.35,
              life: 2.6,
            });
          }
          audioEngine.playSfx('boss');
        } else {
          // Lava Dragon & other bosses: fireballs + wing flap gust shockwave!
          const count = m.phase === 3 ? 6 : m.phase === 2 ? 5 : 3;
          for (let i = 0; i < count; i++) {
            const ang =
              m.phase === 3
                ? (Math.PI * 2 * i) / count + m.animTime
                : baseAng + (i - Math.floor(count / 2)) * 0.28;
            sim.projectiles.push({
              id: uid('bproj'),
              fromPlayer: false,
              kind: tpl.projectileKind,
              x: m.x,
              y: 0.75,
              z: m.z,
              vx: Math.sin(ang) * (m.phase === 3 ? 6.2 : 5.4),
              vy: 0,
              vz: Math.cos(ang) * (m.phase === 3 ? 6.2 : 5.4),
              damage: 16,
              color: tpl.accentColor,
              radius: 0.35,
              life: 2.6,
            });
          }
          if (m.phase >= 2) {
            sim.shockwaves.push({
              id: uid('bsw'),
              x: m.x,
              z: m.z,
              radius: 0.6,
              maxRadius: 5.0,
              speed: 6.2,
              damage: 16,
              color: '#f97316',
              warningTimer: 0.45,
              hitPlayer: false,
            });
          }
          audioEngine.playSfx('boss');
        }
      }
    } else {
      // Regular / Elite Monster 7-state AI
      if (distToPlayer <= m.detectRange) {
        if (m.aiState === 'idle' || m.aiState === 'patrol') {
          m.aiState = 'detect';
          m.detectTimer = 0.25;
        } else if (m.aiState === 'detect') {
          m.detectTimer -= clampedDt;
          if (m.detectTimer <= 0) m.aiState = 'chase';
        } else {
          m.aiState = distToPlayer <= m.attackRange ? 'attack' : 'chase';
        }
      } else {
        m.aiState = 'patrol';
      }

      if (m.aiState === 'detect') {
        m.facing = Math.atan2(dx, dz);
      } else if (m.aiState === 'attack') {
        m.facing = Math.atan2(dx, dz);
        if (m.attackTimer <= 0) {
          m.attackTimer = m.attackCooldown;
          damagePlayer(sim, m.damage, m.x, m.z, callbacks);
        }
      } else if (m.aiState === 'chase') {
        moveMonsterWithAStar(sim, m, p.x, p.z, clampedDt);
      } else {
        // Patrol near origin
        m.patrolAngle += clampedDt * 0.85;
        const px = m.originX + Math.cos(m.patrolAngle) * 1.25;
        const pz = m.originZ + Math.sin(m.patrolAngle) * 1.25;
        const pdx = px - m.x;
        const pdz = pz - m.z;
        const plen = Math.hypot(pdx, pdz) || 1;
        if (plen > 0.1) {
          m.facing = Math.atan2(pdx, pdz);
          const mx = m.x + (pdx / plen) * m.speed * 0.5 * clampedDt;
          const mz = m.z + (pdz / plen) * m.speed * 0.5 * clampedDt;
          if (canStandAt(sim, mx, m.z, 0.25, m.isPhasing)) m.x = mx;
          if (canStandAt(sim, m.x, mz, 0.25, m.isPhasing)) m.z = mz;
        }
      }
    }
  }

  // Projectiles
  for (let i = sim.projectiles.length - 1; i >= 0; i--) {
    const proj = sim.projectiles[i];
    proj.life -= clampedDt;
    proj.x += proj.vx * clampedDt;
    proj.z += proj.vz * clampedDt;

    const gx = Math.round(proj.x);
    const gz = Math.round(proj.z);
    const t = getTileAt(sim, gx, gz);
    if (
      proj.life <= 0 ||
      !isTileWalkable(t, sim.doorOpen, sim.movingWallOpen, sim.unlockedDoors, gx, gz)
    ) {
      if (proj.kind === 'player_fireball' || proj.kind === 'player_ice') {
        const splashRad = 1.65;
        for (const m of sim.monsters) {
          if (!m.alive) continue;
          if (Math.hypot(m.x - proj.x, m.z - proj.z) <= splashRad) {
            damageMonster(sim, m, Math.round(proj.damage * 0.75), proj.x, proj.z, callbacks);
            if (proj.kind === 'player_fireball') m.burnTimer = 3.5;
            if (proj.kind === 'player_ice') m.freezeTimer = 3.6;
          }
        }
        spawnBurst(sim, proj.x, proj.y, proj.z, proj.color, 12);
      } else {
        spawnBurst(sim, proj.x, proj.y, proj.z, proj.color, 5);
      }
      sim.projectiles.splice(i, 1);
      continue;
    }

    if (proj.fromPlayer) {
      let hit = false;
      for (const m of sim.monsters) {
        if (!m.alive) continue;
        const hitRad = (m.isBoss ? 1.1 : m.isElite ? 0.85 : 0.68) + (proj.kind === 'player_fireball' || proj.kind === 'player_ice' ? 0.2 : 0);
        if (Math.hypot(m.x - proj.x, m.z - proj.z) < hitRad) {
          if (proj.kind === 'player_fireball' || proj.kind === 'player_ice') {
            const splashRad = 1.8;
            for (const other of sim.monsters) {
              if (!other.alive) continue;
              if (Math.hypot(other.x - proj.x, other.z - proj.z) <= splashRad) {
                const dmgScale = other.id === m.id ? 1.0 : 0.75;
                damageMonster(sim, other, Math.round(proj.damage * dmgScale), proj.x, proj.z, callbacks);
                if (proj.kind === 'player_fireball') {
                  other.burnTimer = 3.5;
                  other.burnTickTimer = 0;
                } else {
                  other.freezeTimer = 3.8;
                }
              }
            }
            spawnBurst(sim, proj.x, proj.y, proj.z, proj.color, 14);
          } else {
            damageMonster(sim, m, proj.damage, proj.x, proj.z, callbacks);
          }
          hit = true;
          break;
        }
      }
      if (hit) sim.projectiles.splice(i, 1);
    } else {
      if (Math.hypot(p.x - proj.x, p.z - proj.z) < 0.62 && p.y < 0.7) {
        damagePlayer(sim, proj.damage, proj.x, proj.z, callbacks);
        sim.projectiles.splice(i, 1);
      }
    }
  }

  // Lightning Arcs Decay
  for (let i = sim.lightningArcs.length - 1; i >= 0; i--) {
    sim.lightningArcs[i].life -= clampedDt;
    if (sim.lightningArcs[i].life <= 0) {
      sim.lightningArcs.splice(i, 1);
    }
  }

  // Particles & Floating Texts
  for (let i = sim.particles.length - 1; i >= 0; i--) {
    const pt = sim.particles[i];
    pt.life -= clampedDt;
    pt.x += pt.vx * clampedDt;
    pt.y = Math.max(0, pt.y + pt.vy * clampedDt);
    pt.vy -= 9 * clampedDt;
    pt.z += pt.vz * clampedDt;
    if (pt.life <= 0) sim.particles.splice(i, 1);
  }

  for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
    const ft = sim.floatingTexts[i];
    ft.life -= clampedDt;
    ft.y += 1.0 * clampedDt;
    if (ft.life <= 0) sim.floatingTexts.splice(i, 1);
  }
}

function makeSlimeHelper(x: number, z: number): MonsterEntity {
  const tpl = MONSTER_TEMPLATES.slime;
  return {
    id: uid('minionslime'),
    kind: 'slime',
    name: 'Mini Slime',
    isBoss: false,
    isElite: false,
    x,
    y: 0,
    z,
    originX: x,
    originZ: z,
    hp: 35,
    maxHp: 35,
    damage: tpl.baseDamage,
    defense: 0,
    speed: 2.7,
    detectRange: 14,
    attackRange: 1.2,
    attackCooldown: 1.2,
    attackTimer: 0.6,
    hitFlash: 0,
    stunTimer: 0,
    detectTimer: 0,
    invisibleTimer: 0,
    isPhasing: false,
    facing: 0,
    aiState: 'chase',
    patrolAngle: 0,
    pathTimer: 0,
    nextStepX: null,
    nextStepZ: null,
    phase: 1,
    specialTimer: 3,
    leapVy: 0,
    burnTimer: 0,
    burnTickTimer: 0,
    freezeTimer: 0,
    shockTimer: 0,
    alive: true,
    animTime: 0,
  };
}

function moveMonsterWithAStar(
  sim: LevelSimulation,
  m: MonsterEntity,
  targetX: number,
  targetZ: number,
  dt: number
): void {
  const effectiveSpeed = m.freezeTimer > 0 ? m.speed * 0.42 : m.speed;
  if (m.isPhasing) {
    // Phantom ghost can phase straight through walls!
    const dx = targetX - m.x;
    const dz = targetZ - m.z;
    const len = Math.hypot(dx, dz) || 1;
    m.facing = Math.atan2(dx, dz);
    const nx = m.x + (dx / len) * effectiveSpeed * dt;
    const nz = m.z + (dz / len) * effectiveSpeed * dt;
    if (canStandAt(sim, nx, nz, 0.25, true)) {
      m.x = nx;
      m.z = nz;
    }
    return;
  }

  m.pathTimer -= dt;
  if (m.pathTimer <= 0 || m.nextStepX === null || m.nextStepZ === null) {
    m.pathTimer = 0.4;
    const step = findNextAStarStep(sim, m.x, m.z, targetX, targetZ);
    if (step) {
      m.nextStepX = step.x;
      m.nextStepZ = step.z;
    } else {
      m.nextStepX = targetX;
      m.nextStepZ = targetZ;
    }
  }

  const goalX = m.nextStepX ?? targetX;
  const goalZ = m.nextStepZ ?? targetZ;
  const dx = goalX - m.x;
  const dz = goalZ - m.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.22) {
    m.nextStepX = null;
    m.nextStepZ = null;
    return;
  }

  m.facing = Math.atan2(dx, dz);
  const mx = m.x + (dx / dist) * effectiveSpeed * dt;
  const mz = m.z + (dz / dist) * effectiveSpeed * dt;
  if (canStandAt(sim, mx, m.z, 0.26)) m.x = mx;
  if (canStandAt(sim, m.x, mz, 0.26)) m.z = mz;
}

function damageMonster(
  sim: LevelSimulation,
  m: MonsterEntity,
  rawAmount: number,
  fromX: number,
  fromZ: number,
  callbacks: SimulationCallbacks
): void {
  const amount = Math.max(8, rawAmount - m.defense);
  m.hp = Math.max(0, m.hp - amount);
  m.hitFlash = 0.2;
  if (!m.isBoss) {
    m.stunTimer = 0.22;
  }

  const dx = m.x - fromX;
  const dz = m.z - fromZ;
  const len = Math.hypot(dx, dz) || 1;
  const kb = m.isBoss ? 0.2 : m.isElite ? 0.35 : 0.55;
  const kx = m.x + (dx / len) * kb;
  const kz = m.z + (dz / len) * kb;
  if (canStandAt(sim, kx, kz, 0.3)) {
    m.x = kx;
    m.z = kz;
  }

  const tpl = MONSTER_TEMPLATES[m.kind];
  spawnBurst(sim, m.x, 0.5, m.z, tpl.accentColor, 8);
  addFloatingText(sim, m.x, 0.7, m.z, `-${amount}`, '#ffffff');
  audioEngine.playSfx('monster');

  if (m.hp <= 0) {
    m.alive = false;
    m.aiState = 'defeated';
    sim.monstersDefeatedThisRun += 1;
    const coinDrop = m.isBoss ? 150 : m.isElite ? 35 : 15;
    sim.coinsEarnedThisRun += coinDrop;
    callbacks.onCoinsCollected(coinDrop);
    spawnBurst(sim, m.x, 0.6, m.z, '#facc15', m.isBoss ? 28 : 12);
    addFloatingText(sim, m.x, 1.0, m.z, `+${coinDrop} Koin!`, '#fde047');

    if (m.isBoss) {
      sim.bossDefeated = true;
      sim.exitUnlocked = true;
      sim.bannerMessage = `${m.name} Dikalahkan! Portal Keluar Terbuka!`;
      sim.bannerTimer = 3.8;
      audioEngine.playSfx('victory');
    }
  }
}
