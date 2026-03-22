#!/bin/sh
echo "Building and launching tvOS Simulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Set trap to ensure react-native is reverted to standard even if script is aborted or fails
trap 'echo "Reverting react-native to standard after tvOS build..."; pnpm install react-native@^0.81.5' EXIT

echo "Swapping standard react-native for react-native-tvos temporarily for build..."
# We will temporarily alias react-native to react-native-tvos matching our RN version (0.81.5)
pnpm install react-native@npm:react-native-tvos@0.81.5-2

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

echo "Assuming the project is correctly configured for tvOS natively in the /ios directory..."

# Dynamically find the first available Apple TV simulator installed in Xcode
echo "Finding an available Apple TV Simulator..."
TV_SIMULATOR=$(xcrun simctl list devices | grep -i "Apple TV" | grep -v "unavailable" | head -n 1 | awk -F '[()]' '{print $1}' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

if [ -z "$TV_SIMULATOR" ]; then
  echo "Error: No Apple TV simulator found! Please open Xcode -> Window -> Devices and Simulators and create one."
  exit 1
fi

echo "Found Simulator: $TV_SIMULATOR"

# Build for the Apple TV Simulator
# Note: Expo Go does not run on Apple TV. This requires a custom native build via Prebuild.
npx expo run:ios --device "$TV_SIMULATOR"
