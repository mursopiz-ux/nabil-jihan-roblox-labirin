import JSZip from 'jszip';

const CLOUD_APK_BASE = 'https://pwabuilder-cloudapk.azurewebsites.net';
export const DEFAULT_PUBLIC_APP_URL =
  'https://ais-pre-tnafvdkkdlarn5wo2kcxuy-1890515365.asia-east1.run.app';

export interface ApkBuildProgress {
  stage: 'checking' | 'enqueuing' | 'building' | 'extracting' | 'done' | 'error';
  message: string;
}

function normalizeOrigin(inputUrl: string): string {
  const trimmed = inputUrl.trim().replace(/\/+$/, '');
  const parsed = new URL(trimmed);
  return parsed.origin;
}

export async function buildAndDownloadAndroidApk(
  rawAppUrl: string,
  onProgress: (progress: ApkBuildProgress) => void
): Promise<void> {
  let origin: string;
  try {
    origin = normalizeOrigin(rawAppUrl);
  } catch {
    throw new Error('URL aplikasi tidak valid. Pastikan diawali https://');
  }

  onProgress({
    stage: 'checking',
    message: 'Memeriksa ketersediaan manifest & ikon publik aplikasi...',
  });

  const enqueuePayload = {
    additionalTrustedOrigins: [],
    appVersion: '1.0.0.0',
    appVersionCode: 1,
    backgroundColor: '#020617',
    display: 'standalone',
    enableSiteSettingsShortcut: false,
    enableNotifications: false,
    includeSourceCode: false,
    fallbackType: 'customtabs',
    features: {
      locationDelegation: { enabled: false },
      playBilling: { enabled: false },
    },
    host: origin,
    iconUrl: `${origin}/pwa-512x512.png`,
    maskableIconUrl: `${origin}/pwa-maskable-512x512.png`,
    launcherName: 'NKJ Maze',
    name: 'Nabil Kayana & Jihan: Maze Adventure',
    navigationColor: '#0f172a',
    navigationColorDark: '#020617',
    navigationDividerColor: '#0f172a',
    navigationDividerColorDark: '#020617',
    orientation: 'default',
    packageId: 'com.nabiljihan.mazeadventure',
    pwaUrl: `${origin}/`,
    shortcuts: [],
    signingMode: 'new',
    signing: {
      file: null,
      alias: 'nkj-maze-key',
      fullName: 'Nabil Jihan Studio',
      organization: 'NKJ Games',
      organizationalUnit: 'Mobile',
      countryCode: 'ID',
      keyPassword: 'NkJ2026!KeyPass',
      storePassword: 'NkJ2026!StorePass',
    },
    splashScreenFadeOutDuration: 300,
    startUrl: '/',
    themeColor: '#0f172a',
    themeColorDark: '#020617',
    webManifestUrl: `${origin}/manifest.webmanifest`,
  };

  onProgress({
    stage: 'enqueuing',
    message: 'Mengirim antrean build Android APK ke layanan Bubblewrap...',
  });

  const enqueueRes = await fetch(`${CLOUD_APK_BASE}/enqueuePackageJob`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'platform-identifier': 'NKJMazeAdventure',
      'platform-identifier-version': '1.0.0',
    },
    body: JSON.stringify(enqueuePayload),
  });

  if (!enqueueRes.ok) {
    throw new Error(`Layanan CloudAPK menolak permintaan (${enqueueRes.status}).`);
  }

  const { id: jobId, accessToken } = (await enqueueRes.json()) as {
    id: string;
    accessToken: string;
  };

  onProgress({
    stage: 'building',
    message: 'Mengompilasi AndroidManifest, DEX, dan menandatangani file .APK...',
  });

  const maxAttempts = 45;
  let completed = false;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(
      `${CLOUD_APK_BASE}/getPackageJob?id=${encodeURIComponent(jobId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      }
    );

    if (!pollRes.ok) {
      throw new Error(`Gagal memeriksa status build APK (${pollRes.status}).`);
    }

    const job = (await pollRes.json()) as {
      status: string;
      logs?: string[];
      errors?: string[];
    };

    if (job.status === 'Completed') {
      completed = true;
      break;
    }

    if (job.status === 'Failed') {
      const joinedErrors = (job.errors || job.logs || []).join('\n');
      if (joinedErrors.includes('404') || joinedErrors.includes('403') || joinedErrors.includes('401')) {
        throw new Error(
          `URL publik (${origin}) belum aktif atau membutuhkan login. Klik Share / Publish aplikasi ini terlebih dahulu, atau jalankan build APK via GitHub Actions.`
        );
      }
      const lastErr = (job.errors && job.errors[job.errors.length - 1]) || '';
      throw new Error(
        lastErr
          ? `Build APK gagal: ${lastErr.slice(0, 180)}`
          : 'Build APK gagal di layanan Bubblewrap CloudAPK.'
      );
    }
  }

  if (!completed) {
    throw new Error('Waktu tunggu build APK habis. Silakan coba lagi.');
  }

  onProgress({
    stage: 'extracting',
    message: 'Mengekstrak file .apk yang sudah ditandatangani...',
  });

  const zipRes = await fetch(
    `${CLOUD_APK_BASE}/downloadPackageZip?id=${encodeURIComponent(jobId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  );

  if (!zipRes.ok) {
    throw new Error(`Gagal mengunduh paket APK (${zipRes.status}).`);
  }

  const zipBlob = await zipRes.blob();
  const zip = await JSZip.loadAsync(zipBlob);
  const apkEntry = Object.values(zip.files).find(
    (file) => !file.dir && file.name.toLowerCase().endsWith('.apk')
  );

  if (!apkEntry) {
    throw new Error('Berkas .apk tidak ditemukan di dalam paket hasil build.');
  }

  const apkArrayBuffer = await apkEntry.async('arraybuffer');
  const apkBlob = new Blob([apkArrayBuffer], {
    type: 'application/vnd.android.package-archive',
  });

  const downloadUrl = URL.createObjectURL(apkBlob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = 'NabilKayanaJihan-MazeAdventure.apk';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);

  onProgress({
    stage: 'done',
    message: 'File NabilKayanaJihan-MazeAdventure.apk berhasil diunduh!',
  });
}
