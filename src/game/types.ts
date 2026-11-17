export type CharacterId = 'nabil' | 'jihan';
export type GraphicsMode = '2d' | '3d';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type CameraPOV = 'third_person' | 'first_person' | 'top_view';
export type MagicSpellId = 'fireball' | 'lightning' | 'ice';

export type CostumeCategory =
  | 'baju'
  | 'celana'
  | 'topi'
  | 'rambut'
  | 'sepatu'
  | 'aksesoris';

export type WeaponId =
  | 'toy_sword'
  | 'cartoon_hammer'
  | 'bubble_blaster'
  | 'magic_wand';

export type PowerUpType =
  | 'gold_coin'
  | 'key'
  | 'heart'
  | 'speed_boost'
  | 'shield'
  | 'magnet_coin'
  | 'jump_boost'
  | 'mystery_box';

export type MonsterKind =
  | 'slime'
  | 'shadow_slime'
  | 'bone_knight'
  | 'phantom_ghost'
  | 'lava_golem'
  | 'forest_king'
  | 'lava_dragon'
  | 'fire'
  | 'ice'
  | 'ghost'
  | 'dragon';

export type MonsterAIState =
  | 'idle'
  | 'patrol'
  | 'detect'
  | 'chase'
  | 'attack'
  | 'stunned'
  | 'defeated';

export type WorldId = 1 | 2 | 3 | 4 | 5;

export interface CostumeItem {
  id: string;
  name: string;
  category: CostumeCategory;
  price: number;
  color: string;
  accentColor?: string;
  style: string;
  description: string;
  wingStyle?: 'mini' | 'dragon_fire' | 'dragon_energy';
  auraColor?: string;
  unlockHint?: string;
}

export interface MagicSpellDef {
  id: MagicSpellId;
  name: string;
  shortLabel: string;
  mpCost: number;
  cooldown: number;
  damage: number;
  color: string;
  description: string;
}

export interface EquippedCostume {
  baju: string;
  celana: string;
  topi: string;
  rambut: string;
  sepatu: string;
  aksesoris: string;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  damage: number;
  range: number;
  cooldown: number;
  isRanged: boolean;
  projectileSpeed?: number;
  color: string;
  price: number;
  description: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  tagline: string;
  skinColor: string;
  defaultCostume: EquippedCostume;
  stats: {
    maxHp: number;
    speed: number;
    jumpForce: number;
    attackBonus: number;
  };
}

export interface WorldDef {
  id: WorldId;
  name: string;
  subtitle: string;
  themeColor: string;
  bgGradient: string;
  floorColor: string;
  wallColor: string;
  wallTopColor: string;
  hazardColor: string;
  skyColor: string;
  fogColor: string;
  monsterKind: MonsterKind;
  bossName: string;
  bossSubtitle: string;
  mechanicLabel: string;
}

export type TileType =
  | 'wall'
  | 'floor'
  | 'bridge'
  | 'lava'
  | 'ice'
  | 'spike_trap'
  | 'locked_door'
  | 'secret_door'
  | 'secret_switch'
  | 'secret_passage'
  | 'moving_wall'
  | 'treasure_floor'
  | 'void'
  | 'checkpoint'
  | 'exit'
  | 'start';

export interface LevelItemSpawn {
  id: string;
  type: PowerUpType;
  x: number;
  z: number;
  collected: boolean;
  bobOffset: number;
}

export interface MonsterEntity {
  id: string;
  kind: MonsterKind;
  name: string;
  isBoss: boolean;
  isElite: boolean;
  x: number;
  y: number;
  z: number;
  originX: number;
  originZ: number;
  hp: number;
  maxHp: number;
  damage: number;
  defense: number;
  speed: number;
  detectRange: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  hitFlash: number;
  stunTimer: number;
  detectTimer: number;
  invisibleTimer: number;
  isPhasing: boolean;
  facing: number;
  aiState: MonsterAIState;
  patrolAngle: number;
  pathTimer: number;
  nextStepX: number | null;
  nextStepZ: number | null;
  phase: 1 | 2 | 3;
  specialTimer: number;
  leapVy: number;
  burnTimer: number;
  burnTickTimer: number;
  freezeTimer: number;
  shockTimer: number;
  alive: boolean;
  animTime: number;
}

export interface ProjectileEntity {
  id: string;
  fromPlayer: boolean;
  kind:
    | 'bubble'
    | 'star'
    | 'slime_glob'
    | 'fireball'
    | 'ice_shard'
    | 'ghost_orb'
    | 'dragon_flame'
    | 'player_fireball'
    | 'player_ice';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  color: string;
  radius: number;
  life: number;
}

export interface LightningArc {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface ShockwaveRing {
  id: string;
  x: number;
  z: number;
  radius: number;
  maxRadius: number;
  speed: number;
  damage: number;
  color: string;
  warningTimer: number;
  hitPlayer: boolean;
}

export interface RollingBoulder {
  id: string;
  x: number;
  z: number;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  dir: 1 | -1;
  speed: number;
  angle: number;
}

export interface FallingRock {
  id: string;
  x: number;
  z: number;
  y: number;
  timer: number;
  cycle: number;
  active: boolean;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface ParticleBurst {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  keysHeld: number;
  grounded: boolean;
  animState: 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'hit';
  animTime: number;
  attackTimer: number;
  attackCooldown: number;
  hitTimer: number;
  invulnTimer: number;
  timeSinceLastHit: number;
  regenTickTimer: number;
  damageFlashTimer: number;
  koCount: number;
  magicCooldowns: Record<MagicSpellId, number>;
  speedBoostTimer: number;
  shieldTimer: number;
  magnetTimer: number;
  jumpBoostTimer: number;
  checkpointX: number;
  checkpointZ: number;
  checkpointReached: boolean;
}

export interface MazeLevelData {
  worldId: WorldId;
  levelNumber: number;
  campaignIndex: number; // 1..10 for primary campaign, or extended
  title: string;
  subtitle: string;
  isFoggy: boolean;
  width: number;
  height: number;
  tiles: TileType[][];
  startX: number;
  startZ: number;
  exitX: number;
  exitZ: number;
  checkpointX: number;
  checkpointZ: number;
  switchPos?: { x: number; z: number };
  doorPos?: { x: number; z: number };
  isBossLevel: boolean;
}

export interface LevelSimulation {
  worldId: WorldId;
  levelNumber: number;
  levelData: MazeLevelData;
  player: PlayerState;
  monsters: MonsterEntity[];
  items: LevelItemSpawn[];
  projectiles: ProjectileEntity[];
  lightningArcs: LightningArc[];
  shockwaves: ShockwaveRing[];
  boulders: RollingBoulder[];
  fallingRocks: FallingRock[];
  particles: ParticleBurst[];
  floatingTexts: FloatingText[];
  doorOpen: boolean;
  unlockedDoors: Set<string>;
  movingWallOpen: boolean;
  movingWallTimer: number;
  spikeActive: boolean;
  spikeTimer: number;
  bossDefeated: boolean;
  exitUnlocked: boolean;
  levelCompleted: boolean;
  gameOver: boolean;
  coinsEarnedThisRun: number;
  monstersDefeatedThisRun: number;
  elapsedTime: number;
  bannerMessage: string | null;
  bannerTimer: number;
}

export interface SaveData {
  version: number;
  hasStarted: boolean;
  selectedCharacter: CharacterId;
  unlockedWorld: WorldId;
  unlockedLevels: Record<WorldId, number>;
  completedLevels: Record<string, number>;
  lastWorld: WorldId;
  lastLevel: number;
  lastCheckpoint: {
    worldId: WorldId;
    levelNumber: number;
    x: number;
    z: number;
  } | null;
  coins: number;
  ownedCostumes: string[];
  equippedCostumes: Record<CharacterId, EquippedCostume>;
  ownedWeapons: WeaponId[];
  equippedWeapon: WeaponId;
  consumables: {
    heart: number;
    speed_boost: number;
    shield: number;
    magnet_coin: number;
    jump_boost: number;
  };
  settings: {
    defaultMode: GraphicsMode;
    quality: GraphicsQuality;
    musicVolume: number;
    sfxVolume: number;
    unlockAllPreview: boolean;
  };
}

export type ScreenName =
  | 'menu'
  | 'character'
  | 'world_map'
  | 'shop'
  | 'inventory'
  | 'settings'
  | 'playing'
  | 'exited';

export interface InputState {
  moveX: number;
  moveZ: number;
  jumpPressed: boolean;
  attackPressed: boolean;
  interactPressed: boolean;
}
