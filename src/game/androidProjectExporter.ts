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

const GITHUB_ACTIONS_YML = `name: Build Android APK

on:
  workflow_dispatch:
  push:
    branches: [ main, master ]

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: 8.10.2
      - name: Build Debug APK
        run: gradle assembleDebug
      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: nabil-jihan-maze-adventure-apk
          path: app/build/outputs/apk/debug/app-debug.apk
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

### Cara 1 — Melalui Android Studio (Windows / Mac / Linux)
1. Di folder proyek web utama, jalankan \`npm run build\`.
2. Salin **seluruh isi folder \`dist/\`** ke dalam \`app/src/main/assets/www/\` pada proyek ini (ganti \`index.html\` placeholder).
3. Buka folder proyek Android ini di **Android Studio**.
4. Tunggu sinkronisasi Gradle selesai.
5. Klik menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
6. File APK siap pasang berada di:
   \`app/build/outputs/apk/debug/app-debug.apk\`.

### Cara 2 — Build Otomatis Tanpa Install Android Studio (GitHub Actions)
1. Upload folder ini (termasuk isi \`dist/\` di \`app/src/main/assets/www/\`) ke repository GitHub.
2. Buka tab **Actions → Build Android APK → Run workflow**.
3. Unduh artifact **nabil-jihan-maze-adventure-apk** berisi \`app-debug.apk\`.
`;

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
