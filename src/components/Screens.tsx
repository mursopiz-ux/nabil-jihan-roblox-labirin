import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Code2,
  Coins,
  Download,
  Heart,
  Image as ImageIcon,
  Lock,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Swords,
  Trash2,
  Unlock,
  Volume2,
  Zap,
} from 'lucide-react';
import {
  CAMPAIGN_LEVEL_SPECS,
  CHARACTERS,
  COSTUMES,
  COSTUME_CATEGORIES,
  WEAPONS,
  WORLDS,
} from '../game/catalog';
import { GODOT_DOCS_SECTIONS, downloadGodotProjectZip } from '../game/godotProjectExporter';
import { isLevelUnlocked, isWorldUnlocked } from '../game/storage';
import {
  CharacterId,
  CostumeCategory,
  GraphicsMode,
  GraphicsQuality,
  SaveData,
  WeaponId,
  WorldId,
} from '../game/types';
import { AndroidInstallModal } from './AndroidInstallModal';
import { CharacterPreview3D } from './CharacterPreview3D';

function ScreenShell({
  title,
  coins,
  onBack,
  children,
}: {
  title: string;
  coins: number;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-950/60 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <h1 className="font-display text-lg font-bold text-white truncate sm:text-2xl">{title}</h1>
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/35 bg-slate-900 px-3 py-1.5">
          <Coins className="h-4 w-4 text-amber-400" />
          <span className="font-mono-num text-sm font-bold text-amber-300">{coins}</span>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}

export const CharacterSelectScreen: React.FC<{
  saveData: SaveData;
  onSelect: (id: CharacterId) => void;
  onPlayNow: () => void;
  onBack: () => void;
}> = ({ saveData, onSelect, onPlayNow, onBack }) => {
  const [showSheet, setShowSheet] = useState(false);
  const active = CHARACTERS[saveData.selectedCharacter];

  return (
    <ScreenShell title="Pilih Karakter" coins={saveData.coins} onBack={onBack}>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-5">
          <div className="h-72 overflow-hidden rounded-3xl border border-white/15 bg-slate-900/60 lg:h-96">
            <CharacterPreview3D
              mode="single"
              characterId={saveData.selectedCharacter}
              nabilCostume={saveData.equippedCostumes.nabil}
              jihanCostume={saveData.equippedCostumes.jihan}
              weaponId={saveData.equippedWeapon}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowSheet((s) => !s)}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900 py-2.5 text-xs font-semibold text-sky-300 hover:bg-slate-800"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{showSheet ? 'Tutup Master Character Sheet' : 'Lihat Master Character Sheet'}</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(['nabil', 'jihan'] as CharacterId[]).map((id) => {
              const c = CHARACTERS[id];
              const selected = saveData.selectedCharacter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-amber-400 bg-amber-400/15 shadow-lg'
                      : 'border-white/15 bg-slate-900/70 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-bold text-white">{c.name}</span>
                    {selected && <Check className="h-5 w-5 text-amber-400" />}
                  </div>
                  <p className="mt-1 text-xs text-slate-300">{c.tagline}</p>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/15 bg-slate-900/75 p-5">
            <h3 className="font-display text-lg font-bold text-amber-300">
              Statistik Seimbang — {active.name}
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-800/80 p-3">
                <div className="text-xs text-slate-400">HP Maksimal</div>
                <div className="font-mono-num text-xl font-bold text-rose-400">
                  {active.stats.maxHp}
                </div>
              </div>
              <div className="rounded-xl bg-slate-800/80 p-3">
                <div className="text-xs text-slate-400">Kecepatan</div>
                <div className="font-mono-num text-xl font-bold text-cyan-400">
                  {active.stats.speed}
                </div>
              </div>
              <div className="rounded-xl bg-slate-800/80 p-3">
                <div className="text-xs text-slate-400">Lompatan</div>
                <div className="font-mono-num text-xl font-bold text-emerald-400">
                  {active.stats.jumpForce}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onPlayNow}
              className="mt-5 w-full rounded-2xl bg-emerald-400 py-3.5 font-display text-lg font-bold text-slate-950 hover:bg-emerald-300"
            >
              Mainkan dengan {active.name}
            </button>
          </div>

          {showSheet && (
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950 p-2">
              <img
                src="/assets/aistudio/file_00000000c4ac8207a0e856f8bbea9835_08cc5abc.png"
                alt="Master Character Sheet Nabil Kayana & Jihan"
                referrerPolicy="no-referrer"
                className="w-full rounded-xl object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </ScreenShell>
  );
};

export const WorldMapScreen: React.FC<{
  saveData: SaveData;
  onStartLevel: (worldId: WorldId, levelNumber: number) => void;
  onBack: () => void;
}> = ({ saveData, onStartLevel, onBack }) => {
  const [tab, setTab] = useState<'campaign' | 'bonus'>('campaign');
  const [bonusWorld, setBonusWorld] = useState<WorldId>(3);
  const world = WORLDS.find((w) => w.id === bonusWorld) || WORLDS[2];

  return (
    <ScreenShell title="Peta Dunia & Petualangan" coins={saveData.coins} onBack={onBack}>
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('campaign')}
            className={`rounded-xl px-4 py-2.5 font-display text-sm font-bold ${
              tab === 'campaign'
                ? 'bg-amber-400 text-slate-950'
                : 'border border-white/15 bg-slate-900 text-slate-300'
            }`}
          >
            Petualangan Utama (Level 1–10)
          </button>
          <button
            type="button"
            onClick={() => setTab('bonus')}
            className={`rounded-xl px-4 py-2.5 font-display text-sm font-bold ${
              tab === 'bonus'
                ? 'bg-sky-400 text-slate-950'
                : 'border border-white/15 bg-slate-900 text-slate-300'
            }`}
          >
            Dunia Ekstra (World 3–5)
          </button>
        </div>

        {tab === 'campaign' ? (
          <div className="flex flex-col gap-5">
            {/* Level 1-5 Forest + Forest King Boss */}
            <div className="rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-900/90 via-green-900/80 to-slate-950 p-5 shadow-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    Bagian 1: Hutan Labirin &amp; Forest King (Level 1–5)
                  </h2>
                  <p className="text-xs text-emerald-200/80">
                    Kunci pintu, ruang harta rahasia, Shadow Slime, Bone Knight, &amp; Boss Forest King
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                {CAMPAIGN_LEVEL_SPECS.slice(0, 5).map((spec) => {
                  const unlocked = isLevelUnlocked(saveData, spec.worldId, spec.levelNumber);
                  const stars = saveData.completedLevels[`${spec.worldId}-${spec.levelNumber}`] || 0;
                  const isBoss = spec.campaignLevel === 5;
                  return (
                    <button
                      key={spec.campaignLevel}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onStartLevel(spec.worldId, spec.levelNumber)}
                      className={`flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left transition-transform ${
                        unlocked
                          ? isBoss
                            ? 'border-amber-300 bg-amber-500/25 text-white hover:scale-[1.03]'
                            : 'border-white/25 bg-slate-950/65 text-white hover:scale-[1.03]'
                          : 'cursor-not-allowed border-white/10 bg-slate-950/40 text-slate-500'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between text-[11px] font-bold text-amber-300">
                        <span>{isBoss ? 'BOSS' : `LEVEL ${spec.campaignLevel}`}</span>
                        {!unlocked && <Lock className="h-3.5 w-3.5 text-slate-500" />}
                      </div>
                      <div className="mt-1 font-display text-sm font-bold">{spec.title}</div>
                      <div className="mt-0.5 text-[11px] text-slate-300/85">{spec.subtitle}</div>
                      <div className="mt-2 flex items-center gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level 6-10 Volcano + Lava Dragon Final Boss */}
            <div className="rounded-3xl border border-orange-400/25 bg-gradient-to-br from-orange-950/90 via-red-900/75 to-slate-950 p-5 shadow-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    Bagian 2: Gunung Api &amp; Lava Dragon (Level 6–10)
                  </h2>
                  <p className="text-xs text-orange-200/80">
                    Batu bergulir, jembatan lava, Phantom Ghost, Lava Golem Elite, &amp; Final Boss Lava Dragon
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                {CAMPAIGN_LEVEL_SPECS.slice(5, 10).map((spec) => {
                  const unlocked = isLevelUnlocked(saveData, spec.worldId, spec.levelNumber);
                  const stars = saveData.completedLevels[`${spec.worldId}-${spec.levelNumber}`] || 0;
                  const isBoss = spec.campaignLevel === 10;
                  return (
                    <button
                      key={spec.campaignLevel}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onStartLevel(spec.worldId, spec.levelNumber)}
                      className={`flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left transition-transform ${
                        unlocked
                          ? isBoss
                            ? 'border-amber-300 bg-rose-500/30 text-white hover:scale-[1.03]'
                            : 'border-white/25 bg-slate-950/65 text-white hover:scale-[1.03]'
                          : 'cursor-not-allowed border-white/10 bg-slate-950/40 text-slate-500'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between text-[11px] font-bold text-amber-300">
                        <span>{isBoss ? 'FINAL BOSS' : `LEVEL ${spec.campaignLevel}`}</span>
                        {!unlocked && <Lock className="h-3.5 w-3.5 text-slate-500" />}
                      </div>
                      <div className="mt-1 font-display text-sm font-bold">{spec.title}</div>
                      <div className="mt-0.5 text-[11px] text-slate-300/85">{spec.subtitle}</div>
                      <div className="mt-2 flex items-center gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              {WORLDS.slice(2).map((w) => {
                const unlocked = isWorldUnlocked(saveData, w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setBonusWorld(w.id)}
                    className={`rounded-2xl border p-3 text-left ${
                      bonusWorld === w.id
                        ? 'border-amber-400 bg-slate-800'
                        : 'border-white/15 bg-slate-900/75'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>WORLD {w.id}</span>
                      {unlocked ? (
                        <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </div>
                    <div className="mt-1 font-display text-sm font-bold text-white">{w.name}</div>
                  </button>
                );
              })}
            </div>

            <div className={`rounded-3xl border border-white/15 bg-gradient-to-br ${world.bgGradient} p-5`}>
              <h2 className="font-display text-xl font-bold text-white">
                World {world.id}: {world.name}
              </h2>
              <p className="text-xs text-white/80">
                {world.subtitle} · Boss: {world.bossName}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {Array.from({ length: 10 }, (_, idx) => idx + 1).map((lvl) => {
                  const unlocked = isLevelUnlocked(saveData, world.id, lvl);
                  const stars = saveData.completedLevels[`${world.id}-${lvl}`] || 0;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onStartLevel(world.id, lvl)}
                      className={`flex flex-col items-center rounded-2xl border p-3 ${
                        unlocked
                          ? 'border-white/25 bg-slate-950/65 text-white hover:scale-[1.03]'
                          : 'cursor-not-allowed border-white/10 bg-slate-950/40 text-slate-500'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-amber-300">
                        {lvl === 10 ? 'BOSS' : 'LEVEL'}
                      </span>
                      <span className="my-1 font-display text-xl font-bold">{lvl}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </ScreenShell>
  );
};

export const CostumeShopScreen: React.FC<{
  saveData: SaveData;
  onBuyOrEquip: (itemId: string, category: CostumeCategory, price: number) => void;
  onSelectChar: (id: CharacterId) => void;
  onBack: () => void;
}> = ({ saveData, onBuyOrEquip, onSelectChar, onBack }) => {
  const [cat, setCat] = useState<CostumeCategory>('baju');
  const charId = saveData.selectedCharacter;
  const equipped = saveData.equippedCostumes[charId];
  const filtered = COSTUMES.filter((c) => c.category === cat);

  return (
    <ScreenShell title="Toko Kostum (Pakai Koin)" coins={saveData.coins} onBack={onBack}>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-5">
          <div className="flex gap-2">
            {(['nabil', 'jihan'] as CharacterId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelectChar(id)}
                className={`flex-1 rounded-xl py-2.5 font-display text-sm font-bold ${
                  charId === id
                    ? 'bg-amber-400 text-slate-950'
                    : 'border border-white/15 bg-slate-900 text-white'
                }`}
              >
                {CHARACTERS[id].name}
              </button>
            ))}
          </div>

          <div className="h-72 overflow-hidden rounded-3xl border border-white/15 bg-slate-900/60 lg:h-80">
            <CharacterPreview3D
              mode="single"
              characterId={charId}
              nabilCostume={saveData.equippedCostumes.nabil}
              jihanCostume={saveData.equippedCostumes.jihan}
              weaponId={saveData.equippedWeapon}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-7">
          <div className="flex flex-wrap gap-2">
            {COSTUME_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                  cat === c.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'border border-white/15 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((item) => {
              const owned = saveData.ownedCostumes.includes(item.id);
              const isEquipped = equipped[cat] === item.id;
              const canAfford = saveData.coins >= item.price;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/15 bg-slate-900/75 p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-bold text-white">{item.name}</span>
                      <span
                        className="h-5 w-5 shrink-0 rounded-md border border-white/30"
                        style={{ backgroundColor: item.color === 'transparent' ? '#334155' : item.color }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={!owned && !canAfford}
                    onClick={() => onBuyOrEquip(item.id, cat, item.price)}
                    className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold ${
                      isEquipped
                        ? 'border border-emerald-400/50 bg-emerald-500/25 text-emerald-300'
                        : owned
                        ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                        : canAfford
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'cursor-not-allowed bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isEquipped ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Dipakai
                      </>
                    ) : owned ? (
                      'Pakai Kostum'
                    ) : (
                      <>
                        <Coins className="h-3.5 w-3.5" /> Beli {item.price}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
};

export const InventoryScreen: React.FC<{
  saveData: SaveData;
  onBuyOrEquipWeapon: (id: WeaponId) => void;
  onBuyConsumable: (type: 'heart' | 'speed_boost' | 'shield', price: number) => void;
  onBack: () => void;
}> = ({ saveData, onBuyOrEquipWeapon, onBuyConsumable, onBack }) => {
  const weapons = Object.values(WEAPONS);
  const consumables: {
    id: 'heart' | 'speed_boost' | 'shield';
    name: string;
    price: number;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'heart',
      name: 'Ramuan Hati (+35 HP)',
      price: 25,
      desc: 'Gunakan di HUD saat bertarung untuk memulihkan HP.',
      icon: <Heart className="h-5 w-5 text-rose-400" />,
    },
    {
      id: 'speed_boost',
      name: 'Speed Boost (8s)',
      price: 30,
      desc: 'Berlari lebih cepat melewati labirin dan jebakan.',
      icon: <Zap className="h-5 w-5 text-cyan-400" />,
    },
    {
      id: 'shield',
      name: 'Perisai Pelindung (9s)',
      price: 35,
      desc: 'Melindungi dari serangan monster & boss.',
      icon: <Shield className="h-5 w-5 text-sky-400" />,
    },
  ];

  return (
    <ScreenShell title="Inventory & Senjata" coins={saveData.coins} onBack={onBack}>
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-white">
            <Swords className="h-5 w-5 text-amber-400" /> Senjata Ramah Anak
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {weapons.map((w) => {
              const owned = saveData.ownedWeapons.includes(w.id);
              const equipped = saveData.equippedWeapon === w.id;
              const canAfford = saveData.coins >= w.price;
              return (
                <div
                  key={w.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/15 bg-slate-900/75 p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-bold text-white">{w.name}</span>
                      <span className="font-mono-num text-xs font-semibold text-amber-300">
                        DMG {w.damage} · {w.isRanged ? 'Jarak Jauh' : 'Dekat'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{w.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={!owned && !canAfford}
                    onClick={() => onBuyOrEquipWeapon(w.id)}
                    className={`mt-4 rounded-xl py-2.5 text-xs font-bold ${
                      equipped
                        ? 'border border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                        : owned
                        ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                        : canAfford
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'cursor-not-allowed bg-slate-800 text-slate-500'
                    }`}
                  >
                    {equipped ? 'Sedang Dipakai' : owned ? 'Gunakan Senjata' : `Beli (${w.price} Koin)`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-white">
            <Sparkles className="h-5 w-5 text-emerald-400" /> Stok Power-Up Tas
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {consumables.map((item) => {
              const qty = saveData.consumables[item.id];
              const canAfford = saveData.coins >= item.price;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/15 bg-slate-900/75 p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      {item.icon}
                      <span className="font-mono-num text-sm font-bold text-white">Stok: {qty}</span>
                    </div>
                    <div className="mt-2 font-display text-base font-bold text-white">{item.name}</div>
                    <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onBuyConsumable(item.id, item.price)}
                    className={`mt-4 rounded-xl py-2 text-xs font-bold ${
                      canAfford
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'cursor-not-allowed bg-slate-800 text-slate-500'
                    }`}
                  >
                    Tambah Stok ({item.price} Koin)
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ScreenShell>
  );
};

export const SettingsScreen: React.FC<{
  saveData: SaveData;
  onUpdateSettings: (patch: Partial<SaveData['settings']>) => void;
  onNewGameConfirm: () => void;
  onBack: () => void;
}> = ({ saveData, onUpdateSettings, onNewGameConfirm, onBack }) => {
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [showGodotDocs, setShowGodotDocs] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  return (
    <ScreenShell title="Pengaturan & Sistem" coins={saveData.coins} onBack={onBack}>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="rounded-2xl border border-white/15 bg-slate-900/75 p-5">
          <h2 className="font-display text-lg font-bold text-white">Grafis &amp; Performa Android</h2>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Mode Grafis Awal</div>
              <div className="text-xs text-slate-400">Bisa ditukar kapan saja saat bermain</div>
            </div>
            <div className="flex gap-2">
              {(['2d', '3d'] as GraphicsMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onUpdateSettings({ defaultMode: m })}
                  className={`rounded-xl px-4 py-2 text-xs font-bold uppercase ${
                    saveData.settings.defaultMode === m
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Mode {m}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Kualitas Grafis 3D</div>
              <div className="text-xs text-slate-400">Rendah menghemat baterai &amp; RAM HP</div>
            </div>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onUpdateSettings({ quality: q })}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold capitalize ${
                    saveData.settings.quality === q
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div>
              <div className="text-sm font-semibold text-white">Buka Semua Level (Mode Uji)</div>
              <div className="text-xs text-slate-400">
                Langsung coba Level 1–10 (Forest King &amp; Lava Dragon) serta Dunia Ekstra
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ unlockAllPreview: !saveData.settings.unlockAllPreview })
              }
              className={`rounded-xl px-4 py-2 text-xs font-bold ${
                saveData.settings.unlockAllPreview
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {saveData.settings.unlockAllPreview ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-slate-900/75 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Volume2 className="h-5 w-5 text-sky-400" /> Pengaturan Audio Lokal
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Volume Musik</span>
                <span className="font-mono-num">{Math.round(saveData.settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={saveData.settings.musicVolume}
                onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                className="mt-1.5 w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Volume Efek Suara (SFX)</span>
                <span className="font-mono-num">{Math.round(saveData.settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={saveData.settings.sfxVolume}
                onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                className="mt-1.5 w-full accent-emerald-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-slate-900/75 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                <Code2 className="h-5 w-5 text-amber-400" /> Proyek Godot 4.x &amp; Panduan Export Android
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Termasuk skrip A* EnemyAI, BossAI 3 Fase, MazeGenerator, &amp; UPDATE_REQUIREMENTS.md.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowInstallModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 whitespace-nowrap"
              >
                <Smartphone className="h-4 w-4" /> Download .APK Android
              </button>
              <button
                type="button"
                onClick={() => setShowGodotDocs((v) => !v)}
                className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-700 whitespace-nowrap"
              >
                {showGodotDocs ? 'Tutup Panduan' : 'Lihat Panduan'}
              </button>
              <button
                type="button"
                onClick={() => downloadGodotProjectZip()}
                className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 whitespace-nowrap"
              >
                <Download className="h-4 w-4" /> Unduh ZIP Godot 4.x
              </button>
            </div>
          </div>

          {showGodotDocs && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-xs text-slate-300">
              <div>
                <div className="font-bold text-amber-300">Struktur Proyek Modular (res://)</div>
                <pre className="mt-1 overflow-x-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-emerald-300">
                  {GODOT_DOCS_SECTIONS.structure}
                </pre>
              </div>
              <div>
                <div className="font-bold text-amber-300">Petunjuk Menjalankan Proyek Godot</div>
                <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-950 p-3 font-sans">
                  {GODOT_DOCS_SECTIONS.runGuide}
                </pre>
              </div>
              <div>
                <div className="font-bold text-amber-300">Petunjuk Export Android (.APK)</div>
                <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-950 p-3 font-sans">
                  {GODOT_DOCS_SECTIONS.androidExportGuide}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-base font-bold text-rose-300">
                Mulai Permainan Baru (New Game)
              </div>
              <div className="text-xs text-slate-400">
                Menghapus progres level, checkpoint, koin, dan kostum yang tersimpan secara lokal.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmNewGame(true)}
              className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-400"
            >
              <Trash2 className="h-4 w-4" /> New Game
            </button>
          </div>
        </div>
      </div>

      {confirmNewGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-rose-400/40 bg-slate-900 p-6 text-center shadow-2xl">
            <h3 className="font-display text-xl font-bold text-white">Hapus Progres Lama?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Semua progres dunia, level, koin, dan kostum akan diulang dari awal. Lanjutkan?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmNewGame(false)}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmNewGame(false);
                  onNewGameConfirm();
                }}
                className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white hover:bg-rose-400"
              >
                Ya, Mulai Baru
              </button>
            </div>
          </div>
        </div>
      )}
      <AndroidInstallModal
        open={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </ScreenShell>
  );
};

export const ExitScreen: React.FC<{ onReturnMenu: () => void }> = ({ onReturnMenu }) => (
  <div className="flex h-full w-full items-center justify-center bg-slate-950 p-6">
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-8 text-center shadow-2xl">
      <h2 className="font-display text-2xl font-bold text-amber-300">
        Sampai Jumpa, Petualang!
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Semua progres level, koin, kostum, dan checkpoint sudah tersimpan otomatis di perangkatmu secara offline.
      </p>
      <button
        type="button"
        onClick={onReturnMenu}
        className="mt-6 w-full rounded-2xl bg-emerald-400 py-3 font-display text-base font-bold text-slate-950 hover:bg-emerald-300"
      >
        Kembali ke Menu Utama
      </button>
    </div>
  </div>
);
