#!/bin/sh
echo "Building and launching iOS Simulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Build the development client locally and launch on the default iOS Simulator
npx expo run:ios
