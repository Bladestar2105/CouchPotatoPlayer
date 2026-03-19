#!/bin/sh
echo "Building and launching iOS Simulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Build the development client locally and launch on the default iOS Simulator
<<<<<<< Updated upstream
=======
export REACT_NATIVE_NODE_MODULES_DIR="$(pwd)/node_modules"
>>>>>>> Stashed changes
npx expo run:ios
