# Simulator Setup Guide (Apple + Android, TV + Mobile)

This guide explains how to set up and use simulators/emulators for CouchPotatoPlayer.

> CouchPotatoPlayer uses native modules, so **Expo Go is not supported**.  
> Use the scripts in this repo to build and run native dev clients.

---

## 1) Apple Simulators (iOS + tvOS)

### Prerequisites (macOS)
- Xcode (latest stable recommended)
- Xcode Command Line Tools
- CocoaPods
- Watchman (recommended)

### Create iOS and Apple TV simulators
1. Open **Xcode**.
2. Go to **Window → Devices and Simulators**.
3. Open the **Simulators** tab.
4. Click **+** and create:
   - at least one iOS simulator (e.g. iPhone 16)
   - at least one tvOS simulator (e.g. Apple TV 4K)

### Run iOS simulator build
From repository root:

```bash
pnpm run build:ios-sim
```

### Run tvOS simulator build
From repository root:

```bash
pnpm run build:tvos-sim
```

What this does:
- temporarily switches to `react-native-tvos`
- sets tvOS prebuild flags (`EXPO_TV=1`)
- builds and launches against a detected Apple TV simulator
- reverts to standard `react-native` after the script exits

### Useful troubleshooting (Apple)
- If no Apple TV simulator is found, create one manually in Xcode first.
- If Xcode toolchain paths are broken:
  ```bash
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  ```
- If Pods are out-of-date inside `ios/` after local changes:
  ```bash
  cd ios && pod install && cd ..
  ```

---

## 2) Android Emulators (Android + Android TV)

### Prerequisites
- Android Studio
- Android SDK + Platform Tools
- JDK 17

### Create Android emulators
1. Open **Android Studio**.
2. Open **Device Manager**.
3. Create:
   - one standard Android virtual device (phone/tablet)
   - one Android TV virtual device
4. Start the emulator before running build scripts.

### Run Android mobile emulator build

```bash
pnpm run build:android-sim
```

### Run Android TV emulator build

```bash
pnpm run build:android-tv-sim
```

### Useful troubleshooting (Android)
- Verify ADB sees your emulator:
  ```bash
  adb devices
  ```
- If no device appears, restart ADB:
  ```bash
  adb kill-server && adb start-server
  ```
- If Gradle cache issues appear, clean and rebuild:
  ```bash
  cd android && ./gradlew clean && cd ..
  ```

---

## 3) Recommended Daily Workflow

1. Start the desired simulator/emulator first.
2. Run one of the repo build scripts:
   - `build:ios-sim`, `build:tvos-sim`, `build:android-sim`, or `build:android-tv-sim`
3. Keep Metro running if you are in dev-client mode.
4. Re-run the same script after major native dependency changes.

---

## 4) Physical TV Devices (optional)

- Apple TV hardware: use `pnpm run build:tvos-device` and complete pairing/signing in Xcode.
- Android TV hardware: use `pnpm run build:android-tv-sim` alternatives with connected device + standard Android deployment flow (`adb` visible).

