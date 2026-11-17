import React, { useRef, useState } from 'react';
import { ArrowUp, Flame, Hand, Snowflake, Swords, Zap } from 'lucide-react';
import { MAGIC_SPELLS } from '../game/catalog';
import { MagicSpellId } from '../game/types';

interface TouchControlsProps {
  mp: number;
  cooldowns: Record<MagicSpellId, number>;
  onMove: (x: number, z: number) => void;
  onJump: () => void;
  onAttack: () => void;
  onInteract: () => void;
  onCastSpell: (spell: MagicSpellId) => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  mp,
  cooldowns,
  onMove,
  onJump,
  onAttack,
  onInteract,
  onCastSpell,
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const maxRadius = 42;

  const updateStick = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const ang = Math.atan2(dy, dx);
    const kx = Math.cos(ang) * clamped;
    const ky = Math.sin(ang) * clamped;
    setKnob({ x: kx, y: ky });
    onMove(kx / maxRadius, ky / maxRadius);
  };

  const resetStick = () => {
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const spells: { id: MagicSpellId; keyLabel: string; icon: React.ReactNode; activeCls: string }[] = [
    {
      id: 'fireball',
      keyLabel: '1',
      icon: <Flame className="h-4 w-4 text-orange-300" />,
      activeCls: 'border-orange-400/75 bg-orange-950/85 hover:bg-orange-900',
    },
    {
      id: 'lightning',
      keyLabel: '2',
      icon: <Zap className="h-4 w-4 text-sky-300" />,
      activeCls: 'border-sky-400/75 bg-sky-950/85 hover:bg-sky-900',
    },
    {
      id: 'ice',
      keyLabel: '3',
      icon: <Snowflake className="h-4 w-4 text-cyan-200" />,
      activeCls: 'border-cyan-300/75 bg-cyan-950/85 hover:bg-cyan-900',
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 pb-5 sm:px-7 sm:pb-7">
      {/* Left Virtual Analog Joystick */}
      <div
        ref={baseRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          pointerIdRef.current = e.pointerId;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (pointerIdRef.current === e.pointerId) {
            updateStick(e.clientX, e.clientY);
          }
        }}
        onPointerUp={(e) => {
          if (pointerIdRef.current === e.pointerId) {
            resetStick();
          }
        }}
        onPointerCancel={resetStick}
        aria-label="Joystick Gerak"
        className="pointer-events-auto touch-none-canvas relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/25 bg-slate-900/55 shadow-lg sm:h-32 sm:w-32"
      >
        <div className="h-12 w-12 rounded-full border border-white/15 bg-white/10" />
        <div
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          className="absolute h-12 w-12 rounded-full border-2 border-amber-300 bg-amber-400/90 shadow-md"
        />
      </div>

      {/* Right Ergonomic Android Magic & Action Cluster */}
      <div className="pointer-events-auto flex items-end gap-2.5 sm:gap-3.5">
        {/* Magic Spells Arc */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {spells.map((s) => {
              const def = MAGIC_SPELLS[s.id];
              const cd = cooldowns[s.id];
              const ready = cd <= 0 && mp >= def.mpCost;
              return (
                <button
                  key={s.id}
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onCastSpell(s.id);
                  }}
                  aria-label={def.name}
                  className={`touch-none-canvas relative flex h-12 w-12 flex-col items-center justify-center rounded-xl border text-white shadow-lg transition-transform active:scale-95 sm:h-13 sm:w-13 ${
                    ready
                      ? s.activeCls
                      : 'border-white/15 bg-slate-900/75 opacity-60'
                  }`}
                >
                  {s.icon}
                  <span className="mt-0.5 text-[9px] font-bold tracking-tight whitespace-nowrap">
                    {cd > 0 ? `${cd.toFixed(1)}s` : def.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onInteract();
            }}
            aria-label="Interaksi"
            className="touch-none-canvas flex h-12 w-12 flex-col items-center justify-center rounded-xl border-2 border-sky-300/60 bg-sky-600/85 text-white shadow-lg active:scale-95 sm:h-14 sm:w-14"
          >
            <Hand className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-[9px] font-bold">E</span>
          </button>
        </div>

        {/* Jump & Primary Attack */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onJump();
            }}
            aria-label="Lompat"
            className="touch-none-canvas flex h-13 w-13 flex-col items-center justify-center rounded-2xl border-2 border-emerald-300/60 bg-emerald-600/85 text-white shadow-lg active:scale-95 sm:h-15 sm:w-15"
          >
            <ArrowUp className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-bold">LOMPAT</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAttack();
            }}
            aria-label="Serang"
            className="touch-none-canvas flex h-16 w-16 flex-col items-center justify-center rounded-2xl border-2 border-amber-200/80 bg-amber-500/90 text-slate-950 shadow-xl active:scale-95 sm:h-20 sm:w-20"
          >
            <Swords className="h-6 w-6" />
            <span className="mt-0.5 text-[11px] font-extrabold">SERANG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
