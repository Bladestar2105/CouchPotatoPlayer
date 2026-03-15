#!/bin/sh
echo "Building and launching Android Emulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Build the development client locally and launch on the default Android Emulator
npx expo run:android
