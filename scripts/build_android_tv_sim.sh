#!/bin/sh
echo "Building and launching Android TV Emulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "Note: Make sure you have an Android TV emulator created and running in Android Studio."
echo "If your emulator is running, this script will install the dev client to it."

# Build for the Android Emulator
npx expo run:android
