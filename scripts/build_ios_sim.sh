#!/bin/sh
echo "Building and launching iOS Simulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Ensure any .npmrc changes (like public-hoist-pattern) are fully applied first
echo "Ensuring base dependencies are installed and properly hoisted..."
if ! pnpm install; then
  echo "Error: Failed to install base dependencies."
  exit 1
fi

echo "Cleaning existing ios directory to prevent ENOTEMPTY errors..."
rm -rf ios

# Rebuild the standard iOS project in case we previously built for tvOS
export EXPO_TV=0
npx expo prebuild --clean --platform ios

# Build the development client locally and launch on the default iOS Simulator
npx expo run:ios
