import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Backpack,
  Box,
  Camera,
  Check,
  Coins,
  Eye,
  Flag,
  Flame,
  Heart,
  Home,
  KeyRound,
  Layers,
  Magnet,
  Map as MapIcon,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Snowflake,
  Sparkles,
  Swords,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { audioEngine } from '../game/audio';
import { COSTUMES, MAGIC_SPELLS, WEAPONS, getCostumeById, getWorldById } from '../game/catalog';
import {
  applyPowerUpEffect,
  castMagicSpell,
  createLevelSimulation,
  respawnPlayerAtCheckpoint,
  stepLevelSimulation,
} from '../game/engine';
import { render2DScene } from '../game/renderer2d';
import { MazeRenderer3D } from '../game/renderer3d';
import {
  CameraPOV,
  GraphicsMode,
  InputState,
  LevelSimulation,
  MagicSpellId,
  SaveData,
  WeaponId,
  WorldId,
} from '../game/types';
import { TouchControls } from './TouchControls';

type BagConsumableType = 'heart' | 'speed_boost' | 'shield' | 'magnet_coin' | 'jump_boost';

interface GameViewProps {
  saveData: SaveData;
  worldId: WorldId;
  levelNumber: number;
  resumeCheckpoint?: { x: number; z: number } | null;
  onUpdateCoins: (delta: number) => void;
  onSaveCheckpoint: (worldId: WorldId, levelNumber: number, x: number, z: number) => void;
  onConsumeItem: (type: BagConsumableType) => void;
  onEquipWeapon: (weaponId: WeaponId) => void;
  onEquipAccessory: (itemId: string) => void;
  onLevelComplete: (worldId: WorldId, levelNumber: number, stars: number) => void;
  onSelectLevel: (worldId: WorldId, levelNumber: number) => void;
  onExitToMenu: () => void;
  onOpenWorldMap: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  saveData,
  worldId,
  levelNumber,
  resumeCheckpoint,
  onUpdateCoins,
  onSaveCheckpoint,
  onConsumeItem,
  onEquipWeapon,
  onEquipAccessory,
  onLevelComplete,
  onSelectLevel,
  onExitToMenu,
  onOpenWorldMap,
}) => {
  const [mode, setMode] = useState<GraphicsMode>(saveData.settings.defaultMode);
  const [povMode, setPovMode] = useState<CameraPOV>('third_person');
  const [zoom2d, setZoom2d] = useState(1.0);
  const [paused, setPaused] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [hud, setHud] = useState({
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    regenActive: false,
    damageFlash: 0,
    koCount: 0,
    magicCooldowns: { fireball: 0, lightning: 0, ice: 0 } as Record<MagicSpellId, number>,
    keysHeld: 0,
    coinsRun: 0,
    totalCoins: saveData.coins,
    checkpoint: Boolean(resumeCheckpoint),
    banner: '' as string | null,
    bossName: '' as string | null,
    bossHp: 0,
    bossMaxHp: 0,
    bossPhase: 1 as 1 | 2 | 3,
    exitUnlocked: false,
    speedTimer: 0,
    shieldTimer: 0,
    magnetTimer: 0,
    jumpTimer: 0,
    elapsed: 0,
    monstersDefeated: 0,
    levelTitle: '',
    campaignIdx: levelNumber,
    isBossStage: false,
  });

  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const mount3dRef = useRef<HTMLDivElement>(null);
  const renderer3dRef = useRef<MazeRenderer3D | null>(null);
  const simRef = useRef<LevelSimulation | null>(null);

  const keysRef = useRef<Set<string>>(new Set());
  const touchMoveRef = useRef({ x: 0, z: 0 });
  const pendingActionsRef = useRef({ jump: false, attack: false, interact: false });
  const pausedRef = useRef(paused || inventoryOpen);
  pausedRef.current = paused || inventoryOpen;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const zoom2dRef = useRef(zoom2d);
  zoom2dRef.current = zoom2d;

  const totalCoinsRef = useRef(saveData.coins);
  totalCoinsRef.current = saveData.coins;
  const saveDataRef = useRef(saveData);
  saveDataRef.current = saveData;

  // Camera pointer/pinch state for free 3D camera rotation & zoom
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistRef = useRef<number | null>(null);

  const simCallbacksRef = useRef({
    onCoinsCollected: (delta: number) => {
      onUpdateCoins(delta);
    },
    onCheckpointReached: (x: number, z: number) => {
      onSaveCheckpoint(worldId, levelNumber, x, z);
    },
    onLevelWin: (coinsEarned: number, _monstersDefeated: number, elapsed: number) => {
      const stars = elapsed < 60 ? 3 : elapsed < 110 ? 2 : 1;
      onLevelComplete(worldId, levelNumber, stars);
      setStatus('won');
      setHud((prev) => ({ ...prev, coinsRun: coinsEarned, elapsed }));
    },
    onGameOver: () => {
      setStatus('lost');
    },
  });
  simCallbacksRef.current = {
    onCoinsCollected: (delta: number) => {
      onUpdateCoins(delta);
    },
    onCheckpointReached: (x: number, z: number) => {
      onSaveCheckpoint(worldId, levelNumber, x, z);
    },
    onLevelWin: (coinsEarned: number, _monstersDefeated: number, elapsed: number) => {
      const stars = elapsed < 60 ? 3 : elapsed < 110 ? 2 : 1;
      onLevelComplete(worldId, levelNumber, stars);
      setStatus('won');
      setHud((prev) => ({ ...prev, coinsRun: coinsEarned, elapsed }));
    },
    onGameOver: () => {
      setStatus('lost');
    },
  };

  const initSimulation = useCallback(
    (cp: { x: number; z: number } | null) => {
      const sim = createLevelSimulation(worldId, levelNumber, saveData.selectedCharacter, cp);
      simRef.current = sim;
      setStatus('playing');
      setPaused(false);
      setInventoryOpen(false);
    },
    [worldId, levelNumber, saveData.selectedCharacter]
  );

  useEffect(() => {
    initSimulation(resumeCheckpoint || null);
    audioEngine.startMusic(`world_${worldId}`);
    return () => {
      audioEngine.stopMusic();
    };
  }, [worldId, levelNumber, resumeCheckpoint, initSimulation]);

  // Mount & dispose 3D renderer cleanly per mode / level / quality
  useEffect(() => {
    if (mode !== '3d' || !mount3dRef.current || !simRef.current) {
      if (renderer3dRef.current) {
        renderer3dRef.current.dispose();
        renderer3dRef.current = null;
      }
      return;
    }

    const sd = saveDataRef.current;
    const costume = sd.equippedCostumes[sd.selectedCharacter];
    const r3d = new MazeRenderer3D(
      mount3dRef.current,
      simRef.current,
      sd.selectedCharacter,
      costume,
      sd.equippedWeapon,
      sd.settings.quality
    );
    r3d.setPovMode(povMode);
    renderer3dRef.current = r3d;

    const handleResize = () => {
      if (mount3dRef.current && renderer3dRef.current) {
        renderer3dRef.current.resize(
          mount3dRef.current.clientWidth,
          mount3dRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      r3d.dispose();
      renderer3dRef.current = null;
    };
  }, [mode, worldId, levelNumber, saveData.settings.quality]);

  // Live rebuild 3D player mesh when changing weapon or Dragon Wing skin mid-battle
  useEffect(() => {
    if (renderer3dRef.current) {
      renderer3dRef.current.rebuildPlayerRig(
        saveData.selectedCharacter,
        saveData.equippedCostumes[saveData.selectedCharacter],
        saveData.equippedWeapon
      );
    }
  }, [saveData.selectedCharacter, saveData.equippedCostumes, saveData.equippedWeapon]);

  // Sync camera POV mode to 3D renderer
  useEffect(() => {
    if (renderer3dRef.current) {
      renderer3dRef.current.setPovMode(povMode);
    }
  }, [povMode]);

  const handleCastSpell = useCallback((spellId: MagicSpellId) => {
    if (!simRef.current || pausedRef.current) return;
    const sd = saveDataRef.current;
    castMagicSpell(
      simRef.current,
      spellId,
      sd.selectedCharacter,
      sd.equippedWeapon,
      simCallbacksRef.current
    );
  }, []);

  const handleUseConsumable = useCallback(
    (type: BagConsumableType) => {
      if (!simRef.current || saveDataRef.current.consumables[type] <= 0) return;
      onConsumeItem(type);
      applyPowerUpEffect(
        simRef.current,
        type,
        simRef.current.player.x,
        simRef.current.player.z,
        simCallbacksRef.current
      );
    },
    [onConsumeItem]
  );

  const cyclePovMode = useCallback(() => {
    audioEngine.playSfx('click');
    setPovMode((prev) =>
      prev === 'third_person' ? 'first_person' : prev === 'first_person' ? 'top_view' : 'third_person'
    );
  }, []);

  const handleZoom = useCallback((dir: 'in' | 'out') => {
    audioEngine.playSfx('click');
    if (modeRef.current === '3d' && renderer3dRef.current) {
      renderer3dRef.current.zoomCamera(dir === 'in' ? -1.1 : 1.1);
    } else {
      setZoom2d((z) => Math.max(0.65, Math.min(1.65, z + (dir === 'in' ? 0.15 : -0.15))));
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current.add(k);
      if (k === ' ' || k === 'spacebar') {
        e.preventDefault();
        pendingActionsRef.current.jump = true;
      }
      if (k === 'j' || k === 'enter' || k === 'f') {
        pendingActionsRef.current.attack = true;
      }
      if (k === 'e') {
        pendingActionsRef.current.interact = true;
      }
      if (k === '1' || k === 'q') {
        handleCastSpell('fireball');
      }
      if (k === '2' || k === 'r') {
        handleCastSpell('lightning');
      }
      if (k === '3' || k === 't') {
        handleCastSpell('ice');
      }
      if (k === '4') {
        handleUseConsumable('shield');
      }
      if (k === 'h') {
        handleUseConsumable('heart');
      }
      if (k === 'b' || k === 'i') {
        setInventoryOpen((o) => !o);
        audioEngine.playSfx('click');
      }
      if (k === 'c') {
        cyclePovMode();
      }
      if (k === '=' || k === '+') {
        handleZoom('in');
      }
      if (k === '-' || k === '_') {
        handleZoom('out');
      }
      if (k === 'v') {
        setMode((m) => (m === '3d' ? '2d' : '3d'));
        audioEngine.playSfx('click');
      }
      if (k === 'escape' || k === 'p') {
        if (inventoryOpen) {
          setInventoryOpen(false);
        } else {
          setPaused((p) => !p);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleCastSpell, handleUseConsumable, cyclePovMode, handleZoom, inventoryOpen]);

  useEffect(() => {
    let rafId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let hudAccumulator = 0;

    const stepFrame = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const sim = simRef.current;
      const sd = saveDataRef.current;
      const accItem = getCostumeById(sd.equippedCostumes[sd.selectedCharacter].aksesoris);

      if (sim && !pausedRef.current && !sim.levelCompleted && !sim.gameOver) {
        const keys = keysRef.current;
        let kx = 0;
        let kz = 0;
        if (keys.has('a') || keys.has('arrowleft')) kx -= 1;
        if (keys.has('d') || keys.has('arrowright')) kx += 1;
        if (keys.has('w') || keys.has('arrowup')) kz -= 1;
        if (keys.has('s') || keys.has('arrowdown')) kz += 1;

        let rawX = Math.abs(touchMoveRef.current.x) > 0.05 ? touchMoveRef.current.x : kx;
        let rawZ = Math.abs(touchMoveRef.current.z) > 0.05 ? touchMoveRef.current.z : kz;

        // Rotate movement vector by 3D camera yaw so "Forward" aligns with view direction!
        if (modeRef.current === '3d' && renderer3dRef.current && (rawX !== 0 || rawZ !== 0)) {
          const yaw = renderer3dRef.current.getCameraYaw();
          if (Math.abs(yaw) > 0.001) {
            const cos = Math.cos(yaw);
            const sin = Math.sin(yaw);
            const rx = rawX * cos + rawZ * sin;
            const rz = -rawX * sin + rawZ * cos;
            rawX = rx;
            rawZ = rz;
          }
        }

        const input: InputState = {
          moveX: rawX,
          moveZ: rawZ,
          jumpPressed: pendingActionsRef.current.jump,
          attackPressed: pendingActionsRef.current.attack,
          interactPressed: pendingActionsRef.current.interact,
        };
        pendingActionsRef.current.jump = false;
        pendingActionsRef.current.attack = false;
        pendingActionsRef.current.interact = false;

        stepLevelSimulation(
          sim,
          dt,
          input,
          sd.selectedCharacter,
          sd.equippedWeapon,
          simCallbacksRef.current,
          {
            hasDragonWings: accItem.style === 'wings',
            wingStyle: accItem.wingStyle,
          }
        );
      }

      if (sim) {
        if (modeRef.current === '3d' && renderer3dRef.current) {
          renderer3dRef.current.syncAndRender(sim, dt);
        } else if (modeRef.current === '2d' && canvas2dRef.current) {
          const c = canvas2dRef.current;
          const parent = c.parentElement;
          if (parent && (c.width !== parent.clientWidth || c.height !== parent.clientHeight)) {
            c.width = parent.clientWidth;
            c.height = parent.clientHeight;
          }
          const ctx = c.getContext('2d');
          if (ctx) {
            render2DScene(
              ctx,
              c.width,
              c.height,
              sim,
              sd.selectedCharacter,
              sd.equippedCostumes[sd.selectedCharacter],
              sd.equippedWeapon,
              zoom2dRef.current
            );
          }
        }

        hudAccumulator += dt;
        if (hudAccumulator >= 0.08) {
          hudAccumulator = 0;
          const boss = sim.monsters.find((m) => m.isBoss && m.alive);
          setHud({
            hp: Math.ceil(sim.player.hp),
            maxHp: sim.player.maxHp,
            mp: Math.floor(sim.player.mp),
            maxMp: sim.player.maxMp,
            regenActive:
              sim.player.hp > 0 &&
              sim.player.hp < sim.player.maxHp &&
              sim.player.timeSinceLastHit >= 4.5,
            damageFlash: sim.player.damageFlashTimer,
            koCount: sim.player.koCount,
            magicCooldowns: { ...sim.player.magicCooldowns },
            keysHeld: sim.player.keysHeld,
            coinsRun: sim.coinsEarnedThisRun,
            totalCoins: totalCoinsRef.current,
            checkpoint: sim.player.checkpointReached,
            banner: sim.bannerMessage,
            bossName: boss ? boss.name : null,
            bossHp: boss ? Math.ceil(boss.hp) : 0,
            bossMaxHp: boss ? boss.maxHp : 0,
            bossPhase: boss ? boss.phase : 1,
            exitUnlocked: sim.exitUnlocked,
            speedTimer: sim.player.speedBoostTimer,
            shieldTimer: sim.player.shieldTimer,
            magnetTimer: sim.player.magnetTimer,
            jumpTimer: sim.player.jumpBoostTimer,
            elapsed: sim.elapsedTime,
            monstersDefeated: sim.monstersDefeatedThisRun,
            levelTitle: sim.levelData.title,
            campaignIdx: sim.levelData.campaignIndex,
            isBossStage: sim.levelData.isBossLevel,
          });
        }
      }

      if (modeRef.current === '3d' && renderer3dRef.current?.isSoftwareGl) {
        const gl = renderer3dRef.current.renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (st === gl.UNSIGNALED) {
            rafId = window.setTimeout(poll, 6);
          } else {
            if (sync) gl.deleteSync(sync);
            rafId = window.setTimeout(stepFrame, 65);
          }
        };
        rafId = window.setTimeout(poll, 6);
      } else {
        rafId = requestAnimationFrame(stepFrame);
      }
    };

    stepFrame();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(rafId);
    };
  }, [worldId, levelNumber]);

  const world = getWorldById(worldId);
  const weapon = WEAPONS[saveData.equippedWeapon];
  const equippedAccessory = getCostumeById(
    saveData.equippedCostumes[saveData.selectedCharacter].aksesoris
  );

  const handleRespawnAtCheckpoint = () => {
    if (!simRef.current) return;
    respawnPlayerAtCheckpoint(simRef.current);
    setStatus('playing');
  };

  const handleFreshRestartLevel = () => {
    initSimulation(null);
    if (mode === '3d') {
      setMode('2d');
      setTimeout(() => setMode('3d'), 20);
    }
  };

  const povLabel =
    povMode === 'first_person' ? '1st POV' : povMode === 'top_view' ? 'Top View' : '3rd POV';

  const hasNextInWorld =
    worldId === 1 ? levelNumber < 5 : worldId === 2 ? levelNumber < 5 : levelNumber < 10;

  const bagItems: {
    id: BagConsumableType;
    name: string;
    effect: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'heart',
      name: 'Health Potion',
      effect: '+35 HP & +20 MP',
      icon: <Heart className="h-5 w-5 text-rose-400" />,
    },
    {
      id: 'shield',
      name: 'Perisai Energi',
      effect: 'Kebal serangan 9 detik',
      icon: <Shield className="h-5 w-5 text-sky-400" />,
    },
    {
      id: 'speed_boost',
      name: 'Speed Boost',
      effect: 'Lari cepat 8 detik',
      icon: <Zap className="h-5 w-5 text-cyan-400" />,
    },
    {
      id: 'magnet_coin',
      name: 'Magnet Koin',
      effect: 'Tarik koin otomatis 10 detik',
      icon: <Magnet className="h-5 w-5 text-pink-400" />,
    },
    {
      id: 'jump_boost',
      name: 'Super Jump',
      effect: 'Lompatan tinggi 10 detik',
      icon: <Sparkles className="h-5 w-5 text-emerald-400" />,
    },
  ];

  const ownedAccessories = COSTUMES.filter(
    (c) => c.category === 'aksesoris' && saveData.ownedCostumes.includes(c.id)
  );

  const bossRewardWing =
    worldId === 1 && levelNumber === 5
      ? getCostumeById('aks_sayap_naga_energi')
      : worldId === 2 && levelNumber === 5
      ? getCostumeById('aks_sayap_naga_api')
      : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 select-none">
      {mode === '2d' && (
        <div
          className="h-full w-full"
          onWheel={(e) => {
            handleZoom(e.deltaY < 0 ? 'in' : 'out');
          }}
        >
          <canvas ref={canvas2dRef} className="block h-full w-full" />
        </div>
      )}

      {/* 3D Viewport with Free Pointer Drag Rotation & Wheel/Pinch Zoom */}
      {mode === '3d' && (
        <div
          ref={mount3dRef}
          className="h-full w-full touch-none"
          onPointerDown={(e) => {
            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (activePointersRef.current.size === 2) {
              const pts = Array.from(activePointersRef.current.values());
              lastPinchDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            }
          }}
          onPointerMove={(e) => {
            const prev = activePointersRef.current.get(e.pointerId);
            if (!prev) return;
            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (activePointersRef.current.size === 1 && renderer3dRef.current) {
              renderer3dRef.current.rotateCamera(e.clientX - prev.x, e.clientY - prev.y);
            } else if (activePointersRef.current.size === 2 && renderer3dRef.current) {
              const pts = Array.from(activePointersRef.current.values());
              const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
              if (lastPinchDistRef.current !== null) {
                renderer3dRef.current.zoomCamera((lastPinchDistRef.current - d) * 0.03);
              }
              lastPinchDistRef.current = d;
            }
          }}
          onPointerUp={(e) => {
            activePointersRef.current.delete(e.pointerId);
            if (activePointersRef.current.size < 2) {
              lastPinchDistRef.current = null;
            }
          }}
          onPointerCancel={(e) => {
            activePointersRef.current.delete(e.pointerId);
            lastPinchDistRef.current = null;
          }}
          onWheel={(e) => {
            renderer3dRef.current?.zoomCamera(e.deltaY > 0 ? 0.7 : -0.7);
          }}
        />
      )}

      {/* Red Hit Vignette Overlay when taking damage */}
      {hud.damageFlash > 0 && (
        <div
          className="pointer-events-none fixed inset-0 z-10 border-8 border-rose-500/70 bg-rose-600/20 transition-opacity"
          style={{ opacity: Math.min(1, hud.damageFlash * 2.2) }}
        />
      )}

      {/* First Person Subtle Reticle */}
      {mode === '3d' && povMode === 'first_person' && status === 'playing' && !paused && !inventoryOpen && (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full border-2 border-amber-300/80 bg-white/30 shadow" />
        </div>
      )}

      {/* Top HUD */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3 sm:p-4">
        <div className="pointer-events-auto flex flex-col gap-1.5 rounded-2xl border border-white/15 bg-slate-900/85 px-3.5 py-2.5 shadow-lg">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-200">
            <span className="font-display text-sm text-amber-300">
              Lv.{hud.campaignIdx} · {hud.levelTitle || world.name}
            </span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono-num flex items-center gap-1 text-amber-400">
              <Coins className="h-3.5 w-3.5" /> {hud.totalCoins}
            </span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono-num flex items-center gap-1 text-yellow-300">
              <KeyRound className="h-3.5 w-3.5" /> {hud.keysHeld}
            </span>
          </div>

          {/* HP Bar + Regen Badge */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-rose-400" />
              <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-800 sm:w-36">
                <div
                  className="h-full bg-rose-500 transition-all duration-150"
                  style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
                />
              </div>
              <span className="font-mono-num text-xs font-bold text-white">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>

            {hud.regenActive && (
              <span className="text-[11px] font-bold text-emerald-400">+Regen</span>
            )}
            {hud.checkpoint && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <Flag className="h-3 w-3" /> CP
              </span>
            )}
          </div>

          {/* MP Bar */}
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-800 sm:w-36">
              <div
                className="h-full bg-sky-400 transition-all duration-150"
                style={{ width: `${Math.max(0, (hud.mp / hud.maxMp) * 100)}%` }}
              />
            </div>
            <span className="font-mono-num text-[11px] font-bold text-sky-300">
              MP {hud.mp}/{hud.maxMp}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
            <span className="text-slate-300">{weapon.name}</span>
            {equippedAccessory.style === 'wings' && (
              <span className="text-amber-300">· {equippedAccessory.name}</span>
            )}
            {hud.speedTimer > 0 && (
              <span className="font-mono-num font-bold text-cyan-300">
                Speed {hud.speedTimer.toFixed(0)}s
              </span>
            )}
            {hud.shieldTimer > 0 && (
              <span className="font-mono-num font-bold text-sky-300">
                Shield {hud.shieldTimer.toFixed(0)}s
              </span>
            )}
            {hud.magnetTimer > 0 && (
              <span className="font-mono-num font-bold text-pink-300">
                Magnet {hud.magnetTimer.toFixed(0)}s
              </span>
            )}
            {hud.jumpTimer > 0 && (
              <span className="font-mono-num font-bold text-emerald-300">
                Jump {hud.jumpTimer.toFixed(0)}s
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          {hud.bossName && (
            <div className="rounded-xl border border-amber-400/50 bg-slate-900/90 px-4 py-2 text-center shadow-lg">
              <div className="font-display text-xs font-bold text-amber-300 sm:text-sm">
                BOSS: {hud.bossName} · Fase {hud.bossPhase}/3
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-3 w-48 overflow-hidden rounded-full bg-slate-800 sm:w-64">
                  <div
                    className="h-full bg-amber-400 transition-all duration-150"
                    style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` }}
                  />
                </div>
                <span className="font-mono-num text-xs font-bold text-amber-200">
                  {hud.bossHp}/{hud.bossMaxHp}
                </span>
              </div>
            </div>
          )}

          {hud.banner && (
            <div className="rounded-xl border border-white/20 bg-slate-900/90 px-4 py-1.5 text-center font-display text-sm font-bold text-amber-300 shadow-lg">
              {hud.banner}
            </div>
          )}
        </div>

        {/* Right Top Action Bar: Potion, Shield, Bag, POV, Zoom, 2D/3D, Pause */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {saveData.consumables.heart > 0 && (
            <button
              type="button"
              onClick={() => handleUseConsumable('heart')}
              title="Gunakan Health Potion (H)"
              className="flex h-10 items-center gap-1 rounded-xl border border-rose-400/40 bg-slate-900/85 px-2.5 text-xs font-bold text-rose-300 hover:bg-slate-800 whitespace-nowrap"
            >
              <Heart className="h-4 w-4" /> {saveData.consumables.heart}
            </button>
          )}
          {saveData.consumables.shield > 0 && (
            <button
              type="button"
              onClick={() => handleUseConsumable('shield')}
              title="Aktifkan Shield (4)"
              className="flex h-10 items-center gap-1 rounded-xl border border-sky-400/40 bg-slate-900/85 px-2.5 text-xs font-bold text-sky-300 hover:bg-slate-800 whitespace-nowrap"
            >
              <Shield className="h-4 w-4" /> {saveData.consumables.shield}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setInventoryOpen(true);
              audioEngine.playSfx('click');
            }}
            title="Buka Tas Inventory (I)"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-950/90 px-3 text-xs font-bold text-emerald-300 shadow-md hover:bg-emerald-900 whitespace-nowrap"
          >
            <Backpack className="h-4 w-4" />
            <span>Tas</span>
          </button>

          {mode === '3d' && (
            <button
              type="button"
              onClick={cyclePovMode}
              title="Ganti Kamera POV (C)"
              className="flex h-10 items-center gap-1 rounded-xl border border-indigo-300/40 bg-slate-900/85 px-2.5 text-xs font-bold text-indigo-200 hover:bg-slate-800 whitespace-nowrap"
            >
              <Camera className="h-4 w-4" />
              <span>{povLabel}</span>
            </button>
          )}

          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => handleZoom('in')}
              title="Zoom In (+)"
              aria-label="Zoom In"
              className="flex h-10 w-9 items-center justify-center rounded-xl border border-white/20 bg-slate-900/85 text-white hover:bg-slate-800"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom('out')}
              title="Zoom Out (-)"
              aria-label="Zoom Out"
              className="flex h-10 w-9 items-center justify-center rounded-xl border border-white/20 bg-slate-900/85 text-white hover:bg-slate-800"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === '3d' ? '2d' : '3d'));
              audioEngine.playSfx('click');
            }}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-amber-300/60 bg-amber-400 px-3 text-xs font-extrabold text-slate-950 shadow-md hover:bg-amber-300 whitespace-nowrap"
          >
            {mode === '3d' ? <Layers className="h-4 w-4" /> : <Box className="h-4 w-4" />}
            <span>{mode === '3d' ? 'Mode 2D' : 'Mode 3D'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPaused((p) => !p);
              audioEngine.playSfx('click');
            }}
            aria-label="Pause"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-slate-900/85 text-white shadow-md hover:bg-slate-800"
          >
            <Pause className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Desktop Keyboard Hints */}
      <div className="pointer-events-none fixed bottom-3 left-1/2 z-10 hidden -translate-x-1/2 rounded-xl bg-slate-900/80 px-3.5 py-1 text-[11px] text-slate-300 md:block whitespace-nowrap">
        WASD: Gerak · Spasi: Lompat · J: Serang · 1/2/3: Api/Petir/Es · 4: Shield · H: Potion · I: Tas · C: POV · Drag Layar: Kamera · V: 2D/3D
      </div>

      {status === 'playing' && !paused && !inventoryOpen && (
        <TouchControls
          mp={hud.mp}
          cooldowns={hud.magicCooldowns}
          onMove={(x, z) => {
            touchMoveRef.current = { x, z };
          }}
          onJump={() => {
            pendingActionsRef.current.jump = true;
          }}
          onAttack={() => {
            pendingActionsRef.current.attack = true;
          }}
          onInteract={() => {
            pendingActionsRef.current.interact = true;
          }}
          onCastSpell={handleCastSpell}
        />
      )}

      {/* In-Combat Inventory Bag Modal */}
      {inventoryOpen && status === 'playing' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-emerald-400/35 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Backpack className="h-5 w-5 text-emerald-400" />
                <h2 className="font-display text-lg font-bold text-white">
                  Tas Inventory &amp; Perlengkapan
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInventoryOpen(false)}
                aria-label="Tutup Tas"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {/* Consumables */}
              <section>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Item Pertarungan (Klik untuk Pakai)
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {bagItems.map((item) => {
                    const qty = saveData.consumables[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => {
                          handleUseConsumable(item.id);
                          setInventoryOpen(false);
                        }}
                        className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-colors ${
                          qty > 0
                            ? 'border-white/15 bg-slate-800/80 hover:border-emerald-400/50 hover:bg-slate-800'
                            : 'cursor-not-allowed border-white/5 bg-slate-900/50 opacity-45'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <div>
                            <div className="text-sm font-bold text-white">{item.name}</div>
                            <div className="text-[11px] text-slate-400">{item.effect}</div>
                          </div>
                        </div>
                        <span className="font-mono-num rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-bold text-amber-300">
                          x{qty}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Magic Spells */}
              <section>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sihir Tersedia (Gunakan MP)
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {(['fireball', 'lightning', 'ice'] as MagicSpellId[]).map((sId) => {
                    const sp = MAGIC_SPELLS[sId];
                    const canCast = hud.mp >= sp.mpCost && hud.magicCooldowns[sId] <= 0;
                    return (
                      <button
                        key={sId}
                        type="button"
                        disabled={!canCast}
                        onClick={() => {
                          setInventoryOpen(false);
                          setTimeout(() => handleCastSpell(sId), 20);
                        }}
                        className={`rounded-2xl border p-3 text-left ${
                          canCast
                            ? 'border-white/20 bg-slate-800/80 hover:bg-slate-800'
                            : 'cursor-not-allowed border-white/10 bg-slate-900/50 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                            {sId === 'fireball' ? (
                              <Flame className="h-4 w-4 text-orange-400" />
                            ) : sId === 'lightning' ? (
                              <Zap className="h-4 w-4 text-sky-400" />
                            ) : (
                              <Snowflake className="h-4 w-4 text-cyan-300" />
                            )}
                            {sp.name}
                          </span>
                          <span className="font-mono-num text-[11px] font-bold text-sky-300">
                            {sp.mpCost} MP
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{sp.description}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Swap Weapons */}
              <section>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ganti Senjata
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {saveData.ownedWeapons.map((wId) => {
                    const w = WEAPONS[wId];
                    const active = saveData.equippedWeapon === wId;
                    return (
                      <button
                        key={wId}
                        type="button"
                        onClick={() => {
                          audioEngine.playSfx('click');
                          onEquipWeapon(wId);
                        }}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-bold ${
                          active
                            ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                            : 'border-white/15 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Swords className="h-3.5 w-3.5" /> {w.name}
                        </span>
                        {active && <Check className="h-4 w-4 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Swap Sayap / Aksesori */}
              <section>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ganti Sayap Naga &amp; Aksesori
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {ownedAccessories.map((acc) => {
                    const active =
                      saveData.equippedCostumes[saveData.selectedCharacter].aksesoris === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          audioEngine.playSfx('click');
                          onEquipAccessory(acc.id);
                        }}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-bold ${
                          active
                            ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200'
                            : 'border-white/15 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{acc.name}</span>
                        {active && <Check className="h-4 w-4 shrink-0 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {paused && !inventoryOpen && status === 'playing' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-slate-900 p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-white">Permainan Dijeda</h2>
            <p className="mt-1 text-sm text-slate-400">
              Level {hud.campaignIdx} · {hud.levelTitle || world.name}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400"
              >
                <Play className="h-5 w-5" /> Lanjutkan
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === '3d' ? '2d' : '3d'));
                  setPaused(false);
                }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3 font-bold text-slate-950 hover:bg-amber-300"
              >
                <Eye className="h-5 w-5" /> Ganti ke Mode {mode === '3d' ? '2D' : '3D'}
              </button>
              {mode === '3d' && (
                <button
                  type="button"
                  onClick={() => {
                    renderer3dRef.current?.resetCameraOrientation();
                    setPovMode('third_person');
                    setPaused(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 font-semibold text-white hover:bg-slate-700"
                >
                  <Camera className="h-5 w-5" /> Reset Kamera 3D
                </button>
              )}
              <button
                type="button"
                onClick={handleFreshRestartLevel}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 font-semibold text-white hover:bg-slate-700"
              >
                <RotateCcw className="h-5 w-5" /> Ulangi Level
              </button>
              <button
                type="button"
                onClick={onOpenWorldMap}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 font-semibold text-white hover:bg-slate-700"
              >
                <MapIcon className="h-5 w-5" /> Peta Dunia
              </button>
              <button
                type="button"
                onClick={onExitToMenu}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-transparent py-3 font-semibold text-slate-300 hover:bg-slate-800"
              >
                <Home className="h-5 w-5" /> Menu Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'won' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-amber-400/40 bg-slate-900 p-6 text-center shadow-2xl">
            <Sparkles className="mx-auto h-12 w-12 text-amber-400" />
            <h2 className="mt-2 font-display text-3xl font-bold text-amber-300">
              {hud.isBossStage ? 'Boss Dikalahkan!' : 'Level Selesai!'}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Level {hud.campaignIdx} — {hud.levelTitle}
            </p>

            {bossRewardWing && (
              <div className="mt-4 rounded-2xl border border-cyan-400/40 bg-cyan-950/60 p-3 text-center">
                <div className="text-xs font-bold text-cyan-300">HADIAH BOSS TERBUKA!</div>
                <div className="font-display text-base font-bold text-white">
                  Kostum {bossRewardWing.name}
                </div>
                <div className="text-[11px] text-cyan-200/80">{bossRewardWing.description}</div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-800/80 p-3 text-center">
              <div>
                <div className="text-xs text-slate-400">Koin</div>
                <div className="font-mono-num text-lg font-bold text-amber-400">+{hud.coinsRun}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Monster</div>
                <div className="font-mono-num text-lg font-bold text-emerald-400">
                  {hud.monstersDefeated}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Waktu</div>
                <div className="font-mono-num text-lg font-bold text-sky-400">
                  {hud.elapsed.toFixed(1)}s
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {hasNextInWorld ? (
                <button
                  type="button"
                  onClick={() => onSelectLevel(worldId, levelNumber + 1)}
                  className="rounded-2xl bg-emerald-500 py-3.5 font-display text-lg font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Lanjut ke Level {hud.campaignIdx + 1}
                </button>
              ) : worldId < 5 ? (
                <button
                  type="button"
                  onClick={() => onSelectLevel((worldId + 1) as WorldId, 1)}
                  className="rounded-2xl bg-amber-400 py-3.5 font-display text-lg font-bold text-slate-950 hover:bg-amber-300"
                >
                  Lanjut ke World {worldId + 1}!
                </button>
              ) : (
                <div className="rounded-2xl bg-amber-400/20 p-3 text-sm font-semibold text-amber-300">
                  Selamat! Seluruh Dunia &amp; Boss telah ditaklukkan!
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => initSimulation(null)}
                  className="rounded-2xl bg-slate-800 py-3 font-semibold text-white hover:bg-slate-700"
                >
                  Main Ulang
                </button>
                <button
                  type="button"
                  onClick={onExitToMenu}
                  className="rounded-2xl bg-slate-800 py-3 font-semibold text-white hover:bg-slate-700"
                >
                  Menu Utama
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Knock-Out & Respawn at Checkpoint Modal */}
      {status === 'lost' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-rose-400/40 bg-slate-900 p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-rose-400">Knock Out!</h2>
            <p className="mt-1 text-sm text-slate-300">
              Energi habis (KO ke-{hud.koCount}). Bangkit kembali di Checkpoint dengan progres pintu &amp; kunci tetap aman!
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleRespawnAtCheckpoint}
                className="rounded-2xl bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400"
              >
                {hud.checkpoint ? 'Respawn di Checkpoint' : 'Bangkit Kembali'}
              </button>
              <button
                type="button"
                onClick={handleFreshRestartLevel}
                className="rounded-2xl bg-slate-800 py-3 font-semibold text-white hover:bg-slate-700"
              >
                Ulangi Level Baru
              </button>
              <button
                type="button"
                onClick={onExitToMenu}
                className="rounded-2xl border border-white/15 bg-transparent py-3 font-semibold text-slate-300 hover:bg-slate-800"
              >
                Menu Utama
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
