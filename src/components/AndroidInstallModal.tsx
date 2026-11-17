import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  Download,
  FileArchive,
  GitBranch,
  Loader2,
  Package,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import {
  downloadAndroidStudioProjectZip,
  extractApkFromZipFile,
} from '../game/androidProjectExporter';
import {
  ApkBuildProgress,
  DEFAULT_PUBLIC_APP_URL,
  buildAndDownloadAndroidApk,
} from '../game/apkBuilder';
import { downloadGodotProjectZip } from '../game/godotProjectExporter';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  open: boolean;
  onClose: () => void;
}

function resolveInitialPublicUrl(): string {
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    if (
      origin.startsWith('https://') &&
      !hostname.includes('ais-dev-') &&
      hostname !== 'localhost'
    ) {
      return origin;
    }
  }
  return DEFAULT_PUBLIC_APP_URL;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ open, onClose }) => {
  const { canPromptInstall, isInstalled, isStandalone, isIOS, triggerInstall } = usePWAInstall();
  const [targetAppUrl, setTargetAppUrl] = useState<string>(resolveInitialPublicUrl);
  const [apkProgress, setApkProgress] = useState<ApkBuildProgress | null>(null);
  const [isBuildingApk, setIsBuildingApk] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadedAndroidZip, setDownloadedAndroidZip] = useState(false);
  const [downloadedGodotZip, setDownloadedGodotZip] = useState(false);
  const [zipExtractMsg, setZipExtractMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleBuildAndDownloadApk = async () => {
    if (isBuildingApk) return;
    setIsBuildingApk(true);
    setApkProgress({ stage: 'checking', message: 'Menyiapkan build .APK...' });
    try {
      await buildAndDownloadAndroidApk(targetAppUrl, (progress) => {
        setApkProgress(progress);
      });
    } catch (err) {
      setApkProgress({
        stage: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuat file .APK.',
      });
    } finally {
      setIsBuildingApk(false);
    }
  };

  const handleExtractApkFromZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingZip(true);
    setZipExtractMsg(null);
    try {
      const result = await extractApkFromZipFile(file);
      setZipExtractMsg({
        ok: true,
        text: `Berhasil mengekstrak & mengunduh ${result.fileName}!`,
      });
    } catch (err) {
      setZipExtractMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Gagal membaca file ZIP.',
      });
    } finally {
      setIsExtractingZip(false);
      e.target.value = '';
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetAppUrl);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2200);
    } catch {
      setCopiedUrl(false);
    }
  };

  const handleDownloadAndroidZip = async () => {
    await downloadAndroidStudioProjectZip();
    setDownloadedAndroidZip(true);
    window.setTimeout(() => setDownloadedAndroidZip(false), 2500);
  };

  const handleDownloadGodotZip = async () => {
    await downloadGodotProjectZip();
    setDownloadedGodotZip(true);
    window.setTimeout(() => setDownloadedGodotZip(false), 2500);
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
                Download &amp; Ekstrak .APK Android
              </h2>
              <p className="text-xs text-slate-400">
                Compile .APK langsung, ekstrak .APK dari ZIP GitHub, atau pasang offline PWA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela Download APK Android"
            className="rounded-xl border border-white/15 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Section 1: GitHub Releases & Extract .APK from GitHub Actions .ZIP */}
          <div className="rounded-2xl border border-violet-400/35 bg-violet-950/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-violet-300" />
                <h3 className="font-display text-base font-bold text-violet-200">
                  1. Ekstrak &amp; Download .APK dari GitHub
                </h3>
              </div>
              <span className="font-mono text-[11px] text-violet-200/80">
                .github/workflows/build-android-apk.yml
              </span>
            </div>

            <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
              <p>
                Proyek ini sudah memiliki workflow GitHub Actions yang otomatis mem-build{' '}
                <code className="text-amber-200">NabilKayanaJihan-MazeAdventure.apk</code> dan
                mengunggahnya langsung ke menu <strong>GitHub Releases</strong> (bisa diunduh langsung sebagai <code>.apk</code> tanpa ZIP).
              </p>
              <p className="text-slate-400">
                Jika Anda mengunduh artifact <code>.zip</code> dari tab <strong>GitHub Actions</strong>, pilih file ZIP tersebut di bawah untuk mengekstrak file <code>.apk</code>-nya secara instan:
              </p>
            </div>

            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={handleExtractApkFromZip}
              className="hidden"
            />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={isExtractingZip}
                onClick={() => zipInputRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 font-display text-xs font-bold text-slate-950 hover:bg-violet-300 disabled:opacity-70 whitespace-nowrap"
              >
                {isExtractingZip ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileArchive className="h-4 w-4" />
                )}
                <span>Pilih File .ZIP GitHub → Ekstrak .APK</span>
              </button>
            </div>

            {zipExtractMsg && (
              <div
                className={`mt-2.5 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                  zipExtractMsg.ok
                    ? 'border-emerald-400/40 bg-emerald-950/40 text-emerald-200'
                    : 'border-rose-400/40 bg-rose-950/40 text-rose-200'
                }`}
              >
                {zipExtractMsg.ok ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{zipExtractMsg.text}</span>
              </div>
            )}
          </div>

          {/* Section 2: Direct Signed .APK Generator & Downloader */}
          <div className="rounded-2xl border border-amber-400/35 bg-amber-950/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-300" />
                <h3 className="font-display text-base font-bold text-amber-300">
                  2. Buat &amp; Download File .APK Langsung
                </h3>
              </div>
              <span className="font-mono text-[11px] text-amber-200/80">
                CloudAPK Bubblewrap
              </span>
            </div>

            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Compile otomatis dari URL publik HTTPS aplikasi (setelah klik <strong>Share / Publish</strong>) dan langsung unduh <code className="text-amber-200">.apk</code>:
            </p>

            <div className="mt-2.5 space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={targetAppUrl}
                  onChange={(e) => setTargetAppUrl(e.target.value)}
                  disabled={isBuildingApk}
                  className="flex-1 rounded-xl border border-white/15 bg-slate-950 px-3 py-2 font-mono text-xs text-sky-300 focus:border-amber-400 focus:outline-none"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 whitespace-nowrap"
                >
                  {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedUrl ? 'Disalin' : 'Salin'}</span>
                </button>
              </div>

              <button
                type="button"
                disabled={isBuildingApk}
                onClick={handleBuildAndDownloadApk}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 font-display text-sm font-bold text-slate-950 shadow-md transition-colors hover:bg-amber-300 disabled:cursor-wait disabled:opacity-75 whitespace-nowrap"
              >
                {isBuildingApk ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sedang Membuild .APK (10–25 detik)...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download File .APK (.apk)</span>
                  </>
                )}
              </button>

              {apkProgress && (
                <div
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                    apkProgress.stage === 'error'
                      ? 'border-rose-400/40 bg-rose-950/40 text-rose-200'
                      : apkProgress.stage === 'done'
                      ? 'border-emerald-400/40 bg-emerald-950/40 text-emerald-200'
                      : 'border-sky-400/30 bg-slate-950/75 text-sky-200'
                  }`}
                >
                  {apkProgress.stage === 'error' ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  ) : apkProgress.stage === 'done' ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-sky-400" />
                  )}
                  <span className="leading-relaxed">{apkProgress.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Direct Android Offline App (PWA) & Source ZIPs */}
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-emerald-300">
                3. Pasang Offline di Android &amp; Proyek Sumber (.ZIP)
              </h3>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-200/80">
                <WifiOff className="h-3.5 w-3.5" /> Offline Penuh
              </span>
            </div>

            {isStandalone || isInstalled ? (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-200">
                <Check className="h-4 w-4 shrink-0" />
                <span>Game sudah terpasang di layar utama perangkat ini.</span>
              </div>
            ) : canPromptInstall ? (
              <button
                type="button"
                onClick={() => triggerInstall()}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 font-display text-sm font-bold text-slate-950 hover:bg-emerald-300 whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                <span>Pasang ke Layar Utama Android</span>
              </button>
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                {isIOS ? (
                  <>
                    Di <strong>Safari iPhone/iPad</strong>: ketuk <strong>Bagikan (Share)</strong> →{' '}
                    <strong>Tambah ke Layar Utama</strong>.
                  </>
                ) : (
                  <>
                    Buka game di <strong>Chrome Android</strong> → ketuk <strong>(⋮) → Tambahkan ke layar utama</strong> untuk bermain offline layar penuh.
                  </>
                )}
              </p>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleDownloadAndroidZip}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 whitespace-nowrap"
              >
                {downloadedAndroidZip ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                <span>
                  {downloadedAndroidZip ? 'Android Studio ZIP Diunduh' : 'Android Studio APK (.zip)'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadGodotZip}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/15 px-3.5 py-2.5 text-xs font-bold text-sky-200 hover:bg-sky-500/25 whitespace-nowrap"
              >
                {downloadedGodotZip ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
                <span>
                  {downloadedGodotZip ? 'Godot 4.x ZIP Diunduh' : 'Godot 4.x GDScript (.zip)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
