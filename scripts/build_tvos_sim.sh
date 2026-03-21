#!/bin/sh
echo "Building and launching tvOS Simulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Set trap to ensure react-native is reverted to standard even if script is aborted or fails
trap 'echo "Reverting react-native to standard after tvOS build..."; pnpm install react-native@^0.81.5' EXIT

echo "Swapping standard react-native for react-native-tvos temporarily for build..."
# We will temporarily alias react-native to react-native-tvos matching our RN version (0.81.5)
pnpm install react-native@npm:react-native-tvos@0.81.5-2

echo "Assuming the project is correctly configured for tvOS natively in the /ios directory..."

# Build for the Apple TV Simulator
# Note: Expo Go does not run on Apple TV. This requires a custom native build via Prebuild.
npx expo run:ios --device "Apple TV"
