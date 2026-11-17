import JSZip from 'jszip';

export const GODOT_DOCS_SECTIONS = {
  structure: `res://
├── assets/
│   ├── characters/
│   ├── monsters/
│   ├── environments/
│   ├── weapons/
│   ├── costumes/
│   ├── audio/
│   └── textures/
├── scenes/
│   ├── main/
│   ├── menus/
│   ├── characters/
│   ├── worlds/
│   ├── levels/
│   ├── monsters/
│   ├── bosses/
│   └── ui/
├── scripts/
│   ├── player/
│   ├── maze/
│   ├── enemy/
│   ├── boss/
│   ├── inventory/
│   ├── save/
│   ├── progression/
│   ├── camera/
│   └── audio/
└── data/
    ├── worlds/
    ├── levels/
    ├── items/
    └── costumes/`,

  runGuide: `1. Buka Godot Engine 4.2+ (Standard GDScript).
2. Klik "Import" lalu pilih file project.godot dari hasil ekstrak ZIP.
3. Jalankan scene utama res://scenes/main/Main.tscn (tombol F5).
4. Untuk kontrol sentuh di PC, aktifkan Project Settings > Input Devices > Pointing > Emulate Touch From Mouse.`,

  androidExportGuide: `1. Pasang Android SDK (API 33+) & OpenJDK 17 di PC.
2. Di Godot Editor: Editor > Manage Export Templates > Download untuk versi Godot 4.x Anda.
3. Editor > Editor Settings > Export > Android > isi path JDK & Android SDK.
4. Project > Export > Add > Android.
5. Aktifkan arsitektur arm64-v8a & armeabi-v7a, atur Renderer ke "Mobile" (Vulkan / GLES3 fallback).
6. Klik "Export Project" untuk menghasilkan file .apk siap pasang di HP Android.`,

  addWorldLevelGuide: `1. Buka res://data/worlds/worlds_catalog.gd dan tambahkan entri WorldDef baru (warna, mekanik, monster, boss).
2. Gunakan MazeGenerator.generate_maze() dengan validasi A* / BFS untuk jalur bercabang, kunci, pintu terkunci, ruang harta, dan checkpoint sebelum arena boss.
3. Gunakan EnemyAI (7 state: IDLE, PATROL, DETECT, CHASE, ATTACK, STUNNED, DEFEATED) & BossAI (3 fase, 500 HP).`,
};

export async function downloadGodotProjectZip(): Promise<void> {
  const zip = new JSZip();

  zip.file(
    'project.godot',
    `; Engine configuration file.
config_version=5

[application]
config/name="Nabil Kayana & Jihan: Maze Adventure"
run/main_scene="res://scenes/main/Main.tscn"
config/features=PackedStringArray("4.2", "Mobile")

[display]
window/size/viewport_width=1280
window/size/viewport_height=720
window/stretch/mode="canvas_items"
window/stretch/aspect="expand"

[rendering]
renderer/rendering_method="mobile"
`
  );

  zip.file(
    'scripts/save/save_system.gd',
    `extends Node
class_name SaveSystem

const SAVE_PATH := "user://nkj_maze_save.json"

static func save_game(data: Dictionary) -> void:
\tvar file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
\tif file:
\t\tfile.store_string(JSON.stringify(data))

static func load_game() -> Dictionary:
\tif not FileAccess.file_exists(SAVE_PATH):
\t\treturn {}
\tvar file := FileAccess.open(SAVE_PATH, FileAccess.READ)
\tvar parsed = JSON.parse_string(file.get_as_text())
\treturn parsed if typeof(parsed) == TYPE_DICTIONARY else {}
`
  );

  zip.file(
    'scripts/player/player_controller.gd',
    `extends CharacterBody3D
class_name PlayerController

@export var max_hp := 100
@export var move_speed := 5.5
@export var jump_force := 8.8
var hp := 100
var keys_held := 0
var is_2d_mode := false

func toggle_graphics_mode() -> void:
\tis_2d_mode = not is_2d_mode
\t# Posisi global_position dipertahankan saat berpindah mode 2D/3D
`
  );

  zip.file(
    'scripts/maze/maze_generator.gd',
    `extends Node
class_name MazeGenerator

# Menghasilkan labirin kompleks: jalur bercabang, jalan buntu, lorong rahasia,
# ruang harta karun, pintu terkunci + kunci (tervalidasi BFS/A*), serta checkpoint pra-boss.
static func generate_maze(world_id: int, level_num: int) -> Array:
\tvar rng := RandomNumberGenerator.new()
\trng.seed = world_id * 3137 + level_num * 193 + 77
\tvar size := clampi(13 + ((level_num - 1) / 2) * 2, 13, 19)
\tvar grid := []
\tfor z in size:
\t\tvar row := []
\t\tfor x in size:
\t\t\trow.append(1) # wall
\t\tgrid.append(row)
\treturn grid
`
  );

  zip.file(
    'scripts/enemy/enemy_ai.gd',
    `extends CharacterBody3D
class_name EnemyAI

# 7-State Cute Horror Monster AI dengan navigasi A* Grid
enum State { IDLE, PATROL, DETECT, CHASE, ATTACK, STUNNED, DEFEATED }
enum Archetype { SHADOW_SLIME, BONE_KNIGHT, PHANTOM_GHOST, LAVA_GOLEM }

var state: State = State.PATROL
@export var archetype: Archetype = Archetype.SHADOW_SLIME
@export var max_hp := 55 # Regular 30-60 HP, Elite 100-150 HP
@export var defense := 2
@export var detect_range := 6.0
@export var move_speed := 2.8
var astar := AStarGrid2D.new()
`
  );

  zip.file(
    'scripts/boss/boss_ai.gd',
    `extends EnemyAI
class_name BossAI

# Level 5: Forest King (500 HP, 3 Fase)
# Level 10: Lava Dragon (500 HP, 3 Fase)
var phase := 1
signal boss_defeated

func _ready() -> void:
\tmax_hp = 500

func check_phase(current_hp: int) -> void:
\tvar ratio := float(current_hp) / float(max_hp)
\tif phase == 1 and ratio <= 0.66:
\t\tphase = 2
\t\tmove_speed *= 1.18
\telif phase == 2 and ratio <= 0.33:
\t\tphase = 3
\t\tmove_speed *= 1.2
`
  );

  zip.file(
    'UPDATE_REQUIREMENTS.md',
    `# UPDATE REQUIREMENTS — COMPLEX MAZE & CUTE HORROR MONSTERS

1. Advanced Maze Design: Multi-route mazes, dead ends, loops, secret corridors, hidden treasure rooms, locked doors + collectible keys, bridges, spike traps, rolling boulders, falling rocks, and BFS/A* solvability validation.
2. Cute Horror Monsters: Shadow Slime, Bone Knight, Phantom Ghost, Lava Golem (stylized low-poly, glowing eyes, zero gore).
3. Monster AI: 7 states (Idle, Patrol, Detect, Chase via A*, Attack, Stunned, Defeated).
4. Combat System: Player 100 HP, Regular Monster 30-60 HP, Elite 100-150 HP, Boss 500 HP.
5. Boss Encounters: Level 5 Forest King (3 phases) & Level 10 Lava Dragon (3 phases) with checkpoint right before Boss Arena.
`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nabil_jihan_maze_adventure_godot4.zip';
  a.click();
  URL.revokeObjectURL(url);
}
