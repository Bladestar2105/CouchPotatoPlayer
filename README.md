# CouchPotatoPlayer

[![Build Apps](https://github.com/Bladestar2105/CouchPotatoPlayer/actions/workflows/build-apps.yml/badge.svg)](https://github.com/Bladestar2105/CouchPotatoPlayer/actions/workflows/build-apps.yml)

CouchPotatoPlayer is an open-source IPTV player built with **React Native + Expo** for:

- iOS
- tvOS (Apple TV)
- Android
- Android TV
- Web

The app focuses on Xtream Codes and M3U playlists with a TV-friendly interface.

---

**⚠️ Disclaimer:** CouchPotatoPlayer does not provide any IPTV content or subscriptions. Use your own legal IPTV service.

---

## Current Feature Set

### Providers & Profiles
- Add and manage multiple provider profiles.
- Supported provider types:
  - **Xtream Codes**
  - **M3U Playlist** (optional XMLTV EPG URL)
- Per-profile icon selection.

### Playback & Media Browsing
- Dedicated lists/screens for:
  - Live TV channels
  - Movies
  - Series / Seasons / Episodes
- Search and media detail screens.
- Favorites and recently watched support.
- Stream/player health monitoring components.

### EPG & Data
- XMLTV EPG parsing utilities.
- Provider health helpers and network monitoring.
- Image/logo helpers (including caching/proxy utilities).

### Platform Focus
- Remote-friendly UX for TV devices.
- Native player integrations for streaming scenarios where Expo Go alone is not sufficient.

### Native Player Stack (implemented)
- **KSPlayer bridge** is integrated via local native module/package and Expo config plugin:
  - package: `modules/react-native-ksplayer`
  - app plugin: `./plugins/withKSPlayer`
- **Swift TS Player bridge** is integrated via local native module/package:
  - package: `modules/react-native-swift-ts-player`
- Additional video integrations are present for platform/protocol compatibility:
  - `react-native-video`
  - `react-native-vlc-media-player` (excluded from tvOS autolinking)

---

## Important: Expo Go is **not** supported

This project depends on native modules/player integrations. Therefore, running inside the standard **Expo Go** app is not supported.

Use a custom dev client / native run workflow instead.

---

## Prerequisites

- Node.js 20+
- pnpm
- Git
- Platform tooling as needed:
  - Xcode + CocoaPods + Watchman (iOS/tvOS)
  - Android Studio + SDK + JDK 17 (Android/Android TV)

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

---

## Run & Build

### Development server

```bash
pnpm start
```

### Native run commands

```bash
pnpm ios
pnpm android
```

### Project build helpers

```bash
pnpm run build:ios-sim
pnpm run build:tvos-sim
pnpm run build:tvos-device
pnpm run build:android-sim
pnpm run build:android-tv-sim
pnpm run build:web
```

### Simulator setup (recommended first step)

For detailed setup and usage of iOS/tvOS simulators and Android/Android TV emulators, see:

- [`docs/simulator-setup.md`](docs/simulator-setup.md)

### Web production export

```bash
npx expo export -p web
```

---

## tvOS notes (Apple TV)

`build:tvos-sim` and `build:tvos-device` scripts handle tvOS-specific setup/workarounds around `react-native-tvos` compatibility.

### How `react-native-tvos` is activated in this repository

This project keeps standard `react-native` for normal iOS/Android development and **switches to tvOS only during tvOS builds**:

1. `pnpm install --frozen-lockfile` ensures the base dependency graph matches the lockfile.
2. Script temporarily aliases:
   `react-native@npm:react-native-tvos@0.84.1-0`
3. A pnpm virtual-store symlink fix is applied so native iOS module resolution keeps working.
4. `EXPO_TV=1` is exported before `expo prebuild --clean --platform ios`.
5. `@react-native-tvos/config-tv` (configured in `app.json`) consumes the tv flag and applies tvOS project settings/images.
6. After build flow ends, dependency is reverted to standard:
   `react-native@0.84.1`

In short: **tvOS mode is intentional, scripted, and temporary**; normal development stays on upstream React Native.

For a physical Apple TV device:
1. Run `pnpm run build:tvos-device`.
2. Pair Apple TV in Xcode (**Window → Devices and Simulators**).
3. Configure signing/team.
4. Build and run from Xcode.

---

## Testing

- E2E tests are located in `e2e/` and run with Playwright.
- On fresh environments, install Playwright browser binaries once before running E2E tests:

```bash
pnpm exec playwright install chromium
```

```bash
pnpm run test:e2e
```

- Utility tests live under `utils/__tests__/` (if your local setup includes your preferred test runner/tooling).

---

## Docker (Web Deployment)

Use Docker Compose to run the web image:

```bash
docker compose up -d
```

Default port mapping in `docker-compose.yml` exposes the app on `http://localhost:8080`.

---

## Repository Structure (high level)

- `screens/` – App screens (welcome, home, player, search, settings, etc.)
- `components/` – Reusable UI and media components
- `context/` – IPTV + settings context/state
- `utils/` – Parsers, i18n, platform helpers, logging, etc.
- `modules/` – Local native module packages
- `scripts/` – Build helper scripts for platforms
- `e2e/` – Playwright E2E coverage

---

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Implement your change.
4. Open a pull request with a clear summary and testing notes.

---

> **⚠️ Important Note:**  
> We are **not** an IPTV provider and do **not** offer or sell any IPTV subscriptions or content.  
> You need your own IPTV provider that supports the Xtream Codes API to use the app.  
> No registration or payment is required to use this application.

---

## License

MIT
