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

# Helper function to check zip integrity and download if missing or corrupted
download_engine() {
    local ZIP_FILE="$1"
    local URL="$2"

    if [ -f "$ZIP_FILE" ]; then
        # Check integrity
        if unzip -tq "$ZIP_FILE" >/dev/null 2>&1; then
            echo "$(basename "$ZIP_FILE") already exists and is valid. Skipping download."
            return
        else
            echo "Warning: $(basename "$ZIP_FILE") is corrupted or incomplete. Removing it."
            rm -f "$ZIP_FILE"
        fi
    fi

    echo "Downloading $(basename "$ZIP_FILE")..."
    curl -L -o "$ZIP_FILE" "$URL"
}

if [ "$TARGET" == "device" ]; then
    download_engine "$OUT_DIR/host_release_arm64.zip" "https://oc.bw.tech/s/utLzZGcszpqvX5a/download"
    download_engine "$OUT_DIR/ios_release.zip" "https://oc.bw.tech/s/x0K4EbOJfTp9VJI/download"

    echo "Unzipping engines..."
    unzip -q -o "$OUT_DIR/host_release_arm64.zip" -d "$OUT_DIR/"
    unzip -q -o "$OUT_DIR/ios_release.zip" -d "$OUT_DIR/"
else
    # Simulator engine download
    download_engine "$OUT_DIR/host_release_arm64.zip" "https://oc.bw.tech/s/utLzZGcszpqvX5a/download"
    download_engine "$OUT_DIR/ios_debug_sim_unopt_arm64.zip" "https://oc.bw.tech/s/53IGIdwy4j9tg6c/download"

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

# Step 8: Pod Install
echo "=== Step 8: Running Pod Install ==="
cd ios
pod install
cd ..

# Step 9: Re-tag media_kit frameworks locally for tvOS
echo "=== Step 9: Re-tagging media_kit frameworks locally ==="
# We mutate the locally downloaded/extracted Pods frameworks to prevent corrupting the global pub-cache for standard iOS builds
PODS_MEDIA_KIT_DIR="$ROOT_DIR/ios/Pods/media_kit_libs_ios_video/ios/Frameworks"

if [ -d "$PODS_MEDIA_KIT_DIR" ]; then
    echo "Found media_kit frameworks at $PODS_MEDIA_KIT_DIR"

    if [ "$TARGET" == "simulator" ]; then
        # Re-tag for tvOS simulator (ios-arm64_x86_64-simulator)
        find "$PODS_MEDIA_KIT_DIR" -path "*/ios-arm64_x86_64-simulator/*.framework/*" -type f ! -name "*.plist" ! -name "*.h" ! -name "*.modulemap" | while read binary; do
            if file "$binary" | grep -q "Mach-O"; then
                echo "Re-tagging for tvOS simulator: $binary"
                xcrun vtool -arch arm64 -set-build-version 8 15.0 18.0 -replace -output "${binary}.tvos" "$binary" 2>/dev/null || true
                if [ -f "${binary}.tvos" ]; then
                    mv "${binary}.tvos" "$binary"
                fi
            fi
        done

        # Re-sign the frameworks after modifying binaries
        find "$PODS_MEDIA_KIT_DIR" -path "*/ios-arm64_x86_64-simulator/*.framework" -type d | while read fw; do
            echo "Re-signing simulator framework: $fw"
            codesign --force --sign - "$fw" 2>/dev/null || true
        done
    else
        # Re-tag for tvOS device (ios-arm64)
        find "$PODS_MEDIA_KIT_DIR" -path "*/ios-arm64/*.framework/*" -type f ! -name "*.plist" ! -name "*.h" ! -name "*.modulemap" | while read binary; do
            if file "$binary" | grep -q "Mach-O"; then
                echo "Re-tagging for tvOS device: $binary"
                xcrun vtool -arch arm64 -set-build-version 3 15.0 18.0 -replace -output "${binary}.tvos" "$binary"
                mv "${binary}.tvos" "$binary"
            fi
        done

        # Re-sign the frameworks after modifying binaries
        find "$PODS_MEDIA_KIT_DIR" -path "*/ios-arm64/*.framework" -type d | while read fw; do
            echo "Re-signing device framework: $fw"
            codesign --force --sign - "$fw" 2>/dev/null || true
        done
    fi
else
    echo "Warning: Local media_kit frameworks not found at $PODS_MEDIA_KIT_DIR. Build may fail if media_kit is required."
fi

# Step 10: Code Signing Selection (Device only)
CODE_SIGN_FLAG="CODE_SIGNING_ALLOWED=\"NO\" CODE_SIGNING_REQUIRED=\"NO\" CODE_SIGN_IDENTITY=\"\""

if [ "$TARGET" == "device" ]; then
    echo "=== Step 10: Selecting Code Signing Identity ==="
    echo "Fetching available signing identities..."

    # Store identities in an array (macOS Bash 3.2 compatible)
    IDENTITIES=()
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            IDENTITIES+=("$line")
        fi
    done < <(security find-identity -v -p codesigning | grep '"' | awk -F'"' '{print $2}')

    if [ ${#IDENTITIES[@]} -eq 0 ]; then
        echo "No signing identities found! The build will proceed without code signing, but it cannot be installed on a physical device."
    else
        echo "Please select a signing identity for the device build:"
        select IDENTITY in "${IDENTITIES[@]}" "Skip Signing"; do
            if [ "$IDENTITY" == "Skip Signing" ]; then
                echo "Skipping code signing."
                break
            elif [ -n "$IDENTITY" ]; then
                echo "Selected Identity: $IDENTITY"
                # Use the exact string to configure xcodebuild arguments for signing
                CODE_SIGN_FLAG="CODE_SIGN_IDENTITY=\"$IDENTITY\" CODE_SIGNING_REQUIRED=\"YES\" CODE_SIGNING_ALLOWED=\"YES\""

                # In order to sign properly via CLI, Xcode often requires the Development Team ID to be specified as well.
                # However, extracting it automatically without parsing provisioning profiles is difficult.
                # We will rely on Xcode resolving it based on the identity, or the user finishing it in Xcode.
                break
            else
                echo "Invalid selection. Try again."
            fi
        done
    fi
else
    echo "=== Step 10: Skipping Code Signing (Simulator) ==="
fi

# Step 11: Build tvOS App
echo "=== Step 11: Building tvOS App ==="
# Exporting FLUTTER_LOCAL_ENGINE as the ROOT_DIR (just like the GH Actions workflow does in the build step)
export FLUTTER_LOCAL_ENGINE="$ROOT_DIR"
cd ios

# Evaluate the signing flags dynamically
eval xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration "$BUILD_CONFIG" -destination \'"$DESTINATION"\' SYMROOT=\"$ROOT_DIR/build/ios\" "$CODE_SIGN_FLAG"
cd ..

# Step 12: Package tvOS App
echo "=== Step 12: Packaging tvOS App ==="
if [ "$TARGET" == "simulator" ]; then
    tar -czf tvos-build-simulator.tar.gz build/ios/Debug-appletvsimulator/Runner.app
    echo "=== tvOS Local Compilation Completed Successfully! ==="
    echo "You can find your build at tvos-build-simulator.tar.gz"
else
    tar -czf tvos-build.tar.gz build/ios/Release-appletvos/Runner.app
    echo "=== tvOS Local Compilation Completed Successfully! ==="
    echo "You can find your build at tvos-build.tar.gz"
fi

echo "=== Launching Xcode ==="
echo "To install and run the app, Xcode will now open."
echo "1. Select your Apple TV Device or Simulator from the top destination dropdown."
echo "2. Press Cmd+R (or click the Play button) to install and launch it."
open ios/Runner.xcworkspace