import { useCallback, useEffect, useState } from 'react';
import { GameView } from './components/GameView';
import { MainMenu } from './components/MainMenu';
import {
  CharacterSelectScreen,
  CostumeShopScreen,
  ExitScreen,
  InventoryScreen,
  SettingsScreen,
  WorldMapScreen,
} from './components/Screens';
import { audioEngine } from './game/audio';
import { WEAPONS } from './game/catalog';
import {
  equipCharacter,
  loadSaveData,
  persistSaveData,
  resetSaveData,
  updateSettings,
} from './game/storage';
import {
  CharacterId,
  CostumeCategory,
  SaveData,
  ScreenName,
  WeaponId,
  WorldId,
} from './game/types';

export default function App() {
  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<ScreenName>('menu');
  const [activeLevel, setActiveLevel] = useState<{
    worldId: WorldId;
    levelNumber: number;
    checkpoint: { x: number; z: number } | null;
  }>({
    worldId: saveData.lastWorld,
    levelNumber: saveData.lastLevel,
    checkpoint: null,
  });

  // Sync audio volumes and unlock WebAudio on first gesture
  useEffect(() => {
    audioEngine.setVolumes(saveData.settings.musicVolume, saveData.settings.sfxVolume);
  }, [saveData.settings.musicVolume, saveData.settings.sfxVolume]);

  useEffect(() => {
    const unlock = () => {
      audioEngine.unlock();
      if (screen !== 'playing' && screen !== 'exited') {
        audioEngine.startMusic('menu');
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [screen]);

  useEffect(() => {
    if (screen === 'exited') {
      audioEngine.stopMusic();
    } else if (screen !== 'playing') {
      audioEngine.startMusic('menu');
    }
  }, [screen]);

  const mutateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSaveData((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  const startLevel = useCallback(
    (worldId: WorldId, levelNumber: number, useSavedCheckpoint = false) => {
      audioEngine.playSfx('click');
      const cp =
        useSavedCheckpoint &&
        saveData.lastCheckpoint &&
        saveData.lastCheckpoint.worldId === worldId &&
        saveData.lastCheckpoint.levelNumber === levelNumber
          ? { x: saveData.lastCheckpoint.x, z: saveData.lastCheckpoint.z }
          : null;

      mutateSave((prev) => ({
        ...prev,
        hasStarted: true,
        lastWorld: worldId,
        lastLevel: levelNumber,
        lastCheckpoint: useSavedCheckpoint ? prev.lastCheckpoint : null,
      }));
      setActiveLevel({ worldId, levelNumber, checkpoint: cp });
      setScreen('playing');
    },
    [mutateSave, saveData.lastCheckpoint]
  );

  const handlePlay = () => {
    startLevel(saveData.lastWorld, saveData.lastLevel, false);
  };

  const handleContinue = () => {
    startLevel(saveData.lastWorld, saveData.lastLevel, true);
  };

  const handleUpdateCoins = useCallback(
    (delta: number) => {
      mutateSave((prev) => ({ ...prev, coins: Math.max(0, prev.coins + delta) }));
    },
    [mutateSave]
  );

  const handleSaveCheckpoint = useCallback(
    (worldId: WorldId, levelNumber: number, x: number, z: number) => {
      mutateSave((prev) => ({
        ...prev,
        lastCheckpoint: { worldId, levelNumber, x, z },
      }));
    },
    [mutateSave]
  );

  const handleConsumeItem = useCallback(
    (type: 'heart' | 'speed_boost' | 'shield') => {
      mutateSave((prev) => ({
        ...prev,
        consumables: {
          ...prev.consumables,
          [type]: Math.max(0, prev.consumables[type] - 1),
        },
      }));
    },
    [mutateSave]
  );

  const handleLevelComplete = useCallback(
    (worldId: WorldId, levelNumber: number, stars: number) => {
      mutateSave((prev) => {
        const key = `${worldId}-${levelNumber}`;
        const prevStars = prev.completedLevels[key] || 0;
        const nextUnlockedLevels = { ...prev.unlockedLevels };
        let nextUnlockedWorld = prev.unlockedWorld;
        let nextLastWorld = worldId;
        let nextLastLevel = levelNumber;

        const worldMaxLevel = worldId === 1 || worldId === 2 ? 5 : 10;
        if (levelNumber < worldMaxLevel) {
          nextUnlockedLevels[worldId] = Math.max(
            nextUnlockedLevels[worldId] || 1,
            levelNumber + 1
          );
          nextLastLevel = levelNumber + 1;
        } else if (worldId < 5) {
          const nw = (worldId + 1) as WorldId;
          if (nw > nextUnlockedWorld) nextUnlockedWorld = nw;
          nextLastWorld = nw;
          nextLastLevel = 1;
        }

        return {
          ...prev,
          hasStarted: true,
          unlockedWorld: nextUnlockedWorld,
          unlockedLevels: nextUnlockedLevels,
          completedLevels: {
            ...prev.completedLevels,
            [key]: Math.max(prevStars, stars),
          },
          lastWorld: nextLastWorld,
          lastLevel: nextLastLevel,
          lastCheckpoint: null,
        };
      });
    },
    [mutateSave]
  );

  const handleSelectCharacter = (id: CharacterId) => {
    audioEngine.playSfx('click');
    setSaveData((prev) => equipCharacter(prev, id));
  };

  const handleBuyOrEquipCostume = (
    itemId: string,
    category: CostumeCategory,
    price: number
  ) => {
    audioEngine.playSfx('click');
    mutateSave((prev) => {
      const owned = prev.ownedCostumes.includes(itemId);
      if (!owned && prev.coins < price) return prev;
      const charId = prev.selectedCharacter;
      return {
        ...prev,
        coins: owned ? prev.coins : prev.coins - price,
        ownedCostumes: owned ? prev.ownedCostumes : [...prev.ownedCostumes, itemId],
        equippedCostumes: {
          ...prev.equippedCostumes,
          [charId]: {
            ...prev.equippedCostumes[charId],
            [category]: itemId,
          },
        },
      };
    });
  };

  const handleBuyOrEquipWeapon = (weaponId: WeaponId) => {
    audioEngine.playSfx('click');
    const w = WEAPONS[weaponId];
    mutateSave((prev) => {
      const owned = prev.ownedWeapons.includes(weaponId);
      if (!owned && prev.coins < w.price) return prev;
      return {
        ...prev,
        coins: owned ? prev.coins : prev.coins - w.price,
        ownedWeapons: owned ? prev.ownedWeapons : [...prev.ownedWeapons, weaponId],
        equippedWeapon: weaponId,
      };
    });
  };

  const handleBuyConsumable = (
    type: 'heart' | 'speed_boost' | 'shield',
    price: number
  ) => {
    audioEngine.playSfx('coin');
    mutateSave((prev) => {
      if (prev.coins < price) return prev;
      return {
        ...prev,
        coins: prev.coins - price,
        consumables: {
          ...prev.consumables,
          [type]: prev.consumables[type] + 1,
        },
      };
    });
  };

  const handleUpdateSettings = (patch: Partial<SaveData['settings']>) => {
    audioEngine.playSfx('click');
    setSaveData((prev) => updateSettings(prev, patch));
  };

  const handleNewGameConfirm = () => {
    audioEngine.playSfx('click');
    const fresh = resetSaveData(saveData.settings);
    setSaveData(fresh);
    setScreen('menu');
  };

  if (screen === 'playing') {
    return (
      <GameView
        key={`${activeLevel.worldId}-${activeLevel.levelNumber}`}
        saveData={saveData}
        worldId={activeLevel.worldId}
        levelNumber={activeLevel.levelNumber}
        resumeCheckpoint={activeLevel.checkpoint}
        onUpdateCoins={handleUpdateCoins}
        onSaveCheckpoint={handleSaveCheckpoint}
        onConsumeItem={handleConsumeItem}
        onLevelComplete={handleLevelComplete}
        onSelectLevel={(w, l) => startLevel(w, l, false)}
        onExitToMenu={() => setScreen('menu')}
        onOpenWorldMap={() => setScreen('world_map')}
      />
    );
  }

  if (screen === 'character') {
    return (
      <CharacterSelectScreen
        saveData={saveData}
        onSelect={handleSelectCharacter}
        onPlayNow={handlePlay}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'world_map') {
    return (
      <WorldMapScreen
        saveData={saveData}
        onStartLevel={(w, l) => startLevel(w, l, false)}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'shop') {
    return (
      <CostumeShopScreen
        saveData={saveData}
        onBuyOrEquip={handleBuyOrEquipCostume}
        onSelectChar={handleSelectCharacter}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'inventory') {
    return (
      <InventoryScreen
        saveData={saveData}
        onBuyOrEquipWeapon={handleBuyOrEquipWeapon}
        onBuyConsumable={handleBuyConsumable}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        saveData={saveData}
        onUpdateSettings={handleUpdateSettings}
        onNewGameConfirm={handleNewGameConfirm}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'exited') {
    return <ExitScreen onReturnMenu={() => setScreen('menu')} />;
  }

  return (
    <MainMenu
      saveData={saveData}
      onPlay={handlePlay}
      onContinue={handleContinue}
      onNavigate={(s) => {
        audioEngine.playSfx('click');
        setScreen(s);
      }}
    />
  );
}
