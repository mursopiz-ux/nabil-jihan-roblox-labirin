import { CAMPAIGN_LEVEL_SPECS, MONSTER_TEMPLATES, getWorldById } from './catalog';
import {
  FallingRock,
  LevelItemSpawn,
  MazeLevelData,
  MonsterEntity,
  MonsterKind,
  PowerUpType,
  RollingBoulder,
  TileType,
  WorldId,
} from './types';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface GridPoint {
  x: number;
  z: number;
}

function bfsDistances(
  tiles: TileType[][],
  startX: number,
  startZ: number,
  passable: (t: TileType) => boolean
): number[][] {
  const h = tiles.length;
  const w = tiles[0].length;
  const dist = Array.from({ length: h }, () => Array(w).fill(-1));
  const queue: GridPoint[] = [{ x: startX, z: startZ }];
  dist[startZ][startX] = 0;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const [dx, dz] of dirs) {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      if (nx >= 0 && nx < w && nz >= 0 && nz < h && dist[nz][nx] === -1 && passable(tiles[nz][nx])) {
        dist[nz][nx] = dist[cur.z][cur.x] + 1;
        queue.push({ x: nx, z: nz });
      }
    }
  }
  return dist;
}

export function isTileWalkable(
  tile: TileType,
  doorOpen: boolean,
  movingWallOpen: boolean,
  unlockedDoors?: Set<string>,
  gx?: number,
  gz?: number
): boolean {
  if (tile === 'wall') return false;
  if (tile === 'secret_door') return doorOpen;
  if (tile === 'moving_wall') return movingWallOpen;
  if (tile === 'locked_door') {
    if (unlockedDoors && gx !== undefined && gz !== undefined) {
      return unlockedDoors.has(`${gx},${gz}`);
    }
    return false;
  }
  return true;
}

function makeMonster(
  id: string,
  kind: MonsterKind,
  x: number,
  z: number,
  isBoss: boolean,
  hpScale = 1
): MonsterEntity {
  const tpl = MONSTER_TEMPLATES[kind];
  const hp = isBoss ? 500 : Math.round(tpl.baseHp * hpScale);
  return {
    id,
    kind,
    name: tpl.name,
    isBoss,
    isElite: tpl.isElite,
    x,
    y: 0,
    z,
    originX: x,
    originZ: z,
    hp,
    maxHp: hp,
    damage: tpl.baseDamage,
    defense: tpl.defense,
    speed: tpl.baseSpeed,
    detectRange: tpl.detectRange,
    attackRange: isBoss ? 2.1 : 1.35,
    attackCooldown: kind === 'bone_knight' || kind === 'lava_golem' ? 1.55 : 1.15,
    attackTimer: 0.4,
    hitFlash: 0,
    stunTimer: 0,
    detectTimer: 0,
    invisibleTimer: 0,
    isPhasing: false,
    facing: Math.PI,
    aiState: 'patrol',
    patrolAngle: 0,
    pathTimer: 0,
    nextStepX: null,
    nextStepZ: null,
    phase: 1,
    specialTimer: isBoss ? 2.4 : 3.2,
    leapVy: 0,
    alive: true,
    animTime: 0,
  };
}

export function generateMazeLevel(worldId: WorldId, levelNumber: number): {
  levelData: MazeLevelData;
  monsters: MonsterEntity[];
  items: LevelItemSpawn[];
  boulders: RollingBoulder[];
  fallingRocks: FallingRock[];
} {
  const campaignSpec = CAMPAIGN_LEVEL_SPECS.find(
    (s) => s.worldId === worldId && s.levelNumber === levelNumber
  );
  const campaignIndex = campaignSpec ? campaignSpec.campaignLevel : (worldId - 1) * 10 + levelNumber;
  const isBossLevel =
    (worldId === 1 && levelNumber === 5) ||
    (worldId === 2 && levelNumber === 5) ||
    levelNumber === 10;
  const isFoggy = worldId === 1 && levelNumber === 2;

  const seed = worldId * 3137 + levelNumber * 193 + 77;
  const rng = mulberry32(seed);

  // Larger, more intricate mazes (13x13 up to 19x19!)
  let size = 13 + Math.floor((levelNumber - 1) / 2) * 2 + (worldId >= 2 ? 2 : 0);
  if (size % 2 === 0) size += 1;
  size = Math.min(19, Math.max(13, size));
  if (isBossLevel) {
    size = 17; // Boss Arena + Pre-Boss Checkpoint Corridor
  }

  const width = size;
  const height = size;
  const tiles: TileType[][] = Array.from({ length: height }, () => Array(width).fill('wall'));

  let startX = 1;
  let startZ = 1;
  let exitX = width - 2;
  let exitZ = height - 2;
  let checkpointX = 1;
  let checkpointZ = 1;

  if (isBossLevel) {
    // Handcrafted Pre-Boss Entry Corridor + Checkpoint + Pillars Boss Arena!
    startX = 1;
    startZ = Math.floor(height / 2);
    // Entry corridor leading to Checkpoint before Arena
    for (let x = 1; x <= 4; x++) {
      tiles[startZ][x] = 'floor';
    }
    checkpointX = 4;
    checkpointZ = startZ;

    // Boss Arena from x=5..width-2, z=2..height-3
    for (let z = 2; z < height - 2; z++) {
      for (let x = 5; x < width - 1; x++) {
        tiles[z][x] = 'floor';
      }
    }
    // Strategic cover pillars inside arena
    const pillars = [
      [8, 4],
      [8, height - 5],
      [width - 5, 4],
      [width - 5, height - 5],
    ];
    for (const [px, pz] of pillars) {
      tiles[pz][px] = 'wall';
    }
    // Lava moat border pockets on Lava Dragon arena
    if (worldId === 2) {
      tiles[3][6] = 'lava';
      tiles[height - 4][6] = 'lava';
      tiles[3][width - 3] = 'lava';
      tiles[height - 4][width - 3] = 'lava';
    }

    tiles[startZ][startX] = 'start';
    tiles[checkpointZ][checkpointX] = 'checkpoint';
    exitX = width - 2;
    exitZ = Math.floor(height / 2);
    tiles[exitZ][exitX] = 'exit';
  } else {
    // Complex Recursive Backtracker + Branching Loops + Dead Ends + Secret Treasure Room
    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const stack: GridPoint[] = [{ x: 1, z: 1 }];
    visited[1][1] = true;
    tiles[1][1] = 'floor';

    const dirs = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ];

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const shuffled = [...dirs].sort(() => rng() - 0.5);
      let carved = false;
      for (const [dx, dz] of shuffled) {
        const nx = top.x + dx;
        const nz = top.z + dz;
        if (nx > 0 && nx < width - 1 && nz > 0 && nz < height - 1 && !visited[nz][nx]) {
          visited[nz][nx] = true;
          tiles[top.z + dz / 2][top.x + dx / 2] = 'floor';
          tiles[nz][nx] = 'floor';
          stack.push({ x: nx, z: nz });
          carved = true;
          break;
        }
      }
      if (!carved) stack.pop();
    }

    // Add controlled loops (intersections) while keeping plenty of dead ends!
    const loopCount = Math.floor(width * 0.65);
    for (let i = 0; i < loopCount; i++) {
      const rx = 2 + Math.floor(rng() * (width - 4));
      const rz = 2 + Math.floor(rng() * (height - 4));
      if (tiles[rz][rx] === 'wall') {
        const horiz = tiles[rz][rx - 1] === 'floor' && tiles[rz][rx + 1] === 'floor';
        const vert = tiles[rz - 1][rx] === 'floor' && tiles[rz + 1][rx] === 'floor';
        if (horiz || vert) {
          tiles[rz][rx] = 'floor';
        }
      }
    }

    // Carve a Hidden Treasure Room (2x2 or 3x2) connected by a Secret Passage!
    let treasureOrigin: GridPoint | null = null;
    for (let z = 3; z < height - 4 && !treasureOrigin; z += 2) {
      for (let x = 3; x < width - 4 && !treasureOrigin; x += 2) {
        // Look for a wall block adjacent to a floor tile
        if (tiles[z][x] === 'wall' && tiles[z][x + 1] === 'wall') {
          if (tiles[z - 1][x] === 'floor' || tiles[z + 1][x] === 'floor') {
            tiles[z][x] = 'treasure_floor';
            tiles[z][x + 1] = 'treasure_floor';
            if (tiles[z - 1][x] === 'floor') {
              // Ensure it's accessed via secret passage
            }
            treasureOrigin = { x, z };
          }
        }
      }
    }

    // Also add 2 secret passages connecting distant corridors
    let secretCount = 0;
    for (let z = 2; z < height - 2 && secretCount < 2; z++) {
      for (let x = 2; x < width - 2 && secretCount < 2; x++) {
        if (tiles[z][x] === 'wall' && rng() < 0.14) {
          const hOpen = tiles[z][x - 1] === 'floor' && tiles[z][x + 1] === 'floor';
          const vOpen = tiles[z - 1][x] === 'floor' && tiles[z + 1][x] === 'floor';
          if (hOpen || vOpen) {
            tiles[z][x] = 'secret_passage';
            secretCount++;
          }
        }
      }
    }

    tiles[startZ][startX] = 'start';

    // BFS from start to find deepest point for Exit & midpoint for Checkpoint
    const distMap = bfsDistances(
      tiles,
      startX,
      startZ,
      (t) => t !== 'wall' && t !== 'void'
    );
    let maxDist = -1;
    for (let z = 1; z < height - 1; z++) {
      for (let x = 1; x < width - 1; x++) {
        if (distMap[z][x] > maxDist) {
          maxDist = distMap[z][x];
          exitX = x;
          exitZ = z;
        }
      }
    }
    tiles[exitZ][exitX] = 'exit';

    // Midpoint checkpoint
    const targetCp = Math.max(5, Math.floor(maxDist * 0.52));
    let bestDelta = 999;
    for (let z = 1; z < height - 1; z++) {
      for (let x = 1; x < width - 1; x++) {
        const d = distMap[z][x];
        if (d > 3 && (x !== exitX || z !== exitZ)) {
          const delta = Math.abs(d - targetCp);
          if (delta < bestDelta) {
            bestDelta = delta;
            checkpointX = x;
            checkpointZ = z;
          }
        }
      }
    }
    tiles[checkpointZ][checkpointX] = 'checkpoint';
  }

  // Gather floor coordinates & distances
  const distFromStart = bfsDistances(
    tiles,
    startX,
    startZ,
    (t) => t !== 'wall' && t !== 'void'
  );
  const floorCoords: GridPoint[] = [];
  const treasureCoords: GridPoint[] = [];
  for (let z = 1; z < height - 1; z++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[z][x] === 'floor') floorCoords.push({ x, z });
      if (tiles[z][x] === 'treasure_floor') treasureCoords.push({ x, z });
    }
  }

  // Place Locked Door + Collectible Key on Level 3+ (non-boss) with solvability verification!
  const items: LevelItemSpawn[] = [];
  let itemIdx = 0;

  if (!isBossLevel && campaignIndex >= 3) {
    // Find a choke point tile adjacent to Exit or at ~75% distance that splits the graph, OR place Locked Door just before Exit!
    const doorCandidates = floorCoords.filter((pt) => {
      const d = distFromStart[pt.z][pt.x];
      const nearExit = Math.abs(pt.x - exitX) + Math.abs(pt.z - exitZ) === 1;
      return nearExit && d > 4;
    });

    if (doorCandidates.length > 0) {
      const doorPt = doorCandidates[0];
      tiles[doorPt.z][doorPt.x] = 'locked_door';
      // Verify which tiles are STILL reachable from start WITHOUT passing through locked_door!
      const preDoorDist = bfsDistances(
        tiles,
        startX,
        startZ,
        (t) => t !== 'wall' && t !== 'void' && t !== 'locked_door'
      );

      // If exit is unreachable without the door, awesome — put the Key in a deep reachable dead-end BEFORE the door!
      const keyCandidates = floorCoords.filter(
        (pt) =>
          preDoorDist[pt.z][pt.x] >= 6 &&
          (pt.x !== checkpointX || pt.z !== checkpointZ) &&
          (pt.x !== doorPt.x || pt.z !== doorPt.z)
      );
      if (keyCandidates.length > 0) {
        keyCandidates.sort((a, b) => preDoorDist[b.z][b.x] - preDoorDist[a.z][a.x]);
        const keyPt = keyCandidates[Math.min(keyCandidates.length - 1, Math.floor(rng() * Math.min(4, keyCandidates.length)))];
        items.push({
          id: `key_${worldId}_${levelNumber}`,
          type: 'key',
          x: keyPt.x,
          z: keyPt.z,
          collected: false,
          bobOffset: 0,
        });
      } else {
        // Fallback: revert door so never unsolvable
        tiles[doorPt.z][doorPt.x] = 'floor';
      }
    }
  }

  // World & Level Mechanics: Bridges, Spike Traps, Lava, Rolling Boulders
  if (!isBossLevel) {
    for (const pt of floorCoords) {
      const d = distFromStart[pt.z][pt.x];
      if (d < 3) continue;

      // Narrow Bridges (Level 3+, World 1 & World 2 & World 5)
      if ((campaignIndex === 3 || campaignIndex === 7 || worldId === 5) && rng() < 0.16) {
        tiles[pt.z][pt.x] = 'bridge';
        continue;
      }

      // Spike Traps (Level 4+)
      if (campaignIndex >= 4 && rng() < 0.08) {
        tiles[pt.z][pt.x] = 'spike_trap';
        continue;
      }

      // Lava tiles on Volcano / World 2 (keep walkable detour or jumpable 1-tile)
      if (worldId === 2 && rng() < 0.085) {
        tiles[pt.z][pt.x] = 'lava';
      }

      // Slippery Ice on World 3
      if (worldId === 3 && rng() < 0.35) {
        tiles[pt.z][pt.x] = 'ice';
      }
    }

    // Re-verify safe path around lava so player never gets soft-locked
    if (worldId === 2) {
      const lavaSafe = bfsDistances(
        tiles,
        startX,
        startZ,
        (t) => t !== 'wall' && t !== 'void' && t !== 'lava'
      );
      if (lavaSafe[exitZ][exitX] === -1) {
        for (const pt of floorCoords) {
          if (tiles[pt.z][pt.x] === 'lava' && rng() < 0.7) {
            tiles[pt.z][pt.x] = 'bridge'; // Lava bridge!
          }
        }
      }
    }
  }

  // Rolling Boulders in straight corridors (Level 6+)
  const boulders: RollingBoulder[] = [];
  if (!isBossLevel && campaignIndex >= 6) {
    for (let z = 2; z < height - 2 && boulders.length < 2; z += 2) {
      let runStart = -1;
      for (let x = 1; x < width - 1; x++) {
        const walkable = tiles[z][x] === 'floor' || tiles[z][x] === 'bridge';
        if (walkable) {
          if (runStart === -1) runStart = x;
        } else {
          if (runStart !== -1 && x - runStart >= 5) {
            boulders.push({
              id: `boulder_${boulders.length}`,
              x: runStart + 1,
              z,
              startX: runStart + 1,
              startZ: z,
              endX: x - 2,
              endZ: z,
              dir: 1,
              speed: 3.1,
              angle: 0,
            });
          }
          runStart = -1;
        }
      }
    }
  }

  // Falling Rocks (Level 7+ / World 2)
  const fallingRocks: FallingRock[] = [];
  if (worldId === 2 && campaignIndex >= 7) {
    const rockCount = isBossLevel ? 5 : 3;
    for (let i = 0; i < rockCount && floorCoords.length > 0; i++) {
      const pt = floorCoords[Math.floor(rng() * floorCoords.length)];
      if (distFromStart[pt.z][pt.x] > 3) {
        fallingRocks.push({
          id: `rock_${i}`,
          x: pt.x,
          z: pt.z,
          y: 7,
          timer: rng() * 3.5,
          cycle: 4.0,
          active: true,
        });
      }
    }
  }

  // Treasure Room Loot
  for (const tp of treasureCoords) {
    items.push({
      id: `tr_coin_${itemIdx++}`,
      type: 'gold_coin',
      x: tp.x,
      z: tp.z,
      collected: false,
      bobOffset: rng() * 3,
    });
    if (rng() < 0.6) {
      items.push({
        id: `tr_box_${itemIdx++}`,
        type: 'mystery_box',
        x: tp.x,
        z: tp.z,
        collected: false,
        bobOffset: rng() * 3,
      });
    }
  }

  // Regular Coins, Hearts, Power-ups
  const powerPool: PowerUpType[] = [
    'heart',
    'speed_boost',
    'shield',
    'magnet_coin',
    'jump_boost',
    'mystery_box',
  ];
  for (const pt of floorCoords) {
    if ((pt.x === startX && pt.z === startZ) || (pt.x === exitX && pt.z === exitZ)) continue;
    const t = tiles[pt.z][pt.x];
    if (t === 'lava' || t === 'spike_trap' || t === 'locked_door') continue;
    const roll = rng();
    if (roll < 0.22) {
      items.push({
        id: `item_${itemIdx++}`,
        type: 'gold_coin',
        x: pt.x,
        z: pt.z,
        collected: false,
        bobOffset: rng() * Math.PI * 2,
      });
    } else if (roll < 0.275) {
      const chosen = powerPool[Math.floor(rng() * powerPool.length)];
      items.push({
        id: `item_${itemIdx++}`,
        type: chosen,
        x: pt.x,
        z: pt.z,
        collected: false,
        bobOffset: rng() * Math.PI * 2,
      });
    }
  }

  // Spawn Cute Horror Monsters & Bosses matching the 10-Level Difficulty Table!
  const monsters: MonsterEntity[] = [];
  if (isBossLevel) {
    const bossKind: MonsterKind =
      worldId === 1
        ? 'forest_king'
        : worldId === 2
        ? 'lava_dragon'
        : worldId === 3
        ? 'ice'
        : worldId === 4
        ? 'phantom_ghost'
        : 'dragon';

    const boss = makeMonster(`boss_w${worldId}`, bossKind, width - 5, Math.floor(height / 2), true, 1);
    if (worldId >= 3) {
      boss.name = getWorldById(worldId).bossName;
      boss.hp = 500;
      boss.maxHp = 500;
    }
    monsters.push(boss);
  } else {
    const candidates = floorCoords.filter((pt) => {
      const d = distFromStart[pt.z][pt.x];
      const t = tiles[pt.z][pt.x];
      return d >= 4 && t !== 'lava' && t !== 'spike_trap' && t !== 'locked_door';
    });

    const monsterCount = Math.min(8, 3 + Math.floor(campaignIndex * 0.45));
    for (let i = 0; i < monsterCount && candidates.length > 0; i++) {
      const idx = Math.floor(rng() * candidates.length);
      const pt = candidates.splice(idx, 1)[0];

      let kind: MonsterKind = 'slime';
      if (campaignIndex === 1) kind = 'slime';
      else if (campaignIndex === 2) kind = i % 2 === 0 ? 'slime' : 'shadow_slime';
      else if (campaignIndex === 3) kind = i === 0 ? 'shadow_slime' : i % 2 === 0 ? 'shadow_slime' : 'slime';
      else if (campaignIndex === 4) kind = i === 0 ? 'bone_knight' : 'shadow_slime';
      else if (campaignIndex === 6) kind = i % 2 === 0 ? 'fire' : 'shadow_slime';
      else if (campaignIndex === 7) kind = i === 0 ? 'bone_knight' : 'fire';
      else if (campaignIndex === 8) kind = i % 2 === 0 ? 'phantom_ghost' : 'shadow_slime';
      else if (campaignIndex === 9) kind = i < 2 ? 'lava_golem' : i % 2 === 0 ? 'phantom_ghost' : 'fire';
      else if (worldId === 3) kind = i === 0 ? 'bone_knight' : 'ice';
      else if (worldId === 4) kind = i % 2 === 0 ? 'phantom_ghost' : 'bone_knight';
      else if (worldId === 5) kind = i === 0 ? 'lava_golem' : 'dragon';

      monsters.push(
        makeMonster(`mon_${worldId}_${levelNumber}_${i}`, kind, pt.x, pt.z, false, 1 + levelNumber * 0.04)
      );
    }

    // Treasure Room Guardian!
    if (treasureCoords.length > 0) {
      const guardKind: MonsterKind =
        worldId === 2 ? 'lava_golem' : campaignIndex >= 4 ? 'bone_knight' : 'shadow_slime';
      monsters.push(
        makeMonster(`guard_${worldId}_${levelNumber}`, guardKind, treasureCoords[0].x, treasureCoords[0].z, false, 1.1)
      );
    }
  }

  // Secret switch & door for World 3
  let switchPos: { x: number; z: number } | undefined;
  let doorPos: { x: number; z: number } | undefined;
  if (worldId === 3 && !isBossLevel && floorCoords.length > 6) {
    const sw = floorCoords[Math.floor(floorCoords.length * 0.25)];
    tiles[sw.z][sw.x] = 'secret_switch';
    switchPos = sw;
  }

  return {
    levelData: {
      worldId,
      levelNumber,
      campaignIndex,
      title: campaignSpec ? campaignSpec.title : `${getWorldById(worldId).name} ${levelNumber}`,
      subtitle: campaignSpec ? campaignSpec.subtitle : getWorldById(worldId).subtitle,
      isFoggy,
      width,
      height,
      tiles,
      startX,
      startZ,
      exitX,
      exitZ,
      checkpointX,
      checkpointZ,
      switchPos,
      doorPos,
      isBossLevel,
    },
    monsters,
    items,
    boulders,
    fallingRocks,
  };
}
