#!/bin/bash
# Usage: ./run_apple_tv.sh [ENGINE_TYPE]
#  ENGINE_TYPE:
#  'debug_sim' - engine for x86_64 Mac apple tv simulator
#  'debug_sim_arm64' - engine for arm64 Mac apple tv simulator
#  'debug' - engine for real apple tv device, debug mode
#  'release' - engine for real apple tv device, release mode

# engine_type is optional, defaults to 'debug_sim_arm64'

set -e

# Ensure script is always run from the project root
cd "$(dirname "$0")/.."

ENGINE_TYPE=${1:-debug_sim_arm64}

# Set your own path to custom engine here.
# Assuming the 'out' directory is downloaded to the project root,
# FLUTTER_LOCAL_ENGINE should be the absolute path to the project root.
export FLUTTER_LOCAL_ENGINE="$PWD"

echo "=============================================="
echo "Building tvOS with engine type: $ENGINE_TYPE"
echo "FLUTTER_LOCAL_ENGINE: $FLUTTER_LOCAL_ENGINE"
echo "=============================================="

# Check if engine files exist
if [ ! -d "$FLUTTER_LOCAL_ENGINE/out" ]; then
    echo "ERROR: Engine files not found at $FLUTTER_LOCAL_ENGINE/out"
    echo ""
    echo "Please download the custom Flutter engine first:"
    echo "  mkdir -p out"
    echo "  curl -L -o out/host_release_arm64.zip https://oc.bw.tech/s/utLzZGcszpqvX5a/download"
    echo "  curl -L -o out/ios_release.zip https://oc.bw.tech/s/x0K4EbOJfTp9VJI/download"
    echo "  unzip -q out/host_release_arm64.zip -d out/"
    echo "  unzip -q out/ios_release.zip -d out/"
    echo "  ln -s gen_snapshot out/ios_release/clang_x64/gen_snapshot_arm64"
    exit 1
fi

# Switch back to iOS if we're in tvOS mode
if [ -d "_ios" ]; then
    echo "Switching back to iOS target..."
    sh scripts/switch_target.sh ios
fi

# Clean old build artifacts
echo "Cleaning old build artifacts..."
flutter clean

# Get dependencies
echo "Getting Flutter dependencies..."
flutter pub get

# Generate iOS configuration with FLUTTER_LOCAL_ENGINE set
# This creates the Generated.xcconfig and flutter_export_environment.sh files
echo "Generating iOS configuration..."
flutter build ios --config-only --no-codesign

# Switch to tvOS target
echo "Switching to tvOS target..."
sh scripts/switch_target.sh tvos

# Copy the generated xcconfig files
echo "Copying generated xcconfig files..."
cp _ios/Flutter/Generated.xcconfig ios/Flutter/
cp _ios/Flutter/flutter_export_environment.sh ios/Flutter/

# Update flutter_export_environment.sh to include FLUTTER_LOCAL_ENGINE
echo "Updating flutter_export_environment.sh with FLUTTER_LOCAL_ENGINE..."
echo "export FLUTTER_LOCAL_ENGINE=&quot;$FLUTTER_LOCAL_ENGINE&quot;" >> ios/Flutter/flutter_export_environment.sh

# Create .flutter_local_engine config file for Xcode build scripts
echo "Creating .flutter_local_engine config file..."
echo "$FLUTTER_LOCAL_ENGINE" > .flutter_local_engine

# Copy the correct Flutter.framework for tvOS
echo "Copying Flutter.framework for tvOS..."
sh scripts/copy_framework.sh "$ENGINE_TYPE" "$FLUTTER_LOCAL_ENGINE"

# Copy Flutter.podspec
if [ -f "_ios/Flutter/Flutter.podspec" ]; then
    cp _ios/Flutter/Flutter.podspec ios/Flutter/
    # Update podspec to use Flutter.framework instead of Flutter.xcframework
    sed -i '' 's/Flutter.xcframework/Flutter.framework/g' ios/Flutter/Flutter.podspec
fi

# Patch pub-cache for tvOS compatibility
echo "Patching pub-cache for tvOS compatibility..."
ruby scripts/patch_tvos_pods.rb

# Re-tag media_kit frameworks for tvOS
echo "Re-tagging media_kit frameworks for tvOS..."
FRAMEWORKS_DIR="$HOME/.pub-cache/hosted/pub.dev/media_kit_libs_ios_video-1.1.4/ios/Frameworks"
if [ -d "$FRAMEWORKS_DIR" ]; then
    # For tvOS device
    find "$FRAMEWORKS_DIR" -path "*/ios-arm64/*.framework/*" -type f ! -name "*.plist" ! -name "*.h" ! -name "*.modulemap" | while read binary; do
        if file "$binary" | grep -q "Mach-O"; then
            echo "Re-tagging for tvOS: $binary"
            xcrun vtool -arch arm64 -set-build-version 3 15.0 18.0 -replace -output "${binary}.tvos" "$binary" 2>/dev/null || true
            if [ -f "${binary}.tvos" ]; then
                mv "${binary}.tvos" "$binary"
            fi
        fi
    done
    # Re-sign the frameworks after modifying
    find "$FRAMEWORKS_DIR" -path "*/ios-arm64/*.framework" -type d | while read fw; do
        codesign --force --sign - "$fw" 2>/dev/null || true
    done
fi

# Install pods
echo "Installing CocoaPods..."
cd ios
pod install
cd ..

# Open Xcode workspace
echo ""
echo "=============================================="
echo "Setup complete! Opening Xcode..."
echo ""
echo "IMPORTANT: When building in Xcode, make sure to:"
echo "1. Select the correct destination (Apple TV device or simulator)"
echo "2. If FLUTTER_LOCAL_ENGINE error appears, run from terminal:"
echo "   export FLUTTER_LOCAL_ENGINE=&quot;$FLUTTER_LOCAL_ENGINE&quot;"
echo "   open ios/Runner.xcworkspace"
echo "=============================================="
echo ""

open ios/Runner.xcworkspace