# CouchPotatoPlayer

CouchPotatoPlayer is a modern, cross-platform media player application built with React Native (specifically `react-native-tvos` fork). It is strictly designed for use with IPTV-Manager backends.

This guide provides instructions on how to set up your local development environment, build the application for Android, iOS, and tvOS devices, and use emulators/simulators.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js** (v22 recommended)
- **pnpm** (The project strictly uses `pnpm` for dependency management. *Do not use npm or yarn.*)
- **Watchman** (macOS only, recommended for React Native)
- **Java Development Kit (JDK)** (version 17, required for Android)
- **Android Studio** (for Android development and emulators)
- **Xcode** (macOS only, for iOS/tvOS development and simulators)
- **CocoaPods** (macOS only, required for iOS/tvOS native dependencies)

For a comprehensive guide on setting up your environment for React Native development, refer to the official [React Native Environment Setup documentation](https://reactnative.dev/docs/environment-setup). Note: Make sure to select the `React Native CLI` tab, not `Expo Go`.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/CouchPotatoPlayer.git
    cd CouchPotatoPlayer
    ```

2.  **Install dependencies:**
    Use `pnpm` to install the JavaScript dependencies:
    ```bash
    pnpm install
    ```

3.  **Install native iOS/tvOS dependencies (macOS only):**
    ```bash
    cd ios
    bundle install
    bundle exec pod install
    cd ..
    ```

---

## Running on Emulators and Simulators

During development, you will typically run the app on an Android Emulator or iOS/tvOS Simulator.

### 1. Start the Metro Bundler

In a terminal window at the root of the project, start the React Native Metro bundler:

```bash
pnpm start
```

Leave this terminal window running.

### 2. Run on Android Emulator

1.  Open **Android Studio**.
2.  Open the Virtual Device Manager (AVD Manager) and start an Android emulator.
3.  In a new terminal window at the project root, run:
    ```bash
    pnpm run android
    ```
    This command will build the app and install it on the running emulator.

### 3. Run on iOS Simulator (macOS only)

1.  In a new terminal window at the project root, run:
    ```bash
    pnpm run ios
    ```
    This command will automatically launch an iPhone simulator, build the app, and install it.

    *To specify a simulator, you can use the `--simulator` flag (e.g., `pnpm run ios --simulator="iPhone 15 Pro"`).*

### 4. Run on tvOS Simulator (macOS only)

1.  In a new terminal window at the project root, run:
    ```bash
    pnpm run tvos
    ```
    This will launch an Apple TV simulator and install the app.

---

## Building for Physical Devices (Release Builds)

To run the app on your physical device without being connected to the Metro bundler, or to distribute the app, you need to create release builds.

### Android Release Build (APK)

1.  Open a terminal at the project root and navigate to the `android` directory:
    ```bash
    cd android
    ```
2.  Run the Gradle task to build a release APK:
    ```bash
    ./gradlew assembleRelease
    ```
3.  The generated `.apk` file will be located at:
    `android/app/build/outputs/apk/release/app-release.apk`
    You can transfer this file to your Android device to install it.

### iOS/tvOS Release Build

Building for iOS/tvOS physical devices requires an Apple Developer account to sign the application. The easiest way to build for a device is using Xcode.

1.  Open Xcode.
2.  Select **File > Open...** and choose the `ios/CouchPotatoPlayer.xcworkspace` file (not the `.xcodeproj` file).
3.  Connect your physical iPhone or Apple TV to your Mac.
4.  In the Xcode toolbar, select your physical device as the target destination.
5.  In the Project Navigator, select the `CouchPotatoPlayer` project, go to the **Signing & Capabilities** tab, and configure your Apple Developer Team for signing.
6.  Select **Product > Build** (or `Cmd + B`) to build the app, or **Product > Run** (`Cmd + R`) to build and install it directly onto your connected device.
7.  To create an archive for distribution (TestFlight or App Store), select **Product > Archive**.

---

## Automated Builds via GitHub Actions

This repository is configured with a GitHub Actions workflow (`.github/workflows/build-apps.yml`) that automatically builds the application when changes are pushed to the `main` or `master` branches.

These automated builds generate artifacts that you can download directly from the GitHub repository:

1.  Navigate to the **Actions** tab on the repository's GitHub page.
2.  Click on the most recent successful run of the **Build Apps** workflow.
3.  Scroll down to the **Artifacts** section.
4.  You can download the following compiled packages:
    -   **`app-release.apk`**: The Android application package (ready to be installed on Android devices).
    -   **`ios-build.tar.gz`**: An archive of the compiled iOS app bundle.
    -   **`tvos-build.tar.gz`**: An archive of the compiled tvOS app bundle.

*Note: iOS and tvOS application bundles downloaded from GitHub Actions are **not signed** with a developer certificate. They are primarily intended for automated testing or distribution methods that re-sign the app (e.g., enterprise distribution).*

## Web Build

The application can also be run locally as a web app.

1.  Ensure you have run `pnpm install`
2.  Start the development web server:
    ```bash
    pnpm run web
    ```
    The application will be accessible at `http://localhost:8080/`.

## Important Notes

*   **pnpm**: Always use `pnpm` instead of `npm` or `yarn` for managing dependencies. Using other package managers may lead to inconsistent lockfiles and build issues.
*   **IPTV-Manager**: This application checks for compatibility with an IPTV-Manager backend (`/player_api.php?action=cpp` or `/cpp` endpoints) upon account creation.
