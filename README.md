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

---

## tvOS (Apple TV) Build Instructions

Building for tvOS requires a **custom Flutter engine** because official Flutter does not support Apple TV. This project uses a custom engine from the [DenisovAV/flutter_tv](https://github.com/DenisovAV/flutter_tv) project.

### Prerequisites for tvOS

1. **macOS** with Apple Silicon (M1/M2/M3) or Intel
2. **Xcode 16+** (Xcode 16.4 recommended)
3. **CocoaPods** installed (`sudo gem install cocoapods`)
4. **Flutter SDK** (version matching the custom engine - currently **3.35.7**)

### Step 1: Download the Custom Flutter Engine

The custom engine consists of two ZIP files that must be downloaded and extracted:

| Engine Component | Download URL |
|-----------------|--------------|
| Host Tools (ARM64) | `https://oc.bw.tech/s/utLzZGcszpqvX5a/download` |
| iOS Release Engine | `https://oc.bw.tech/s/x0K4EbOJfTp9VJI/download` |

Create an `out` directory in your project root and extract both archives:

```bash
# From the project root
mkdir -p out

# Download the engine files
curl -L -o out/host_release_arm64.zip https://oc.bw.tech/s/utLzZGcszpqvX5a/download
curl -L -o out/ios_release.zip https://oc.bw.tech/s/x0K4EbOJfTp9VJI/download

# Extract them
unzip -q out/host_release_arm64.zip -d out/
unzip -q out/ios_release.zip -d out/

# Create symlink for gen_snapshot_arm64 (required by build scripts)
ln -s gen_snapshot out/ios_release/clang_x64/gen_snapshot_arm64
```

After extraction, your `out` directory should contain:

```
out/
├── host_release_arm64/     # Host tools for ARM64 Mac
│   ├── dart-sdk/
│   ├── frontend_server_aot_product.dart.snapshot
│   └── ...
├── ios_release/            # iOS/tvOS engine
│   ├── Flutter.framework/
│   ├── Flutter.xcframework/
│   │   └── tvos-arm64/Flutter.framework/  # tvOS-specific framework
│   ├── clang_x64/
│   │   └── gen_snapshot -> gen_snapshot_arm64
│   └── ...
├── host_release_arm64.zip  # (can be deleted)
└── ios_release.zip         # (can be deleted)
```

### Step 2: Build for tvOS

#### Option A: Quick Build Script (Recommended)

Use the provided script to set up everything automatically:

```bash
# For release build (for Apple TV device)
./scripts/run_apple_tv.sh release

# For debug build with Apple TV Simulator (ARM64 Mac)
./scripts/run_apple_tv.sh debug_sim_arm64

# For debug build with Apple TV Simulator (Intel Mac)
./scripts/run_apple_tv.sh debug_sim
```

The script will:
1. Switch the project to tvOS target
2. Install Flutter dependencies
3. Run CocoaPods
4. Copy the correct Flutter.framework
5. Open Xcode workspace

#### Option B: Manual Build Steps

If you prefer to build manually:

```bash
# 1. Set the engine path
export FLUTTER_LOCAL_ENGINE="$PWD"

# 2. Generate iOS configuration first
flutter clean
flutter pub get
flutter build ios --config-only --no-codesign

# 3. Switch to tvOS target
sh scripts/switch_target.sh tvos

# 4. Copy tvOS Flutter.framework
cp -r out/ios_release/Flutter.xcframework/tvos-arm64/Flutter.framework ios/Flutter/

# 5. Patch pub-cache for tvOS compatibility
ruby scripts/patch_tvos_pods.rb

# 6. Patch media_kit frameworks for tvOS platform tag
FRAMEWORKS_DIR="$HOME/.pub-cache/hosted/pub.dev/media_kit_libs_ios_video-1.1.4/ios/Frameworks"
if [ -d "$FRAMEWORKS_DIR" ]; then
  find "$FRAMEWORKS_DIR" -path "*/ios-arm64/*.framework/*" -type f ! -name "*.plist" ! -name "*.h" ! -name "*.modulemap" | while read binary; do
    if file "$binary" | grep -q "Mach-O"; then
      echo "Re-tagging for tvOS: $binary"
      xcrun vtool -arch arm64 -set-build-version 3 15.0 18.0 -replace -output "${binary}.tvos" "$binary"
      mv "${binary}.tvos" "$binary"
    fi
  done
fi

# 7. Install pods
cd ios
pod install

# 8. Open Xcode
open Runner.xcworkspace
```

### Step 3: Build in Xcode

1. In Xcode, select the **Runner** scheme
2. Choose your target:
   - **Apple TV device**: Select "My Apple TV" or "Apple TV" from the device list
   - **Apple TV Simulator**: Select "Apple TV" from the simulator list
3. Click **Product → Build** (or press ⌘B)

### Step 4: Deploy to Apple TV

#### For Physical Apple TV Device

1. Connect your Apple TV to the same network as your Mac
2. In Xcode, go to **Window → Devices and Simulators**
3. Add your Apple TV (it will appear automatically if on the same network)
4. Enable **Developer Mode** on your Apple TV:
   - Go to **Settings → Remotes and Devices → Remote App and Devices**
   - Xcode will prompt you to pair
5. Select your Apple TV in Xcode's device list
6. Click **Run** (▶) to install and launch the app

**Note:** For release builds to run on a physical device, you need:
- An Apple Developer account (free or paid)
- Your Apple TV registered in your developer account
- Proper provisioning profile configured in Xcode

#### For Apple TV Simulator

1. In Xcode, select **Apple TV** from the simulator device list
2. Click **Run** (▶) to launch the simulator

### Troubleshooting tvOS Build Issues

#### Building for tvOS Simulator vs Physical Device

The CI workflow builds for **physical Apple TV device**. If you want to build for the **tvOS Simulator**, you need to also re-tag the simulator frameworks:

```bash
# Re-tag simulator frameworks for tvOS simulator
FRAMEWORKS_DIR="$HOME/.pub-cache/hosted/pub.dev/media_kit_libs_ios_video-1.1.4/ios/Frameworks"
if [ -d "$FRAMEWORKS_DIR" ]; then
  find "$FRAMEWORKS_DIR" -path "*/ios-arm64_x86_64-simulator/*.framework/*" -type f ! -name "*.plist" ! -name "*.h" ! -name "*.modulemap" | while read binary; do
    if file "$binary" | grep -q "Mach-O"; then
      echo "Re-tagging for tvOS simulator: $binary"
      xcrun vtool -arch arm64 -set-build-version 8 15.0 18.0 -replace -output "${binary}.tvos" "$binary" 2>/dev/null || true
      if [ -f "${binary}.tvos" ]; then
        mv "${binary}.tvos" "$binary"
      fi
    fi
  done
  # Re-sign after modifying
  find "$FRAMEWORKS_DIR" -path "*/ios-arm64_x86_64-simulator/*.framework" -type d | while read fw; do
    codesign --force --sign - "$fw" 2>/dev/null || true
  done
fi
```

**Note:** For physical Apple TV device builds, the standard workflow already handles this. You only need the above if building for simulator.

#### "No such module 'Flutter'"
Ensure the `FLUTTER_LOCAL_ENGINE` environment variable is set correctly and the `out` directory contains the extracted engine files.

#### "ld: building for 'tvOS', but linking in dylib built for 'iOS'"
Run the `patch_tvos_pods.rb` script before `pod install`:
```bash
ruby scripts/patch_tvos_pods.rb
```

#### "framework 'Mpv' not found"
The media_kit frameworks need to be re-tagged for tvOS. Run the vtool commands from Step 6 in the manual build process.

#### CocoaPods Issues
Try cleaning and reinstalling:
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
```

#### Xcode Build Fails
1. Clean the build folder: **Product → Clean Build Folder** (⇧⌘K)
2. Delete derived data: **Xcode → Settings → Locations → Derived Data → Arrow icon → Delete Runner folder**
3. Rebuild

### Engine Types Reference

| Engine Type | Description | Use Case |
|-------------|-------------|----------|
| `debug_sim` | Debug simulator (Intel Mac) | Testing on Apple TV Simulator on Intel Mac |
| `debug_sim_arm64` | Debug simulator (ARM64 Mac) | Testing on Apple TV Simulator on M1/M2/M3 Mac |
| `debug` | Debug device | Development on physical Apple TV |
| `release` | Release device | Production builds for Apple TV |

### CI/CD Builds

The project includes GitHub Actions workflow that automatically builds tvOS on every push to main/master. The built `.app` file is uploaded as an artifact that you can download.

---

## Web (Docker)

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

---

## Additional Resources

- [Custom Flutter Engine for Apple TV (DenisovAV/flutter_tv)](https://github.com/DenisovAV/flutter_tv)
- [Flutter Documentation](https://docs.flutter.dev/)
- [Apple TV Developer Documentation](https://developer.apple.com/tvos/)