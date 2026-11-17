import React from 'react';
import {
  Backpack,
  Coins,
  LogOut,
  Map as MapIcon,
  Play,
  RotateCcw,
  Settings,
  Shirt,
  Smartphone,
  Users,
  WifiOff,
} from 'lucide-react';
import { CAMPAIGN_LEVEL_SPECS, CHARACTERS, getWorldById } from '../game/catalog';
import { SaveData, ScreenName } from '../game/types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidInstallModal } from './AndroidInstallModal';
import { CharacterPreview3D } from './CharacterPreview3D';

interface MainMenuProps {
  saveData: SaveData;
  onPlay: () => void;
  onContinue: () => void;
  onNavigate: (screen: ScreenName) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  saveData,
  onPlay,
  onContinue,
  onNavigate,
}) => {
  const [showInstallModal, setShowInstallModal] = React.useState(false);
  const { isStandalone, isOnline } = usePWAInstall();
  const activeChar = CHARACTERS[saveData.selectedCharacter];
  const lastWorld = getWorldById(saveData.lastWorld);
  const spec = CAMPAIGN_LEVEL_SPECS.find(
    (s) => s.worldId === saveData.lastWorld && s.levelNumber === saveData.lastLevel
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Subtle Key Art Atmospheric Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20">
        <img
          src="/assets/aistudio/file_000000005b688211a40bb376a8c2d17b_1c2646ea.png"
          alt="Nabil Kayana & Jihan Key Art"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-indigo-950/80" />
      </div>

      {/* Top Info Strip */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 font-display text-xl font-bold text-slate-950 shadow-md">
            NJ
          </div>
          <div>
            <div className="font-display text-base font-bold text-white sm:text-lg">
              Nabil Kayana &amp; Jihan
            </div>
            <div className="text-xs text-sky-200/80">
              Maze Adventure · Cute Horror &amp; 2D/3D Offline
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {!isOnline && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-950/70 px-3 py-1.5 text-xs font-semibold text-emerald-300 whitespace-nowrap">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mode Offline</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowInstallModal(true)}
            className="flex items-center gap-1.5 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-200 shadow-md transition-colors hover:bg-emerald-500/30 whitespace-nowrap sm:text-sm"
          >
            <Smartphone className="h-4 w-4 text-emerald-300" />
            <span>{isStandalone ? 'Export APK' : 'Download Android / APK'}</span>
          </button>
          <div className="hidden text-right text-xs text-slate-300 md:block">
            <div>Karakter Aktif</div>
            <div className="font-semibold text-white">{activeChar.name}</div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-amber-400/35 bg-slate-900/85 px-4 py-2 shadow-md">
            <Coins className="h-5 w-5 text-amber-400" />
            <span className="font-mono-num text-base font-bold text-amber-300">
              {saveData.coins}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Stage */}
      <div className="relative z-10 mx-auto my-auto grid w-full max-w-6xl grid-cols-1 items-center gap-6 py-4 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col items-center lg:col-span-6">
          <div className="relative h-64 w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-slate-900/65 shadow-2xl sm:h-80 lg:h-96">
            <CharacterPreview3D
              mode="duo"
              nabilCostume={saveData.equippedCostumes.nabil}
              jihanCostume={saveData.equippedCostumes.jihan}
              weaponId={saveData.equippedWeapon}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-around px-6 text-center">
              <div className="rounded-xl bg-slate-950/80 px-3 py-1 text-xs font-bold text-amber-200">
                Nabil Kayana
              </div>
              <div className="rounded-xl bg-slate-950/80 px-3 py-1 text-xs font-bold text-pink-300">
                Jihan
              </div>
            </div>
          </div>

          <h1 className="mt-4 text-center font-display text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
            Nabil Kayana &amp; Jihan: <span className="text-amber-300">Maze Adventure</span>
          </h1>
          <p className="mt-1.5 max-w-md text-center text-sm text-sky-100/85">
            Labirin rumit penuh kunci, ruang harta, monster Cute Horror, dan pertarungan Boss Forest King serta Lava Dragon!
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onPlay}
              className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-5 py-4 font-display text-xl font-bold text-slate-950 shadow-lg transition-transform hover:scale-[1.02] hover:bg-emerald-300 active:scale-[0.99] whitespace-nowrap"
            >
              <Play className="h-6 w-6 fill-current" />
              <span>1. PLAY</span>
            </button>

            <button
              type="button"
              onClick={onContinue}
              className="flex flex-col items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 font-display text-slate-950 shadow-lg transition-transform hover:scale-[1.02] hover:bg-amber-300 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 text-xl font-bold whitespace-nowrap">
                <RotateCcw className="h-5 w-5" />
                <span>2. CONTINUE</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-800">
                {saveData.hasStarted
                  ? spec
                    ? `Level ${spec.campaignLevel} · ${spec.title}`
                    : `W${saveData.lastWorld}-${saveData.lastLevel} · ${lastWorld.name}`
                  : 'Mulai Petualangan Baru'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onNavigate('character')}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/85 px-4 py-3.5 text-left font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Users className="h-5 w-5 shrink-0 text-sky-400" />
              <div>
                <div className="font-display text-base">3. SELECT CHARACTER</div>
                <div className="text-xs text-slate-400">{activeChar.name}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('world_map')}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/85 px-4 py-3.5 text-left font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <MapIcon className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <div className="font-display text-base">4. WORLD MAP</div>
                <div className="text-xs text-slate-400">10 Level Utama + Ekstra</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/85 px-4 py-3.5 text-left font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Shirt className="h-5 w-5 shrink-0 text-pink-400" />
              <div>
                <div className="font-display text-base">5. COSTUME SHOP</div>
                <div className="text-xs text-slate-400">Baju, Rok, Topi, Sayap</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/85 px-4 py-3.5 text-left font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Backpack className="h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <div className="font-display text-base">6. INVENTORY</div>
                <div className="text-xs text-slate-400">Senjata &amp; Power-Up</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/85 px-4 py-3.5 text-left font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Settings className="h-5 w-5 shrink-0 text-violet-400" />
              <div>
                <div className="font-display text-base">7. SETTINGS</div>
                <div className="text-xs text-slate-400">Grafis, Audio, New Game &amp; Godot</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('exited')}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/85 px-4 py-3.5 text-left font-semibold text-white transition-colors hover:bg-rose-950/60"
            >
              <LogOut className="h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <div className="font-display text-base">8. EXIT</div>
                <div className="text-xs text-slate-400">Simpan &amp; Keluar</div>
              </div>
            </button>
          </div>
        </div>
      </div>
      <AndroidInstallModal
        open={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
};
