import { CHARACTERS } from './catalog';
import { CharacterId, GraphicsMode, GraphicsQuality, SaveData, WeaponId, WorldId } from './types';

const STORAGE_KEY = 'nkj_maze_adventure_save_v2';

export function createDefaultSaveData(): SaveData {
  return {
    version: 2,
    hasStarted: false,
    selectedCharacter: 'nabil',
    unlockedWorld: 1,
    unlockedLevels: {
      1: 1,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
    },
    completedLevels: {},
    lastWorld: 1,
    lastLevel: 1,
    lastCheckpoint: null,
    coins: 75,
    ownedCostumes: [
      'baju_koko_cokelat',
      'baju_garis_jihan',
      'celana_cokelat',
      'celana_rok_pink',
      'topi_none',
      'rambut_nabil_klasik',
      'rambut_jihan_pita',
      'sepatu_putih',
      'sepatu_pink',
      'aks_none',
      'aks_pita_pink',
    ],
    equippedCostumes: {
      nabil: { ...CHARACTERS.nabil.defaultCostume },
      jihan: { ...CHARACTERS.jihan.defaultCostume },
    },
    ownedWeapons: ['toy_sword'],
    equippedWeapon: 'toy_sword',
    consumables: {
      heart: 2,
      speed_boost: 1,
      shield: 1,
      magnet_coin: 1,
      jump_boost: 1,
    },
    settings: {
      defaultMode: '3d',
      quality: 'medium',
      musicVolume: 0.45,
      sfxVolume: 0.7,
      unlockAllPreview: false,
    },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const def = createDefaultSaveData();
    return {
      ...def,
      ...parsed,
      unlockedLevels: { ...def.unlockedLevels, ...(parsed.unlockedLevels || {}) },
      completedLevels: { ...(parsed.completedLevels || {}) },
      equippedCostumes: {
        nabil: { ...def.equippedCostumes.nabil, ...(parsed.equippedCostumes?.nabil || {}) },
        jihan: { ...def.equippedCostumes.jihan, ...(parsed.equippedCostumes?.jihan || {}) },
      },
      consumables: { ...def.consumables, ...(parsed.consumables || {}) },
      settings: { ...def.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return createDefaultSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetSaveData(keepSettings?: SaveData['settings']): SaveData {
  const fresh = createDefaultSaveData();
  if (keepSettings) {
    fresh.settings = { ...keepSettings };
  }
  persistSaveData(fresh);
  return fresh;
}

export function isWorldUnlocked(save: SaveData, worldId: WorldId): boolean {
  if (save.settings.unlockAllPreview) return true;
  return worldId <= save.unlockedWorld;
}

export function isLevelUnlocked(save: SaveData, worldId: WorldId, levelNumber: number): boolean {
  if (save.settings.unlockAllPreview) return true;
  if (!isWorldUnlocked(save, worldId)) return false;
  return levelNumber <= (save.unlockedLevels[worldId] || 1);
}

export function updateSettings(
  save: SaveData,
  patch: Partial<{
    defaultMode: GraphicsMode;
    quality: GraphicsQuality;
    musicVolume: number;
    sfxVolume: number;
    unlockAllPreview: boolean;
  }>
): SaveData {
  const next: SaveData = {
    ...save,
    settings: {
      ...save.settings,
      ...patch,
    },
  };
  persistSaveData(next);
  return next;
}

export function equipCharacter(save: SaveData, characterId: CharacterId): SaveData {
  const next: SaveData = { ...save, selectedCharacter: characterId };
  persistSaveData(next);
  return next;
}

export function equipWeapon(save: SaveData, weaponId: WeaponId): SaveData {
  const next: SaveData = { ...save, equippedWeapon: weaponId };
  persistSaveData(next);
  return next;
}
