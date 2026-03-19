#!/bin/sh
echo "Building and launching tvOS Simulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "Note: Full tvOS support requires react-native-tvos instead of standard react-native."
echo "Assuming the project is correctly configured for tvOS natively in the /ios directory..."

# Build for the Apple TV Simulator
# Note: Expo Go does not run on Apple TV. This requires a custom native build via Prebuild.
<<<<<<< Updated upstream
=======
export REACT_NATIVE_NODE_MODULES_DIR="$(pwd)/node_modules"
>>>>>>> Stashed changes
npx expo run:ios --device "Apple TV"
