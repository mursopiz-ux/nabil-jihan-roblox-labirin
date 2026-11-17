import JSZip from 'jszip';

const SETTINGS_GRADLE = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "NabilJihanMazeAdventure"
include(":app")
`;

const ROOT_BUILD_GRADLE = `plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
`;

const GRADLE_PROPERTIES = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`;

const APP_BUILD_GRADLE = `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.nabiljihan.mazeadventure"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.nabiljihan.mazeadventure"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
}
`;

const ANDROID_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.MazeAdventure">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:exported="true"
            android:screenOrientation="sensorLandscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;

const MAIN_ACTIVITY_KT = `package com.nabiljihan.mazeadventure

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

        webView = WebView(this)
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
        }

        // Serves bundled offline files from app/src/main/assets/www/
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }
}
`;

const STRINGS_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Nabil &amp; Jihan: Maze</string>
</resources>
`;

const THEMES_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.MazeAdventure" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">#020617</item>
        <item name="android:windowFullscreen">true</item>
    </style>
</resources>
`;

const PROGUARD_RULES = `-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
`;

const GITHUB_ACTIONS_YML = `name: Build & Publish Android APK

on:
  workflow_dispatch:
  push:
    branches: [ main, master ]

permissions:
  contents: write

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - uses: android-actions/setup-android@v3
      - uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: 8.10.2
      - name: Build Debug APK
        run: |
          gradle assembleDebug
          cp app/build/outputs/apk/debug/app-debug.apk NabilKayanaJihan-MazeAdventure.apk
      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: NabilKayanaJihan-MazeAdventure-APK
          path: NabilKayanaJihan-MazeAdventure.apk
      - name: Publish Direct .APK to GitHub Releases
        uses: softprops/action-gh-release@v2
        with:
          tag_name: apk-latest
          name: "Nabil Kayana & Jihan: Maze Adventure (Android APK)"
          body: "Unduh file NabilKayanaJihan-MazeAdventure.apk langsung di Assets (tidak perlu ekstrak ZIP)."
          files: NabilKayanaJihan-MazeAdventure.apk
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;

const PLACEHOLDER_WWW_HTML = `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nabil Kayana &amp; Jihan: Maze Adventure</title>
</head>
<body style="background:#020617;color:#f8fafc;font-family:sans-serif;padding:24px;text-align:center;">
  <h1>Siapkan Bundle Offline</h1>
  <p>Salin seluruh isi folder <code>dist/</code> dari hasil <code>npm run build</code> ke folder <code>app/src/main/assets/www/</code> sebelum membuild APK.</p>
</body>
</html>
`;

const README_BUILD_APK = `# Nabil Kayana & Jihan: Maze Adventure — Proyek Android Studio (.APK)

Proyek Android Kotlin offline (` + '`WebViewAssetLoader`' + `) untuk membungkus game menjadi file \`.apk\` Android yang dapat dimainkan tanpa internet dan tanpa login.

## Langkah Build File .APK

### Cara 1 — Build & Download .APK Langsung via GitHub Releases (Otomatis)
1. Upload folder ini (atau seluruh repository game ini yang sudah memiliki \`.github/workflows/build-android-apk.yml\`) ke GitHub.
2. Buka tab **Actions → Build & Publish Android APK → Run workflow**.
3. Setelah selesai, buka menu **Releases** di repository GitHub Anda → unduh file **NabilKayanaJihan-MazeAdventure.apk** langsung tanpa ekstrak ZIP!
4. Jika mengunduh dari **Actions Artifacts** (yang berformat \`.zip\`), Anda dapat langsung mengekstrak file \`.apk\`-nya lewat menu **Download .APK → Ekstrak .APK dari .ZIP GitHub** di dalam game ini.

### Cara 2 — Melalui Android Studio (Windows / Mac / Linux)
1. Di folder proyek web utama, jalankan \`npm run build\`.
2. Salin **seluruh isi folder \`dist/\`** ke dalam \`app/src/main/assets/www/\` pada proyek ini (ganti \`index.html\` placeholder).
3. Buka folder proyek Android ini di **Android Studio**, lalu klik **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. File APK berada di \`app/build/outputs/apk/debug/app-debug.apk\`.
`;

export async function extractApkFromZipFile(file: File): Promise<{ fileName: string; count: number }> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const apkEntries = Object.values(zip.files).filter(
    (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.apk')
  );

  if (apkEntries.length === 0) {
    throw new Error('Tidak ditemukan berkas .apk di dalam file ZIP tersebut.');
  }

  const chosen =
    apkEntries.find((entry) => entry.name.toLowerCase().includes('signed')) ||
    apkEntries.find((entry) => entry.name.toLowerCase().includes('release')) ||
    apkEntries[0];

  const apkData = await chosen.async('arraybuffer');
  const apkBlob = new Blob([apkData], {
    type: 'application/vnd.android.package-archive',
  });
  const baseName = chosen.name.split('/').pop() || 'NabilKayanaJihan-MazeAdventure.apk';
  const outName = baseName.endsWith('.apk') ? baseName : `${baseName}.apk`;

  const url = URL.createObjectURL(apkBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = outName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { fileName: outName, count: apkEntries.length };
}

export async function downloadAndroidStudioProjectZip(): Promise<void> {
  const zip = new JSZip();

  zip.file('settings.gradle.kts', SETTINGS_GRADLE);
  zip.file('build.gradle.kts', ROOT_BUILD_GRADLE);
  zip.file('gradle.properties', GRADLE_PROPERTIES);
  zip.file('README_BUILD_APK.md', README_BUILD_APK);
  zip.file('.github/workflows/build-android-apk.yml', GITHUB_ACTIONS_YML);

  zip.file('app/build.gradle.kts', APP_BUILD_GRADLE);
  zip.file('app/proguard-rules.pro', PROGUARD_RULES);
  zip.file('app/src/main/AndroidManifest.xml', ANDROID_MANIFEST);
  zip.file(
    'app/src/main/java/com/nabiljihan/mazeadventure/MainActivity.kt',
    MAIN_ACTIVITY_KT
  );
  zip.file('app/src/main/res/values/strings.xml', STRINGS_XML);
  zip.file('app/src/main/res/values/themes.xml', THEMES_XML);
  zip.file('app/src/main/assets/www/index.html', PLACEHOLDER_WWW_HTML);

  try {
    const [icon192, icon512] = await Promise.all([
      fetch('/pwa-192x192.png'),
      fetch('/pwa-512x512.png'),
    ]);
    if (icon192.ok) {
      zip.file('app/src/main/res/mipmap-xxhdpi/ic_launcher.png', await icon192.arrayBuffer());
    }
    if (icon512.ok) {
      zip.file('app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', await icon512.arrayBuffer());
    }
  } catch {
    // Non-fatal if offline without cached icon fetch
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nabil_jihan_maze_android_apk_project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
