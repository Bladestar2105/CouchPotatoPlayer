# CouchPotatoPlayer: A React Native IPTV Player

[![Build Apps](https://github.com/xjapan007/XJ_Player/actions/workflows/build-apps.yml/badge.svg)](https://github.com/xjapan007/XJ_Player/actions/workflows/build-apps.yml)

![Project Header Image](./assets/images/header.jpg)

This is an open-source IPTV player for iOS, tvOS, Android, Android TV, and Web built with React Native and Expo.

---

## 🏗 Architecture & Limitations

**IMPORTANT: EXPO GO IS NOT SUPPORTED**

This project relies on native video player libraries (e.g., `react-native-vlc-media-player`, `react-native-video`) to handle complex streaming protocols (like Xtream codes) and codecs that the standard Expo `av` package struggles with.

Because of these native code dependencies, **you cannot run this project using the standard Expo Go app.**

You must build a **Custom Development Client** (Prebuild) for your target device or simulator.

---

## 🛠 Prerequisites

Before compiling the app for any platform, ensure your local development environment is set up:

*   **Node.js**: LTS version (18+ recommended).
*   **Expo CLI**: Installed via `npm install -g expo-cli`.
*   **Git**: For version control.

### iOS / Apple TV (tvOS) Specific Prerequisites (macOS Only)
*   **Xcode**: Installed via the Mac App Store.
*   **CocoaPods**: Installed via `sudo gem install cocoapods` or Homebrew.
*   **Watchman**: Installed via `brew install watchman`.

### Android / Android TV Specific Prerequisites
*   **Android Studio**: Installed with the Android SDK and SDK Command-line Tools.
*   **Java Development Kit (JDK)**: JDK 17 is recommended.
*   **Android Emulators**: Create a standard mobile emulator and an Android TV emulator in the Android Studio Device Manager.

---

## 🚀 Getting Started & Compilation

We have provided convenient npm scripts to quickly build and launch the app on your preferred simulator.

### 1. First-Time Setup

Clone the repository and install the dependencies:

```bash
git clone https://github.com/xjapan007/XJ_Player.git
cd XJ_Player
npm install
```

### 2. Building for Simulators (Local Compilation)

These commands will use Expo Prebuild to generate the native `/ios` and `/android` directories, compile the native code locally, and launch the custom dev client on your simulator.

**iOS Simulator (Mobile/Tablet)**
```bash
npm run build:ios-sim
# Alternatively: npx expo run:ios
```

**Android Emulator (Mobile/Tablet)**
```bash
# Ensure your Android emulator is running in Android Studio first
npm run build:android-sim
# Alternatively: npx expo run:android
```

**Apple TV (tvOS) Simulator**
```bash
npm run build:tvos-sim
# Note: For full, native tvOS support, React Native projects often require the `react-native-tvos` fork. Ensure your environment is configured for tvOS targets in Xcode if compilation fails.
```

**Android TV Emulator**
```bash
# Ensure your Android TV emulator is running in Android Studio first
npm run build:android-tv-sim
```

**Web (Development & Production)**
To start the development server for the web:
```bash
npm run build:web
# Alternatively: npx expo start --web
```
To export a production-ready static web bundle:
```bash
npx expo export -p web
```

### 3. Building with EAS (Expo Application Services)

If you do not have Xcode or Android Studio installed locally, you can use Expo's cloud build servers to generate a dev client.

1.  Log in to Expo: `npx expo login`
2.  Build for iOS Simulator: `eas build --profile development --platform ios --type simulator`
3.  Build for Android Emulator: `eas build --profile development --platform android`
4.  Once EAS finishes, download the generated `.tar.gz` (iOS) or `.apk` (Android) and drag-and-drop it onto your running simulator. Start the local server with `npx expo start --dev-client`.

---

## 🐳 Docker Deployment (Web)

We provide an easy way to deploy the web version of the CouchPotatoPlayer using Docker and Docker Compose. This is especially useful for managing deployments via Portainer.

### Using Docker Compose

1.  Clone this repository or copy the `docker-compose.yml` file to your server.
2.  *Note: Depending on where your GitHub repository is hosted, you may need to update the `image` field in `docker-compose.yml` to point to your specific GHCR namespace (e.g., `ghcr.io/yourusername/couchpotatoplayer-web:latest`).*
3.  Run the following command in the directory containing `docker-compose.yml`:

```bash
docker-compose up -d
```

### Using Portainer

1.  Open your Portainer dashboard.
2.  Go to **Stacks** and click **Add stack**.
3.  Name the stack (e.g., `couchpotatoplayer`).
4.  Copy and paste the contents of `docker-compose.yml` into the Web editor.
5.  Click **Deploy the stack**.

The application will be accessible on port `8080` (e.g., `http://localhost:8080`).

---

## 🚀 Feature Roadmap / To-Do List

We are actively developing this player. Help on any of these items is welcome!

### Core API & Parsers
* `[ ]` **Implement Xtream Codes API:**
    * Add "Xtream Codes" as a profile type in the `PlaylistManager`.
    * Create a service (`xtreamService.ts`) to handle the login (Server, User, Pass).
    * Fetch and parse categories (Live, VOD, Series) from the Xtream API.
    * Fetch and parse the stream lists for each category.
* `[ ]` **Implement Stalker Portal API:**
    * Add "Stalker (MAC)" as a profile type.
    * Create a service (`stalkerService.ts`) to handle portal login (Portal URL, MAC Address).
    * Parse the Stalker JSON-RPC responses for channels.
* `[ ]` **Implement EPG Parser:**
    * Fetch the `epg_url` provided by the M3U or Xtream API.
    * Parse the `XMLTV` data using `fast-xml-parser` (already in package.json).
    * Store and display EPG data (current/next program) for channels.
* `[ ]` **Video Player Consolidation:**
    * Standardize the video playback architecture. Evaluate `expo-video`, `react-native-video`, and `react-native-vlc-media-player` to determine the single best dependency for broad codec and streaming protocol support.

### UI / UX
* `[ ]` **Implement Tabbed Navigation:** On the `HomeScreen`, replace the single `ChannelList` with a Tab Navigator to show:
    * "Live TV" (`ChannelList`)
    * "Movies" (`MovieList`)
    * "Series" (`SeriesList`)
* `[ ]` **Create `MovieList` / `SeriesList`:** Create new components to display the lists of movies and series from the context.
* `[ ]` **Profile Editing:** Add an "Edit" button next to "Delete" in the `PlaylistManager`.

---

## 🤝 How to Contribute

1.  **Fork** this repository.
2.  Create a new branch (`git checkout -b feature/my-new-feature`).
3.  Make your changes.
4.  **Submit a Pull Request** with a clear description of what you've done.

---

## 📄 License

This project is licensed under the MIT License.
