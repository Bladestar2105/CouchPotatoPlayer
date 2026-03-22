#!/bin/sh
echo "Building and launching iOS Simulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Rebuild the standard iOS project in case we previously built for tvOS
export EXPO_TV=0
npx expo prebuild --clean --platform ios

# Build the development client locally and launch on the default iOS Simulator
npx expo run:ios
