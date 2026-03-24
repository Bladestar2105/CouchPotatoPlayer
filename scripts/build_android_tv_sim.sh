#!/bin/sh
echo "Building and launching Android TV Emulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "Note: Make sure you have an Android TV emulator created and running in Android Studio."
echo "If your emulator is running, this script will install the dev client to it."

# Auto-detect ANDROID_HOME if not set and local.properties is missing
if [ -z "$ANDROID_HOME" ] && [ ! -f "android/local.properties" ]; then
    if [ "$(uname)" = "Darwin" ]; then
        echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
        echo "Auto-generated android/local.properties for macOS."
    elif [ "$(uname)" = "Linux" ]; then
        echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
        echo "Auto-generated android/local.properties for Linux."
    fi
fi

# Build for the Android Emulator
npx expo run:android
