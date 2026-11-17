import { WorldId } from './types';

type MusicTrack = 'menu' | `world_${WorldId}`;

class OfflineAudioEngine {
  private ctx: AudioContext | null = null;
  private musicTimer: number | null = null;
  private currentTrack: MusicTrack | null = null;
  private stepIndex = 0;
  private musicVolume = 0.45;
  private sfxVolume = 0.7;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureCtx();
  }

  public setVolumes(music: number, sfx: number): void {
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    slideTo?: number,
    delay = 0
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx || volume <= 0.001) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playSfx(
    kind:
      | 'coin'
      | 'door'
      | 'jump'
      | 'attack'
      | 'hit'
      | 'monster'
      | 'powerup'
      | 'checkpoint'
      | 'boss'
      | 'victory'
      | 'gameover'
      | 'click'
      | 'fireball'
      | 'lightning'
      | 'ice'
      | 'heal'
      | 'shield'
      | 'ko'
      | 'respawn'
  ): void {
    const v = this.sfxVolume * 0.25;
    if (v <= 0.001) return;

    switch (kind) {
      case 'click':
        this.playTone(620, 0.06, 'triangle', v * 0.7, 780);
        break;
      case 'coin':
        this.playTone(988, 0.08, 'sine', v, 1318);
        this.playTone(1318, 0.14, 'sine', v, 1568, 0.06);
        break;
      case 'jump':
        this.playTone(260, 0.14, 'triangle', v, 580);
        break;
      case 'attack':
        this.playTone(420, 0.09, 'sawtooth', v * 0.65, 190);
        break;
      case 'hit':
        this.playTone(180, 0.14, 'square', v * 0.7, 70);
        break;
      case 'monster':
        this.playTone(240, 0.12, 'sawtooth', v * 0.5, 140);
        break;
      case 'door':
        this.playTone(330, 0.12, 'triangle', v, 440);
        this.playTone(440, 0.18, 'triangle', v, 660, 0.1);
        break;
      case 'powerup':
        this.playTone(523, 0.09, 'triangle', v);
        this.playTone(659, 0.09, 'triangle', v, undefined, 0.08);
        this.playTone(784, 0.12, 'triangle', v, undefined, 0.16);
        this.playTone(1046, 0.2, 'sine', v, undefined, 0.24);
        break;
      case 'checkpoint':
        this.playTone(587, 0.1, 'sine', v);
        this.playTone(880, 0.22, 'sine', v, undefined, 0.09);
        break;
      case 'boss':
        this.playTone(150, 0.22, 'sawtooth', v * 0.85, 85);
        this.playTone(110, 0.28, 'square', v * 0.6, 65, 0.14);
        break;
      case 'victory':
        this.playTone(523, 0.12, 'triangle', v);
        this.playTone(659, 0.12, 'triangle', v, undefined, 0.11);
        this.playTone(784, 0.12, 'triangle', v, undefined, 0.22);
        this.playTone(1046, 0.35, 'sine', v * 1.1, undefined, 0.33);
        break;
      case 'gameover':
      case 'ko':
        this.playTone(392, 0.16, 'triangle', v * 0.8, 349);
        this.playTone(349, 0.16, 'triangle', v * 0.8, 293, 0.16);
        this.playTone(261, 0.32, 'triangle', v * 0.8, 196, 0.32);
        break;
      case 'fireball':
        this.playTone(320, 0.14, 'sawtooth', v * 0.85, 110);
        this.playTone(540, 0.12, 'triangle', v * 0.6, 220, 0.05);
        break;
      case 'lightning':
        this.playTone(1250, 0.07, 'square', v * 0.65, 420);
        this.playTone(880, 0.12, 'sawtooth', v * 0.55, 240, 0.04);
        break;
      case 'ice':
        this.playTone(1080, 0.1, 'sine', v * 0.75, 1480);
        this.playTone(1480, 0.14, 'triangle', v * 0.65, 920, 0.06);
        break;
      case 'heal':
        this.playTone(587, 0.1, 'sine', v * 0.8, 880);
        this.playTone(880, 0.18, 'sine', v * 0.85, 1174, 0.08);
        break;
      case 'shield':
        this.playTone(440, 0.12, 'triangle', v * 0.8, 660);
        this.playTone(660, 0.18, 'sine', v * 0.8, 880, 0.08);
        break;
      case 'respawn':
        this.playTone(440, 0.1, 'sine', v);
        this.playTone(659, 0.12, 'sine', v, undefined, 0.09);
        this.playTone(880, 0.22, 'triangle', v, undefined, 0.18);
        break;
    }
  }

  public startMusic(track: MusicTrack): void {
    if (this.currentTrack === track && this.musicTimer !== null) return;
    this.stopMusic();
    this.currentTrack = track;
    this.stepIndex = 0;

    const patterns: Record<MusicTrack, { notes: number[]; tempoMs: number; wave: OscillatorType }> = {
      menu: {
        notes: [523, 659, 784, 659, 587, 784, 880, 784, 523, 659, 784, 1046, 880, 784, 659, 587],
        tempoMs: 260,
        wave: 'triangle',
      },
      world_1: {
        notes: [523, 587, 659, 784, 659, 587, 523, 392, 440, 523, 587, 659, 523, 392, 440, 523],
        tempoMs: 240,
        wave: 'triangle',
      },
      world_2: {
        notes: [220, 261, 293, 329, 293, 261, 220, 196, 220, 293, 349, 329, 293, 246, 220, 196],
        tempoMs: 210,
        wave: 'sawtooth',
      },
      world_3: {
        notes: [659, 784, 988, 784, 880, 988, 1174, 988, 784, 659, 587, 659, 784, 880, 784, 659],
        tempoMs: 280,
        wave: 'sine',
      },
      world_4: {
        notes: [330, 392, 494, 440, 392, 349, 330, 293, 330, 440, 494, 523, 494, 440, 392, 330],
        tempoMs: 250,
        wave: 'triangle',
      },
      world_5: {
        notes: [523, 659, 784, 1046, 988, 880, 784, 659, 587, 784, 880, 1174, 1046, 880, 784, 1046],
        tempoMs: 205,
        wave: 'triangle',
      },
    };

    const cfg = patterns[track];
    this.musicTimer = window.setInterval(() => {
      if (this.musicVolume <= 0.01) return;
      if (!this.ctx || this.ctx.state !== 'running') return;
      const note = cfg.notes[this.stepIndex % cfg.notes.length];
      this.playTone(note, cfg.tempoMs / 1000 * 0.85, cfg.wave, this.musicVolume * 0.09);
      if (this.stepIndex % 4 === 0) {
        this.playTone(note * 0.5, cfg.tempoMs / 1000 * 1.1, 'sine', this.musicVolume * 0.08);
      }
      this.stepIndex++;
    }, cfg.tempoMs);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTrack = null;
  }
}

export const audioEngine = new OfflineAudioEngine();
