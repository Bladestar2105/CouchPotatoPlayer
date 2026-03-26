# CouchPotatoPlayer: Kotlin Multiplatform IPTV Player

[![Build Apps](https://github.com/Bladestar2105/CouchPotatoPlayer/actions/workflows/build-apps.yml/badge.svg)](https://github.com/Bladestar2105/CouchPotatoPlayer/actions/workflows/build-apps.yml)

Welcome to **CouchPotatoPlayer**, an open-source IPTV player currently undergoing a major architecture migration from React Native to **Kotlin Multiplatform (KMP)** and **Compose Multiplatform**.

This project provides a native, high-performance video streaming experience across a variety of platforms:
*   **Android** (Mobile & Tablet)
*   **Android TV**
*   **iOS** (iPhone & iPad)
*   **tvOS** (Apple TV)
*   **Web** (via Kotlin/Wasm)

---

## 🏗 Architecture & Technologies

CouchPotatoPlayer is built using modern Kotlin multiplatform tools:
*   **UI:** Compose Multiplatform (shared UI across Android, iOS, and Web).
*   **Networking:** Ktor.
*   **Local Storage:** SQLDelight (SQLite) and Multiplatform Settings.
*   **Media Playback:** Native players via `expect/actual` Compose components (LibVLC for Android/Android TV, MobileVLCKit for iOS/tvOS).
*   **State Management:** ViewModels and StateFlow.
*   **Navigation:** Voyager.

---

## 🛠 Prerequisites

Before compiling the app, ensure your local development environment is set up:

*   **Java Development Kit (JDK):** JDK 17 is recommended.
*   **Kotlin Plugin:** Ensure your IDE has the latest Kotlin plugin installed.
*   **Android Studio (Koala or newer):** Recommended for Android and general Kotlin development.
*   **Xcode (macOS only):** Required for building the iOS and tvOS targets.
*   **CocoaPods (macOS only):** Required for iOS/tvOS native dependencies (installed via `sudo gem install cocoapods` or Homebrew).

---

## 🚀 Getting Started & Compilation

Clone the repository to get started:

```bash
git clone https://github.com/Bladestar2105/CouchPotatoPlayer.git
cd CouchPotatoPlayer
```

The project uses Gradle wrapper, so you don't need to install Gradle manually.

### 1. Android & Android TV

To build and run on an Android emulator or a physical device:

1.  Open an Android Emulator (Mobile or TV) via Android Studio Device Manager.
2.  Run the helper script or use Gradle directly:

```bash
# Using the helper script:
./scripts/run_android.sh

# Or using Gradle directly:
./gradlew :composeApp:installDebug
adb shell am start -n com.couchpotatoplayer.composeapp/com.couchpotatoplayer.composeapp.MainActivity
```

Alternatively, simply open the project in **Android Studio** and click the **Run** button (Play icon) with `composeApp` selected.

### 2. iOS & Apple TV (tvOS)

*(macOS required)*

To build and test on Apple devices:

1.  Ensure you have an iOS/tvOS simulator running or a physical device connected and provisioned in Xcode.
2.  The KMP plugin uses CocoaPods for native dependencies (`MobileVLCKit`).
3.  First, run the Gradle task to build the framework:

```bash
# Build the framework for simulator (or use iosArm64 for physical device)
./gradlew :composeApp:iosSimulatorArm64Binaries
```

To run the full application:
1. Navigate to the generated Xcode project (typically `composeApp/iosApp/iosApp.xcworkspace`).
2. Open it in Xcode.
3. Select your target (iOS Simulator or Apple TV Simulator).
4. Click **Run** (`Cmd + R`).

### 3. Web (Kotlin/Wasm)

To launch the web version in a local development server with hot-reloading:

```bash
# Using the helper script:
./scripts/run_web.sh

# Or using Gradle directly:
./gradlew :composeApp:wasmJsBrowserDevelopmentRun --continuous
```
The server will start, and a browser window should automatically open (typically `http://localhost:8080`).

To build an optimized production bundle:
```bash
./gradlew :composeApp:wasmJsBrowserDistribution
```
The output will be in `composeApp/build/dist/wasmJs/productionExecutable/`.

---

## 🚧 Migration Status

This repository recently migrated from a React Native implementation to this new KMP structure. You can view the ongoing tasks in `MIGRATION_TODO.md`.

## 🤝 How to Contribute

1.  **Fork** this repository.
2.  Create a new branch (`git checkout -b feature/my-new-feature`).
3.  Make your changes.
4.  **Submit a Pull Request** with a clear description of what you've done.

## 📄 License

This project is licensed under the MIT License.
