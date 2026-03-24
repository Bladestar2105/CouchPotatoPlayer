#!/bin/sh
echo "Building and launching Android Emulator..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

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

# Build the development client locally and launch on the default Android Emulator
npx expo run:android
