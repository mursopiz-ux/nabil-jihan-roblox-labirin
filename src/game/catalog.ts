import {
  CharacterDef,
  CharacterId,
  CostumeCategory,
  CostumeItem,
  MagicSpellDef,
  MagicSpellId,
  MonsterKind,
  WeaponDef,
  WeaponId,
  WorldDef,
  WorldId,
} from './types';

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  nabil: {
    id: 'nabil',
    name: 'Nabil Kayana',
    tagline: 'Petualang Koko Cokelat yang Pemberani & Cerdik',
    skinColor: '#f5c6a5',
    defaultCostume: {
      baju: 'baju_koko_cokelat',
      celana: 'celana_cokelat',
      topi: 'topi_none',
      rambut: 'rambut_nabil_klasik',
      sepatu: 'sepatu_putih',
      aksesoris: 'aks_none',
    },
    stats: {
      maxHp: 100,
      speed: 5.5,
      jumpForce: 8.8,
      attackBonus: 0,
    },
  },
  jihan: {
    id: 'jihan',
    name: 'Jihan',
    tagline: 'Penjelajah Pita Pink yang Gesit & Tangguh',
    skinColor: '#f7ceb2',
    defaultCostume: {
      baju: 'baju_garis_jihan',
      celana: 'celana_rok_pink',
      topi: 'topi_none',
      rambut: 'rambut_jihan_pita',
      sepatu: 'sepatu_pink',
      aksesoris: 'aks_pita_pink',
    },
    stats: {
      maxHp: 100,
      speed: 5.5,
      jumpForce: 8.8,
      attackBonus: 0,
    },
  },
};

export const CAMPAIGN_LEVEL_SPECS: {
  worldId: WorldId;
  levelNumber: number;
  campaignLevel: number;
  title: string;
  subtitle: string;
}[] = [
  { worldId: 1, levelNumber: 1, campaignLevel: 1, title: 'Hutan Bercabang', subtitle: 'Slime Kecil & Jalur Awal' },
  { worldId: 1, levelNumber: 2, campaignLevel: 2, title: 'Hutan Berkabut', subtitle: 'Kabut Tebal & Jalan Buntu' },
  { worldId: 1, levelNumber: 3, campaignLevel: 3, title: 'Jembatan Kayu', subtitle: 'Shadow Slime & Kunci Pintu' },
  { worldId: 1, levelNumber: 4, campaignLevel: 4, title: 'Labirin Akar Pohon', subtitle: 'Bone Knight & Ruang Harta' },
  { worldId: 1, levelNumber: 5, campaignLevel: 5, title: 'Tahta Forest King', subtitle: 'BOSS DUNIA 1 — Forest King (3 Fase)' },
  { worldId: 2, levelNumber: 1, campaignLevel: 6, title: 'Lorong Gunung Api', subtitle: 'Batu Bergulir & Jebakan Duri' },
  { worldId: 2, levelNumber: 2, campaignLevel: 7, title: 'Jembatan Lava', subtitle: 'Jembatan Sempit & Batu Jatuh' },
  { worldId: 2, levelNumber: 3, campaignLevel: 8, title: 'Labirin Bawah Tanah', subtitle: 'Phantom Ghost & Lorong Rahasia' },
  { worldId: 2, levelNumber: 4, campaignLevel: 9, title: 'Benteng Lava', subtitle: 'Lava Golem Elite & Harta Tersembunyi' },
  { worldId: 2, levelNumber: 5, campaignLevel: 10, title: 'Kawah Lava Dragon', subtitle: 'FINAL BOSS — Lava Dragon (3 Fase)' },
];

export const WORLDS: WorldDef[] = [
  {
    id: 1,
    name: 'Green Forest',
    subtitle: 'Level 1–5 · Hutan Bercabang, Shadow Slime & Bone Knight',
    themeColor: '#22c55e',
    bgGradient: 'from-emerald-900 via-green-800 to-slate-950',
    floorColor: '#4ade80',
    wallColor: '#166534',
    wallTopColor: '#22c55e',
    hazardColor: '#0ea5e9',
    skyColor: '#7dd3fc',
    fogColor: '#a7f3d0',
    monsterKind: 'shadow_slime',
    bossName: 'Forest King',
    bossSubtitle: 'Raja Akar & Kayu Hutan (500 HP · 3 Fase)',
    mechanicLabel: 'Kunci, Pintu Terkunci, Jembatan Kayu & Jebakan',
  },
  {
    id: 2,
    name: 'Lava Volcano',
    subtitle: 'Level 6–10 · Lorong Api, Phantom Ghost & Lava Golem',
    themeColor: '#f97316',
    bgGradient: 'from-orange-950 via-red-900 to-stone-950',
    floorColor: '#57534e',
    wallColor: '#292524',
    wallTopColor: '#ea580c',
    hazardColor: '#f97316',
    skyColor: '#451a03',
    fogColor: '#7c2d12',
    monsterKind: 'lava_golem',
    bossName: 'Lava Dragon',
    bossSubtitle: 'Naga Api Raksasa (500 HP · 3 Fase)',
    mechanicLabel: 'Batu Bergulir, Jembatan Lava, Ghost & Gelombang Api',
  },
  {
    id: 3,
    name: 'Frozen Kingdom',
    subtitle: 'Ekstra · Kerajaan Es & Pintu Rahasia',
    themeColor: '#38bdf8',
    bgGradient: 'from-sky-900 via-cyan-800 to-slate-950',
    floorColor: '#e0f2fe',
    wallColor: '#0284c7',
    wallTopColor: '#bae6fd',
    hazardColor: '#7dd3fc',
    skyColor: '#bae6fd',
    fogColor: '#e0f2fe',
    monsterKind: 'ice',
    bossName: 'Frost Yeti',
    bossSubtitle: 'Yeti Salju Penguasa Es',
    mechanicLabel: 'Lantai Es Licin & Pintu Rahasia',
  },
  {
    id: 4,
    name: 'Haunted Castle',
    subtitle: 'Ekstra · Kastil Misterius & Lorong Bergerak',
    themeColor: '#a855f7',
    bgGradient: 'from-purple-950 via-indigo-900 to-slate-950',
    floorColor: '#475569',
    wallColor: '#312e81',
    wallTopColor: '#6d28d9',
    hazardColor: '#9333ea',
    skyColor: '#1e1b4b',
    fogColor: '#312e81',
    monsterKind: 'phantom_ghost',
    bossName: 'Phantom Knight',
    bossSubtitle: 'Ksatria Hantu Lucu Kastil Tua',
    mechanicLabel: 'Lorong Rahasia & Dinding Bergerak',
  },
  {
    id: 5,
    name: 'Sky Dragon Kingdom',
    subtitle: 'Ekstra · Pulau Melayang & Naga Langit',
    themeColor: '#eab308',
    bgGradient: 'from-amber-700 via-sky-700 to-indigo-950',
    floorColor: '#fef3c7',
    wallColor: '#d97706',
    wallTopColor: '#fbbf24',
    hazardColor: '#38bdf8',
    skyColor: '#60a5fa',
    fogColor: '#fde68a',
    monsterKind: 'dragon',
    bossName: 'Sky Dragon',
    bossSubtitle: 'Penjaga Kerajaan Langit',
    mechanicLabel: 'Pulau Melayang & Jembatan Langit',
  },
];

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  toy_sword: {
    id: 'toy_sword',
    name: 'Toy Sword',
    damage: 24,
    range: 2.2,
    cooldown: 0.34,
    isRanged: false,
    color: '#38bdf8',
    price: 0,
    description: 'Pedang mainan ringan dengan ayunan cepat dan efek kilau biru.',
  },
  cartoon_hammer: {
    id: 'cartoon_hammer',
    name: 'Cartoon Hammer',
    damage: 38,
    range: 2.4,
    cooldown: 0.55,
    isRanged: false,
    color: '#f59e0b',
    price: 80,
    description: 'Palu kartun besar dengan daya pukul tinggi & hentakan kuat.',
  },
  bubble_blaster: {
    id: 'bubble_blaster',
    name: 'Bubble Blaster',
    damage: 22,
    range: 7.5,
    cooldown: 0.36,
    isRanged: true,
    projectileSpeed: 10.5,
    color: '#22d3ee',
    price: 110,
    description: 'Menembakkan gelembung jarak jauh yang meletup lucu.',
  },
  magic_wand: {
    id: 'magic_wand',
    name: 'Magic Star Wand',
    damage: 30,
    range: 8.5,
    cooldown: 0.4,
    isRanged: true,
    projectileSpeed: 12.5,
    color: '#facc15',
    price: 150,
    description: 'Tongkat bintang ajaib (+25% damage sihir Api, Petir & Es!).',
  },
};

export const MAGIC_SPELLS: Record<MagicSpellId, MagicSpellDef> = {
  fireball: {
    id: 'fireball',
    name: 'Bola Api',
    shortLabel: 'Api',
    mpCost: 20,
    cooldown: 1.5,
    damage: 40,
    color: '#f97316',
    description: 'Meluncurkan bola api besar yang meledak dan membakar musuh selama 3.5 detik.',
  },
  lightning: {
    id: 'lightning',
    name: 'Sihir Petir',
    shortLabel: 'Petir',
    mpCost: 25,
    cooldown: 2.2,
    damage: 44,
    color: '#38bdf8',
    description: 'Menyambar hingga 3 monster terdekat sekaligus & melumpuhkan sejenak.',
  },
  ice: {
    id: 'ice',
    name: 'Badai Es',
    shortLabel: 'Es',
    mpCost: 18,
    cooldown: 1.8,
    damage: 30,
    color: '#67e8f9',
    description: 'Tembakan kristal es yang membekukan & memperlambat gerakan monster.',
  },
};

export const COSTUME_CATEGORIES: { id: CostumeCategory; label: string }[] = [
  { id: 'baju', label: 'Baju' },
  { id: 'celana', label: 'Celana / Rok' },
  { id: 'topi', label: 'Topi' },
  { id: 'rambut', label: 'Rambut' },
  { id: 'sepatu', label: 'Sepatu' },
  { id: 'aksesoris', label: 'Aksesori & Sayap' },
];

export const COSTUMES: CostumeItem[] = [
  // Baju
  { id: 'baju_koko_cokelat', name: 'Baju Koko Cokelat Nabil', category: 'baju', price: 0, color: '#6b3e26', accentColor: '#f5e6d3', style: 'koko', description: 'Baju koko cokelat khas Nabil dengan detail kancing putih.' },
  { id: 'baju_garis_jihan', name: 'Kaos Garis-Garis Jihan', category: 'baju', price: 0, color: '#f8fafc', accentColor: '#1e293b', style: 'striped', description: 'Kaos putih garis-garis biru gelap dengan pita pink kecil.' },
  { id: 'baju_biru', name: 'Jaket Petualang Biru', category: 'baju', price: 35, color: '#2563eb', accentColor: '#93c5fd', style: 'tee', description: 'Jaket santai warna biru langit.' },
  { id: 'baju_merah', name: 'Rompi Api Juara', category: 'baju', price: 55, color: '#dc2626', accentColor: '#fde047', style: 'vest', description: 'Rompi merah dengan garis kuning emas.' },
  { id: 'baju_ungu', name: 'Jubah Bintang Kastil', category: 'baju', price: 85, color: '#7c3aed', accentColor: '#facc15', style: 'robe', description: 'Baju ungu misterius bertabur bintang.' },
  { id: 'baju_emas', name: 'Armor Naga Emas', category: 'baju', price: 140, color: '#eab308', accentColor: '#fef08a', style: 'armor', description: 'Pakaian ksatria berkilau emas.' },

  // Celana / Rok
  { id: 'celana_cokelat', name: 'Celana Cokelat Klasik', category: 'celana', price: 0, color: '#4a2b18', style: 'pants', description: 'Celana cokelat senada baju koko Nabil.' },
  { id: 'celana_rok_pink', name: 'Rok Pink Jihan', category: 'celana', price: 0, color: '#f43f8e', accentColor: '#fbcfe8', style: 'skirt', description: 'Rok pink cerah dengan aksen pita.' },
  { id: 'celana_navy', name: 'Celana Navy Petualang', category: 'celana', price: 30, color: '#1e3a8a', style: 'pants', description: 'Celana nyaman untuk berlari.' },
  { id: 'celana_hijau', name: 'Celana Rimba', category: 'celana', price: 40, color: '#15803d', style: 'cargo', description: 'Celana kargo penjelajah hutan.' },
  { id: 'celana_emas', name: 'Celana Ksatria Emas', category: 'celana', price: 110, color: '#ca8a04', style: 'armor', description: 'Pelindung kaki berbalut emas.' },

  // Topi
  { id: 'topi_none', name: 'Tanpa Topi', category: 'topi', price: 0, color: 'transparent', style: 'none', description: 'Menampilkan gaya rambut asli.' },
  { id: 'topi_rimba', name: 'Topi Penjelajah', category: 'topi', price: 45, color: '#ca8a04', accentColor: '#713f12', style: 'explorer', description: 'Topi lebar khas petualang labirin.' },
  { id: 'topi_cap', name: 'Topi Keren Merah', category: 'topi', price: 50, color: '#ef4444', accentColor: '#ffffff', style: 'cap', description: 'Topi baseball santai warna merah.' },
  { id: 'topi_penyihir', name: 'Topi Penyihir Lucu', category: 'topi', price: 85, color: '#7c3aed', accentColor: '#facc15', style: 'explorer', description: 'Topi penyihir ungu bergaya kartun.' },
  { id: 'topi_naga', name: 'Helm Tanduk Naga', category: 'topi', price: 160, color: '#f59e0b', accentColor: '#fef08a', style: 'dragon', description: 'Helm juara penakluk Lava Dragon.' },

  // Rambut
  { id: 'rambut_nabil_klasik', name: 'Rambut Hitam Pendek Nabil', category: 'rambut', price: 0, color: '#1c1410', style: 'spiky', description: 'Rambut hitam pendek rapi khas Nabil.' },
  { id: 'rambut_jihan_pita', name: 'Rambut Ikat Ekor Kuda Jihan', category: 'rambut', price: 0, color: '#3a2216', style: 'ponytail', description: 'Rambut cokelat tua diikat pita pink.' },
  { id: 'rambut_biru', name: 'Rambut Biru Samudra', category: 'rambut', price: 45, color: '#0284c7', style: 'spiky', description: 'Gaya rambut keren bernuansa biru.' },
  { id: 'rambut_ungu', name: 'Rambut Ungu Galaksi', category: 'rambut', price: 65, color: '#9333ea', style: 'long', description: 'Rambut ungu lembut bercahaya.' },
  { id: 'rambut_emas', name: 'Rambut Pirang Bintang', category: 'rambut', price: 90, color: '#facc15', style: 'spiky', description: 'Rambut kuning keemasan bersinar.' },

  // Sepatu
  { id: 'sepatu_putih', name: 'Sepatu Kets Putih Nabil', category: 'sepatu', price: 0, color: '#f8fafc', accentColor: '#64748b', style: 'sneakers', description: 'Sepatu putih bersih nyaman dipakai lari.' },
  { id: 'sepatu_pink', name: 'Sepatu Pink Jihan', category: 'sepatu', price: 0, color: '#ec4899', accentColor: '#ffffff', style: 'sneakers', description: 'Sepatu kets pink bergaris putih.' },
  { id: 'sepatu_hijau', name: 'Sepatu Hutan Kilat', category: 'sepatu', price: 40, color: '#16a34a', accentColor: '#bbf7d0', style: 'boots', description: 'Sepatu bot anti lumpur.' },
  { id: 'sepatu_sayap', name: 'Sepatu Emas Langit', category: 'sepatu', price: 120, color: '#eab308', accentColor: '#fef9c3', style: 'boots', description: 'Sepatu mewah penuh kilau emas.' },

  // Aksesori & Wing Dragon Skins
  { id: 'aks_none', name: 'Tanpa Aksesori', category: 'aksesoris', price: 0, color: 'transparent', style: 'none', description: 'Tampilan polos dan ringan.' },
  { id: 'aks_pita_pink', name: 'Pita Pink Jihan', category: 'aksesoris', price: 0, color: '#f43f8e', accentColor: '#fbcfe8', style: 'ribbon', description: 'Pita rambut pink manis di belakang kepala.' },
  { id: 'aks_ransel', name: 'Tas Ransel Mini', category: 'aksesoris', price: 40, color: '#f43f5e', accentColor: '#fde047', style: 'backpack', description: 'Ransel kecil berwarna ceria.' },
  { id: 'aks_kacamata', name: 'Kacamata Petualang', category: 'aksesoris', price: 55, color: '#0f172a', accentColor: '#38bdf8', style: 'glasses', description: 'Kacamata biru bergaya blocky.' },
  { id: 'aks_jubah', name: 'Jubah Pahlawan', category: 'aksesoris', price: 100, color: '#dc2626', accentColor: '#facc15', style: 'cape', description: 'Jubah merah berkibar di punggung.' },
  { id: 'aks_sayap', name: 'Sayap Naga Mini', category: 'aksesoris', price: 140, color: '#fbbf24', accentColor: '#fef9c3', style: 'wings', wingStyle: 'mini', auraColor: '#facc15', description: 'Sayap naga mini emas yang mengepak saat melompat.' },
  { id: 'aks_sayap_naga_energi', name: 'Sayap Naga Energi', category: 'aksesoris', price: 180, color: '#06b6d4', accentColor: '#67e8f9', style: 'wings', wingStyle: 'dragon_energy', auraColor: '#22d3ee', unlockHint: 'Kalahkan Boss Forest King atau beli 180 Koin', description: 'Sayap naga kristal energi yang mengepak dengan aura petir & regen lebih cepat!' },
  { id: 'aks_sayap_naga_api', name: 'Sayap Naga Api', category: 'aksesoris', price: 220, color: '#dc2626', accentColor: '#fb923c', style: 'wings', wingStyle: 'dragon_fire', auraColor: '#f97316', unlockHint: 'Kalahkan Boss Lava Dragon atau beli 220 Koin', description: 'Sayap naga api legendaris dengan aura bara api & daya melayang di udara!' },
];

export const MONSTER_TEMPLATES: Record<
  MonsterKind,
  {
    name: string;
    color: string;
    accentColor: string;
    eyeColor: string;
    baseHp: number;
    baseDamage: number;
    defense: number;
    baseSpeed: number;
    detectRange: number;
    isElite: boolean;
    projectileKind: 'slime_glob' | 'fireball' | 'ice_shard' | 'ghost_orb' | 'dragon_flame';
  }
> = {
  slime: {
    name: 'Forest Slime',
    color: '#22c55e',
    accentColor: '#bbf7d0',
    eyeColor: '#fde047',
    baseHp: 35,
    baseDamage: 10,
    defense: 0,
    baseSpeed: 2.2,
    detectRange: 5.0,
    isElite: false,
    projectileKind: 'slime_glob',
  },
  shadow_slime: {
    name: 'Shadow Slime',
    color: '#1e1b4b',
    accentColor: '#4ade80',
    eyeColor: '#a3e635',
    baseHp: 55,
    baseDamage: 14,
    defense: 2,
    baseSpeed: 2.8,
    detectRange: 6.0,
    isElite: false,
    projectileKind: 'slime_glob',
  },
  bone_knight: {
    name: 'Bone Knight',
    color: '#e2e8f0',
    accentColor: '#9333ea',
    eyeColor: '#d946ef',
    baseHp: 115,
    baseDamage: 20,
    defense: 5,
    baseSpeed: 2.1,
    detectRange: 6.2,
    isElite: true,
    projectileKind: 'ghost_orb',
  },
  phantom_ghost: {
    name: 'Phantom Ghost',
    color: '#6366f1',
    accentColor: '#c084fc',
    eyeColor: '#e879f9',
    baseHp: 58,
    baseDamage: 16,
    defense: 1,
    baseSpeed: 3.1,
    detectRange: 6.8,
    isElite: false,
    projectileKind: 'ghost_orb',
  },
  lava_golem: {
    name: 'Lava Golem',
    color: '#44403c',
    accentColor: '#f97316',
    eyeColor: '#fde047',
    baseHp: 140,
    baseDamage: 22,
    defense: 7,
    baseSpeed: 2.0,
    detectRange: 6.5,
    isElite: true,
    projectileKind: 'fireball',
  },
  forest_king: {
    name: 'Forest King',
    color: '#3f2e21',
    accentColor: '#22c55e',
    eyeColor: '#fde047',
    baseHp: 500,
    baseDamage: 22,
    defense: 4,
    baseSpeed: 2.4,
    detectRange: 16,
    isElite: true,
    projectileKind: 'slime_glob',
  },
  lava_dragon: {
    name: 'Lava Dragon',
    color: '#dc2626',
    accentColor: '#f97316',
    eyeColor: '#fde047',
    baseHp: 500,
    baseDamage: 25,
    defense: 5,
    baseSpeed: 2.8,
    detectRange: 18,
    isElite: true,
    projectileKind: 'dragon_flame',
  },
  fire: {
    name: 'Lava Monster',
    color: '#f97316',
    accentColor: '#fef08a',
    eyeColor: '#fef08a',
    baseHp: 55,
    baseDamage: 15,
    defense: 2,
    baseSpeed: 2.6,
    detectRange: 5.8,
    isElite: false,
    projectileKind: 'fireball',
  },
  ice: {
    name: 'Ice Monster',
    color: '#38bdf8',
    accentColor: '#e0f2fe',
    eyeColor: '#0284c7',
    baseHp: 60,
    baseDamage: 16,
    defense: 2,
    baseSpeed: 2.7,
    detectRange: 6.0,
    isElite: false,
    projectileKind: 'ice_shard',
  },
  ghost: {
    name: 'Ghost Monster',
    color: '#c084fc',
    accentColor: '#f3e8ff',
    eyeColor: '#f43f5e',
    baseHp: 58,
    baseDamage: 16,
    defense: 1,
    baseSpeed: 3.0,
    detectRange: 6.5,
    isElite: false,
    projectileKind: 'ghost_orb',
  },
  dragon: {
    name: 'Dragon Monster',
    color: '#facc15',
    accentColor: '#ef4444',
    eyeColor: '#ef4444',
    baseHp: 110,
    baseDamage: 20,
    defense: 4,
    baseSpeed: 3.2,
    detectRange: 7.0,
    isElite: true,
    projectileKind: 'dragon_flame',
  },
};

export function getCostumeById(id: string): CostumeItem {
  return COSTUMES.find((c) => c.id === id) || COSTUMES[0];
}

export function getWorldById(id: WorldId): WorldDef {
  return WORLDS.find((w) => w.id === id) || WORLDS[0];
}
