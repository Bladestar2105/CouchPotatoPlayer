# CouchPotatoPlayer

**Project Status:** 100% Migrated from React Native to Flutter!

CouchPotatoPlayer is a modern application migrated entirely to Flutter. It provides a seamless viewing experience across multiple platforms, including Android, Android TV, iOS, tvOS, and Web.

## Getting Started

### Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install)
- For iOS/tvOS: macOS with Xcode installed.
- For Android/Android TV: Android Studio or Android SDK installed.
- For Web/Docker: Docker installed.

### Build Instructions

#### Android & Android TV

To build the APK for Android or Android TV, run:

```bash
flutter pub get
flutter build apk --release
```

The output APK will be located at `build/app/outputs/flutter-apk/app-release.apk`.

#### iOS

To build the application for iOS, run:

```bash
flutter pub get
flutter build ios --release
```

You can then open `ios/Runner.xcworkspace` in Xcode to deploy it to a device or simulator.

#### tvOS (Apple TV)

Building for tvOS requires a custom Flutter engine. CouchPotatoPlayer utilizes [DenisovAV's Flutter Engine for Apple TV](https://github.com/DenisovAV/flutter_tv).

1. **Download the Custom Engine**: Download the pre-built custom Flutter engine (e.g., version 3.24.1 or the version specified by the project) from [DenisovAV's repository](https://github.com/DenisovAV/flutter_tv).
2. **Extract the Engine**: Extract the downloaded engine files and place them in an `out` folder at the root of the project.
   - Example path: `out/ios_debug_sim_unopt_arm64` (or the respective engine type you need).
3. **Run the Build Script**: Use the provided script to set up the tvOS environment and open Xcode.

```bash
# Usage: ./scripts/run_apple_tv.sh [ENGINE_TYPE]
# Default is 'debug_sim_arm64'
./scripts/run_apple_tv.sh
```

Available `ENGINE_TYPE`s:
- `debug_sim` - engine for x86_64 Mac apple tv simulator
- `debug_sim_arm64` - engine for arm64 Mac apple tv simulator
- `debug` - engine for real apple tv device, debug mode
- `release` - engine for real apple tv device, release mode

This script will automatically switch the target, fetch dependencies, configure the `FLUTTER_LOCAL_ENGINE`, and open the Xcode workspace.

#### Web (Docker)

You can build and run the web version using Docker.

**Manual Build and Run:**

1. Build the Docker image:
   ```bash
   docker build -t couchpotatoplayer-web .
   ```
2. Run the Docker container:
   ```bash
   docker run -p 8080:80 couchpotatoplayer-web
   ```
   The application will be accessible at `http://localhost:8080`.

**Using Docker Compose / Portainer:**

A `docker-compose.yml` file is included for easy deployment, including with Portainer.

1. Ensure the image is built or available (as defined in `docker-compose.yml`, it pulls from `ghcr.io/bladestar2105/couchpotatoplayer:latest`).
2. Run using Docker Compose:
   ```bash
   docker-compose up -d
   ```
   The application will be accessible at `http://localhost:8080`.
