import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Coins,
  Eye,
  Flag,
  Heart,
  Home,
  KeyRound,
  Layers,
  Map as MapIcon,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { audioEngine } from '../game/audio';
import { WEAPONS, getWorldById } from '../game/catalog';
import { applyPowerUpEffect, createLevelSimulation, stepLevelSimulation } from '../game/engine';
import { render2DScene } from '../game/renderer2d';
import { MazeRenderer3D } from '../game/renderer3d';
import {
  GraphicsMode,
  InputState,
  LevelSimulation,
  SaveData,
  WorldId,
} from '../game/types';
import { TouchControls } from './TouchControls';

interface GameViewProps {
  saveData: SaveData;
  worldId: WorldId;
  levelNumber: number;
  resumeCheckpoint?: { x: number; z: number } | null;
  onUpdateCoins: (delta: number) => void;
  onSaveCheckpoint: (worldId: WorldId, levelNumber: number, x: number, z: number) => void;
  onConsumeItem: (type: 'heart' | 'speed_boost' | 'shield') => void;
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
  onLevelComplete,
  onSelectLevel,
  onExitToMenu,
  onOpenWorldMap,
}) => {
  const [mode, setMode] = useState<GraphicsMode>(saveData.settings.defaultMode);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [hud, setHud] = useState({
    hp: 100,
    maxHp: 100,
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
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const totalCoinsRef = useRef(saveData.coins);
  totalCoinsRef.current = saveData.coins;

  const initSimulation = useCallback(
    (cp: { x: number; z: number } | null) => {
      const sim = createLevelSimulation(worldId, levelNumber, saveData.selectedCharacter, cp);
      simRef.current = sim;
      setStatus('playing');
      setPaused(false);
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

  useEffect(() => {
    if (mode !== '3d' || !mount3dRef.current || !simRef.current) {
      if (renderer3dRef.current) {
        renderer3dRef.current.dispose();
        renderer3dRef.current = null;
      }
      return;
    }

    const costume = saveData.equippedCostumes[saveData.selectedCharacter];
    const r3d = new MazeRenderer3D(
      mount3dRef.current,
      simRef.current,
      saveData.selectedCharacter,
      costume,
      saveData.equippedWeapon,
      saveData.settings.quality
    );
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
  }, [
    mode,
    worldId,
    levelNumber,
    saveData.selectedCharacter,
    saveData.equippedCostumes,
    saveData.equippedWeapon,
    saveData.settings.quality,
  ]);

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
      if (k === 'v') {
        setMode((m) => (m === '3d' ? '2d' : '3d'));
        audioEngine.playSfx('click');
      }
      if (k === 'escape' || k === 'p') {
        setPaused((p) => !p);
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
  }, []);

  useEffect(() => {
    let rafId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let hudAccumulator = 0;

    const callbacks = {
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

    const stepFrame = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const sim = simRef.current;
      if (sim && !pausedRef.current && !sim.levelCompleted && !sim.gameOver) {
        const keys = keysRef.current;
        let kx = 0;
        let kz = 0;
        if (keys.has('a') || keys.has('arrowleft')) kx -= 1;
        if (keys.has('d') || keys.has('arrowright')) kx += 1;
        if (keys.has('w') || keys.has('arrowup')) kz -= 1;
        if (keys.has('s') || keys.has('arrowdown')) kz += 1;

        const input: InputState = {
          moveX: Math.abs(touchMoveRef.current.x) > 0.05 ? touchMoveRef.current.x : kx,
          moveZ: Math.abs(touchMoveRef.current.z) > 0.05 ? touchMoveRef.current.z : kz,
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
          saveData.selectedCharacter,
          saveData.equippedWeapon,
          callbacks
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
              saveData.selectedCharacter,
              saveData.equippedCostumes[saveData.selectedCharacter],
              saveData.equippedWeapon
            );
          }
        }

        hudAccumulator += dt;
        if (hudAccumulator >= 0.1) {
          hudAccumulator = 0;
          const boss = sim.monsters.find((m) => m.isBoss && m.alive);
          setHud({
            hp: Math.ceil(sim.player.hp),
            maxHp: sim.player.maxHp,
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
  }, [
    worldId,
    levelNumber,
    saveData.selectedCharacter,
    saveData.equippedCostumes,
    saveData.equippedWeapon,
    onUpdateCoins,
    onSaveCheckpoint,
    onLevelComplete,
  ]);

  const world = getWorldById(worldId);
  const weapon = WEAPONS[saveData.equippedWeapon];

  const handleUseQuickConsumable = (type: 'heart' | 'speed_boost' | 'shield') => {
    if (!simRef.current || saveData.consumables[type] <= 0) return;
    onConsumeItem(type);
    applyPowerUpEffect(
      simRef.current,
      type,
      simRef.current.player.x,
      simRef.current.player.z,
      {
        onCoinsCollected: onUpdateCoins,
        onCheckpointReached: () => {},
        onLevelWin: () => {},
        onGameOver: () => {},
      }
    );
  };

  const handleRestartFromCheckpoint = () => {
    const sim = simRef.current;
    if (sim && sim.player.checkpointReached) {
      initSimulation({ x: sim.player.checkpointX, z: sim.player.checkpointZ });
    } else {
      initSimulation(null);
    }
    if (mode === '3d') {
      setMode('2d');
      setTimeout(() => setMode('3d'), 20);
    }
  };

  const hasNextInWorld =
    worldId === 1 ? levelNumber < 5 : worldId === 2 ? levelNumber < 5 : levelNumber < 10;

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 select-none">
      {mode === '2d' && (
        <div className="h-full w-full">
          <canvas ref={canvas2dRef} className="block h-full w-full" />
        </div>
      )}

      {mode === '3d' && <div ref={mount3dRef} className="h-full w-full" />}

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

            {hud.checkpoint && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <Flag className="h-3 w-3" /> CP
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
            <span className="text-slate-400">{weapon.name}</span>
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

        <div className="pointer-events-auto flex items-center gap-2">
          {saveData.consumables.heart > 0 && (
            <button
              type="button"
              onClick={() => handleUseQuickConsumable('heart')}
              title="Gunakan Ramuan Hati"
              className="flex h-10 items-center gap-1 rounded-xl border border-rose-400/40 bg-slate-900/85 px-2.5 text-xs font-bold text-rose-300 hover:bg-slate-800"
            >
              <Heart className="h-4 w-4" /> {saveData.consumables.heart}
            </button>
          )}
          {saveData.consumables.shield > 0 && (
            <button
              type="button"
              onClick={() => handleUseQuickConsumable('shield')}
              title="Gunakan Perisai"
              className="hidden h-10 items-center gap-1 rounded-xl border border-sky-400/40 bg-slate-900/85 px-2.5 text-xs font-bold text-sky-300 hover:bg-slate-800 sm:flex"
            >
              <Shield className="h-4 w-4" /> {saveData.consumables.shield}
            </button>
          )}
          {saveData.consumables.speed_boost > 0 && (
            <button
              type="button"
              onClick={() => handleUseQuickConsumable('speed_boost')}
              title="Gunakan Speed Boost"
              className="hidden h-10 items-center gap-1 rounded-xl border border-cyan-400/40 bg-slate-900/85 px-2.5 text-xs font-bold text-cyan-300 hover:bg-slate-800 sm:flex"
            >
              <Zap className="h-4 w-4" /> {saveData.consumables.speed_boost}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === '3d' ? '2d' : '3d'));
              audioEngine.playSfx('click');
            }}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-amber-300/60 bg-amber-400 px-3.5 text-xs font-extrabold text-slate-950 shadow-md hover:bg-amber-300 whitespace-nowrap"
          >
            {mode === '3d' ? <Layers className="h-4 w-4" /> : <Box className="h-4 w-4" />}
            <span>Mode {mode === '3d' ? '2D' : '3D'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPaused((p) => !p);
              audioEngine.playSfx('click');
            }}
            aria-label="Pause"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-slate-900/85 text-white shadow-md hover:bg-slate-800"
          >
            <Pause className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-3 left-1/2 z-10 hidden -translate-x-1/2 rounded-xl bg-slate-900/75 px-3.5 py-1 text-[11px] text-slate-300 md:block">
        WASD/Panah: Gerak · Spasi: Lompat · J/Enter: Serang · E: Buka Pintu/Kotak · V: Mode 2D/3D · Esc: Pause
      </div>

      {status === 'playing' && !paused && (
        <TouchControls
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
        />
      )}

      {paused && status === 'playing' && (
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
              <button
                type="button"
                onClick={handleRestartFromCheckpoint}
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

      {status === 'lost' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-rose-400/40 bg-slate-900 p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-rose-400">Energi Habis!</h2>
            <p className="mt-1 text-sm text-slate-300">
              Jangan menyerah, Nabil &amp; Jihan siap mencoba lagi!
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleRestartFromCheckpoint}
                className="rounded-2xl bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400"
              >
                {hud.checkpoint ? 'Lanjut dari Checkpoint' : 'Coba Lagi'}
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
      )}
    </div>
  );
};
