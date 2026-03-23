#!/bin/sh
echo "Building and launching tvOS Simulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Set trap to ensure react-native is reverted to standard even if script is aborted or fails
trap 'echo "Reverting react-native to standard after tvOS build..."; pnpm install -w react-native@0.81.5' EXIT

echo "Swapping standard react-native for react-native-tvos temporarily for build..."
# We will temporarily alias react-native to react-native-tvos matching our RN version (0.81.5)
pnpm install -w react-native@npm:react-native-tvos@0.81.5-2

# Fix pnpm symlink resolution for iOS native modules (like RNGestureHandler)
echo "Patching pnpm virtual store for react-native alias..."
RN_TVOS_DIR=$(node -e "console.log(require('path').dirname(require.resolve('react-native/package.json')))")
if [ -d "$RN_TVOS_DIR" ]; then
  # Ensure the directory structure actually matches `react-native-tvos` inside `.pnpm` store
  PARENT_DIR=$(dirname "$RN_TVOS_DIR")
  if [ ! -L "$PARENT_DIR/react-native" ] && [ ! -d "$PARENT_DIR/react-native" ]; then
    echo "Creating react-native symlink to react-native-tvos in $PARENT_DIR"
    ln -s "react-native-tvos" "$PARENT_DIR/react-native"
  fi
fi

echo "Re-generating the native iOS directory specifically for tvOS..."
# The @react-native-tvos/config-tv plugin in app.json reads EXPO_TV to configure tvOS schemes
export EXPO_TV=1
npx expo prebuild --clean --platform ios

# Dynamically find the first available Apple TV simulator installed in Xcode
echo "Finding an available Apple TV Simulator..."
# We extract the exact device UDID (e.g. 12345678-1234-1234-1234-123456789012) using grep/regex
TV_SIMULATOR_UDID=$(xcrun simctl list devices | grep -i "Apple TV" | grep -v "unavailable" | head -n 1 | grep -o -E '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}')

if [ -z "$TV_SIMULATOR_UDID" ]; then
  echo "Error: No Apple TV simulator found! Please open Xcode -> Window -> Devices and Simulators and create one."
  exit 1
fi

echo "Found Simulator UDID: $TV_SIMULATOR_UDID"

# Build for the Apple TV Simulator
# Note: Expo Go does not run on Apple TV. This requires a custom native build via Prebuild.
npx expo run:ios --device "$TV_SIMULATOR_UDID"
