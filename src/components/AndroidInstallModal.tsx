import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Package,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { downloadGodotProjectZip } from '../game/godotProjectExporter';
import { usePWAInstall } from '../hooks/usePWAInstall';

const SHARED_PLAYABLE_URL =
  'https://ais-pre-tnafvdkkdlarn5wo2kcxuy-1890515365.asia-east1.run.app';

interface AndroidInstallModalProps {
  open: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ open, onClose }) => {
  const { canPromptInstall, isInstalled, isStandalone, isIOS, triggerInstall } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadedZip, setDownloadedZip] = useState(false);

  if (!open) return null;

  const gameUrl = SHARED_PLAYABLE_URL;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2200);
    } catch {
      setCopiedUrl(false);
    }
  };

  const handleDownloadGodotZip = async () => {
    await downloadGodotProjectZip();
    setDownloadedZip(true);
    window.setTimeout(() => setDownloadedZip(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-install-title"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/15 bg-slate-900 p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-300">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h2 id="android-install-title" className="font-display text-xl font-bold text-white">
                Pasang di Android &amp; Export APK
              </h2>
              <p className="text-xs text-slate-400">
                Mainkan layar penuh offline di HP atau buat file .APK sendiri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela pasang Android"
            className="rounded-xl border border-white/15 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Option 1: Direct Android Offline App (PWA) */}
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-emerald-300">
                1. Pasang Langsung di Android (Offline App)
              </h3>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-200/80">
                <WifiOff className="h-3.5 w-3.5" /> Bisa Offline
              </span>
            </div>

            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Aplikasi ini sudah mendukung mode Android Offline (PWA). Setelah dipasang ke layar utama,
              game berjalan layar penuh tanpa browser bar dan tetap bisa dimainkan tanpa internet.
            </p>

            {isStandalone || isInstalled ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3.5 py-2.5 text-xs font-bold text-emerald-200">
                <Check className="h-4 w-4 shrink-0" />
                <span>Game sudah terpasang sebagai aplikasi di perangkat ini.</span>
              </div>
            ) : canPromptInstall ? (
              <button
                type="button"
                onClick={() => triggerInstall()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-display text-sm font-bold text-slate-950 hover:bg-emerald-300 whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                <span>Pasang ke Layar Utama Android</span>
              </button>
            ) : (
              <div className="mt-3 space-y-2.5 rounded-xl bg-slate-950/70 p-3 text-xs text-slate-300">
                {isIOS ? (
                  <p>
                    Di <strong>Safari iPhone/iPad</strong>: ketuk tombol <strong>Bagikan (Share)</strong> lalu pilih{' '}
                    <strong>Tambah ke Layar Utama</strong>.
                  </p>
                ) : (
                  <ol className="list-inside list-decimal space-y-1">
                    <li>
                      Buka link game di bawah menggunakan <strong>Google Chrome di HP Android</strong> (bukan di dalam pratinjau editor).
                    </li>
                    <li>
                      Ketuk menu titik tiga <strong>(⋮)</strong> di pojok kanan atas Chrome.
                    </li>
                    <li>
                      Pilih <strong>Tambahkan ke layar utama</strong> atau <strong>Instal aplikasi</strong>.
                    </li>
                  </ol>
                )}

                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <div className="flex-1 truncate rounded-lg border border-white/10 bg-slate-900 px-3 py-2 font-mono text-[11px] text-sky-300">
                    {gameUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 whitespace-nowrap"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedUrl ? 'Link Disalin' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Building a real .APK file */}
          <div className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-300" />
              <h3 className="font-display text-base font-bold text-amber-300">
                2. Cara Membuat File .APK Asli
              </h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Server pratinjau ini tidak memiliki Android SDK / Godot compiler untuk mengompilasi biner{' '}
              <code className="text-amber-200">.apk</code> secara langsung. Anda dapat membuat file{' '}
              <code className="text-amber-200">.apk</code> resmi melalui salah satu dari dua cara berikut:
            </p>

            <div className="mt-3 space-y-2.5 text-xs text-slate-300">
              <div className="rounded-xl border border-white/10 bg-slate-950/65 p-3">
                <div className="flex items-center justify-between gap-2 font-bold text-white">
                  <span>Opsi A: Paket .APK Instan via PWABuilder</span>
                  <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <p className="mt-1 text-slate-400">
                  Tempel link game di atas ke situs <strong>pwabuilder.com</strong> → pilih <strong>Package for Stores → Android</strong> untuk mengunduh file <code className="text-sky-300">.apk</code> siap pasang dari versi web ini.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-950/65 p-3">
                <div className="font-bold text-white">
                  Opsi B: Export .APK dari Proyek Godot 4.x (GDScript)
                </div>
                <p className="mt-1 text-slate-400">
                  Unduh paket kode sumber Godot 4.x, buka di Godot Editor pada komputer, lalu jalankan{' '}
                  <strong>Project → Export → Android → Export Project (.apk)</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadGodotZip}
                  className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 font-display text-xs font-bold text-slate-950 hover:bg-amber-300 whitespace-nowrap"
                >
                  {downloadedZip ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  <span>
                    {downloadedZip
                      ? 'ZIP Proyek Godot Berhasil Diunduh'
                      : 'Unduh ZIP Proyek Godot 4.x (.zip)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
