import { CHARACTERS, MONSTER_TEMPLATES, WEAPONS, getCostumeById, getWorldById } from './catalog';
import { CharacterId, EquippedCostume, LevelSimulation, WeaponId } from './types';

export function render2DScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sim: LevelSimulation,
  characterId: CharacterId,
  costume: EquippedCostume,
  weaponId: WeaponId,
  zoomFactor = 1.0
): void {
  const world = getWorldById(sim.worldId);
  const baseTile = Math.max(38, Math.min(58, Math.floor(Math.min(width, height) / 11)));
  const tileSize = Math.round(baseTile * Math.max(0.65, Math.min(1.65, zoomFactor)));

  ctx.fillStyle = sim.worldId === 5 ? '#38bdf8' : sim.worldId === 2 ? '#1c0f0a' : '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const camX = sim.player.x * tileSize - width / 2;
  const camZ = sim.player.z * tileSize - height / 2;

  ctx.save();
  ctx.translate(-camX, -camZ);

  const { tiles, width: mw, height: mh } = sim.levelData;

  for (let gz = 0; gz < mh; gz++) {
    for (let gx = 0; gx < mw; gx++) {
      const tile = tiles[gz][gx];
      const px = gx * tileSize - tileSize / 2;
      const pz = gz * tileSize - tileSize / 2;

      if (tile === 'void') {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(px + 6, pz + 6, tileSize - 12, tileSize - 12);
        continue;
      }

      if (tile === 'wall') {
        ctx.fillStyle = world.wallColor;
        ctx.fillRect(px, pz, tileSize, tileSize);
        ctx.fillStyle = world.wallTopColor;
        ctx.fillRect(px + 3, pz + 3, tileSize - 6, tileSize - 10);
        continue;
      }

      // Base floor
      ctx.fillStyle = tile === 'treasure_floor' ? '#fef08a' : world.floorColor;
      ctx.fillRect(px, pz, tileSize, tileSize);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, pz, tileSize, tileSize);

      if (tile === 'bridge') {
        ctx.fillStyle = sim.worldId === 2 ? '#ea580c' : '#0284c7';
        ctx.fillRect(px, pz, tileSize, tileSize);
        ctx.fillStyle = '#92400e';
        for (let b = 0; b < 4; b++) {
          ctx.fillRect(px + 2, pz + 4 + b * (tileSize / 4), tileSize - 4, tileSize / 5);
        }
      } else if (tile === 'lava') {
        const pulse = 0.7 + Math.sin(sim.elapsedTime * 5 + gx + gz) * 0.2;
        ctx.fillStyle = `rgba(249, 115, 22, ${pulse})`;
        ctx.fillRect(px + 2, pz + 2, tileSize - 4, tileSize - 4);
      } else if (tile === 'spike_trap') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(px + 4, pz + 4, tileSize - 8, tileSize - 8);
        ctx.fillStyle = sim.spikeActive ? '#ef4444' : '#94a3b8';
        for (let sx = 0; sx < 2; sx++) {
          for (let sy = 0; sy < 2; sy++) {
            ctx.beginPath();
            ctx.arc(
              px + tileSize * (0.33 + sx * 0.34),
              pz + tileSize * (0.33 + sy * 0.34),
              sim.spikeActive ? 5 : 2.5,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      } else if (tile === 'locked_door') {
        const isOpen = sim.unlockedDoors.has(`${gx},${gz}`);
        if (!isOpen) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px + 2, pz + 2, tileSize - 4, tileSize - 4);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(px + tileSize * 0.36, pz + tileSize * 0.32, tileSize * 0.28, tileSize * 0.36);
        }
      } else if (tile === 'ice') {
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(px + 1, pz + 1, tileSize - 2, tileSize - 2);
      } else if (tile === 'secret_door') {
        if (!sim.doorOpen) {
          ctx.fillStyle = '#0369a1';
          ctx.fillRect(px + 2, pz + 2, tileSize - 4, tileSize - 4);
        }
      } else if (tile === 'secret_switch') {
        ctx.fillStyle = sim.doorOpen ? '#22c55e' : '#eab308';
        ctx.beginPath();
        ctx.arc(px + tileSize / 2, pz + tileSize / 2, tileSize * 0.26, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 'secret_passage') {
        ctx.fillStyle = world.wallColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(px, pz, tileSize, tileSize);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#c084fc';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(px + 4, pz + 4, tileSize - 8, tileSize - 8);
        ctx.setLineDash([]);
      } else if (tile === 'moving_wall') {
        if (!sim.movingWallOpen) {
          ctx.fillStyle = '#6d28d9';
          ctx.fillRect(px + 2, pz + 2, tileSize - 4, tileSize - 4);
        }
      } else if (tile === 'checkpoint') {
        ctx.fillStyle = sim.player.checkpointReached ? '#22c55e' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(px + tileSize / 2, pz + tileSize / 2, tileSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + tileSize * 0.46, pz + tileSize * 0.22, 4, tileSize * 0.5);
        ctx.fillRect(px + tileSize * 0.5, pz + tileSize * 0.22, tileSize * 0.24, tileSize * 0.18);
      } else if (tile === 'exit') {
        ctx.fillStyle = sim.exitUnlocked ? '#facc15' : '#64748b';
        ctx.beginPath();
        ctx.arc(px + tileSize / 2, pz + tileSize / 2, tileSize * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = sim.exitUnlocked ? '#fef08a' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(px + tileSize / 2, pz + tileSize / 2, tileSize * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Shockwaves
  for (const sw of sim.shockwaves) {
    ctx.strokeStyle = sw.warningTimer > 0 ? 'rgba(239,68,68,0.6)' : sw.color;
    ctx.lineWidth = sw.warningTimer > 0 ? 2 : 4;
    ctx.beginPath();
    ctx.arc(sw.x * tileSize, sw.z * tileSize, sw.radius * tileSize, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rolling Boulders
  for (const b of sim.boulders) {
    ctx.fillStyle = '#57534e';
    ctx.beginPath();
    ctx.arc(b.x * tileSize, b.z * tileSize, tileSize * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Falling Rocks
  for (const rock of sim.fallingRocks) {
    const rx = rock.x * tileSize;
    const rz = rock.z * tileSize;
    if (rock.timer > rock.cycle - 1.4) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rx, rz, tileSize * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (rock.y < 5.5) {
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.arc(rx, rz - rock.y * 8, tileSize * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Items
  for (const item of sim.items) {
    if (item.collected) continue;
    const ix = item.x * tileSize;
    const iz = item.z * tileSize + Math.sin(sim.elapsedTime * 4 + item.bobOffset) * 3;
    if (item.type === 'gold_coin') {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(ix, iz, tileSize * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'key') {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(ix - 8, iz - 4, 16, 8);
      ctx.beginPath();
      ctx.arc(ix - 6, iz, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (item.type === 'heart') {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(ix, iz, tileSize * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'mystery_box') {
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(ix - 10, iz - 10, 20, 20);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.strokeRect(ix - 10, iz - 10, 20, 20);
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ix, iz, tileSize * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Monsters & Cute Horror Bosses
  for (const m of sim.monsters) {
    if (!m.alive) continue;
    const mx = m.x * tileSize;
    const mz = m.z * tileSize - m.y * 12;
    const tpl = MONSTER_TEMPLATES[m.kind];
    const r = m.isBoss ? tileSize * 0.62 : m.isElite ? tileSize * 0.44 : tileSize * 0.34;
    const bounce = Math.sin(m.animTime * 6) * 2.5;

    ctx.save();
    if (m.invisibleTimer > 0) ctx.globalAlpha = 0.28;

    ctx.fillStyle = m.hitFlash > 0 ? '#ffffff' : m.freezeTimer > 0 ? '#67e8f9' : tpl.color;
    ctx.fillRect(mx - r, mz - r + bounce, r * 2, r * 1.85);
    ctx.strokeStyle =
      m.burnTimer > 0 ? '#f97316' : m.freezeTimer > 0 ? '#38bdf8' : tpl.accentColor;
    ctx.lineWidth = m.isBoss ? 3 : 2;
    ctx.strokeRect(mx - r, mz - r + bounce, r * 2, r * 1.85);

    // Glowing Cute Horror Eyes
    const ex = Math.sin(m.facing) * (r * 0.2);
    ctx.fillStyle = tpl.eyeColor;
    ctx.fillRect(mx - r * 0.42 + ex, mz - r * 0.3 + bounce, r * 0.26, r * 0.26);
    ctx.fillRect(mx + r * 0.16 + ex, mz - r * 0.3 + bounce, r * 0.26, r * 0.26);

    ctx.restore();

    // Detection (!) or Stun (*)
    if (m.aiState === 'detect') {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', mx, mz - r - 18);
    } else if (m.aiState === 'stunned') {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('*', mx, mz - r - 18);
    }

    // HP Bar
    const bw = m.isBoss ? tileSize * 1.3 : tileSize * 0.8;
    const hpRatio = Math.max(0, m.hp / m.maxHp);
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.fillRect(mx - bw / 2, mz - r - 12, bw, 6);
    ctx.fillStyle = m.isBoss ? '#facc15' : m.isElite ? '#f97316' : '#ef4444';
    ctx.fillRect(mx - bw / 2, mz - r - 12, bw * hpRatio, 6);
  }

  // Projectiles
  for (const proj of sim.projectiles) {
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.arc(proj.x * tileSize, proj.z * tileSize, tileSize * (proj.kind === 'player_fireball' ? 0.24 : 0.17), 0, Math.PI * 2);
    ctx.fill();
  }

  // Lightning Arcs
  for (const arc of sim.lightningArcs) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, arc.life / arc.maxLife);
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(arc.x1 * tileSize, arc.z1 * tileSize);
    const midX = ((arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 0.35) * tileSize;
    const midZ = ((arc.z1 + arc.z2) / 2 + (Math.random() - 0.5) * 0.35) * tileSize;
    ctx.lineTo(midX, midZ);
    ctx.lineTo(arc.x2 * tileSize, arc.z2 * tileSize);
    ctx.stroke();
    ctx.restore();
  }

  // Player + Dragon Wings & Fire/Energy Aura + Shield Dome
  const p = sim.player;
  const px = p.x * tileSize;
  const pz = p.z * tileSize;
  const jumpScale = 1 + p.y * 0.22;
  const charDef = CHARACTERS[characterId];
  const shirt = getCostumeById(costume.baju);
  const hair = getCostumeById(costume.rambut);
  const hat = getCostumeById(costume.topi);
  const acc = getCostumeById(costume.aksesoris);
  const weapon = WEAPONS[weaponId];

  // Fire / Energy Aura Ring beneath player
  if (acc.auraColor) {
    ctx.save();
    const auraR = tileSize * (0.45 + Math.sin(sim.elapsedTime * 6) * 0.05);
    ctx.strokeStyle = acc.auraColor;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(px, pz, auraR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px, pz + tileSize * 0.28, tileSize * 0.28, tileSize * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(px, pz - p.y * 14);
  ctx.scale(jumpScale, jumpScale);
  ctx.rotate(-p.facing + Math.PI);

  // Flapping Dragon Wings in 2D
  if (acc.style === 'wings') {
    const flap = Math.sin(p.animTime * (p.animState === 'jump' ? 14 : 7)) * 4;
    const wingSpan = acc.wingStyle === 'dragon_fire' || acc.wingStyle === 'dragon_energy' ? 24 : 16;
    ctx.fillStyle = acc.accentColor || acc.color;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-wingSpan, -10 + flap);
    ctx.lineTo(-wingSpan + 4, 8 + flap * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(wingSpan, -10 + flap);
    ctx.lineTo(wingSpan - 4, 8 + flap * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = p.hitTimer > 0 ? '#fca5a5' : shirt.color;
  ctx.fillRect(-13, -10, 26, 20);
  ctx.fillStyle = charDef.skinColor;
  ctx.fillRect(-10, -14, 20, 18);
  ctx.fillStyle = hat.style !== 'none' ? hat.color : hair.color;
  ctx.fillRect(-11, -15, 22, 9);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-6, -2, 3, 4);
  ctx.fillRect(3, -2, 3, 4);

  if (p.attackTimer > 0) {
    ctx.strokeStyle = weapon.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 8, tileSize * 0.55, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.restore();

  if (p.shieldTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = 'rgba(56,189,248,0.16)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(px, pz - p.y * 14, tileSize * 0.54, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Particles & Floating Texts
  for (const pt of sim.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x * tileSize - 3, pt.z * tileSize - pt.y * 10 - 3, 6, 6);
  }
  ctx.globalAlpha = 1;

  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (const ft of sim.floatingTexts) {
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x * tileSize, ft.z * tileSize - ft.y * 14);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // Foggy Forest Mystery Mist on Level 2 (radial visibility vignette)
  if (sim.levelData.isFoggy) {
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.16,
      width / 2,
      height / 2,
      Math.min(width, height) * 0.55
    );
    grad.addColorStop(0, 'rgba(15, 35, 25, 0)');
    grad.addColorStop(1, 'rgba(10, 28, 20, 0.78)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}
