#!/bin/bash

set -e

echo "=== Starting tvOS Local Compilation ==="

# Default variables
TARGET="device"
DESTINATION="generic/platform=tvOS"
BUILD_CONFIG="Release"

# Check arguments
if [ "$1" == "simulator" ]; then
    TARGET="simulator"
    DESTINATION="generic/platform=tvOS Simulator"
    BUILD_CONFIG="Debug"
    echo "=== Building for Apple TV Simulator ==="
else
    echo "=== Building for Apple TV Device ==="
fi

# Define directories
ROOT_DIR=$(pwd)
OUT_DIR="$ROOT_DIR/out"

# Step 1: Download Custom Engine
echo "=== Step 1: Downloading/Verifying Custom Engine ==="
mkdir -p "$OUT_DIR"

if [ "$TARGET" == "device" ]; then
    if [ ! -f "$OUT_DIR/host_release_arm64.zip" ]; then
        echo "Downloading host_release_arm64.zip..."
        curl -L -o "$OUT_DIR/host_release_arm64.zip" https://oc.bw.tech/s/utLzZGcszpqvX5a/download
    else
        echo "host_release_arm64.zip already exists. Skipping download."
    fi

    if [ ! -f "$OUT_DIR/ios_release.zip" ]; then
        echo "Downloading ios_release.zip..."
        curl -L -o "$OUT_DIR/ios_release.zip" https://oc.bw.tech/s/x0K4EbOJfTp9VJI/download
    else
        echo "ios_release.zip already exists. Skipping download."
    fi

    echo "Unzipping engines..."
    unzip -q -o "$OUT_DIR/host_release_arm64.zip" -d "$OUT_DIR/"
    unzip -q -o "$OUT_DIR/ios_release.zip" -d "$OUT_DIR/"
else
    # Simulator engine download
    if [ ! -f "$OUT_DIR/host_release_arm64.zip" ]; then
        echo "Downloading host_release_arm64.zip..."
        curl -L -o "$OUT_DIR/host_release_arm64.zip" https://oc.bw.tech/s/utLzZGcszpqvX5a/download
    else
        echo "host_release_arm64.zip already exists. Skipping download."
    fi

    if [ ! -f "$OUT_DIR/ios_debug_sim_unopt_arm64.zip" ]; then
        echo "Downloading ios_debug_sim_unopt_arm64.zip..."
        curl -L -o "$OUT_DIR/ios_debug_sim_unopt_arm64.zip" https://oc.bw.tech/s/53IGIdwy4j9tg6c/download
    else
        echo "ios_debug_sim_unopt_arm64.zip already exists. Skipping download."
    fi

    echo "Unzipping engines..."
    unzip -q -o "$OUT_DIR/host_release_arm64.zip" -d "$OUT_DIR/"
    unzip -q -o "$OUT_DIR/ios_debug_sim_unopt_arm64.zip" -d "$OUT_DIR/"
fi

# Step 2: Prepare engine directory
echo "=== Step 2: Preparing engine directory ==="
if [ "$TARGET" == "device" ]; then
    if [ -f "$OUT_DIR/ios_release/clang_x64/gen_snapshot" ] && [ ! -f "$OUT_DIR/ios_release/clang_x64/gen_snapshot_arm64" ]; then
        ln -s gen_snapshot "$OUT_DIR/ios_release/clang_x64/gen_snapshot_arm64"
        echo "Created gen_snapshot_arm64 symlink in clang_x64/"
    fi
else
    if [ -f "$OUT_DIR/ios_debug_sim_unopt_arm64/clang_x64/gen_snapshot" ] && [ ! -f "$OUT_DIR/ios_debug_sim_unopt_arm64/clang_x64/gen_snapshot_arm64" ]; then
        ln -s gen_snapshot "$OUT_DIR/ios_debug_sim_unopt_arm64/clang_x64/gen_snapshot_arm64"
        echo "Created gen_snapshot_arm64 symlink in clang_x64/ for simulator engine"
    fi
fi

# Step 3: Generate Boilerplate
echo "=== Step 3: Generating Boilerplate ==="
if [ "$TARGET" == "simulator" ]; then
    export FLUTTER_LOCAL_ENGINE="$OUT_DIR/ios_debug_sim_unopt_arm64"
else
    export FLUTTER_LOCAL_ENGINE="$OUT_DIR/ios_release"
fi
flutter build ios --config-only --no-codesign

# Step 4: Switch Target to tvOS
echo "=== Step 4: Switching Target to tvOS ==="
sh scripts/switch_target.sh tvos

# Step 5: Copy xcconfig and framework files
echo "=== Step 5: Copying xcconfig and framework files ==="
cp _ios/Flutter/Generated.xcconfig ios/Flutter/
cp _ios/Flutter/flutter_export_environment.sh ios/Flutter/

if [ "$TARGET" == "simulator" ]; then
    if [ -d "$OUT_DIR/ios_debug_sim_unopt_arm64/Flutter.xcframework/tvos-arm64_x86_64-simulator/Flutter.framework" ]; then
        cp -r "$OUT_DIR/ios_debug_sim_unopt_arm64/Flutter.xcframework/tvos-arm64_x86_64-simulator/Flutter.framework" ios/Flutter/Flutter.framework
    else
        cp -r "$OUT_DIR/ios_debug_sim_unopt_arm64/Flutter.framework" ios/Flutter/Flutter.framework
    fi
else
    cp -r "$OUT_DIR/ios_release/Flutter.xcframework/tvos-arm64/Flutter.framework" ios/Flutter/Flutter.framework
fi

cp _ios/Flutter/Flutter.podspec ios/Flutter/
sed -i '' 's/Flutter.xcframework/Flutter.framework/g' ios/Flutter/Flutter.podspec
plutil -replace CFBundleSupportedPlatforms -array AppleTVOS ios/Flutter/Flutter.framework/Info.plist || true

# Step 6: Install Dependencies
echo "=== Step 6: Installing Dependencies ==="
flutter pub get

# Step 7: Patch pub-cache for tvOS
echo "=== Step 7: Patching pub-cache for tvOS ==="
ruby scripts/patch_tvos_pods.rb

# Step 8: Re-tag media_kit xcframeworks for tvOS
echo "=== Step 8: Re-tagging media_kit xcframeworks ==="
MEDIA_KIT_PATH=$(find "$HOME/.pub-cache/hosted/pub.dev/" -maxdepth 1 -type d -name "media_kit_libs_ios_video-*" | sort -V | tail -n 1)
FRAMEWORKS_DIR="$MEDIA_KIT_PATH/ios/Frameworks"
if [ -n "$MEDIA_KIT_PATH" ] && [ -d "$FRAMEWORKS_DIR" ]; then
    echo "Found media_kit at $MEDIA_KIT_PATH"
    # Re-tag for tvOS device (ios-arm64)
    find "$FRAMEWORKS_DIR" -path "*/ios-arm64/*.framework/*" -type f ! -name "*.plist" ! -name "*.h" ! -name "*.modulemap" | while read binary; do
        if file "$binary" | grep -q "Mach-O"; then
            echo "Re-tagging for tvOS device: $binary"
            xcrun vtool -arch arm64 -set-build-version 3 15.0 18.0 -replace -output "${binary}.tvos" "$binary"
            mv "${binary}.tvos" "$binary"
        fi
    done

    # Re-tag for tvOS simulator (ios-arm64_x86_64-simulator)
    find "$FRAMEWORKS_DIR" -path "*/ios-arm64_x86_64-simulator/*.framework/*" -type f ! -name "*.plist" ! -name "*.h" ! -name "*.modulemap" | while read binary; do
        if file "$binary" | grep -q "Mach-O"; then
            echo "Re-tagging for tvOS simulator: $binary"
            xcrun vtool -arch arm64 -set-build-version 8 15.0 18.0 -replace -output "${binary}.tvos" "$binary" 2>/dev/null || true
            if [ -f "${binary}.tvos" ]; then
                mv "${binary}.tvos" "$binary"
            fi
        fi
    done

    # Re-sign the frameworks after modifying binaries
    if [ "$TARGET" == "simulator" ]; then
        find "$FRAMEWORKS_DIR" -path "*/ios-arm64_x86_64-simulator/*.framework" -type d | while read fw; do
            echo "Re-signing simulator framework: $fw"
            codesign --force --sign - "$fw" 2>/dev/null || true
        done
    else
        find "$FRAMEWORKS_DIR" -path "*/ios-arm64/*.framework" -type d | while read fw; do
            echo "Re-signing device framework: $fw"
            codesign --force --sign - "$fw" 2>/dev/null || true
        done
    fi
fi

# Step 9: Pod Install
echo "=== Step 9: Running Pod Install ==="
cd ios
pod install
cd ..

# Step 10: Build tvOS App (No Codesign)
echo "=== Step 10: Building tvOS App ==="
# Exporting FLUTTER_LOCAL_ENGINE as the ROOT_DIR (just like the GH Actions workflow does in the build step)
export FLUTTER_LOCAL_ENGINE="$ROOT_DIR"
cd ios

xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration "$BUILD_CONFIG" -destination "$DESTINATION" SYMROOT="$ROOT_DIR/build/ios" CODE_SIGNING_ALLOWED="NO" CODE_SIGNING_REQUIRED="NO" CODE_SIGN_IDENTITY=""
cd ..

# Step 11: Package tvOS App
echo "=== Step 11: Packaging tvOS App ==="
if [ "$TARGET" == "simulator" ]; then
    tar -czf tvos-build-simulator.tar.gz build/ios/Debug-appletvsimulator/Runner.app
    echo "=== tvOS Local Compilation Completed Successfully! ==="
    echo "You can find your build at tvos-build-simulator.tar.gz"
else
    tar -czf tvos-build.tar.gz build/ios/Release-appletvos/Runner.app
    echo "=== tvOS Local Compilation Completed Successfully! ==="
    echo "You can find your build at tvos-build.tar.gz"
fi